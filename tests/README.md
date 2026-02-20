# Test Suite

This directory contains the test suite for the FarmingXP game project. All tests import and test **real production classes** - no mock classes.

## Running Tests

```bash
bun test                 # Run all tests
bun test --watch        # Run in watch mode
bun test tests/unit/     # Run specific directory
```

## Test Status

 **487 tests passing** | 0 failing | 14 core systems tested

## File Organization

- `00-itemUtils.test.js` - Item utilities (runs first to avoid module cache conflicts)
- `animalAI.test.js` - Animal AI behavior and pathfinding
- `buildSystem.test.js` - Building placement and construction system
- `characterSelection.test.js` - Character selection and customization
- `collisionSystem.test.js` - Collision detection and hitbox management
- `control.test.js` - Input controls and keybinding system
- `currencyManager.test.js` - Currency and transaction system
- `inventory.test.js` - Player inventory with categories
- `merchant.test.js` - Merchant trade system (buy/sell, schedules, pricing)
- `playerSystem.test.js` - Player needs and stats
- `saveSystem.test.js` - Save/load system (slots, serialization, auto-save)
- `storageSystem.test.js` - Storage chest system
- `theWorld.test.js` - World state management and generation
- `weather.test.js` - Weather, time, seasons and day/night cycle

**Note**: itemUtils is prefixed with `00-` to ensure it runs first. Since `item.js` is mocked differently by inventory and storage tests, itemUtils must establish its mock before those tests run (Bun module caching behavior).

## Test Coverage

| System              | Tests | Scope                                              |
| ------------------- | ----- | -------------------------------------------------- |
| itemUtils           | 16    | Item lookup, type checking, pricing, stack limits   |
| AnimalAI            | 48    | Animal AI behavior, pathfinding, state management   |
| BuildSystem         | 51    | Building placement, construction, validation        |
| CharacterSelection  | 28    | Character selection, customization, UI              |
| CollisionSystem     | 44    | Hitboxes, AABB, interactions, player ranges         |
| Control             | 37    | Input handling, keybindings, key states             |
| CurrencyManager     | 34    | Earn, spend, transactions, balance validation       |
| InventorySystem     | 44    | Categories, stacking, equipment, UI selection       |
| MerchantSystem      | 75    | Buy/sell, schedules, pricing, quantity, trade modes  |
| PlayerSystem        | 33    | Needs, consumption, critical states, equipment      |
| SaveSystem          | 91    | Slots, serialization, auto-save, load, rename, delete |
| StorageSystem       | 37    | Deposit, withdraw, FIFO, category management        |
| TheWorld            | 33    | World state, generation, import/export              |
| WeatherSystem       | 81    | Time, seasons, weather, sleep, ambient light        |

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
