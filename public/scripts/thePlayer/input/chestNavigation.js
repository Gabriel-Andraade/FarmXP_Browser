/**
 * @file chestNavigation.js - Driving a chest with a controller (#264).
 *
 * The same two steps as the warehouse, because it is the same job: pick the
 * item, then say how many.
 *
 *   LT / RT              the chest / your bag
 *   LB / RB              previous / next category — the chest side only
 *   D-pad / left stick   walk the items
 *   A                    open the amount on that item
 *   then  D-pad ← →      one fewer / one more
 *         A              take it, or put it in
 *         B              back to the items
 *   B                    close the chest
 */
import { ACTION, firedAction } from './bindings.js';
import { onScreen, stepStrip, gridStep, focusAndMark } from './panels.js';

export function isChest(panel) {
    return panel?.id === 'cht-panel';
}

const SIDES = {
    chest: { items: '.cht-slot', categories: '.cht-category-btn' },
    bag: { items: '.cht-inventory-item', categories: null },
};

/** Which side the highlight is on. The chest, until LT/RT says otherwise. */
let side = 'chest';

/** The item whose amount is open, or null while walking the items. */
let armed = null;

export function resetChest() {
    side = 'chest';
    armed = null;
}

export function currentSide() {
    return side;
}

export function armedItem() {
    return armed;
}

function itemsIn(panel, which = side) {
    return [...panel.querySelectorAll(SIDES[which].items)].filter(onScreen);
}

function focusFirstItem(panel, which = side) {
    const place = () => {
        const items = itemsIn(panel, which);
        if (items.length) focusAndMark(items[0]);
    };
    // Switching side or category redraws the list; reading it in the same tick
    // finds the nodes that are about to be replaced.
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(place);
    else place();
}

/**
 * @returns {boolean} true while an amount is open — then the D-pad changes the
 *   number instead of walking the items.
 */
export function driveChest(panel, pressed) {
    if (armed) {
        if (firedAction(pressed, ACTION.NAV_RIGHT)) armed.querySelector('.cht-qty-step[data-step="1"]')?.click();
        if (firedAction(pressed, ACTION.NAV_LEFT)) armed.querySelector('.cht-qty-step[data-step="-1"]')?.click();
        // Changing side or category would redraw the list and leave the open
        // amount pointing at an item that is no longer there.
        return true;
    }

    if (firedAction(pressed, ACTION.PANE_LEFT) && side !== 'chest') {
        side = 'chest';
        focusFirstItem(panel);
    }
    if (firedAction(pressed, ACTION.PANE_RIGHT) && side !== 'bag') {
        side = 'bag';
        focusFirstItem(panel);
    }

    // Only the chest sorts its contents into categories; on your own bag the
    // shoulder buttons do nothing rather than reaching across to the other side.
    const categories = SIDES[side].categories;
    const step = firedAction(pressed, ACTION.TAB_NEXT) ? 1
        : firedAction(pressed, ACTION.TAB_PREV) ? -1 : 0;
    if (categories && step && stepStrip(panel, categories, step)) {
        focusFirstItem(panel);
    }

    return false;
}

/** The first item, rather than the close button above it. */
export function chestEntry(panel) {
    return itemsIn(panel)[0] ?? null;
}

export function moveChestFocus(panel, dir, focused) {
    if (armed) return false;                    // the D-pad is the amount's
    const items = itemsIn(panel);
    const next = gridStep(items, items.indexOf(focused), dir);
    if (!next) return false;
    focusAndMark(next);
    return true;
}

/**
 * A: open the amount on the highlighted item, then move that many.
 * @returns {boolean} true when it handled the press
 */
export function confirmChest(panel, focused) {
    if (armed) {
        armed.querySelector('.cht-qty-action')?.click();
        armed = null;
        // The transfer redraws both sides: the stack changed, and the item may
        // be gone from this one altogether.
        focusFirstItem(panel);
        return true;
    }

    const item = itemsIn(panel).find((el) => el === focused);
    if (!item) return false;
    armed = item;
    const field = item.querySelector('.cht-qty-input');
    if (field) focusAndMark(field);
    return true;
}

/**
 * B: one step back — the amount first, the chest only after.
 * @returns {boolean} true when it handled the press
 */
export function backChest() {
    if (!armed) return false;
    const item = armed;
    armed = null;
    focusAndMark(item);
    return true;
}

export default {
    isChest, driveChest, chestEntry, moveChestFocus, confirmChest, backChest,
    resetChest, currentSide, armedItem,
};
