import { describe, test, expect, beforeEach } from 'bun:test';
import "../setup.js";

// Mock the items array for testing
const mockItems = [
  { id: 1, name: 'Axe', type: 'tool', toolType: 'axe', price: 100 },
  { id: 2, name: 'Pickaxe', type: 'tool', toolType: 'pickaxe', price: 150 },
  { id: 3, name: 'Apple', type: 'food', price: 10, fillUp: { hunger: 20 } },
];

// Helper function to test (copy from itemUtils.js or import)
function findItemById(items, id) {
  return items.find(item => item.id === id);
}

function findItemByName(items, name) {
  return items.find(item =>
    item.name.toLowerCase() === name.toLowerCase()
  );
}

describe('Item Utilities', () => {
  describe('findItemById', () => {
    test('should find item by valid id', () => {
      const item = findItemById(mockItems, 1);
      expect(item).toBeDefined();
      expect(item.name).toBe('Axe');
    });

    test('should return undefined for invalid id', () => {
      const item = findItemById(mockItems, 999);
      expect(item).toBeUndefined();
    });

    test('should handle empty array', () => {
      const item = findItemById([], 1);
      expect(item).toBeUndefined();
    });
  });

  describe('findItemByName', () => {
    test('should find item by exact name', () => {
      const item = findItemByName(mockItems, 'Axe');
      expect(item).toBeDefined();
      expect(item.id).toBe(1);
    });

    test('should be case insensitive', () => {
      const item = findItemByName(mockItems, 'AXE');
      expect(item).toBeDefined();
      expect(item.id).toBe(1);
    });

    test('should return undefined for non-existent name', () => {
      const item = findItemByName(mockItems, 'Sword');
      expect(item).toBeUndefined();
    });
  });
});
