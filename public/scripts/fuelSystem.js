/**
 * @file fuelSystem.js - Sistema de combustível da picape
 * Tanque de 50 L, preço R$ 2,00/L. O estado é exposto em %, com 2 casas
 * decimais (0,00–100,00). Persiste via saveSystem (gameFlags.fuel_percent).
 *
 * Eventos:
 *   - 'fuelChanged' { fuel } — disparado quando o nível muda.
 */

import { registerSystem } from './gameState.js';
import { safeDispatch } from './safeDispatch.js';

export const TANK_LITERS = 50;
export const PRICE_PER_LITER = 2.00;
const DEFAULT_FUEL = 100.00;

function clampPercent(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

class FuelSystem {
  constructor() {
    this.fuelPercent = DEFAULT_FUEL;
  }

  /** @returns {number} nível atual em % (0–100, com 2 casas decimais). */
  getFuel() { return this.fuelPercent; }

  /** Define o nível diretamente (clampa entre 0 e 100). */
  setFuel(percent) {
    const v = round2(clampPercent(percent));
    if (this.fuelPercent === v) return;
    this.fuelPercent = v;
    safeDispatch(document, new CustomEvent('fuelChanged', { detail: { fuel: v } }));
  }

  /** Adiciona % ao tanque (não passa de 100). */
  addPercent(amount) {
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) return false;
    this.setFuel(this.fuelPercent + a);
    return true;
  }

  /** Consome % do tanque. Retorna false se não houver combustível suficiente. */
  consumePercent(amount) {
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) return false;
    if (this.fuelPercent + 1e-6 < a) return false;
    this.setFuel(this.fuelPercent - a);
    return true;
  }

  /** Retorna true se o tanque tem pelo menos `percent` % disponível. */
  hasEnough(percent) {
    const p = Number(percent);
    if (!Number.isFinite(p) || p <= 0) return true;
    return this.fuelPercent + 1e-6 >= p;
  }

  /** Espaço disponível no tanque (em %). */
  getMaxRefillPercent() {
    return round2(100 - this.fuelPercent);
  }

  /** Converte % do tanque em litros. */
  litersFromPercent(percent) {
    return TANK_LITERS * (clampPercent(percent) / 100);
  }

  /** Custo (R$) de abastecer X% do tanque. */
  costForPercent(percent) {
    return round2(this.litersFromPercent(percent) * PRICE_PER_LITER);
  }

  /** Capacidade do tanque em litros e preço por litro (read-only). */
  getTankLiters() { return TANK_LITERS; }
  getPricePerLiter() { return PRICE_PER_LITER; }

  /** Reset para 100% (usado em "novo jogo"). */
  reset() { this.setFuel(DEFAULT_FUEL); }
}

const fuelSystem = new FuelSystem();
registerSystem('fuel', fuelSystem);

export default fuelSystem;
export { fuelSystem };
