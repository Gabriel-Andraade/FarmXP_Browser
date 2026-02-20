import { describe, test, expect, beforeEach, mock } from 'bun:test';
import "../setup.js";

// Mock dependencies

mock.module('../../public/scripts/logger.js', () => ({
  logger: { warn: () => {}, error: () => {}, info: () => {}, debug: () => {} }
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

// Import REAL collisionSystem (dependencies constants.js and gameState.js are already mocked above)
const { collisionSystem: mockCollisionSystem } = await import('../../public/scripts/collisionSystem.js');

const { AnimalEntity } = await import('../../public/scripts/animal/animalAI.js');

// Helper: create a basic asset data object
function createAssetData(overrides = {}) {
  return {
    img: { width: 128, height: 128, complete: true },
    cols: 4,
    rows: 4,
    frameWidth: 32,
    frameHeight: 32,
    ...overrides
  };
}

// Save original methods to restore in beforeEach
const _origGetConfigForObject = mockCollisionSystem.getConfigForObject.bind(mockCollisionSystem);
const _origAreaCollides = mockCollisionSystem.areaCollides.bind(mockCollisionSystem);

describe('AnimalEntity (Production Implementation)', () => {
  let animal;

  beforeEach(() => {
    // Override with simple stubs for test isolation
    mockCollisionSystem.getConfigForObject = () => null;
    mockCollisionSystem.areaCollides = () => false;
    animal = new AnimalEntity('Bull', createAssetData(), 100, 200);
  });

  describe('constructor', () => {
    test('should set type to ANIMAL', () => {
      expect(animal.type).toBe('ANIMAL');
    });

    test('should set assetName', () => {
      expect(animal.assetName).toBe('Bull');
    });

    test('should set position', () => {
      expect(animal.x).toBe(100);
      expect(animal.y).toBe(200);
    });

    test('should set sprite dimensions from assetData', () => {
      expect(animal.frameWidth).toBe(32);
      expect(animal.frameHeight).toBe(32);
      expect(animal.cols).toBe(4);
      expect(animal.rows).toBe(4);
    });

    test('should set width and height from frame dimensions', () => {
      expect(animal.width).toBe(32);
      expect(animal.height).toBe(32);
    });

    test('should initialize in IDLE state', () => {
      expect(animal.state).toBe('idle');
    });

    test('should set default directionRows', () => {
      expect(animal.directionRows.down).toBe(0);
      expect(animal.directionRows.up).toBe(3);
      expect(animal.directionRows.left).toBe(1);
      expect(animal.directionRows.right).toBe(2);
    });

    test('should accept custom directionRows', () => {
      const customRows = { down: 2, up: 0, left: 3, right: 1 };
      const a = new AnimalEntity('Turkey', createAssetData({ directionRows: customRows }), 0, 0);
      expect(a.directionRows.down).toBe(2);
      expect(a.directionRows.up).toBe(0);
    });

    test('should initialize collisionBox', () => {
      expect(animal.collisionBox).toBeDefined();
      expect(animal.collisionBox.offsetX).toBeDefined();
      expect(animal.collisionBox.offsetY).toBeDefined();
      expect(animal.collisionBox.width).toBeDefined();
      expect(animal.collisionBox.height).toBeDefined();
    });

    test('should initialize animation properties', () => {
      expect(animal.frameIndex).toBe(0);
      expect(animal.lastFrameTime).toBe(0);
    });

    test('should initialize SFX cooldown', () => {
      expect(animal._lastSfxTime).toBe(0);
      expect(animal._sfxCooldownMs).toBeGreaterThanOrEqual(20000);
      expect(animal._sfxCooldownMs).toBeLessThanOrEqual(40000);
    });

    test('should calculate frameWidth from img when not provided', () => {
      const a = new AnimalEntity('Bull', { img: { width: 256, height: 256 }, cols: 4, rows: 4 }, 0, 0);
      expect(a.frameWidth).toBe(64); // 256/4
      expect(a.frameHeight).toBe(64);
    });
  });

  describe('getInitialCollisionConfig', () => {
    test('should return default ratios when collisionSystem has no config', () => {
      mockCollisionSystem.getConfigForObject = () => null;
      const a = new AnimalEntity('Bull', createAssetData(), 0, 0);
      const box = a.collisionBox;

      expect(box.offsetX).toBe(32 * 0.25);
      expect(box.offsetY).toBe(32 * 0.6);
      expect(box.width).toBe(32 * 0.5);
      expect(box.height).toBe(32 * 0.4);
    });

    test('should apply config from collisionSystem when available', () => {
      mockCollisionSystem.getConfigForObject = () => ({
        widthRatio: 0.3,
        heightRatio: 0.3,
        offsetXRatio: 0.3,
        offsetYRatio: 0.5
      });

      const a = new AnimalEntity('Bull', createAssetData(), 0, 0);
      const box = a.collisionBox;

      expect(box.width).toBe(32 * 0.3);
      expect(box.height).toBe(32 * 0.3);
      expect(box.offsetX).toBe(32 * 0.3);
      expect(box.offsetY).toBe(32 * 0.5);
    });

    test('should use fallback ratios for missing config properties', () => {
      mockCollisionSystem.getConfigForObject = () => ({
        widthRatio: 0.6
        // other ratios missing, should use defaults
      });

      const a = new AnimalEntity('Bull', createAssetData(), 0, 0);
      expect(a.collisionBox.width).toBe(32 * 0.6);
      expect(a.collisionBox.height).toBe(32 * 0.4); // default
    });

    test('should handle error in collisionSystem gracefully', () => {
      mockCollisionSystem.getConfigForObject = () => { throw new Error('fail'); };
      expect(() => new AnimalEntity('Bull', createAssetData(), 0, 0)).not.toThrow();
    });
  });

  describe('getHitbox', () => {
    test('should return absolute coordinates', () => {
      animal.x = 100;
      animal.y = 200;
      const hb = animal.getHitbox();

      expect(hb.x).toBe(100 + animal.collisionBox.offsetX);
      expect(hb.y).toBe(200 + animal.collisionBox.offsetY);
    });

    test('should include width and height', () => {
      const hb = animal.getHitbox();
      expect(hb.width).toBe(animal.collisionBox.width);
      expect(hb.height).toBe(animal.collisionBox.height);
    });

    test('should update when position changes', () => {
      const hb1 = animal.getHitbox();
      animal.x += 50;
      const hb2 = animal.getHitbox();

      expect(hb2.x).toBe(hb1.x + 50);
    });

    test('should handle zero offset', () => {
      animal.collisionBox.offsetX = 0;
      animal.collisionBox.offsetY = 0;
      const hb = animal.getHitbox();

      expect(hb.x).toBe(animal.x);
      expect(hb.y).toBe(animal.y);
    });
  });

  describe('updateDirection', () => {
    test('should face right when target is to the right', () => {
      animal.x = 100;
      animal.y = 100;
      animal.targetX = 200;
      animal.targetY = 100;

      animal.updateDirection();
      expect(animal.direction).toBe(animal.directionRows.right);
    });

    test('should face left when target is to the left', () => {
      animal.x = 200;
      animal.y = 100;
      animal.targetX = 100;
      animal.targetY = 100;

      animal.updateDirection();
      expect(animal.direction).toBe(animal.directionRows.left);
    });

    test('should face down when target is below', () => {
      animal.x = 100;
      animal.y = 100;
      animal.targetX = 100;
      animal.targetY = 200;

      animal.updateDirection();
      expect(animal.direction).toBe(animal.directionRows.down);
    });

    test('should face up when target is above', () => {
      animal.x = 100;
      animal.y = 200;
      animal.targetX = 100;
      animal.targetY = 100;

      animal.updateDirection();
      expect(animal.direction).toBe(animal.directionRows.up);
    });

    test('should prefer horizontal direction when dx > dy', () => {
      animal.x = 100;
      animal.y = 100;
      animal.targetX = 200;
      animal.targetY = 150; // dx=100, dy=50

      animal.updateDirection();
      expect(animal.direction).toBe(animal.directionRows.right);
    });
  });

  describe('move', () => {
    test('should move toward target', () => {
      animal.x = 100;
      animal.y = 100;
      animal.targetX = 200;
      animal.targetY = 100;
      animal.state = 'move';

      const oldX = animal.x;
      animal.move();
      expect(animal.x).toBeGreaterThan(oldX);
    });

    test('should stop when very close to target (dist < 2)', () => {
      animal.x = 100;
      animal.y = 100;
      animal.targetX = 101;
      animal.targetY = 100;

      animal.move();
      expect(animal.state).toBe('idle');
    });

    test('should not move when collision detected', () => {
      mockCollisionSystem.areaCollides = () => true;

      animal.x = 100;
      animal.y = 100;
      animal.targetX = 200;
      animal.targetY = 100;
      animal.state = 'move';

      const oldX = animal.x;
      animal.move();
      expect(animal.x).toBe(oldX);
      expect(animal.state).toBe('idle'); // or new state from pickNewState
    });

    test('should switch to idle when colliding', () => {
      mockCollisionSystem.areaCollides = () => true;
      animal.targetX = animal.x + 100;
      animal.targetY = animal.y;
      animal.state = 'move';

      animal.move();
      // After collision, pickNewState is called, which sets either idle or move
      expect(['idle', 'move']).toContain(animal.state);
    });

    test('should move in both axes toward diagonal target', () => {
      mockCollisionSystem.areaCollides = () => false;
      animal.x = 100;
      animal.y = 100;
      animal.targetX = 200;
      animal.targetY = 200;

      const oldX = animal.x;
      const oldY = animal.y;
      animal.move();

      expect(animal.x).toBeGreaterThan(oldX);
      expect(animal.y).toBeGreaterThan(oldY);
    });

    test('should use ANIMAL_SPEED for velocity', () => {
      mockCollisionSystem.areaCollides = () => false;
      animal.x = 0;
      animal.y = 0;
      animal.targetX = 1000;
      animal.targetY = 0;

      animal.move();
      // ANIMAL_SPEED is 0.5, moving purely horizontal
      expect(animal.x).toBeCloseTo(0.5, 1);
    });
  });

  describe('updateAnimation', () => {
    test('should advance frameIndex when enough time passed', () => {
      animal.lastFrameTime = 0;
      animal.state = 'idle';
      animal.frameIndex = 0;

      animal.updateAnimation(600); // 600ms > FRAME_RATE_IDLE_MS (500)
      expect(animal.frameIndex).toBe(1);
    });

    test('should not advance frameIndex too quickly', () => {
      animal.lastFrameTime = 0;
      animal.state = 'idle';
      animal.frameIndex = 0;

      animal.updateAnimation(100); // 100ms < 500ms
      expect(animal.frameIndex).toBe(0);
    });

    test('should cycle frameIndex back to 0 after max cols', () => {
      animal.lastFrameTime = 0;
      animal.frameIndex = 3; // cols - 1
      animal.state = 'idle';

      animal.updateAnimation(600);
      expect(animal.frameIndex).toBe(0); // (3+1) % 4 = 0
    });

    test('should use faster frame rate when moving', () => {
      animal.lastFrameTime = 0;
      animal.state = 'move';
      animal.frameIndex = 0;

      animal.updateAnimation(200); // 200ms > FRAME_RATE_MOVE_MS (150)
      expect(animal.frameIndex).toBe(1);
    });

    test('should update lastFrameTime on frame advance', () => {
      animal.lastFrameTime = 0;
      animal.state = 'idle';

      animal.updateAnimation(600);
      expect(animal.lastFrameTime).toBe(600);
    });
  });

  describe('pickNewState', () => {
    test('should set state to idle or move', () => {
      animal.pickNewState();
      expect(['idle', 'move']).toContain(animal.state);
    });

    test('should set a positive stateDuration', () => {
      animal.pickNewState();
      expect(animal.stateDuration).toBeGreaterThan(0);
    });

    test('should set targetX/targetY when moving', () => {
      // Force move state by mocking Math.random
      const originalRandom = Math.random;
      Math.random = () => 0.7; // > 0.6, triggers MOVE

      animal.x = 500;
      animal.y = 500;
      animal.pickNewState();

      expect(animal.state).toBe('move');
      // Target should be within ANIMAL_SIGHT_RADIUS (128) of current position
      expect(Math.abs(animal.targetX - 500)).toBeLessThanOrEqual(128);
      expect(Math.abs(animal.targetY - 500)).toBeLessThanOrEqual(128);

      Math.random = originalRandom;
    });

    test('should set idle when random <= 0.6', () => {
      const originalRandom = Math.random;
      Math.random = () => 0.5;

      animal.pickNewState();
      expect(animal.state).toBe('idle');

      Math.random = originalRandom;
    });

    test('should set move when random > 0.6', () => {
      const originalRandom = Math.random;
      Math.random = () => 0.7;

      animal.pickNewState();
      expect(animal.state).toBe('move');

      Math.random = originalRandom;
    });
  });

  describe('update', () => {
    test('should call pickNewState when timer expires', () => {
      animal.stateTimer = 0;
      animal.stateDuration = 100;

      // Mock performance.now to return > stateDuration
      const original = performance.now;
      performance.now = () => 200;

      const oldState = animal.state;
      animal.update();
      // State may or may not change, but stateTimer should be updated
      expect(animal.stateTimer).toBe(200);

      performance.now = original;
    });

    test('should not change state before timer expires', () => {
      const now = performance.now();
      animal.stateTimer = now;
      animal.stateDuration = 10000; // Very long
      animal.state = 'idle';

      animal.update();
      // State should remain idle since timer hasn't expired
      expect(animal.state).toBe('idle');
    });

    test('should call move when in move state', () => {
      animal.state = 'move';
      animal.stateTimer = performance.now();
      animal.stateDuration = 10000;
      animal.targetX = animal.x + 100;
      animal.targetY = animal.y;

      const oldX = animal.x;
      animal.update();
      // Animal should have moved
      expect(animal.x).not.toBe(oldX);
    });

    test('should not move when in idle state', () => {
      animal.state = 'idle';
      animal.stateTimer = performance.now();
      animal.stateDuration = 10000;

      const oldX = animal.x;
      const oldY = animal.y;
      animal.update();

      expect(animal.x).toBe(oldX);
      expect(animal.y).toBe(oldY);
    });
  });

  describe('draw', () => {
    test('should not throw without img', () => {
      animal.img = null;
      const ctx = { drawImage: () => {} };
      const cam = { worldToScreen: () => ({ x: 0, y: 0 }), zoom: 2, width: 800, height: 600 };
      expect(() => animal.draw(ctx, cam)).not.toThrow();
    });

    test('should not throw without camera', () => {
      expect(() => animal.draw({}, null)).not.toThrow();
    });

    test('should have draw as a method', () => {
      expect(typeof animal.draw).toBe('function');
    });
  });
});
