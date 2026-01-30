import { describe, test, expect, beforeEach } from 'bun:test';
import "../setup.js";

// Import REAL CurrencyManager class from production code
const { CurrencyManager } = await import('../../public/scripts/currencyManager.js');

describe('CurrencyManager (Production Implementation)', () => {
  let manager;

  beforeEach(() => {
    // Use the REAL CurrencyManager implementation
    manager = new CurrencyManager();
    // Reset transaction history for clean tests
    manager.transactionHistory = [];
  });

  describe('initialization', () => {
    test('should start with initial money (1000)', () => {
      expect(manager.getMoney()).toBe(1000);
    });

    test('should allow custom initial amount via setInitialAmount', () => {
      manager.setInitialAmount(5000);
      expect(manager.getMoney()).toBe(5000);
    });

    test('should initialize with empty transaction history after reset', () => {
      expect(manager.getTransactionHistory().length).toBe(0);
    });
  });

  describe('earn', () => {
    test('should add money correctly', () => {
      manager.earn(500, 'sale');
      expect(manager.getMoney()).toBe(1500);
    });

    test('should reject zero amount', () => {
      const result = manager.earn(0, 'invalid');
      expect(result).toBe(false);
      expect(manager.getMoney()).toBe(1000);
    });

    test('should reject negative amount', () => {
      const result = manager.earn(-100, 'invalid');
      expect(result).toBe(false);
      expect(manager.getMoney()).toBe(1000);
    });

    test('should record transaction in history', () => {
      manager.earn(500, 'wheat sale');

      const history = manager.getTransactionHistory();
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('earn');
      expect(history[0].amount).toBe(500);
      expect(history[0].description).toBe('wheat sale');
      expect(history[0].oldBalance).toBe(1000);
      expect(history[0].newBalance).toBe(1500);
    });

    test('should handle multiple earnings', () => {
      manager.earn(200, 'sale1');
      manager.earn(300, 'sale2');
      manager.earn(100, 'sale3');

      expect(manager.getMoney()).toBe(1600);
      expect(manager.getTransactionHistory().length).toBe(3);
    });

    test('should use default source if not provided', () => {
      manager.earn(100);
      expect(manager.getTransactionHistory()[0].description).toBe('unknown');
    });
  });

  describe('spend', () => {
    test('should deduct money correctly', () => {
      manager.spend(300, 'seeds');
      expect(manager.getMoney()).toBe(700);
    });

    test('should reject spending more than available', () => {
      const result = manager.spend(2000, 'expensive item');
      expect(result).toBe(false);
      expect(manager.getMoney()).toBe(1000);
    });

    test('should reject zero amount', () => {
      const result = manager.spend(0, 'invalid');
      expect(result).toBe(false);
      expect(manager.getMoney()).toBe(1000);
    });

    test('should reject negative amount', () => {
      const result = manager.spend(-100, 'invalid');
      expect(result).toBe(false);
      expect(manager.getMoney()).toBe(1000);
    });

    test('should record transaction in history', () => {
      manager.spend(250, 'pickaxe');

      const history = manager.getTransactionHistory();
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('spend');
      expect(history[0].amount).toBe(250);
      expect(history[0].description).toBe('pickaxe');
      expect(history[0].oldBalance).toBe(1000);
      expect(history[0].newBalance).toBe(750);
    });

    test('should allow spending exact balance', () => {
      const result = manager.spend(1000, 'expensive purchase');
      expect(result).toBe(true);
      expect(manager.getMoney()).toBe(0);
    });

    test('should not allow spending when balance is zero', () => {
      manager.spend(1000, 'first purchase');
      const result = manager.spend(1, 'second purchase');

      expect(result).toBe(false);
      expect(manager.getMoney()).toBe(0);
    });
  });

  describe('reset', () => {
    test('should reset to initial amount', () => {
      manager.earn(500, 'bonus');
      manager.spend(200, 'item');

      manager.reset();

      expect(manager.getMoney()).toBe(1000);
    });

    test('should return true on successful reset', () => {
      const result = manager.reset();
      expect(result).toBe(true);
    });
  });

  describe('canAfford', () => {
    test('should return true when balance is sufficient', () => {
      expect(manager.canAfford(500)).toBe(true);
      expect(manager.canAfford(1000)).toBe(true);
    });

    test('should return false when balance is insufficient', () => {
      expect(manager.canAfford(1001)).toBe(false);
      expect(manager.canAfford(2000)).toBe(false);
    });

    test('should return true for zero amount', () => {
      expect(manager.canAfford(0)).toBe(true);
    });

    test('should not modify balance when checking', () => {
      manager.canAfford(500);
      expect(manager.getMoney()).toBe(1000);
    });

    test('should work correctly after transactions', () => {
      manager.earn(500, 'income');
      expect(manager.canAfford(1200)).toBe(true);

      manager.spend(800, 'purchase');
      expect(manager.canAfford(1000)).toBe(false);
      expect(manager.canAfford(700)).toBe(true);
    });
  });

  describe('setInitialAmount', () => {
    test('should set new initial amount', () => {
      manager.setInitialAmount(5000);

      expect(manager.getMoney()).toBe(5000);
      expect(manager.initialMoney).toBe(5000);
    });

    test('should affect reset behavior', () => {
      manager.setInitialAmount(2000);
      manager.earn(500, 'bonus');

      manager.reset();

      expect(manager.getMoney()).toBe(2000);
    });
  });

  describe('transaction history', () => {
    test('should record both earn and spend transactions', () => {
      manager.earn(500, 'sale');
      manager.spend(200, 'tool');
      manager.earn(300, 'crop');

      const history = manager.getTransactionHistory();
      expect(history.length).toBe(3);
      expect(history[0].type).toBe('earn');
      expect(history[1].type).toBe('spend');
      expect(history[2].type).toBe('earn');
    });

    test('should include timestamps', () => {
      manager.earn(100, 'test');

      const transaction = manager.getTransactionHistory()[0];
      expect(transaction.timestamp).toBeDefined();
      expect(typeof transaction.timestamp).toBe('string');
    });

    test('should limit history to 100 transactions', () => {
      // Add 150 transactions
      for (let i = 0; i < 150; i++) {
        manager.earn(10, `transaction_${i}`);
      }

      const history = manager.getTransactionHistory();
      expect(history.length).toBe(100);

      // Should keep the most recent 100 (transactions 50-149)
      expect(history[0].description).toBe('transaction_50');
      expect(history[99].description).toBe('transaction_149');
    });

    test('should track balance changes correctly', () => {
      manager.earn(500, 'earn1');
      manager.spend(200, 'spend1');
      manager.earn(100, 'earn2');

      const history = manager.getTransactionHistory();

      expect(history[0].oldBalance).toBe(1000);
      expect(history[0].newBalance).toBe(1500);

      expect(history[1].oldBalance).toBe(1500);
      expect(history[1].newBalance).toBe(1300);

      expect(history[2].oldBalance).toBe(1300);
      expect(history[2].newBalance).toBe(1400);
    });
  });

  describe('edge cases', () => {
    test('should handle very large amounts', () => {
      manager.earn(1000000, 'lottery');
      expect(manager.getMoney()).toBe(1001000);
    });

    test('should handle floating point amounts correctly', () => {
      manager.earn(10.5, 'partial sale');
      expect(manager.getMoney()).toBe(1010.5);

      manager.spend(5.25, 'partial purchase');
      expect(manager.getMoney()).toBe(1005.25);
    });

    test('should handle rapid successive transactions', () => {
      for (let i = 0; i < 10; i++) {
        manager.earn(10, 'quick');
        manager.spend(5, 'quick');
      }

      expect(manager.getMoney()).toBe(1050);
      expect(manager.getTransactionHistory().length).toBe(20);
    });
  });

  describe('_notifyChange', () => {
    test('should have _notifyChange method', () => {
      expect(typeof manager._notifyChange).toBe('function');
    });

    test('should track lastAmount after operations', () => {
      manager.earn(100, 'test');

      // _notifyChange updates _lastAmount
      expect(manager._lastAmount).toBe(1100);
    });
  });
});
