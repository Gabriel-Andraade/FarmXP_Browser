/**
 * @file breedingSystem.js - Animal reproduction / breeding (#243)
 *
 * Fecha o ciclo de vida do rebanho: em vez de só comprar animais, adultos
 * saudáveis de gêneros opostos, da mesma família, no mesmo cercado, geram
 * filhotes ao longo do tempo.
 *
 * Regras (todas precisam ser verdade pra reproduzir):
 *   - Mesma família + gêneros opostos (♂ + ♀), ambos adultos (não filhote),
 *     no mesmo cercado.
 *   - Saudáveis: sem doença, moral média + fome + sede acima do mínimo.
 *   - Cercado abaixo da capacidade (sem superpopulação).
 *   - Casal fora do cooldown pós-parto.
 *
 * É DAY-DRIVEN (evento `dayChanged`), nunca por frame — espelha o agingSystem.
 * O estado (gestação/cooldown por cercado+família) é persistido por slot via
 * o export do theWorld (`breeding`), como enclosureSpecies/animalTombs.
 *
 * Design: UMA gestação por família por cercado (não por casal). Simplifica a
 * persistência e limita naturalmente a superpopulação (um nascimento por ciclo
 * de gestação por família), atendendo "no runaway overpopulation".
 */

import { registerSystem, getSystem } from '../gameState.js';
import { logger } from '../logger.js';
import { animals } from '../theWorld.js';
import { t } from '../i18n/i18n.js';

// Asset adulto → família de reprodução + o filhote que gera. Dois adultos da
// mesma família com gêneros opostos formam um casal.
const ADULT_TO_YOUNG = {
  Cow:     { family: 'cattle',  young: 'Calf'   },
  Bull:    { family: 'cattle',  young: 'Calf'   },
  Chicken: { family: 'poultry', young: 'Chick'  },
  Rooster: { family: 'poultry', young: 'Chick'  },
  Sheep:   { family: 'sheep',   young: 'Lamb'   },
  Pig:     { family: 'pig',     young: 'Piglet' },
};

// ─── Tunáveis (balanceamento) ───────────────────────────────────────────────
const GESTATION_DAYS   = 5;   // dias in-game do pareamento ao nascimento
const COOLDOWN_DAYS    = 3;   // descanso pós-parto antes de reproduzir de novo
const MIN_MORAL        = 55;  // moral média mínima pra estar "saudável"
const MIN_HUNGER       = 40;  // alimentado
const MIN_THIRST       = 40;  // hidratado
const ENCLOSURE_CAP    = 8;   // máx. de animais por cercado (anti-superpopulação)
const LITTER_TWIN_CHANCE = 0.12; // chance de nascer um 2º filhote (gêmeos raros)
// Estágios que reproduzem — nem filhote (young) nem idoso (elderly).
const BREEDABLE_STAGES = new Set(['adult', 'mature']);

class BreedingSystem {
  constructor() {
    // _state[enclosureId][family] = { gestation: number|null, cooldown: number }
    this._state = {};
    this._abortController = null;
    this._init();
  }

  _init() {
    if (typeof document === 'undefined') return;
    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    document.addEventListener('dayChanged', () => this.tick(), {
      signal: this._abortController.signal,
    });
  }

  destroy() {
    if (this._abortController) { this._abortController.abort(); this._abortController = null; }
  }

  /** Adulto saudável o bastante pra reproduzir? */
  _isHealthyBreeder(a) {
    if (!a || !BREEDABLE_STAGES.has(a._lifeStage || 'young')) return false;
    if (a.disease) return false; // doente não reproduz
    const s = a.stats || {};
    const moral = (typeof a._avgMoral === 'number') ? a._avgMoral : (s.moral ?? 0);
    return moral >= MIN_MORAL && (s.hunger ?? 0) >= MIN_HUNGER && (s.thirst ?? 0) >= MIN_THIRST;
  }

  _center(a) {
    return { x: a.x + (a.width || 0) / 2, y: a.y + (a.height || 0) / 2 };
  }

  /** Passe diário de reprodução. */
  tick() {
    const enc = getSystem('enclosure');
    if (!enc || typeof enc.getEnclosures !== 'function' || !Array.isArray(animals)) return;

    const enclosures = enc.getEnclosures();
    const knownIds = new Set(enclosures.map(e => e.id));

    // Zera as flags de gravidez e indexa os animais por id.
    const byId = new Map();
    for (const a of animals) {
      if (!a) continue;
      a._pregnant = false;
      if (a.id) byId.set(a.id, a);
    }

    // Re-marca a mãe de TODA gestação ativa direto do `_state`, ANTES de
    // qualquer `continue` do loop de pareamento. Assim o selo 🤰 no mundo
    // sempre bate com `isPregnant()` mesmo quando o casal fica temporariamente
    // inválido (parceiro vendido/internado/morto) — o `_state` é a fonte única.
    for (const encId in this._state) {
      const fams = this._state[encId];
      for (const family in fams) {
        const fs = fams[family];
        if (fs?.gestation != null && fs.motherId) {
          const mom = byId.get(fs.motherId);
          if (mom) mom._pregnant = true;
        }
      }
    }

    // Agrupa animais por cercado: total (capacidade) + adultos saudáveis por
    // família/gênero (guarda as fêmeas por ref pra marcar a mãe).
    const byEnc = new Map();
    for (const a of animals) {
      if (!a) continue;
      const c = this._center(a);
      const e = enc.getEnclosureAtPoint(c.x, c.y);
      if (!e) continue;
      let b = byEnc.get(e.id);
      if (!b) { b = { total: 0, fams: new Map() }; byEnc.set(e.id, b); }
      b.total++;
      const info = ADULT_TO_YOUNG[a.assetName];
      if (!info || !this._isHealthyBreeder(a)) continue;
      let fam = b.fams.get(info.family);
      if (!fam) { fam = { young: info.young, males: [], females: [] }; b.fams.set(info.family, fam); }
      if (a.gender === 'male') fam.males.push(a);
      else if (a.gender === 'female') fam.females.push(a);
    }

    for (const [encId, b] of byEnc) {
      const st = this._state[encId] || (this._state[encId] = {});
      for (const [family, fam] of b.fams) {
        const fs = st[family] || (st[family] = { gestation: null, cooldown: 0, motherId: null });

        if (fs.cooldown > 0) { fs.cooldown--; continue; }

        // Precisa de ♂ E ♀ — sem casal válido a gestação pausa (não reseta).
        if (fam.males.length === 0 || fam.females.length === 0) continue;

        if (fs.gestation == null) {
          // Momento do acasalamento: corações pulsantes nos DOIS parceiros
          // (estilo Minecraft). A partir daqui a fêmea fica grávida.
          fs.gestation = GESTATION_DAYS;
          fs.motherId = fam.females[0].id;
          fam.females[0]._pregnant = true; // selo já no mesmo tick do acasalamento
          this._loveFx(fam.males[0]);
          this._loveFx(fam.females[0]);
          document.dispatchEvent(new CustomEvent('animalExpecting', { detail: { enclosureId: encId, family } }));
        } else if (fs.gestation > 0) {
          fs.gestation--;
        }

        // Se a mãe registrada sumiu do mundo (vendida/morta), outra fêmea
        // presente assume a gestação. Se ela apenas está indisponível (doente,
        // fora do bucket), segue sendo a mãe — já marcada no passe acima.
        if (fs.gestation != null && !byId.has(fs.motherId)) {
          const mother = fam.females[0];
          fs.motherId = mother.id;
          mother._pregnant = true;
        }

        if (fs.gestation === 0) {
          if (b.total >= ENCLOSURE_CAP) continue; // cheio — tenta de novo amanhã
          const baby = enc.birthAnimal?.(encId, fam.young);
          if (baby) {
            b.total++;
            const mom = byId.get(fs.motherId);
            if (mom) mom._pregnant = false; // deixou de estar grávida ao parir
            fs.gestation = null;
            fs.motherId = null;
            fs.cooldown = COOLDOWN_DAYS;
            this._onBirth(baby);
            document.dispatchEvent(new CustomEvent('animalBorn', {
              detail: { animal: baby, enclosureId: encId, family },
            }));
            logger.debug?.(`[breeding] ${fam.young} nasceu no cercado ${encId}`);

            // Gêmeos raros: pequena chance de um 2º filhote (respeita capacidade).
            if (Math.random() < LITTER_TWIN_CHANCE && b.total < ENCLOSURE_CAP) {
              const twin = enc.birthAnimal?.(encId, fam.young);
              if (twin) {
                b.total++;
                this._onBirth(twin);
                document.dispatchEvent(new CustomEvent('animalBorn', {
                  detail: { animal: twin, enclosureId: encId, family, twin: true },
                }));
                logger.debug?.(`[breeding] gêmeo ${fam.young} nasceu no cercado ${encId}`);
              }
            }
          }
        }
      }
    }

    // Limpa estado de cercados que sumiram (pen refeito/removido).
    for (const id of Object.keys(this._state)) {
      if (!knownIds.has(id)) delete this._state[id];
    }
  }

  /** FX de "acasalamento": corações pulsantes orbitando o animal (temporário). */
  _loveFx(animal) {
    if (!animal) return;
    animal._ageUpFx = { particle: '❤️', startedAt: performance.now(), duration: 2600 };
  }

  /** FX flutuante no recém-nascido (reaproveita o render do age-up, sem arte nova). */
  _onBirth(baby) {
    baby._ageUpFx = { text: t('animal.breeding.bornFx'), particle: '❤️', startedAt: performance.now(), duration: 2500 };
  }

  /** Este animal (por id) é a fêmea grávida de alguma gestação ativa? */
  isPregnant(animalId) {
    if (!animalId) return false;
    for (const encId in this._state) {
      const fams = this._state[encId];
      for (const family in fams) {
        const fs = fams[family];
        if (fs && fs.gestation != null && fs.motherId === animalId) return true;
      }
    }
    return false;
  }

  // ─── Persistência (por slot, via export do theWorld) ──────────────────────
  serializeState() {
    try { return JSON.parse(JSON.stringify(this._state)); }
    catch { return {}; }
  }

  restoreState(data) {
    this._state = (data && typeof data === 'object') ? data : {};
  }
}

export const breedingSystem = new BreedingSystem();
registerSystem('breeding', breedingSystem);

// Debug: força um tick de reprodução pelo console.
if (typeof window !== 'undefined') {
  window.breedTick = () => breedingSystem.tick();
}

export default breedingSystem;
