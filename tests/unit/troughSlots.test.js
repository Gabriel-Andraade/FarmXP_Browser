import { describe, test, expect } from 'bun:test';
import {
    createSlotRegistry,
    slotWorldRects,
    troughStandPosition,
    TROUGH_SLOT_COUNT,
} from '../../public/scripts/animal/troughSlots.js';

describe('troughSlots — createSlotRegistry', () => {
    test('claim reserves a slot; re-claim by same animal is idempotent', () => {
        const r = createSlotRegistry();
        expect(r.claimSlot('t1', 0, 'a')).toBe(true);
        expect(r.claimSlot('t1', 0, 'a')).toBe(true); // same animal, ok
        expect(r.claimSlot('t1', 0, 'b')).toBe(false); // taken by a
    });

    test('out-of-range slot index is rejected', () => {
        const r = createSlotRegistry();
        expect(r.claimSlot('t1', -1, 'a')).toBe(false);
        expect(r.claimSlot('t1', TROUGH_SLOT_COUNT, 'a')).toBe(false);
    });

    test('releaseSlot frees only when the animal owns it', () => {
        const r = createSlotRegistry();
        r.claimSlot('t1', 1, 'a');
        r.releaseSlot('t1', 1, 'b'); // not owner — no-op
        expect(r.claimSlot('t1', 1, 'b')).toBe(false);
        r.releaseSlot('t1', 1, 'a'); // owner — frees
        expect(r.claimSlot('t1', 1, 'b')).toBe(true);
    });

    test('releaseAllSlotsFor frees the animal across every trough', () => {
        const r = createSlotRegistry();
        r.claimSlot('t1', 0, 'a');
        r.claimSlot('t2', 2, 'a');
        r.claimSlot('t1', 1, 'b');
        r.releaseAllSlotsFor('a');
        expect(r.claimSlot('t1', 0, 'x')).toBe(true);
        expect(r.claimSlot('t2', 2, 'x')).toBe(true);
        expect(r.claimSlot('t1', 1, 'x')).toBe(false); // b still holds it
    });

    test('separate registries are isolated (food vs water must not share)', () => {
        const food = createSlotRegistry();
        const water = createSlotRegistry();
        food.claimSlot('shared-id', 0, 'a');
        // Same trough id, different registry → still free.
        expect(water.claimSlot('shared-id', 0, 'b')).toBe(true);
    });

    // Mirrors findFreeSlotIn: grab the first free slot index, or -1.
    function claimAnyFree(reg, troughId, animalId) {
        for (let i = 0; i < TROUGH_SLOT_COUNT; i++) {
            if (reg.claimSlot(troughId, i, animalId)) return i;
        }
        return -1;
    }

    test('6 animals at one trough: 3 eat at once, the rest wait then eat in waves', () => {
        const r = createSlotRegistry();
        const trough = 't1';
        const herd = ['a', 'b', 'c', 'd', 'e', 'f'];

        // First wave: only 3 can claim a slot (1 per compartment).
        const wave1 = herd.map((id) => claimAnyFree(r, trough, id));
        expect(wave1.slice(0, 3)).toEqual([0, 1, 2]); // a,b,c get the 3 slots
        expect(wave1.slice(3)).toEqual([-1, -1, -1]); // d,e,f must wait

        // a & b finish eating and release → 2 slots open up.
        r.releaseSlot(trough, 0, 'a');
        r.releaseSlot(trough, 1, 'b');

        // Next wave: 2 waiters claim the freed slots; the last still waits.
        expect(claimAnyFree(r, trough, 'd')).toBe(0);
        expect(claimAnyFree(r, trough, 'e')).toBe(1);
        expect(claimAnyFree(r, trough, 'f')).toBe(-1); // c still holds slot 2

        // c finishes → f finally gets in. All 6 have eaten over the waves.
        r.releaseSlot(trough, 2, 'c');
        expect(claimAnyFree(r, trough, 'f')).toBe(2);
    });
});

describe('troughSlots — slotWorldRects', () => {
    test('maps ratio configs to world rects on the trough', () => {
        const trough = { x: 100, y: 200, width: 64, height: 32 };
        const cfgs = [{ offsetX: 0.5, offsetY: 0.25, w: 0.5, h: 0.5 }];
        expect(slotWorldRects(trough, cfgs)).toEqual([
            { idx: 0, x: 100 + 32, y: 200 + 8, w: 32, h: 16 },
        ]);
    });

    test('returns [] for missing trough or configs', () => {
        expect(slotWorldRects(null, [])).toEqual([]);
        expect(slotWorldRects({ x: 0, y: 0, width: 1, height: 1 }, null)).toEqual([]);
    });
});

describe('troughSlots — troughStandPosition', () => {
    const trough = { x: 100, y: 200, width: 64, height: 20 };
    const slot = { x: 116, y: 205, w: 18, h: 10 }; // center (125, 210)
    const animal = { x: 0, y: 0, collisionBox: { offsetX: 2, offsetY: 6, width: 16, height: 10 } };

    test('horizontal, animal above → stands above with facing down', () => {
        const pos = troughStandPosition(trough, slot, { ...animal, y: 0 }, true);
        // x: slotCx - cbX - cbW/2 = 125 - 2 - 8 = 115; y: trough.y - GAP - cbY - cbH = 200-2-6-10 = 182
        expect(pos).toEqual({ x: 115, y: 182, facing: 'down' });
    });

    test('vertical, animal left → stands left with facing right', () => {
        const vTrough = { x: 100, y: 200, width: 20, height: 64 };
        const vSlot = { x: 105, y: 216, w: 10, h: 18 }; // center (110, 225)
        const pos = troughStandPosition(vTrough, vSlot, { ...animal, x: 0 }, false);
        // x: trough.x - GAP - cbX - cbW = 100-2-2-16 = 80; y: slotCy - cbY - cbH/2 = 225-6-5 = 214
        expect(pos).toEqual({ x: 80, y: 214, facing: 'right' });
    });
});
