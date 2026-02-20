import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import "../setup.js";

// Garantias de ambiente (pra não depender 100% do setup)
globalThis.window ??= {};
globalThis.window.playerHUD ??= { updatePlayerInfo: () => {} };

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
  HITBOX_CONFIGS: { STATIC_OBJECTS: { TREE: { width: 38, height: 40 }, ROCK: { width: 32, height: 27 } }, ANIMALS: { DEFAULT: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 } }, PLAYER: { WIDTH_RATIO: 0.7, HEIGHT_RATIO: 0.3, OFFSET_X_RATIO: 0.15, OFFSET_Y_RATIO: 0.7 }, INTERACTION_ZONES: { PLAYER: { WIDTH_RATIO: 1.8, HEIGHT_RATIO: 1.8, OFFSET_X: -0.4, OFFSET_Y: -0.4 } } },
  MOBILE: { JOYSTICK_MAX_DISTANCE: 40, JOYSTICK_THRESHOLD: 10, SCREEN_WIDTH_THRESHOLD: 768 },
  CAMERA: { CULLING_BUFFER: 200 },
  UI: { FONT_SIZES: { KEY_PROMPT: 14, HEALTH_BAR_TEXT: 10 } },
}));

// Mock logger.js
mock.module('../../public/scripts/logger.js', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
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

// Mock stella.js - character module
mock.module('../../public/scripts/thePlayer/stella.js', () => ({
  stella: { x: 0, y: 0, width: 32, height: 48 },
  updateStella: () => {},
  drawStella: () => {}
}));

// theWorld.js is NOT mocked - mock its dependencies instead
mock.module('../../public/scripts/errorHandler.js', () => ({
  handleError: () => {}, handleWarn: () => {},
}));

mock.module('../../public/scripts/assetManager.js', () => ({
  assets: {},
}));

mock.module('../../public/scripts/generatorSeeds.js', () => ({
  worldGenerator: { seed: 0, next: () => 0 },
  WORLD_GENERATOR_CONFIG: {},
}));

mock.module('../../public/scripts/thePlayer/cameraSystem.js', () => ({
  camera: { x: 0, y: 0, zoom: 1 },
  CAMERA_ZOOM: 2,
}));

mock.module('../../public/scripts/worldConstants.js', () => ({
  WORLD_WIDTH: 4000, WORLD_HEIGHT: 5010, GAME_WIDTH: 880, GAME_HEIGHT: 963.09, TILE_SIZE: 20,
}));

mock.module('../../public/scripts/animal/animalAI.js', () => ({
  AnimalEntity: class { constructor() {} update() {} },
}));

mock.module('../../public/scripts/optimizationConstants.js', () => ({
  ZOOMED_TILE_SIZE: 40, ZOOMED_TILE_SIZE_INT: 40, INV_CAMERA_ZOOM: 0.5,
  OPTIMIZATION_CONFIG: { ENABLED: true, USE_PRECALCULATED_VALUES: true, MAX_DRAW_CALLS_PER_FRAME: 5000, LOG_PERFORMANCE: false, SLEEP_OPTIMIZATIONS: { CLEAR_CACHE: true, COMPACT_ARRAYS: true, FORCE_GC: true, RESET_CANVAS: true, OPTIMIZE_MEMORY: true } },
  perfLog: () => {}, getCachedCalculation: (key, fn) => fn(),
  worldToScreenFast: (x, y) => ({ x, y }), screenToWorldFast: (x, y) => ({ x, y }),
  worldToScreenWithCamera: (x, y) => ({ x, y }), isInViewportFast: () => true,
  getVisibleTileBounds: () => ({ startX: 0, endX: 100, startY: 0, endY: 100, width: 100, height: 100 }),
  performSleepOptimizations: async () => ({ success: true, duration: 0, optimizationsApplied: 0 }),
  getMemoryStatus: () => ({ error: 'not available' }), clearRenderCache: () => false,
  quickOptimization: () => ({ clearCalculationCache: () => {}, getCacheSize: () => 0, getConfig: () => ({}) }),
  default: {},
}));

// Import REAL PlayerSystem class from production code
const { PlayerSystem } = await import('../../public/scripts/thePlayer/playerSystem.js');
describe('PlayerSystem (Production Implementation)', () => {
  let player;

  beforeEach(() => {
    // Use the REAL PlayerSystem implementation
    player = new PlayerSystem();
    // Reset needs for clean tests
    player.needs.hunger = 100;
    player.needs.thirst = 100;
    player.needs.energy = 100;
    player.needs.lastUpdate = Date.now();
    player.needs.criticalFlags = {
      hungerCritical: false,
      thirstCritical: false,
      energyCritical: false
    };
  });

  afterEach(() => {
    // Se existir cleanup no sistema, evita vazamentos entre testes
    player?.destroy?.();
  });

  describe('initialization', () => {
    test('should start with full needs', () => {
      expect(player.getHunger()).toBe(100);
      expect(player.getThirst()).toBe(100);
      expect(player.getEnergy()).toBe(100);
    });

    test('should have consumption rates defined', () => {
      expect(player.needs.consumptionRates.moving).toBeDefined();
      expect(player.needs.consumptionRates.breaking).toBeDefined();
      expect(player.needs.consumptionRates.idle).toBeDefined();
    });

    test('should have critical levels defined', () => {
      expect(player.needs.criticalLevels.hunger).toBe(10);
      expect(player.needs.criticalLevels.thirst).toBe(10);
      expect(player.needs.criticalLevels.energy).toBe(15);
    });

    test('should have low needs effects defined', () => {
      expect(player.needs.lowNeedsEffects.speedMultiplier).toBe(0.5);
      expect(player.needs.lowNeedsEffects.miningMultiplier).toBe(0.3);
      expect(player.needs.lowNeedsEffects.buildingMultiplier).toBe(0.2);
    });
  });

  describe('consumeNeeds', () => {
    test('should consume needs when moving', () => {
      player.consumeNeeds('moving', 1);

      // Rates: hunger: 0.5, thirst: 0.7, energy: 1.0
      expect(player.needs.hunger).toBeCloseTo(99.5, 1);
      expect(player.needs.thirst).toBeCloseTo(99.3, 1);
      expect(player.needs.energy).toBeCloseTo(99, 1);
    });

    test('should consume needs when breaking objects', () => {
      player.consumeNeeds('breaking', 1);

      // Rates: hunger: 1.0, thirst: 1.5, energy: 2.0
      expect(player.needs.hunger).toBeCloseTo(99, 1);
      expect(player.needs.thirst).toBeCloseTo(98.5, 1);
      expect(player.needs.energy).toBeCloseTo(98, 1);
    });

    test('should consume less when collecting', () => {
      player.consumeNeeds('collecting', 1);

      // Rates: hunger: 0.3, thirst: 0.4, energy: 0.5
      expect(player.needs.hunger).toBeCloseTo(99.7, 1);
      expect(player.needs.thirst).toBeCloseTo(99.6, 1);
      expect(player.needs.energy).toBeCloseTo(99.5, 1);
    });

    test('should consume needs when building', () => {
      player.consumeNeeds('building', 1);

      // Rates: hunger: 0.8, thirst: 1.0, energy: 1.5
      expect(player.needs.hunger).toBeCloseTo(99.2, 1);
      expect(player.needs.thirst).toBeCloseTo(99, 1);
      expect(player.needs.energy).toBeCloseTo(98.5, 1);
    });

    test('should handle idle consumption (slight drain)', () => {
      player.consumeNeeds('idle', 1);

      // Rates: hunger: 0.05, thirst: 0.1, energy: -0.5
      expect(player.needs.hunger).toBeCloseTo(99.95, 1);
      expect(player.needs.thirst).toBeCloseTo(99.9, 1);
      // Energy is clamped to max 100 in production code
      expect(player.needs.energy).toBeLessThanOrEqual(100);
    });

    test('should not go below 0', () => {
      player.needs.hunger = 1;

      player.consumeNeeds('breaking', 2); // Would consume 2 hunger

      expect(player.needs.hunger).toBe(0);
    });

    test('should cap energy at 100', () => {
      player.needs.energy = 100;

      player.consumeNeeds('idle', 5);

      expect(player.needs.energy).toBeLessThanOrEqual(100);
    });

    test('should apply multiplier correctly', () => {
      player.consumeNeeds('moving', 2);

      // hunger: 0.5 * 2 = 1, thirst: 0.7 * 2 = 1.4, energy: 1.0 * 2 = 2
      expect(player.needs.hunger).toBeCloseTo(99, 1);
      expect(player.needs.thirst).toBeCloseTo(98.6, 1);
      expect(player.needs.energy).toBeCloseTo(98, 1);
    });

    test('should ignore invalid action types', () => {
      const hungerBefore = player.needs.hunger;

      player.consumeNeeds('invalid_action', 1);

      expect(player.needs.hunger).toBe(hungerBefore);
    });
  });

  describe('restoreNeeds', () => {
    test('should restore hunger', () => {
      player.needs.hunger = 50;

      player.restoreNeeds(20, 0, 0);

      expect(player.needs.hunger).toBe(70);
    });

    test('should restore thirst', () => {
      player.needs.thirst = 30;

      player.restoreNeeds(0, 40, 0);

      expect(player.needs.thirst).toBe(70);
    });

    test('should restore energy', () => {
      player.needs.energy = 20;

      player.restoreNeeds(0, 0, 50);

      expect(player.needs.energy).toBe(70);
    });

    test('should restore multiple needs at once', () => {
      player.needs.hunger = 50;
      player.needs.thirst = 40;
      player.needs.energy = 30;

      player.restoreNeeds(20, 30, 40);

      expect(player.needs.hunger).toBe(70);
      expect(player.needs.thirst).toBe(70);
      expect(player.needs.energy).toBe(70);
    });

    test('should cap at 100', () => {
      player.needs.hunger = 90;

      player.restoreNeeds(50, 0, 0);

      expect(player.needs.hunger).toBe(100);
    });
  });

  describe('consumeItem', () => {
    test('should consume food item with fillUp', () => {
      player.needs.hunger = 50;
      player.needs.thirst = 60;

      const food = {
        name: 'Apple',
        fillUp: { hunger: 20, thirst: 10, energy: 5 }
      };

      player.consumeItem(food);

      expect(player.needs.hunger).toBe(70);
      expect(player.needs.thirst).toBe(70);
      expect(player.needs.energy).toBe(100); // Was 100, + 5 = capped at 100
    });

    test('should consume drink item', () => {
      player.needs.thirst = 40;

      const drink = {
        name: 'Water Bottle',
        fillUp: { thirst: 30 }
      };

      player.consumeItem(drink);

      expect(player.needs.thirst).toBe(70);
    });

    test('should handle food items without fillUp by type', () => {
      player.needs.hunger = 50;

      const food = {
        name: 'Generic Food',
        type: 'food'
      };

      player.consumeItem(food);

      // Default food: hunger: 20, energy: 10
      expect(player.needs.hunger).toBe(70);
    });

    test('should handle water type items', () => {
      player.needs.thirst = 50;

      const water = {
        name: 'Water',
        type: 'water'
      };

      player.consumeItem(water);

      // Water type: thirst: 30
      expect(player.needs.thirst).toBe(80);
    });
  });

  describe('checkCriticalNeeds', () => {
    test('should set hunger critical flag when below threshold', () => {
      player.needs.hunger = 5;

      player.checkCriticalNeeds();

      expect(player.needs.criticalFlags.hungerCritical).toBe(true);
    });

    test('should set thirst critical flag when below threshold', () => {
      player.needs.thirst = 8;

      player.checkCriticalNeeds();

      expect(player.needs.criticalFlags.thirstCritical).toBe(true);
    });

    test('should set energy critical flag when below threshold', () => {
      player.needs.energy = 10;

      player.checkCriticalNeeds();

      expect(player.needs.criticalFlags.energyCritical).toBe(true);
    });

    test('should clear flags when needs recover', () => {
      player.needs.hunger = 5;
      player.checkCriticalNeeds();
      expect(player.needs.criticalFlags.hungerCritical).toBe(true);

      player.needs.hunger = 50;
      player.checkCriticalNeeds();

      expect(player.needs.criticalFlags.hungerCritical).toBe(false);
    });

    test('should return effects object with critical statuses', () => {
      player.needs.hunger = 5;
      player.needs.thirst = 8;

      const effects = player.checkCriticalNeeds();

      expect(effects.hungerCritical).toBe(true);
      expect(effects.thirstCritical).toBe(true);
    });
  });

  describe('getEfficiencyMultiplier', () => {
    test('should return 0.3 when any need is critical', () => {
      player.needs.hunger = 15; // Below critical (<=20)

      const multiplier = player.getEfficiencyMultiplier();

      expect(multiplier).toBe(0.3);
    });

    test('should return higher multiplier when needs are healthy', () => {
      player.needs.hunger = 100;
      player.needs.thirst = 100;
      player.needs.energy = 100;

      const multiplier = player.getEfficiencyMultiplier();

      expect(multiplier).toBe(1); // (100+100+100)/300 = 1
    });

    test('should scale with average needs', () => {
      player.needs.hunger = 60;
      player.needs.thirst = 60;
      player.needs.energy = 60;

      const multiplier = player.getEfficiencyMultiplier();

      // Average = 180/300 = 0.6, capped at min 0.5
      expect(multiplier).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('getter methods', () => {
    test('getHunger should return rounded hunger value', () => {
      player.needs.hunger = 75.7;

      expect(player.getHunger()).toBe(76);
    });

    test('getThirst should return rounded thirst value', () => {
      player.needs.thirst = 82.3;

      expect(player.getThirst()).toBe(82);
    });

    test('getEnergy should return rounded energy value', () => {
      player.needs.energy = 91.9;

      expect(player.getEnergy()).toBe(92);
    });

    test('getNeeds should return all needs as object', () => {
      player.needs.hunger = 80;
      player.needs.thirst = 70;
      player.needs.energy = 60;

      const needs = player.getNeeds();

      expect(needs.hunger).toBe(80);
      expect(needs.thirst).toBe(70);
      expect(needs.energy).toBe(60);
    });
  });

  describe('equipment', () => {
    test('should equip item', () => {
      const item = { id: 1, name: 'Axe', type: 'tool' };

      const result = player.equipItem(item);

      expect(result).toBe(true);
      expect(player.getEquippedItem()).toBe(item);
    });

    test('should unequip when equipping same item again', () => {
      const item = { id: 1, name: 'Axe', type: 'tool' };
      player.equipItem(item);

      const result = player.equipItem(item);

      expect(result).toBe(false);
      expect(player.getEquippedItem()).toBeNull();
    });

    test('should unequip item', () => {
      const item = { id: 1, name: 'Axe', type: 'tool' };
      player.equipItem(item);

      const result = player.unequipItem();

      expect(result).toBe(true);
      expect(player.getEquippedItem()).toBeNull();
    });

    test('should return false when unequipping without equipped item', () => {
      const result = player.unequipItem();

      expect(result).toBe(false);
    });

    test('hasEquippedItem should return correct state', () => {
      expect(player.hasEquippedItem()).toBe(false);

      player.equipItem({ id: 1, name: 'Tool' });

      expect(player.hasEquippedItem()).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should handle rapid consumption', () => {
      for (let i = 0; i < 50; i++) {
        player.consumeNeeds('moving', 1);
      }

      expect(player.needs.hunger).toBeGreaterThanOrEqual(0);
      expect(player.needs.thirst).toBeGreaterThanOrEqual(0);
      expect(player.needs.energy).toBeGreaterThanOrEqual(0);
    });

    test('should maintain critical flags consistency', () => {
      player.needs.hunger = 5;
      player.checkCriticalNeeds();
      expect(player.needs.criticalFlags.hungerCritical).toBe(true);

      player.restoreNeeds(50, 0, 0);
      player.checkCriticalNeeds();
      expect(player.needs.criticalFlags.hungerCritical).toBe(false);
    });

    test('should handle fractional values', () => {
      player.needs.hunger = 50.5;

      player.consumeNeeds('moving', 1);

      expect(player.needs.hunger).toBeCloseTo(50, 0);
    });
  });

  describe('event dispatching methods', () => {
    test('should have dispatchNeedsUpdate method', () => {
      expect(typeof player.dispatchNeedsUpdate).toBe('function');
    });

    test('dispatchNeedsUpdate should not throw', () => {
      expect(() => player.dispatchNeedsUpdate()).not.toThrow();
    });

    test('equipItem should dispatch without throwing', () => {
      expect(() => player.equipItem({ id: 1, name: 'Tool' })).not.toThrow();
    });

    test('unequipItem should dispatch without throwing', () => {
      player.equipItem({ id: 1, name: 'Tool' });
      expect(() => player.unequipItem()).not.toThrow();
    });
  });

  describe('character loading', () => {
    test('should set active character', () => {
      const character = { id: 'stella', name: 'Stella' };

      player.setActiveCharacter(character);

      expect(player.activeCharacter).toBe(character);
    });

    test('should create basic player as fallback', () => {
      player.createBasicPlayer();

      expect(player.currentPlayer).toBeDefined();
      expect(player.currentPlayer.x).toBeDefined();
      expect(player.currentPlayer.y).toBeDefined();
      expect(player.currentPlayer.width).toBe(32);
      expect(player.currentPlayer.height).toBe(32);
    });

    test('getCurrentPlayer should return current player', () => {
      player.createBasicPlayer();

      const current = player.getCurrentPlayer();

      expect(current).toBe(player.currentPlayer);
    });
  });
});
