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

const CAPACITY = 100; // water as a 0..100% volume (was 5 discrete charges)

const wateringCan = {
    _level: 0,
    capacity: CAPACITY,

    /** Current fill, 0..100. */
    getLevel() { return this._level; },
    hasWater() { return this._level > 0; },

    /** Fill to capacity (legacy full-fill, e.g. the well's default button). */
    fill() { this._level = CAPACITY; },

    /**
     * Fill up toward a target percent (for the well's choose-amount slider).
     * Never lowers the level. @returns {number} percent actually added.
     */
    fillTo(targetPercent) {
        const target = Math.max(0, Math.min(CAPACITY, Number(targetPercent) || 0));
        if (target <= this._level) return 0;
        const added = target - this._level;
        this._level = target;
        return added;
    },

    /**
     * Spend `amount` percent of water (per-crop cost). Drains to 0 if the cost
     * exceeds what's left (a near-empty can still gives one last watering).
     * @returns {boolean} true if there was any water to spend.
     */
    useAmount(amount) {
        if (this._level <= 0) return false;
        this._level = Math.max(0, this._level - (Number(amount) || 0));
        return true;
    },

    /** Save: current level (0..100). */
    serialize() { return this._level; },

    /**
     * Load: restore level, clamped to 0..capacity. Pre-volume saves stored a
     * 0..5 charge count; those load as a near-empty can (≤5%) — harmless, the
     * player just refills. Not worth a migration given the tiny window.
     */
    restore(value) {
        this._level = (typeof value === 'number' && value > 0)
            ? Math.min(Math.round(value), CAPACITY)
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
