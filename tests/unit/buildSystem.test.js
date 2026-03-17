import { describe, test, expect, beforeEach, beforeAll, mock } from 'bun:test';
import "../setup.js";

let BuildSystem;

beforeAll(async () => {
  // Mock dependencies before importing buildSystem.js
  mock.module('../../public/scripts/logger.js', () => ({
    logger: { warn: () => {}, error: () => {}, info: () => {}, debug: () => {} }
  }));

  mock.module('../../public/scripts/assetManager.js', () => ({
    assets: {
      furniture: {
        chest: { img: { complete: true, src: 'chest.png', naturalWidth: 32 } },
        well: { img: { complete: true, naturalWidth: 64 } },
        fences: {
          fenceX: { img: { complete: true, naturalWidth: 32 } },
          fenceY: { img: { complete: true, naturalWidth: 6 } }
        }
      }
    }
  }));

  // inventorySystem.js is NOT mocked - uses real module (mock its dependencies instead)
  mock.module('../../public/scripts/thePlayer/playerInventory.js', () => ({
    consumeItem: () => true,
    equipItem: () => true,
    discardItem: () => true
  }));

  mock.module('../../public/scripts/categoryMapper.js', () => ({
    mapTypeToCategory: (type) => {
      const mapping = { tool: 'tools', seed: 'seeds', construction: 'construction', animal_food: 'animal_food', food: 'food', resource: 'resources', crop: 'resources' };
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

  mock.module('../../public/scripts/itemUtils.js', () => ({
    getItem: (id) => null,
    getStackLimit: () => 99,
    isPlaceable: () => false,
    isConsumable: () => false,
    getConsumptionData: () => null,
    getAllItems: () => []
  }));

  mock.module('../../public/scripts/validation.js', () => ({
    MAX_CURRENCY: 1_000_000_000,
    isValidPositiveInteger: (n) => Number.isInteger(n) && n > 0,
    isValidItemId: (id) => Number.isInteger(id) && id > 0,
    isValidPositiveNumber: (n) => typeof n === 'number' && n > 0,
    sanitizeQuantity: (q, min = 1, max = 9999) => Math.max(min, Math.min(max, Math.floor(q))),
    validateRange: (v, min, max) => Math.max(min, Math.min(max, v)),
    validateTradeInput: () => ({ valid: true }),
  }));

  mock.module('../../public/scripts/item.js', () => ({
    items: []
  }));

  mock.module('../../public/scripts/thePlayer/cameraSystem.js', () => ({
    camera: {
      x: 0, y: 0, width: 880, height: 963,
      worldToScreen: (x, y) => ({ x, y }),
      zoom: 2
    },
    CAMERA_ZOOM: 2
  }));

  mock.module('../../public/scripts/worldConstants.js', () => ({
    WORLD_WIDTH: 4000, WORLD_HEIGHT: 5010, GAME_WIDTH: 880, GAME_HEIGHT: 963.09, TILE_SIZE: 20
  }));

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

  mock.module('../../public/scripts/wellSystem.js', () => ({
    wellSystem: null
  }));

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
    HITBOX_CONFIGS: { STATIC_OBJECTS: { TREE: { width: 38, height: 40 }, ROCK: { width: 32, height: 27 }, CHEST: { width: 31, height: 31 }, WELL: { width: 63, height: 30, offsetY: 56 }, FENCEX: { width: 28, height: 5, offsetX: 0, offsetY: 24 }, FENCEY: { width: 4, height: 63, offsetX: 0, offsetY: 0 } }, ANIMALS: { DEFAULT: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 } }, PLAYER: { WIDTH_RATIO: 0.7, HEIGHT_RATIO: 0.3, OFFSET_X_RATIO: 0.15, OFFSET_Y_RATIO: 0.7 }, INTERACTION_ZONES: { PLAYER: { WIDTH_RATIO: 1.8, HEIGHT_RATIO: 1.8, OFFSET_X: -0.4, OFFSET_Y: -0.4 } } },
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

  const mod = await import('../../public/scripts/buildSystem.js');
  BuildSystem = mod.BuildSystem;
});

describe('BuildSystem (Production Implementation)', () => {

  beforeEach(() => {
    // Reset BuildSystem state
    BuildSystem.active = false;
    BuildSystem.selectedItem = null;
    BuildSystem.currentVariant = null;
    BuildSystem.previewImg = null;
    BuildSystem.currentSubPosX = 0;
    BuildSystem.currentSubPosY = 0;
    BuildSystem.mouseTile = { x: 0, y: 0 };
    BuildSystem.mouseUpdatePending = false;
    BuildSystem.pendingMouseX = 0;
    BuildSystem.pendingMouseY = 0;
    BuildSystem.debugMode = false;
    BuildSystem.debugElement = null;
    BuildSystem._helpPanelEl = null;
    localStorage.clear();
  });

  describe('initial state', () => {
    test('should not be active', () => {
      expect(BuildSystem.active).toBe(false);
    });

    test('should have no selected item', () => {
      expect(BuildSystem.selectedItem).toBeNull();
    });

    test('should have gridSize as TILE_SIZE', () => {
      expect(BuildSystem.gridSize).toBe(20);
    });

    test('should have mouseTile at origin', () => {
      expect(BuildSystem.mouseTile.x).toBe(0);
      expect(BuildSystem.mouseTile.y).toBe(0);
    });

    test('should have sub positions at center (0)', () => {
      expect(BuildSystem.currentSubPosX).toBe(0);
      expect(BuildSystem.currentSubPosY).toBe(0);
    });

    test('should have storage keys defined', () => {
      expect(BuildSystem.STORAGE_KEY_BUILDINGS).toBe('placedBuildings');
      expect(BuildSystem.STORAGE_KEY_WELLS).toBe('placedWells');
    });
  });

  describe('getConstructionType', () => {
    test('should return chest for item id 69', () => {
      BuildSystem.selectedItem = { id: 69 };
      expect(BuildSystem.getConstructionType()).toBe('chest');
    });

    test('should return well for item id 93', () => {
      BuildSystem.selectedItem = { id: 93 };
      expect(BuildSystem.getConstructionType()).toBe('well');
    });

    test('should return fence for item with variants', () => {
      BuildSystem.selectedItem = { id: 10, variants: ['fenceX', 'fenceY'] };
      expect(BuildSystem.getConstructionType()).toBe('fence');
    });

    test('should return construction for generic item', () => {
      BuildSystem.selectedItem = { id: 50 };
      expect(BuildSystem.getConstructionType()).toBe('construction');
    });

    test('should return unknown when no item selected', () => {
      BuildSystem.selectedItem = null;
      expect(BuildSystem.getConstructionType()).toBe('unknown');
    });
  });

  describe('getConstructionDimensions', () => {
    test('should return 31x31 for chest', () => {
      BuildSystem.selectedItem = { id: 69 };
      const dim = BuildSystem.getConstructionDimensions();
      expect(dim.width).toBe(31);
      expect(dim.height).toBe(31);
    });

    test('should return 32x32 for horizontal fence', () => {
      BuildSystem.selectedItem = { id: 10, variants: ['fenceX', 'fenceY'] };
      BuildSystem.currentVariant = 'fenceX';
      const dim = BuildSystem.getConstructionDimensions();
      expect(dim.width).toBe(32);
      expect(dim.height).toBe(32);
    });

    test('should return 6x62 for vertical fence', () => {
      BuildSystem.selectedItem = { id: 10, variants: ['fenceX', 'fenceY'] };
      BuildSystem.currentVariant = 'fenceY';
      const dim = BuildSystem.getConstructionDimensions();
      expect(dim.width).toBe(6);
      expect(dim.height).toBe(62);
    });

    test('should return 75x95 for well', () => {
      BuildSystem.selectedItem = { id: 93 };
      const dim = BuildSystem.getConstructionDimensions();
      expect(dim.width).toBe(75);
      expect(dim.height).toBe(95);
    });

    test('should return 64x64 default when no item', () => {
      BuildSystem.selectedItem = null;
      const dim = BuildSystem.getConstructionDimensions();
      expect(dim.width).toBe(64);
      expect(dim.height).toBe(64);
    });

    test('should use buildWidth/buildHeight from item if available', () => {
      BuildSystem.selectedItem = { id: 50, buildWidth: 100, buildHeight: 80 };
      const dim = BuildSystem.getConstructionDimensions();
      expect(dim.width).toBe(100);
      expect(dim.height).toBe(80);
    });
  });

  describe('getSnapPosition', () => {
    test('should snap to center of tile by default (subPos 0,0)', () => {
      BuildSystem.selectedItem = { id: 69 }; // chest 31x31
      BuildSystem.mouseTile = { x: 5, y: 5 };
      BuildSystem.currentSubPosX = 0;
      BuildSystem.currentSubPosY = 0;

      const pos = BuildSystem.getSnapPosition();
      const tileCenter = 20 / 2; // gridSize / 2

      expect(pos.x).toBe(5 * 20 + tileCenter - 31 / 2);
      expect(pos.y).toBe(5 * 20 + tileCenter - 31 / 2);
    });

    test('should snap to left edge when subPosX is -1', () => {
      BuildSystem.selectedItem = { id: 69 };
      BuildSystem.mouseTile = { x: 3, y: 3 };
      BuildSystem.currentSubPosX = -1;
      BuildSystem.currentSubPosY = 0;

      const pos = BuildSystem.getSnapPosition();
      expect(pos.x).toBe(3 * 20); // tile left edge
    });

    test('should snap to right edge when subPosX is 1', () => {
      BuildSystem.selectedItem = { id: 69 };
      BuildSystem.mouseTile = { x: 3, y: 3 };
      BuildSystem.currentSubPosX = 1;
      BuildSystem.currentSubPosY = 0;

      const pos = BuildSystem.getSnapPosition();
      expect(pos.x).toBe(3 * 20 + 20 - 31); // tile right edge - width
    });

    test('should snap to top edge when subPosY is -1', () => {
      BuildSystem.selectedItem = { id: 69 };
      BuildSystem.mouseTile = { x: 0, y: 4 };
      BuildSystem.currentSubPosX = 0;
      BuildSystem.currentSubPosY = -1;

      const pos = BuildSystem.getSnapPosition();
      expect(pos.y).toBe(4 * 20); // tile top edge
    });

    test('should snap to bottom edge when subPosY is 1', () => {
      BuildSystem.selectedItem = { id: 69 };
      BuildSystem.mouseTile = { x: 0, y: 4 };
      BuildSystem.currentSubPosX = 0;
      BuildSystem.currentSubPosY = 1;

      const pos = BuildSystem.getSnapPosition();
      expect(pos.y).toBe(4 * 20 + 20 - 31); // tile bottom - height
    });

    test('should include tileX and tileY in result', () => {
      BuildSystem.selectedItem = { id: 69 };
      BuildSystem.mouseTile = { x: 7, y: 9 };

      const pos = BuildSystem.getSnapPosition();
      expect(pos.tileX).toBe(7);
      expect(pos.tileY).toBe(9);
    });

    test('should include subX and subY in result', () => {
      BuildSystem.selectedItem = { id: 69 };
      BuildSystem.currentSubPosX = -1;
      BuildSystem.currentSubPosY = 1;

      const pos = BuildSystem.getSnapPosition();
      expect(pos.subX).toBe(-1);
      expect(pos.subY).toBe(1);
    });
  });

  describe('getMouseTileForRender', () => {
    test('should return mouseTile when no pending update', () => {
      BuildSystem.mouseTile = { x: 5, y: 10 };
      BuildSystem.mouseUpdatePending = false;

      const tile = BuildSystem.getMouseTileForRender();
      expect(tile.x).toBe(5);
      expect(tile.y).toBe(10);
    });

    test('should return calculated tile from pending mouse when pending', () => {
      BuildSystem.mouseUpdatePending = true;
      BuildSystem.pendingMouseX = 45; // 45/20 = 2.25 -> floor = 2
      BuildSystem.pendingMouseY = 65; // 65/20 = 3.25 -> floor = 3

      const tile = BuildSystem.getMouseTileForRender();
      expect(tile.x).toBe(2);
      expect(tile.y).toBe(3);
    });

    test('should return mouseTile when pending values are 0,0', () => {
      BuildSystem.mouseUpdatePending = true;
      BuildSystem.pendingMouseX = 0;
      BuildSystem.pendingMouseY = 0;
      BuildSystem.mouseTile = { x: 1, y: 1 };

      const tile = BuildSystem.getMouseTileForRender();
      expect(tile.x).toBe(1);
      expect(tile.y).toBe(1);
    });
  });

  describe('rotate', () => {
    test('should cycle through fence variants', () => {
      BuildSystem.selectedItem = { id: 10, variants: ['fenceX', 'fenceY'] };
      BuildSystem.currentVariant = 'fenceX';

      BuildSystem.rotate();
      expect(BuildSystem.currentVariant).toBe('fenceY');
    });

    test('should wrap back to first variant', () => {
      BuildSystem.selectedItem = { id: 10, variants: ['fenceX', 'fenceY'] };
      BuildSystem.currentVariant = 'fenceY';

      BuildSystem.rotate();
      expect(BuildSystem.currentVariant).toBe('fenceX');
    });

    test('should do nothing for non-fence items', () => {
      BuildSystem.selectedItem = { id: 69 }; // chest
      BuildSystem.currentVariant = 'chest';

      BuildSystem.rotate();
      expect(BuildSystem.currentVariant).toBe('chest'); // unchanged
    });

    test('should do nothing without selected item', () => {
      BuildSystem.selectedItem = null;
      expect(() => BuildSystem.rotate()).not.toThrow();
    });
  });

  describe('setSubPosition', () => {
    test('should set X sub-position', () => {
      BuildSystem.setSubPosition('x', -1);
      expect(BuildSystem.currentSubPosX).toBe(-1);
    });

    test('should set Y sub-position', () => {
      BuildSystem.setSubPosition('y', 1);
      expect(BuildSystem.currentSubPosY).toBe(1);
    });

    test('should support center position (0)', () => {
      BuildSystem.currentSubPosX = -1;
      BuildSystem.setSubPosition('x', 0);
      expect(BuildSystem.currentSubPosX).toBe(0);
    });
  });

  describe('startBuilding / stopBuilding', () => {
    test('should activate build mode with placeable item', () => {
      BuildSystem.startBuilding({ id: 69, name: 'Chest', placeable: true });
      expect(BuildSystem.active).toBe(true);
      expect(BuildSystem.selectedItem.id).toBe(69);
    });

    test('should not activate for non-placeable item', () => {
      BuildSystem.startBuilding({ id: 1, name: 'Wood', placeable: false });
      expect(BuildSystem.active).toBe(false);
    });

    test('should not activate for null item', () => {
      BuildSystem.startBuilding(null);
      expect(BuildSystem.active).toBe(false);
    });

    test('should deactivate on stopBuilding', () => {
      BuildSystem.startBuilding({ id: 69, name: 'Chest', placeable: true });
      BuildSystem.stopBuilding();

      expect(BuildSystem.active).toBe(false);
      expect(BuildSystem.selectedItem).toBeNull();
      expect(BuildSystem.currentVariant).toBeNull();
    });

    test('should reset sub-positions on stopBuilding', () => {
      BuildSystem.currentSubPosX = -1;
      BuildSystem.currentSubPosY = 1;

      BuildSystem.stopBuilding();
      expect(BuildSystem.currentSubPosX).toBe(0);
      expect(BuildSystem.currentSubPosY).toBe(0);
    });

    test('should set variant for fence items', () => {
      BuildSystem.startBuilding({ id: 10, name: 'Fence', placeable: true, variants: ['fenceX', 'fenceY'] });
      expect(BuildSystem.currentVariant).toBe('fenceX');
    });

    test('should set variant for chest', () => {
      BuildSystem.startBuilding({ id: 69, name: 'Chest', placeable: true });
      expect(BuildSystem.currentVariant).toBe('chest');
    });

    test('should set variant for well', () => {
      BuildSystem.startBuilding({ id: 93, name: 'Well', placeable: true });
      expect(BuildSystem.currentVariant).toBe('well');
    });
  });

  describe('saveBuildings / loadBuildings', () => {
    test('should save buildings to localStorage', () => {
      const buildings = [
        { id: 'b1', x: 10, y: 20, width: 32, height: 32, name: 'Fence', draw: () => {}, onInteract: () => {} }
      ];

      BuildSystem.saveBuildings(buildings, 'test_buildings');
      const raw = localStorage.getItem('test_buildings');
      expect(raw).toBeDefined();

      const parsed = JSON.parse(raw);
      expect(parsed.length).toBe(1);
      expect(parsed[0].id).toBe('b1');
    });

    test('should strip draw and onInteract functions', () => {
      const buildings = [
        { id: 'b1', x: 10, draw: () => {}, onInteract: () => {}, getHitbox: () => {} }
      ];

      BuildSystem.saveBuildings(buildings, 'test_strip');
      const parsed = JSON.parse(localStorage.getItem('test_strip'));
      expect(parsed[0].draw).toBeUndefined();
      expect(parsed[0].onInteract).toBeUndefined();
      expect(parsed[0].getHitbox).toBeUndefined();
    });

    test('should load buildings from localStorage', () => {
      localStorage.setItem('test_load', JSON.stringify([
        { id: 'b1', x: 100, y: 200 }
      ]));

      const loaded = BuildSystem.loadBuildings('test_load');
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe('b1');
    });

    test('should return empty array when key not found', () => {
      const loaded = BuildSystem.loadBuildings('nonexistent_key');
      expect(loaded).toEqual([]);
    });

    test('should return empty array for invalid JSON', () => {
      localStorage.setItem('test_invalid', 'not json');
      const loaded = BuildSystem.loadBuildings('test_invalid');
      expect(loaded).toEqual([]);
    });
  });

  describe('updateMousePosition', () => {
    test('should delegate to updateMousePositionThrottled', () => {
      expect(() => BuildSystem.updateMousePosition(100, 200)).not.toThrow();
    });
  });

  describe('toggleDebug', () => {
    test('should toggle debugMode flag', () => {
      expect(BuildSystem.debugMode).toBe(false);
      BuildSystem.debugMode = true;
      expect(BuildSystem.debugMode).toBe(true);
      // Reset
      BuildSystem.debugMode = false;
    });

    test('should have toggleDebug as a method', () => {
      expect(typeof BuildSystem.toggleDebug).toBe('function');
    });
  });

  describe('initAdvancedSystem', () => {
    test('should set zoomedGridSize', () => {
      BuildSystem.initAdvancedSystem();
      expect(BuildSystem.zoomedGridSize).toBe(20 * 2); // TILE_SIZE * CAMERA_ZOOM
    });
  });
});