/**
 * @file cropSystem.js - Crop planting / growth / harvest (Issue #165).
 * @description Plant a seed on tilled soil → it grows through stages → harvest
 * with the scythe for the crop item. Hay (feno) is the first crop/test.
 *
 * Integrates with: hoeTool (tilled tiles), seedWheel (active seed),
 * inventorySystem (consume seed / add crop). Updated + drawn by the game loop.
 * In-memory for now — save/load of crops is a later step.
 * @module CropSystem
 */

import { getSystem, registerSystem } from './gameState.js';
import { getItem } from './itemUtils.js';
import { inventorySystem } from './thePlayer/inventorySystem.js';
import { TILE_SIZE } from './worldConstants.js';

// Default lift: raises the plant from the tile's bottom edge so it sits
// centered-ish on the block (world px; ×zoom on screen). Per-crop `lift` in
// CROPS overrides this (lower value = sprite sits lower; can go negative).
const PLANT_LIFT_WORLD = 7.5;

// Crops run on the IN-GAME clock (#165), not real wall-clock — so they advance
// with the calendar and jump when the player sleeps. The time base is in-game
// MINUTES (from weather.getGameMinutes()); one in-game day = 1440 of them.
const DAY_MIN = 24 * 60;

// Water: a full watering (100) lasts cfg.waterDays in-game days, draining in
// two steps (100→50→0); per-crop so thirsty plants need more frequent watering
// and hardy roots hold longer. After fully dry, the plant withers a grace
// period later. Growth pauses while dry.
const WATER_DECAY_MIN = DAY_MIN; // grace ~1 in-game day at 0 water before withering

// Single-unit crops get a "luck" bonus: 51% chance the harvest yields 2 (#165).
const LUCK_DOUBLE_CHANCE = 0.51;

/** Current in-game time in minutes (monotonic; jumps on sleep). */
function _gameNow() {
    const w = getSystem('weather') || (typeof window !== 'undefined' ? window.WeatherSystem : null);
    if (w && typeof w.getGameMinutes === 'function') return w.getGameMinutes();
    // Fallback before weather is ready: approximate at the default game speed
    // (timeSpeed 2 → 2 in-game minutes per real second).
    return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000 * 2;
}

/** True when the weather waters crops (rain or storm). */
function _isRaining() {
    const w = getSystem('weather') || (typeof window !== 'undefined' ? window.WeatherSystem : null);
    const t = w?.weatherType;
    return t === 'rain' || t === 'storm';
}

/** Per-stage duration (in-game min) of initial growth (plant → mature). */
function _growthStageMin(cfg) { return (cfg.growthDays * DAY_MIN) / cfg.matureStage; }
/** Per-stage duration (in-game min) of regrow (harvest → mature again; faster). */
function _regrowStageMin(cfg) { return (cfg.regrowDays * DAY_MIN) / cfg.matureStage; }
/** One water step (100→50 or 50→0) in in-game min. Infinity for no-water crops. */
function _waterStepMin(cfg) {
    if (cfg.noWater || !cfg.waterDays) return Infinity;
    return (cfg.waterDays * DAY_MIN) / 2;
}

/**
 * Rolls a harvest quantity. A range [min,max] → random int in range; the
 * number 1 (single-unit crop) → the luck bonus (51% chance of 2); any other
 * fixed number → itself.
 */
function _rollYield(spec) {
    if (Array.isArray(spec)) {
        const [a, b] = spec;
        return a + Math.floor(Math.random() * (b - a + 1));
    }
    if (spec === 1) return Math.random() < LUCK_DOUBLE_CHANCE ? 2 : 1;
    return spec ?? 1;
}

// seedId → crop config. Frame rects measured from the sprite's alpha.
// Timing (#165 design): growthDays = plant→mature, regrowDays = harvest→mature
// again (faster). harvestYield: a number (fixed; 1 = single-unit → gets the
// luck bonus) or [min,max] (random range). Optional: noWater (grows without
// watering), bonusItem (extra drop, e.g. sunflower returns seeds).
const CROPS = {
    107: { // Grão de Feno → harvest gives raw hay (109); compact it (crafting) → Feno (29)
        name: 'Feno',
        harvestItem: 109,     // raw harvested hay (resource); NOT animal feed yet
        waterDays: 1.5,       // hardy grass — holds water a while
        sheet: 'assets/plantation/hay.webp',
        // [0] just planted, [1] growing, [2] grown (harvestable), [3] twig (post-harvest)
        frames: [
            { x: 0,  w: 11 },
            { x: 30, w: 14 },
            { x: 59, w: 22 },
            { x: 96, w: 11 },
        ],
        frameH: 28,
        matureStage: 2,       // frame index that is harvestable
        harvestedFrame: 3,    // frame shown after harvest
        harvestYield: [1, 2],
        growthDays: 4,
        regrowDays: 2,
    },
    // Issue #165 batch 1. Frame rects measured from each sheet's alpha; all use
    // the feno convention: [0] planted, [1] growing, [2] grown (harvestable),
    // [3] post-harvest twig.
    110: { // Pepino
        name: 'Pepino',
        harvestItem: 111,
        waterDays: 1,
        sheet: 'assets/plantation/cucumber.webp',
        frames: [{ x: 0, w: 17 }, { x: 29, w: 23 }, { x: 58, w: 30 }, { x: 91, w: 29 }],
        frameH: 29,
        lift: -1.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: [2, 3],
        growthDays: 6,
        regrowDays: 3,
    },
    112: { // Abacaxi
        name: 'Abacaxi',
        harvestItem: 113,
        waterDays: 1.5,       // tropical, holds water
        sheet: 'assets/plantation/pineapple.webp',
        frames: [{ x: 0, w: 11 }, { x: 26, w: 22 }, { x: 53, w: 30 }, { x: 85, w: 32 }],
        frameH: 24,
        lift: 4.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: 1, // single fruit per cycle (high value); luck bonus applies
        growthDays: 15,
        regrowDays: 6,
    },
    114: { // Matinho (grows left→right; last frame is post-harvest)
        name: 'Matinho',
        harvestItem: 115,
        sheet: 'assets/plantation/weed.webp',
        frames: [{ x: 0, w: 13 }, { x: 32, w: 13 }, { x: 61, w: 20 }, { x: 96, w: 14 }],
        frameH: 37,
        lift: 4.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: 1,
        growthDays: 2,
        regrowDays: 1,
        noWater: true, // spreads on its own — never needs watering
    },
    116: { // Girassol
        name: 'Girassol',
        harvestItem: 117,
        waterDays: 1.5,       // deep roots, drought-tolerant
        sheet: 'assets/plantation/sunflower.webp',
        frames: [{ x: 0, w: 11 }, { x: 25, w: 21 }, { x: 55, w: 25 }, { x: 96, w: 9 }],
        frameH: 34,
        lift: 4.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: [1, 1], // 1 flower (no luck), plus seeds via bonusItem
        bonusItem: { itemId: 116, yield: [2, 3] }, // returns its own seeds to replant
        growthDays: 8,
        regrowDays: 4,
    },
    // Issue #165 batch 2. Frame rects measured from each sheet's alpha.
    118: { // Abóbora
        name: 'Abóbora',
        harvestItem: 119,
        waterDays: 0.75,      // big thirsty fruit
        sheet: 'assets/plantation/pumpkin.webp',
        frames: [{ x: 0, w: 13 }, { x: 27, w: 22 }, { x: 57, w: 29 }, { x: 89, w: 29 }],
        frameH: 27,
        lift: -1.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: 1,
        growthDays: 12,
        regrowDays: 5,
    },
    120: { // Brócolis
        name: 'Brócolis',
        harvestItem: 121,
        waterDays: 1,
        sheet: 'assets/plantation/broccoli.webp',
        frames: [{ x: 0, w: 9 }, { x: 28, w: 16 }, { x: 59, w: 17 }, { x: 91, w: 17 }],
        frameH: 16,
        lift: 5.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: 1, // main floral head
        growthDays: 8,
        regrowDays: 4,
    },
    122: { // Beterraba
        name: 'Beterraba',
        harvestItem: 123,
        waterDays: 2,         // hardy root
        sheet: 'assets/plantation/beet.webp',
        frames: [{ x: 0, w: 6 }, { x: 16, w: 8 }, { x: 28, w: 12 }, { x: 46, w: 9 }],
        frameH: 18,
        lift: 4.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: 1,
        growthDays: 5,
        regrowDays: 3,
    },
    124: { // Cenoura
        name: 'Cenoura',
        harvestItem: 125,
        waterDays: 2,         // hardy root
        sheet: 'assets/plantation/carrot.webp',
        frames: [{ x: 0, w: 7 }, { x: 13, w: 12 }, { x: 28, w: 14 }, { x: 46, w: 11 }],
        frameH: 26,
        lift: 4.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: 1,
        growthDays: 7,
        regrowDays: 4,
    },
    // Issue #165 batch 3. Frame rects measured from each sheet's alpha.
    126: { // Uva
        name: 'Uva',
        harvestItem: 127,
        waterDays: 0.5,       // thirsty premium vine
        sheet: 'assets/plantation/grape.webp',
        frames: [{ x: 0, w: 13 }, { x: 32, w: 13 }, { x: 59, w: 24 }, { x: 91, w: 24 }],
        frameH: 37,
        lift: 4.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: [3, 4], // a full bunch
        growthDays: 20,
        regrowDays: 3, // big upfront cost, but rebrota fast
    },
    128: { // Pimentinha
        name: 'Pimentinha',
        harvestItem: 129,
        waterDays: 1,
        sheet: 'assets/plantation/chili.webp',
        frames: [{ x: 0, w: 12 }, { x: 29, w: 19 }, { x: 57, w: 23 }, { x: 90, w: 22 }],
        frameH: 30,
        lift: 4.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: [3, 5], // bush sprouts many peppers
        growthDays: 9,
        regrowDays: 3,
    },
    130: { // Pimentão
        name: 'Pimentão',
        harvestItem: 131,
        waterDays: 0.75,
        sheet: 'assets/plantation/bellPepper.webp',
        frames: [{ x: 0, w: 13 }, { x: 30, w: 20 }, { x: 57, w: 27 }, { x: 91, w: 25 }],
        frameH: 34,
        lift: 4.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: 2, // fixed; fewer than pimentinha but worth more each
        growthDays: 10,
        regrowDays: 4,
    },
    132: { // Couve-Flor
        name: 'Couve-Flor',
        harvestItem: 133,
        waterDays: 1,
        sheet: 'assets/plantation/cauliflower.webp',
        frames: [{ x: 0, w: 13 }, { x: 30, w: 19 }, { x: 61, w: 22 }, { x: 93, w: 22 }],
        frameH: 17,
        lift: 4.5,
        matureStage: 2,
        harvestedFrame: 3,
        harvestYield: 1, // main head
        growthDays: 8,
        regrowDays: 4,
    },
};

const cropSystem = {
    // tileKey "tx,ty" → { seedId, stage, nextStageAt, harvested }
    _crops: new Map(),
    _imgs: new Map(), // sheet src → Image

    _key(tx, ty) { return `${tx},${ty}`; },
    _snap(worldX, worldY) {
        return {
            x: Math.floor(worldX / TILE_SIZE) * TILE_SIZE,
            y: Math.floor(worldY / TILE_SIZE) * TILE_SIZE,
        };
    },

    /**
     * Plants the active seed on the tilled tile under the world point.
     * Requires: an active seed (seedWheel), the tile tilled (hoeTool), not
     * already planted, and a seed in the inventory (consumes 1).
     * @returns {boolean} true if it planted.
     */
    plantAt(worldX, worldY) {
        const seed = getSystem('seedWheel')?.getActiveSeed?.();
        if (!seed) return false;
        const cfg = CROPS[seed.id];
        if (!cfg) return false;

        const { x, y } = this._snap(worldX, worldY);
        if (!getSystem('hoeTool')?.isTilled?.(x, y)) return false;
        const key = this._key(x, y);
        if (this._crops.has(key)) return false;

        const have = inventorySystem.getItemQuantity?.(seed.id) ?? 0;
        if (have <= 0) return false;

        const now = _gameNow();
        const stageMin = _growthStageMin(cfg);
        const rec = {
            seedId: seed.id,
            stage: 0,
            nextStageAt: now + stageMin,
            harvested: false,
            water: 100,
            waterDropAt: now + _waterStepMin(cfg),
            decayAt: null,
            regrowAt: null,
            stageMin, // current per-stage duration (growth, then regrow cadence), in-game min
        };
        this._crops.set(key, rec);
        inventorySystem.removeItem?.(seed.id, 1);
        getSystem('player')?.consumeNeeds?.('planting'); // #165: planting costs energy
        return true;
    },

    /** Refills a crop's water to full and cancels any pending wither. */
    _water(rec, now) {
        rec.water = 100;
        rec.waterDropAt = now + _waterStepMin(CROPS[rec.seedId]);
        rec.decayAt = null;
    },

    /**
     * Waters the crop under the world point (watering can / future hooks).
     * @returns {boolean} true if a (non-harvested) crop was there and got watered.
     */
    waterAt(worldX, worldY) {
        const { x, y } = this._snap(worldX, worldY);
        const c = this._crops.get(this._key(x, y));
        if (!c || c.harvested) return false;
        this._water(c, _gameNow());
        return true;
    },

    /**
     * Save: all crops with timers as REMAINING in-game minutes (the in-game
     * clock resets on reload, so we re-anchor on restore). Generic — works for
     * any crop in CROPS, so future crops persist automatically. Per-save.
     */
    serialize() {
        const now = _gameNow();
        const out = [];
        for (const [key, c] of this._crops) {
            const comma = key.indexOf(',');
            const rel = (t) => (t != null && Number.isFinite(t) ? Math.max(0, Math.round(t - now)) : null);
            out.push({
                x: +key.slice(0, comma),
                y: +key.slice(comma + 1),
                seedId: c.seedId,
                stage: c.stage,
                harvested: !!c.harvested,
                water: c.water,
                stageMin: c.stageMin,
                stageRemaining: rel(c.nextStageAt),
                waterDropRemaining: rel(c.waterDropAt),
                decayRemaining: rel(c.decayAt),
                regrowRemaining: rel(c.regrowAt),
            });
        }
        return out;
    },

    /** Load: replaces all crops (clears first → no crossover). Skips unknown seedIds. */
    restore(list) {
        this._crops.clear();
        if (!Array.isArray(list)) return;
        const now = _gameNow();
        for (const c of list) {
            const cfg = CROPS[c?.seedId];
            if (typeof c?.x !== 'number' || typeof c?.y !== 'number' || !cfg) continue;
            const stageMin = typeof c.stageMin === 'number' ? c.stageMin : _growthStageMin(cfg);
            const abs = (rem, fb) => now + (typeof rem === 'number' ? rem : fb);
            this._crops.set(this._key(c.x, c.y), {
                seedId: c.seedId,
                stage: c.stage ?? 0,
                harvested: !!c.harvested,
                water: typeof c.water === 'number' ? c.water : 100,
                stageMin,
                nextStageAt: abs(c.stageRemaining, stageMin),
                waterDropAt: abs(c.waterDropRemaining, _waterStepMin(cfg)),
                decayAt: c.decayRemaining != null ? now + c.decayRemaining : null,
                regrowAt: c.regrowRemaining != null ? now + c.regrowRemaining : null,
            });
        }
    },

    /** True if a mature, not-yet-harvested crop sits under the world point. */
    isMatureAt(worldX, worldY) {
        const { x, y } = this._snap(worldX, worldY);
        const c = this._crops.get(this._key(x, y));
        if (!c || c.harvested) return false;
        return c.stage >= CROPS[c.seedId].matureStage;
    },

    /**
     * Harvests a mature crop under the world point → adds the crop item and
     * leaves the post-harvest frame (twig).
     * @returns {boolean} true if it harvested.
     */
    harvestAt(worldX, worldY) {
        const { x, y } = this._snap(worldX, worldY);
        const key = this._key(x, y);
        const c = this._crops.get(key);
        if (!c || c.harvested) return false;
        const cfg = CROPS[c.seedId];
        if (c.stage < cfg.matureStage) return false;
        inventorySystem.addItem?.(cfg.harvestItem, _rollYield(cfg.harvestYield));
        // Extra drop (e.g. sunflower returns seeds for replanting).
        if (cfg.bonusItem) inventorySystem.addItem?.(cfg.bonusItem.itemId, _rollYield(cfg.bonusItem.yield));
        // Leaves the twig (harvestedFrame) and regrows on the (faster) regrow
        // cadence: twig phase = one regrow step, then back through the stages.
        c.harvested = true;
        c.stageMin = _regrowStageMin(cfg);
        c.regrowAt = _gameNow() + c.stageMin;
        return true;
    },

    /**
     * Advances growth + water/decay on the in-game clock. Water steps down over
     * time; growth runs only while water > 0; a dry plant withers after
     * WATER_DECAY_MIN. Rain refills water. The while-loops absorb large clock
     * jumps (e.g. sleeping), so crops catch up across a skipped night.
     */
    update() {
        if (this._crops.size === 0) return;
        const now = _gameNow();
        const raining = _isRaining();

        for (const [key, c] of this._crops) {
            const cfg = CROPS[c.seedId];

            // Harvested → twig phase, then regrow (young → mature again).
            if (c.harvested) {
                if (c.regrowAt != null && now >= c.regrowAt) {
                    c.harvested = false;
                    c.stage = 1; // regrow from "young"
                    c.nextStageAt = now + c.stageMin; // regrow cadence (set at harvest)
                    c.regrowAt = null;
                    this._water(c, now); // fresh regrowth starts watered
                }
                continue;
            }

            // No-water crops (e.g. matinho) just grow — skip the water mechanic.
            if (cfg.noWater) {
                while (c.stage < cfg.matureStage && now >= c.nextStageAt) {
                    c.stage++;
                    c.nextStageAt += c.stageMin;
                }
                continue;
            }

            // Rain keeps it solidly at full (refill every tick so it can't dip).
            if (raining) this._water(c, now);

            // Water depletion: 100 → 50 → 0.
            while (c.water > 0 && now >= c.waterDropAt) {
                c.water = Math.max(0, c.water - 50);
                c.waterDropAt += _waterStepMin(cfg);
                if (c.water === 0) c.decayAt = now + WATER_DECAY_MIN;
            }

            if (c.water > 0) {
                // Grow only while watered.
                while (c.stage < cfg.matureStage && now >= c.nextStageAt) {
                    c.stage++;
                    c.nextStageAt += c.stageMin;
                }
            } else {
                // Dry: pause growth (don't let it burst-grow when rewatered)…
                if (now >= c.nextStageAt) c.nextStageAt = now + c.stageMin;
                // …and wither if dry too long.
                if (c.decayAt != null && now >= c.decayAt) this._crops.delete(key);
            }
        }
    },

    _img(src) {
        let im = this._imgs.get(src);
        if (!im) { im = new Image(); im.src = src; this._imgs.set(src, im); }
        return im;
    },

    /**
     * Draws each crop's current frame, bottom-anchored and centered on its tile
     * (taller plants grow up from the tile). Ground layer, viewport-culled.
     */
    drawCrops(ctx, camera) {
        if (!ctx || !camera || this._crops.size === 0) return;
        const z = camera.zoom;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (const [key, c] of this._crops) {
            const comma = key.indexOf(',');
            const tx = +key.slice(0, comma);
            const ty = +key.slice(comma + 1);
            if (camera.isInViewport && !camera.isInViewport(tx, ty, TILE_SIZE, TILE_SIZE)) continue;

            const cfg = CROPS[c.seedId];
            const img = this._img(cfg.sheet);
            if (!(img.complete && img.naturalWidth > 0)) continue;

            const frame = cfg.frames[c.harvested ? cfg.harvestedFrame : c.stage];
            if (!frame) continue;

            const destW = frame.w * z;
            const destH = cfg.frameH * z;
            // Anchor bottom-center on the tile, lifted a bit so it reads as
            // centered on the block (not hanging off the bottom edge).
            const lift = (typeof cfg.lift === 'number' ? cfg.lift : PLANT_LIFT_WORLD);
            const sp = camera.worldToScreen(tx + TILE_SIZE / 2, ty + TILE_SIZE);
            const dx = Math.round(sp.x - destW / 2);
            const dy = Math.round(sp.y - destH - lift * z);
            ctx.drawImage(img, frame.x, 0, frame.w, cfg.frameH, dx, dy, destW, destH);
        }
        ctx.restore();
    },

    /**
     * Planting cursor: a tile-aligned square shown while a seed is selected
     * (mirrors the hoe cursor). Green = plantable here (tilled + empty),
     * red = not. Drawn by the game loop, like the hoe cursor.
     */
    drawPlantCursor(ctx, camera) {
        if (!ctx || !camera) return;
        if (!getSystem('seedWheel')?.getActiveSeed?.()) return;
        // Watering can equipped → clicking waters, not plants; show its cursor instead.
        const eq = getSystem('player')?.getEquippedItem?.();
        if (eq && getItem(eq.id ?? eq)?.toolType === 'watering_can') return;
        const hoe = getSystem('hoeTool');
        const tile = hoe?.cursorTile?.();
        if (!tile) return;

        const plantable = !!hoe.isTilled?.(tile.x, tile.y) && !this._crops.has(this._key(tile.x, tile.y));
        const sp = camera.worldToScreen(tile.x, tile.y);
        const size = TILE_SIZE * camera.zoom;
        const x = Math.round(sp.x);
        const y = Math.round(sp.y);

        ctx.save();
        if (plantable) {
            ctx.fillStyle = 'rgba(110, 200, 120, 0.22)';
            ctx.strokeStyle = 'rgba(120, 230, 130, 0.95)';
        } else {
            ctx.fillStyle = 'rgba(200, 90, 70, 0.15)';
            ctx.strokeStyle = 'rgba(220, 110, 80, 0.85)';
        }
        ctx.lineWidth = Math.max(1, 2 * camera.zoom);
        ctx.fillRect(x, y, size, size);
        ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
        ctx.restore();
    },

    /**
     * Hover tooltip over a crop: its name + a vitality (water) bar with 3
     * levels — 100 (watered, green), 50 (still has water, amber), 0 (needs
     * water, red). Drawn by the game loop. Fixed screen-px size.
     */
    drawCropTooltip(ctx, camera) {
        if (!ctx || !camera) return;
        const tile = getSystem('hoeTool')?.cursorTile?.();
        if (!tile) return;
        const c = this._crops.get(this._key(tile.x, tile.y));
        if (!c) return;

        const cfg = CROPS[c.seedId];
        const name = cfg.name || getItem(cfg.harvestItem)?.name || 'Plantação';

        const sp = camera.worldToScreen(tile.x + TILE_SIZE / 2, tile.y);
        const cx = Math.round(sp.x);
        const boxW = 78;
        const boxH = 34;
        const pad = 6;
        const bx = Math.round(cx - boxW / 2);
        const by = Math.round(sp.y) - 16 - boxH;

        ctx.save();
        // Box.
        ctx.fillStyle = 'rgba(20, 15, 8, 0.92)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = 'rgba(201, 164, 99, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

        // Name.
        ctx.fillStyle = '#f3dcc0';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(name, cx, by + pad - 3);

        // Vitality bar.
        const barW = boxW - pad * 2;
        const barH = 6;
        const barX = bx + pad;
        const barY = by + boxH - pad - barH;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(barX, barY, barW, barH);
        const color = c.water >= 100 ? '#5fd97a' : (c.water >= 50 ? '#e6c04a' : '#e0563f');
        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, Math.round(barW * (c.water / 100)), barH);
        // Tick at the 50 mark.
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.moveTo(barX + barW / 2, barY);
        ctx.lineTo(barX + barW / 2, barY + barH);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(201, 164, 99, 0.9)';
        ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);
        ctx.restore();
    },
};

registerSystem('crop', cropSystem);

export default cropSystem;
