import { describe, test, expect, beforeEach, mock } from 'bun:test';
import "../setup.js";

// Mock logger.js
mock.module('../../public/scripts/logger.js', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
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

// Mock currencyManager.js
const mockCurrencyManager = {
  _money: 1000,
  getMoney() { return this._money; },
  earn(amount, desc) { this._money += amount; return true; },
  spend(amount, desc) {
    if (amount > this._money) return false;
    this._money -= amount;
    return true;
  },
  canAfford(amount) { return this._money >= amount; }
};

mock.module('../../public/scripts/currencyManager.js', () => ({
  currencyManager: mockCurrencyManager
}));

// Mock weather.js DEPENDENCIES so the real module can load
mock.module('../../public/scripts/thePlayer/cameraSystem.js', () => ({
  camera: { x: 0, y: 0, zoom: 1, worldToScreen: (x, y) => ({ x, y }) }
}));

mock.module('../../public/scripts/loadingScreen.js', () => ({
  showSleepLoading: () => {},
  hideSleepLoading: () => {},
  blockInteractions: () => {},
  unblockInteractions: () => {}
}));

// Mock categoryMapper.js
mock.module('../../public/scripts/categoryMapper.js', () => ({
  mapTypeToCategory: (type) => {
    const mapping = {
      tool: 'tools', seed: 'seeds', construction: 'construction',
      animal_food: 'animal_food', food: 'food', resource: 'resources', crop: 'resources'
    };
    return mapping[type] || 'resources';
  }
}));

// Mock itemUtils.js
const mockItems = [
  { id: 1, name: 'Wood', type: 'resource', price: 10 },
  { id: 2, name: 'Stone', type: 'resource', price: 20 },
  { id: 3, name: 'Axe', type: 'tool', price: 100 },
  { id: 5, name: 'Apple', type: 'food', price: 10 },
  { id: 9, name: 'Madeira Bruta', type: 'resource', price: 15 },
  { id: 13, name: 'Picareta', type: 'tool', price: 80 }
];

mock.module('../../public/scripts/itemUtils.js', () => ({
  getItem: (id) => mockItems.find(i => i.id === id) || null,
  getSellPrice: (id) => {
    const item = mockItems.find(i => i.id === id);
    return item ? Math.floor(item.price * 0.5) : 0;
  }
}));

// Mock i18n
mock.module('../../public/scripts/i18n/i18n.js', () => ({
  t: (key, params) => {
    if (key === 'time.weekdays') return ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    if (key === 'trading.open') return 'Aberto';
    if (key === 'trading.statusUnknown') return 'Status desconhecido';
    return key;
  }
}));

// Mock settingsUI.js
mock.module('../../public/scripts/settingsUI.js', () => ({
  translateDOM: () => {}
}));

// Mock validation.js - ALL named exports
mock.module('../../public/scripts/validation.js', () => ({
  MAX_CURRENCY: 1_000_000_000,
  isValidPositiveInteger: (n) => Number.isInteger(n) && n > 0,
  isValidItemId: (id) => Number.isInteger(id) && id > 0,
  isValidPositiveNumber: (n) => typeof n === 'number' && n > 0,
  sanitizeQuantity: (q, min = 1, max = 9999) => Math.max(min, Math.min(max, Math.floor(q))),
  validateRange: (v, min, max) => Math.max(min, Math.min(max, v)),
  validateTradeInput: (amount, maxAvailable) => {
    if (!Number.isInteger(amount) || amount <= 0) return { valid: false, reason: 'invalid' };
    if (amount > maxAvailable) return { valid: false, reason: 'exceeds' };
    return { valid: true };
  },
}));

// Mock gameState.js - ALL named exports
const mockSystems = {};
const mockObjects = {};
mock.module('../../public/scripts/gameState.js', () => ({
  registerSystem: (name, instance) => { mockSystems[name] = instance; return instance; },
  getSystem: (name) => mockSystems[name] || null,
  getObject: (name) => mockObjects[name] || null,
  setObject: (name, value) => { mockObjects[name] = value; return value; },
  setGameFlag: () => {},
  checkGameFlag: () => false,
  setDebugFlag: () => {},
  getDebugFlag: () => false,
  initDebugFlagsFromUrl: () => {},
  exposeDebug: () => {},
  installLegacyGlobals: () => {},
  default: {},
}));

// Import REAL WeatherSystem (with mocked dependencies) so merchant.js can use it
const { WeatherSystem } = await import('../../public/scripts/weather.js');

// Import REAL MerchantSystem from production code
const { merchantSystem } = await import('../../public/scripts/merchant.js');

describe('MerchantSystem (Production Implementation)', () => {

  beforeEach(() => {
    // Reset currency
    mockCurrencyManager._money = 1000;

    // Reset weather to business hours (10:00 AM, Monday)
    WeatherSystem.currentTime = 10 * 60;
    WeatherSystem.day = 1;

    // Reset merchant state
    merchantSystem.currentMerchant = null;
    merchantSystem.tradeMode = 'sell';
    merchantSystem.selectedPlayerItem = null;
    merchantSystem.selectedMerchantItem = null;
    merchantSystem.playerStorage = 'inventory';
    merchantSystem.currentPlayerCategory = 'all';
    merchantSystem.currentMerchantCategory = 'all';
    merchantSystem.tradeValue = 0;
    merchantSystem.tradeQuantity = 1;
  });

  describe('initialization', () => {
    test('should initialize with empty merchant state', () => {
      expect(merchantSystem.currentMerchant).toBeNull();
      expect(merchantSystem.tradeMode).toBe('sell');
      expect(merchantSystem.selectedPlayerItem).toBeNull();
      expect(merchantSystem.selectedMerchantItem).toBeNull();
    });

    test('should register itself in gameState', () => {
      expect(mockSystems['merchant']).toBe(merchantSystem);
    });
  });

  describe('loadMerchants', () => {
    test('should load 3 merchants', () => {
      expect(merchantSystem.merchants).toHaveLength(3);
    });

    test('should have Thomas as first merchant', () => {
      const thomas = merchantSystem.merchants[0];
      expect(thomas.id).toBe('thomas');
      expect(thomas.name).toBe('Thomas');
    });

    test('should have Lara as second merchant', () => {
      const lara = merchantSystem.merchants[1];
      expect(lara.id).toBe('laila');
      expect(lara.name).toBe('Lara');
    });

    test('should have Rico as third merchant', () => {
      const rico = merchantSystem.merchants[2];
      expect(rico.id).toBe('rico');
      expect(rico.name).toBe('Rico');
    });

    test('each merchant should have items', () => {
      merchantSystem.merchants.forEach(merchant => {
        expect(merchant.items.length).toBeGreaterThan(0);
      });
    });

    test('each merchant should have schedule', () => {
      merchantSystem.merchants.forEach(merchant => {
        expect(merchant.schedule).toBeDefined();
        expect(merchant.schedule.daysOpen).toBeDefined();
        expect(merchant.schedule.openTime).toBeDefined();
        expect(merchant.schedule.closeTime).toBeDefined();
      });
    });

    test('merchant items should have required properties', () => {
      merchantSystem.merchants.forEach(merchant => {
        merchant.items.forEach(item => {
          expect(item.id).toBeDefined();
          expect(item.name).toBeDefined();
          expect(item.price).toBeDefined();
          expect(item.category).toBeDefined();
          expect(item.quantity).toBeDefined();
        });
      });
    });
  });

  describe('getCurrentDayIndex', () => {
    test('should return 0 for day 1 (Monday)', () => {
      WeatherSystem.day = 1;
      expect(merchantSystem.getCurrentDayIndex()).toBe(0);
    });

    test('should return correct index for each day of week', () => {
      WeatherSystem.day = 2;
      expect(merchantSystem.getCurrentDayIndex()).toBe(1); // Tuesday

      WeatherSystem.day = 7;
      expect(merchantSystem.getCurrentDayIndex()).toBe(6); // Sunday

      WeatherSystem.day = 8;
      expect(merchantSystem.getCurrentDayIndex()).toBe(0); // Monday (cycle)
    });

    test('should cycle correctly for larger day numbers', () => {
      WeatherSystem.day = 15;
      expect(merchantSystem.getCurrentDayIndex()).toBe(0); // Monday again
    });
  });

  describe('isMerchantOpen', () => {
    test('should return true when merchant is within hours and open day', () => {
      const thomas = merchantSystem.merchants[0];
      // Thomas: Mon-Fri (0-4), 8:00-18:00
      WeatherSystem.day = 1; // Monday (index 0)
      WeatherSystem.currentTime = 10 * 60; // 10:00

      expect(merchantSystem.isMerchantOpen(thomas)).toBe(true);
    });

    test('should return false when outside business hours', () => {
      const thomas = merchantSystem.merchants[0];
      WeatherSystem.day = 1; // Monday
      WeatherSystem.currentTime = 20 * 60; // 20:00 (after 18:00 close)

      expect(merchantSystem.isMerchantOpen(thomas)).toBe(false);
    });

    test('should return false before opening time', () => {
      const thomas = merchantSystem.merchants[0];
      WeatherSystem.day = 1; // Monday
      WeatherSystem.currentTime = 6 * 60; // 6:00 (before 8:00 open)

      expect(merchantSystem.isMerchantOpen(thomas)).toBe(false);
    });

    test('should return false on closed day', () => {
      const thomas = merchantSystem.merchants[0];
      // Thomas daysOpen: [0,1,2,3,4] (Mon-Fri), so Saturday (5) is closed
      WeatherSystem.day = 6; // Saturday (index 5)
      WeatherSystem.currentTime = 10 * 60;

      expect(merchantSystem.isMerchantOpen(thomas)).toBe(false);
    });

    test('should return true for merchant without schedule', () => {
      const noSchedule = { id: 'test', name: 'Test' };
      expect(merchantSystem.isMerchantOpen(noSchedule)).toBe(true);
    });

    test('should return true at exact opening time', () => {
      const thomas = merchantSystem.merchants[0];
      WeatherSystem.day = 1;
      WeatherSystem.currentTime = 8 * 60; // Exactly 8:00

      expect(merchantSystem.isMerchantOpen(thomas)).toBe(true);
    });

    test('should return false at exact closing time', () => {
      const thomas = merchantSystem.merchants[0];
      WeatherSystem.day = 1;
      WeatherSystem.currentTime = 18 * 60; // Exactly 18:00

      expect(merchantSystem.isMerchantOpen(thomas)).toBe(false);
    });

    test('Rico should be open on Sunday (day index 6)', () => {
      const rico = merchantSystem.merchants[2];
      // Rico daysOpen: [1,2,3,4,5,6] (Tue-Sun)
      WeatherSystem.day = 7; // Sunday (index 6)
      WeatherSystem.currentTime = 12 * 60;

      expect(merchantSystem.isMerchantOpen(rico)).toBe(true);
    });

    test('Rico should be closed on Monday (day index 0)', () => {
      const rico = merchantSystem.merchants[2];
      WeatherSystem.day = 1; // Monday (index 0)
      WeatherSystem.currentTime = 12 * 60;

      expect(merchantSystem.isMerchantOpen(rico)).toBe(false);
    });

    test('Lara should have wider hours (6:00-20:00)', () => {
      const lara = merchantSystem.merchants[1];
      WeatherSystem.day = 1; // Monday (index 0)

      WeatherSystem.currentTime = 6 * 60; // 6:00 - open
      expect(merchantSystem.isMerchantOpen(lara)).toBe(true);

      WeatherSystem.currentTime = 19 * 60 + 59; // 19:59 - still open
      expect(merchantSystem.isMerchantOpen(lara)).toBe(true);

      WeatherSystem.currentTime = 20 * 60; // 20:00 - closed
      expect(merchantSystem.isMerchantOpen(lara)).toBe(false);
    });
  });

  describe('getPlayerCategories', () => {
    test('should return all player categories', () => {
      const categories = merchantSystem.getPlayerCategories();
      expect(categories).toContain('all');
      expect(categories).toContain('tools');
      expect(categories).toContain('seeds');
      expect(categories).toContain('food');
      expect(categories).toContain('animal_food');
      expect(categories).toContain('construction');
      expect(categories).toContain('resources');
    });

    test('should have "all" as first category', () => {
      expect(merchantSystem.getPlayerCategories()[0]).toBe('all');
    });
  });

  describe('getMerchantCategories', () => {
    test('should include "all" category', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      const categories = merchantSystem.getMerchantCategories();
      expect(categories).toContain('all');
    });

    test('should extract unique categories from Thomas items', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0]; // Thomas
      const categories = merchantSystem.getMerchantCategories();
      expect(categories).toContain('resource');
      expect(categories).toContain('tool');
    });

    test('should extract unique categories from Rico items', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[2]; // Rico
      const categories = merchantSystem.getMerchantCategories();
      expect(categories).toContain('seed');
      expect(categories).toContain('animal_food');
      expect(categories).toContain('tool');
    });
  });

  describe('getMerchantItems', () => {
    test('should return all items when category is "all"', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0]; // Thomas
      merchantSystem.currentMerchantCategory = 'all';

      const items = merchantSystem.getMerchantItems();
      expect(items.length).toBe(merchantSystem.merchants[0].items.length);
    });

    test('should filter by category', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0]; // Thomas
      merchantSystem.currentMerchantCategory = 'tool';

      const items = merchantSystem.getMerchantItems();
      items.forEach(item => {
        expect(item.category).toBe('tool');
      });
    });

    test('should return empty for non-existent category', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.currentMerchantCategory = 'nonexistent';

      const items = merchantSystem.getMerchantItems();
      expect(items).toHaveLength(0);
    });
  });

  describe('getMaxQuantity', () => {
    test('should return player item quantity in sell mode', () => {
      merchantSystem.tradeMode = 'sell';
      merchantSystem.selectedPlayerItem = 1;

      // Mock inventory system
      mockSystems.inventory = {
        getInventory: () => ({
          resources: { items: [{ id: 1, name: 'Wood', quantity: 25, type: 'resource' }] }
        })
      };
      merchantSystem.playerStorage = 'inventory';

      const maxQty = merchantSystem.getMaxQuantity();
      expect(maxQty).toBe(25);
    });

    test('should cap merchant item quantity at 99 in buy mode', () => {
      merchantSystem.tradeMode = 'buy';
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.currentMerchantCategory = 'all';
      // Thomas has Prego with quantity 100
      merchantSystem.selectedMerchantItem = 34; // Prego

      const maxQty = merchantSystem.getMaxQuantity();
      expect(maxQty).toBe(99);
    });

    test('should return actual quantity if less than 99 in buy mode', () => {
      merchantSystem.tradeMode = 'buy';
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.currentMerchantCategory = 'all';
      merchantSystem.selectedMerchantItem = 13; // Picareta, quantity 5

      const maxQty = merchantSystem.getMaxQuantity();
      expect(maxQty).toBe(5);
    });
  });

  describe('increaseQuantity', () => {
    test('should increase trade quantity by 1', () => {
      merchantSystem.tradeQuantity = 1;
      merchantSystem.tradeMode = 'buy';
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.currentMerchantCategory = 'all';
      merchantSystem.selectedMerchantItem = 9; // Madeira Bruta, qty 50

      merchantSystem.increaseQuantity();
      expect(merchantSystem.tradeQuantity).toBe(2);
    });

    test('should not exceed max quantity', () => {
      merchantSystem.tradeMode = 'buy';
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.currentMerchantCategory = 'all';
      merchantSystem.selectedMerchantItem = 13; // Picareta, quantity 5
      merchantSystem.tradeQuantity = 5;

      merchantSystem.increaseQuantity();
      expect(merchantSystem.tradeQuantity).toBe(5);
    });

    test('should reset invalid tradeQuantity to 1', () => {
      merchantSystem.tradeQuantity = NaN;
      merchantSystem.tradeMode = 'buy';
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.currentMerchantCategory = 'all';
      merchantSystem.selectedMerchantItem = 9;

      merchantSystem.increaseQuantity();
      expect(merchantSystem.tradeQuantity).toBe(2); // Reset to 1, then increased
    });
  });

  describe('decreaseQuantity', () => {
    test('should decrease trade quantity by 1', () => {
      merchantSystem.tradeQuantity = 5;
      merchantSystem.decreaseQuantity();
      expect(merchantSystem.tradeQuantity).toBe(4);
    });

    test('should not go below 1', () => {
      merchantSystem.tradeQuantity = 1;
      merchantSystem.decreaseQuantity();
      expect(merchantSystem.tradeQuantity).toBe(1);
    });

    test('should reset invalid tradeQuantity to 1', () => {
      merchantSystem.tradeQuantity = -5;
      merchantSystem.decreaseQuantity();
      expect(merchantSystem.tradeQuantity).toBe(1);
    });
  });

  describe('calculateExpectedPrice', () => {
    test('should return sell price (50% of buy price) for sell mode', () => {
      merchantSystem.tradeMode = 'sell';
      merchantSystem.selectedPlayerItem = 3; // Axe, price 100

      const price = merchantSystem.calculateExpectedPrice();
      expect(price).toBe(50); // 50% of 100
    });

    test('should return merchant price for buy mode', () => {
      merchantSystem.tradeMode = 'buy';
      merchantSystem.currentMerchant = merchantSystem.merchants[0]; // Thomas
      merchantSystem.currentMerchantCategory = 'all';
      merchantSystem.selectedMerchantItem = 9; // Madeira Bruta, price 15

      const price = merchantSystem.calculateExpectedPrice();
      expect(price).toBe(15);
    });

    test('should return null when no item is selected in sell mode', () => {
      merchantSystem.tradeMode = 'sell';
      merchantSystem.selectedPlayerItem = null;

      expect(merchantSystem.calculateExpectedPrice()).toBeNull();
    });

    test('should return null when no item is selected in buy mode', () => {
      merchantSystem.tradeMode = 'buy';
      merchantSystem.selectedMerchantItem = null;

      expect(merchantSystem.calculateExpectedPrice()).toBeNull();
    });

    test('should return null for invalid item in sell mode', () => {
      merchantSystem.tradeMode = 'sell';
      merchantSystem.selectedPlayerItem = 99999;

      expect(merchantSystem.calculateExpectedPrice()).toBeNull();
    });
  });

  describe('setTradeMode', () => {
    test('should set trade mode to buy', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.setTradeMode('buy');
      expect(merchantSystem.tradeMode).toBe('buy');
    });

    test('should set trade mode to sell', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.tradeMode = 'buy';
      merchantSystem.setTradeMode('sell');
      expect(merchantSystem.tradeMode).toBe('sell');
    });

    test('should clear selections when changing mode', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.selectedPlayerItem = 1;
      merchantSystem.selectedMerchantItem = 5;
      merchantSystem.tradeValue = 100;

      merchantSystem.setTradeMode('buy');

      expect(merchantSystem.selectedPlayerItem).toBeNull();
      expect(merchantSystem.selectedMerchantItem).toBeNull();
      expect(merchantSystem.tradeValue).toBe(0);
    });
  });

  describe('clearSelections', () => {
    test('should clear all selection state', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.selectedPlayerItem = 1;
      merchantSystem.selectedMerchantItem = 5;
      merchantSystem.tradeValue = 100;
      merchantSystem.tradeQuantity = 5;

      merchantSystem.clearSelections();

      expect(merchantSystem.selectedPlayerItem).toBeNull();
      expect(merchantSystem.selectedMerchantItem).toBeNull();
      expect(merchantSystem.tradeValue).toBe(0);
      expect(merchantSystem.tradeQuantity).toBe(1);
    });
  });

  describe('setPlayerStorage', () => {
    test('should switch to storage', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.setPlayerStorage('storage');
      expect(merchantSystem.playerStorage).toBe('storage');
    });

    test('should switch to inventory', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.playerStorage = 'storage';
      merchantSystem.setPlayerStorage('inventory');
      expect(merchantSystem.playerStorage).toBe('inventory');
    });

    test('should clear selections when switching', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.selectedPlayerItem = 1;
      merchantSystem.setPlayerStorage('storage');
      expect(merchantSystem.selectedPlayerItem).toBeNull();
    });
  });

  describe('setPlayerCategory', () => {
    test('should update player category', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.setPlayerCategory('tools');
      expect(merchantSystem.currentPlayerCategory).toBe('tools');
    });

    test('should clear selections', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.selectedPlayerItem = 1;
      merchantSystem.setPlayerCategory('food');
      expect(merchantSystem.selectedPlayerItem).toBeNull();
    });
  });

  describe('setMerchantCategory', () => {
    test('should update merchant category', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.setMerchantCategory('tool');
      expect(merchantSystem.currentMerchantCategory).toBe('tool');
    });

    test('should clear selections', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.selectedMerchantItem = 9;
      merchantSystem.setMerchantCategory('resource');
      expect(merchantSystem.selectedMerchantItem).toBeNull();
    });
  });

  describe('getCategoryIcon', () => {
    test('should return correct icons for known categories', () => {
      expect(merchantSystem.getCategoryIcon('all')).toBe('📋');
      expect(merchantSystem.getCategoryIcon('tools')).toBe('🛠️');
      expect(merchantSystem.getCategoryIcon('seeds')).toBe('🌱');
      expect(merchantSystem.getCategoryIcon('food')).toBe('🍎');
      expect(merchantSystem.getCategoryIcon('animal_food')).toBe('🌾');
      expect(merchantSystem.getCategoryIcon('construction')).toBe('🧱');
      expect(merchantSystem.getCategoryIcon('resources')).toBe('🪵');
    });

    test('should return fallback icon for unknown category', () => {
      expect(merchantSystem.getCategoryIcon('unknown')).toBe('📦');
    });
  });

  describe('mapItemTypeToCategory', () => {
    test('should map item types to visual categories', () => {
      expect(merchantSystem.mapItemTypeToCategory('tool')).toBe('tools');
      expect(merchantSystem.mapItemTypeToCategory('seed')).toBe('seeds');
      expect(merchantSystem.mapItemTypeToCategory('food')).toBe('food');
      expect(merchantSystem.mapItemTypeToCategory('resource')).toBe('resources');
      expect(merchantSystem.mapItemTypeToCategory('animal_food')).toBe('animal_food');
    });
  });

  describe('getNextOpenDay', () => {
    test('should find next open day for Thomas on Saturday', () => {
      // Thomas daysOpen: [0,1,2,3,4] (Mon-Fri)
      WeatherSystem.day = 6; // Saturday (index 5)
      const nextDay = merchantSystem.getNextOpenDay(merchantSystem.merchants[0]);
      // Next open day is Sunday index 6? No, Thomas is 0-4. So next is Monday (index 0) which is day 8
      // From index 5, check 6(Sun)=no, 0(Mon)=yes -> returns weekdays[0] = 'Segunda'
      expect(nextDay).toBe('Segunda');
    });

    test('should find next open day for Rico on Monday', () => {
      // Rico daysOpen: [1,2,3,4,5,6] (Tue-Sun)
      WeatherSystem.day = 1; // Monday (index 0)
      const nextDay = merchantSystem.getNextOpenDay(merchantSystem.merchants[2]);
      // From index 0, check 1(Tue)=yes -> returns weekdays[1] = 'Terça'
      expect(nextDay).toBe('Terça');
    });

    test('should return null for merchant without schedule', () => {
      expect(merchantSystem.getNextOpenDay({ id: 'test' })).toBeNull();
    });
  });

  describe('merchant schedule data', () => {
    test('Thomas should work Monday to Friday', () => {
      const thomas = merchantSystem.merchants[0];
      expect(thomas.schedule.daysOpen).toEqual([0, 1, 2, 3, 4]);
      expect(thomas.schedule.openTime).toBe(8 * 60);
      expect(thomas.schedule.closeTime).toBe(18 * 60);
    });

    test('Lara should work Monday to Saturday', () => {
      const lara = merchantSystem.merchants[1];
      expect(lara.schedule.daysOpen).toEqual([0, 1, 2, 3, 4, 5]);
      expect(lara.schedule.openTime).toBe(6 * 60);
      expect(lara.schedule.closeTime).toBe(20 * 60);
    });

    test('Rico should work Tuesday to Sunday', () => {
      const rico = merchantSystem.merchants[2];
      expect(rico.schedule.daysOpen).toEqual([1, 2, 3, 4, 5, 6]);
      expect(rico.schedule.openTime).toBe(7 * 60);
      expect(rico.schedule.closeTime).toBe(19 * 60);
    });
  });

  describe('merchant item inventory', () => {
    test('Thomas should sell resources and tools', () => {
      const thomas = merchantSystem.merchants[0];
      const categories = new Set(thomas.items.map(i => i.category));
      expect(categories.has('resource')).toBe(true);
      expect(categories.has('tool')).toBe(true);
    });

    test('Lara should sell food items', () => {
      const lara = merchantSystem.merchants[1];
      const categories = new Set(lara.items.map(i => i.category));
      expect(categories.has('food')).toBe(true);
    });

    test('Rico should sell seeds, animal food, and tools', () => {
      const rico = merchantSystem.merchants[2];
      const categories = new Set(rico.items.map(i => i.category));
      expect(categories.has('seed')).toBe(true);
      expect(categories.has('animal_food')).toBe(true);
      expect(categories.has('tool')).toBe(true);
    });

    test('all merchant items should have positive prices', () => {
      merchantSystem.merchants.forEach(merchant => {
        merchant.items.forEach(item => {
          expect(item.price).toBeGreaterThan(0);
        });
      });
    });

    test('all merchant items should have positive quantities', () => {
      merchantSystem.merchants.forEach(merchant => {
        merchant.items.forEach(item => {
          expect(item.quantity).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('processBuy', () => {
    test('should reject purchase when not enough money', () => {
      mockCurrencyManager._money = 10;
      merchantSystem.selectedMerchantItem = 13; // Picareta price 80

      // processBuy checks money first
      merchantSystem.processBuy(80);
      // Money should remain unchanged
      expect(mockCurrencyManager._money).toBe(10);
    });
  });

  describe('confirmTrade', () => {
    test('should reject invalid trade mode', () => {
      merchantSystem.tradeMode = 'invalid';
      // Should not throw, just show error message
      merchantSystem.confirmTrade();
    });

    test('should reject invalid trade quantity', () => {
      merchantSystem.tradeMode = 'sell';
      merchantSystem.tradeQuantity = -1;
      merchantSystem.confirmTrade();
      // Should handle gracefully without throwing
    });

    test('should reject when no item selected', () => {
      merchantSystem.tradeMode = 'sell';
      merchantSystem.tradeQuantity = 1;
      merchantSystem.selectedPlayerItem = null;
      merchantSystem.confirmTrade();
      // Should handle gracefully
    });
  });

  describe('destroy', () => {
    test('should clear references', () => {
      merchantSystem.currentMerchant = merchantSystem.merchants[0];
      merchantSystem.selectedPlayerItem = 1;
      merchantSystem.selectedMerchantItem = 5;

      merchantSystem.destroy();

      expect(merchantSystem.currentMerchant).toBeNull();
      expect(merchantSystem.selectedPlayerItem).toBeNull();
      expect(merchantSystem.selectedMerchantItem).toBeNull();
      expect(merchantSystem.storeBtnHandler).toBeNull();
      expect(merchantSystem.listenersSetup).toBe(false);
    });
  });

  describe('update', () => {
    test('should check merchant status periodically', () => {
      merchantSystem.lastMerchantOpenCheck = 0;
      merchantSystem.merchantOpenCheckInterval = 5;

      // Should not throw when called
      merchantSystem.update(6);
    });
  });
});
