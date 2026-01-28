import { describe, test, expect, beforeEach } from 'bun:test';
import "../setup.js";

// Mock PlayerSystem for testing
class TestPlayerSystem {
  constructor() {
    this.needs = {
      hunger: 100,
      thirst: 100,
      energy: 100,
      lastUpdate: Date.now(),

      criticalFlags: {
        hungerCritical: false,
        thirstCritical: false,
        energyCritical: false
      },

      consumptionRates: {
        moving: { hunger: 0.5, thirst: 0.7, energy: 1.0 },
        breaking: { hunger: 1.0, thirst: 1.5, energy: 2.0 },
        building: { hunger: 0.8, thirst: 1.0, energy: 1.5 },
        collecting: { hunger: 0.3, thirst: 0.4, energy: 0.5 },
        idle: { hunger: 0.05, thirst: 0.1, energy: -0.5 }
      },

      criticalLevels: {
        hunger: 10,
        thirst: 10,
        energy: 15
      },

      lowNeedsEffects: {
        speedMultiplier: 0.5,
        miningMultiplier: 0.3,
        buildingMultiplier: 0.2
      }
    };
  }

  /**
   * Consumes needs based on action type
   * @param {string} actionType - Type of action (moving, breaking, etc)
   * @param {number} multiplier - Multiplier for consumption rate
   */
  consumeNeeds(actionType, multiplier = 1) {
    const rates = this.needs.consumptionRates[actionType];
    if (!rates) return;

    this.needs.hunger = Math.max(0, this.needs.hunger - (rates.hunger * multiplier));
    this.needs.thirst = Math.max(0, this.needs.thirst - (rates.thirst * multiplier));

    // Energy can be negative for idle (recovery)
    if (rates.energy < 0) {
      this.needs.energy = Math.min(100, this.needs.energy + Math.abs(rates.energy * multiplier));
    } else {
      this.needs.energy = Math.max(0, this.needs.energy - (rates.energy * multiplier));
    }

    this._updateCriticalFlags();
  }

  /**
   * Restores needs (eating, drinking, sleeping)
   * @param {number} hungerRestore - Amount to restore hunger
   * @param {number} thirstRestore - Amount to restore thirst
   * @param {number} energyRestore - Amount to restore energy
   */
  restoreNeeds(hungerRestore = 0, thirstRestore = 0, energyRestore = 0) {
    this.needs.hunger = Math.min(100, this.needs.hunger + hungerRestore);
    this.needs.thirst = Math.min(100, this.needs.thirst + thirstRestore);
    this.needs.energy = Math.min(100, this.needs.energy + energyRestore);

    this._updateCriticalFlags();
  }

  /**
   * Consumes an item (food, drink, etc)
   * @param {Object} item - Item to consume
   */
  consumeItem(item) {
    if (!item || !item.fillUp) return false;

    this.restoreNeeds(
      item.fillUp.hunger || 0,
      item.fillUp.thirst || 0,
      item.fillUp.energy || 0
    );

    return true;
  }

  /**
   * Gets current need value
   * @param {string} needType - hunger, thirst, or energy
   * @returns {number} Current value (0-100)
   */
  getNeed(needType) {
    return this.needs[needType] || 0;
  }

  /**
   * Checks if a need is in critical state
   * @param {string} needType - hunger, thirst, or energy
   * @returns {boolean} True if critical
   */
  isCritical(needType) {
    const value = this.getNeed(needType);
    const criticalLevel = this.needs.criticalLevels[needType];
    return value <= criticalLevel;
  }

  /**
   * Gets speed multiplier based on needs state
   * @returns {number} Speed multiplier (0.5 if low needs, 1.0 otherwise)
   */
  getSpeedMultiplier() {
    if (this.isCritical('hunger') || this.isCritical('thirst') || this.isCritical('energy')) {
      return this.needs.lowNeedsEffects.speedMultiplier;
    }
    return 1.0;
  }

  /**
   * Gets mining efficiency based on needs state
   * @returns {number} Mining multiplier
   */
  getMiningMultiplier() {
    if (this.isCritical('hunger') || this.isCritical('thirst') || this.isCritical('energy')) {
      return this.needs.lowNeedsEffects.miningMultiplier;
    }
    return 1.0;
  }

  /**
   * Resets all needs to 100
   */
  resetNeeds() {
    this.needs.hunger = 100;
    this.needs.thirst = 100;
    this.needs.energy = 100;
    this._updateCriticalFlags();
  }

  /**
   * Sets a specific need to a value
   * @param {string} needType - hunger, thirst, or energy
   * @param {number} value - Value to set (0-100)
   */
  setNeed(needType, value) {
    const clamped = Math.max(0, Math.min(100, value));
    this.needs[needType] = clamped;
    this._updateCriticalFlags();
  }

  /**
   * Updates critical flags based on current values
   * @private
   */
  _updateCriticalFlags() {
    this.needs.criticalFlags.hungerCritical = this.isCritical('hunger');
    this.needs.criticalFlags.thirstCritical = this.isCritical('thirst');
    this.needs.criticalFlags.energyCritical = this.isCritical('energy');
  }

  /**
   * Simulates sleep to restore energy
   * @param {number} duration - Duration multiplier
   */
  sleep(duration = 1) {
    this.restoreNeeds(0, 0, 50 * duration);
  }
}

describe('PlayerSystem', () => {
  let player;

  beforeEach(() => {
    player = new TestPlayerSystem();
  });

  describe('initialization', () => {
    test('should start with full needs', () => {
      expect(player.getNeed('hunger')).toBe(100);
      expect(player.getNeed('thirst')).toBe(100);
      expect(player.getNeed('energy')).toBe(100);
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
  });

  describe('consumeNeeds', () => {
    test('should consume needs when moving', () => {
      player.consumeNeeds('moving', 1);

      expect(player.getNeed('hunger')).toBe(99.5);
      expect(player.getNeed('thirst')).toBe(99.3);
      expect(player.getNeed('energy')).toBe(99);
    });

    test('should consume needs when breaking objects', () => {
      player.consumeNeeds('breaking', 1);

      expect(player.getNeed('hunger')).toBe(99);
      expect(player.getNeed('thirst')).toBe(98.5);
      expect(player.getNeed('energy')).toBe(98);
    });

    test('should consume less when collecting', () => {
      player.consumeNeeds('collecting', 1);

      expect(player.getNeed('hunger')).toBe(99.7);
      expect(player.getNeed('thirst')).toBe(99.6);
      expect(player.getNeed('energy')).toBe(99.5);
    });

    test('should restore energy when idle', () => {
      player.setNeed('energy', 50);

      player.consumeNeeds('idle', 1);

      expect(player.getNeed('energy')).toBe(50.5);
    });

    test('should not go below 0', () => {
      player.setNeed('hunger', 1);

      player.consumeNeeds('breaking', 2); // Would consume 2 hunger

      expect(player.getNeed('hunger')).toBe(0);
    });

    test('should not exceed 100 when restoring', () => {
      player.setNeed('energy', 99);

      player.consumeNeeds('idle', 5); // Would restore 2.5 energy

      expect(player.getNeed('energy')).toBe(100);
    });

    test('should apply multiplier correctly', () => {
      player.consumeNeeds('moving', 2);

      expect(player.getNeed('hunger')).toBe(99); // 0.5 * 2 = 1
      expect(player.getNeed('thirst')).toBe(98.6); // 0.7 * 2 = 1.4
      expect(player.getNeed('energy')).toBe(98); // 1.0 * 2 = 2
    });
  });

  describe('restoreNeeds', () => {
    test('should restore hunger', () => {
      player.setNeed('hunger', 50);

      player.restoreNeeds(20, 0, 0);

      expect(player.getNeed('hunger')).toBe(70);
    });

    test('should restore thirst', () => {
      player.setNeed('thirst', 30);

      player.restoreNeeds(0, 40, 0);

      expect(player.getNeed('thirst')).toBe(70);
    });

    test('should restore energy', () => {
      player.setNeed('energy', 20);

      player.restoreNeeds(0, 0, 50);

      expect(player.getNeed('energy')).toBe(70);
    });

    test('should restore multiple needs at once', () => {
      player.setNeed('hunger', 50);
      player.setNeed('thirst', 40);
      player.setNeed('energy', 30);

      player.restoreNeeds(20, 30, 40);

      expect(player.getNeed('hunger')).toBe(70);
      expect(player.getNeed('thirst')).toBe(70);
      expect(player.getNeed('energy')).toBe(70);
    });

    test('should cap at 100', () => {
      player.setNeed('hunger', 90);

      player.restoreNeeds(50, 0, 0);

      expect(player.getNeed('hunger')).toBe(100);
    });
  });

  describe('consumeItem', () => {
    test('should consume food item', () => {
      player.setNeed('hunger', 50);
      player.setNeed('thirst', 60);

      const food = {
        name: 'Apple',
        fillUp: { hunger: 20, thirst: 10 }
      };

      const result = player.consumeItem(food);

      expect(result).toBe(true);
      expect(player.getNeed('hunger')).toBe(70);
      expect(player.getNeed('thirst')).toBe(70);
    });

    test('should consume drink item', () => {
      player.setNeed('thirst', 40);

      const drink = {
        name: 'Water Bottle',
        fillUp: { thirst: 30 }
      };

      player.consumeItem(drink);

      expect(player.getNeed('thirst')).toBe(70);
    });

    test('should return false for invalid item', () => {
      const result = player.consumeItem(null);
      expect(result).toBe(false);
    });

    test('should return false for item without fillUp', () => {
      const item = { name: 'Tool' };
      const result = player.consumeItem(item);
      expect(result).toBe(false);
    });
  });

  describe('isCritical', () => {
    test('should return false when needs are healthy', () => {
      expect(player.isCritical('hunger')).toBe(false);
      expect(player.isCritical('thirst')).toBe(false);
      expect(player.isCritical('energy')).toBe(false);
    });

    test('should return true when hunger is critical', () => {
      player.setNeed('hunger', 5);

      expect(player.isCritical('hunger')).toBe(true);
    });

    test('should return true when thirst is critical', () => {
      player.setNeed('thirst', 8);

      expect(player.isCritical('thirst')).toBe(true);
    });

    test('should return true when energy is critical', () => {
      player.setNeed('energy', 10);

      expect(player.isCritical('energy')).toBe(true);
    });

    test('should return true at exact critical level', () => {
      player.setNeed('hunger', 10);

      expect(player.isCritical('hunger')).toBe(true);
    });

    test('should return false just above critical level', () => {
      player.setNeed('hunger', 11);

      expect(player.isCritical('hunger')).toBe(false);
    });
  });

  describe('getSpeedMultiplier', () => {
    test('should return 1.0 when all needs are healthy', () => {
      expect(player.getSpeedMultiplier()).toBe(1.0);
    });

    test('should return 0.5 when hunger is critical', () => {
      player.setNeed('hunger', 5);

      expect(player.getSpeedMultiplier()).toBe(0.5);
    });

    test('should return 0.5 when thirst is critical', () => {
      player.setNeed('thirst', 8);

      expect(player.getSpeedMultiplier()).toBe(0.5);
    });

    test('should return 0.5 when energy is critical', () => {
      player.setNeed('energy', 10);

      expect(player.getSpeedMultiplier()).toBe(0.5);
    });

    test('should return 0.5 when any need is critical', () => {
      player.setNeed('hunger', 80);
      player.setNeed('thirst', 5);
      player.setNeed('energy', 90);

      expect(player.getSpeedMultiplier()).toBe(0.5);
    });
  });

  describe('getMiningMultiplier', () => {
    test('should return 1.0 when needs are healthy', () => {
      expect(player.getMiningMultiplier()).toBe(1.0);
    });

    test('should return 0.3 when needs are critical', () => {
      player.setNeed('hunger', 5);

      expect(player.getMiningMultiplier()).toBe(0.3);
    });
  });

  describe('resetNeeds', () => {
    test('should reset all needs to 100', () => {
      player.setNeed('hunger', 20);
      player.setNeed('thirst', 30);
      player.setNeed('energy', 40);

      player.resetNeeds();

      expect(player.getNeed('hunger')).toBe(100);
      expect(player.getNeed('thirst')).toBe(100);
      expect(player.getNeed('energy')).toBe(100);
    });

    test('should clear critical flags', () => {
      player.setNeed('hunger', 5);
      player.setNeed('thirst', 5);

      player.resetNeeds();

      expect(player.isCritical('hunger')).toBe(false);
      expect(player.isCritical('thirst')).toBe(false);
    });
  });

  describe('sleep', () => {
    test('should restore energy', () => {
      player.setNeed('energy', 30);

      player.sleep(1);

      expect(player.getNeed('energy')).toBe(80);
    });

    test('should cap energy at 100', () => {
      player.setNeed('energy', 80);

      player.sleep(1);

      expect(player.getNeed('energy')).toBe(100);
    });

    test('should accept duration multiplier', () => {
      player.setNeed('energy', 20);

      player.sleep(2);

      expect(player.getNeed('energy')).toBe(100);
    });
  });

  describe('edge cases', () => {
    test('should handle rapid consumption', () => {
      for (let i = 0; i < 50; i++) {
        player.consumeNeeds('moving', 1);
      }

      expect(player.getNeed('hunger')).toBeGreaterThanOrEqual(0);
      expect(player.getNeed('thirst')).toBeGreaterThanOrEqual(0);
      expect(player.getNeed('energy')).toBeGreaterThanOrEqual(0);
    });

    test('should maintain critical flags consistency', () => {
      player.setNeed('hunger', 5);
      expect(player.needs.criticalFlags.hungerCritical).toBe(true);

      player.restoreNeeds(50, 0, 0);
      expect(player.needs.criticalFlags.hungerCritical).toBe(false);
    });

    test('should handle fractional values', () => {
      player.setNeed('hunger', 50.5);

      player.consumeNeeds('moving', 1);

      expect(player.getNeed('hunger')).toBe(50);
    });
  });
});
