/**
 * @file validationTests.js - Validation Test Suite
 * @description Test suite to verify input validation is working correctly across all systems
 * Run this in the browser console after loading the game
 */

import { currencyManager } from './currencyManager.js';
import { storageSystem } from './storageSystem.js';
import { inventorySystem } from './thePlayer/inventorySystem.js';
import { playerSystem } from './thePlayer/playerSystem.js';

/**
 * Runs all validation tests
 * @returns {Object} Test results summary
 */
export function runValidationTests() {
    console.group('🧪 VALIDATION TEST SUITE');

    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // TEST 1: Currency NaN Prevention
    console.group('Test 1: Currency NaN Prevention');
    try {
        const money1 = currencyManager.getMoney();
        const earnResult = currencyManager.earn(NaN);
        const money2 = currencyManager.getMoney();

        const passed = !earnResult && money1 === money2;
        console.assert(passed, ' NaN blocked');

        results.tests.push({ name: 'Currency NaN Block', passed });
        if (passed) results.passed++;
        else results.failed++;
    } catch (e) {
        console.error(' Test failed with error:', e);
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
        console.assert(passed, ' Infinity blocked');

        results.tests.push({ name: 'Currency Infinity Block', passed });
        if (passed) results.passed++;
        else results.failed++;
    } catch (e) {
        console.error(' Test failed with error:', e);
        results.failed++;
        results.tests.push({ name: 'Currency Infinity Block', passed: false, error: e.message });
    }
    console.groupEnd();

    // TEST 3: Currency Overflow Protection
    console.group('Test 3: Currency Overflow Protection');
    let oldMoney;
    try {
        oldMoney = currencyManager.getMoney();
        currencyManager.currentMoney = Number.MAX_SAFE_INTEGER - 100;
        currencyManager.earn(1000);
        const newMoney = currencyManager.getMoney();

        const passed = newMoney === Number.MAX_SAFE_INTEGER;
        console.assert(passed, ' Capped at MAX_SAFE_INTEGER');

        results.tests.push({ name: 'Currency Overflow Protection', passed });
        if (passed) results.passed++;
        else results.failed++;
    } catch (e) {
        console.error(' Test failed with error:', e);
        results.failed++;
        results.tests.push({ name: 'Currency Overflow Protection', passed: false, error: e.message });
    } finally {
        if (oldMoney !== undefined) {
            currencyManager.currentMoney = oldMoney;
        }
    }
    console.groupEnd();

    // TEST 4: Inventory Negative Quantity
    console.group('Test 4: Inventory Negative Quantity');
    let initialCount;
    let itemAdded = false;
    try {
        // Try to add item with negative quantity (should be sanitized to 1)
        initialCount = inventorySystem.getItemQuantity(1);
        const result = inventorySystem.addItem(1, -999);
        itemAdded = result;

        // If inventory was full, result might be false
        // If it succeeded, quantity should be +1 (sanitized from -999 to 1)
        const finalCount = inventorySystem.getItemQuantity(1);
        const passed = result === false || (finalCount === initialCount + 1);

        console.assert(passed, ' Negative quantity sanitized');

        results.tests.push({ name: 'Inventory Negative Quantity', passed });
        if (passed) results.passed++;
        else results.failed++;
    } catch (e) {
        console.error(' Test failed with error:', e);
        results.failed++;
        results.tests.push({ name: 'Inventory Negative Quantity', passed: false, error: e.message });
    } finally {
        // Roll back item addition if it succeeded
        if (itemAdded) {
            inventorySystem.removeItem(1, 1);
        }
    }
    console.groupEnd();

    // TEST 5: Inventory Invalid Item ID
    console.group('Test 5: Inventory Invalid Item ID');
    try {
        const result = inventorySystem.addItem(999999);

        const passed = result === false;
        console.assert(passed, ' Invalid ID rejected');

        results.tests.push({ name: 'Inventory Invalid Item ID', passed });
        if (passed) results.passed++;
        else results.failed++;
    } catch (e) {
        console.error(' Test failed with error:', e);
        results.failed++;
        results.tests.push({ name: 'Inventory Invalid Item ID', passed: false, error: e.message });
    }
    console.groupEnd();

       // TEST 6: Storage NaN Handling - Rejected via sanitizeQuantity
    console.group('Test 6: Storage NaN Handling - Rejected');
    try {
        // Get storage state before
        const storageBefore = JSON.stringify(storageSystem.storage);
        
        // Try to deposit with NaN quantity (should be rejected by sanitizeQuantity)
        const result = storageSystem.depositFromInventory(1, NaN);
        
        // Storage should remain unchanged (no deposit happened)
        const storageAfter = JSON.stringify(storageSystem.storage);
        
        // Result should be false (rejected) AND storage unchanged
        const passed = result === false && storageBefore === storageAfter;
        console.assert(passed, ' NaN rejected by sanitizeQuantity()');
        
        results.tests.push({ name: 'Storage NaN Handling (rejected)', passed });
        if (passed) results.passed++;
        else results.failed++;
    } catch (e) {
        console.error(' Test failed with error:', e);
        results.failed++;
        results.tests.push({ name: 'Storage NaN Handling (rejected)', passed: false, error: e.message });
    }
    console.groupEnd();

    // TEST 7: Player Needs Range Clamping (Max)
    console.group('Test 7: Player Needs Clamping (Max)');
    let oldHunger;
    try {
        oldHunger = playerSystem.needs.hunger;
        playerSystem.restoreNeeds(9999, 0, 0);
        const newHunger = playerSystem.needs.hunger;

        const passed = newHunger === 100;
        console.assert(passed, ' Capped at 100');

        results.tests.push({ name: 'Needs Clamping Max', passed });
        if (passed) results.passed++;
        else results.failed++;
    } catch (e) {
        console.error(' Test failed with error:', e);
        results.failed++;
        results.tests.push({ name: 'Needs Clamping Max', passed: false, error: e.message });
    } finally {
        if (oldHunger !== undefined) {
            playerSystem.needs.hunger = oldHunger;
        }
    }
    console.groupEnd();

    // TEST 8: Player Needs Range Clamping (Min)
    console.group('Test 8: Player Needs Clamping (Min)');
    let oldThirst;
    try {
        oldThirst = playerSystem.needs.thirst;
        playerSystem.needs.thirst = 50;
        playerSystem.consumeNeeds('moving', 9999);
        const newThirst = playerSystem.needs.thirst;

        const passed = newThirst === 0;
        console.assert(passed, ' Floored at 0');

        results.tests.push({ name: 'Needs Clamping Min', passed });
        if (passed) results.passed++;
        else results.failed++;
    } catch (e) {
        console.error(' Test failed with error:', e);
        results.failed++;
        results.tests.push({ name: 'Needs Clamping Min', passed: false, error: e.message });
    } finally {
        if (oldThirst !== undefined) {
            playerSystem.needs.thirst = oldThirst;
        }
    }
    console.groupEnd();

    // TEST 9: Currency setInitialAmount Validation
    console.group('Test 9: Currency setInitialAmount Validation');
    let originalInitial;
    let originalCurrent;
    try {
        originalInitial = currencyManager.initialMoney;
        originalCurrent = currencyManager.currentMoney;

        // Test NaN
        currencyManager.setInitialAmount(NaN);
        const afterNaN = currencyManager.getMoney();
        const passedNaN = afterNaN === originalCurrent;

        // Test Infinity
        currencyManager.setInitialAmount(Infinity);
        const afterInf = currencyManager.getMoney();
        const passedInf = afterInf === originalCurrent;

        // Test negative
        currencyManager.setInitialAmount(-100);
        const afterNeg = currencyManager.getMoney();
        const passedNeg = afterNeg === originalCurrent;

        const passed = passedNaN && passedInf && passedNeg;
        console.assert(passed, ' setInitialAmount blocks invalid values');

        results.tests.push({ name: 'setInitialAmount Validation', passed });
        if (passed) results.passed++;
        else results.failed++;
    } catch (e) {
        console.error(' Test failed with error:', e);
        results.failed++;
        results.tests.push({ name: 'setInitialAmount Validation', passed: false, error: e.message });
    } finally {
        if (originalInitial !== undefined) currencyManager.setInitialAmount(originalInitial);
        if (originalCurrent !== undefined) currencyManager.currentMoney = originalCurrent;
    }
    console.groupEnd();

    // Summary
    console.groupEnd();
    console.group('📊 TEST SUMMARY');
    console.log(`Total Tests: ${results.passed + results.failed}`);
    console.log(` Passed: ${results.passed}`);
    console.log(` Failed: ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    console.groupEnd();

    return results;
}

// Auto-run tests if this script is loaded
if (typeof window !== 'undefined') {
    window.runValidationTests = runValidationTests;
    console.log('💡 Validation tests loaded. Run runValidationTests() in console to execute.');
}
