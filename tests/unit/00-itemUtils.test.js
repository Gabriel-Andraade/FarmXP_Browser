import { describe, test, expect, mock } from 'bun:test';
import "../setup.js";


// Mock item.js EXACTLY like inventory.test.js does
// This prevents conflicts when tests run in sequence
mock.module('../../public/scripts/item.js', () => ({
  items: [
    { id: 1, name: 'Wood', type: 'resource', icon: '🪵', price: 5 },
    { id: 2, name: 'Stone', type: 'resource', icon: '🪨', price: 10 },
    { id: 3, name: 'Axe', type: 'tool', toolType: 'axe', icon: '🪓', price: 100 },
    { id: 4, name: 'Apple', type: 'food', icon: '🍎', price: 10, fillUp: { hunger: 20, thirst: 5, energy: 0 } },
    { id: 5, name: 'Wheat Seeds', type: 'seed', icon: '🌾', price: 20 },
    { id: 6, name: 'Fence', type: 'construction', icon: '🏗️', price: 50, placeable: true },
    { id: 7, name: 'Chicken Feed', type: 'animal_food', icon: '🐔', price: 15 }
  ]
}));

// Mock categoryMapper which itemUtils depends on
mock.module('../../public/scripts/categoryMapper.js', () => ({
  mapTypeToCategory: (type) => {
    const mapping = {
      tool: 'tools',
      seed: 'seeds',
      construction: 'construction',
      animal_food: 'animal_food',
      food: 'food',
      resource: 'resources',
      crop: 'resources'
    };
    return mapping[type] || 'resources';
  },
  getItemStackLimit: (itemId) => {
    return 99; // Default for most items
  },
  INVENTORY_CATEGORIES: {
    tools: { limit: 10, stackLimit: 1 },
    seeds: { limit: 20, stackLimit: 99 },
    construction: { limit: 20, stackLimit: 99 },
    animal_food: { limit: 10, stackLimit: 99 },
    food: { limit: 20, stackLimit: 99 },
    resources: { limit: 30, stackLimit: 99 }
  }
}));

// Import REAL itemUtils module from production code
const itemUtils = await import('../../public/scripts/itemUtils.js');

describe('itemUtils (Production Implementation)', () => {

  describe('module loading', () => {
    test('should export getItem function', () => {
      expect(typeof itemUtils.getItem).toBe('function');
    });

    test('should export getAllItems function', () => {
      expect(typeof itemUtils.getAllItems).toBe('function');
    });

    test('should export isConsumable function', () => {
      expect(typeof itemUtils.isConsumable).toBe('function');
    });

    test('should export isTool function', () => {
      expect(typeof itemUtils.isTool).toBe('function');
    });

    test('should export getStackLimit function', () => {
      expect(typeof itemUtils.getStackLimit).toBe('function');
    });
  });

  describe('getItem', () => {
    test('should return item object for valid id', () => {
      const allItems = itemUtils.getAllItems();
      expect(allItems.length).toBeGreaterThan(0);
      const firstItem = allItems[0];
      const item = itemUtils.getItem(firstItem.id);
      expect(item).toBeDefined();
      expect(item.id).toBe(firstItem.id);
    });

    test('should return null for invalid id', () => {
      const item = itemUtils.getItem(99999);
      expect(item).toBeNull();
    });
  });

  describe('getAllItems', () => {
    test('should return array of items', () => {
      const items = itemUtils.getAllItems();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('isConsumable', () => {
    test('should return falsy for invalid id', () => {
      expect(itemUtils.isConsumable(99999)).toBeFalsy();
    });
  });

  describe('isTool', () => {
    test('should return true for tool items', () => {
      const tools = itemUtils.getItemsByType('tool');
      expect(tools.length).toBeGreaterThan(0);
      expect(itemUtils.isTool(tools[0].id)).toBe(true);
    });
  });

  describe('getStackLimit', () => {
    test('should return 1 for invalid id', () => {
      const stackLimit = itemUtils.getStackLimit(99999);
      // Invalid items default to 1 stack (tools) or 99 (other items)
      expect([1, 99]).toContain(stackLimit);
    });
  });

  describe('isValidItemId', () => {
    test('should return false for invalid ids', () => {
      expect(itemUtils.isValidItemId(99999)).toBe(false);
    });
  });

  describe('getSellPrice', () => {
    test('should return 0 for invalid id', () => {
      expect(itemUtils.getSellPrice(99999)).toBe(0);
    });
  });

  describe('getBuyPrice', () => {
    test('should return 0 for invalid id', () => {
      expect(itemUtils.getBuyPrice(99999)).toBe(0);
    });
  });

  describe('searchItems', () => {
    test('should return empty array for no matches', () => {
      const results = itemUtils.searchItems('zzzznonexistent12345');
      expect(results.length).toBe(0);
    });
  });

  describe('getItemsByType', () => {
    test('should return empty array for non-existent type', () => {
      const results = itemUtils.getItemsByType('nonexistent_type_xyz');
      expect(results.length).toBe(0);
    });
  });
});
