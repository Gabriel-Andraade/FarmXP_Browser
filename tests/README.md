# Test Suite

This directory contains the test suite for the FarmingXP game project. All tests import and test **real production classes** - no mock classes.

## Running Tests

```bash
bun test                 # Run all tests
bun test --watch        # Run in watch mode
bun test tests/unit/     # Run specific directory
```

## Test Status

Run `bun test` for the current count. There is a standing set of pre-existing
failures (weather timing, a few world/save cases) unrelated to any one change —
compare against `git stash` before blaming your own work.

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
- `saveMessages.test.js` - Player-facing text for save import/load results
- `saveMigrations.test.js` - Save schema migrations, against the fixtures in `fixtures/saves/`
- `saveSystem.test.js` - Save/load system (slots, serialization, auto-save)
- `storageSystem.test.js` - Storage chest system
- `theWorld.test.js` - World state management and generation
- `weather.test.js` - Weather, time, seasons and day/night cycle

## Save migration fixtures

`fixtures/saves/vN.json` holds one real save per schema version. `saveMigrations.test.js`
loads each through the actual `loadSlot()` path and checks everything the migrations
promise, so removing or breaking a migration step fails here instead of reaching a
player as a half-loaded world.

**When you bump `SAVE_DATA_VERSION` in `public/scripts/saveSystem.js`:**

1. Copy the newest fixture to `fixtures/saves/v<new>.json`
2. In the copy, set `data._dataVersion` to the new version and add the fields the
   new migration introduces. Give quest-like fields a state past `'idle'` — the
   suite uses that to catch a migration that overwrites instead of filling in
3. Import it in `saveMigrations.test.js`, add it to `FIXTURES`, raise
   `CURRENT_VERSION`, and describe what the new migration guarantees in
   `MIGRATION_GUARANTEES`

Skipping step 3 is caught: one test asserts a fixture exists for every version up
to the current one.

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
