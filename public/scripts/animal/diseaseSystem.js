/**
 * @file diseaseSystem.js - sistema de doenças dos animais
 *
 * Diferente do injurySystem (ferimento visível), a doença é OCULTA até
 * ser diagnosticada na veterinária. Enquanto não diagnosticada, o
 * UiPanel exibe apenas um "?" e o animal sofre um leve agravamento de
 * moral — pra que o jogador perceba que algo está errado sem saber o quê.
 *
 * IDs iniciais (ponto de partida; podemos refinar/expandir depois):
 *   - parasitosis
 *   - respiratory
 *   - digestive
 *   - fever
 *
 * Sorteio diário (no evento `dayChanged`, idem injurySystem):
 *   base 0,5%/dia, com bônus por condição:
 *     - inverno:        +1,5%
 *     - blizzard:       +2,0%
 *     - hunger < 30:    +2,0%  (falta de comida)
 *     - moral  < 30:    +1,5%  (falta de carinho)
 *   Cap diário em 7%. Quando o sorteio bate, a doença é escolhida com
 *   peso pelos modificadores que dispararam (ex.: inverno favorece
 *   `respiratory`, fome favorece `digestive`).
 *
 * Estado guardado em `animal.disease = { id, daysSince, diagnosed }`,
 * persistido junto com a entidade pelo serialize/deserialize do animal.
 *
 * Uso:
 *   import { diseaseSystem } from './animal/diseaseSystem.js';
 *   diseaseSystem.set(animal, 'fever');
 *   diseaseSystem.get(animal);              // { id, daysSince, diagnosed } | null
 *   diseaseSystem.isUndiagnosedSick(animal); // true → mostrar "?" na UI
 *   diseaseSystem.markDiagnosed(animal);    // (usado pelo fluxo de diagnóstico depois)
 *   diseaseSystem.clear(animal);
 */

import { registerSystem, getSystem } from '../gameState.js';
import { logger } from '../logger.js';
import { animals } from '../theWorld.js';
import { items } from '../item.js';

export const DiseaseId = Object.freeze({
  PARASITOSIS: 'parasitosis',
  RESPIRATORY: 'respiratory',
  DIGESTIVE:   'digestive',
  FEVER:       'fever',
});

const DISEASE_VALUES = Object.values(DiseaseId);

// ─── Probabilidades (fração de 1) ───────────────────────────────────────────
const BASE_DAILY_RISK  = 0.005;
const RISK_WINTER      = 0.015;
const RISK_BLIZZARD    = 0.020;
const RISK_LOW_HUNGER  = 0.020;
const RISK_LOW_MORAL   = 0.015;
const HUNGER_THRESHOLD = 30;
const MORAL_THRESHOLD  = 30;
const MAX_DAILY_RISK   = 0.07;

// ─── Pesos para sorteio condicional da doença ───────────────────────────────
// A cada condição ativa, soma-se o bônus correspondente sobre os pesos
// default. Inverno e blizzard puxam para `respiratory`; fome puxa para
// `digestive`; falta de carinho puxa para `parasitosis`.
const WEIGHT_DEFAULT       = { parasitosis: 1, respiratory: 1, digestive: 1, fever: 1 };
const WEIGHT_BONUS_WINTER     = { respiratory: 4 };
const WEIGHT_BONUS_BLIZZARD   = { respiratory: 5 };
const WEIGHT_BONUS_LOW_HUNGER = { digestive:   4 };
const WEIGHT_BONUS_LOW_MORAL  = { parasitosis: 4 };

// ─── Diagnóstico ────────────────────────────────────────────────────────────
// Tempo (em minutos do jogo) que a vet leva para identificar cada doença.
// O sistema sabe a doença real do animal e usa esse range — então o player
// não consegue inferir a doença pelo tempo (todos os ranges se sobrepõem),
// só "demorou um pouco" ou "demorou bastante".
const DIAGNOSIS_TIME_RANGE = {
  parasitosis: { min: 30, max: 60 },
  respiratory: { min: 45, max: 90 },
  digestive:   { min: 30, max: 75 },
  fever:       { min: 20, max: 50 },
};

// Taxa cobrada ao finalizar o diagnóstico. Sorteada no início e fixada na
// entrada de diagnóstico — exibida ao player antes de confirmar, debitada
// via currency.spend() quando o relógio chega no `endMinutes`.
const DIAGNOSIS_FEE_MIN = 1;
const DIAGNOSIS_FEE_MAX = 20;

/**
 * Timestamp monotônico em minutos do jogo a partir do estado do WeatherSystem.
 * Combina day + currentTime — funciona pra qualquer janela < 30 dias, que é
 * muito mais que qualquer diagnóstico (max 90 min ≈ 1,5h de jogo).
 */
function _currentMonotonicMinutes() {
  const weather = getSystem('weather');
  if (!weather) return null;
  const day = weather.day ?? 0;
  const time = weather.currentTime ?? 0;
  return day * 24 * 60 + time;
}

class DiseaseSystem {
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
    }, { signal: this._abortController.signal });
    // Note: diagnósticos NÃO auto-fecham. Quando o relógio cruza
    // `endMinutes` o estado entra em "ready", e o player precisa
    // clicar em "Retirar" no painel da vet para pagar e revelar.
  }

  destroy() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  get(animal)  { return animal?.disease ?? null; }
  has(animal)  { return !!this.get(animal); }

  /**
   * True se há doença ainda não diagnosticada — gatilho do "?" no UiPanel.
   */
  isUndiagnosedSick(animal) {
    const d = this.get(animal);
    return !!d && d.diagnosed !== true;
  }

  set(animal, id) {
    if (!animal) return null;
    if (!DISEASE_VALUES.includes(id)) {
      logger.warn?.(`[diseaseSystem] id de doença inválido: ${id}`);
      return null;
    }
    // intensity: jitter 0.5–1.5 atribuído ao adoecer. É multiplicador do
    // decay extra de moral em animalAI — dois animais com a mesma doença
    // decaem em ritmos diferentes (sem isso o extra uniforme fazia todos
    // os doentes convergirem para o piso de moral juntos).
    const intensity = 0.5 + Math.random();
    animal.disease = { id, daysSince: 0, diagnosed: false, intensity };
    return animal.disease;
  }

  clear(animal) {
    if (!animal) return;
    animal.disease = null;
  }

  /** Marca como diagnosticada (atalho usado por debug ou pelo completion). */
  markDiagnosed(animal) {
    const d = this.get(animal);
    if (!d) return false;
    d.diagnosed = true;
    return true;
  }

  // ─── Diagnóstico (paralelo, baseado em tempo do jogo) ─────────────────────

  /**
   * True se há diagnóstico em andamento pra esse animal.
   * (Animal pode estar doente sem diagnóstico iniciado — essa é o estado
   * "pendente" que vira candidato a clicar em "Iniciar diagnóstico".)
   */
  isInDiagnosis(animal) {
    const d = this.get(animal);
    return !!(d && d.diagnosis && !d.diagnosed);
  }

  /**
   * Sorteia (e exibe ao player) a taxa que será cobrada ao concluir um
   * diagnóstico. Usado pela UI antes do player confirmar, e gravado na
   * entrada de diagnóstico pra permanecer fixo até a cobrança.
   */
  rollDiagnosisFee() {
    const range = DIAGNOSIS_FEE_MAX - DIAGNOSIS_FEE_MIN;
    return DIAGNOSIS_FEE_MIN + Math.floor(Math.random() * (range + 1));
  }

  /**
   * Inicia um diagnóstico no animal. O range é o da doença que o sistema
   * já sabe que ele tem (player não recebe esse dado). Salva startMinutes,
   * endMinutes e fee em `animal.disease.diagnosis` — persiste com o save.
   *
   * @returns {{ duration: number, fee: number, endMinutes: number } | null}
   *   null se o animal não tem doença, já está diagnosticado, ou já tem
   *   diagnóstico em andamento (chamadas duplicadas são silenciosas).
   */
  startDiagnosis(animal) {
    const d = this.get(animal);
    if (!d) return null;
    if (d.diagnosed) return null;
    if (d.diagnosis) return null;

    const range = DIAGNOSIS_TIME_RANGE[d.id] ?? { min: 30, max: 60 };
    const span = Math.max(0, range.max - range.min);
    const duration = range.min + Math.round(Math.random() * span);

    const startMinutes = _currentMonotonicMinutes();
    if (startMinutes == null) {
      logger.warn?.('[diseaseSystem] startDiagnosis: WeatherSystem indisponível');
      return null;
    }
    const endMinutes = startMinutes + duration;
    const fee = this.rollDiagnosisFee();

    d.diagnosis = { startMinutes, endMinutes, fee };

    document.dispatchEvent(new CustomEvent('diagnosisStarted', {
      detail: { animal, duration, endMinutes, fee },
    }));
    return { duration, fee, endMinutes };
  }

  /**
   * Minutos do jogo restantes até o diagnóstico terminar. null se não há
   * diagnóstico em andamento ou se o WeatherSystem ainda não está pronto.
   */
  getDiagnosisRemaining(animal) {
    const d = this.get(animal);
    if (!d?.diagnosis) return null;
    const now = _currentMonotonicMinutes();
    if (now == null) return null;
    return Math.max(0, d.diagnosis.endMinutes - now);
  }

  /** Custo previsto do diagnóstico em andamento (ou null se não há). */
  getDiagnosisFee(animal) {
    const d = this.get(animal);
    return d?.diagnosis?.fee ?? null;
  }

  /**
   * Resumo do tratamento gradual em andamento (se houver). Usado pela UI
   * pra mostrar o progresso "X/Y dias · Z/W doses hoje". `dosesToday` é
   * normalizado: se já é um novo dia em relação ao último registro, conta
   * como 0 (espelha a lógica de reset que `applyMedicine` aplica ao dosar).
   *
   * @returns {null | {
   *   medicineId, medicineName, medicineIcon,
   *   daysCompleted, requiredDays,
   *   dosesToday, requiredDoses
   * }}
   */
  getTreatmentProgress(animal) {
    const tx = animal?.disease?.treatment;
    if (!tx) return null;
    const item = items.find(it => it.id === tx.medicineId);
    if (!item) return null;
    const intensity = Number.isFinite(animal.disease.intensity) ? animal.disease.intensity : 1;
    const requiredDays = Math.max(1, Math.round((item.daysToCure || 1) * intensity));
    const requiredDoses = item.dosesPerDay || 1;
    const day = getSystem('weather')?.day ?? 0;
    const dosesToday = (tx.lastDoseDay === day) ? (tx.dosesToday || 0) : 0;
    return {
      medicineId: tx.medicineId,
      medicineName: item.name,
      medicineIcon: item.icon || '💊',
      daysCompleted: tx.daysCompleted || 0,
      requiredDays,
      dosesToday,
      requiredDoses,
    };
  }

  /**
   * True se o tempo do diagnóstico já passou e o resultado está aguardando
   * retirada — ainda não foi pago nem revelado. Computado a partir do
   * timestamp do WeatherSystem; nada precisa ser salvo separadamente.
   */
  isDiagnosisReady(animal) {
    const d = this.get(animal);
    if (!d?.diagnosis || d.diagnosed) return false;
    const now = _currentMonotonicMinutes();
    if (now == null) return false;
    return now >= d.diagnosis.endMinutes;
  }

  /**
   * Player retira o resultado: cobra a taxa via currency e revela a doença.
   * Idêntico em espírito ao `hospitalSystem.retrieve` — se o saldo for
   * insuficiente, falha sem mexer no estado (player pode juntar grana e
   * voltar depois).
   *
   * @returns {{ ok: true, fee, diseaseId } | { ok: false, reason: string, fee?: number }}
   */
  retrieveDiagnosis(animal) {
    const d = this.get(animal);
    if (!d?.diagnosis) return { ok: false, reason: 'no_diagnosis' };
    if (d.diagnosed) return { ok: false, reason: 'already_retrieved' };
    if (!this.isDiagnosisReady(animal)) return { ok: false, reason: 'not_ready' };

    const fee = Number(d.diagnosis.fee) || 0;
    if (fee > 0) {
      const currency = getSystem('currency');
      if (!currency || typeof currency.spend !== 'function') {
        return { ok: false, reason: 'no_currency_system', fee };
      }
      if (currency.getMoney() < fee) return { ok: false, reason: 'no_money', fee };
      const charged = currency.spend(fee, 'vet:diagnosis');
      if (!charged) return { ok: false, reason: 'no_money', fee };
    }

    const diseaseId = d.id;
    d.diagnosed = true;
    d.diagnosis = null;

    document.dispatchEvent(new CustomEvent('diagnosisRetrieved', {
      detail: { animal, diseaseId, fee },
    }));

    return { ok: true, fee, diseaseId };
  }

  /** Avança 1 dia para um animal (apenas incrementa contador por enquanto). */
  tickDay(animal) {
    const d = this.get(animal);
    if (!d) return;
    d.daysSince = (d.daysSince ?? 0) + 1;
  }

  tickAll() {
    if (!Array.isArray(animals)) return;
    for (const a of animals) this.tickDay(a);
  }

  /**
   * Calcula o risco diário e os pesos de sorteio para um animal,
   * sem aplicar nada. Útil para testes/balanceamento.
   */
  _computeDailyRisk(animal) {
    const stats = animal?.stats || {};
    const weather = getSystem('weather');
    const inWinter   = weather?.seasonKey === 'winter';
    const isBlizzard = weather?.weatherType === 'blizzard';
    const lowHunger  = (stats.hunger ?? 100) < HUNGER_THRESHOLD;
    const lowMoral   = (stats.moral  ?? 100) < MORAL_THRESHOLD;

    let risk = BASE_DAILY_RISK;
    if (inWinter)   risk += RISK_WINTER;
    if (isBlizzard) risk += RISK_BLIZZARD;
    if (lowHunger)  risk += RISK_LOW_HUNGER;
    if (lowMoral)   risk += RISK_LOW_MORAL;
    if (risk > MAX_DAILY_RISK) risk = MAX_DAILY_RISK;

    const weights = { ...WEIGHT_DEFAULT };
    const addBonus = (bonus) => { for (const k in bonus) weights[k] += bonus[k]; };
    if (inWinter)   addBonus(WEIGHT_BONUS_WINTER);
    if (isBlizzard) addBonus(WEIGHT_BONUS_BLIZZARD);
    if (lowHunger)  addBonus(WEIGHT_BONUS_LOW_HUNGER);
    if (lowMoral)   addBonus(WEIGHT_BONUS_LOW_MORAL);

    return { risk, weights };
  }

  _pickDisease(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    if (total <= 0) return DiseaseId.FEVER;
    let r = Math.random() * total;
    for (const [id, w] of entries) {
      r -= w;
      if (r <= 0) return id;
    }
    return entries[entries.length - 1][0];
  }

  /**
   * Roda a chance diária de adoecer em todos os animais saudáveis.
   * Pula animais já doentes ou hospitalizados.
   * @returns {number} quantidade de animais que adoeceram nesse tick.
   */
  rollDailyForAll() {
    if (!Array.isArray(animals)) return 0;
    let infected = 0;
    for (const a of animals) {
      if (this.has(a)) continue;
      if (a?.hospitalized) continue;
      const { risk, weights } = this._computeDailyRisk(a);
      if (Math.random() < risk) {
        const pick = this._pickDisease(weights);
        this.set(a, pick);
        infected++;
      }
    }
    return infected;
  }

  /** Debug: aplica doenças variadas em todos os animais, ou limpa todos. */
  debugSetAll(flag) {
    if (!Array.isArray(animals)) return 0;
    if (!flag) {
      for (const a of animals) this.clear(a);
      return animals.length;
    }
    animals.forEach((a, i) => {
      const id = DISEASE_VALUES[i % DISEASE_VALUES.length];
      this.set(a, id);
    });
    return animals.length;
  }
}

export const diseaseSystem = new DiseaseSystem();
registerSystem('animalDisease', diseaseSystem);

// Debug global pra testes manuais via console:
//   isSick(true)  → infecta todos os animais com doenças variadas
//   isSick(false) → limpa
if (typeof window !== 'undefined') {
  window.isSick = (flag) => diseaseSystem.debugSetAll(!!flag);
}

export default diseaseSystem;
