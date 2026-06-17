/**
 * @file wateringCan.js - Watering can charge state (Issue #165).
 * @description The watering can (item 12) is always empty until filled at the
 * well. Rather than swapping item ids (janky for an equipped tool), the fill
 * lives here as a charge counter: fill at the well → CAPACITY charges; each
 * watering of a crop/soil spends one; at 0 it's empty again.
 * @module WateringCan
 */

import { getSystem, registerSystem } from './gameState.js';
import { getItem } from './itemUtils.js';
import { TILE_SIZE } from './worldConstants.js';

const CAPACITY = 5; // crops/tiles watered per fill

const wateringCan = {
    _charges: 0,
    capacity: CAPACITY,

    getCharges() { return this._charges; },
    hasWater() { return this._charges > 0; },

    /** Fill to capacity (called by the well). */
    fill() { this._charges = this.capacity; },

    /** Spend one charge. @returns {boolean} true if there was water to spend. */
    useOne() {
        if (this._charges <= 0) return false;
        this._charges -= 1;
        return true;
    },

    /** Save: current charge count. */
    serialize() { return this._charges; },

    /** Load: restore charges (clamped to capacity). */
    restore(charges) {
        this._charges = (typeof charges === 'number' && charges > 0)
            ? Math.min(Math.floor(charges), this.capacity)
            : 0;
    },

    /** True when the equipped tool is a watering can. */
    isEquipped() {
        const eq = getSystem('player')?.getEquippedItem?.();
        if (!eq) return false;
        return getItem(eq.id ?? eq)?.toolType === 'watering_can';
    },

    /**
     * Tile-aligned cursor while the watering can is equipped (same square as
     * the hoe/seed cursors). A 💧 in the center signals it's full of water.
     * Drawn by the game loop.
     */
    drawCursor(ctx, camera) {
        if (!ctx || !camera || !this.isEquipped()) return;
        const tile = getSystem('hoeTool')?.cursorTile?.();
        if (!tile) return;

        const sp = camera.worldToScreen(tile.x, tile.y);
        const size = TILE_SIZE * camera.zoom;
        const x = Math.round(sp.x);
        const y = Math.round(sp.y);

        ctx.save();
        ctx.fillStyle = 'rgba(120, 200, 90, 0.18)';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = 'rgba(130, 215, 95, 0.95)';
        ctx.lineWidth = Math.max(1, 2 * camera.zoom);
        ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
        if (this.hasWater()) {
            ctx.font = `${Math.round(14 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💧', x + size / 2, y + size / 2);
        }
        ctx.restore();
    },
};

registerSystem('wateringCan', wateringCan);

export default wateringCan;
