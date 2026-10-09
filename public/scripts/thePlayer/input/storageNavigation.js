/**
 * @file storageNavigation.js - Driving the warehouse with a controller (#264).
 *
 * Two steps, the same shape as taking something at the market: pick the item,
 * then say how many.
 *
 *   LT / RT              take out / put in
 *   LB / RB              previous / next category
 *   D-pad / left stick   walk the items
 *   A                    open the amount on that item
 *   then  D-pad ← →      one fewer / one more
 *         A              take it out, or put it in
 *         B              back to the items
 *   B                    close the warehouse
 *
 * The search box is left to the mouse and the keyboard for now: typing is not
 * something a controller should be asked to do with a highlight.
 */
import { ACTION, firedAction } from './bindings.js';
import { onScreen, stepStrip, gridStep, focusAndMark } from './panels.js';

export function isStorage(panel) {
    return panel?.classList?.contains('storage-modal') === true;
}

/**
 * The item whose amount is open, or null while walking the items.
 *
 * Kept here rather than read back from the DOM because "the amount is open" is
 * not something the warehouse itself records — for the mouse it is simply where
 * the pointer happens to be.
 */
let armed = null;

export function armedSlot() {
    return armed;
}

export function resetStorage() {
    armed = null;
}

function slotsIn(panel) {
    return [...panel.querySelectorAll('.storage-slot')].filter(onScreen);
}

function amountField(slot) {
    return slot?.querySelector('.qty-input') ?? null;
}

/** Puts the highlight back on the items, once the grid has redrawn. */
function focusFirstSlot(panel) {
    const place = () => {
        const first = slotsIn(panel)[0];
        if (first) focusAndMark(first);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(place);
    else place();
}

/**
 * @returns {boolean} true while an amount is open — then the D-pad changes the
 *   number instead of walking the grid.
 */
export function driveStorage(panel, pressed) {
    if (armed) {
        if (firedAction(pressed, ACTION.NAV_RIGHT)) armed.querySelector('.qty-step[data-step="1"]')?.click();
        if (firedAction(pressed, ACTION.NAV_LEFT)) armed.querySelector('.qty-step[data-step="-1"]')?.click();
        // Changing the tab or the category here would rebuild the grid and throw
        // away the item the open amount belongs to, so they are ignored until
        // the player is done with it.
        return true;
    }

    const tab = firedAction(pressed, ACTION.PANE_LEFT) ? 'withdraw'
        : firedAction(pressed, ACTION.PANE_RIGHT) ? 'deposit' : null;
    if (tab) {
        const button = panel.querySelector(`.storage-tab[data-tab="${tab}"]`);
        if (button && !button.classList.contains('active')) {
            button.click();
            focusFirstSlot(panel);
        }
    }

    const step = firedAction(pressed, ACTION.TAB_NEXT) ? 1
        : firedAction(pressed, ACTION.TAB_PREV) ? -1 : 0;
    if (step && stepStrip(panel, '.storage-category-btn', step)) {
        focusFirstSlot(panel);
    }

    return false;
}

/** The first item, rather than the close button or the tabs above it. */
export function storageEntry(panel) {
    return slotsIn(panel)[0] ?? null;
}

export function moveStorageFocus(panel, dir, focused) {
    if (armed) return false;                    // the D-pad is the amount's
    const slots = slotsIn(panel);
    const next = gridStep(slots, slots.indexOf(focused), dir);
    if (!next) return false;
    focusAndMark(next);
    return true;
}

/**
 * A: open the amount on the highlighted item, then take or put that many.
 * @returns {boolean} true when it handled the press
 */
export function confirmStorage(panel, focused) {
    if (armed) {
        armed.querySelector('.withdraw-btn, .deposit-btn')?.click();
        armed = null;
        // Acting on an item redraws the grid — its stack changed, and it may be
        // gone from this tab altogether.
        focusFirstSlot(panel);
        return true;
    }

    const slot = slotsIn(panel).find((s) => s === focused);
    if (!slot) return false;
    armed = slot;
    // The highlight goes to the number, which is the thing about to change.
    const field = amountField(slot);
    if (field) focusAndMark(field);
    return true;
}

/**
 * B: one step back. Closing the amount first, the warehouse only after.
 * @returns {boolean} true when it handled the press
 */
export function backStorage(panel) {
    if (!armed) return false;                   // let the modal close as usual
    const slot = armed;
    armed = null;
    focusAndMark(slot);
    return true;
}

export default {
    isStorage, driveStorage, storageEntry, moveStorageFocus,
    confirmStorage, backStorage, resetStorage, armedSlot,
};
