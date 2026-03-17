import { describe, test, expect, beforeEach, mock } from 'bun:test';
import '../setup.js';

// Mock all theWorld.js dependencies

mock.module('../../public/scripts/errorHandler.js', () => ({
  handleError: () => {},
  handleWarn: () => {},
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
  WORLD_WIDTH: 4000,
  WORLD_HEIGHT: 5010,
  GAME_WIDTH: 880,
  GAME_HEIGHT: 963.09,
  TILE_SIZE: 20,
}));

// collisionSystem.js is NOT mocked - uses real module (dependencies constants.js and gameState.js are mocked below)

mock.module('../../public/scripts/animal/animalAI.js', () => ({
  AnimalEntity: class { constructor() {} update() {} },
}));

mock.module('../../public/scripts/optimizationConstants.js', () => ({
  ZOOMED_TILE_SIZE: 64,
  ZOOMED_TILE_SIZE_INT: 64,
  INV_CAMERA_ZOOM: 0.5,
  OPTIMIZATION_CONFIG: { ENABLED: true, USE_PRECALCULATED_VALUES: true, MAX_DRAW_CALLS_PER_FRAME: 5000, LOG_PERFORMANCE: false, SLEEP_OPTIMIZATIONS: { CLEAR_CACHE: true, COMPACT_ARRAYS: true, FORCE_GC: true, RESET_CANVAS: true, OPTIMIZE_MEMORY: true } },
  perfLog: () => {},
  getCachedCalculation: (key, fn) => fn(),
  worldToScreenFast: (x, y) => ({ x, y }),
  screenToWorldFast: (x, y) => ({ x, y }),
  worldToScreenWithCamera: (x, y) => ({ x, y }),
  isInViewportFast: () => true,
  getVisibleTileBounds: () => ({ startX: 0, endX: 100, startY: 0, endY: 100, width: 100, height: 100 }),
  performSleepOptimizations: async () => ({ success: true, duration: 0, optimizationsApplied: 0 }),
  getMemoryStatus: () => ({ error: 'not available' }),
  clearRenderCache: () => false,
  quickOptimization: () => ({ clearCalculationCache: () => {}, getCacheSize: () => 0, getConfig: () => ({}) }),
  default: {},
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
  HITBOX_CONFIGS: { STATIC_OBJECTS: { TREE: { width: 38, height: 40, offsetY: 38, offsetX: 16 }, ROCK: { width: 32, height: 27 }, THICKET: { width: 30, height: 18, offsetY: 7, offsetX: 7 }, CHEST: { width: 31, height: 31 }, HOUSE_WALLS: { width: 20, height: 20, offsetX: 35, offsetY: -50 }, HOUSE_ROOF: { width: 200, height: 190, offsetFromRight: 265, offsetFromBottom: 200 }, WELL: { width: 63, height: 30, offsetY: 56 }, FENCEX: { width: 28, height: 5, offsetX: 0, offsetY: 24 }, FENCEY: { width: 4, height: 63, offsetX: 0, offsetY: 0 } }, ANIMALS: { BULL: { widthRatio: 0.3, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.5 }, TURKEY: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 }, CHICK: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 }, DEFAULT: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 } }, PLAYER: { WIDTH_RATIO: 0.7, HEIGHT_RATIO: 0.3, OFFSET_X_RATIO: 0.15, OFFSET_Y_RATIO: 0.7 }, INTERACTION_ZONES: { PLAYER: { WIDTH_RATIO: 1.8, HEIGHT_RATIO: 1.8, OFFSET_X: -0.4, OFFSET_Y: -0.4 } } },
  MOBILE: { JOYSTICK_MAX_DISTANCE: 40, JOYSTICK_THRESHOLD: 10, SCREEN_WIDTH_THRESHOLD: 768 },
  CAMERA: { CULLING_BUFFER: 200 },
  UI: { FONT_SIZES: { KEY_PROMPT: 14, HEALTH_BAR_TEXT: 10 } },
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

mock.module('../../public/scripts/logger.js', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}));

// Import real module after all mocks
const theWorld = await import('../../public/scripts/theWorld.js');

describe('TheWorld (Production Implementation)', () => {

  beforeEach(() => {
    // Clear all world arrays
    theWorld.trees.length = 0;
    theWorld.rocks.length = 0;
    theWorld.thickets.length = 0;
    theWorld.houses.length = 0;
    theWorld.animals.length = 0;
    theWorld.placedBuildings.length = 0;
    theWorld.placedWells.length = 0;
  });

  describe('exported arrays', () => {
    test('trees should be an array', () => {
      expect(Array.isArray(theWorld.trees)).toBe(true);
    });

    test('rocks should be an array', () => {
      expect(Array.isArray(theWorld.rocks)).toBe(true);
    });

    test('thickets should be an array', () => {
      expect(Array.isArray(theWorld.thickets)).toBe(true);
    });

    test('houses should be an array', () => {
      expect(Array.isArray(theWorld.houses)).toBe(true);
    });

    test('animals should be an array', () => {
      expect(Array.isArray(theWorld.animals)).toBe(true);
    });

    test('placedBuildings should be an array', () => {
      expect(Array.isArray(theWorld.placedBuildings)).toBe(true);
    });

    test('placedWells should be an array', () => {
      expect(Array.isArray(theWorld.placedWells)).toBe(true);
    });
  });

  describe('world dimensions', () => {
    test('should export WORLD_WIDTH', () => {
      expect(theWorld.WORLD_WIDTH).toBe(4000);
    });

    test('should export WORLD_HEIGHT', () => {
      expect(theWorld.WORLD_HEIGHT).toBe(5010);
    });

    test('should export GAME_WIDTH', () => {
      expect(theWorld.GAME_WIDTH).toBe(880);
    });

    test('should export GAME_HEIGHT', () => {
      expect(theWorld.GAME_HEIGHT).toBe(963.09);
    });
  });

  describe('exportWorldState', () => {
    test('should return empty arrays when world is empty', () => {
      const state = theWorld.exportWorldState();
      expect(state.trees).toEqual([]);
      expect(state.rocks).toEqual([]);
      expect(state.thickets).toEqual([]);
      expect(state.houses).toEqual([]);
      expect(state.animals).toEqual([]);
      expect(state.placedBuildings).toEqual([]);
      expect(state.placedWells).toEqual([]);
    });

    test('should export tree data correctly', () => {
      theWorld.trees.push({ id: 'tree1', x: 100, y: 200, width: 32, height: 64, type: 'TREE', subType: 'oak', hp: 6 });

      const state = theWorld.exportWorldState();
      expect(state.trees).toHaveLength(1);
      expect(state.trees[0].id).toBe('tree1');
      expect(state.trees[0].x).toBe(100);
      expect(state.trees[0].y).toBe(200);
      expect(state.trees[0].hp).toBe(6);
    });

    test('should export rock data correctly', () => {
      theWorld.rocks.push({ id: 'rock1', x: 50, y: 75, width: 32, height: 27, type: 'ROCK', subType: 'stone', hp: 3 });

      const state = theWorld.exportWorldState();
      expect(state.rocks).toHaveLength(1);
      expect(state.rocks[0].id).toBe('rock1');
    });

    test('should export multiple objects', () => {
      theWorld.trees.push({ id: 't1', x: 0, y: 0, width: 32, height: 64, type: 'TREE', subType: 'oak', hp: 6 });
      theWorld.trees.push({ id: 't2', x: 100, y: 100, width: 32, height: 64, type: 'TREE', subType: 'pine', hp: 6 });
      theWorld.rocks.push({ id: 'r1', x: 50, y: 50, width: 32, height: 27, type: 'ROCK', subType: 'stone', hp: 3 });

      const state = theWorld.exportWorldState();
      expect(state.trees).toHaveLength(2);
      expect(state.rocks).toHaveLength(1);
    });

    test('should export house data', () => {
      theWorld.houses.push({ id: 'h1', x: 200, y: 300, width: 100, height: 100, type: 'HOUSE_WALLS' });

      const state = theWorld.exportWorldState();
      expect(state.houses).toHaveLength(1);
      expect(state.houses[0].type).toBe('HOUSE_WALLS');
    });

    test('should export animal data', () => {
      theWorld.animals.push({ id: 'a1', x: 150, y: 250, assetName: 'bull' });

      const state = theWorld.exportWorldState();
      expect(state.animals).toHaveLength(1);
      expect(state.animals[0].assetName).toBe('bull');
    });

    test('should export placed building data', () => {
      theWorld.placedBuildings.push({
        id: 'b1', x: 300, y: 400, width: 32, height: 32,
        type: 'FENCE', originalType: 'fence', name: 'Fence',
        icon: '🏗️', variant: 'x', itemId: 6, interactable: false, storageId: null
      });

      const state = theWorld.exportWorldState();
      expect(state.placedBuildings).toHaveLength(1);
      expect(state.placedBuildings[0].name).toBe('Fence');
    });

    test('should export placed well data', () => {
      theWorld.placedWells.push({ id: 'w1', x: 400, y: 500, width: 63, height: 30, originalType: 'well', name: 'Well' });

      const state = theWorld.exportWorldState();
      expect(state.placedWells).toHaveLength(1);
      expect(state.placedWells[0].originalType).toBe('well');
    });
  });

  describe('importWorldState', () => {
    test('should not throw for null data', () => {
      expect(() => theWorld.importWorldState(null)).not.toThrow();
    });

    test('should import trees', () => {
      theWorld.importWorldState({
        trees: [{ id: 't1', x: 100, y: 200, width: 32, height: 64, type: 'TREE', hp: 6 }],
      });

      expect(theWorld.trees).toHaveLength(1);
      expect(theWorld.trees[0].id).toBe('t1');
    });

    test('should import rocks', () => {
      theWorld.importWorldState({
        rocks: [{ id: 'r1', x: 50, y: 75, width: 32, height: 27, type: 'ROCK', hp: 3 }],
      });

      expect(theWorld.rocks).toHaveLength(1);
    });

    test('should clear existing data before import', () => {
      theWorld.trees.push({ id: 'old', x: 0, y: 0 });

      theWorld.importWorldState({
        trees: [{ id: 'new', x: 100, y: 100, width: 32, height: 64 }],
      });

      expect(theWorld.trees).toHaveLength(1);
      expect(theWorld.trees[0].id).toBe('new');
    });

    test('should handle missing arrays gracefully', () => {
      expect(() => theWorld.importWorldState({})).not.toThrow();
      expect(theWorld.trees).toHaveLength(0);
      expect(theWorld.rocks).toHaveLength(0);
    });
  });

  describe('getInitialPlayerPosition', () => {
    test('should return center of world when no houses exist', () => {
      const pos = theWorld.getInitialPlayerPosition();
      expect(pos.x).toBeDefined();
      expect(pos.y).toBeDefined();
    });

    test('should return position near house when house exists', () => {
      theWorld.houses.push({ type: 'HOUSE_WALLS', x: 500, y: 600, width: 100, height: 100 });

      const pos = theWorld.getInitialPlayerPosition();
      // Should be near the house
      expect(pos.x).toBeGreaterThan(400);
      expect(pos.y).toBeGreaterThan(500);
    });
  });

  describe('markWorldChanged', () => {
    test('should not throw', () => {
      expect(() => theWorld.markWorldChanged()).not.toThrow();
    });
  });

  describe('compactLargeArrays', () => {
    test('should not compact small arrays (<=50)', () => {
      for (let i = 0; i < 10; i++) {
        theWorld.trees.push({ id: `t${i}`, hp: 6 });
      }

      const result = theWorld.compactLargeArrays();
      expect(theWorld.trees).toHaveLength(10);
    });

    test('should return compacted count', () => {
      const result = theWorld.compactLargeArrays();
      expect(result).toBeDefined();
      expect(result.itemsCompacted).toBeDefined();
    });
  });

  describe('objectDestroyed', () => {
    test('should not throw for null input', () => {
      expect(() => theWorld.objectDestroyed(null)).not.toThrow();
    });

    test('should remove tree by id', () => {
      theWorld.trees.push({ id: 'tree1', x: 100, y: 200 });

      theWorld.objectDestroyed('tree1');

      expect(theWorld.trees.find(t => t.id === 'tree1')).toBeUndefined();
    });

    test('should remove rock by object reference', () => {
      const rock = { id: 'rock1', x: 50, y: 75, type: 'ROCK' };
      theWorld.rocks.push(rock);

      theWorld.objectDestroyed(rock);

      expect(theWorld.rocks.find(r => r.id === 'rock1')).toBeUndefined();
    });

    test('should not affect other objects', () => {
      theWorld.trees.push({ id: 't1', x: 0, y: 0 });
      theWorld.trees.push({ id: 't2', x: 100, y: 100 });

      theWorld.objectDestroyed('t1');

      expect(theWorld.trees).toHaveLength(1);
      expect(theWorld.trees[0].id).toBe('t2');
    });
  });
});
