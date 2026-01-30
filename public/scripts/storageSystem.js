/**
 * @file storageSystem.js - Sistema de armazenamento em baús
 * @description Gerencia o armazenamento de itens em baús/containers separados do inventário.
 * Suporta múltiplas categorias de itens, stacking e transferência entre inventário e armazém.
 * @module StorageSystem
 */

import { items } from './item.js';
import { sanitizeQuantity, isValidPositiveInteger } from './validation.js';

/**
 * Sistema de armazenamento para baús e containers
 * Permite guardar itens organizados por categoria com limite de stacks
 * @class StorageSystem
 */
export class StorageSystem {
  /**
   * Construtor do sistema de armazenamento
   * Inicializa categorias, limite de stack e estrutura de armazenamento vazia
   */
  constructor() {
    this.categories = this.defineCategories();
    this.maxStack = 50;
    this.storage = this.initializeEmptyStorage();
    this.init();
  }

  /**
   * Define as categorias de armazenamento disponíveis
   * Cada categoria tem nome, ícone, tipos de itens aceitos, limite de stacks e cor
   * @returns {Object} Objeto com configuração de cada categoria
   */
  defineCategories() {
    return {
      tools: {
        name: "Ferramentas",
        icon: "",
        itemTypes: ["tool"],
        maxStacks: 10,
        color: "#FFD166"
      },
      construction: {
        name: "Construção",
        icon: "",
        itemTypes: ["construction", "decoration", "seed", "material"],
        maxStacks: 20,
        color: "#118AB2"
      },
      animals: {
        name: "Comida Animal",
        icon: "",
        itemTypes: ["animal_food"],
        maxStacks: 10,
        color: "#FF9E64"
      },
      food: {
        name: "Comida",
        icon: "",
        itemTypes: ["food"],
        maxStacks: 15,
        color: "#EF476F"
      },
      resources: {
        name: "Recursos",
        icon: "",
        itemTypes: ["resource", "crop"],
        maxStacks: 30,
        color: "#06D6A0"
      }
    };
  }

  /**
   * Inicializa estrutura de armazenamento vazia para todas as categorias
   * @returns {Object} Objeto com arrays vazios para cada categoria
   */
  initializeEmptyStorage() {
    const initialStorage = {};
    Object.keys(this.categories).forEach(c => initialStorage[c] = []);
    return initialStorage;
  }

  /**
   * Inicializa o sistema e expõe globalmente
   * @returns {void}
   */
  init() {
    window.storageSystem = this;
  }

  /**
   * Mapeia tipo de item para categoria de armazenamento
   * @param {string} itemType - Tipo do item (tool, food, seed, etc)
   * @returns {string} Nome da categoria de armazenamento
   */
  mapItemTypeToCategory(itemType) {
    const map = {
      tool: "tools",
      food: "food",
      animal_food: "animals",
      seed: "construction",
      construction: "construction",
      decoration: "construction",
      material: "construction",
      resource: "resources",
      crop: "resources"
    };
    return map[itemType] || "resources";
  }

  /**
   * Mapeia tipo de item para categoria de inventário do jogador
   * @param {string} itemType - Tipo do item
   * @returns {string} Nome da categoria de inventário correspondente
   */
  mapToInventoryCategory(itemType) {
    const map = {
      tool: "tools",
      food: "food",
      animal_food: "animal_food",
      seed: "seeds",
      construction: "construction",
      decoration: "construction",
      material: "resources",
      resource: "resources",
      crop: "resources"
    };
    return map[itemType] || "resources";
  }

  /**
   * Verifica se uma categoria existe no sistema de inventário
   * @private
   * @param {string} category - Nome da categoria
   * @returns {boolean} True se a categoria existe
   */
  _inventoryCategoryExists(category) {
    return !!(window.inventorySystem && window.inventorySystem.categories && window.inventorySystem.categories[category]);
  }

  /**
   * Adiciona itens a uma categoria específica do armazenamento
   * Gerencia stacking automático e criação de novos stacks quando necessário
   * @private
   * @param {string} storageCategory - Categoria de destino
   * @param {number} itemId - ID do item a adicionar
   * @param {number} quantity - Quantidade a adicionar
   * @returns {boolean} True se pelo menos um item foi adicionado
   */
  _addToCategory(storageCategory, itemId, quantity) {
    const config = this.categories[storageCategory];
    if (!config) return false;

    let remaining = quantity;

    while (remaining > 0) {
      let stack = this.storage[storageCategory].find(
        s => s.itemId === itemId && s.quantity < this.maxStack
      );

      if (stack) {
        const add = Math.min(remaining, this.maxStack - stack.quantity);
        stack.quantity += add;
        remaining -= add;
      } else {
        if (this.storage[storageCategory].length >= config.maxStacks) break;

        const add = Math.min(remaining, this.maxStack);
        this.storage[storageCategory].push({
          itemId,
          quantity: add,
          addedAt: Date.now()
        });

        remaining -= add;
      }
    }

    return remaining !== quantity;
  }

  /**
   * Deposita itens do inventário para o armazenamento
   * Suporta chamada com (category, itemId, quantity) ou (itemId, quantity)
   * @param {string|number} categoryOrId - Categoria de inventário ou ID do item
   * @param {number} itemIdOrQty - ID do item ou quantidade
   * @param {number} [quantity=1] - Quantidade a depositar
   * @returns {boolean} True se o depósito foi bem-sucedido
   */
  depositFromInventory(categoryOrId, itemIdOrQty, quantity = 1) {
    if (!window.inventorySystem) return false;

    let inventoryCategory = categoryOrId;
    let itemId = itemIdOrQty;
    let qty = quantity;

    if (typeof categoryOrId === "number") {
      itemId = categoryOrId;
      qty = itemIdOrQty || 1;
      inventoryCategory = null;
    }

    if (typeof qty !== 'number' || !Number.isFinite(qty)) {
      console.warn('[Storage] Invalid quantity:', qty);
      return false;
    }
    qty = sanitizeQuantity(qty, 1, 9999);

    // ✅ Validar que o itemId é um número positivo válido
    if (!isValidPositiveInteger(itemId)) {
      console.warn('[Storage] Item ID inválido:', itemId);
      return false;
    }

    const itemData = items.find(i => i.id === itemId);
    if (!itemData) {
      console.warn('[Storage] Item não encontrado:', itemId);
      return false;
    }

    const invCatOk = inventoryCategory && this._inventoryCategoryExists(inventoryCategory);

    const currentQuantity = invCatOk
      ? window.inventorySystem.getItemQuantity(inventoryCategory, itemId)
      : window.inventorySystem.getItemQuantity(itemId);

    if (currentQuantity < qty) {
      this.showMessage("quantidade insuficiente no inventário");
      return false;
    }

    const storageCategory = this.mapItemTypeToCategory(itemData.type);
    const categoryConfig = this.categories[storageCategory];
    if (!categoryConfig) {
        this.showMessage("categoria inválida");
        return false;
    }

    let remaining = qty;
    let deposited = 0;

    while (remaining > 0) {
      let existingStack = this.storage[storageCategory].find(
        s => s.itemId === itemId && s.quantity < this.maxStack
      );

      if (existingStack) {
        const add = Math.min(remaining, this.maxStack - existingStack.quantity);
        existingStack.quantity += add;
        remaining -= add;
        deposited += add;
      } else {
        if (this.storage[storageCategory].length >= categoryConfig.maxStacks) {
          this.showMessage(`armazém de ${categoryConfig.name} cheio`);
          break;
        }

        const add = Math.min(remaining, this.maxStack);
        this.storage[storageCategory].push({
          itemId,
          quantity: add,
          addedAt: Date.now()
        });

        remaining -= add;
        deposited += add;
      }
    }

    if (deposited <= 0) return false;

    const removedOk = invCatOk
      ? window.inventorySystem.removeItem(inventoryCategory, itemId, deposited)
      : window.inventorySystem.removeItem(itemId, deposited);

    // Se falhou remover do inventário, desfaz a adição
    if (!removedOk && removedOk !== undefined) {
      this.removeItem(storageCategory, itemId, deposited);
      this.showMessage("erro de sincronia com inventário");
      return false;
    }

    this.showMessage(`depositado: ${deposited}x ${itemData.name}`);
    return true;
  }

  /**
   * Retira itens do armazenamento para o inventário do jogador
   * @param {string} storageCategory - Categoria de armazenamento de origem
   * @param {number} itemId - ID do item a retirar
   * @param {number} [quantity=1] - Quantidade a retirar
   * @returns {boolean} True se a retirada foi bem-sucedida
   */
  withdrawToInventory(storageCategory, itemId, quantity = 1) {
    if (!window.inventorySystem) return false;

    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) {
      console.warn('[Storage] Invalid quantity:', quantity);
      return false;
    }
    const qty = sanitizeQuantity(quantity, 1, 9999);

    // ✅ Validar itemId
    if (!isValidPositiveInteger(itemId)) {
      console.warn('[Storage] Item ID inválido:', itemId);
      return false;
    }

    const itemData = items.find(i => i.id === itemId);
    if (!itemData) return false;

    const removed = this.removeItem(storageCategory, itemId, qty);
    if (!removed) {
      this.showMessage("item não encontrado no armazém");
      return false;
    }

    // ✅ CRÍTICO: Usar qty (sanitizado) em TODAS as etapas
    const added = window.inventorySystem.addItem(itemId, qty);
    if (added) {
      this.showMessage(`retirado: ${qty}x ${itemData.name}`);
      return true;
    }

    // Rollback: usar qty
    this._addToCategory(storageCategory, itemId, qty);
    this.showMessage("inventário cheio");
    return false;
  }

  /**
   * Adiciona item diretamente ao armazenamento (sem passar pelo inventário)
   * Determina automaticamente a categoria baseado no tipo do item
   * @param {number} itemId - ID do item a adicionar
   * @param {number} [quantity=1] - Quantidade a adicionar
   * @returns {boolean} True se a adição foi bem-sucedida
   */
  addItem(itemId, quantity = 1) {
    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) {
      console.warn('[Storage] Invalid quantity:', quantity);
      return false;
    }
    const qty = sanitizeQuantity(quantity, 1, 9999);

    // ✅ Validar itemId
    if (!isValidPositiveInteger(itemId)) {
      console.warn('[Storage] Item ID inválido:', itemId);
      return false;
    }

    const itemData = items.find(i => i.id === itemId);
    if (!itemData) return false;

    const category = this.mapItemTypeToCategory(itemData.type);
    return this._addToCategory(category, itemId, qty);
  }

  /**
   * Remove item do armazenamento
   * Suporta chamada com (category, itemId, quantity) ou (itemId, quantity)
   * Remove dos stacks mais antigos primeiro (FIFO)
   * @param {string|number} categoryOrId - Categoria ou ID do item
   * @param {number} itemIdOrQty - ID do item ou quantidade
   * @param {number} [quantity=1] - Quantidade a remover
   * @returns {boolean} True se a remoção foi bem-sucedida
   */
  removeItem(categoryOrId, itemIdOrQty, quantity = 1) {
    let category = categoryOrId;
    let id = itemIdOrQty;
    let qty = quantity;

    if (typeof categoryOrId === "number") {
      id = categoryOrId;
      qty = itemIdOrQty || 1;

      const found = this.findItem(id);
      if (!found) return false;

      category = found.category;
    }

    if (typeof qty !== 'number' || !Number.isFinite(qty)) {
      console.warn('[Storage] Invalid quantity:', qty);
      return false;
    }
    qty = sanitizeQuantity(qty, 1, 9999);

    // ✅ Validar itemId
    if (!isValidPositiveInteger(id)) {
      console.warn('[Storage] Item ID inválido:', id);
      return false;
    }

    if (!this.storage[category]) return false;

    const stacks = this.storage[category]
      .filter(s => s.itemId === id)
      .sort((a, b) => a.addedAt - b.addedAt);

    let remaining = qty;

    for (const stack of stacks) {
      if (remaining <= 0) break;
      const remove = Math.min(remaining, stack.quantity);
      stack.quantity -= remove;
      remaining -= remove;
    }

    this.storage[category] = this.storage[category].filter(s => s.quantity > 0);
    return remaining === 0;
  }

  /**
   * Localiza um item no armazenamento
   * @param {number} itemId - ID do item a localizar
   * @returns {Object|null} Objeto com categoria, stack e dados do item, ou null se não encontrado
   */
  findItem(itemId) {
    for (const [category, stacks] of Object.entries(this.storage)) {
      const stack = stacks.find(s => s.itemId === itemId);
      if (stack) {
        return {
          category,
          stack,
          itemData: items.find(i => i.id === itemId)
        };
      }
    }
    return null;
  }

  /**
   * Obtém a quantidade total de um item no armazenamento (todas as categorias)
   * @param {number} itemId - ID do item
   * @returns {number} Quantidade total do item
   */
  getItemQuantity(itemId) {
    let total = 0;
    for (const stacks of Object.values(this.storage)) {
      stacks
        .filter(s => s.itemId === itemId)
        .forEach(s => total += s.quantity);
    }
    return total;
  }

  /**
   * Verifica se o jogador possui um item no inventário
   * @param {string|number} categoryOrId - Categoria ou ID do item
   * @param {number|null} [itemId=null] - ID do item (quando categoryOrId é string)
   * @returns {boolean} True se o item existe no inventário
   */
  hasItemInInventory(categoryOrId, itemId = null) {
    if (!window.inventorySystem) return false;

    if (typeof categoryOrId === "number") {
      return window.inventorySystem.getItemQuantity(categoryOrId) > 0;
    }

    const category = categoryOrId;
    if (this._inventoryCategoryExists(category)) {
      return window.inventorySystem.getItemQuantity(category, itemId) > 0;
    }

    return window.inventorySystem.getItemQuantity(itemId) > 0;
  }

  /**
   * Obtém informações detalhadas sobre o estado do armazenamento
   * Inclui contagem total de itens, valor total e estatísticas por categoria
   * @returns {Object} Objeto com estatísticas do armazenamento
   */
  getStorageInfo() {
    const info = {
      totalItems: 0,
      totalValue: 0,
      categoryStats: {}
    };

    for (const [category, stacks] of Object.entries(this.storage)) {
      const config = this.categories[category];
      const stats = {
        itemCount: 0,
        stackCount: stacks.length,
        maxStacks: config.maxStacks
      };

      stacks.forEach(stack => {
        const data = items.find(i => i.id === stack.itemId);
        if (data) {
          stats.itemCount += stack.quantity;
          info.totalItems += stack.quantity;
          info.totalValue += (data.price || 0) * stack.quantity;
        }
      });

      info.categoryStats[category] = stats;
    }

    return info;
  }

  /**
   * Reseta todo o armazenamento para estado inicial (vazio)
   * @returns {void}
   */
  resetStorage() {
    this.storage = this.initializeEmptyStorage();
  }

  /**
   * Exibe uma mensagem de feedback ao jogador
   * Usa a função global showMessage se disponível
   * @param {string} text - Texto da mensagem
   * @returns {void}
   */
  showMessage(text) {
    if (typeof window.showMessage === "function") window.showMessage(text);
  }
}

export const storageSystem = new StorageSystem();