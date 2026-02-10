
/**
 * @file validationTests.js - Validation Test Suite
 * @description Test suite to verify input validation is working correctly across all systems
 * Run this in the browser console after loading the game
 * WARNING: These tests mutate live game state. Always run in a controlled environment.
 */


import { currencyManager } from './currencyManager.js';
import { storageSystem } from './storageSystem.js';
import { inventorySystem } from './thePlayer/inventorySystem.js';
import { playerSystem } from './thePlayer/playerSystem.js';
import { logger } from './logger.js';
/**
 * Creates a snapshot of critical game state for restoration
 */
function captureGameState() {
    return {
        money: currencyManager.getMoney(),
        inventory: JSON.parse(JSON.stringify(inventorySystem.categories)),
        storage: storageSystem.storage ? JSON.parse(JSON.stringify(storageSystem.storage)) : null,
        needs: {
            hunger: playerSystem.needs?.hunger,
            thirst: playerSystem.needs?.thirst,
            energy: playerSystem.needs?.energy
        }
    };
}

/**
 * Restores game state from snapshot
 */
function restoreGameState(snapshot) {
    try {
        currencyManager.currentMoney = snapshot.money;
        if (inventorySystem.categories && snapshot.inventory) {
            Object.assign(inventorySystem.categories, snapshot.inventory);
        }
        if (storageSystem.storage && snapshot.storage) {
            Object.assign(storageSystem.storage, snapshot.storage);
        }
        if (playerSystem.needs && snapshot.needs) {
            playerSystem.needs.hunger = snapshot.needs.hunger;
            playerSystem.needs.thirst = snapshot.needs.thirst;
            playerSystem.needs.energy = snapshot.needs.energy;
        }
    } catch (e) {
        console.error('Failed to restore game state:', e);
    }
}

/**
 * Runs all validation tests
 * @returns {Object} Test results summary
 */
export function runValidationTests() {
    console.group('🧪 VALIDATION TEST SUITE');
    
    const initialState = captureGameState();
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    try {
        // TEST 1: Currency NaN Prevention
        console.group('Test 1: Currency NaN Prevention');
        try {
            const money1 = currencyManager.getMoney();
            const earnResult = currencyManager.earn(NaN);
            const money2 = currencyManager.getMoney();

            const passed = !earnResult && money1 === money2;
            console.assert(passed, 'NaN blocked');

            results.tests.push({ name: 'Currency NaN Block', passed });
            if (passed) results.passed++;
            else results.failed++;
        } catch (e) {
            console.error('Test failed with error:', e);
            results.failed++;
            results.tests.push({ name: 'Currency NaN Block', passed: false, error: e.message });
        }
        console.groupEnd();

        // TEST 2: Currency Infinity Prevention
        console.group('Test 2: Currency Infinity Prevention');
        try {
            const money1 = currencyManager.getMoney();
            const spendResult = currencyManager.spend(Infinity);
            const money2 = currencyManager.getMoney();

            const passed = !spendResult && money1 === money2;
            console.assert(passed, 'Infinity blocked');

            results.tests.push({ name: 'Currency Infinity Block', passed });
            if (passed) results.passed++;
            else results.failed++;
        } catch (e) {
            console.error('Test failed with error:', e);
            results.failed++;
            results.tests.push({ name: 'Currency Infinity Block', passed: false, error: e.message });
        }
        console.groupEnd();

        // TEST 3: Currency Overflow Protection
        console.group('Test 3: Currency Overflow Protection');
        try {
            const originalMoney = currencyManager.getMoney();
            currencyManager.currentMoney = 999_999_999;
            currencyManager.earn(1000);
            const newMoney = currencyManager.getMoney();

            const passed = newMoney <= 1_000_000_000;
            console.assert(passed, 'Capped at MAX_CURRENCY');

            results.tests.push({ name: 'Currency Overflow Protection', passed });
            if (passed) results.passed++;
            else results.failed++;
        } catch (e) {
            console.error('Test failed with error:', e);
            results.failed++;
            results.tests.push({ name: 'Currency Overflow Protection', passed: false, error: e.message });
        }
        console.groupEnd();

        // TEST 4: Inventory Negative Quantity
        console.group('Test 4: Inventory Negative Quantity');
        try {
            const initialCount = inventorySystem.getItemQuantity(1);
            const result = inventorySystem.addItem(1, -999);

            const finalCount = inventorySystem.getItemQuantity(1);
            const passed = result === false || (finalCount === initialCount + 1);

            console.assert(passed, 'Negative quantity sanitized');

            results.tests.push({ name: 'Inventory Negative Quantity', passed });
            if (passed) results.passed++;
            else results.failed++;
        } catch (e) {
            console.error('Test failed with error:', e);
            results.failed++;
            results.tests.push({ name: 'Inventory Negative Quantity', passed: false, error: e.message });
        }
        console.groupEnd();

        // TEST 5: Inventory Invalid Item ID
        console.group('Test 5: Inventory Invalid Item ID');
        try {
            const result = inventorySystem.addItem(999999);

            const passed = result === false;
            console.assert(passed, 'Invalid ID rejected');

            results.tests.push({ name: 'Inventory Invalid Item ID', passed });
            if (passed) results.passed++;
            else results.failed++;
        } catch (e) {
            console.error('Test failed with error:', e);
            results.failed++;
            results.tests.push({ name: 'Inventory Invalid Item ID', passed: false, error: e.message });
        }
        console.groupEnd();

        // TEST 6: Storage NaN Handling
        console.group('Test 6: Storage NaN Handling');
        try {
            const storageBefore = JSON.stringify(storageSystem.storage);

            const result = storageSystem.depositFromInventory(1, NaN);

            const storageAfter = JSON.stringify(storageSystem.storage);

            const passed = result === false && storageBefore === storageAfter;
            console.assert(passed, 'NaN rejected');

            results.tests.push({ name: 'Storage NaN Handling', passed });
            if (passed) results.passed++;
            else results.failed++;
        } catch (e) {
            console.error('Test failed with error:', e);
            results.failed++;
            results.tests.push({ name: 'Storage NaN Handling', passed: false, error: e.message });
        }
        console.groupEnd();

        // TEST 7: Player Needs Clamping (Max)
        console.group('Test 7: Player Needs Clamping (Max)');
        try {
            playerSystem.restoreNeeds(9999, 0, 0);
            const newHunger = playerSystem.needs.hunger;

            const passed = newHunger === 100;
            console.assert(passed, 'Capped at 100');

            results.tests.push({ name: 'Needs Clamping Max', passed });
            if (passed) results.passed++;
            else results.failed++;
        } catch (e) {
            console.error('Test failed with error:', e);
            results.failed++;
            results.tests.push({ name: 'Needs Clamping Max', passed: false, error: e.message });
        }
        console.groupEnd();

        // TEST 8: Player Needs Clamping (Min)
        console.group('Test 8: Player Needs Clamping (Min)');
        try {
            playerSystem.consumeNeeds('moving', 9999);
            const newThirst = playerSystem.needs.thirst;

            const passed = newThirst >= 0;
            console.assert(passed, 'Floored at 0');

            results.tests.push({ name: 'Needs Clamping Min', passed });
            if (passed) results.passed++;
            else results.failed++;
        } catch (e) {
            console.error('Test failed with error:', e);
            results.failed++;
            results.tests.push({ name: 'Needs Clamping Min', passed: false, error: e.message });
        }
        console.groupEnd();

    } finally {
        restoreGameState(initialState);
    }

    // Summary
    console.groupEnd();
    console.group('📊 TEST SUMMARY');
    logger.info(`Total Tests: ${results.passed + results.failed}`);
    logger.info(`Passed: ${results.passed}`);
    logger.info(`Failed: ${results.failed}`);
    logger.info(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    console.groupEnd();

    return results;
}

// Auto-run tests if this script is loaded
if (typeof window !== 'undefined') {
    window.runValidationTests = runValidationTests;
    logger.info('💡 Validation tests loaded. Run runValidationTests() in console to execute.');
}
