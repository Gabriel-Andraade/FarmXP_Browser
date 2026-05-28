/**
 * @file agingSystem.js - Ciclo de vida dos animais (young → adult → mature → elderly)
 *
 * 4 estágios:
 *   - young    (0–19 dias)   — filhote, não produz
 *   - adult    (20–39 dias)  — produção normal
 *   - mature   (40–64 dias)  — pico de produção (modifiers aplicados no productionSystem)
 *   - elderly  (65+ dias)    — produção reduzida, mais frágil
 *
 * Avanço de estágio exige `_avgMoral >= CARE_MIN_MORAL` no momento da transição.
 * Animal mal cuidado **fica no estágio anterior pra sempre** (acumula dias mas
 * não evolui). Reflete "se cuidar bem, cresce; se não, fica filhote".
 *
 * Apenas a transição `young → adult` troca o sprite (via `animal.transformInto`):
 *   - Chick → Chicken (♀) ou Rooster (♂)
 *   - Calf  → Cow     (♀) ou Bull    (♂)
 *   - Lamb  → Sheep   (qualquer sexo)
 *   - Piglet → Pig    (qualquer sexo)
 *
 * Outras transições (adult→mature, mature→elderly) só atualizam `_lifeStage`
 * e disparam evento — productionSystem consulta o stage pra modificar yields.
 *
 * XP é concedido em cada transição (50 / 30 / 15 conforme stage alcançado).
 */

import { registerSystem, getSystem } from '../gameState.js';
import { logger } from '../logger.js';
import { animals, objectDestroyed } from '../theWorld.js';
import { t } from '../i18n/i18n.js';
import { tombSystem } from './tombSystem.js';

// ─── Configuração ──────────────────────────────────────────────────────────
const LIFE_STAGES = ['young', 'adult', 'mature', 'elderly'];

// Idade mínima TOTAL (dias desde o nascimento) pra cada estágio.
const STAGE_MIN_DAYS = {
  young:   0,
  adult:   20,
  mature:  40,
  elderly: 65,
};

// Moral média (EMA) mínima pra avançar de estágio. Filhote com moral
// média baixa fica preso em 'young' indefinidamente — punição direta
// por negligência sem matar o animal (morte fica pro futuro sistema).
const CARE_MIN_MORAL = 50;

// Fator do EMA (exponential moving average) de moral. Maior = mais inércia,
// mais peso na história antiga; menor = mais reativo, peso no presente.
// 0.8 = ~5 dias pra "esquecer" eventos antigos.
const MORAL_EMA_FACTOR = 0.8;

// Mapa de filhote → adulto. Female/male/default conforme gender.
const YOUTH_TO_ADULT = {
  Chick:  { female: 'Chicken', male: 'Rooster' },
  Calf:   { female: 'Cow',     male: 'Bull'    },
  Lamb:   { default: 'Sheep' },
  Piglet: { default: 'Pig'   },
};

// XP por transição. Mais alto pra adult (evento mais importante).
const XP_PER_STAGE = {
  adult:   50,
  mature:  30,
  elderly: 15,
};

class AgingSystem {
  constructor() {
    this._abortController = null;
    this._init();
  }

  _init() {
    if (typeof document === 'undefined') return;
    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    document.addEventListener('dayChanged', () => this.tickAll(), {
      signal: this._abortController.signal,
    });
  }

  destroy() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  /**
   * Tick diário: incrementa idade, atualiza EMA de moral, checa transição,
   * e verifica morte por velhice.
   *
   * Cap de mortes por tick (MAX_DEATHS_PER_TICK): evita freeze ao avançar
   * muitos dias de uma vez no devtools. Animais que excederem o cap são
   * pulados (morrem no próximo tick). 5 mortes/tick × 10 ticks = 50 mortes
   * controladas — suficiente pra player real, evita avalanche.
   */
  tickAll() {
    if (!Array.isArray(animals)) return 0;
    const MAX_DEATHS_PER_TICK = 5;
    let advanced = 0;
    const deadAnimals = [];

    for (const a of animals) {
      if (!a) continue;

      a._daysOld = (a._daysOld || 0) + 1;

      // Update moral EMA: peso `MORAL_EMA_FACTOR` no histórico, resto no atual.
      const cur = a.stats?.moral ?? 50;
      if (typeof a._avgMoral !== 'number') a._avgMoral = cur;
      else a._avgMoral = a._avgMoral * MORAL_EMA_FACTOR + cur * (1 - MORAL_EMA_FACTOR);

      // Verifica morte por velhice (com cap por tick)
      if ((a._daysOld || 0) >= (a._lifespan || 90)) {
        if (deadAnimals.length < MAX_DEATHS_PER_TICK) {
          deadAnimals.push(a);
        }
        // Animais que excedem o cap NÃO incrementam idade neste tick
        // (decrementa de volta) — assim no próximo dayChanged eles
        // entram novamente como candidatos a morte.
        else {
          a._daysOld -= 1;
        }
        continue;  // Não processa transição pra animal morto
      }

      if (this._tryAdvanceStage(a)) advanced++;
    }

    // Remove animais mortos do array e cria tumbas
    for (const a of deadAnimals) {
      const idx = animals.indexOf(a);
      if (idx >= 0) animals.splice(idx, 1);
      objectDestroyed(a.id);
      tombSystem.spawnTomb(a, this._getCurrentDay());
      logger.debug?.(`[agingSystem] ${a.assetName} (${a.id}) morreu aos ${a._daysOld} dias`);
    }

    return advanced;
  }

  _getCurrentDay() {
    const daySys = getSystem('dayNight') || getSystem('weather');
    return daySys?.dayCount ?? daySys?.day ?? 0;
  }

  /**
   * Tenta avançar o animal pro próximo estágio. Retorna true se avançou.
   *
   * Critérios pra avançar:
   *   1. Não está já no último estágio (elderly)
   *   2. `_daysOld >= STAGE_MIN_DAYS[nextStage]`
   *   3. `_avgMoral >= CARE_MIN_MORAL` (bem cuidado)
   *
   * Se avança E é young → adult, transforma sprite via assetName mapping.
   * Em qualquer transição: XP, evento, FX flutuante.
   */
  _tryAdvanceStage(animal) {
    const currentStage = animal._lifeStage || 'young';
    const idx = LIFE_STAGES.indexOf(currentStage);
    if (idx < 0 || idx >= LIFE_STAGES.length - 1) return false;

    const nextStage = LIFE_STAGES[idx + 1];
    if ((animal._daysOld || 0) < STAGE_MIN_DAYS[nextStage]) return false;
    if ((animal._avgMoral || 0) < CARE_MIN_MORAL) return false;

    // Atualiza stage
    animal._lifeStage = nextStage;

    // Young → adult: troca sprite
    let newAssetName = null;
    if (currentStage === 'young' && nextStage === 'adult') {
      const map = YOUTH_TO_ADULT[animal.assetName];
      if (map) {
        if (map.default) newAssetName = map.default;
        else if (animal.gender === 'female') newAssetName = map.female;
        else if (animal.gender === 'male')   newAssetName = map.male;
        else newAssetName = map.female || map.male || map.default;
      }
      if (newAssetName && typeof animal.transformInto === 'function') {
        animal.transformInto(newAssetName);
      }
    }

    // FX flutuante (sparkle + texto). Renderizado em AnimalEntity.draw.
    animal._ageUpFx = {
      text: t(`animal.aging.toast.${nextStage}`) || '✨ Cresceu!',
      startedAt: performance.now(),
      duration: 2500,
    };

    // XP pro player
    const xpAmount = XP_PER_STAGE[nextStage] || 0;
    if (xpAmount > 0) {
      const xpSys = getSystem('xp');
      xpSys?.grantXP?.(xpAmount, `animal_aged_${nextStage}`);
    }

    document.dispatchEvent(new CustomEvent('animalAgedUp', {
      detail: {
        animal,
        fromStage: currentStage,
        toStage: nextStage,
        newAssetName,
        xp: xpAmount,
      },
    }));

    logger.debug?.(`[agingSystem] ${animal.assetName} (${animal.id}) ${currentStage} → ${nextStage}`);
    return true;
  }

  /**
   * Estágio do animal pelo daysOld puro (ignora care check) — útil pra
   * UI mostrar "deveria ser adulto mas tá preso filhote".
   */
  getStageByAge(daysOld) {
    let stage = 'young';
    for (const s of LIFE_STAGES) {
      if ((STAGE_MIN_DAYS[s] || 0) <= daysOld) stage = s;
    }
    return stage;
  }
}

export const agingSystem = new AgingSystem();
registerSystem('animalAging', agingSystem);

// Debug global pra console testing.
if (typeof window !== 'undefined') {
  window.agingTick = () => agingSystem.tickAll();
  // Acelera idade pra testes — avança N dias todos os animais.
  window.ageAnimals = (n = 1) => {
    if (!Array.isArray(animals)) return;
    for (const a of animals) a._daysOld = (a._daysOld || 0) + n;
  };
}

export default agingSystem;
