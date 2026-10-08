/**
 * @file marketNavigation.js - Driving the market with a controller (#264).
 *
 * The market is the first screen whose grammar does not fit "move the highlight,
 * press A". It is two panes with their own tabs plus a direction in the middle,
 * and reading all of that from one highlight would mean walking the stick
 * through a tab strip to reach an item. So the panel takes the shoulder buttons
 * and the D-pad, and the stick is left to do one job: walk the items.
 *
 *   LT / RT          which pane the highlight is in — the bags, or the stock
 *   LB / RB          previous / next category, of the pane you are in
 *   D-pad up / down  sell / buy, applied on the press, with nothing to confirm
 *   D-pad left/right inventory / warehouse — the player's pane only
 *   left stick       walk the items of the pane you are in
 *   A                take the item under the highlight
 *
 * Nothing here reaches into the market's state. Every one of these clicks the
 * control the mouse would click, so the market keeps deciding what each one
 * means and this file cannot drift away from it.
 */
import { ACTION, firedAction } from './bindings.js';
import { focusAndMark, onScreen, stepStrip, gridStep } from './panels.js';

/** @param {Element|null} panel */
export function isMarket(panel) {
    return panel?.id === 'commerceModal';
}

const PANES = {
    player: {
        grid: '#playerItemsGrid',
        items: '.mch-hexagon-slot[data-item-id]',
        categories: '.mch-player-category-btn',
        tabs: '.mch-storage-toggle-btn',
    },
    merchant: {
        grid: '#merchantItemsGrid',
        items: '.mch-merchant-hexagon[data-item-id]',
        categories: '.mch-merchant-category-btn',
        tabs: null,            // the trader has no inventory/warehouse split
    },
};

/** Which pane the highlight is in. The bags, until LT/RT says otherwise. */
let pane = 'player';

/** The market reopens on the player's side, wherever it was left. */
export function resetMarket() {
    pane = 'player';
}

export function currentPane() {
    return pane;
}

function itemsIn(panel, which = pane) {
    const { grid, items } = PANES[which];
    const root = panel.querySelector(grid);
    return [...(root?.querySelectorAll(items) ?? [])].filter(onScreen);
}

/** Puts the highlight on the first item of a pane, once the grid has redrawn. */
function focusFirstItem(panel, which = pane) {
    const place = () => {
        const items = itemsIn(panel, which);
        if (items.length) focusAndMark(items[0]);
    };
    // Changing a category or a tab rebuilds the grid; reading it in the same
    // tick finds the old nodes, already detached.
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(place);
    else place();
}

/**
 * The market's own buttons for this frame.
 * @returns {boolean} true when the panel owns the D-pad this frame
 */
export function driveMarket(panel, pressed) {
    if (firedAction(pressed, ACTION.PANE_LEFT) && pane !== 'player') {
        pane = 'player';
        focusFirstItem(panel);
    }
    if (firedAction(pressed, ACTION.PANE_RIGHT) && pane !== 'merchant') {
        pane = 'merchant';
        focusFirstItem(panel);
    }

    // Categories belong to the pane you are in: on the trader's side LB and RB
    // walk their stock filters, not the player's.
    const category = firedAction(pressed, ACTION.TAB_NEXT) ? 1
        : firedAction(pressed, ACTION.TAB_PREV) ? -1 : 0;
    if (category && stepStrip(panel, PANES[pane].categories, category)) {
        focusFirstItem(panel);
    }

    // Up is the green arrow and down is the red one, the way they sit on the
    // screen. The press applies it — there is nothing to confirm, because the
    // direction is not a choice you make and then commit.
    if (firedAction(pressed, ACTION.NAV_UP)) clickArrow(panel, 'sell');
    if (firedAction(pressed, ACTION.NAV_DOWN)) clickArrow(panel, 'buy');

    // Inventory / warehouse, and only for the player: the trader's pane has no
    // such split, so sideways does nothing there rather than something surprising.
    const tabs = PANES[pane].tabs;
    const sideways = firedAction(pressed, ACTION.NAV_RIGHT) ? 1
        : firedAction(pressed, ACTION.NAV_LEFT) ? -1 : 0;
    if (tabs && sideways && stepStrip(panel, tabs, sideways)) {
        focusFirstItem(panel);
    }

    return true;
}

function clickArrow(panel, mode) {
    const arrow = panel.querySelector(`.mch-trade-arrow.mch-${mode}-arrow`);
    if (!arrow) return;
    arrow.click();
    // Switching direction clears the selection and redraws both grids.
    focusFirstItem(panel);
}

/**
 * Walks the items of the current pane with the stick.
 * @returns {boolean} true when it moved
 */
export function moveMarketFocus(panel, dir, focused) {
    const items = itemsIn(panel);
    const next = gridStep(items, items.indexOf(focused), dir);
    if (!next) return false;
    focusAndMark(next);
    return true;
}

/** Where the highlight goes when the market opens. */
export function marketEntry(panel) {
    return itemsIn(panel)[0] ?? null;
}

// ── How many ───────────────────────────────────────────────────────────────
//
// Taking an item asks how many, in a small panel over the middle of the market.
// Its grammar is the same whichever way the goods are going:
//
//   D-pad left / right   one fewer / one more
//   A                    confirm
//   B                    cancel
//
// The quantity is on the D-pad and the decision is on the buttons, so the
// highlight never has to visit the − and + to change a number.

export function isTradeConfirm(panel) {
    return panel?.id === 'tradeConfirmModal';
}

/** Both halves of one deal, so the pane survives the trip through the modal. */
export function inMarketFlow(panel) {
    return isMarket(panel) || isTradeConfirm(panel);
}

export function driveTradeConfirm(panel, pressed) {
    if (firedAction(pressed, ACTION.NAV_RIGHT)) panel.querySelector('#quantityIncreaseBtn')?.click();
    if (firedAction(pressed, ACTION.NAV_LEFT)) panel.querySelector('#quantityDecreaseBtn')?.click();
    return true;
}

/** Confirm is what the highlight rests on: saying yes is the common case. */
export function tradeConfirmEntry(panel) {
    return panel.querySelector('.mch-confirm-yes') ?? null;
}

/**
 * Only the two decisions are walkable.
 *
 * The − and + are focusable buttons like any other, and letting the highlight
 * reach them would mean A sometimes changed the amount instead of agreeing to
 * the deal — with the D-pad already changing it, there is nothing to gain.
 */
export function moveTradeConfirmFocus(panel, dir, focused) {
    const buttons = [...panel.querySelectorAll('.mch-confirm-btn')].filter(onScreen);
    if (buttons.length < 2) return false;
    const current = buttons.indexOf(focused);
    const step = (dir === 'ArrowRight' || dir === 'ArrowDown') ? 1 : -1;
    const next = current < 0 ? 0 : (current + step + buttons.length) % buttons.length;
    focusAndMark(buttons[next]);
    return true;
}

export function cancelTrade(panel) {
    const no = panel.querySelector('.mch-confirm-no');
    if (!no) return false;
    no.click();
    return true;
}

/**
 * Taking the item under the highlight.
 *
 * Two clicks, not one: the market selects on the item and opens the amount from
 * the trade button, and that button is rebuilt by the selection — so the second
 * click waits for it. Disabled is a real answer here (nothing to trade, or the
 * trader cannot cover it) and leaves the item merely selected, which is what the
 * mouse does too.
 *
 * @returns {boolean} true when it handled the press
 */
export function confirmMarketItem(panel, focused) {
    if (!itemsIn(panel).includes(focused)) return false;
    focused.click();

    const openAmount = () => panel.querySelector('#tradeButton:not([disabled])')?.click();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(openAmount);
    else openAmount();
    return true;
}

export default {
    isMarket, driveMarket, moveMarketFocus, marketEntry, resetMarket, currentPane,
    isTradeConfirm, inMarketFlow, driveTradeConfirm, tradeConfirmEntry,
    moveTradeConfirmFocus, cancelTrade, confirmMarketItem,
};
