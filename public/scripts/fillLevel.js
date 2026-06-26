/**
 * @file fillLevel.js - Unified fill-level lookup for container items.
 * @description Single source of truth for "how full is this item" so the
 * inventory tooltip and the equipped-tool cursor overlay stay consistent.
 * @module fillLevel
 */

import { getSystem } from './gameState.js';
import { getItem } from './itemUtils.js';

// Bucket is modelled as two item ids (empty tool ↔ full resource), so its
// level is binary; the watering can holds a 0..capacity charge count.
const BUCKET_EMPTY_ID = 16;
const BUCKET_WATER_ID = 42;

/**
 * Fill level for a container item, or null when the item has no level.
 * @param {number} itemId
 * @returns {{percent:number, current?:number, max?:number, icon:string}|null}
 */
export function getItemFillLevel(itemId) {
  const item = getItem(itemId);
  if (!item) return null;

  // Watering can: charge-based (0..capacity).
  if (item.toolType === 'watering_can') {
    const wc = getSystem('wateringCan');
    if (!wc) return null;
    const max = wc.capacity || 1;
    const current = wc.getCharges?.() ?? 0;
    return { percent: Math.round((current / max) * 100), current, max, icon: '💧' };
  }

  // Bucket: 0..100% water volume (bucketSystem).
  if (item.toolType === 'bucket' || itemId === BUCKET_EMPTY_ID) {
    const b = getSystem('bucket');
    if (!b) return null;
    const max = b.capacity || 100;
    const current = b.getLevel?.() ?? 0;
    return { percent: Math.round((current / max) * 100), current, max, icon: '💧' };
  }
  // Legacy full-bucket item (no longer produced, kept harmless).
  if (itemId === BUCKET_WATER_ID) return { percent: 100, icon: '💧' };

  return null;
}
