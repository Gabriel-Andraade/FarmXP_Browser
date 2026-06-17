/**
 * @file troughSlots.js - Shared slot machinery for food & water troughs.
 * @description Both troughs expose 3 slots so multiple animals can feed/drink
 * side by side without overlapping. The occupancy bookkeeping, the slot→world
 * rect mapping, and the "where does the animal stand" geometry were duplicated
 * almost verbatim between foodTroughSystem.js and waterTroughSystem.js. This
 * module is the single source of truth.
 *
 * IMPORTANT: food and water keep SEPARATE occupancy — each system creates its
 * own `createSlotRegistry()` instance (its own Map). They must never share one.
 * @module TroughSlots
 */

export const TROUGH_SLOT_COUNT = 3;

/**
 * Creates an isolated slot-occupancy registry: a `troughId -> [animalId|null]`
 * map plus claim/release helpers. One instance per trough system.
 * @param {number} [slotCount=TROUGH_SLOT_COUNT]
 */
export function createSlotRegistry(slotCount = TROUGH_SLOT_COUNT) {
    const occupancy = new Map(); // troughId -> Array<animalId|null> (length slotCount)

    function occupancyFor(troughId) {
        let arr = occupancy.get(troughId);
        if (!arr) {
            arr = new Array(slotCount).fill(null);
            occupancy.set(troughId, arr);
        }
        return arr;
    }

    return {
        /** Raw map — read-only iteration (e.g. debug overlays counting occupied slots). */
        occupancy,
        occupancyFor,

        /**
         * Reserve a slot for the animal. Idempotent (re-claim by same animal =
         * ok). Fails (false) if another animal owns it.
         */
        claimSlot(troughId, slotIdx, animalId) {
            if (slotIdx < 0 || slotIdx >= slotCount) return false;
            const occ = occupancyFor(troughId);
            if (occ[slotIdx] != null && occ[slotIdx] !== animalId) return false;
            occ[slotIdx] = animalId;
            return true;
        },

        /** Release the slot only if `animalId` owns it (safe otherwise). */
        releaseSlot(troughId, slotIdx, animalId) {
            if (slotIdx < 0 || slotIdx >= slotCount) return;
            const occ = occupancy.get(troughId);
            if (!occ) return;
            if (occ[slotIdx] === animalId) occ[slotIdx] = null;
        },

        /** Free every slot held by this animal (cleanup on death / state escape). */
        releaseAllSlotsFor(animalId) {
            for (const [, occ] of occupancy) {
                for (let i = 0; i < occ.length; i++) {
                    if (occ[i] === animalId) occ[i] = null;
                }
            }
        },
    };
}

/**
 * Maps slot config ratios to world-space rects on a given trough.
 * Each slot config is `{ offsetX, offsetY, w, h }` (fractions of trough size).
 * @returns {Array<{idx:number,x:number,y:number,w:number,h:number}>}
 */
export function slotWorldRects(trough, slotConfigs) {
    if (!trough || !Array.isArray(slotConfigs)) return [];
    return slotConfigs.map((s, idx) => ({
        idx,
        x: trough.x + trough.width * s.offsetX,
        y: trough.y + trough.height * s.offsetY,
        w: trough.width * s.w,
        h: trough.height * s.h,
    }));
}

/**
 * Where the animal must stand to use a slot: its collision box flush against
 * the OUTSIDE trough edge nearest the slot, perpendicular to the long axis,
 * aligned with the slot center. Uses the collision box (real body) not the
 * sprite, so big sprites with small bodies (Bull) still touch the trough.
 * @param {boolean} isHorizontal - trough laid out along X (slots side by side).
 * @param {number} [gap=2] - px gap between body and trough edge.
 * @returns {{x:number,y:number,facing:string}}
 */
export function troughStandPosition(trough, slot, animal, isHorizontal, gap = 2) {
    const slotCx = slot.x + slot.w / 2;
    const slotCy = slot.y + slot.h / 2;

    const cb = animal?.collisionBox
        || { offsetX: 0, offsetY: 0, width: animal?.width || 32, height: animal?.height || 32 };
    const cbX = cb.offsetX || 0;
    const cbY = cb.offsetY || 0;
    const cbW = cb.width  || animal?.width  || 32;
    const cbH = cb.height || animal?.height || 32;

    if (isHorizontal) {
        const fromAbove = (animal?.y ?? 0) < slotCy;
        return {
            x: slotCx - cbX - cbW / 2,
            y: fromAbove
                ? (trough.y - gap - cbY - cbH)
                : (trough.y + trough.height + gap - cbY),
            facing: fromAbove ? 'down' : 'up',
        };
    }
    const fromLeft = (animal?.x ?? 0) < slotCx;
    return {
        x: fromLeft
            ? (trough.x - gap - cbX - cbW)
            : (trough.x + trough.width + gap - cbX),
        y: slotCy - cbY - cbH / 2,
        facing: fromLeft ? 'right' : 'left',
    };
}
