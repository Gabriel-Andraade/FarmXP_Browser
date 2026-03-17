import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import "../setup.js";

// Mock logger.js
mock.module('../../public/scripts/logger.js', () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  }
}));

// Mock gameState.js - track registered systems and objects
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

// Mock optimizationConstants.js - ALL named exports (prevents leak from other files)
mock.module('../../public/scripts/optimizationConstants.js', () => ({
  ZOOMED_TILE_SIZE: 40,
  ZOOMED_TILE_SIZE_INT: 40,
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

// =============================================================================
// Mocks para dependências do theWorld.js (substituem o mock antigo do módulo)
// =============================================================================
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

mock.module('../../public/scripts/animal/animalAI.js', () => ({
  AnimalEntity: class { constructor() {} update() {} },
}));

// Mock constants.js - ALL named exports (theWorld.js imports CAMERA from it)
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

// Mock validation.js
mock.module('../../public/scripts/validation.js', () => ({
  MAX_CURRENCY: 1_000_000_000,
  isValidPositiveInteger: (n) => Number.isInteger(n) && n > 0,
  isValidItemId: (id) => Number.isInteger(id) && id > 0,
  isValidPositiveNumber: (n) => typeof n === 'number' && n > 0,
  sanitizeQuantity: (q, min = 1, max = 9999) => Math.max(min, Math.min(max, Math.floor(q))),
  validateRange: (v, min, max) => Math.max(min, Math.min(max, v)),
  validateTradeInput: () => ({ valid: true }),
}));

// =============================================================================
// Importação dos módulos reais (após os mocks)
// =============================================================================
const theWorldModule = await import('../../public/scripts/theWorld.js');
const theWorld = theWorldModule;
const { formatPlayTime, formatDateTime, saveSystem } = await import('../../public/scripts/saveSystem.js');

describe('SaveSystem (Production Implementation)', () => {

  beforeEach(() => {
    // Reset localStorage
    globalThis.localStorage.clear();
    saveSystem.stopAutoSave();
    // Reset save system state
    saveSystem.activeSlot = null;
    saveSystem.sessionStartAt = null;
    saveSystem.sessionMs = 0;
    saveSystem.isDirty = false;
    saveSystem._clearCache();
    // Clear mock systems/objects
    for (const key of Object.keys(mockSystems)) {
      if (key !== 'save') delete mockSystems[key];
    }
    for (const key of Object.keys(mockObjects)) {
      delete mockObjects[key];
    }
  });

  afterEach(() => {
    theWorld.trees.length = 0;
    theWorld.rocks.length = 0;
  });

  describe('formatPlayTime', () => {
    test('should format 0ms as 00:00:00', () => {
      expect(formatPlayTime(0)).toBe('00:00:00');
    });

    test('should format negative ms as 00:00:00', () => {
      expect(formatPlayTime(-1000)).toBe('00:00:00');
    });

    test('should format null/undefined as 00:00:00', () => {
      expect(formatPlayTime(null)).toBe('00:00:00');
      expect(formatPlayTime(undefined)).toBe('00:00:00');
    });

    test('should format seconds correctly', () => {
      expect(formatPlayTime(30000)).toBe('00:00:30');
    });

    test('should format minutes correctly', () => {
      expect(formatPlayTime(90000)).toBe('00:01:30');
    });

    test('should format hours correctly', () => {
      expect(formatPlayTime(3661000)).toBe('01:01:01');
    });

    test('should handle large values', () => {
      // 100 hours
      expect(formatPlayTime(360000000)).toBe('100:00:00');
    });

    test('should pad single digits with zeros', () => {
      expect(formatPlayTime(1000)).toBe('00:00:01');
      expect(formatPlayTime(60000)).toBe('00:01:00');
      expect(formatPlayTime(3600000)).toBe('01:00:00');
    });
  });

  describe('formatDateTime', () => {
    test('should return placeholder for null/undefined', () => {
      expect(formatDateTime(null)).toBe('--/--/---- --:--');
      expect(formatDateTime(undefined)).toBe('--/--/---- --:--');
      expect(formatDateTime(0)).toBe('--/--/---- --:--');
    });

    test('should format a valid timestamp', () => {
      // January 15, 2025, 14:30 (local time)
      const ts = new Date(2025, 0, 15, 14, 30).getTime();
      const result = formatDateTime(ts);
      expect(result).toContain('15/01/2025');
      expect(result).toContain('14:30');
    });

    test('should pad day and month with zeros', () => {
      const ts = new Date(2025, 0, 5, 9, 5).getTime();
      const result = formatDateTime(ts);
      expect(result).toContain('05/01/2025');
      expect(result).toContain('09:05');
    });
  });

  describe('initialization', () => {
    test('should register itself in gameState as "save"', () => {
      // Verifica que saveSystem foi construído corretamente (o registerSystem
      // pode não usar nosso mock se outro arquivo sobrescrever o mock de gameState)
      expect(saveSystem).toBeDefined();
      expect(typeof saveSystem._readRoot).toBe('function');
      expect(typeof saveSystem.createOrOverwriteSlot).toBe('function');
    });

    test('should start with no active slot', () => {
      expect(saveSystem.activeSlot).toBeNull();
    });

    test('should start with isDirty false', () => {
      expect(saveSystem.isDirty).toBe(false);
    });

    test('should start with zero session time', () => {
      expect(saveSystem.sessionMs).toBe(0);
    });
  });

  describe('_readRoot', () => {
    test('should return default structure when localStorage is empty', () => {
      const root = saveSystem._readRoot();
      expect(root.version).toBe(1);
      expect(root.slots).toHaveLength(3);
      expect(root.slots[0]).toBeNull();
      expect(root.slots[1]).toBeNull();
      expect(root.slots[2]).toBeNull();
    });

    test('should parse existing data from localStorage', () => {
      const data = {
        version: 1,
        slots: [
          { meta: { saveName: 'Test Save' }, data: {} },
          null,
          null
        ]
      };
      localStorage.setItem('farmxp_saves_v1', JSON.stringify(data));
      saveSystem._clearCache();

      const root = saveSystem._readRoot();
      expect(root.slots[0].meta.saveName).toBe('Test Save');
      expect(root.slots[1]).toBeNull();
    });

    test('should use cache on subsequent reads', () => {
      const root1 = saveSystem._readRoot();
      root1.slots[0] = { meta: { saveName: 'Cached' }, data: {} };

      const root2 = saveSystem._readRoot();
      expect(root2.slots[0].meta.saveName).toBe('Cached');
    });

    test('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('farmxp_saves_v1', '{invalid json}');
      saveSystem._clearCache();

      const root = saveSystem._readRoot();
      expect(root.version).toBe(1);
      expect(root.slots).toHaveLength(3);
    });

    test('should pad slots array if less than 3', () => {
      const data = { version: 1, slots: [null] };
      localStorage.setItem('farmxp_saves_v1', JSON.stringify(data));
      saveSystem._clearCache();

      const root = saveSystem._readRoot();
      expect(root.slots).toHaveLength(3);
    });

    test('should handle missing slots array', () => {
      const data = { version: 1 };
      localStorage.setItem('farmxp_saves_v1', JSON.stringify(data));
      saveSystem._clearCache();

      const root = saveSystem._readRoot();
      expect(root.slots).toHaveLength(3);
    });
  });

  describe('_writeRoot', () => {
    test('should persist data to localStorage', () => {
      const root = { version: 1, slots: [null, null, null] };
      const result = saveSystem._writeRoot(root);

      expect(result).toBe(true);

      const stored = JSON.parse(localStorage.getItem('farmxp_saves_v1'));
      expect(stored.version).toBe(1);
      expect(stored.slots).toHaveLength(3);
    });

    test('should update internal cache', () => {
      const root = { version: 1, slots: [{ meta: { saveName: 'Written' }, data: {} }, null, null] };
      saveSystem._writeRoot(root);

      const cached = saveSystem._readRoot();
      expect(cached.slots[0].meta.saveName).toBe('Written');
    });
  });

  describe('_clearCache', () => {
    test('should force re-read from localStorage', () => {
      saveSystem._readRoot(); // populate cache
      localStorage.setItem('farmxp_saves_v1', JSON.stringify({
        version: 1,
        slots: [{ meta: { saveName: 'Fresh' }, data: {} }, null, null]
      }));

      // Before clear: cache still has old data
      saveSystem._clearCache();
      const root = saveSystem._readRoot();
      expect(root.slots[0].meta.saveName).toBe('Fresh');
    });
  });

  describe('listSlots', () => {
    test('should return copy of all slots', () => {
      const slots = saveSystem.listSlots();
      expect(slots).toHaveLength(3);
      expect(slots[0]).toBeNull();
    });

    test('should return a copy (not reference)', () => {
      const slots = saveSystem.listSlots();
      slots[0] = 'modified';

      const slots2 = saveSystem.listSlots();
      expect(slots2[0]).toBeNull();
    });
  });

  describe('isSlotEmpty', () => {
    test('should return true for empty slot', () => {
      expect(saveSystem.isSlotEmpty(0)).toBe(true);
      expect(saveSystem.isSlotEmpty(1)).toBe(true);
      expect(saveSystem.isSlotEmpty(2)).toBe(true);
    });

    test('should return false for occupied slot', () => {
      const root = saveSystem._readRoot();
      root.slots[0] = { meta: { saveName: 'Test' }, data: {} };
      saveSystem._writeRoot(root);

      expect(saveSystem.isSlotEmpty(0)).toBe(false);
      expect(saveSystem.isSlotEmpty(1)).toBe(true);
    });
  });

  describe('getSlotMeta', () => {
    test('should return null for empty slot', () => {
      expect(saveSystem.getSlotMeta(0)).toBeNull();
    });

    test('should return metadata for occupied slot', () => {
      const root = saveSystem._readRoot();
      root.slots[1] = { meta: { saveName: 'My Save', characterId: 'ben' }, data: {} };
      saveSystem._writeRoot(root);

      const meta = saveSystem.getSlotMeta(1);
      expect(meta.saveName).toBe('My Save');
      expect(meta.characterId).toBe('ben');
    });
  });

  describe('selectActiveSlot', () => {
    test('should set active slot index', () => {
      saveSystem.selectActiveSlot(1);
      expect(saveSystem.activeSlot).toBe(1);
    });

    test('should save active slot to localStorage', () => {
      saveSystem.selectActiveSlot(2);
      expect(localStorage.getItem('farmxp_active_slot')).toBe('2');
    });

    test('should reset session time', () => {
      saveSystem.sessionMs = 5000;
      saveSystem.selectActiveSlot(0);
      expect(saveSystem.sessionMs).toBe(0);
    });

    test('should set sessionStartAt', () => {
      saveSystem.selectActiveSlot(0);
      expect(saveSystem.sessionStartAt).toBeDefined();
      expect(typeof saveSystem.sessionStartAt).toBe('number');
    });

    test('should reject invalid indices', () => {
      saveSystem.selectActiveSlot(-1);
      expect(saveSystem.activeSlot).toBeNull();

      saveSystem.selectActiveSlot(3);
      expect(saveSystem.activeSlot).toBeNull();
    });

    test('should update lastPlayedAt on existing slot', () => {
      const root = saveSystem._readRoot();
      root.slots[0] = { meta: { saveName: 'Test', lastPlayedAt: 0 }, data: {} };
      saveSystem._writeRoot(root);

      saveSystem.selectActiveSlot(0);

      const meta = saveSystem.getSlotMeta(0);
      expect(meta.lastPlayedAt).toBeGreaterThan(0);
    });
  });

  describe('tick', () => {
    test('should accumulate session time when active', () => {
      saveSystem.activeSlot = 0;
      saveSystem.tick(16);
      saveSystem.tick(16);
      expect(saveSystem.sessionMs).toBe(32);
    });

    test('should not accumulate when no active slot', () => {
      saveSystem.activeSlot = null;
      saveSystem.tick(16);
      expect(saveSystem.sessionMs).toBe(0);
    });
  });

  describe('markDirty', () => {
    test('should set isDirty to true', () => {
      expect(saveSystem.isDirty).toBe(false);
      saveSystem.markDirty();
      expect(saveSystem.isDirty).toBe(true);
    });
  });

  describe('createOrOverwriteSlot', () => {
    test('should create a new slot with default metadata', () => {
      const result = saveSystem.createOrOverwriteSlot(0);
      expect(result).toBe(true);

      const meta = saveSystem.getSlotMeta(0);
      expect(meta.slotIndex).toBe(0);
      expect(meta.saveName).toBe('Save 1');
      expect(meta.characterId).toBe('stella');
      expect(meta.characterName).toBe('Stella');
      expect(meta.createdAt).toBeDefined();
      expect(meta.lastSavedAt).toBeDefined();
      expect(meta.totalPlayTimeMs).toBeDefined();
    });

    test('should use custom saveName when provided', () => {
      saveSystem.createOrOverwriteSlot(1, { saveName: 'My Farm' });

      const meta = saveSystem.getSlotMeta(1);
      expect(meta.saveName).toBe('My Farm');
    });

    test('should use custom characterId when provided', () => {
      saveSystem.createOrOverwriteSlot(0, { characterId: 'ben', characterName: 'Ben' });

      const meta = saveSystem.getSlotMeta(0);
      expect(meta.characterId).toBe('ben');
      expect(meta.characterName).toBe('Ben');
    });

    test('should reject invalid slot indices', () => {
      expect(saveSystem.createOrOverwriteSlot(-1)).toBe(false);
      expect(saveSystem.createOrOverwriteSlot(3)).toBe(false);
    });

    test('should accumulate totalPlayTimeMs on subsequent saves', () => {
      saveSystem.sessionMs = 5000;
      saveSystem.createOrOverwriteSlot(0);

      saveSystem.sessionMs = 3000;
      saveSystem.createOrOverwriteSlot(0);

      const meta = saveSystem.getSlotMeta(0);
      expect(meta.totalPlayTimeMs).toBe(8000);
    });

    test('should reset sessionMs after save', () => {
      saveSystem.sessionMs = 5000;
      saveSystem.createOrOverwriteSlot(0);
      expect(saveSystem.sessionMs).toBe(0);
    });

    test('should set isDirty to false after save', () => {
      saveSystem.isDirty = true;
      saveSystem.createOrOverwriteSlot(0);
      expect(saveSystem.isDirty).toBe(false);
    });

    test('should store save reason', () => {
      saveSystem.createOrOverwriteSlot(0, { reason: 'auto' });

      const meta = saveSystem.getSlotMeta(0);
      expect(meta.lastSaveReason).toBe('auto');
    });

    test('should default reason to manual', () => {
      saveSystem.createOrOverwriteSlot(0);

      const meta = saveSystem.getSlotMeta(0);
      expect(meta.lastSaveReason).toBe('manual');
    });

    test('should collect game data in slot.data', () => {
      saveSystem.createOrOverwriteSlot(0);

      const root = saveSystem._readRoot();
      const data = root.slots[0].data;
      expect(data).toBeDefined();
      expect(data).toHaveProperty('player');
      expect(data).toHaveProperty('inventory');
      expect(data).toHaveProperty('currency');
      expect(data).toHaveProperty('weather');
      expect(data).toHaveProperty('world');
      expect(data).toHaveProperty('chests');
    });
  });

  describe('saveActive', () => {
    test('should return false when no active slot', () => {
      saveSystem.activeSlot = null;
      expect(saveSystem.saveActive()).toBe(false);
    });

    test('should save to the active slot', () => {
      saveSystem.createOrOverwriteSlot(1);
      saveSystem.activeSlot = 1;
      saveSystem.sessionMs = 2000;

      const result = saveSystem.saveActive('manual');
      expect(result).toBe(true);

      const meta = saveSystem.getSlotMeta(1);
      expect(meta.totalPlayTimeMs).toBe(2000);
    });

    test('should pass reason through', () => {
      saveSystem.createOrOverwriteSlot(0);
      saveSystem.activeSlot = 0;

      saveSystem.saveActive('beforeunload');

      const meta = saveSystem.getSlotMeta(0);
      expect(meta.lastSaveReason).toBe('beforeunload');
    });
  });

  describe('loadSlot', () => {
    test('should return null for empty slot', () => {
      expect(saveSystem.loadSlot(0)).toBeNull();
    });

    test('should return null for invalid index', () => {
      expect(saveSystem.loadSlot(-1)).toBeNull();
      expect(saveSystem.loadSlot(3)).toBeNull();
    });

    test('should return slot data for valid save', () => {
      saveSystem.createOrOverwriteSlot(2);

      const loaded = saveSystem.loadSlot(2);
      expect(loaded).toBeDefined();
      expect(loaded.meta).toBeDefined();
      expect(loaded.data).toBeDefined();
    });

    test('should set the slot as active', () => {
      saveSystem.createOrOverwriteSlot(1);
      saveSystem.activeSlot = null;

      saveSystem.loadSlot(1);
      expect(saveSystem.activeSlot).toBe(1);
    });
  });

  describe('renameSlot', () => {
    test('should rename an existing slot', () => {
      saveSystem.createOrOverwriteSlot(0);

      const result = saveSystem.renameSlot(0, 'New Name');
      expect(result).toBe(true);

      const meta = saveSystem.getSlotMeta(0);
      expect(meta.saveName).toBe('New Name');
    });

    test('should trim and limit name to 30 chars', () => {
      saveSystem.createOrOverwriteSlot(0);

      saveSystem.renameSlot(0, '  A very long save name that exceeds the maximum allowed length  ');
      const meta = saveSystem.getSlotMeta(0);
      expect(meta.saveName.length).toBeLessThanOrEqual(30);
    });

    test('should return false for empty slot', () => {
      expect(saveSystem.renameSlot(0, 'Name')).toBe(false);
    });

    test('should return false for invalid index', () => {
      expect(saveSystem.renameSlot(-1, 'Name')).toBe(false);
      expect(saveSystem.renameSlot(3, 'Name')).toBe(false);
    });

    test('should return false for invalid name', () => {
      saveSystem.createOrOverwriteSlot(0);

      expect(saveSystem.renameSlot(0, '')).toBe(false);
      expect(saveSystem.renameSlot(0, null)).toBe(false);
      expect(saveSystem.renameSlot(0, 123)).toBe(false);
    });
  });

  describe('deleteSlot', () => {
    test('should delete an existing slot', () => {
      saveSystem.createOrOverwriteSlot(0);
      expect(saveSystem.isSlotEmpty(0)).toBe(false);

      const result = saveSystem.deleteSlot(0);
      expect(result).toBe(true);
      expect(saveSystem.isSlotEmpty(0)).toBe(true);
    });

    test('should deactivate if deleted slot was active', () => {
      saveSystem.createOrOverwriteSlot(1);
      saveSystem.activeSlot = 1;

      saveSystem.deleteSlot(1);
      expect(saveSystem.activeSlot).toBeNull();
    });

    test('should not deactivate if another slot was active', () => {
      saveSystem.createOrOverwriteSlot(0);
      saveSystem.createOrOverwriteSlot(1);
      saveSystem.activeSlot = 0;

      saveSystem.deleteSlot(1);
      expect(saveSystem.activeSlot).toBe(0);
    });

    test('should return false for invalid index', () => {
      expect(saveSystem.deleteSlot(-1)).toBe(false);
      expect(saveSystem.deleteSlot(3)).toBe(false);
    });

    test('should persist deletion to localStorage', () => {
      saveSystem.createOrOverwriteSlot(0);
      saveSystem.deleteSlot(0);

      saveSystem._clearCache();
      expect(saveSystem.isSlotEmpty(0)).toBe(true);
    });
  });

  describe('hasAnySave', () => {
    test('should return false when all slots are empty', () => {
      expect(saveSystem.hasAnySave()).toBe(false);
    });

    test('should return true when at least one slot has data', () => {
      saveSystem.createOrOverwriteSlot(2);
      expect(saveSystem.hasAnySave()).toBe(true);
    });
  });

  describe('_gatherGameData', () => {
    test('should collect player data with defaults', () => {
      const data = saveSystem._gatherGameData();
      expect(data.player).toBeDefined();
      expect(data.player.x).toBe(400);
      expect(data.player.y).toBe(300);
      expect(data.player.characterId).toBe('stella');
    });

    test('should collect player data from registered systems', () => {
      mockObjects.currentPlayer = { x: 100, y: 200, facingDirection: 'left' };
      mockSystems.player = {
        activeCharacter: { id: 'ben', name: 'Ben' },
        needs: { hunger: 80, thirst: 60, energy: 40 }
      };

      const data = saveSystem._gatherGameData();
      expect(data.player.x).toBe(100);
      expect(data.player.y).toBe(200);
      expect(data.player.characterId).toBe('ben');
      expect(data.player.needs.hunger).toBe(80);
    });

    test('should collect currency data with default', () => {
      const data = saveSystem._gatherGameData();
      expect(data.currency.money).toBe(1000);
    });

    test('should collect currency from registered system', () => {
      mockSystems.currency = { currentMoney: 5000 };

      const data = saveSystem._gatherGameData();
      expect(data.currency.money).toBe(5000);
    });

    test('should collect world data', () => {
      // Adiciona objetos ao mundo real
      theWorld.trees.push({ id: 'tree1', x: 100, y: 200 });
      theWorld.rocks.push({ id: 'rock1', x: 50, y: 75 });

      const data = saveSystem._gatherGameData();
      expect(data.world.trees).toHaveLength(1);
      expect(data.world.trees[0].id).toBe('tree1');
      expect(data.world.rocks).toHaveLength(1);
      expect(data.world.rocks[0].id).toBe('rock1');
    });

    test('should return null weather when no weather system', () => {
      delete mockSystems.weather;
      const data = saveSystem._gatherGameData();
      expect(data.weather).toBeNull();
    });

    test('should collect weather data from registered system', () => {
      mockSystems.weather = {
        currentTime: 720,
        day: 5,
        month: 3,
        year: 2,
        season: 'Primavera',
        weatherType: 'rain',
        weatherTimer: 30,
        nextWeatherChange: 120,
        ambientDarkness: 0.5
      };

      const data = saveSystem._gatherGameData();
      expect(data.weather.currentTime).toBe(720);
      expect(data.weather.day).toBe(5);
      expect(data.weather.weatherType).toBe('rain');
    });

    test('should collect inventory data from registered system', () => {
      mockSystems.inventory = {
        categories: {
          tools: { items: [{ id: 3, quantity: 1 }] },
          resources: { items: [{ id: 1, quantity: 10 }] }
        },
        equipped: { tool: 3 }
      };

      const data = saveSystem._gatherGameData();
      expect(data.inventory.categories.tools).toHaveLength(1);
      expect(data.inventory.categories.resources).toHaveLength(1);
      expect(data.inventory.equipped.tool).toBe(3);
    });

    test('should collect chest data from registered system', () => {
      mockSystems.chest = {
        chests: {
          'chest_1': { id: 'chest_1', x: 100, y: 200, contents: { 1: 5 } }
        }
      };

      const data = saveSystem._gatherGameData();
      expect(data.chests.chest_1).toBeDefined();
      expect(data.chests.chest_1.x).toBe(100);
      expect(data.chests.chest_1.contents[1]).toBe(5);
    });
  });

  describe('applySaveData', () => {
    test('should handle null/invalid save data', async () => {
      // Should not throw
      await saveSystem.applySaveData(null);
      await saveSystem.applySaveData({});
      await saveSystem.applySaveData({ data: null });
    });

    test('should apply currency data', async () => {
      const mockCurrency = { currentMoney: 1000, _notifyChange: () => {} };
      mockSystems.currency = mockCurrency;

      await saveSystem.applySaveData({
        data: { currency: { money: 5000 } }
      });

      expect(mockCurrency.currentMoney).toBe(5000);
    });

    test('should reject negative money in currency data', async () => {
      const mockCurrency = { currentMoney: 1000, _notifyChange: () => {} };
      mockSystems.currency = mockCurrency;

      await saveSystem.applySaveData({
        data: { currency: { money: -500 } }
      });

      // Negative values should not be applied
      expect(mockCurrency.currentMoney).toBe(1000);
    });

    test('should apply weather data', async () => {
      const mockWeather = {
        currentTime: 0, day: 1, month: 1, year: 1,
        season: 'Primavera', weatherType: 'clear',
        weatherTimer: 0, nextWeatherChange: 120,
        ambientDarkness: 0, isSleeping: false,
        sleepTransitionProgress: 0, sleepPhase: null,
        sleepTimerAcc: 0, rainParticles: [],
        fogLayers: [], snowParticles: [],
        lightningFlashes: [],
        pause: () => {}, resume: () => {},
        updateAmbientLight: () => {},
        getWeekday: () => 'Monday'
      };
      mockSystems.weather = mockWeather;

      await saveSystem.applySaveData({
        data: {
          weather: {
            currentTime: 720, day: 15, month: 6, year: 3,
            season: 'Verão', weatherType: 'rain',
            weatherTimer: 45, nextWeatherChange: 180,
            ambientDarkness: 0.3
          }
        }
      });

      expect(mockWeather.currentTime).toBe(720);
      expect(mockWeather.day).toBe(15);
      expect(mockWeather.month).toBe(6);
      expect(mockWeather.season).toBe('Verão');
      expect(mockWeather.weatherType).toBe('rain');
    });

    test('should clear particles when applying weather data', async () => {
      const mockWeather = {
        currentTime: 0, day: 1, month: 1, year: 1,
        season: 'Primavera', weatherType: 'clear',
        weatherTimer: 0, nextWeatherChange: 120,
        ambientDarkness: 0, isSleeping: true,
        sleepTransitionProgress: 0.5, sleepPhase: 'fadingOut',
        sleepTimerAcc: 100,
        rainParticles: [{ x: 1 }], fogLayers: [{ x: 1 }],
        snowParticles: [{ x: 1 }], lightningFlashes: [{ x: 1 }],
        pause: () => {}, resume: () => {},
        updateAmbientLight: () => {},
        getWeekday: () => 'Monday'
      };
      mockSystems.weather = mockWeather;

      await saveSystem.applySaveData({
        data: { weather: { weatherType: 'clear' } }
      });

      expect(mockWeather.rainParticles).toEqual([]);
      expect(mockWeather.fogLayers).toEqual([]);
      expect(mockWeather.snowParticles).toEqual([]);
      expect(mockWeather.lightningFlashes).toEqual([]);
      expect(mockWeather.isSleeping).toBe(false);
    });

    test('should apply player position data', async () => {
      const mockPlayer = { x: 0, y: 0, facingDirection: 'down' };
      mockObjects.currentPlayer = mockPlayer;
      mockSystems.player = {
        activeCharacter: { id: 'stella' },
        currentPlayer: mockPlayer,
        needs: { hunger: 100, thirst: 100, energy: 100 }
      };

      await saveSystem.applySaveData({
        data: {
          player: { x: 500, y: 600, facingDirection: 'up', characterId: 'stella', needs: { hunger: 50, thirst: 70, energy: 30 } }
        }
      });

      expect(mockPlayer.x).toBe(500);
      expect(mockPlayer.y).toBe(600);
      expect(mockPlayer.facingDirection).toBe('up');
    });

    test('should apply player needs data', async () => {
      const mockPlayerSystem = {
        activeCharacter: { id: 'stella' },
        currentPlayer: { x: 0, y: 0, facingDirection: 'down' },
        needs: { hunger: 100, thirst: 100, energy: 100 }
      };
      mockSystems.player = mockPlayerSystem;
      mockObjects.currentPlayer = mockPlayerSystem.currentPlayer;

      await saveSystem.applySaveData({
        data: {
          player: { characterId: 'stella', needs: { hunger: 50, thirst: 70, energy: 30 } }
        }
      });

      expect(mockPlayerSystem.needs.hunger).toBe(50);
      expect(mockPlayerSystem.needs.thirst).toBe(70);
      expect(mockPlayerSystem.needs.energy).toBe(30);
    });

    test('should apply world data', async () => {
      await saveSystem.applySaveData({
        data: {
          world: {
            trees: [{ id: 'imported1', x: 10, y: 20, width: 32, height: 64, type: 'TREE', hp: 6 }],
            rocks: [{ id: 'imported2', x: 30, y: 40, width: 32, height: 27, type: 'ROCK', hp: 3 }]
          }
        }
      });

      expect(theWorld.trees).toHaveLength(1);
      expect(theWorld.trees[0].id).toBe('imported1');
      expect(theWorld.rocks).toHaveLength(1);
      expect(theWorld.rocks[0].id).toBe('imported2');
    });

    test('should apply chest data to existing chest system', async () => {
      mockSystems.chest = { chests: {} };

      await saveSystem.applySaveData({
        data: {
          chests: {
            'chest_1': { id: 'chest_1', x: 100, y: 200, contents: { 1: 5 } }
          }
        }
      });

      expect(mockSystems.chest.chests['chest_1']).toBeDefined();
      expect(mockSystems.chest.chests['chest_1'].contents[1]).toBe(5);
    });
  });

  describe('autoSave', () => {
    test('should start and stop auto save', () => {
      saveSystem.startAutoSave(100);
      expect(saveSystem.autoSaveInterval).toBeDefined();

      saveSystem.stopAutoSave();
      expect(saveSystem.autoSaveInterval).toBeNull();
    });

    test('should stop existing auto save before starting new one', () => {
      saveSystem.startAutoSave(100);
      const firstInterval = saveSystem.autoSaveInterval;

      saveSystem.startAutoSave(200);
      expect(saveSystem.autoSaveInterval).not.toBe(firstInterval);

      saveSystem.stopAutoSave();
    });
  });

  describe('edge cases', () => {
    test('should handle saving all 3 slots', () => {
      saveSystem.createOrOverwriteSlot(0, { saveName: 'Slot A' });
      saveSystem.createOrOverwriteSlot(1, { saveName: 'Slot B' });
      saveSystem.createOrOverwriteSlot(2, { saveName: 'Slot C' });

      expect(saveSystem.getSlotMeta(0).saveName).toBe('Slot A');
      expect(saveSystem.getSlotMeta(1).saveName).toBe('Slot B');
      expect(saveSystem.getSlotMeta(2).saveName).toBe('Slot C');
      expect(saveSystem.hasAnySave()).toBe(true);
    });

    test('should handle overwriting existing slot', () => {
      saveSystem.createOrOverwriteSlot(0, { saveName: 'Original' });
      saveSystem.sessionMs = 10000;
      saveSystem.createOrOverwriteSlot(0, { saveName: 'Updated' });

      const meta = saveSystem.getSlotMeta(0);
      expect(meta.saveName).toBe('Updated');
      expect(meta.totalPlayTimeMs).toBe(10000);
    });

    test('should handle save after delete and re-create', () => {
      saveSystem.createOrOverwriteSlot(0, { saveName: 'First' });
      saveSystem.deleteSlot(0);
      saveSystem.createOrOverwriteSlot(0, { saveName: 'Second' });

      const meta = saveSystem.getSlotMeta(0);
      expect(meta.saveName).toBe('Second');
      expect(meta.totalPlayTimeMs).toBe(0); // Fresh slot
    });
  });
});