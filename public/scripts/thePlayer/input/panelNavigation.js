/**
 * @file panelNavigation.js - Driving a panel without a pointer (#264).
 *
 * Moving DOM focus, not synthesising Arrow keys: only the pause menu ever
 * handled arrows — it was written that way — and every other panel responds to
 * Tab and clicks. Focus is what Enter activates and what `:focus-visible`
 * highlights, both already styled across the game, so this works in panels
 * nobody adapted.
 */
import {
    openPanel, focusableIn, focusAndMark, deepActiveElement, onScreen, isBlocking,
} from './panels.js';
import { getSystem } from '../../gameState.js';
import {
    isMarket, driveMarket, moveMarketFocus, marketEntry, resetMarket,
    isTradeConfirm, inMarketFlow, driveTradeConfirm, tradeConfirmEntry,
    moveTradeConfirmFocus, cancelTrade, confirmMarketItem,
} from './marketNavigation.js';
import {
    isCrafting, driveCrafting, craftingEntry, moveCraftingFocus, confirmCrafting,
} from './craftingNavigation.js';
import {
    isStorage, driveStorage, storageEntry, moveStorageFocus,
    confirmStorage, backStorage, resetStorage,
} from './storageNavigation.js';
import { isDialogue, driveDialogue, hasButtonChoices } from './dialogueNavigation.js';
import {
    isVet, vetEntry, moveVetFocus, confirmVet, backVet, resetVet,
} from './vetNavigation.js';
import {
    isChest, driveChest, chestEntry, moveChestFocus, confirmChest, backChest, resetChest,
} from './chestNavigation.js';
import {
    isTravelPopup, isRefuel, travelPopupEntry, backTravelPopup,
    refuelEntry, driveRefuel, moveRefuelFocus, backRefuel,
} from './travelNavigation.js';

/** Close controls, in the order worth trying. */
const CLOSE_SELECTORS = [
    '[data-action="close"]',
    '.modal-close',
    '.save-modal-close',
    '.inv-close',          // the inventory has no Escape handler at all
    '.eap-close',
    '.close-btn',
    '.btn-close',
    '.gal-overlay-close',
    '.mm-ach-reward-close',
    '[aria-label="Close" i]',
    '[aria-label*="fechar" i]',
    '[aria-label*="voltar" i]',
];

/** querySelector that also looks inside shadow roots. */
function deepQuery(root, selector) {
    const direct = root.querySelector?.(selector);
    if (direct) return direct;
    for (const el of root.querySelectorAll?.('*') ?? []) {
        if (!el.shadowRoot) continue;
        const inside = deepQuery(el.shadowRoot, selector);
        if (inside) return inside;
    }
    return null;
}

// ── The inventory ───────────────────────────────────────────────────────────
//
// Three regions, not one list: a column of categories, the items of the chosen
// one, and what you can do with the chosen item. A flat list reads wrong —
// pressing down past the last category fell into the items instead of wrapping.

function inventoryRegions(panel) {
    return {
        tabs: Array.from(panel.querySelectorAll('.inv-tab-btn')),
        slots: Array.from(panel.querySelectorAll('.inv-slot')),
        actions: Array.from(panel.querySelectorAll('.inv-actions button:not([disabled])')),
    };
}

function regionOf(panel, focused) {
    const { tabs, slots, actions } = inventoryRegions(panel);
    if (actions.includes(focused)) return 'actions';
    if (slots.includes(focused)) return 'slots';
    if (tabs.includes(focused)) return 'tabs';
    return null;
}

const isInventory = (panel) => panel?.id === 'inventoryModal';

function moveInventoryFocus(panel, dir) {
    const { tabs, slots, actions } = inventoryRegions(panel);
    const focused = deepActiveElement();
    const region = regionOf(panel, focused) ?? 'tabs';

    // Right goes deeper; left comes back to the categories. Leaving the actions
    // is B's job, not left's — the player asked for that, and it matches the
    // "B steps back" rule everywhere else.
    if (dir === 'ArrowRight') {
        // Re-read the slots: the category may have just changed under us.
        if (region === 'tabs') {
            const current = inventoryRegions(panel).slots;
            if (current.length) focusAndMark(current[0]);
            return true;
        }
        if (region === 'actions' && actions.length > 1) {
            const at = actions.indexOf(focused);
            focusAndMark(actions[(at + 1) % actions.length]);
        }
        return true;
    }
    if (dir === 'ArrowLeft') {
        if (region === 'slots' && tabs.length) { focusAndMark(tabs[0]); return true; }
        // On the options, left and right pick between them — equip/consume on
        // one side, discard on the other.
        if (region === 'actions' && actions.length > 1) {
            const at = actions.indexOf(focused);
            focusAndMark(actions[(at - 1 + actions.length) % actions.length]);
        }
        return true;
    }

    const list = region === 'actions' ? actions : region === 'slots' ? slots : tabs;
    if (!list.length) return false;
    const step = dir === 'ArrowDown' ? 1 : -1;
    const current = list.indexOf(focused);
    const next = current < 0 ? 0 : (current + step + list.length) % list.length;
    const target = list[next];
    focusAndMark(target);

    // Landing on a category switches to it straight away, instead of only
    // highlighting it and waiting for a confirm — the player moves the D-pad
    // and sees the contents change, which is what the highlight promises.
    // Safe to click: the tabs live outside the region the render replaces, so
    // the button we just focused survives it.
    if (list === tabs) target.click();
    return true;
}

/**
 * Confirm on an inventory item selects it *and* moves on to what can be done
 * with it. Leaving the focus on the slot would make the player pick an item and
 * then hunt for the buttons.
 */
function confirmInventory(panel) {
    const focused = deepActiveElement();
    if (regionOf(panel, focused) !== 'slots') return false;

    focused.click();
    // The click rebuilds the details panel. Reading the buttons in the same
    // tick found an empty list for some items, and the highlight had nowhere to
    // go — one frame of slack lets the panel settle first.
    requestAnimationFrame(() => {
        const { actions } = inventoryRegions(panel);
        if (!actions.length) return;
        focusAndMark(actions[0]);
    });
    return true;
}

/**
 * Runs an action button and puts the highlight back where the player can carry
 * on: the item they were on, the one that took its place, or the categories if
 * the category is now empty. Leaving the focus on a button that belongs to an
 * item that no longer exists strands them.
 */
/**
 * One press opens the options, the next one fires one. That holds because a
 * press is one edge: there used to be a 250 ms guard here instead, swallowing
 * anything that arrived too soon, and it was covering for the input layer
 * reporting a held button as a new press on every frame. With that fixed
 * (gamepadInput._release) the guard had nothing left to swallow.
 */
function confirmInventoryAction(panel) {
    const { slots, actions } = inventoryRegions(panel);
    const focused = deepActiveElement();
    if (!actions.includes(focused)) return false;

    const slotIndex = slots.indexOf(
        slots.find((s) => s.classList.contains('selected')) ?? slots[0]
    );
    focused.click();

    // Same reason as above: the grid is rebuilt by the click.
    requestAnimationFrame(() => {
        const after = inventoryRegions(panel);
        if (after.slots.length) {
            const index = Math.min(Math.max(slotIndex, 0), after.slots.length - 1);
            focusAndMark(after.slots[index]);
        } else if (after.tabs.length) {
            focusAndMark(after.tabs[0]);
        }
    });
    return true;
}

/**
 * B retraces the way in, one step per press — the mirror of how A goes deeper:
 *
 *   categories -> items -> options        (A, ->)
 *   categories <- items <- options        (B)
 *
 * Only from the categories, the first step, does B close the inventory.
 * Anything else would skip steps the player took.
 */
function backInventory(panel) {
    const { tabs, slots } = inventoryRegions(panel);
    const region = regionOf(panel, deepActiveElement());

    if (region === 'actions') {
        // Back to the item the options belong to, not to the first one.
        const selected = slots.find((s) => s.classList.contains('selected'));
        if (selected || slots.length) focusAndMark(selected ?? slots[0]);
        return true;
    }
    if (region === 'slots') {
        if (!tabs.length) return false;
        // The category that is actually showing, so the highlight lands where
        // the player left it rather than on the first tab.
        const active = tabs.find((t) => t.classList.contains('active'));
        focusAndMark(active ?? tabs[0]);
        return true;
    }
    // On the categories: this is the first step, so B leaves.
    return false;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Steps the highlight in the open panel.
 * @param {'ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight'} dir
 * @returns {boolean} false when there was nothing to move
 */
export function moveFocus(dir) {
    const panel = openPanel();
    if (!panel) return false;

    // A focused select or slider takes left/right for its own value. Without
    // this the player could reach "graphics quality" or the aim speed and not
    // change them: confirm only "clicks", which does nothing to either.
    if (dir === 'ArrowLeft' || dir === 'ArrowRight') {
        if (adjustControl(deepActiveElement(), dir === 'ArrowRight' ? 1 : -1)) return true;
    }

    if (isInventory(panel)) return moveInventoryFocus(panel, dir);
    if (isMarket(panel)) return moveMarketFocus(panel, dir, deepActiveElement());
    if (isTradeConfirm(panel)) return moveTradeConfirmFocus(panel, dir, deepActiveElement());
    if (isCrafting(panel)) return moveCraftingFocus(panel, dir, deepActiveElement());
    if (isStorage(panel)) return moveStorageFocus(panel, dir, deepActiveElement());
    if (isDialogue(panel) && hasButtonChoices(panel)) return false;
    if (isBlocking(panel)) return false;
    if (isVet(panel)) return moveVetFocus(panel, dir, deepActiveElement());
    if (isChest(panel)) return moveChestFocus(panel, dir, deepActiveElement());
    if (isRefuel(panel)) return moveRefuelFocus(panel, dir, deepActiveElement());

    const items = focusableIn(panel);
    if (!items.length) return false;

    const step = (dir === 'ArrowDown' || dir === 'ArrowRight') ? 1 : -1;
    const current = items.indexOf(deepActiveElement());
    // Nothing focused yet (just opened): start at the top rather than at the
    // second item.
    const next = current < 0
        ? (step > 0 ? 0 : items.length - 1)
        : (current + step + items.length) % items.length;
    focusAndMark(items[next]);
    return true;
}

/**
 * Steps the value of a form control, if that is what is focused.
 *
 * Dispatches `input` and `change` the way a real interaction does — the
 * settings listen for those, so a value changed this way is saved and applied
 * exactly as one changed with the mouse.
 *
 * @returns {boolean} true when it handled the press
 */
function adjustControl(el, step) {
    if (!el) return false;

    if (el.tagName === 'SELECT' && el.options?.length) {
        const next = Math.min(el.options.length - 1, Math.max(0, el.selectedIndex + step));
        if (next === el.selectedIndex) return true;   // at the end: swallow, do not wander off
        el.selectedIndex = next;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    if (el.tagName === 'INPUT' && el.type === 'range') {
        const amount = Number(el.step) || 1;
        const value = Number(el.value) + step * amount;
        const clamped = Math.min(Number(el.max), Math.max(Number(el.min), value));
        if (clamped === Number(el.value)) return true;
        el.value = String(clamped);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    return false;
}

/** Activates the highlighted element. @returns {boolean} */
export function confirm() {
    const panel = openPanel();
    // Sleeping and the loading screens answer to nothing. Returning true stops
    // the caller falling back to Enter, which would reach past them.
    if (isBlocking(panel)) return true;
    if (isInventory(panel)) {
        if (confirmInventoryAction(panel)) return true;
        if (confirmInventory(panel)) return true;
    }

    // The deep lookup matters: inside a shadow root `document.activeElement` is
    // the host, and clicking the host does nothing — which is exactly why the
    // inventory felt dead.
    const el = deepActiveElement();
    if (!el || el === document.body) return false;
    if (isMarket(panel) && confirmMarketItem(panel, el)) return true;
    if (isCrafting(panel) && confirmCrafting(panel, el)) return true;
    if (isStorage(panel) && confirmStorage(panel, el)) return true;
    if (isVet(panel) && confirmVet(panel, el)) return true;
    if (isChest(panel) && confirmChest(panel, el)) return true;
    if (typeof el.click !== 'function') return false;
    el.click();
    return true;
}

/**
 * Back/cancel. Steps back inside a panel that has regions, then tries Escape —
 * what the panels were written for — and only then the close button, for the
 * handful that have no Escape handler at all.
 *
 * @returns {boolean} true when it did something
 */
export function back() {
    const panel = openPanel();
    if (!panel) return false;
    if (isBlocking(panel)) return true;       // swallowed, like every other button
    if (isInventory(panel) && backInventory(panel)) return true;
    // "Cancelar" is a plain button with no Escape handler behind it, and its
    // label does not read as a close control, so name it here.
    if (isTradeConfirm(panel) && cancelTrade(panel)) return true;
    // The warehouse closes an open amount first, the modal only after.
    if (isStorage(panel) && backStorage(panel)) return true;
    // The vet steps back to its menu before it closes.
    if (isVet(panel) && backVet(panel, deepActiveElement())) return true;
    if (isChest(panel) && backChest()) return true;
    if (isTravelPopup(panel) && backTravelPopup(panel)) return true;
    if (isRefuel(panel) && backRefuel(panel)) return true;

    // The pause menu ignores Escape while the controller is driving, so closing
    // it has to be a direct call — otherwise B did nothing there at all.
    if (panel.id === 'pauseMenu') {
        getSystem('pauseMenu')?.close?.();
        return true;
    }

    const target = deepActiveElement() ?? document.body;
    for (const type of ['keydown', 'keyup']) {
        target.dispatchEvent(new KeyboardEvent(type, {
            key: 'Escape', code: 'Escape', bubbles: true, cancelable: true, composed: true,
        }));
    }

    requestAnimationFrame(() => {
        if (!onScreen(panel)) return;
        for (const selector of CLOSE_SELECTORS) {
            const button = deepQuery(panel, selector);
            if (button && typeof button.click === 'function') { button.click(); return; }
        }
    });
    return true;
}

/**
 * Puts the highlight on the first item of a freshly opened panel, so the first
 * confirm does something instead of only arming the highlight.
 * @returns {boolean} true when it had to move the focus in
 */
export function ensureFocus() {
    const panel = openPanel();
    if (!panel) return false;
    if (isBlocking(panel)) return false;      // nothing on them to land on
    const focused = deepActiveElement();
    if (focused && focused !== document.body && panel.contains?.(focused)) return false;

    // Not simply the first focusable: in DOM order that is the "×" close
    // button. Consuming an item rebuilds the grid and destroys the focused
    // slot, focus falls back to the body, and this would land on "×" — so the
    // player's next confirm closed the inventory instead of acting on an item.
    const preferred = preferredEntry(panel);
    if (preferred) { focusAndMark(preferred); return true; }

    const items = focusableIn(panel);
    if (!items.length) return false;
    focusAndMark(items[0]);
    return true;
}

/**
 * Where a panel should put the highlight when it has nowhere else to put it.
 * A close button is never the answer — it is the one control that undoes the
 * reason the panel is open.
 */
function preferredEntry(panel) {
    if (isInventory(panel)) {
        const { tabs, slots } = inventoryRegions(panel);
        const activeTab = tabs.find((t) => t.classList.contains('active'));
        return slots[0] ?? activeTab ?? tabs[0] ?? null;
    }
    // The market opens on an item of the pane in play. The first focusable in
    // DOM order is the "Inventory" tab, and starting there would make the first
    // thing the player sees a tab strip they are not meant to walk.
    if (isMarket(panel)) {
        const entry = marketEntry(panel);
        if (entry) return entry;
    }
    if (isTradeConfirm(panel)) return tradeConfirmEntry(panel);
    if (isCrafting(panel)) return craftingEntry(panel);
    if (isStorage(panel)) return storageEntry(panel);
    // The letters say which button answers; a highlight on top would offer a
    // second way in, and A would have to choose between the two.
    if (isDialogue(panel) && hasButtonChoices(panel)) return null;
    if (isBlocking(panel)) return null;
    if (isVet(panel)) return vetEntry(panel);
    if (isChest(panel)) return chestEntry(panel);
    if (isTravelPopup(panel)) return travelPopupEntry(panel);
    if (isRefuel(panel)) return refuelEntry(panel);
    const items = focusableIn(panel);
    const notClosing = items.find((el) => !isCloseControl(el));
    return notClosing ?? null;
}

/** Does this control dismiss the panel? */
function isCloseControl(el) {
    if (CLOSE_SELECTORS.some((sel) => el.matches?.(sel))) return true;
    const label = `${el.getAttribute?.('aria-label') ?? ''} ${el.textContent ?? ''}`.trim();
    return label === '×' || /^(fechar|close|voltar)$/i.test(label);
}

/**
 * Which kind of screen this is, for the corner that names the buttons.
 *
 * The predicates already exist for routing; this puts a name on the answer so
 * the hints do not have to repeat the same chain of questions.
 */
export function panelKind(panel) {
    if (!panel) return null;
    if (isTradeConfirm(panel)) return 'amount';
    if (isMarket(panel)) return 'market';
    if (isStorage(panel)) return 'storage';
    if (isChest(panel)) return 'storage';
    if (isCrafting(panel)) return 'crafting';
    if (isVet(panel)) return 'vet';
    if (isDialogue(panel)) return 'dialogue';
    if (isInventory(panel)) return 'inventory';
    if (isRefuel(panel)) return 'amount';
    return 'panel';
}

/**
 * Buttons a panel claims for itself, before the generic handling runs.
 *
 * Most panels want none of this: a highlight and A is the whole grammar. The
 * market is the exception — it is two panes with their own tabs, so it takes
 * the shoulder buttons and the D-pad and leaves the stick to walk the items.
 *
 * @returns {boolean} true when the panel owns the D-pad this frame
 */
let marketWasOpen = false;

export function panelButtons(pressed) {
    const panel = openPanel();
    // The amount panel counts as still being in the market: it opens on top,
    // and treating it as leaving would send the player back to the left pane
    // every time they agreed to a deal on the trader's side.
    const inFlow = inMarketFlow(panel);

    // Opening the market always starts on the player's bags. Reset here rather
    // than when focus is missing: the grid is rebuilt on every category change,
    // and treating that as a fresh open would throw the player back to the left
    // pane each time they filtered the trader's stock.
    if (inFlow && !marketWasOpen) resetMarket();
    marketWasOpen = inFlow;

    // Before the branches below, not after them: each of those returns, so a
    // warehouse closed while the chest opened never reached its reset and came
    // back with an amount still armed — on a slot long since detached.
    if (!isStorage(panel)) resetStorage();
    if (!isVet(panel)) resetVet();
    if (!isChest(panel)) resetChest();

    if (isTradeConfirm(panel)) return driveTradeConfirm(panel, pressed);
    if (isMarket(panel)) return driveMarket(panel, pressed);
    // Crafting takes the shoulder buttons and hands the D-pad back: one list,
    // so up and down should walk it.
    if (isCrafting(panel)) return driveCrafting(panel, pressed);
    if (isStorage(panel)) return driveStorage(panel, pressed);
    if (isDialogue(panel)) return driveDialogue(panel, pressed);
    if (isChest(panel)) return driveChest(panel, pressed);
    if (isRefuel(panel)) return driveRefuel(panel, pressed);
    // Nothing to choose on these, so nothing answers: the world is already
    // stopped by them being panels at all, and swallowing the D-pad keeps a
    // stray press from reaching whatever is behind.
    if (isBlocking(panel)) return true;
    return false;
}

export default { moveFocus, confirm, back, ensureFocus, panelButtons, panelKind };
