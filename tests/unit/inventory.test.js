import { describe, test, expect, beforeEach } from 'bun:test';
import "../setup.js";

// Simple inventory implementation for testing
class TestInventory {
  constructor(maxSlots = 10, maxStack = 50) {
    this.maxSlots = maxSlots;
    this.maxStack = maxStack;
    this.items = [];
  }

  addItem(item, quantity = 1) {
    // Find existing stack
    const existing = this.items.find(
      i => i.id === item.id && i.quantity < this.maxStack
    );

    if (existing) {
      const spaceInStack = this.maxStack - existing.quantity;
      const toAdd = Math.min(quantity, spaceInStack);
      existing.quantity += toAdd;

      if (quantity > toAdd) {
        return this.addItem(item, quantity - toAdd);
      }
      return true;
    }

    // Create new stack
    if (this.items.length < this.maxSlots) {
      this.items.push({ ...item, quantity: Math.min(quantity, this.maxStack) });

      if (quantity > this.maxStack) {
        return this.addItem(item, quantity - this.maxStack);
      }
      return true;
    }

    return false; // Inventory full
  }

  removeItem(itemId, quantity = 1) {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index === -1) return false;

    const item = this.items[index];
    if (item.quantity <= quantity) {
      this.items.splice(index, 1);
    } else {
      item.quantity -= quantity;
    }
    return true;
  }

  getItemCount(itemId) {
    return this.items
      .filter(i => i.id === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  }
}

describe('Inventory System', () => {
  let inventory;
  const testItem = { id: 1, name: 'Wood', type: 'resource' };

  beforeEach(() => {
    inventory = new TestInventory(10, 50);
  });

  describe('addItem', () => {
    test('should add item to empty inventory', () => {
      const result = inventory.addItem(testItem, 5);
      expect(result).toBe(true);
      expect(inventory.getItemCount(1)).toBe(5);
    });

    test('should stack items up to max', () => {
      inventory.addItem(testItem, 30);
      inventory.addItem(testItem, 30);

      // Should create two stacks: 50 + 10
      expect(inventory.getItemCount(1)).toBe(60);
      expect(inventory.items.length).toBe(2);
    });

    test('should fail when inventory is full', () => {
      // Fill inventory
      for (let i = 0; i < 10; i++) {
        inventory.addItem({ id: i, name: `Item ${i}` }, 50);
      }

      const result = inventory.addItem({ id: 99, name: 'New' }, 1);
      expect(result).toBe(false);
    });
  });

  describe('removeItem', () => {
    test('should remove partial stack', () => {
      inventory.addItem(testItem, 10);
      inventory.removeItem(1, 5);

      expect(inventory.getItemCount(1)).toBe(5);
    });

    test('should remove entire stack when quantity matches', () => {
      inventory.addItem(testItem, 10);
      inventory.removeItem(1, 10);

      expect(inventory.getItemCount(1)).toBe(0);
      expect(inventory.items.length).toBe(0);
    });

    test('should return false for non-existent item', () => {
      const result = inventory.removeItem(999, 1);
      expect(result).toBe(false);
    });
  });
});
