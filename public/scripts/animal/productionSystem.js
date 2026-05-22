/**
 * @file productionSystem.js - Produção de itens por animais (milk/wool/egg)
 *
 * Escuta `dayChanged` e marca animais elegíveis como prontos pra coleta.
 * Player coleta clicando no animal com a ferramenta certa equipada (lógica
 * em `control.js` — este arquivo só decide QUEM e QUANDO produz).
 *
 * Regras por espécie (PRODUCT_RULES):
 *   - product:       id do item produzido (referência em items.js)
 *   - toolId:        ferramenta exigida no inventário equipado (ou null pra "sem ferramenta")
 *   - cooldownDays:  intervalo mínimo entre produções
 *   - moralMin:      moral mínima exigida no dia da produção
 *
 * Bloqueios universais (qualquer animal):
 *   - injury não-scratch → não produz
 *   - disease ativa → não produz
 *   - hospitalizado → não produz (já está fora do mundo)
 *   - SLEEPING mood → produz normalmente (dorme à noite, ovo nasce de dia)
 *
 * API pública:
 *   productionSystem.getRule(assetName)   → regra da espécie ou null
 *   productionSystem.canProduce(animal)   → boolean (sem efeitos)
 *   productionSystem.tickAll()            → marca todos elegíveis (chamado em dayChanged)
 *   productionSystem.collect(animal)      → consome `_pendingProduct`, retorna item id pra inventário
 */

import { registerSystem, getSystem } from '../gameState.js';
import { logger } from '../logger.js';
import { animals } from '../theWorld.js';
import { t } from '../i18n/i18n.js';
import { getItem } from '../itemUtils.js';

// Tabela de produção. assetName (espécie) → regra. Animais fora da tabela
// não produzem nada (filhotes, machos, etc.).
// `requiresFemale: true` filtra machos da espécie (Turkey 'random' pode
// ser macho; Cow/Chicken já são female-locked em SPECIES_GENDER, mas o
// flag é defensivo). Lã não exige sexo (ambos têm lã).
const PRODUCT_RULES = {
  Cow:     { product: 61, toolId: 16,   cooldownDays: 1, moralMin: 30, requiresFemale: true },  // leite + balde
  Sheep:   { product: 62, toolId: 0,    cooldownDays: 3, moralMin: 40 },                         // lã + tesoura (qualquer sexo)
  Chicken: { product: 60, toolId: null, cooldownDays: 1, moralMin: 20, requiresFemale: true },  // ovo (galinha)
  Turkey:  { product: 60, toolId: null, cooldownDays: 2, moralMin: 25, requiresFemale: true },  // ovo (perua) — macho não bota
};

function _currentDay() {
  const sys = getSystem('dayNight') || getSystem('weather');
  return sys?.dayCount ?? sys?.day ?? 0;
}

class ProductionSystem {
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

  /** Regra de produção pra essa espécie, ou null. */
  getRule(assetName) {
    return PRODUCT_RULES[assetName] || null;
  }

  /**
   * True se o animal está elegível pra produzir HOJE.
   * Bloqueios: sem regra, ferimento sério, doença, hospitalizado,
   * cooldown ainda válido, moral abaixo do mínimo.
   */
  canProduce(animal) {
    if (!animal) return false;
    const rule = this.getRule(animal.assetName);
    if (!rule) return false;

    // Bloqueios universais
    if (animal.injury && animal.injury.severity !== 'scratch') return false;
    if (animal.disease) return false;
    if (animal.hospitalized) return false;

    // Filtro de sexo (ex: macho Turkey não bota ovo)
    if (rule.requiresFemale && animal.gender !== 'female') return false;

    // Stats
    const moral = animal.stats?.moral ?? 0;
    if (moral < rule.moralMin) return false;

    // Cooldown
    const today = _currentDay();
    const last  = animal._lastProducedDay ?? -1;
    if (last >= 0 && (today - last) < rule.cooldownDays) return false;

    return true;
  }

  /**
   * Marca todos os animais elegíveis como prontos pra coleta. Chamado em
   * `dayChanged`. Não duplica: animal que já tem `_pendingProduct` setado
   * (não foi coletado ainda) permanece com o mesmo, sem reagendar.
   */
  tickAll() {
    if (!Array.isArray(animals)) return 0;
    let marked = 0;
    for (const a of animals) {
      if (!a) continue;
      if (a._pendingProduct) continue;  // já tem item esperando coleta
      if (!this.canProduce(a)) continue;
      const rule = this.getRule(a.assetName);
      a._pendingProduct = rule.product;
      a._pendingTool    = rule.toolId;
      marked++;
    }
    if (marked > 0) {
      document.dispatchEvent(new CustomEvent('productionReady', {
        detail: { count: marked },
      }));
    }
    return marked;
  }

  /**
   * Coleta o produto pendente do animal. Centraliza TODAS as validações
   * (ferramenta, sleeping, inventário) — caller só passa o `equippedItem`
   * atual. Em falha, mantém o produto pendente pra próxima tentativa.
   *
   * Sempre seta `animal._collectFx` (FX flutuante) — sucesso vira "+1 X"
   * verde, falha vira mensagem vermelha curta. Caller não precisa exibir
   * feedback manualmente.
   *
   * @param {Object} animal
   * @param {Object} [options]
   * @param {Object|null} [options.equippedItem] item equipado pelo player
   * @returns {{ ok: true, itemId } | { ok: false, reason: string }}
   */
  collect(animal, options = {}) {
    if (!animal) return { ok: false, reason: 'no_animal' };
    if (!animal._pendingProduct) {
      this._setFx(animal, t('animal.production.notReady'), false);
      return { ok: false, reason: 'not_ready' };
    }

    // Recusa coleta quando dormindo (22h–6h). Mantém ovo/leite/lã
    // pendentes pro player coletar de manhã. Mesma convenção de pet/feed/guide.
    if (animal._mood === 'sleeping') {
      this._setFx(animal, t('animal.production.sleeping'), false);
      return { ok: false, reason: 'sleeping' };
    }

    // Tool check (interno aqui — antes era em control.js).
    const requiredTool = animal._pendingTool;
    if (requiredTool != null) {
      const equipped = options.equippedItem;
      if (!equipped || equipped.id !== requiredTool) {
        this._setFx(animal, t('animal.production.needsTool'), false);
        return { ok: false, reason: 'needs_tool' };
      }
    }

    const inv = getSystem('inventory');
    if (!inv || typeof inv.addItem !== 'function') {
      this._setFx(animal, t('animal.production.noInventory'), false);
      return { ok: false, reason: 'no_inventory' };
    }

    const itemId = animal._pendingProduct;
    const added = inv.addItem(itemId, 1);
    if (!added) {
      this._setFx(animal, t('animal.production.inventoryFull'), false);
      return { ok: false, reason: 'inventory_full' };
    }

    animal._pendingProduct = null;
    animal._pendingTool    = null;
    animal._lastProducedDay = _currentDay();

    // FX de sucesso: "+1 [nome do item]" verde.
    const productName = getItem(itemId)?.name || '?';
    const translated = t(`itemNames.${itemId}`);
    const displayName = (translated && translated !== `itemNames.${itemId}`) ? translated : productName;
    this._setFx(animal, `+1 ${displayName}`, true);

    document.dispatchEvent(new CustomEvent('animalProductCollected', {
      detail: { animal, itemId },
    }));

    return { ok: true, itemId };
  }

  /** Helper interno: seta FX flutuante no animal. Não persistido. */
  _setFx(animal, text, success) {
    animal._collectFx = {
      text,
      success,
      startedAt: performance.now(),
      duration: 1500,
    };
  }
}

export const productionSystem = new ProductionSystem();
registerSystem('animalProduction', productionSystem);

// Debug global pra console testing.
if (typeof window !== 'undefined') {
  window.productionTick = () => productionSystem.tickAll();
}

export default productionSystem;
