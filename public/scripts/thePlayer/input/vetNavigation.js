/**
 * @file vetNavigation.js - Driving the vet with a controller (#264).
 *
 * Two sides: a menu of four things to ask Alice, and whatever that choice puts
 * on the stage — the animals to leave, the ones to fetch back, the medicines.
 *
 *   D-pad ↑ ↓   walk the menu, which changes the stage as it goes
 *   D-pad →     step across to the stage and pick
 *   A           the same, from the menu; takes the thing, on the stage
 *   D-pad ←     back to the menu
 *   B           back to the menu, then out of the vet
 *
 * The menu applies as the highlight passes over it, rather than waiting for a
 * press. It is the same bargain the inventory's categories make: the highlight
 * promises that what you are on is what you are looking at, and a menu that
 * needed confirming would break that promise for no gain — there is nothing
 * destructive behind any of the four.
 */
import { ACTION, firedAction } from './bindings.js';
import { onScreen, focusableIn, focusAndMark, gridStep } from './panels.js';

export function isVet(panel) {
    return panel?.id === 'vet-overlay';
}

/**
 * Which menu entry opened what is on the stage.
 *
 * Kept here because the vet does not mark it: the sidebar styles `:active`,
 * which is the half-second a button is held, not a record of the choice. Coming
 * back from the stage to the top of the menu every time would undo the step the
 * player just took.
 */
let lastMenuIndex = 0;

export function resetVet() {
    lastMenuIndex = 0;
}

function menuItems(panel) {
    return [...panel.querySelectorAll('.vet-action-btn')].filter(onScreen);
}

/**
 * What the chosen menu entry put on the stage.
 *
 * Read fresh every time rather than remembered: each entry mounts its own
 * sub-view, so the contents are different nodes from one moment to the next.
 */
function stageItems(panel) {
    const stage = panel.querySelector('.vet-stage');
    return stage ? focusableIn(stage) : [];
}

function inMenu(panel, el) {
    return menuItems(panel).includes(el);
}

/** Moves the highlight to the stage, once the sub-view has mounted. */
function enterStage(panel) {
    const place = () => {
        const items = stageItems(panel);
        if (items.length) focusAndMark(items[0]);
    };
    // The menu mounts its sub-view on click; reading the stage in the same tick
    // finds the previous one, or nothing at all.
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(place);
    else place();
}

export function driveVet() {
    // Nothing of its own: the vet is a highlight and a press, so the D-pad is
    // left to the navigator. Present so the panel is routed like the others.
    return false;
}

/** The first thing to ask, rather than the close button above it. */
export function vetEntry(panel) {
    return menuItems(panel)[0] ?? null;
}

export function moveVetFocus(panel, dir, focused) {
    const menu = menuItems(panel);
    const onMenu = menu.includes(focused);

    if (onMenu && dir === 'ArrowRight') {
        const items = stageItems(panel);
        if (!items.length) return false;
        focusAndMark(items[0]);
        return true;
    }

    if (onMenu) {
        const next = gridStep(menu, menu.indexOf(focused), dir);
        if (!next) return false;
        lastMenuIndex = menu.indexOf(next);
        focusAndMark(next);
        // Walking the menu changes what is on the stage, as if it had been
        // clicked — which is what the eye expects from a highlighted menu.
        next.click();
        return true;
    }

    if (dir === 'ArrowLeft') return backVet(panel, focused);

    const items = stageItems(panel);
    const next = gridStep(items, items.indexOf(focused), dir);
    if (!next) return false;
    focusAndMark(next);
    return true;
}

/**
 * A on the menu steps across to what it opened; on the stage it is an ordinary
 * press, left to whatever is under the highlight.
 *
 * @returns {boolean} true when it handled the press
 */
export function confirmVet(panel, focused) {
    if (!inMenu(panel, focused)) return false;
    lastMenuIndex = menuItems(panel).indexOf(focused);
    focused.click();
    enterStage(panel);
    return true;
}

/**
 * B retraces one step: the stage back to the menu, and only from the menu out
 * of the vet — the same one-step-per-press rule the inventory follows.
 *
 * @returns {boolean} true when it handled the press
 */
export function backVet(panel, focused = null) {
    const here = focused ?? panel.ownerDocument?.activeElement ?? null;
    if (inMenu(panel, here)) return false;       // let the overlay close

    const menu = menuItems(panel);
    if (!menu.length) return false;
    // Back to the entry that opened this stage, not to the top of the menu.
    focusAndMark(menu[Math.min(Math.max(lastMenuIndex, 0), menu.length - 1)]);
    return true;
}

export default { isVet, driveVet, vetEntry, moveVetFocus, confirmVet, backVet, resetVet };
