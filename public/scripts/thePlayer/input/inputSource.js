/**
 * @file inputSource.js - Who is driving the game right now (#264).
 *
 * One answer, in one place. Before this, each module decided for itself whether
 * a controller was in use and whether a panel was open, and they disagreed: the
 * pause menu could not see the inventory (it lives in a shadow root), so the B
 * button closed the inventory *and* opened the pause menu on the same press.
 *
 * Exactly one source is active at a time:
 *
 *   - a key or the mouse  -> `keyboard`
 *   - a stick or a button -> `gamepad`
 *   - a touch             -> `mobile`
 *
 * Each section of the input layer reads `isActive()` and stands down when it is
 * not the one in charge, so a player who picks up the keyboard mid-session does
 * not get both at once. Other files read `current()` to decide what to *show* —
 * key names or button glyphs.
 *
 * Switching is deliberately one-way per event: nothing is "released". Picking
 * the mouse up switches to keyboard; touching the stick switches back.
 */

/** @typedef {'keyboard'|'gamepad'|'mobile'} Source */

/** Ignore the tiny drift a resting stick reports. */
const STICK_WAKE = 0.5;

let active = /** @type {Source} */ ('keyboard');
let listening = false;

/** Noise filter: a pad at rest still reports values that wobble. */
function padIsBeingUsed() {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads
        ? Array.from(navigator.getGamepads() ?? []).filter(Boolean)
        : [];
    // The same pad gamepadInput reads, chosen by the same rule: a standard
    // mapping first. Windows shows one controller twice, and watching every pad
    // meant an unselected or drifting one could hand control to the gamepad
    // while the pad actually in play sat still — the source then flipped back on
    // the next key, and the prompts flickered between the two.
    const standard = pads.filter((p) => p.mapping === 'standard');
    const pad = (standard.length ? standard : pads)[0];
    if (!pad) return false;
    if (pad.buttons?.some((b) => (typeof b === 'number' ? b : b.value) > 0.5 || b.pressed)) return true;
    return pad.axes?.some((a) => Math.abs(a) > STICK_WAKE) === true;
}

/** @returns {Source} */
export function current() {
    return active;
}

/** @param {Source} source */
export function isActive(source) {
    return active === source;
}

/**
 * Switches the active source and tells the game, once per change.
 * @param {Source} source
 */
export function setSource(source) {
    if (source === active) return;
    active = source;
    markBody(source);
    document.dispatchEvent(new CustomEvent('input:sourcechanged', { detail: { source } }));
}

/**
 * Puts the active source on <body> so CSS can follow it.
 *
 * This is what hides the system pointer while the controller is driving: it sat
 * frozen on screen next to the reticle, and in menus it stayed there suggesting
 * the player could click. It comes back the moment a key or the mouse is used —
 * and the Steam overlay draws its own pointer, outside the page, either way.
 */
function markBody(source) {
    const body = document.body;
    if (!body) return;
    for (const name of ['input-keyboard', 'input-gamepad', 'input-mobile']) {
        body.classList.toggle(name, name === `input-${source}`);
    }
}

/**
 * Starts watching for the events that hand control over.
 *
 * Capture phase and `isTrusted`: the gamepad layer synthesises key and mouse
 * events to drive the game through its existing handlers, and without the check
 * the controller would hand control to the keyboard on its own first press.
 */
export function initInputSource() {
    if (listening) return;
    listening = true;

    const toKeyboard = (e) => { if (e.isTrusted) setSource('keyboard'); };
    document.addEventListener('keydown', toKeyboard, true);
    document.addEventListener('mousemove', toKeyboard, true);
    document.addEventListener('mousedown', toKeyboard, true);
    document.addEventListener('wheel', toKeyboard, { capture: true, passive: true });

    const toMobile = (e) => { if (e.isTrusted) setSource('mobile'); };
    document.addEventListener('touchstart', toMobile, { capture: true, passive: true });

    window.addEventListener('gamepadconnected', () => setSource('gamepad'));

    markBody(active);

    // A watchdog independent of the render loop.
    //
    // The gamepad is normally polled once per frame, but the loop returns early
    // while the page is hidden and skips frames under the 30 FPS cap — and the
    // Steam overlay (Shift+Tab) is a real keypress, which hands control to the
    // keyboard. Without this, coming back from the overlay left the controller
    // dead until something else happened to poll it.
    setInterval(() => {
        if (active !== 'gamepad') pollGamepadActivity();
    }, 200);
}

/**
 * Called once per frame by the gamepad section: a pad in use takes over.
 * Polling rather than events because the Gamepad API has no "button pressed"
 * event — the state has to be read each frame anyway.
 */
export function pollGamepadActivity() {
    if (padIsBeingUsed()) setSource('gamepad');
}

export default { current, isActive, setSource, initInputSource, pollGamepadActivity };
