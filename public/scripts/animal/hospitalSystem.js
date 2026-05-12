/**
 * @file hospitalSystem.js - sistema de internação de animais na veterinária
 *
 * Apenas ferimentos GRAVES são internáveis. O animal despawna do mundo ao
 * ser admitido e ressurge ao ser retirado (curado). O custo é cobrado só
 * na retirada (4 / dia × dias totais de internação).
 *
 * Duração da internação (sorteada aleatoriamente no momento da admissão):
 *   - cabeça: 8 a 10 dias
 *   - outras regiões: 3 a 7 dias
 *
 * Cada `dayChanged` decrementa `daysRemaining` de cada entrada. Quando
 * chega a 0 o animal está pronto para retirada.
 *
 * API pública:
 *   hospital.admit(animal)            -> entry | null
 *   hospital.retrieve(entryId)        -> { ok, animal? , cost?, reason? }
 *   hospital.canAfford(entryId)       -> boolean
 *   hospital.getEntries()             -> array
 *   hospital.serializeState() / .restoreState(data) — persistência
 */

import { registerSystem, getSystem } from '../gameState.js';
import { logger } from '../logger.js';
import { animals, addAnimal, objectDestroyed } from '../theWorld.js';
import { assets } from '../assetManager.js';

const PRICE_PER_DAY = 4;

// Faixas de duração por região do ferimento. Cabeça é mais sério → mais dias.
const DURATION_RANGES = {
  head:  [8, 10],
  chest: [5, 8],
  back:  [4, 7],
  leg:   [3, 6],
  tail:  [3, 5],
};

export function rollDays(region) {
  const [lo, hi] = DURATION_RANGES[region] ?? [3, 7];
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export const HOSPITAL_PRICE_PER_DAY = PRICE_PER_DAY;

function genId() {
  return `hosp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

class HospitalSystem {
  constructor() {
    this.entries = [];
    this._abortController = null;
    this._init();
  }

  _init() {
    if (typeof document === 'undefined') return;
    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    document.addEventListener('dayChanged', () => this.tickDays(), {
      signal: this._abortController.signal,
    });
  }

  destroy() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  // ─── Queries ──────────────────────────────────────────────────────────

  getEntries() {
    return this.entries.slice();
  }

  /** Retorna entries prontas para retirada (daysRemaining === 0). */
  getReady() {
    return this.entries.filter(e => e.daysRemaining <= 0);
  }

  isAdmittable(animal) {
    return !!(animal && animal.injury && animal.injury.severity === 'severe');
  }

  /**
   * Retorna a quantia de dias proposta para internação deste animal.
   *
   * Sorteio é feito uma vez por ferimento e cacheado em `injury._proposedDays`
   * — sem isso, fechar/abrir o painel re-sortearia, dando ao jogador uma
   * "máquina de re-roll" para minimizar dias/custo. O cache morre junto com
   * o ferimento (clear/set criam novo objeto injury), e é serializado
   * naturalmente pelo `animal.serialize()` (sobrevive a save/load).
   *
   * @returns {number} dias propostos, ou 0 se o animal não tem injury.
   */
  proposeDaysFor(animal) {
    const inj = animal?.injury;
    if (!inj) return 0;
    if (typeof inj._proposedDays !== 'number' || inj._proposedDays <= 0) {
      inj._proposedDays = rollDays(inj.region);
    }
    return inj._proposedDays;
  }

  totalCostFor(entry) {
    if (!entry) return 0;
    return entry.totalDays * (entry.pricePerDay ?? PRICE_PER_DAY);
  }

  canAfford(entryId) {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return false;
    const currency = getSystem('currency');
    return !!currency && currency.getMoney() >= this.totalCostFor(entry);
  }

  // ─── Admit ────────────────────────────────────────────────────────────

  /**
   * Admite um animal na clínica. Snapshot completo é guardado para reidratar
   * o animal na retirada. O animal é removido do mundo (despawn).
   *
   * @param {Object} animal - entidade do animal (precisa ter `serialize()`)
   * @param {number} [days] - opcional. Se passado, usa esse número de dias
   *   exato (já sorteado pelo painel de confirmação para evitar divergência
   *   entre o que o jogador viu e o que ficou registrado). Se omitido,
   *   sorteia internamente baseado na região do ferimento.
   */
  admit(animal, days) {
    if (!this.isAdmittable(animal)) {
      logger.warn?.('[hospitalSystem] tentativa de internar animal não-grave');
      return null;
    }
    if (typeof animal.serialize !== 'function') {
      logger.warn?.('[hospitalSystem] animal sem serialize()');
      return null;
    }

    const snapshot = animal.serialize();
    const region = animal.injury.region;
    // Se o caller passou `days`, usa direto (painel já mostrou esse número
    // ao jogador). Senão, cai no `proposeDaysFor` que respeita o cache do
    // ferimento — assim chamadas externas também ficam consistentes.
    const totalDays = (typeof days === 'number' && days > 0)
      ? Math.floor(days)
      : this.proposeDaysFor(animal);
    const weather = getSystem('weather');
    const admittedDay = weather?.day ?? 0;

    const entry = {
      id: genId(),
      assetName: snapshot.assetName,
      customName: animal.customName ?? null,
      severity: animal.injury.severity,
      region,
      totalDays,
      daysRemaining: totalDays,
      pricePerDay: PRICE_PER_DAY,
      admittedDay,
      animalSnapshot: snapshot,
    };

    this.entries.push(entry);

    // Despawn do mundo (objectDestroyed remove do array `animals` E do
    // collisionSystem). Usar o id do animal evita ambiguidade.
    try {
      objectDestroyed(animal.id ?? animal);
    } catch (e) {
      logger.warn?.('[hospitalSystem] falha ao remover animal do mundo', e);
    }

    // Rede de segurança: se objectDestroyed não removeu por algum motivo
    // (id divergente, animal não-instância, etc.), faz o splice direto
    // por referência ou id. Sem isso, animal continuava sendo desenhado
    // no mundo mesmo após internado. O warn é diagnóstico — em estado
    // normal este bloco não dispara.
    let leftoverIdx = animals.indexOf(animal);
    if (leftoverIdx < 0 && animal.id) {
      leftoverIdx = animals.findIndex(a => a && a.id === animal.id);
    }
    if (leftoverIdx >= 0) {
      animals.splice(leftoverIdx, 1);
      logger.warn?.('[hospitalSystem] objectDestroyed não removeu o animal; fallback splice direto. id=' + (animal.id ?? '<sem id>'));
      // Tenta tirar do collisionSystem também — sem isso, hitbox fantasma
      // bloqueia interação naquela posição.
      try {
        const cs = getSystem('collision');
        if (cs && animal.id && typeof cs.removeHitbox === 'function') cs.removeHitbox(animal.id);
      } catch {}
    }

    document.dispatchEvent(new CustomEvent('animalAdmitted', { detail: { entry } }));
    return entry;
  }

  // ─── Retrieve ─────────────────────────────────────────────────────────

  retrieve(entryId) {
    const idx = this.entries.findIndex(e => e.id === entryId);
    if (idx < 0) return { ok: false, reason: 'not_found' };

    const entry = this.entries[idx];
    if (entry.daysRemaining > 0) return { ok: false, reason: 'not_ready' };

    const cost = this.totalCostFor(entry);
    const currency = getSystem('currency');
    if (!currency) return { ok: false, reason: 'no_currency_system' };
    if (currency.getMoney() < cost) return { ok: false, reason: 'no_money', cost };

    const charged = currency.spend(cost, 'vet:retrieve');
    if (!charged) return { ok: false, reason: 'no_money', cost };

    const animal = this._respawn(entry);
    if (!animal) {
      // Devolve o dinheiro se respawn falhou — falha de asset não pode custar.
      currency.earn(cost, 'vet:retrieve_refund');
      return { ok: false, reason: 'respawn_failed' };
    }

    this.entries.splice(idx, 1);
    document.dispatchEvent(new CustomEvent('animalRetrieved', { detail: { entry, animal, cost } }));
    return { ok: true, animal, cost };
  }

  _respawn(entry) {
    const assetData = assets.animals?.[entry.assetName];
    if (!assetData) {
      logger.warn?.(`[hospitalSystem] asset não encontrado: ${entry.assetName}`);
      return null;
    }

    const snap = entry.animalSnapshot || {};
    const x = Number.isFinite(snap.x) ? snap.x : 0;
    const y = Number.isFinite(snap.y) ? snap.y : 0;

    const animal = addAnimal(entry.assetName, assetData, x, y);
    if (!animal) return null;

    if (typeof animal.deserialize === 'function') {
      // Restaura stats, mas o vet curou o ferimento.
      animal.deserialize({ ...snap, injury: null });
    }
    if (entry.customName) animal.customName = entry.customName;

    return animal;
  }

  // ─── Day tick ─────────────────────────────────────────────────────────

  tickDays() {
    let any = false;
    for (const e of this.entries) {
      if (e.daysRemaining > 0) {
        e.daysRemaining -= 1;
        any = true;
      }
    }
    if (any) {
      document.dispatchEvent(new CustomEvent('hospitalUpdated'));
    }
  }

  // ─── Persistência ─────────────────────────────────────────────────────

  serializeState() {
    return { entries: this.entries.map(e => ({ ...e })) };
  }

  restoreState(data) {
    if (!data || !Array.isArray(data.entries)) {
      this.entries = [];
      return;
    }
    this.entries = data.entries.map(e => ({ ...e }));
  }

  /** Limpa todas as entradas (uso interno em loads/resets). */
  clear() {
    this.entries.length = 0;
  }
}

export const hospitalSystem = new HospitalSystem();
registerSystem('hospital', hospitalSystem);

export default hospitalSystem;
