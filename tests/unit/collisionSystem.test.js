import { describe, test, expect, beforeEach, mock } from 'bun:test';
import "../setup.js";

// Set up required globals for CollisionSystem
globalThis.window.DEBUG_HITBOXES = false;
globalThis.window.currentPlayer = null;

// Mock constants.js - must include ALL named exports
mock.module('../../public/scripts/constants.js', () => ({
  DEFAULTS: { SPRITE_SIZE_PX: 32 },
  DEFAULT_SPRITE_SIZE_PX: 32,
  TIMING: { UI_UPDATE_DELAY_MS: 50, UI_MIN_UPDATE_INTERVAL_MS: 30, MOUSE_UPDATE_INTERVAL_MS: 25, DEBUG_UPDATE_INTERVAL_MS: 200, NEEDS_UPDATE_INTERVAL_MS: 2000, SLEEP_ENERGY_RESTORE_INTERVAL_MS: 1000, FEEDBACK_MESSAGE_DURATION_MS: 1500, CONSUMPTION_BAR_DURATION_MS: 2000, INIT_DELAY_MS: 100, IDLE_STATE_MIN_MS: 1000, IDLE_STATE_MAX_MS: 3000, MOVE_STATE_MIN_MS: 500, MOVE_STATE_MAX_MS: 2000 },
  UI_UPDATE_DELAY_MS: 50, UI_MIN_UPDATE_INTERVAL_MS: 30, MOUSE_UPDATE_INTERVAL_MS: 25, DEBUG_UPDATE_INTERVAL_MS: 200, NEEDS_UPDATE_INTERVAL_MS: 2000, SLEEP_ENERGY_RESTORE_INTERVAL_MS: 1000, FEEDBACK_MESSAGE_DURATION_MS: 1500, CONSUMPTION_BAR_DURATION_MS: 2000, INIT_DELAY_MS: 100, IDLE_STATE_MIN_MS: 1000, IDLE_STATE_MAX_MS: 3000, MOVE_STATE_MIN_MS: 500, MOVE_STATE_MAX_MS: 2000,
  GAME_BALANCE: {
    DAMAGE: { COOLDOWN_MS: 300, TREE_HP: 6, ROCK_HP: 3, STRUCTURE_HP: 10, DEFAULT_HP: 1, AXE_DAMAGE: 2, PICKAXE_DAMAGE: 2, MACHETE_DAMAGE: 1 },
    NEEDS: { MAX_VALUE: 100, CRITICAL_THRESHOLD: 10, LOW_THRESHOLD: 20, ENERGY_CRITICAL: 15, SLEEP_ENERGY_RESTORE_AMOUNT: 10, CONSUMPTION_RATES: { moving: { hunger: 0.5, thirst: 0.7, energy: 1.0 }, breaking: { hunger: 1.0, thirst: 1.5, energy: 2.0 }, building: { hunger: 0.8, thirst: 1.0, energy: 1.5 }, collecting: { hunger: 0.3, thirst: 0.4, energy: 0.5 }, idle: { hunger: 0.05, thirst: 0.1, energy: -0.5 } }, FOOD_RESTORATION: { DRINK_THIRST: 20, DRINK_ENERGY: 5, FOOD_HUNGER: 20, FOOD_ENERGY: 10, WATER_THIRST: 30 } },
    ECONOMY: { INITIAL_MONEY: 1000, MAX_TRANSACTION_HISTORY: 100 },
  },
  SIZES: { HEALTH_BAR: { WIDTH: 50, HEIGHT: 6, OFFSET_Y: 12 }, KEY_PROMPT: { SIZE: 32, OFFSET_Y: 45, OFFSET_Y_NO_HEALTH: 20 }, CONSUMPTION_BAR: { WIDTH: 60, HEIGHT: 8, PLAYER_OFFSET_Y: 30 }, MOBILE_UI: { INTERACT_BUTTON: { WIDTH: 70, HEIGHT: 70, BOTTOM: 100, RIGHT: 30 }, JOYSTICK_AREA: { WIDTH: 150, HEIGHT: 150 } } },
  RANGES: { INTERACTION_RANGE: 70, INTERACTION_RANGE_CLOSE_MULTIPLIER: 0.7, ANIMAL_SIGHT_RADIUS: 128, TOUCH_MOVE_STOP_DISTANCE: 15 },
  MOVEMENT: { PLAYER_SPEED: 5, ANIMAL_SPEED: 0.5, TOUCH_MOVE_SPEED: 180, DIAGONAL_MULTIPLIER: 0.7071, COLLISION_STEP_PX: 4, MAX_COLLISION_ITERATIONS: 6 },
  ANIMATION: { FRAME_RATE_IDLE_MS: 500, FRAME_RATE_MOVE_MS: 150 },
  VISUAL: { HEALTH_BAR: { THRESHOLD_HIGH: 0.5, THRESHOLD_MID: 0.25, BORDER_RADIUS: 3, MIN_WIDTH: 0 }, GLOW: { RADIUS: 50, ALPHA: 0.1, PULSE_FREQUENCY: 3, PULSE_BASE: 0.8, PULSE_AMPLITUDE: 0.2 }, KEY_PROMPT: {}, GRID: {} },
  HITBOX_CONFIGS: {
    STATIC_OBJECTS: { TREE: { width: 38, height: 40, offsetY: 38, offsetX: 16 }, ROCK: { width: 32, height: 27 }, THICKET: { width: 30, height: 18, offsetY: 7, offsetX: 7 }, CHEST: { width: 31, height: 31 }, HOUSE_WALLS: { width: 20, height: 20, offsetX: 35, offsetY: -50 }, HOUSE_ROOF: { width: 200, height: 190, offsetFromRight: 265, offsetFromBottom: 200 }, WELL: { width: 63, height: 30, offsetY: 56 }, FENCEX: { width: 28, height: 5, offsetX: 0, offsetY: 24 }, FENCEY: { width: 4, height: 63, offsetX: 0, offsetY: 0 } },
    ANIMALS: { BULL: { widthRatio: 0.3, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.5 }, TURKEY: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 }, CHICK: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 }, DEFAULT: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 } },
    PLAYER: { WIDTH_RATIO: 0.7, HEIGHT_RATIO: 0.3, OFFSET_X_RATIO: 0.15, OFFSET_Y_RATIO: 0.7 },
    INTERACTION_ZONES: { PLAYER: { WIDTH_RATIO: 1.8, HEIGHT_RATIO: 1.8, OFFSET_X: -0.4, OFFSET_Y: -0.4 } },
  },
  MOBILE: { JOYSTICK_MAX_DISTANCE: 40, JOYSTICK_THRESHOLD: 10, SCREEN_WIDTH_THRESHOLD: 768 },
  CAMERA: { CULLING_BUFFER: 200 },
  UI: { FONT_SIZES: { KEY_PROMPT: 14, HEALTH_BAR_TEXT: 10 } },
}));

// Mock gameState.js - must include ALL named exports
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

// Import REAL CollisionSystem class from production code
const { CollisionSystem } = await import('../../public/scripts/collisionSystem.js');

describe('CollisionSystem (Production Implementation)', () => {
  let system;

  beforeEach(() => {
    // Use the REAL CollisionSystem implementation
    system = new CollisionSystem();
    system.clear();
  });

  describe('addHitbox', () => {
    test('should add hitbox correctly', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const hitbox = system.hitboxes.get('tree1');
      expect(hitbox).toBeDefined();
      expect(hitbox.id).toBe('tree1');
      expect(hitbox.type).toBe('TREE');
    });

    test('should store original object reference', () => {
      const treeObj = { id: 'tree1', name: 'Oak Tree', health: 100 };
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64, treeObj);

      const hitbox = system.hitboxes.get('tree1');
      expect(hitbox.object).toBe(treeObj);
      expect(hitbox.object.name).toBe('Oak Tree');
    });

    test('should allow multiple hitboxes', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('rock1', 'ROCK', 200, 200, 40, 30);

      expect(system.hitboxes.size).toBe(2);
    });

    test('should overwrite hitbox with same ID', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('tree1', 'TREE', 150, 150, 32, 64);

      expect(system.hitboxes.size).toBe(1);
    });

    test('should create interaction hitbox for interactive types', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      expect(system.interactionHitboxes.has('tree1')).toBe(true);
    });

    test('should not create interaction hitbox for non-interactive types', () => {
      system.addHitbox('wall1', 'WALL', 100, 100, 32, 64);

      expect(system.interactionHitboxes.has('wall1')).toBe(false);
    });
  });

  describe('removeHitbox', () => {
    test('should remove hitbox by ID', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      system.removeHitbox('tree1');
      expect(system.hitboxes.get('tree1')).toBeUndefined();
    });

    test('should also remove interaction hitbox', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      expect(system.interactionHitboxes.has('tree1')).toBe(true);

      system.removeHitbox('tree1');
      expect(system.interactionHitboxes.has('tree1')).toBe(false);
    });

    test('should not affect other hitboxes', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('rock1', 'ROCK', 200, 200, 40, 30);

      system.removeHitbox('tree1');

      expect(system.hitboxes.get('rock1')).toBeDefined();
      expect(system.hitboxes.size).toBe(1);
    });
  });

  describe('checkCollision (AABB)', () => {
    test('should detect overlapping boxes', () => {
      const boxA = { x: 0, y: 0, width: 50, height: 50 };
      const boxB = { x: 25, y: 25, width: 50, height: 50 };

      expect(system.checkCollision(boxA, boxB)).toBe(true);
    });

    test('should not detect separated boxes', () => {
      const boxA = { x: 0, y: 0, width: 50, height: 50 };
      const boxB = { x: 100, y: 100, width: 50, height: 50 };

      expect(system.checkCollision(boxA, boxB)).toBe(false);
    });

    test('should detect collision when one box contains another', () => {
      const outer = { x: 0, y: 0, width: 100, height: 100 };
      const inner = { x: 25, y: 25, width: 50, height: 50 };

      expect(system.checkCollision(outer, inner)).toBe(true);
      expect(system.checkCollision(inner, outer)).toBe(true);
    });

    test('should not detect edge-touching as collision', () => {
      const boxA = { x: 0, y: 0, width: 50, height: 50 };
      const boxB = { x: 50, y: 0, width: 50, height: 50 };

      expect(system.checkCollision(boxA, boxB)).toBe(false);
    });
  });

  describe('areaCollides', () => {
    test('should detect collision with hitboxes in area', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      // Query area that overlaps with tree hitbox (considering offsets)
      const collides = system.areaCollides(100, 130, 50, 50);
      expect(collides).toBe(true);
    });

    test('should return false for empty area', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const collides = system.areaCollides(500, 500, 50, 50);
      expect(collides).toBe(false);
    });

    test('should respect ignoreId parameter', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      // Get the actual hitbox to know its exact position
      const hitbox = system.hitboxes.get('tree1');

      // Area overlapping the hitbox, but ignoring tree1
      const collides = system.areaCollides(hitbox.x, hitbox.y, 50, 50, 'tree1');
      expect(collides).toBe(false);
    });
  });

  describe('checkPlayerCollision', () => {
    test('should return collisions with hitboxes', () => {
      // Add a hitbox without config (uses raw values)
      system.addHitbox('box1', 'GENERIC', 100, 100, 32, 32);

      // Get actual hitbox position
      const hitbox = system.hitboxes.get('box1');

      // Player position that overlaps with hitbox
      const collisions = system.checkPlayerCollision(
        hitbox.x - 10, hitbox.y - 10, 32, 48
      );

      expect(collisions.length).toBeGreaterThan(0);
    });

    test('should return empty array when no collisions', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const collisions = system.checkPlayerCollision(500, 500, 32, 48);
      expect(collisions).toEqual([]);
    });
  });

  describe('interactionHitboxes', () => {
    test('should create interaction hitbox for TREE type', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      expect(system.interactionHitboxes.size).toBe(1);
      const interactionHitbox = system.interactionHitboxes.get('tree1');
      expect(interactionHitbox).toBeDefined();
      expect(interactionHitbox.originalType).toBe('tree');
    });

    test('should create interaction hitbox for ROCK type', () => {
      system.addHitbox('rock1', 'ROCK', 100, 100, 32, 32);

      const interactionHitbox = system.interactionHitboxes.get('rock1');
      expect(interactionHitbox).toBeDefined();
      expect(interactionHitbox.originalType).toBe('rock');
    });

    test('should create interaction hitbox for CHEST type', () => {
      system.addHitbox('chest1', 'CHEST', 100, 100, 31, 31);

      const interactionHitbox = system.interactionHitboxes.get('chest1');
      expect(interactionHitbox).toBeDefined();
      expect(interactionHitbox.originalType).toBe('chest');
    });
  });

  describe('player interaction range', () => {
    test('should update player interaction hitbox', () => {
      const range = { x: 100, y: 100, width: 50, height: 50 };
      system.updatePlayerInteractionRange(range);

      expect(system.playerInteractionHitbox).toBeDefined();
      expect(system.playerInteractionHitbox.x).toBe(100);
      expect(system.playerInteractionHitbox.width).toBe(50);
    });

    test('should clear player interaction hitbox when null', () => {
      system.updatePlayerInteractionRange({ x: 100, y: 100, width: 50, height: 50 });
      system.updatePlayerInteractionRange(null);

      expect(system.playerInteractionHitbox).toBeNull();
    });

    test('should detect player interaction with object', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const interactionHitbox = system.interactionHitboxes.get('tree1');

      // Set player range overlapping with tree interaction hitbox
      system.updatePlayerInteractionRange({
        x: interactionHitbox.x,
        y: interactionHitbox.y,
        width: 50,
        height: 50
      });

      expect(system.checkPlayerInteraction(interactionHitbox)).toBe(true);
    });

    test('should not detect interaction when out of range', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const interactionHitbox = system.interactionHitboxes.get('tree1');

      // Set player range far from tree
      system.updatePlayerInteractionRange({
        x: 500,
        y: 500,
        width: 50,
        height: 50
      });

      expect(system.checkPlayerInteraction(interactionHitbox)).toBe(false);
    });
  });

  describe('getObjectsInInteractionRange', () => {
    test('should find objects in range', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('rock1', 'ROCK', 120, 120, 32, 32);

      const tree1Hitbox = system.interactionHitboxes.get('tree1');

      const range = {
        x: tree1Hitbox.x,
        y: tree1Hitbox.y,
        width: 100,
        height: 100
      };

      const objectsInRange = system.getObjectsInInteractionRange(range);
      expect(objectsInRange.length).toBeGreaterThan(0);
    });

    test('should return empty array when no objects in range', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const range = { x: 500, y: 500, width: 50, height: 50 };
      const objectsInRange = system.getObjectsInInteractionRange(range);

      expect(objectsInRange).toEqual([]);
    });

    test('should return empty array for null range', () => {
      const objectsInRange = system.getObjectsInInteractionRange(null);
      expect(objectsInRange).toEqual([]);
    });
  });

  describe('updateHitboxPosition', () => {
    test('should update hitbox position', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const result = system.updateHitboxPosition('tree1', 200, 200);

      expect(result).toBe(true);
      const hitbox = system.hitboxes.get('tree1');
      expect(hitbox.x).toBe(200);
      expect(hitbox.y).toBe(200);
    });

    test('should return false for non-existent hitbox', () => {
      const result = system.updateHitboxPosition('nonexistent', 200, 200);
      expect(result).toBe(false);
    });

    test('should update interaction hitbox position as well', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const originalInteraction = system.interactionHitboxes.get('tree1');
      const originalX = originalInteraction.x;

      system.updateHitboxPosition('tree1', 200, 200);

      const updatedInteraction = system.interactionHitboxes.get('tree1');
      expect(updatedInteraction.x).not.toBe(originalX);
    });
  });

  describe('createPlayerHitbox', () => {
    test('should create hitbox with ratios applied', () => {
      const hitbox = system.createPlayerHitbox(100, 100, 32, 48);

      // Player hitbox uses ratios: width 0.7, height 0.3, offsetX 0.15, offsetY 0.7
      expect(hitbox.width).toBeCloseTo(32 * 0.7);
      expect(hitbox.height).toBeCloseTo(48 * 0.3);
      expect(hitbox.x).toBeCloseTo(100 + 32 * 0.15);
      expect(hitbox.y).toBeCloseTo(100 + 48 * 0.7);
    });
  });

  describe('clear', () => {
    test('should remove all hitboxes', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('rock1', 'ROCK', 200, 200, 40, 30);
      system.updatePlayerInteractionRange({ x: 0, y: 0, width: 50, height: 50 });

      system.clear();

      expect(system.hitboxes.size).toBe(0);
      expect(system.interactionHitboxes.size).toBe(0);
      expect(system.playerInteractionHitbox).toBeNull();
    });
  });

  describe('CONFIG_SIZES', () => {
    test('should have TREE configuration', () => {
      expect(CollisionSystem.CONFIG_SIZES.TREE).toBeDefined();
      expect(CollisionSystem.CONFIG_SIZES.TREE.width).toBe(38);
      expect(CollisionSystem.CONFIG_SIZES.TREE.height).toBe(40);
    });

    test('should have ROCK configuration', () => {
      expect(CollisionSystem.CONFIG_SIZES.ROCK).toBeDefined();
      expect(CollisionSystem.CONFIG_SIZES.ROCK.width).toBe(32);
      expect(CollisionSystem.CONFIG_SIZES.ROCK.height).toBe(27);
    });

    test('should have CHEST configuration', () => {
      expect(CollisionSystem.CONFIG_SIZES.CHEST).toBeDefined();
      expect(CollisionSystem.CONFIG_SIZES.CHEST.width).toBe(31);
      expect(CollisionSystem.CONFIG_SIZES.CHEST.height).toBe(31);
    });

    test('should have WELL configuration', () => {
      expect(CollisionSystem.CONFIG_SIZES.WELL).toBeDefined();
      expect(CollisionSystem.CONFIG_SIZES.WELL.width).toBe(63);
      expect(CollisionSystem.CONFIG_SIZES.WELL.height).toBe(30);
    });
  });

  describe('ANIMAL_CONFIGS', () => {
    test('should have DEFAULT animal configuration', () => {
      expect(CollisionSystem.ANIMAL_CONFIGS.DEFAULT).toBeDefined();
      expect(CollisionSystem.ANIMAL_CONFIGS.DEFAULT.widthRatio).toBeDefined();
      expect(CollisionSystem.ANIMAL_CONFIGS.DEFAULT.heightRatio).toBeDefined();
    });

    test('should have BULL animal configuration', () => {
      expect(CollisionSystem.ANIMAL_CONFIGS.BULL).toBeDefined();
      expect(CollisionSystem.ANIMAL_CONFIGS.BULL.widthRatio).toBe(0.3);
    });
  });

  describe('moveRectWithCollisions', () => {
    test('should move rect when no collision', () => {
      const rect = { x: 0, y: 0, width: 32, height: 32 };
      const result = system.moveRectWithCollisions(rect, 10, 10);

      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
      expect(result.blockedX).toBe(false);
      expect(result.blockedY).toBe(false);
    });

    test('should block movement on collision', () => {
      // Add a wall-like hitbox
      system.addHitbox('wall1', 'GENERIC', 50, 0, 10, 100);

      const rect = { x: 0, y: 0, width: 32, height: 32 };
      const result = system.moveRectWithCollisions(rect, 100, 0);

      expect(result.blockedX).toBe(true);
      expect(result.x).toBeLessThan(50); // Should stop before the wall
    });

    test('should respect ignoreId parameter', () => {
      system.addHitbox('wall1', 'GENERIC', 50, 0, 10, 100);

      const rect = { x: 0, y: 0, width: 32, height: 32 };
      const result = system.moveRectWithCollisions(rect, 100, 0, 'wall1');

      expect(result.x).toBe(100); // Should pass through ignored wall
      expect(result.blockedX).toBe(false);
    });
  });

  describe('resolveOverlap', () => {
    test('should push rect out of solid hitbox', () => {
      system.addHitbox('wall1', 'GENERIC', 50, 50, 50, 50);

      // Rect starting inside the wall
      const rect = { x: 60, y: 60, width: 20, height: 20 };
      const resolved = system.resolveOverlap(rect);

      // Should be pushed out
      const stillCollides = system.areaCollides(
        resolved.x, resolved.y, resolved.width, resolved.height
      );
      expect(stillCollides).toBe(false);
    });

    test('should return same position when no overlap', () => {
      system.addHitbox('wall1', 'GENERIC', 100, 100, 50, 50);

      const rect = { x: 0, y: 0, width: 20, height: 20 };
      const resolved = system.resolveOverlap(rect);

      expect(resolved.x).toBe(0);
      expect(resolved.y).toBe(0);
    });
  });
});
