import { describe, test, expect, beforeEach, beforeAll, mock } from 'bun:test';
import "../setup.js";

let keys, getKeybinds, setKeybinds, isMobile, getMovementDirection;
let TouchMoveSystem, PlayerInteractionSystem, PLAYER_INTERACTION_CONFIG, destroyControls;

beforeAll(async () => {
  // Add navigator stub for isMobile detection
  globalThis.navigator ??= {};
  globalThis.navigator.maxTouchPoints ??= 0;
  globalThis.navigator.msMaxTouchPoints ??= 0;
  globalThis.navigator.userAgent ??= 'TestAgent';
  globalThis.window.innerWidth ??= 1920;

  // Mock dependencies before importing control.js
  mock.module('../../public/scripts/thePlayer/cameraSystem.js', () => ({
    camera: {
      x: 0, y: 0, width: 880, height: 963,
      worldToScreen: (x, y) => ({ x, y }),
      screenToWorld: (x, y) => ({ x, y }),
      zoom: 2
    }
  }));

  // collisionSystem.js is NOT mocked - uses real module (dependencies constants.js and gameState.js are mocked below)

  // theWorld.js is NOT mocked - mock its dependencies instead (to avoid leaking to theWorld.test.js)
  mock.module('../../public/scripts/errorHandler.js', () => ({
    handleError: () => {},
    handleWarn: () => {},
  }));
  mock.module('../../public/scripts/assetManager.js', () => ({
    assets: {},
  }));
  mock.module('../../public/scripts/generatorSeeds.js', () => ({
    worldGenerator: { seed: 0, next: () => 0, generateWorld: () => ({ trees: [], rocks: [], thickets: [], houses: [] }) },
    WORLD_GENERATOR_CONFIG: {},
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
  mock.module('../../public/scripts/optimizationConstants.js', () => ({
    ZOOMED_TILE_SIZE_INT: 40,
    ZOOMED_TILE_SIZE: 40,
    INV_ZOOMED_TILE_SIZE: 1 / 40,
    VIEW_COLS: 23,
    VIEW_ROWS: 25,
    VIEW_COLS_PLUS1: 24,
    VIEW_ROWS_PLUS1: 26,
    BUFFER_COLS: 2,
    BUFFER_ROWS: 2,
    CAMERA_ZOOM: 2,
    WORLD_COLS: 200,
    WORLD_ROWS: 250,
    perfLog: () => {},
    worldToScreenFast: (x, y, camX, camY) => ({ x: (x - camX) * 2, y: (y - camY) * 2 }),
    updateDerivedConstants: () => {},
  }));

  const BuildSystemMock = {
    active: false,
    placeObject: () => {},
    startBuilding: () => {},
    stopBuilding: () => {},
    updateMousePosition: () => {},
    rotate: () => {},
    setSubPosition: () => {}
  };
  mock.module('../../public/scripts/buildSystem.js', () => ({
    BuildSystem: BuildSystemMock,
    buildSystem: BuildSystemMock,
    default: BuildSystemMock,
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
    HITBOX_CONFIGS: { STATIC_OBJECTS: { TREE: { width: 38, height: 40 }, ROCK: { width: 32, height: 27 } }, ANIMALS: { DEFAULT: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 } }, PLAYER: { WIDTH_RATIO: 0.7, HEIGHT_RATIO: 0.3, OFFSET_X_RATIO: 0.15, OFFSET_Y_RATIO: 0.7 }, INTERACTION_ZONES: { PLAYER: { WIDTH_RATIO: 1.8, HEIGHT_RATIO: 1.8, OFFSET_X: -0.4, OFFSET_Y: -0.4 } } },
    MOBILE: { JOYSTICK_MAX_DISTANCE: 40, JOYSTICK_THRESHOLD: 10, SCREEN_WIDTH_THRESHOLD: 768 },
    CAMERA: { CULLING_BUFFER: 200 },
    UI: { FONT_SIZES: { KEY_PROMPT: 14, HEALTH_BAR_TEXT: 10 } },
  }));

  mock.module('../../public/scripts/keybindDefaults.js', () => ({
    CONTROLS_STORAGE_KEY: 'farmxp_controls_test',
    DEFAULT_KEYBINDS: {
      moveUp: ['KeyW', 'ArrowUp'],
      moveDown: ['KeyS', 'ArrowDown'],
      moveLeft: ['KeyA', 'ArrowLeft'],
      moveRight: ['KeyD', 'ArrowRight'],
      interact: ['KeyE'],
      inventory: ['KeyI'],
      merchants: ['KeyU'],
      config: ['KeyO'],
      help: ['KeyH']
    }
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

  const mod = await import('../../public/scripts/thePlayer/control.js');
  ({
    keys, getKeybinds, setKeybinds, isMobile, getMovementDirection,
    TouchMoveSystem, PlayerInteractionSystem, PLAYER_INTERACTION_CONFIG,
    destroyControls
  } = mod);
});

describe('Control System (Production Implementation)', () => {

  describe('keys object', () => {
    test('should have movement keys', () => {
      expect(keys).toHaveProperty('ArrowLeft');
      expect(keys).toHaveProperty('ArrowRight');
      expect(keys).toHaveProperty('ArrowUp');
      expect(keys).toHaveProperty('ArrowDown');
    });

    test('should have WASD keys', () => {
      expect(keys).toHaveProperty('KeyA');
      expect(keys).toHaveProperty('KeyW');
      expect(keys).toHaveProperty('KeyS');
      expect(keys).toHaveProperty('KeyD');
    });

    test('should have action keys', () => {
      expect(keys).toHaveProperty('KeyE');
      expect(keys).toHaveProperty('Space');
    });

    test('should initialize all keys as false', () => {
      // Reset keys first
      Object.keys(keys).forEach(k => { keys[k] = false; });

      Object.values(keys).forEach(value => {
        expect(value).toBe(false);
      });
    });
  });

  describe('getKeybinds', () => {
    test('should return an object with keybind actions', () => {
      const binds = getKeybinds();
      expect(binds).toHaveProperty('moveUp');
      expect(binds).toHaveProperty('moveDown');
      expect(binds).toHaveProperty('moveLeft');
      expect(binds).toHaveProperty('moveRight');
      expect(binds).toHaveProperty('interact');
    });

    test('should return arrays of key codes', () => {
      const binds = getKeybinds();
      expect(Array.isArray(binds.moveUp)).toBe(true);
      expect(binds.moveUp.length).toBeGreaterThan(0);
    });

    test('should return a deep copy (not reference)', () => {
      const binds1 = getKeybinds();
      const binds2 = getKeybinds();
      expect(binds1).not.toBe(binds2);
      expect(binds1.moveUp).not.toBe(binds2.moveUp);
    });

    test('should contain default keybinds', () => {
      const binds = getKeybinds();
      expect(binds.moveUp).toContain('KeyW');
      expect(binds.moveUp).toContain('ArrowUp');
      expect(binds.interact).toContain('KeyE');
    });
  });

  describe('setKeybinds', () => {
    test('should update keybinds', () => {
      const custom = { moveUp: ['Space'], moveDown: ['KeyX'] };
      setKeybinds(custom, { persist: false, clearState: false });

      const binds = getKeybinds();
      expect(binds.moveUp).toContain('Space');
    });

    test('should sanitize invalid input', () => {
      setKeybinds(null, { persist: false });
      const binds = getKeybinds();

      // Should fall back to defaults
      expect(binds.moveUp).toBeDefined();
      expect(binds.moveUp.length).toBeGreaterThan(0);
    });

    test('should merge with defaults for missing actions', () => {
      setKeybinds({ moveUp: ['KeyQ'] }, { persist: false });
      const binds = getKeybinds();

      expect(binds.moveUp).toContain('KeyQ');
      // Other actions should still have defaults
      expect(binds.interact).toContain('KeyE');
    });

    test('should limit arrays to 2 entries', () => {
      setKeybinds({ moveUp: ['KeyQ', 'KeyW', 'KeyE', 'KeyR'] }, { persist: false });
      const binds = getKeybinds();
      expect(binds.moveUp.length).toBeLessThanOrEqual(2);
    });
  });

  describe('isMobile', () => {
    test('should return a boolean', () => {
      const result = isMobile();
      expect(typeof result).toBe('boolean');
    });

    test('should return false in test environment (no touch)', () => {
      expect(isMobile()).toBe(false);
    });

    test('should not throw errors', () => {
      expect(() => isMobile()).not.toThrow();
    });
  });

  describe('getMovementDirection', () => {
    beforeEach(() => {
      // Reset all keys
      Object.keys(keys).forEach(k => { keys[k] = false; });
      // Reset keybinds to defaults
      setKeybinds(null, { persist: false, clearState: true });
    });

    test('should return {x: 0, y: 0} when no keys pressed', () => {
      const dir = getMovementDirection();
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });

    test('should return correct structure', () => {
      const dir = getMovementDirection();
      expect(dir).toHaveProperty('x');
      expect(dir).toHaveProperty('y');
    });
  });

  describe('PLAYER_INTERACTION_CONFIG', () => {
    test('should have widthRatio property', () => {
      expect(PLAYER_INTERACTION_CONFIG.widthRatio).toBeDefined();
      expect(typeof PLAYER_INTERACTION_CONFIG.widthRatio).toBe('number');
    });

    test('should have heightRatio property', () => {
      expect(PLAYER_INTERACTION_CONFIG.heightRatio).toBeDefined();
      expect(typeof PLAYER_INTERACTION_CONFIG.heightRatio).toBe('number');
    });

    test('should have offsetX and offsetY', () => {
      expect(PLAYER_INTERACTION_CONFIG.offsetX).toBeDefined();
      expect(PLAYER_INTERACTION_CONFIG.offsetY).toBeDefined();
    });

    test('should have correct values from HITBOX_CONFIGS', () => {
      expect(PLAYER_INTERACTION_CONFIG.widthRatio).toBe(1.8);
      expect(PLAYER_INTERACTION_CONFIG.heightRatio).toBe(1.8);
      expect(PLAYER_INTERACTION_CONFIG.offsetX).toBe(-0.4);
      expect(PLAYER_INTERACTION_CONFIG.offsetY).toBe(-0.4);
    });
  });

  describe('TouchMoveSystem', () => {
    let touchSystem;

    beforeEach(() => {
      touchSystem = new TouchMoveSystem();
    });

    test('should initialize with no destination', () => {
      expect(touchSystem.destination).toBeNull();
      expect(touchSystem.isMovingToTouch).toBe(false);
    });

    test('should have correct move speed', () => {
      expect(touchSystem.moveSpeed).toBe(180);
    });

    test('should have correct stop distance', () => {
      expect(touchSystem.stopDistance).toBe(15);
    });

    test('should set destination', () => {
      touchSystem.mobile = true; // Override for testing
      touchSystem.setDestination(100, 200);
      expect(touchSystem.destination).toEqual({ x: 100, y: 200 });
      expect(touchSystem.isMovingToTouch).toBe(true);
    });

    test('should clear destination', () => {
      touchSystem.destination = { x: 100, y: 200 };
      touchSystem.isMovingToTouch = true;

      touchSystem.clearDestination();
      expect(touchSystem.destination).toBeNull();
      expect(touchSystem.isMovingToTouch).toBe(false);
    });

    test('isActive should return false when not mobile', () => {
      touchSystem.mobile = false;
      touchSystem.isMovingToTouch = true;
      expect(touchSystem.isActive()).toBe(false);
    });

    test('isActive should return false when not moving', () => {
      touchSystem.mobile = true;
      touchSystem.isMovingToTouch = false;
      expect(touchSystem.isActive()).toBe(false);
    });

    test('should move player toward destination', () => {
      touchSystem.mobile = true;
      touchSystem.setDestination(200, 200);

      const player = { x: 100, y: 100, isMoving: false };
      touchSystem.update(player, 0.016); // ~60fps

      expect(player.x).toBeGreaterThan(100);
      expect(player.y).toBeGreaterThan(100);
      expect(player.isMoving).toBe(true);
    });

    test('should stop moving when close to destination', () => {
      touchSystem.mobile = true;
      touchSystem.setDestination(105, 100);

      const player = { x: 100, y: 100, isMoving: true };
      touchSystem.update(player, 0.016);

      // Distance is 5 < stopDistance (15), should stop
      expect(touchSystem.isMovingToTouch).toBe(false);
      expect(player.isMoving).toBe(false);
    });

    test('should set player direction when moving', () => {
      touchSystem.mobile = true;
      touchSystem.setDestination(300, 100);

      const player = { x: 100, y: 100, direction: 'down', isMoving: false };
      touchSystem.update(player, 0.016);

      expect(player.direction).toBe('right');
    });

    test('should not update when not mobile', () => {
      touchSystem.mobile = false;
      touchSystem.setDestination(200, 200);

      const player = { x: 100, y: 100, isMoving: false };
      touchSystem.update(player, 0.016);

      expect(player.x).toBe(100);
    });
  });

  describe('destroyControls', () => {
    test('should be a callable function', () => {
      expect(typeof destroyControls).toBe('function');
    });

    test('should not throw when called', () => {
      expect(() => destroyControls()).not.toThrow();
    });
  });

  describe('PlayerInteractionSystem', () => {
    test('should be exported as a class', () => {
      expect(typeof PlayerInteractionSystem).toBe('function');
    });

    test('instance should have nearbyObjects set', () => {
      const pis = new PlayerInteractionSystem();
      expect(pis.nearbyObjects).toBeDefined();
      expect(pis.nearbyObjects instanceof Set).toBe(true);
    });

    test('instance should have touchMoveSystem', () => {
      const pis = new PlayerInteractionSystem();
      expect(pis.touchMoveSystem).toBeDefined();
      expect(pis.touchMoveSystem instanceof TouchMoveSystem).toBe(true);
    });
  });
});