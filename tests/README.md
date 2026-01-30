# Test Suite

This directory contains the test suite for the FarmingXP game project. All tests import and test **real production classes** - no mock classes.

## Running Tests

```bash
bun test                 # Run all tests
bun test --watch        # Run in watch mode
bun test tests/unit/     # Run specific directory
```

## Test Status

 **224 tests passing** | 0 failing | 6 core systems tested

## File Organization

- `00-itemUtils.test.js` - Item utilities (runs first to avoid module cache conflicts)
- `collisionSystem.test.js` - Collision detection and hitbox management
- `currencyManager.test.js` - Currency and transaction system
- `inventory.test.js` - Player inventory with categories
- `playerSystem.test.js` - Player needs and stats
- `storageSystem.test.js` - Storage chest system

**Note**: itemUtils is prefixed with `00-` to ensure it runs first. Since `item.js` is mocked differently by inventory and storage tests, itemUtils must establish its mock before those tests run (Bun module caching behavior).

## Test Coverage

| System          | Tests | Scope                                         |
| --------------- | ----- | --------------------------------------------- |
| itemUtils       | 16    | Item lookup, type checking, pricing, stack limits |
| InventorySystem | 39    | Categories, stacking, equipment, UI selection |
| CollisionSystem | 40    | Hitboxes, AABB, interactions, player ranges   |
| CurrencyManager | 42    | Earn, spend, transactions, balance validation |
| StorageSystem   | 54    | Deposit, withdraw, FIFO, category management  |
| PlayerSystem    | 33    | Needs, consumption, critical states, equipment |

## Testing Philosophy

All tests follow this pattern:

```javascript
// Import and test REAL production classes
const { RealClass } = await import('../../public/scripts/realClass.js');

// Mock only external dependencies (DOM, other modules)
mock.module('../../public/scripts/dependency.js', () => ({
  stubbed: () => {}
}));

describe('RealClass (Production Implementation)', () => {
  test('should validate actual production behavior', () => {
    const instance = new RealClass();
    expect(instance.method()).toBe(expectedValue);
  });
});
```

**Key principle**: Tests validate the real production code, not mock reimplementations.
