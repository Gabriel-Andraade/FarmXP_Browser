import { describe, test, expect, beforeEach } from 'bun:test';
import "../setup.js";

// Mock CollisionSystem class for testing
class TestCollisionSystem {
  constructor() {
    this.hitboxes = new Map();
    this.interactionHitboxes = new Map();
    this.playerInteractionHitbox = null;
  }

  /**
   * Adds a physical hitbox (solid collision)
   * @param {string} id - Unique identifier for the hitbox
   * @param {string} type - Type of object (TREE, ROCK, etc)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width of hitbox
   * @param {number} height - Height of hitbox
   * @param {Object} reference - Reference to the original object
   */
  addHitbox(id, type, x, y, width, height, reference = null) {
    this.hitboxes.set(id, {
      id,
      type,
      x,
      y,
      width,
      height,
      reference
    });
  }

  /**
   * Removes a hitbox by ID
   * @param {string} id - Hitbox identifier
   * @returns {boolean} True if hitbox was removed
   */
  removeHitbox(id) {
    return this.hitboxes.delete(id);
  }

  /**
   * Gets a hitbox by ID
   * @param {string} id - Hitbox identifier
   * @returns {Object|undefined} Hitbox data or undefined
   */
  getHitbox(id) {
    return this.hitboxes.get(id);
  }

  /**
   * Checks AABB collision between two boxes
   * @param {Object} boxA - First bounding box
   * @param {Object} boxB - Second bounding box
   * @returns {boolean} True if collision detected
   */
  checkAABBCollision(boxA, boxB) {
    return (
      boxA.x < boxB.x + boxB.width &&
      boxA.x + boxA.width > boxB.x &&
      boxA.y < boxB.y + boxB.height &&
      boxA.y + boxA.height > boxB.y
    );
  }

  /**
   * Gets all hitboxes of a specific type
   * @param {string} type - Type to filter by
   * @returns {Array} Array of hitboxes matching the type
   */
  getHitboxesByType(type) {
    return Array.from(this.hitboxes.values()).filter(h => h.type === type);
  }

  /**
   * Checks collision between player and all hitboxes
   * @param {Object} playerBox - Player bounding box
   * @returns {Array} Array of colliding hitboxes
   */
  checkPlayerCollisions(playerBox) {
    const collisions = [];
    for (const hitbox of this.hitboxes.values()) {
      if (this.checkAABBCollision(playerBox, hitbox)) {
        collisions.push(hitbox);
      }
    }
    return collisions;
  }

  /**
   * Adds an interaction hitbox (non-solid, for interaction range)
   * @param {string} id - Unique identifier
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {Object} reference - Reference object
   */
  addInteractionHitbox(id, x, y, width, height, reference = null) {
    this.interactionHitboxes.set(id, {
      id,
      x,
      y,
      width,
      height,
      reference
    });
  }

  /**
   * Clears all hitboxes
   */
  clear() {
    this.hitboxes.clear();
    this.interactionHitboxes.clear();
    this.playerInteractionHitbox = null;
  }
}

describe('CollisionSystem', () => {
  let system;

  beforeEach(() => {
    system = new TestCollisionSystem();
  });

  describe('addHitbox', () => {
    test('should add hitbox correctly', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const hitbox = system.getHitbox('tree1');
      expect(hitbox).toBeDefined();
      expect(hitbox.id).toBe('tree1');
      expect(hitbox.type).toBe('TREE');
      expect(hitbox.x).toBe(100);
      expect(hitbox.y).toBe(100);
      expect(hitbox.width).toBe(32);
      expect(hitbox.height).toBe(64);
    });

    test('should store reference object', () => {
      const treeObj = { name: 'Oak Tree', health: 100 };
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64, treeObj);

      const hitbox = system.getHitbox('tree1');
      expect(hitbox.reference).toBe(treeObj);
      expect(hitbox.reference.name).toBe('Oak Tree');
    });

    test('should allow multiple hitboxes', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('rock1', 'ROCK', 200, 200, 40, 30);

      expect(system.hitboxes.size).toBe(2);
    });

    test('should overwrite hitbox with same ID', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('tree1', 'TREE', 150, 150, 32, 64);

      const hitbox = system.getHitbox('tree1');
      expect(hitbox.x).toBe(150);
      expect(system.hitboxes.size).toBe(1);
    });
  });

  describe('removeHitbox', () => {
    test('should remove hitbox by ID', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const removed = system.removeHitbox('tree1');
      expect(removed).toBe(true);
      expect(system.getHitbox('tree1')).toBeUndefined();
    });

    test('should return false for non-existent hitbox', () => {
      const removed = system.removeHitbox('nonexistent');
      expect(removed).toBe(false);
    });

    test('should not affect other hitboxes', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('rock1', 'ROCK', 200, 200, 40, 30);

      system.removeHitbox('tree1');

      expect(system.getHitbox('rock1')).toBeDefined();
      expect(system.hitboxes.size).toBe(1);
    });
  });

  describe('checkAABBCollision', () => {
    test('should detect overlapping boxes', () => {
      const boxA = { x: 0, y: 0, width: 50, height: 50 };
      const boxB = { x: 25, y: 25, width: 50, height: 50 };

      expect(system.checkAABBCollision(boxA, boxB)).toBe(true);
    });

    test('should not detect separated boxes', () => {
      const boxA = { x: 0, y: 0, width: 50, height: 50 };
      const boxB = { x: 100, y: 100, width: 50, height: 50 };

      expect(system.checkAABBCollision(boxA, boxB)).toBe(false);
    });

    test('should detect collision when one box contains another', () => {
      const outer = { x: 0, y: 0, width: 100, height: 100 };
      const inner = { x: 25, y: 25, width: 50, height: 50 };

      expect(system.checkAABBCollision(outer, inner)).toBe(true);
      expect(system.checkAABBCollision(inner, outer)).toBe(true);
    });

    test('should not detect edge-touching as collision', () => {
      const boxA = { x: 0, y: 0, width: 50, height: 50 };
      const boxB = { x: 50, y: 0, width: 50, height: 50 };

      expect(system.checkAABBCollision(boxA, boxB)).toBe(false);
    });
  });

  describe('getHitboxesByType', () => {
    test('should return hitboxes of specific type', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('tree2', 'TREE', 200, 200, 32, 64);
      system.addHitbox('rock1', 'ROCK', 300, 300, 40, 30);

      const trees = system.getHitboxesByType('TREE');
      expect(trees.length).toBe(2);
      expect(trees.every(h => h.type === 'TREE')).toBe(true);
    });

    test('should return empty array for non-existent type', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const buildings = system.getHitboxesByType('BUILDING');
      expect(buildings).toEqual([]);
    });
  });

  describe('checkPlayerCollisions', () => {
    test('should find all colliding hitboxes', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('rock1', 'ROCK', 120, 120, 40, 30);
      system.addHitbox('tree2', 'TREE', 300, 300, 32, 64);

      const playerBox = { x: 110, y: 110, width: 20, height: 20 };
      const collisions = system.checkPlayerCollisions(playerBox);

      expect(collisions.length).toBe(2);
      expect(collisions.some(h => h.id === 'tree1')).toBe(true);
      expect(collisions.some(h => h.id === 'rock1')).toBe(true);
      expect(collisions.some(h => h.id === 'tree2')).toBe(false);
    });

    test('should return empty array when no collisions', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);

      const playerBox = { x: 500, y: 500, width: 20, height: 20 };
      const collisions = system.checkPlayerCollisions(playerBox);

      expect(collisions).toEqual([]);
    });
  });

  describe('interactionHitboxes', () => {
    test('should add interaction hitbox separately from physical hitboxes', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addInteractionHitbox('tree1_interact', 90, 90, 50, 80);

      expect(system.hitboxes.size).toBe(1);
      expect(system.interactionHitboxes.size).toBe(1);
    });

    test('should store interaction hitbox reference', () => {
      const treeObj = { name: 'Oak Tree' };
      system.addInteractionHitbox('tree1_interact', 90, 90, 50, 80, treeObj);

      const hitbox = system.interactionHitboxes.get('tree1_interact');
      expect(hitbox.reference).toBe(treeObj);
    });
  });

  describe('clear', () => {
    test('should remove all hitboxes', () => {
      system.addHitbox('tree1', 'TREE', 100, 100, 32, 64);
      system.addHitbox('rock1', 'ROCK', 200, 200, 40, 30);
      system.addInteractionHitbox('interact1', 90, 90, 50, 80);

      system.clear();

      expect(system.hitboxes.size).toBe(0);
      expect(system.interactionHitboxes.size).toBe(0);
      expect(system.playerInteractionHitbox).toBeNull();
    });
  });
});
