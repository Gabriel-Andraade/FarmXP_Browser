import { describe, test, expect, beforeEach } from 'bun:test';
import "../setup.js";

// Set up required globals for CollisionSystem
globalThis.window.DEBUG_HITBOXES = false;
globalThis.window.currentPlayer = null;

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
