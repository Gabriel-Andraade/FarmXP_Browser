/**
 * @file bucketSystem.js - Bucket water volume.
 * @description The bucket (item 16) holds a 0..100% water volume, filled at the
 * well (choose amount) and poured into water troughs. Mirrors wateringCan.js;
 * replaces the old empty/full two-item model (16 ↔ 42) which had no fill path.
 * @module BucketSystem
 */

import { registerSystem } from './gameState.js';

const CAPACITY = 100;

const bucketSystem = {
  _level: 0,
  capacity: CAPACITY,

  getLevel() { return this._level; },
  hasWater() { return this._level > 0; },

  /** Fill to capacity (legacy full-fill). */
  fill() { this._level = CAPACITY; },

  /** Fill up toward a target percent; never lowers. @returns {number} added. */
  fillTo(targetPercent) {
    const target = Math.max(0, Math.min(CAPACITY, Number(targetPercent) || 0));
    if (target <= this._level) return 0;
    const added = target - this._level;
    this._level = target;
    return added;
  },

  /** Drain up to `amount`. @returns {number} amount actually drained. */
  drain(amount) {
    const take = Math.max(0, Math.min(this._level, Number(amount) || 0));
    this._level -= take;
    return take;
  },

  serialize() { return this._level; },
  restore(value) {
    this._level = (typeof value === 'number' && value > 0)
      ? Math.min(Math.round(value), CAPACITY)
      : 0;
  },
};

registerSystem('bucket', bucketSystem);

export default bucketSystem;
