/**
 * @file wateringCan.js - Watering can water state (Issue #165).
 * @description The watering can (item 12) is empty until filled at the well.
 * Its 0..100% volume + fill/drain/save come from the shared fluid container
 * (fluidContainer.js); this module adds the tool-specific bits (per-crop
 * spend via useAmount, equip check, tile cursor).
 * @module WateringCan
 */

import { getSystem, registerSystem } from './gameState.js';
import { getItem } from './itemUtils.js';
import { TILE_SIZE } from './worldConstants.js';
import { createFluidContainer } from './fluidContainer.js';

const wateringCan = {
    // Shared 0..100% volume (fill/drain/save) — same tank as the bucket.
    ...createFluidContainer(100),

    // Back-compat alias (fillLevel.js / older callers read getCharges()).
    getCharges() { return this._level; },

    /**
     * Spend `amount` percent of water (per-crop cost). Drains to 0 if the cost
     * exceeds what's left (a near-empty can still gives one last watering).
     * @returns {boolean} true if there was any water to spend.
     */
    useAmount(amount) {
        if (this._level <= 0) return false;
        this.drain(amount);
        return true;
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
