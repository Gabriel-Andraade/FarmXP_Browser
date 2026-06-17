/**
 * @file hoeTool.js - Hoe (soil-prep tool) cursor + tilled-soil lifecycle.
 * @description Part of the planting system (#165). The hoe:
 *   - while equipped, shows a tile-aligned cursor (target the grass tile);
 *   - on click, tills the tile → it shows the cultivated grass sprite.
 *
 * Tilled-soil "physics" (no crop planted yet):
 *   - DRY tilled soil reverts to grass after TILLED_DRY_MIN.
 *   - Watering it (rain or watering can) makes it WET and extends its life to
 *     TILLED_WET_MIN, so the player can till a big batch and plant without
 *     re-tilling.
 *   - Rain/storm auto-waters DRY soil after RAIN_SOAK_MIN of continuous exposure.
 *
 * Durations run on the IN-GAME clock (#165), so the plot decays with the
 * calendar and reverts to grass when the player sleeps — same time base as
 * crops. Tilled tiles are saved/restored per slot.
 * @module HoeTool
 */

import { getSystem, registerSystem } from './gameState.js';
import { getItem } from './itemUtils.js';
import { TILE_SIZE } from './worldConstants.js';

// Soil state "IDs".
export const SOIL_STATE = { DRY: 'dry', WET: 'wet' };

// Tilled-soil lifecycle, measured in IN-GAME minutes (#165) so the plot decays
// with the calendar and reverts to grass when the player sleeps — same time
// base as crops. Values ≈ the old real-time feel at default speed (timeSpeed 2:
// 2 in-game min per real second), so a fresh plot lasts ~20 real min when
// playing straight, but any overnight sleep (~6–24 in-game h skipped) reverts it.
const TILLED_DRY_MIN = 40;   // dry tilled soil → grass after 40 in-game min
const TILLED_WET_MIN = 80;   // watered tilled soil lasts 80 in-game min
const RAIN_SOAK_MIN  = 0.5;  // ~0.5 in-game min under rain auto-waters dry soil
const SCAN_INTERVAL_MS = 500; // throttle the lifecycle scan (real-time perf cap)

/** Current in-game time in minutes (monotonic; jumps on sleep). */
function _gameNow() {
    const w = getSystem('weather') || (typeof window !== 'undefined' ? window.WeatherSystem : null);
    if (w && typeof w.getGameMinutes === 'function') return w.getGameMinutes();
    // Fallback before weather is ready: approximate at default speed (2/s).
    return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000 * 2;
}

/** True when the current weather waters exposed soil (rain or storm). */
function _isRaining() {
    const w = getSystem('weather') || (typeof window !== 'undefined' ? window.WeatherSystem : null);
    const type = w?.weatherType;
    return type === 'rain' || type === 'storm';
}

const hoeTool = {
    _mouseWorldX: 0,
    _mouseWorldY: 0,
    _hasMouse: false,

    // tileKey "tx,ty" -> { state, expiresAt, rainSince }
    _tilled: new Map(),
    _lastScan: 0,

    // Lazy-loaded soil sprites (dry / watered grass-mid variants).
    _dryImg: null,
    _wetImg: null,

    // ── equip + cursor ──────────────────────────────────────────────────────

    /** Feed the latest mouse position in WORLD coords (from control.js mousemove). */
    updateMouse(worldX, worldY) {
        this._mouseWorldX = worldX;
        this._mouseWorldY = worldY;
        this._hasMouse = true;
    },

    /** True when the currently equipped tool is a hoe. */
    isEquipped() {
        const eq = getSystem('player')?.getEquippedItem?.();
        if (!eq) return false;
        const item = getItem(eq.id ?? eq);
        return item?.toolType === 'hoe';
    },

    _tileKey(tileX, tileY) {
        return `${tileX},${tileY}`;
    },

    /** Snaps a world point to the tile it falls in (top-left, world coords). */
    _snap(worldX, worldY) {
        return {
            x: Math.floor(worldX / TILE_SIZE) * TILE_SIZE,
            y: Math.floor(worldY / TILE_SIZE) * TILE_SIZE,
        };
    },

    /** World-space tile under the cursor, snapped to the ground grid. */
    getHoveredTile() {
        const { x, y } = this._snap(this._mouseWorldX, this._mouseWorldY);
        return { x, y, size: TILE_SIZE };
    },

    /** Snapped tile (top-left world coords) under the cursor, or null if no mouse yet. */
    cursorTile() {
        if (!this._hasMouse) return null;
        return this._snap(this._mouseWorldX, this._mouseWorldY);
    },

    /** Draws the tile-aligned cursor square while the hoe is equipped. */
    drawTileCursor(ctx, camera) {
        if (!ctx || !camera || !this._hasMouse) return;
        if (!this.isEquipped()) return;
        // When a seed is selected, the crop system shows the planting cursor
        // instead — don't stack two squares on the same tile.
        if (getSystem('seedWheel')?.getActiveSeed?.()) return;

        const tile = this.getHoveredTile();
        const sp = camera.worldToScreen(tile.x, tile.y);
        const size = tile.size * camera.zoom;
        const x = Math.round(sp.x);
        const y = Math.round(sp.y);

        ctx.save();
        ctx.fillStyle = 'rgba(120, 200, 90, 0.18)';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = 'rgba(130, 215, 95, 0.95)';
        ctx.lineWidth = Math.max(1, 2 * camera.zoom);
        ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
        ctx.restore();
    },

    // ── tilled-soil state ────────────────────────────────────────────────────

    /** Tills the tile under the world point → fresh DRY soil. Re-till refreshes. */
    tillAt(worldX, worldY) {
        const { x, y } = this._snap(worldX, worldY);
        const now = _gameNow();
        this._tilled.set(this._tileKey(x, y), {
            state: SOIL_STATE.DRY,
            expiresAt: now + TILLED_DRY_MIN,
            rainSince: null,
        });
    },

    /**
     * Waters the tilled tile under the world point (future watering-can hook).
     * @returns {boolean} true if a tilled tile was there and got watered.
     */
    waterAt(worldX, worldY) {
        const { x, y } = this._snap(worldX, worldY);
        const rec = this._tilled.get(this._tileKey(x, y));
        if (!rec) return false;
        this._waterRecord(rec, _gameNow());
        return true;
    },

    _waterRecord(rec, now) {
        rec.state = SOIL_STATE.WET;
        rec.expiresAt = now + TILLED_WET_MIN;
        rec.rainSince = null;
    },

    /** Soil state of the tile at (tileX, tileY) world coords, or null if untilled. */
    getTileState(tileX, tileY) {
        return this._tilled.get(this._tileKey(tileX, tileY))?.state ?? null;
    },

    isTilled(tileX, tileY) {
        return this._tilled.has(this._tileKey(tileX, tileY));
    },

    /**
     * Save: tilled tiles with their REMAINING lifetime in in-game minutes (the
     * in-game clock resets on reload, so we re-anchor on restore). Per-save.
     */
    serialize() {
        const now = _gameNow();
        const out = [];
        for (const [key, rec] of this._tilled) {
            const comma = key.indexOf(',');
            out.push({
                x: +key.slice(0, comma),
                y: +key.slice(comma + 1),
                state: rec.state,
                remaining: Math.max(0, Math.round(rec.expiresAt - now)),
            });
        }
        return out;
    },

    /** Load: replaces all tilled tiles from saved data (clears first → no crossover). */
    restore(list) {
        this._tilled.clear();
        if (!Array.isArray(list)) return;
        const now = _gameNow();
        for (const t of list) {
            if (typeof t?.x !== 'number' || typeof t?.y !== 'number') continue;
            const wet = t.state === SOIL_STATE.WET;
            const fallback = wet ? TILLED_WET_MIN : TILLED_DRY_MIN;
            this._tilled.set(this._tileKey(t.x, t.y), {
                state: wet ? SOIL_STATE.WET : SOIL_STATE.DRY,
                expiresAt: now + (t.remaining > 0 ? t.remaining : fallback),
                rainSince: null,
            });
        }
    },

    /**
     * Advances the soil lifecycle: expires old tiles back to grass and lets
     * rain auto-water dry soil. Throttled. Called from the game-loop update.
     */
    update() {
        if (this._tilled.size === 0) return;
        const rnow = performance.now();
        if (rnow - this._lastScan < SCAN_INTERVAL_MS) return;
        this._lastScan = rnow;

        const now = _gameNow(); // expiry/soak run on the in-game clock
        const raining = _isRaining();
        for (const [key, rec] of this._tilled) {
            if (now >= rec.expiresAt) {
                this._tilled.delete(key); // revert to grass
                continue;
            }
            if (rec.state === SOIL_STATE.DRY) {
                if (raining) {
                    if (rec.rainSince == null) rec.rainSince = now;
                    else if (now - rec.rainSince >= RAIN_SOAK_MIN) this._waterRecord(rec, now);
                } else {
                    rec.rainSince = null; // needs continuous exposure
                }
            }
        }
    },

    /**
     * Draws each tilled tile with its sprite (dry → cultivated, wet → watered),
     * in the ground layer (over grass, under objects). Viewport-culled.
     */
    drawTilledSoil(ctx, camera) {
        if (!ctx || !camera || this._tilled.size === 0) return;

        if (!this._dryImg) {
            this._dryImg = new Image();
            this._dryImg.src = 'assets/background/grassMidCultivated.png';
            this._wetImg = new Image();
            this._wetImg.src = 'assets/background/grassMidCultivatedWithWater.png';
        }
        const dryReady = this._dryImg.complete && this._dryImg.naturalWidth > 0;
        const wetReady = this._wetImg.complete && this._wetImg.naturalWidth > 0;
        const size = Math.ceil(TILE_SIZE * camera.zoom);

        ctx.save();
        ctx.imageSmoothingEnabled = false; // crisp pixel tiles, like the grass
        for (const [key, rec] of this._tilled) {
            const comma = key.indexOf(',');
            const tx = +key.slice(0, comma);
            const ty = +key.slice(comma + 1);
            if (camera.isInViewport && !camera.isInViewport(tx, ty, TILE_SIZE, TILE_SIZE)) continue;

            const sp = camera.worldToScreen(tx, ty);
            const x = Math.round(sp.x);
            const y = Math.round(sp.y);

            const wet = rec.state === SOIL_STATE.WET;
            const img = wet ? this._wetImg : this._dryImg;
            const ready = wet ? wetReady : dryReady;

            if (ready) {
                ctx.drawImage(img, x, y, size, size);
            } else {
                ctx.fillStyle = wet ? '#5a4a2e' : '#7a5230';
                ctx.fillRect(x, y, size, size);
            }
        }
        ctx.restore();
    },
};

registerSystem('hoeTool', hoeTool);

export default hoeTool;
