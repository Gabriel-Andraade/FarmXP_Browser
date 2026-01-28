# Test Suite

This directory contains the test suite for the FarmingXP game project.

## Structure

```
tests/
├── unit/
│   ├── itemUtils.test.js        - Tests for item utility functions (6 tests)
│   ├── collision.test.js        - Tests for AABB collision detection (6 tests)
│   ├── inventory.test.js        - Tests for inventory system (6 tests)
│   ├── collisionSystem.test.js  - Tests for CollisionSystem class (40 tests)
│   ├── currencyManager.test.js  - Tests for CurrencyManager (42 tests)
│   ├── storageSystem.test.js    - Tests for StorageSystem (30 tests)
│   └── playerSystem.test.js     - Tests for PlayerSystem needs (13 tests)
└── integration/                 - Integration tests (to be added)
```

## Running Tests

### Run all tests
```bash
bun test
```

### Run tests in watch mode (re-run on file changes)
```bash
bun test --watch
```

### Run with coverage report
```bash
bun test --coverage
```

### Run specific test file
```bash
bun test tests/unit/collision.test.js
```

## Test Coverage

### Current Coverage

- ✅ **Item Utilities** (6 tests) - Finding items by ID and name, case-insensitive search
- ✅ **Basic Collision** (6 tests) - AABB collision detection for various scenarios
- ✅ **Basic Inventory** (6 tests) - Adding, removing, and stacking items
- ✅ **CollisionSystem** (40 tests) - Hitbox management, collision detection, interaction zones
- ✅ **CurrencyManager** (42 tests) - Earning, spending, balance validation, transaction history
- ✅ **StorageSystem** (30 tests) - Deposit, withdraw, category mapping, stack management
- ✅ **PlayerSystem** (13 tests) - Needs management, consumption rates, critical states, effects


## Writing New Tests

### Test File Template

```javascript
import { describe, test, expect, beforeEach } from 'bun:test';

describe('Feature Name', () => {
  let system;

  beforeEach(() => {
    // Setup before each test
    system = new System();
  });

  describe('Method Name', () => {
    test('should do something', () => {
      const result = system.doSomething();
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Best Practices

1. **One assertion per test** - Keep tests focused and easy to debug
2. **Use descriptive test names** - "should return true when X happens"
3. **Test edge cases** - Empty arrays, null values, boundary conditions
4. **Use beforeEach for setup** - Keep tests isolated and independent
5. **Mock external dependencies** - Focus on testing the unit in isolation

## Test Results

All 143 tests passing ✅

```
143 pass
0 fail
251 expect() calls
Ran 143 tests across 7 files. [172.00ms]
```

### Test Breakdown by File

| File | Tests | Coverage |
|------|-------|----------|
| itemUtils.test.js | 6 | Item lookup utilities |
| collision.test.js | 6 | AABB collision algorithm |
| inventory.test.js | 6 | Basic inventory operations |
| collisionSystem.test.js | 40 | Complete hitbox system |
| currencyManager.test.js | 42 | Currency operations & history |
| storageSystem.test.js | 30 | Storage & category system |
| playerSystem.test.js | 13 | Player needs & effects |
| **Total** | **143** | **7 systems covered** |

## Related Documentation

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Issue #8 - Missing Test Suite](../claude.md)
