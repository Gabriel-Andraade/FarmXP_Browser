import { describe, test, expect, beforeEach, mock } from 'bun:test';
import "../setup.js";

// Set up required globals
globalThis.window.playerHUD = { updatePlayerInfo: () => {} };

// Mock stella.js - character module
mock.module('../../public/scripts/thePlayer/stella.js', () => ({
  stella: { x: 0, y: 0, width: 32, height: 48 },
  updateStella: () => {},
  drawStella: () => {}
}));

// Mock theWorld.js
mock.module('../../public/scripts/theWorld.js', () => ({
  getInitialPlayerPosition: () => ({ x: 100, y: 100 })
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
