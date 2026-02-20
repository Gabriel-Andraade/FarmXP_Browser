import { describe, test, expect, beforeEach, mock } from 'bun:test';
import "../setup.js";

// Mock logger.js
mock.module('../../public/scripts/logger.js', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
}));

// Mock i18n
mock.module('../../public/scripts/i18n/i18n.js', () => ({
  t: (key) => key
}));

// Mock constants.js - ALL named exports
mock.module('../../public/scripts/constants.js', () => ({
  DEFAULTS: { SPRITE_SIZE_PX: 32 },
  DEFAULT_SPRITE_SIZE_PX: 32,
  TIMING: { UI_UPDATE_DELAY_MS: 50, UI_MIN_UPDATE_INTERVAL_MS: 30, MOUSE_UPDATE_INTERVAL_MS: 25, DEBUG_UPDATE_INTERVAL_MS: 200, NEEDS_UPDATE_INTERVAL_MS: 2000, SLEEP_ENERGY_RESTORE_INTERVAL_MS: 1000, FEEDBACK_MESSAGE_DURATION_MS: 1500, CONSUMPTION_BAR_DURATION_MS: 2000, INIT_DELAY_MS: 100, IDLE_STATE_MIN_MS: 1000, IDLE_STATE_MAX_MS: 3000, MOVE_STATE_MIN_MS: 500, MOVE_STATE_MAX_MS: 2000 },
  UI_UPDATE_DELAY_MS: 50, UI_MIN_UPDATE_INTERVAL_MS: 30, MOUSE_UPDATE_INTERVAL_MS: 25, DEBUG_UPDATE_INTERVAL_MS: 200, NEEDS_UPDATE_INTERVAL_MS: 2000, SLEEP_ENERGY_RESTORE_INTERVAL_MS: 1000, FEEDBACK_MESSAGE_DURATION_MS: 1500, CONSUMPTION_BAR_DURATION_MS: 2000, INIT_DELAY_MS: 100, IDLE_STATE_MIN_MS: 1000, IDLE_STATE_MAX_MS: 3000, MOVE_STATE_MIN_MS: 500, MOVE_STATE_MAX_MS: 2000,
  GAME_BALANCE: { DAMAGE: { COOLDOWN_MS: 300, TREE_HP: 6, ROCK_HP: 3, STRUCTURE_HP: 10, DEFAULT_HP: 1, AXE_DAMAGE: 2, PICKAXE_DAMAGE: 2, MACHETE_DAMAGE: 1 }, NEEDS: { MAX_VALUE: 100, CRITICAL_THRESHOLD: 10, LOW_THRESHOLD: 20, ENERGY_CRITICAL: 15, SLEEP_ENERGY_RESTORE_AMOUNT: 10, CONSUMPTION_RATES: { moving: { hunger: 0.5, thirst: 0.7, energy: 1.0 }, breaking: { hunger: 1.0, thirst: 1.5, energy: 2.0 }, building: { hunger: 0.8, thirst: 1.0, energy: 1.5 }, collecting: { hunger: 0.3, thirst: 0.4, energy: 0.5 }, idle: { hunger: 0.05, thirst: 0.1, energy: -0.5 } }, FOOD_RESTORATION: { DRINK_THIRST: 20, DRINK_ENERGY: 5, FOOD_HUNGER: 20, FOOD_ENERGY: 10, WATER_THIRST: 30 } }, ECONOMY: { INITIAL_MONEY: 1000, MAX_TRANSACTION_HISTORY: 100 } },
  SIZES: { HEALTH_BAR: { WIDTH: 50, HEIGHT: 6, OFFSET_Y: 12 }, KEY_PROMPT: { SIZE: 32, OFFSET_Y: 45, OFFSET_Y_NO_HEALTH: 20 }, CONSUMPTION_BAR: { WIDTH: 60, HEIGHT: 8, PLAYER_OFFSET_Y: 30 }, MOBILE_UI: { INTERACT_BUTTON: { WIDTH: 70, HEIGHT: 70, BOTTOM: 100, RIGHT: 30 }, JOYSTICK_AREA: { WIDTH: 150, HEIGHT: 150 } } },
  RANGES: { INTERACTION_RANGE: 70, INTERACTION_RANGE_CLOSE_MULTIPLIER: 0.7, ANIMAL_SIGHT_RADIUS: 128, TOUCH_MOVE_STOP_DISTANCE: 15 },
  MOVEMENT: { PLAYER_SPEED: 5, ANIMAL_SPEED: 0.5, TOUCH_MOVE_SPEED: 180, DIAGONAL_MULTIPLIER: 0.7071, COLLISION_STEP_PX: 4, MAX_COLLISION_ITERATIONS: 6 },
  ANIMATION: { FRAME_RATE_IDLE_MS: 500, FRAME_RATE_MOVE_MS: 150 },
  VISUAL: { HEALTH_BAR: { THRESHOLD_HIGH: 0.5, THRESHOLD_MID: 0.25, BORDER_RADIUS: 3, MIN_WIDTH: 0 }, GLOW: { RADIUS: 50, ALPHA: 0.1, PULSE_FREQUENCY: 3, PULSE_BASE: 0.8, PULSE_AMPLITUDE: 0.2 }, KEY_PROMPT: {}, GRID: {} },
  HITBOX_CONFIGS: { STATIC_OBJECTS: { TREE: { width: 38, height: 40 }, ROCK: { width: 32, height: 27 }, CHEST: { width: 31, height: 31 }, WELL: { width: 63, height: 30 } }, ANIMALS: { DEFAULT: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 } }, PLAYER: { WIDTH_RATIO: 0.7, HEIGHT_RATIO: 0.3, OFFSET_X_RATIO: 0.15, OFFSET_Y_RATIO: 0.7 }, INTERACTION_ZONES: { PLAYER: { WIDTH_RATIO: 1.8, HEIGHT_RATIO: 1.8, OFFSET_X: -0.4, OFFSET_Y: -0.4 } } },
  MOBILE: { JOYSTICK_MAX_DISTANCE: 40, JOYSTICK_THRESHOLD: 10, SCREEN_WIDTH_THRESHOLD: 768 },
  CAMERA: { CULLING_BUFFER: 200 },
  UI: { FONT_SIZES: { KEY_PROMPT: 14, HEALTH_BAR_TEXT: 10 } },
}));

// Mock validation.js - ALL named exports
mock.module('../../public/scripts/validation.js', () => ({
  MAX_CURRENCY: 1_000_000_000,
  isValidPositiveInteger: (n) => Number.isInteger(n) && n > 0,
  isValidItemId: (id) => Number.isInteger(id) && id > 0,
  isValidPositiveNumber: (n) => typeof n === 'number' && n > 0,
  sanitizeQuantity: (q, min = 1, max = 9999) => Math.max(min, Math.min(max, Math.floor(q))),
  validateRange: (v, min, max) => Math.max(min, Math.min(max, v)),
  validateTradeInput: () => ({ valid: true }),
}));

// Mock gameState.js - ALL named exports
mock.module('../../public/scripts/gameState.js', () => ({
  registerSystem: () => {},
  getSystem: () => null,
  getObject: () => null,
  setObject: () => {},
  setDebugFlag: () => {},
  getDebugFlag: () => false,
  setGameFlag: () => {},
  checkGameFlag: () => false,
  initDebugFlagsFromUrl: () => {},
  exposeDebug: () => {},
  installLegacyGlobals: () => {},
  default: {},
}));

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

// Shared test items data
const testItemsData = [
  { id: 1, name: 'Wood', type: 'resource', icon: '🪵', price: 5 },
  { id: 2, name: 'Stone', type: 'resource', icon: '🪨', price: 10 },
  { id: 3, name: 'Axe', type: 'tool', toolType: 'axe', icon: '🪓', price: 100 },
  { id: 4, name: 'Apple', type: 'food', icon: '🍎', price: 10, fillUp: { hunger: 20, thirst: 5, energy: 0 } },
  { id: 5, name: 'Wheat Seeds', type: 'seed', icon: '🌾', price: 20 },
  { id: 6, name: 'Fence', type: 'construction', icon: '🏗️', price: 50, placeable: true },
  { id: 7, name: 'Chicken Feed', type: 'animal_food', icon: '🐔', price: 15 }
];

// Mock itemUtils.js
mock.module('../../public/scripts/itemUtils.js', () => ({
  getItem: (id) => testItemsData.find(item => item.id === id) || null,
  getStackLimit: (id) => {
    const item = testItemsData.find(i => i.id === id);
    if (!item) return 99;
    return item.type === 'tool' ? 1 : 99;
  },
  isPlaceable: (id) => {
    return id === 6; // Only Fence is placeable
  },
  isConsumable: (id) => {
    const item = testItemsData.find(i => i.id === id);
    return item && item.fillUp;
  },
  getConsumptionData: (id) => {
    const item = testItemsData.find(i => i.id === id);
    if (!item || !item.fillUp) return null;
    return { name: item.name, icon: item.icon, hunger: item.fillUp.hunger || 0, thirst: item.fillUp.thirst || 0, energy: item.fillUp.energy || 0 };
  },
  getAllItems: () => testItemsData
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
