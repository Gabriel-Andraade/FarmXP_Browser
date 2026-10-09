/**
 * @file craftingNavigation.js - Driving the workbench with a controller (#264).
 *
 *   LB / RB              previous / next recipe type
 *   D-pad / left stick   walk the recipes
 *   A                    make the one under the highlight
 *   B                    close
 *
 * Unlike the market, the D-pad is left alone here: there is one list and
 * nothing else to point at, so the obvious thing to do with up and down is the
 * right one.
 */
import { ACTION, firedAction } from './bindings.js';
import { onScreen, stepStrip, focusAndMark } from './panels.js';

export function isCrafting(panel) {
    return panel?.classList?.contains('crf-panel') === true;
}

function recipesIn(panel) {
    return [...panel.querySelectorAll('.crf-item')].filter(onScreen);
}

/**
 * The shoulder buttons only.
 *
 * @returns {boolean} false — crafting does not claim the D-pad, so up and down
 *   go on walking the recipes.
 */
export function driveCrafting(panel, pressed) {
    const step = firedAction(pressed, ACTION.TAB_NEXT) ? 1
        : firedAction(pressed, ACTION.TAB_PREV) ? -1 : 0;

    // Crafting marks the chosen type `crf-active`, not `active`.
    if (step && stepStrip(panel, '.crf-category-btn', step, 'crf-active')) {
        // Changing the type rebuilds the list under the highlight.
        const place = () => {
            const first = recipesIn(panel)[0];
            if (first) focusAndMark(first);
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(place);
        else place();
    }

    return false;
}

/** The first recipe, rather than the close button that comes before it. */
export function craftingEntry(panel) {
    return recipesIn(panel)[0] ?? null;
}

/**
 * Walks the recipes.
 *
 * The highlight rests on the row, not on its "Craft" button, because a recipe
 * the player cannot afford renders that button `disabled` — and a disabled
 * button cannot take focus. Following the buttons would make those recipes
 * invisible to the controller, and a workbench where nothing is affordable
 * would have nowhere to put the highlight at all.
 *
 * @returns {boolean} true when it moved
 */
export function moveCraftingFocus(panel, dir, focused) {
    const recipes = recipesIn(panel);
    if (!recipes.length) return false;

    const current = recipes.indexOf(focused);
    if (current < 0) { focusAndMark(recipes[0]); return true; }

    const step = (dir === 'ArrowDown' || dir === 'ArrowRight') ? 1 : -1;
    const next = current + step;
    if (next < 0 || next >= recipes.length) return false;
    focusAndMark(recipes[next]);
    return true;
}

/**
 * Makes the highlighted recipe.
 *
 * A recipe short of materials keeps its button disabled, so this does nothing —
 * the same as clicking it, and the row already lists what is missing.
 *
 * @returns {boolean} true when it handled the press
 */
export function confirmCrafting(panel, focused) {
    if (!recipesIn(panel).includes(focused)) return false;
    focused.querySelector('.crf-btn:not([disabled])')?.click();
    return true;
}

export default {
    isCrafting, driveCrafting, craftingEntry, moveCraftingFocus, confirmCrafting,
};
