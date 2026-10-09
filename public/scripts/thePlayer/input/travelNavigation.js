/**
 * @file travelNavigation.js - The two small screens the travel map opens (#264).
 *
 * The map itself navigates like any other panel. These two do not:
 *
 *   popup       A confirms, B refuses — it is a question with two answers
 *   refuelling  D-pad → fills the bar, ← empties it, A buys, B cancels
 *
 * The bar is driven by sending it the arrow keys it already answers to, rather
 * than reaching into the modal to set a number: the slider owns its own
 * clamping, its own rounding and its own display, and a second way in would
 * have to keep all three in step.
 */
import { ACTION, firedAction } from './bindings.js';
import { onScreen, focusAndMark } from './panels.js';

export function isTravelPopup(panel) {
    return panel?.classList?.contains('tmap-popup-overlay') === true;
}

export function isRefuel(panel) {
    return panel?.classList?.contains('tmap-refuel-modal') === true;
}

// ── The question ───────────────────────────────────────────────────────────

function popupButtons(panel) {
    return [...panel.querySelectorAll('.tmap-popup-btn')].filter(onScreen);
}

/** Confirm is what the highlight rests on; the refusal is one step away. */
export function travelPopupEntry(panel) {
    const buttons = popupButtons(panel);
    return buttons.find((b) => !b.classList.contains('tmap-popup-btn-secondary')) ?? buttons[0] ?? null;
}

/**
 * B refuses through the button that refuses, when there is one.
 * @returns {boolean} true when it handled the press
 */
export function backTravelPopup(panel) {
    const buttons = popupButtons(panel);
    const no = buttons.find((b) => b.classList.contains('tmap-popup-btn-secondary'));
    if (no) { no.click(); return true; }
    // A popup with a single button is a notice, not a question: B dismisses it
    // the same way its one button would.
    if (buttons.length === 1 && panel.dataset?.dismissible === 'true') {
        buttons[0].click();
        return true;
    }
    return false;
}

// ── Filling the tank ───────────────────────────────────────────────────────

function refuelHandle(panel) {
    return panel.querySelector('.tmap-refuel-handle');
}

/** The slider first: the amount is the decision, the buttons only close it. */
export function refuelEntry(panel) {
    return refuelHandle(panel) ?? panel.querySelector('.tmap-refuel-confirm') ?? null;
}

/**
 * The refuel modal claims no buttons of its own.
 *
 * Filling the bar goes through the ordinary navigation instead, so that holding
 * the D-pad repeats. That matters more than it sounds: the slider moves 0.1% a
 * press, and a keyboard gets there by the system repeating the key while it is
 * held. A controller sends one event per press, so one press moved the bar by a
 * tenth of a percent and read as nothing happening at all.
 *
 * @returns {false}
 */
export function driveRefuel() {
    return false;
}

/**
 * Sideways fills and empties the bar; up and down move between it and the
 * buttons underneath.
 *
 * @returns {boolean} true when it handled the direction
 */
export function moveRefuelFocus(panel, dir, focused) {
    const handle = refuelHandle(panel);
    const sideways = dir === 'ArrowLeft' || dir === 'ArrowRight';

    if (handle && sideways) {
        // `shiftKey` is the slider's own coarse step — 1% instead of 0.1%. A
        // tenth of a percent per press is below what the bar can show.
        handle.dispatchEvent(new KeyboardEvent('keydown', {
            key: dir, code: dir, shiftKey: true, bubbles: true, cancelable: true,
        }));
        focusAndMark(handle);
        return true;
    }

    const stops = [handle, ...panel.querySelectorAll('.tmap-refuel-btn')].filter(Boolean).filter(onScreen);
    if (stops.length < 2) return false;
    const current = stops.indexOf(focused);
    const step = dir === 'ArrowDown' ? 1 : -1;
    const next = current < 0 ? 0 : (current + step + stops.length) % stops.length;
    focusAndMark(stops[next]);
    return true;
}

/**
 * B cancels through the modal's own cancel button: it has no Escape handler,
 * and leaving by any other route would skip the refund of what was not bought.
 * @returns {boolean} true when it handled the press
 */
export function backRefuel(panel) {
    const cancel = panel.querySelector('.tmap-refuel-cancel');
    if (!cancel) return false;
    cancel.click();
    return true;
}

export default {
    isTravelPopup, isRefuel, travelPopupEntry, backTravelPopup,
    refuelEntry, driveRefuel, moveRefuelFocus, backRefuel,
};
