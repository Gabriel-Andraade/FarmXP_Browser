/**
 * @file personalitySystem.js - Motor de personalidade / relacionamento por NPC (#244)
 *
 * Promove a lógica de traços que nasceu na quest de escolhas do Jeremy a um
 * motor compartilhado: cada NPC acumula, ao longo do jogo, como o player se
 * comportou com ele. Qualquer diálogo pode então reagir a isso.
 *
 * Traços: C = Confiança, R = Raiva, Re = Respeito.
 *
 * Uso típico (numa opção de diálogo):
 *   { text: t('...'), onSelect: () => personality.score('jeremy', 'C') }
 *
 * E pra reagir:
 *   const dom = personality.getDominant('jeremy');   // 'C' | 'R' | 'Re' | null
 *   if (personality.isAtLeast('jeremy', 'Re', 3)) { ...fala calorosa... }
 *
 * Persistência: o mapa por NPC é serializado em `gameFlags.personality`
 * (por slot), restaurado no load e zerado no New Game — mesma regra de
 * isolamento das outras quest states.
 *
 * Custo: tudo é event-driven (só roda em escolha de diálogo), nunca por frame.
 */

import { registerSystem, getSystem } from '../gameState.js';
import { logger } from '../logger.js';

/** Traços válidos. C = Confiança, R = Raiva, Re = Respeito. */
export const TRAITS = ['C', 'R', 'Re'];

/** Desempate final quando nem a ordem resolve. Tunável. */
const TIEBREAK_PRIORITY = ['Re', 'C', 'R'];

/** Quantas pontuações recentes guardar por NPC (só o fim importa pro desempate). */
const MAX_ORDER_LEN = 50;

/**
 * Núcleo do motor (genérico, sem estado): dada a contagem de traços e a ordem
 * em que foram pontuados, retorna o dominante.
 *
 * Desempate: (1) entre os empatados, o pontuado MAIS RECENTEMENTE;
 *            (2) prioridade fixa Re > C > R.
 *
 * @param {Object} counts - ex.: { C: 2, R: 1, Re: 2 }
 * @param {string[]} [order] - ordem cronológica em que os traços foram somados
 * @returns {string|null} traço dominante, ou null se nada foi pontuado ainda
 */
export function resolveDominantTrait(counts, order = []) {
  const keys = Object.keys(counts || {});
  if (keys.length === 0) return null;
  const max = Math.max(...keys.map((k) => counts[k] || 0));
  if (max <= 0) return null; // relacionamento ainda "em branco"

  const tied = keys.filter((k) => (counts[k] || 0) === max);
  if (tied.length === 1) return tied[0];

  for (let i = order.length - 1; i >= 0; i--) {
    if (tied.includes(order[i])) return order[i];
  }
  for (const p of TIEBREAK_PRIORITY) if (tied.includes(p)) return p;
  return tied[0];
}

class PersonalitySystem {
  constructor() {
    // npcId → { counts: { C, R, Re }, order: [trait, ...] }
    this._byNpc = {};
  }

  /** Entrada do NPC, criando zerada na primeira vez. */
  _entry(npcId) {
    let e = this._byNpc[npcId];
    if (!e) {
      e = { counts: { C: 0, R: 0, Re: 0 }, order: [] };
      this._byNpc[npcId] = e;
    }
    return e;
  }

  /**
   * Soma num traço desse NPC. Chamado do `onSelect` de uma opção de diálogo.
   * @param {string} npcId - id do NPC (ex.: 'jeremy')
   * @param {string} trait - 'C' | 'R' | 'Re'
   * @param {number} [weight=1] - peso da escolha (tunável por opção)
   */
  score(npcId, trait, weight = 1) {
    if (!npcId || !TRAITS.includes(trait)) {
      logger.warn?.(`[personality] score inválido: ${npcId} / ${trait}`);
      return;
    }
    const e = this._entry(npcId);
    e.counts[trait] = (e.counts[trait] || 0) + weight;
    e.order.push(trait);
    if (e.order.length > MAX_ORDER_LEN) e.order.splice(0, e.order.length - MAX_ORDER_LEN);

    // Escolha do player precisa sobreviver ao reload.
    getSystem('save')?.markDirty?.();

    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('personalityChanged', {
        detail: { npcId, trait, counts: { ...e.counts } },
      }));
    }
  }

  /** Contagem de traços do NPC (cópia). */
  getTraits(npcId) {
    return { ...this._entry(npcId).counts };
  }

  /** Pontuação de um traço específico. */
  getTrait(npcId, trait) {
    return this._entry(npcId).counts[trait] || 0;
  }

  /** Traço dominante do NPC, ou null se ele ainda não "leu" nada do player. */
  getDominant(npcId) {
    const e = this._entry(npcId);
    return resolveDominantTrait(e.counts, e.order);
  }

  /** Gate simples pra diálogo/quest: já atingiu N nesse traço? */
  isAtLeast(npcId, trait, n) {
    return this.getTrait(npcId, trait) >= n;
  }

  /** Zera tudo (New Game). */
  reset() {
    this._byNpc = {};
  }

  // ─── Persistência (por slot, via gameFlags) ────────────────────────────────

  serializeState() {
    const out = {};
    for (const npcId of Object.keys(this._byNpc)) {
      const e = this._byNpc[npcId];
      out[npcId] = { counts: { ...e.counts }, order: [...e.order] };
    }
    return out;
  }

  restoreState(data) {
    this._byNpc = {};
    if (!data || typeof data !== 'object') return;
    for (const npcId of Object.keys(data)) {
      const e = data[npcId];
      if (!e || typeof e !== 'object') continue;
      this._byNpc[npcId] = {
        counts: {
          C:  Number(e.counts?.C)  || 0,
          R:  Number(e.counts?.R)  || 0,
          Re: Number(e.counts?.Re) || 0,
        },
        order: Array.isArray(e.order) ? e.order.filter((t) => TRAITS.includes(t)) : [],
      };
    }
  }
}

export const personalitySystem = new PersonalitySystem();
registerSystem('personality', personalitySystem);

// Debug: inspecionar/alterar relacionamento pelo console.
if (typeof window !== 'undefined') {
  window.personality = () => personalitySystem.serializeState();
  window.personalityOf = (npcId) => ({
    traits: personalitySystem.getTraits(npcId),
    dominant: personalitySystem.getDominant(npcId),
  });
}

export default personalitySystem;
