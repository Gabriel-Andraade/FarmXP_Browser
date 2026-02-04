import { describe, test, expect, beforeEach, mock } from 'bun:test';
import "../setup.js";

// Mock item.js with test data
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

// Mock playerInventory.js
mock.module('../../public/scripts/thePlayer/playerInventory.js', () => ({
  consumeItem: () => true,
  equipItem: () => true,
  discardItem: () => true
}));

// Mock categoryMapper.js with INVENTORY_CATEGORIES
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
  INVENTORY_CATEGORIES: {
    tools: { limit: 10, stackLimit: 1 },
    seeds: { limit: 20, stackLimit: 99 },
    construction: { limit: 20, stackLimit: 99 },
    animal_food: { limit: 10, stackLimit: 99 },
    food: { limit: 20, stackLimit: 99 },
    resources: { limit: 30, stackLimit: 99 }
  }
}));

// Mock itemUtils.js
mock.module('../../public/scripts/itemUtils.js', () => ({
  getItem: (id) => {
    const items = [
      { id: 1, name: 'Wood', type: 'resource', icon: '🪵', price: 5 },
      { id: 2, name: 'Stone', type: 'resource', icon: '🪨', price: 10 },
      { id: 3, name: 'Axe', type: 'tool', toolType: 'axe', icon: '🪓', price: 100 },
      { id: 4, name: 'Apple', type: 'food', icon: '🍎', price: 10, fillUp: { hunger: 20, thirst: 5, energy: 0 } },
      { id: 5, name: 'Wheat Seeds', type: 'seed', icon: '🌾', price: 20 },
      { id: 6, name: 'Fence', type: 'construction', icon: '🏗️', price: 50, placeable: true },
      { id: 7, name: 'Chicken Feed', type: 'animal_food', icon: '🐔', price: 15 }
    ];
    return items.find(item => item.id === id) || null;
  },
  getStackLimit: (id) => {
    const items = [
      { id: 1, type: 'resource' },
      { id: 2, type: 'resource' },
      { id: 3, type: 'tool' },
      { id: 4, type: 'food' },
      { id: 5, type: 'seed' },
      { id: 6, type: 'construction' },
      { id: 7, type: 'animal_food' }
    ];
    const item = items.find(i => i.id === id);
    if (!item) return 99;
    return item.type === 'tool' ? 1 : 99;
  },
  isPlaceable: (id) => {
    return id === 6; // Only Fence is placeable
  }
}));

// Import REAL InventorySystem class from production code
const { InventorySystem } = await import('../../public/scripts/thePlayer/inventorySystem.js');

describe('InventorySystem (Production Implementation)', () => {
  let inventory;

  beforeEach(() => {
    // Use the REAL InventorySystem implementation
    inventory = new InventorySystem();
    inventory.clear();
  });

  describe('initialization', () => {
    test('should initialize with empty categories', () => {
      expect(inventory.categories.tools.items).toEqual([]);
      expect(inventory.categories.resources.items).toEqual([]);
      expect(inventory.categories.food.items).toEqual([]);
    });

    test('should have correct category limits', () => {
      expect(inventory.categories.tools.limit).toBe(10);
      expect(inventory.categories.resources.limit).toBe(30);
      expect(inventory.categories.food.limit).toBe(20);
    });

    test('should initialize equipped items as null', () => {
      expect(inventory.equipped.tool).toBeNull();
      expect(inventory.equipped.food).toBeNull();
    });
  });

  describe('addItem', () => {
    test('should add item to correct category by ID', () => {
      const result = inventory.addItem(1, 5); // Wood (resource)

      expect(result).toBe(true);
      expect(inventory.getItemQuantity(1)).toBe(5);
    });

    test('should add tool to tools category', () => {
      inventory.addItem(3, 1); // Axe (tool)

      expect(inventory.categories.tools.items.length).toBe(1);
      expect(inventory.categories.tools.items[0].name).toBe('Axe');
    });

    test('should add food to food category', () => {
      inventory.addItem(4, 3); // Apple (food)

      expect(inventory.categories.food.items.length).toBe(1);
      expect(inventory.categories.food.items[0].name).toBe('Apple');
    });

    test('should add seed to seeds category', () => {
      inventory.addItem(5, 10); // Wheat Seeds

      expect(inventory.categories.seeds.items.length).toBe(1);
    });

    test('should stack items up to stack limit', () => {
      inventory.addItem(1, 50); // Wood
      inventory.addItem(1, 30); // More Wood

      expect(inventory.getItemQuantity(1)).toBe(80);
    });

    test('should handle adding large quantities', () => {
      // Add a resource item and verify it's added
      inventory.addItem(1, 50);

      expect(inventory.getItemQuantity(1)).toBe(50);
    });

    test('should return false for invalid item ID', () => {
      const result = inventory.addItem(999, 1);
      expect(result).toBe(false);
    });

    test('should fail when category is full', () => {
      // Fill tools category (limit: 10, stack limit: 1 for tools)
      for (let i = 0; i < 10; i++) {
        inventory.categories.tools.items.push({ id: 100 + i, name: `Tool ${i}`, quantity: 1 });
      }

      const result = inventory.addItem(3, 1); // Try to add Axe
      expect(result).toBe(false);
    });
  });

  describe('removeItem', () => {
    test('should remove partial quantity from stack', () => {
      inventory.addItem(1, 10); // Wood
      inventory.removeItem(1, 5);

      expect(inventory.getItemQuantity(1)).toBe(5);
    });

    test('should remove entire stack when quantity matches', () => {
      inventory.addItem(1, 10);
      inventory.removeItem(1, 10);

      expect(inventory.getItemQuantity(1)).toBe(0);
      expect(inventory.categories.resources.items.length).toBe(0);
    });

    test('should return false for non-existent item', () => {
      const result = inventory.removeItem(999, 1);
      expect(result).toBe(false);
    });

    test('should return false when trying to remove more than available', () => {
      inventory.addItem(1, 5);
      const result = inventory.removeItem(1, 10);

      expect(result).toBe(false);
      expect(inventory.getItemQuantity(1)).toBe(5); // Unchanged
    });

    test('should unequip tool when removed', () => {
      inventory.addItem(3, 1); // Axe
      inventory.equipped.tool = 3;

      inventory.removeItem(3, 1);

      expect(inventory.equipped.tool).toBeNull();
    });
  });

  describe('getItemQuantity', () => {
    test('should return correct quantity', () => {
      inventory.addItem(1, 50);

      expect(inventory.getItemQuantity(1)).toBe(50);
    });

    test('should return 0 for non-existent item', () => {
      expect(inventory.getItemQuantity(999)).toBe(0);
    });

    test('should support category-based query', () => {
      inventory.addItem(1, 10); // Wood to resources

      const qty = inventory.getItemQuantity('resources', 1);
      expect(qty).toBe(10);
    });
  });

  describe('equipItem', () => {
    test('should equip tool', () => {
      inventory.addItem(3, 1); // Axe

      const result = inventory.equipItem('tools', 3);

      expect(result).toBe(true);
      expect(inventory.equipped.tool).toBe(3);
    });

    test('should equip food', () => {
      inventory.addItem(4, 1); // Apple

      const result = inventory.equipItem('food', 4);

      expect(result).toBe(true);
      expect(inventory.equipped.food).toBe(4);
    });

    test('should return false for non-existent item', () => {
      const result = inventory.equipItem('tools', 999);
      expect(result).toBe(false);
    });

    test('should return false for invalid category', () => {
      inventory.addItem(1, 1); // Wood

      const result = inventory.equipItem('resources', 1);
      expect(result).toBe(false);
    });
  });

  describe('findItemCategory', () => {
    test('should find category of item', () => {
      inventory.addItem(1, 5); // Wood -> resources

      const category = inventory.findItemCategory(1);
      expect(category).toBe('resources');
    });

    test('should return null for item not in inventory', () => {
      const category = inventory.findItemCategory(999);
      expect(category).toBeNull();
    });
  });

  describe('getAvailableSpace', () => {
    test('should return correct available space', () => {
      expect(inventory.getAvailableSpace('tools')).toBe(10);

      inventory.addItem(3, 1); // Add one tool
      expect(inventory.getAvailableSpace('tools')).toBe(9);
    });

    test('should return 0 for invalid category', () => {
      expect(inventory.getAvailableSpace('invalid')).toBe(0);
    });
  });

  describe('clear', () => {
    test('should remove all items from all categories', () => {
      inventory.addItem(1, 10); // Wood
      inventory.addItem(3, 1);  // Axe
      inventory.addItem(4, 5);  // Apple

      inventory.clear();

      expect(inventory.getItemQuantity(1)).toBe(0);
      expect(inventory.getItemQuantity(3)).toBe(0);
      expect(inventory.getItemQuantity(4)).toBe(0);
    });

    test('should reset equipped items', () => {
      inventory.addItem(3, 1);
      inventory.equipped.tool = 3;

      inventory.clear();

      expect(inventory.equipped.tool).toBeNull();
      expect(inventory.equipped.food).toBeNull();
    });
  });

  describe('getInventory', () => {
    test('should return all categories', () => {
      const inv = inventory.getInventory();

      expect(inv.tools).toBeDefined();
      expect(inv.seeds).toBeDefined();
      expect(inv.construction).toBeDefined();
      expect(inv.animal_food).toBeDefined();
      expect(inv.food).toBeDefined();
      expect(inv.resources).toBeDefined();
    });
  });

  describe('getEquippedItems', () => {
    test('should return equipped items state', () => {
      const equipped = inventory.getEquippedItems();

      expect(equipped).toHaveProperty('tool');
      expect(equipped).toHaveProperty('food');
    });
  });

  describe('setSelectedItem', () => {
    test('should select item from inventory', () => {
      inventory.addItem(1, 5); // Wood

      const result = inventory.setSelectedItem(1);

      expect(result).toBe(true);
      expect(inventory.getSelectedItem()).toBeDefined();
      expect(inventory.getSelectedItem().id).toBe(1);
    });

    test('should return false for item not in inventory', () => {
      const result = inventory.setSelectedItem(999);

      expect(result).toBe(false);
      expect(inventory.getSelectedItem()).toBeNull();
    });
  });

  describe('clearSelectedItem', () => {
    test('should clear selected item', () => {
      inventory.addItem(1, 5);
      inventory.setSelectedItem(1);

      inventory.clearSelectedItem();

      expect(inventory.getSelectedItem()).toBeNull();
    });
  });

  describe('isConsumable', () => {
    test('should return truthy for food with fillUp', () => {
      expect(inventory.isConsumable(4)).toBeTruthy(); // Apple has fillUp
    });

    test('should return falsy for non-food items', () => {
      expect(inventory.isConsumable(1)).toBeFalsy(); // Wood
      expect(inventory.isConsumable(3)).toBeFalsy(); // Axe
    });
  });

  describe('getConsumptionData', () => {
    test('should return consumption data for food', () => {
      const data = inventory.getConsumptionData(4); // Apple

      expect(data).toBeDefined();
      expect(data.name).toBe('Apple');
      expect(data.hunger).toBe(20);
      expect(data.thirst).toBe(5);
    });

    test('should return null for non-consumable', () => {
      const data = inventory.getConsumptionData(1); // Wood
      expect(data).toBeNull();
    });
  });

  describe('category mapping', () => {
    test('should map resource type to resources category', () => {
      inventory.addItem(1, 1); // Wood (resource)
      expect(inventory.findItemCategory(1)).toBe('resources');
    });

    test('should map tool type to tools category', () => {
      inventory.addItem(3, 1); // Axe (tool)
      expect(inventory.findItemCategory(3)).toBe('tools');
    });

    test('should map seed type to seeds category', () => {
      inventory.addItem(5, 1); // Wheat Seeds (seed)
      expect(inventory.findItemCategory(5)).toBe('seeds');
    });

    test('should map food type to food category', () => {
      inventory.addItem(4, 1); // Apple (food)
      expect(inventory.findItemCategory(4)).toBe('food');
    });

    test('should map construction type to construction category', () => {
      inventory.addItem(6, 1); // Fence (construction)
      expect(inventory.findItemCategory(6)).toBe('construction');
    });

    test('should map animal_food type to animal_food category', () => {
      inventory.addItem(7, 1); // Chicken Feed (animal_food)
      expect(inventory.findItemCategory(7)).toBe('animal_food');
    });
  });
});
