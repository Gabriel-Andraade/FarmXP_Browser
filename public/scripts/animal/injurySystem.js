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

import { registerSystem } from '../gameState.js';
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

class InjurySystem {
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
