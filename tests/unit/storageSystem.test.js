import { describe, test, expect, beforeEach, mock } from 'bun:test';
import "../setup.js";

// Mock items module before importing StorageSystem
mock.module('../../public/scripts/item.js', () => ({
  items: [
    { id: 1, type: 'tool', name: 'Axe', price: 100 },
    { id: 2, type: 'resource', name: 'Wood', price: 10 },
    { id: 3, type: 'food', name: 'Apple', price: 5 },
    { id: 4, type: 'animal_food', name: 'Hay', price: 15 },
    { id: 5, type: 'seed', name: 'Wheat Seeds', price: 20 },
  ]
}));

// Import REAL StorageSystem class from production code
const { StorageSystem } = await import('../../public/scripts/storageSystem.js');

describe('StorageSystem (Production Implementation)', () => {
  let storage;

  beforeEach(() => {
    // Use the REAL StorageSystem implementation
    storage = new StorageSystem();
    // Reset storage before each test
    storage.resetStorage();
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
      expect(storage.categories.animals).toBeDefined();
      expect(storage.categories.animals.maxStacks).toBe(10);
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

  describe('addItem', () => {
    test('should add item to storage', () => {
      const result = storage.addItem(2, 10);

      expect(result).toBe(true);
      expect(storage.getItemQuantity(2)).toBe(10);
    });

    test('should stack items up to max', () => {
      storage.addItem(2, 30);
      storage.addItem(2, 30);

      expect(storage.getItemQuantity(2)).toBe(60);

      const info = storage.getStorageInfo();
      expect(info.categoryStats.resources.stackCount).toBe(2);
    });

    test('should create new stack when current is full', () => {
      storage.addItem(2, 50); // First stack (full)
      storage.addItem(2, 10); // Second stack (partial)

      const stacks = storage.storage.resources.filter(s => s.itemId === 2);
      expect(stacks.length).toBe(2);
      expect(stacks[0].quantity).toBe(50);
      expect(stacks[1].quantity).toBe(10);
    });

    test('should fail for invalid item', () => {
      const result = storage.addItem(999, 10);
      expect(result).toBe(false);
    });
  });

  describe('removeItem', () => {
    test('should remove items from storage', () => {
      storage.addItem(2, 20);

      const result = storage.removeItem(2, 10);

      expect(result).toBe(true);
      expect(storage.getItemQuantity(2)).toBe(10);
    });

    test('should remove empty stacks after withdrawal', () => {
      storage.addItem(2, 20);

      storage.removeItem(2, 20);

      expect(storage.getItemQuantity(2)).toBe(0);
      expect(storage.storage.resources.length).toBe(0);
    });

    test('should remove from multiple stacks', () => {
      storage.addItem(2, 50);
      storage.addItem(2, 30);

      const result = storage.removeItem(2, 60);

      expect(result).toBe(true);
      expect(storage.getItemQuantity(2)).toBe(20);
    });

    test('should return false when insufficient quantity but remove what is available', () => {
      storage.addItem(2, 10);

      const result = storage.removeItem(2, 20);

      // Returns false because couldn't remove full amount (remaining !== 0)
      expect(result).toBe(false);
      // But it removes what was available (all 10)
      expect(storage.getItemQuantity(2)).toBe(0);
    });

    test('should not affect other items in same category', () => {
      storage.addItem(2, 20);
      storage.addItem(3, 30);

      storage.removeItem(2, 10);

      expect(storage.getItemQuantity(2)).toBe(10);
      expect(storage.getItemQuantity(3)).toBe(30);
    });

    test('should return false for non-existent item', () => {
      const result = storage.removeItem(999, 10);
      expect(result).toBe(false);
    });
  });

  describe('getItemQuantity', () => {
    test('should return total quantity across all categories', () => {
      storage.addItem(2, 50);
      storage.addItem(2, 30);
      storage.addItem(2, 20);

      expect(storage.getItemQuantity(2)).toBe(100);
    });

    test('should return 0 for non-existent item', () => {
      expect(storage.getItemQuantity(999)).toBe(0);
    });
  });

  describe('findItem', () => {
    test('should find item in storage', () => {
      storage.addItem(2, 20);

      const found = storage.findItem(2);

      expect(found).toBeDefined();
      expect(found.category).toBe('resources');
      expect(found.stack.itemId).toBe(2);
      expect(found.stack.quantity).toBe(20);
    });

    test('should return null for non-existent item', () => {
      const found = storage.findItem(999);
      expect(found).toBeNull();
    });
  });

  describe('getStorageInfo', () => {
    test('should return storage statistics', () => {
      storage.addItem(2, 20);
      storage.addItem(3, 30);

      const info = storage.getStorageInfo();

      expect(info.totalItems).toBeGreaterThan(0);
      expect(info.totalValue).toBeGreaterThan(0);
      expect(info.categoryStats).toBeDefined();
    });

    test('should return correct item count per category', () => {
      storage.addItem(2, 20); // resource
      storage.addItem(3, 30); // food

      const info = storage.getStorageInfo();

      expect(info.categoryStats.resources.itemCount).toBe(20);
      expect(info.categoryStats.food.itemCount).toBe(30);
    });

    test('should return correct stack count per category', () => {
      storage.addItem(2, 50);
      storage.addItem(2, 30);
      storage.addItem(3, 20);

      const info = storage.getStorageInfo();

      expect(info.categoryStats.resources.stackCount).toBe(2);
      expect(info.categoryStats.food.stackCount).toBe(1);
    });

    test('should include maxStacks per category', () => {
      const info = storage.getStorageInfo();

      expect(info.categoryStats.tools.maxStacks).toBe(10);
      expect(info.categoryStats.resources.maxStacks).toBe(30);
    });
  });

  describe('resetStorage', () => {
    test('should reset all storage to empty', () => {
      storage.addItem(2, 20);
      storage.addItem(3, 30);
      storage.addItem(1, 5);

      storage.resetStorage();

      expect(storage.getItemQuantity(2)).toBe(0);
      expect(storage.getItemQuantity(3)).toBe(0);
      expect(storage.getItemQuantity(1)).toBe(0);
      expect(storage.storage.tools).toEqual([]);
      expect(storage.storage.resources).toEqual([]);
      expect(storage.storage.food).toEqual([]);
    });
  });

  describe('edge cases', () => {
    test('should handle large quantities spanning many stacks', () => {
      const result = storage.addItem(2, 500);

      expect(result).toBe(true);
      expect(storage.getItemQuantity(2)).toBe(500);

      const info = storage.getStorageInfo();
      expect(info.categoryStats.resources.stackCount).toBe(10); // 500/50 = 10 stacks
    });

   test('should remove from oldest stacks first (FIFO)', () => {
      // Fill first stack to max (50) to ensure next add creates a new stack
      storage.addItem(2, 50); 
      // Add to second stack
      storage.addItem(2, 30); 

      // Verify we have 2 stacks before removal
      const stacksBefore = storage.storage.resources.filter(s => s.itemId === 2);
      expect(stacksBefore.length).toBe(2);

      // Remove 10 items - should come from the first stack (FIFO)
      storage.removeItem(2, 10); 

      const stacksAfter = storage.storage.resources.filter(s => s.itemId === 2);
      expect(stacksAfter.length).toBe(2);
      
      // Oldest stack (originally 50) should be reduced
      expect(stacksAfter[0].quantity).toBe(40);
      // Newer stack (30) should remain untouched
      expect(stacksAfter[1].quantity).toBe(30);
    });


    test('should add timestamp to deposited items', () => {
      storage.addItem(2, 10);

      const stack = storage.storage.resources[0];
      expect(stack.addedAt).toBeDefined();
      expect(typeof stack.addedAt).toBe('number');
    });

    test('should respect category maxStacks limit', () => {
      // Tools has maxStacks: 10
      for (let i = 1; i <= 10; i++) {
        storage._addToCategory('tools', i, 50);
      }

      const info = storage.getStorageInfo();
      expect(info.categoryStats.tools.stackCount).toBe(10);

      // Try to add 11th stack - should fail because category is full
      const result = storage._addToCategory('tools', 99, 1);
      expect(result).toBe(false);
    });

    test('should respect maxStack limit per stack', () => {
      storage.addItem(2, 50);

      const stack = storage.storage.resources[0];
      expect(stack.quantity).toBe(50);

      // Adding more should create new stack
      storage.addItem(2, 1);

      const info = storage.getStorageInfo();
      expect(info.categoryStats.resources.stackCount).toBe(2);
    });

    test('should remove from oldest stacks first (FIFO)', () => {
      storage.addItem(2, 20); // First stack
      storage.addItem(2, 30); // Second stack

      storage.removeItem(2, 25); // Should remove 20 from first, 5 from second

      const stacks = storage.storage.resources.filter(s => s.itemId === 2);
      expect(stacks.length).toBe(1);
      expect(stacks[0].quantity).toBe(25);
    });
  });

  describe('production-specific methods', () => {
    test('should have mapToInventoryCategory method', () => {
      expect(typeof storage.mapToInventoryCategory).toBe('function');
      expect(storage.mapToInventoryCategory('tool')).toBe('tools');
      expect(storage.mapToInventoryCategory('resource')).toBe('resources');
    });

    test('should allow direct access to _addToCategory', () => {
      const result = storage._addToCategory('resources', 2, 10);
      expect(result).toBe(true);
      expect(storage.getItemQuantity(2)).toBe(10);
    });

    test('should track item prices in getStorageInfo', () => {
      storage.addItem(1, 2); // Axe: price 100, quantity 2
      storage.addItem(2, 5); // Wood: price 10, quantity 5

      const info = storage.getStorageInfo();

      // 2 * 100 + 5 * 10 = 250
      expect(info.totalValue).toBe(250);
    });
  });
});
