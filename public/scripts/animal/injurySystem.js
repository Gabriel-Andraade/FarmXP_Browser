/**
 * @file injurySystem.js - sistema de ferimentos dos animais
 *
 * Gerencia o estado de ferimento por animal: severidade (arranhão, ferida,
 * ferimento grave), região do corpo afetada e cura natural.
 *
 * Severidades:
 *   - 'scratch': arranhão leve. Cura sozinho em SCRATCH_HEAL_DAYS dias.
 *   - 'wound':   ferida. Não cura sozinha — precisa diagnóstico no vet.
 *   - 'severe':  ferimento grave. Não cura sozinho — precisa internamento.
 *
 * Regiões: head, leg, back, chest, tail.
 *
 * O ferimento é guardado direto na entidade (`animal.injury`) para que o
 * serialize/deserialize do animal já o persista naturalmente.
 *
 * Uso:
 *   import { injurySystem } from './animal/injurySystem.js';
 *   injurySystem.set(animal, 'wound', 'leg');
 *   injurySystem.get(animal); // { severity, region, daysSince } | null
 *   injurySystem.clear(animal);
 *
 * Cura: o sistema escuta `dayChanged` e avança a cura de todos os animais
 * automaticamente. Apenas arranhões somem sozinhos.
 */

import { registerSystem, getSystem } from '../gameState.js';
import { logger } from '../logger.js';
import { animals } from '../theWorld.js';

export const InjurySeverity = Object.freeze({
  SCRATCH: 'scratch',
  WOUND:   'wound',
  SEVERE:  'severe',
});

export const InjuryRegion = Object.freeze({
  HEAD:  'head',
  LEG:   'leg',
  BACK:  'back',
  CHEST: 'chest',
  TAIL:  'tail',
});

const SEVERITY_VALUES = Object.values(InjurySeverity);
const REGION_VALUES = Object.values(InjuryRegion);

const SCRATCH_HEAL_DAYS = 3;

// ─── Roll diário de ferimento ─────────────────────────────────────────────
// Espelha o padrão do diseaseSystem: chance base baixa por dia, com bônus
// por condições contextuais (clima, estado nutricional). Cap total mais
// baixo que o de doença porque ferimento é mais "marcante" visualmente —
// se virar comum, banaliza o sistema de hospital/vet.
const BASE_DAILY_INJURY_RISK = 0.003;
const RISK_BLIZZARD          = 0.015;  // escorregão no gelo
const RISK_STORM             = 0.010;  // pedrada / galho caindo
const RISK_WEAK              = 0.020;  // fome E sede ambas muito baixas
const WEAK_THRESHOLD         = 20;
const MAX_DAILY_INJURY_RISK  = 0.05;

// ─── Pesos para sorteio condicional ────────────────────────────────────────
// Severidade: scratch domina (cura sozinho), wound exige vet, severe é
// raro e exige internação. Mantém o sistema de hospital relevante sem
// punir o jogador com frequência.
const SEVERITY_DEFAULT_WEIGHTS = { scratch: 7, wound: 2, severe: 0.3 };

// Região: distribuição uniforme por padrão. Bônus pelas condições que
// disparam — blizzard fere mais leg (escorrega), storm fere mais head/back
// (impacto vertical). Pesos somam aos defaults, não substituem.
const REGION_DEFAULT_WEIGHTS  = { head: 1, leg: 1, back: 1, chest: 1, tail: 1 };
const REGION_BONUS_BLIZZARD   = { leg: 4 };
const REGION_BONUS_STORM      = { head: 3, back: 3 };

class InjurySystem {
  constructor() {
    this._abortController = null;
    this._init();
  }

  _init() {
    if (typeof document === 'undefined') return;
    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    document.addEventListener('dayChanged', () => {
      this.tickAll();
      this.rollDailyForAll();
    }, {
      signal: this._abortController.signal,
    });
  }

  destroy() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  /** Severidades que precisam intervenção do vet (não curam sozinhas). */
  needsVet(animal) {
    const inj = this.get(animal);
    if (!inj) return false;
    return inj.severity === InjurySeverity.WOUND || inj.severity === InjurySeverity.SEVERE;
  }

  get(animal) {
    return animal?.injury ?? null;
  }

  has(animal) {
    return !!this.get(animal);
  }

  set(animal, severity, region) {
    if (!animal) return null;
    if (!SEVERITY_VALUES.includes(severity)) {
      logger.warn?.(`[injurySystem] severidade inválida: ${severity}`);
      return null;
    }
    if (!REGION_VALUES.includes(region)) {
      logger.warn?.(`[injurySystem] região inválida: ${region}`);
      return null;
    }
    animal.injury = { severity, region, daysSince: 0 };
    return animal.injury;
  }

  clear(animal) {
    if (!animal) return;
    animal.injury = null;
  }

  /**
   * Aplica um ferimento "natural" e despacha `animalInjured`. Diferente do
   * `set()` puro (primitiva CRUD usada por debug, migração e tests), o
   * `inflict()` garante que UI/quests recebam o evento. Toda fonte de
   * gameplay (roll diário, bellow do touro, etc.) deve usar este caminho.
   *
   * @returns objeto injury aplicado, ou null se a aplicação falhou.
   */
  inflict(animal, severity, region, cause) {
    const result = this.set(animal, severity, region);
    if (!result) return null;
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('animalInjured', {
        detail: { animal, severity, region, cause: cause || 'generic' },
      }));
    }
    return result;
  }

  /**
   * Avança 1 dia de cura para um animal. Retorna true se o ferimento
   * acabou de sumir (cura natural concluída).
   */
  tickHealing(animal) {
    const inj = this.get(animal);
    if (!inj) return false;
    inj.daysSince = (inj.daysSince ?? 0) + 1;
    if (inj.severity === InjurySeverity.SCRATCH && inj.daysSince >= SCRATCH_HEAL_DAYS) {
      this.clear(animal);
      return true;
    }
    return false;
  }

  /** Avança a cura de todos os animais do mundo. */
  tickAll() {
    if (!Array.isArray(animals)) return;
    for (const a of animals) this.tickHealing(a);
  }

  // ─── Roll diário (helpers puros) ─────────────────────────────────────────

  /**
   * Calcula o risco diário de ferimento e os pesos de severidade/região
   * para um animal, sem aplicar nada. Útil para testes/balanceamento e
   * consumido pelo `rollDailyForAll` (tópico seguinte).
   *
   * Espelha `diseaseSystem._computeDailyRisk` em forma: clima e fraqueza
   * somam ao risco base, condições "pesadas" também influenciam a região
   * mais provável (blizzard → leg, storm → head/back).
   *
   * @returns {{ risk: number, severityWeights: object, regionWeights: object }}
   */
  _computeDailyRisk(animal) {
    const stats = animal?.stats || {};
    const weather = getSystem('weather');
    const isBlizzard = weather?.weatherType === 'blizzard';
    const isStorm    = weather?.weatherType === 'storm';
    const lowHunger  = (stats.hunger ?? 100) < WEAK_THRESHOLD;
    const lowThirst  = (stats.thirst ?? 100) < WEAK_THRESHOLD;
    const isWeak     = lowHunger && lowThirst;

    let risk = BASE_DAILY_INJURY_RISK;
    if (isBlizzard) risk += RISK_BLIZZARD;
    if (isStorm)    risk += RISK_STORM;
    if (isWeak)     risk += RISK_WEAK;
    if (risk > MAX_DAILY_INJURY_RISK) risk = MAX_DAILY_INJURY_RISK;

    const severityWeights = { ...SEVERITY_DEFAULT_WEIGHTS };
    const regionWeights   = { ...REGION_DEFAULT_WEIGHTS };

    const addBonus = (target, bonus) => {
      for (const k in bonus) target[k] = (target[k] ?? 0) + bonus[k];
    };
    if (isBlizzard) addBonus(regionWeights, REGION_BONUS_BLIZZARD);
    if (isStorm)    addBonus(regionWeights, REGION_BONUS_STORM);

    // Causa "principal" para o evento — prioridade por saliência visual:
    // blizzard (animal escorrega visível) > storm (impacto) > weak (lento).
    // Consumidores de UI podem mapear pra texto/toast/quest.
    let cause = 'generic';
    if (isBlizzard)   cause = 'blizzard';
    else if (isStorm) cause = 'storm';
    else if (isWeak)  cause = 'weak';

    return { risk, severityWeights, regionWeights, cause };
  }

  /**
   * Sorteio ponderado genérico. Pesos zero/negativos são tratados como
   * "primeira entrada" pra evitar NaN — em uso normal os pesos default
   * já garantem total > 0.
   */
  _pickWeighted(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    if (total <= 0) return entries[0]?.[0] ?? null;
    let r = Math.random() * total;
    for (const [k, w] of entries) {
      r -= w;
      if (r <= 0) return k;
    }
    return entries[entries.length - 1][0];
  }

  /**
   * Roda a chance diária de ferimento em todos os animais elegíveis.
   * Pula quem:
   *  - já tem ferimento (acumular feridas confunde a UI e a cura);
   *  - tem doença ativa (acumular doença + ferimento é punição dupla —
   *    o jogador precisa resolver uma coisa por vez);
   *  - está hospitalizado (já fora de `animals[]`, mas defensivo).
   *
   * Não despacha evento ainda — isso entra no tópico 5.
   * @returns {number} quantidade de animais que ficaram feridos nesse tick.
   */
  rollDailyForAll() {
    if (!Array.isArray(animals)) return 0;
    let injured = 0;
    for (const a of animals) {
      if (!a) continue;
      if (this.has(a)) continue;
      if (a.disease) continue;
      if (a.hospitalized) continue;
      const { risk, severityWeights, regionWeights, cause } = this._computeDailyRisk(a);
      if (Math.random() < risk) {
        const severity = this._pickWeighted(severityWeights);
        const region   = this._pickWeighted(regionWeights);
        if (severity && region && this.inflict(a, severity, region, cause)) {
          injured++;
        }
      }
    }
    return injured;
  }

  /** Sorteia um ferimento aleatório (debug/testes). */
  randomize(animal) {
    const sev = SEVERITY_VALUES[Math.floor(Math.random() * SEVERITY_VALUES.length)];
    const reg = REGION_VALUES[Math.floor(Math.random() * REGION_VALUES.length)];
    return this.set(animal, sev, reg);
  }

  /**
   * Debug: aplica um sintoma diferente em cada animal, ou limpa todos.
   * Cicla determinísticamente por todas as combinações severidade×região
   * (15 únicas) — animais consecutivos recebem ferimentos visivelmente distintos.
   * @param {boolean} flag - true: aplica; false: limpa.
   */
  debugSetAll(flag) {
    if (!Array.isArray(animals)) return 0;
    if (!flag) {
      for (const a of animals) this.clear(a);
      return animals.length;
    }
    animals.forEach((a, i) => {
      const sev = SEVERITY_VALUES[i % SEVERITY_VALUES.length];
      const reg = REGION_VALUES[Math.floor(i / SEVERITY_VALUES.length) % REGION_VALUES.length];
      this.set(a, sev, reg);
    });
    return animals.length;
  }
}

export const injurySystem = new InjurySystem();
registerSystem('animalInjury', injurySystem);

// Debug global: `isHurt(true)` aplica sintomas variados em todos os animais,
// `isHurt(false)` limpa. Apenas para testes manuais via console.
if (typeof window !== 'undefined') {
  window.isHurt = (flag) => injurySystem.debugSetAll(!!flag);
}

export default injurySystem;
