// scripts/storageSystem.js
import { items } from './item.js';

export class StorageSystem {
  constructor() {
    this.categories = this.defineCategories();
    this.maxStack = 50;
    this.storage = this.initializeEmptyStorage();
    this.init();
  }

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

  initializeEmptyStorage() {
    const initialStorage = {};
    Object.keys(this.categories).forEach(c => initialStorage[c] = []);
    return initialStorage;
  }

  init() {
    window.storageSystem = this;
  }

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

  _inventoryCategoryExists(category) {
    return !!(window.inventorySystem && window.inventorySystem.categories && window.inventorySystem.categories[category]);
  }

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

  depositFromInventory(categoryOrId, itemIdOrQty, quantity = 1) {
    if (!window.inventorySystem) return false;

    let inventoryCategory = categoryOrId;
    let itemId = itemIdOrQty;
    let qty = Math.floor(quantity); // Sanitização

    if (typeof categoryOrId === "number") {
      itemId = categoryOrId;
      qty = Math.floor(itemIdOrQty || 1);
      inventoryCategory = null;
    }

    if (qty < 1) return false;

    const itemData = items.find(i => i.id === itemId);
    if (!itemData) return false;

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

  withdrawToInventory(storageCategory, itemId, quantity = 1) {
    if (!window.inventorySystem) return false;

    const itemData = items.find(i => i.id === itemId);
    if (!itemData) return false;

    const removed = this.removeItem(storageCategory, itemId, quantity);
    if (!removed) {
      this.showMessage("item não encontrado no armazém");
      return false;
    }

    const added = window.inventorySystem.addItem(itemId, quantity);
    if (added) {
      this.showMessage(`retirado: ${quantity}x ${itemData.name}`);
      return true;
    }

    this._addToCategory(storageCategory, itemId, quantity);
    this.showMessage("inventário cheio");
    return false;
  }

  addItem(itemId, quantity = 1) {
    const itemData = items.find(i => i.id === itemId);
    if (!itemData) return false;

    const category = this.mapItemTypeToCategory(itemData.type);
    return this._addToCategory(category, itemId, quantity);
  }

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

  getItemQuantity(itemId) {
    let total = 0;
    for (const stacks of Object.values(this.storage)) {
      stacks
        .filter(s => s.itemId === itemId)
        .forEach(s => total += s.quantity);
    }
    return total;
  }

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

  resetStorage() {
    this.storage = this.initializeEmptyStorage();
  }

  showMessage(text) {
    if (typeof window.showMessage === "function") window.showMessage(text);
  }
}

export const storageSystem = new StorageSystem();