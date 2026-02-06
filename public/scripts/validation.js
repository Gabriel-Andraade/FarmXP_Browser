/**
 * @file validation.js - Input Validation Utilities
 * @description Provides validation functions for game inputs to prevent NaN, Infinity, and invalid values.
 * @module Validation
 */

/**
 * Maximum safe currency value to prevent overflow
 * @constant {number}
 */
export const MAX_CURRENCY = 1_000_000_000;

/**
 * Validates that a value is a positive integer (> 0)
 *
 * @param {any} value - Value to check
 * @returns {boolean} Whether the value is a valid positive integer
 *
 * @example
 * isValidPositiveInteger(5)        // true
 * isValidPositiveInteger(0)        // false
 * isValidPositiveInteger(-1)       // false
 * isValidPositiveInteger(5.5)      // false
 * isValidPositiveInteger(NaN)      // false
 * isValidPositiveInteger(Infinity) // false
 */
export function isValidPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
}

/**
 * Validates that a value is a non-negative integer (>= 0)
 * Used for item IDs which can be 0
 *
 * @param {any} value - Value to check
 * @returns {boolean} Whether the value is a valid non-negative integer
 *
 * @example
 * isValidItemId(0)        // true
 * isValidItemId(5)        // true
 * isValidItemId(-1)       // false
 * isValidItemId(5.5)      // false
 * isValidItemId(NaN)      // false
 * isValidItemId(Infinity) // false
 */
export function isValidItemId(value) {
    return Number.isInteger(value) && value >= 0;
}

/**
 * Validates that a value is a positive number (> 0)
 * CRITICAL: Blocks NaN and Infinity which bypass normal comparisons
 *
 * @param {any} value - Value to check
 * @returns {boolean} Whether the value is a valid positive number
 *
 * @example
 * isValidPositiveNumber(5)        // true
 * isValidPositiveNumber(5.5)      // true
 * isValidPositiveNumber(0)        // false
 * isValidPositiveNumber(-1)       // false
 * isValidPositiveNumber(NaN)      // false (CRITICAL: NaN <= 0 is false!)
 * isValidPositiveNumber(Infinity) // false
 * isValidPositiveNumber("5")      // false (type safety)
 */
export function isValidPositiveNumber(value) {
    return typeof value === 'number' &&
           Number.isFinite(value) &&
           value > 0;
}

/**
 * Sanitizes a quantity to a positive integer within bounds
 * Returns min value if input is invalid (NaN/Infinity/negative/non-number)
 *
 * @param {any} value - Quantity to sanitize
 * @param {number} [min=1] - Minimum allowed value
 * @param {number} [max=9999] - Maximum allowed value
 * @returns {number} Sanitized quantity (guaranteed valid)
 *
 * @example
 * sanitizeQuantity(5)           // 5
 * sanitizeQuantity(10000)       // 9999 (clamped to max)
 * sanitizeQuantity(-10)         // 1 (invalid, returns min)
 * sanitizeQuantity(NaN)         // 1 (invalid, returns min)
 * sanitizeQuantity(Infinity)    // 1 (invalid, returns min)
 * sanitizeQuantity(5.7)         // 5 (floored)
 * sanitizeQuantity("5")         // 1 (string rejected)
 * sanitizeQuantity(null)        // 1 (null rejected)
 */
export function sanitizeQuantity(value, min = 1, max = 9999) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return min;
    }

    const num = Math.floor(value);

    // Check if result is positive
    if (num < min) {
        return min;
    }

    return Math.min(num, max);
}

/**
 * Validates and clamps a number to a specific range
 * Returns min value if input is invalid
 *
 * @param {any} value - Value to validate and clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value (guaranteed in range [min, max])
 *
 * @example
 * validateRange(50, 0, 100)    // 50
 * validateRange(150, 0, 100)   // 100 (clamped to max)
 * validateRange(-10, 0, 100)   // 0 (clamped to min)
 * validateRange(NaN, 0, 100)   // 0 (invalid, returns min)
 * validateRange(Infinity, 0, 100) // 0 (invalid, returns min)
 */
export function validateRange(value, min, max) {
    if (typeof value !== 'number') return min;
    const num = value;

    // If not finite, return min
    if (!Number.isFinite(num)) {
        return min;
    }

    return Math.max(min, Math.min(max, num));
}

/**
 * Validates that an item ID exists in the items array
 *
 * @param {any} id - Item ID to validate
 * @param {Array<Object>} items - Array of items to check against
 * @returns {boolean} Whether the item ID is valid and exists
 *
 * @example
 * const items = [{id: 1, name: 'Apple'}, {id: 2, name: 'Sword'}];
 * isExistingItemId(1, items)      // true
 * isExistingItemId(999, items)    // false (doesn't exist)
 * isExistingItemId(NaN, items)    // false (not a valid integer)
 * isExistingItemId(-1, items)     // false (not positive)
 */
export function isExistingItemId(id, items) {
    if (!Array.isArray(items)) {
        return false;
    }
    return isValidItemId(id) &&
           items.some(item => item.id === id);
}

/**
 * Validates trade input (quantity vs available stock)
 *
 * @param {any} amount - Quantity to trade
 * @param {number} maxAvailable - Maximum available quantity
 * @returns {{valid: boolean, error?: string}} Validation result
 *
 * @example
 * validateTradeInput(5, 10)     // {valid: true}
 * validateTradeInput(15, 10)    // {valid: false, error: 'Insufficient quantity'}
 * validateTradeInput(-5, 10)    // {valid: false, error: 'Invalid amount'}
 * validateTradeInput(NaN, 10)   // {valid: false, error: 'Invalid amount'}
 */
export function validateTradeInput(amount, maxAvailable) {
    if (!isValidPositiveInteger(amount)) {
        return { valid: false, error: 'Invalid amount' };
    }

    if (!Number.isInteger(maxAvailable) || maxAvailable < 0) {
        return { valid: false, error: 'Invalid available quantity' };
    }

    if (amount > maxAvailable) {
        return { valid: false, error: 'Insufficient quantity' };
    }

    return { valid: true };
}
