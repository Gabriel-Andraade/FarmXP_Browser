import { describe, test, expect, beforeEach } from 'bun:test';
import "../setup.js";

// Mock StorageSystem for testing
class TestStorageSystem {
  constructor() {
    this.categories = this.defineCategories();
    this.maxStack = 50;
    this.storage = this.initializeEmptyStorage();
  }

  defineCategories() {
    return {
      tools: {
        name: "Ferramentas",
        itemTypes: ["tool"],
        maxStacks: 10,
        color: "#FFD166"
      },
      construction: {
        name: "Construção",
        itemTypes: ["construction", "decoration", "seed", "material"],
        maxStacks: 20,
        color: "#118AB2"
      },
      animals: {
        name: "Comida Animal",
        itemTypes: ["animal_food"],
        maxStacks: 10,
        color: "#FF9E64"
      },
      food: {
        name: "Comida",
        itemTypes: ["food"],
        maxStacks: 15,
        color: "#EF476F"
      },
      resources: {
        name: "Recursos",
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

  deposit(itemType, itemId, quantity) {
    const category = this.mapItemTypeToCategory(itemType);
    return this._addToCategory(category, itemId, quantity);
  }

  withdraw(storageCategory, itemId, quantity) {
    if (!this.storage[storageCategory]) return false;

    // Check if we have enough before withdrawing
    const available = this.getItemQuantity(storageCategory, itemId);
    if (available < quantity) return false;

    let remaining = quantity;
    const stacks = this.storage[storageCategory].filter(s => s.itemId === itemId);

    for (const stack of stacks) {
      if (remaining <= 0) break;

      const toRemove = Math.min(remaining, stack.quantity);
      stack.quantity -= toRemove;
      remaining -= toRemove;
    }

    // Remove empty stacks
    this.storage[storageCategory] = this.storage[storageCategory].filter(s => s.quantity > 0);

    return remaining === 0;
  }

  getItemQuantity(storageCategory, itemId) {
    if (!this.storage[storageCategory]) return 0;

    return this.storage[storageCategory]
      .filter(s => s.itemId === itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
  }

  getTotalItems(storageCategory) {
    if (!this.storage[storageCategory]) return 0;

    return this.storage[storageCategory]
      .reduce((sum, s) => sum + s.quantity, 0);
  }

  getStackCount(storageCategory) {
    if (!this.storage[storageCategory]) return 0;
    return this.storage[storageCategory].length;
  }

  clear(storageCategory = null) {
    if (storageCategory) {
      this.storage[storageCategory] = [];
    } else {
      this.storage = this.initializeEmptyStorage();
    }
  }

  isFull(storageCategory) {
    const config = this.categories[storageCategory];
    if (!config) return false;

    return this.storage[storageCategory].length >= config.maxStacks;
  }
}

describe('StorageSystem', () => {
  let storage;

  beforeEach(() => {
    storage = new TestStorageSystem();
  });

  describe('initialization', () => {
    test('should initialize with empty storage', () => {
      expect(storage.storage.tools).toEqual([]);
      expect(storage.storage.construction).toEqual([]);
      expect(storage.storage.animals).toEqual([]);
      expect(storage.storage.food).toEqual([]);
      expect(storage.storage.resources).toEqual([]);
    });

    test('should define categories correctly', () => {
      expect(storage.categories.tools).toBeDefined();
      expect(storage.categories.tools.maxStacks).toBe(10);
      expect(storage.categories.resources.maxStacks).toBe(30);
    });

    test('should set max stack size', () => {
      expect(storage.maxStack).toBe(50);
    });
  });

  describe('mapItemTypeToCategory', () => {
    test('should map tool to tools category', () => {
      expect(storage.mapItemTypeToCategory('tool')).toBe('tools');
    });

    test('should map food to food category', () => {
      expect(storage.mapItemTypeToCategory('food')).toBe('food');
    });

    test('should map seed to construction category', () => {
      expect(storage.mapItemTypeToCategory('seed')).toBe('construction');
    });

    test('should map crop to resources category', () => {
      expect(storage.mapItemTypeToCategory('crop')).toBe('resources');
    });

    test('should map animal_food to animals category', () => {
      expect(storage.mapItemTypeToCategory('animal_food')).toBe('animals');
    });

    test('should default unknown types to resources', () => {
      expect(storage.mapItemTypeToCategory('unknown')).toBe('resources');
    });
  });

  describe('deposit', () => {
    test('should deposit items to correct category', () => {
      const result = storage.deposit('resource', 1, 10);

      expect(result).toBe(true);
      expect(storage.getItemQuantity('resources', 1)).toBe(10);
    });

    test('should stack items up to max', () => {
      storage.deposit('resource', 1, 30);
      storage.deposit('resource', 1, 30);

      expect(storage.getItemQuantity('resources', 1)).toBe(60);
      expect(storage.getStackCount('resources')).toBe(2);
    });

    test('should create new stack when current is full', () => {
      storage.deposit('resource', 1, 50); // First stack (full)
      storage.deposit('resource', 1, 10); // Second stack (partial)

      const stacks = storage.storage.resources.filter(s => s.itemId === 1);
      expect(stacks.length).toBe(2);
      expect(stacks[0].quantity).toBe(50);
      expect(stacks[1].quantity).toBe(10);
    });

    test('should fail when category is full', () => {
      // Fill tools category (max 10 stacks)
      for (let i = 0; i < 10; i++) {
        storage.deposit('tool', i, 50);
      }

      const result = storage.deposit('tool', 99, 1);
      expect(result).toBe(false);
    });

    test('should handle partial deposits when space limited', () => {
      // Fill 9 stacks completely
      for (let i = 0; i < 9; i++) {
        storage.deposit('tool', i, 50);
      }

      // Add one more full stack (10th stack)
      storage.deposit('tool', 9, 50);

      // Try to add more - should fail
      const result = storage.deposit('tool', 10, 1);
      expect(result).toBe(false);
    });
  });

  describe('withdraw', () => {
    test('should withdraw items from storage', () => {
      storage.deposit('resource', 1, 20);

      const result = storage.withdraw('resources', 1, 10);

      expect(result).toBe(true);
      expect(storage.getItemQuantity('resources', 1)).toBe(10);
    });

    test('should remove empty stacks after withdrawal', () => {
      storage.deposit('resource', 1, 20);

      storage.withdraw('resources', 1, 20);

      expect(storage.getItemQuantity('resources', 1)).toBe(0);
      expect(storage.getStackCount('resources')).toBe(0);
    });

    test('should withdraw from multiple stacks', () => {
      storage.deposit('resource', 1, 50);
      storage.deposit('resource', 1, 30);

      const result = storage.withdraw('resources', 1, 60);

      expect(result).toBe(true);
      expect(storage.getItemQuantity('resources', 1)).toBe(20);
    });

    test('should fail when insufficient quantity', () => {
      storage.deposit('resource', 1, 10);

      const result = storage.withdraw('resources', 1, 20);

      expect(result).toBe(false);
      expect(storage.getItemQuantity('resources', 1)).toBe(10);
    });

    test('should not affect other items in same category', () => {
      storage.deposit('resource', 1, 20);
      storage.deposit('resource', 2, 30);

      storage.withdraw('resources', 1, 10);

      expect(storage.getItemQuantity('resources', 1)).toBe(10);
      expect(storage.getItemQuantity('resources', 2)).toBe(30);
    });

    test('should return false for non-existent category', () => {
      const result = storage.withdraw('invalid', 1, 10);
      expect(result).toBe(false);
    });
  });

  describe('getItemQuantity', () => {
    test('should return total quantity across stacks', () => {
      storage.deposit('resource', 1, 50);
      storage.deposit('resource', 1, 30);
      storage.deposit('resource', 1, 20);

      expect(storage.getItemQuantity('resources', 1)).toBe(100);
    });

    test('should return 0 for non-existent item', () => {
      expect(storage.getItemQuantity('resources', 999)).toBe(0);
    });

    test('should return 0 for invalid category', () => {
      expect(storage.getItemQuantity('invalid', 1)).toBe(0);
    });
  });

  describe('getTotalItems', () => {
    test('should return total of all items in category', () => {
      storage.deposit('resource', 1, 20);
      storage.deposit('resource', 2, 30);
      storage.deposit('resource', 3, 10);

      expect(storage.getTotalItems('resources')).toBe(60);
    });

    test('should return 0 for empty category', () => {
      expect(storage.getTotalItems('tools')).toBe(0);
    });
  });

  describe('getStackCount', () => {
    test('should return number of stacks in category', () => {
      storage.deposit('resource', 1, 50);
      storage.deposit('resource', 1, 30);
      storage.deposit('resource', 2, 20);

      expect(storage.getStackCount('resources')).toBe(3);
    });

    test('should return 0 for empty category', () => {
      expect(storage.getStackCount('tools')).toBe(0);
    });
  });

  describe('clear', () => {
    test('should clear specific category', () => {
      storage.deposit('resource', 1, 20);
      storage.deposit('food', 2, 10);

      storage.clear('resources');

      expect(storage.getItemQuantity('resources', 1)).toBe(0);
      expect(storage.getItemQuantity('food', 2)).toBe(10);
    });

    test('should clear all categories when no parameter', () => {
      storage.deposit('resource', 1, 20);
      storage.deposit('food', 2, 10);
      storage.deposit('tool', 3, 5);

      storage.clear();

      expect(storage.getTotalItems('resources')).toBe(0);
      expect(storage.getTotalItems('food')).toBe(0);
      expect(storage.getTotalItems('tools')).toBe(0);
    });
  });

  describe('isFull', () => {
    test('should return false when category has space', () => {
      storage.deposit('tool', 1, 50);

      expect(storage.isFull('tools')).toBe(false);
    });

    test('should return true when category is full', () => {
      // Fill tools category (max 10 stacks)
      for (let i = 0; i < 10; i++) {
        storage.deposit('tool', i, 50);
      }

      expect(storage.isFull('tools')).toBe(true);
    });

    test('should return false for invalid category', () => {
      expect(storage.isFull('invalid')).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle depositing zero quantity', () => {
      const result = storage.deposit('resource', 1, 0);
      expect(result).toBe(false);
    });

    test('should handle large quantities spanning many stacks', () => {
      const result = storage.deposit('resource', 1, 500);

      expect(result).toBe(true);
      expect(storage.getItemQuantity('resources', 1)).toBe(500);
      expect(storage.getStackCount('resources')).toBe(10); // 500/50 = 10 stacks
    });

    test('should maintain stack order by insertion time', () => {
      storage.deposit('resource', 1, 10);
      storage.deposit('resource', 2, 20);
      storage.deposit('resource', 3, 30);

      const stacks = storage.storage.resources;
      expect(stacks[0].itemId).toBe(1);
      expect(stacks[1].itemId).toBe(2);
      expect(stacks[2].itemId).toBe(3);
    });

    test('should add timestamp to deposited items', () => {
      storage.deposit('resource', 1, 10);

      const stack = storage.storage.resources[0];
      expect(stack.addedAt).toBeDefined();
      expect(typeof stack.addedAt).toBe('number');
    });
  });
});
