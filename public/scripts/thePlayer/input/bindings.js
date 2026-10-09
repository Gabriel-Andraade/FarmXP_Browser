/**
 * @file bindings.js - What each key, button and gesture does (#264).
 *
 * One table per input source, all keyed by the same **action ids**, the way the
 * i18n files are all keyed by the same message ids. A screen asks for
 * `interact` and gets `KeyE`, or button `0`, depending on who is driving — it
 * never has to know which.
 *
 * Adding an action means adding one id here and one entry per source. Nothing
 * else in the game needs to learn about it.
 */

import { DEFAULT_KEYBINDS } from '../../keybindDefaults.js';

/**
 * Every action the game can be asked to perform.
 *
 * Frozen and exported so a typo becomes an error instead of an action that
 * silently never fires — the old code compared bare strings in a dozen files.
 */
export const ACTION = Object.freeze({
    // World
    MOVE_UP: 'moveUp',
    MOVE_DOWN: 'moveDown',
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    INTERACT: 'interact',
    USE_TOOL: 'useTool',
    INVENTORY: 'inventory',
    MERCHANTS: 'merchants',
    CONFIG: 'config',
    HELP: 'help',
    TOOL_WHEEL: 'toolWheel',
    TOOL_CYCLE: 'toolCycle',
    PAUSE: 'pause',
    BUILD: 'build',

    // Panels
    NAV_UP: 'navUp',
    NAV_DOWN: 'navDown',
    NAV_LEFT: 'navLeft',
    NAV_RIGHT: 'navRight',
    CONFIRM: 'confirm',
    BACK: 'back',
    // A panel split into two halves, each with its own tabs: the market is the
    // first, with the player's bags on the left and the trader's stock on the
    // right. Named for the shape, not for the market, so the next one reuses it.
    // A conversation offering up to four answers puts one face button on each,
    // instead of a list to walk. Ids of their own so the prompt the player reads
    // and the button that answers can never drift apart: both are read from here.
    CHOICE_1: 'choice1',
    CHOICE_2: 'choice2',
    CHOICE_3: 'choice3',
    CHOICE_4: 'choice4',
    PANE_LEFT: 'paneLeft',
    PANE_RIGHT: 'paneRight',
    TAB_PREV: 'tabPrev',
    TAB_NEXT: 'tabNext',

    // Build mode
    BUILD_NEXT: 'buildNext',
    BUILD_PREV: 'buildPrev',
    BUILD_ROTATE: 'buildRotate',
    BUILD_PLACE: 'buildPlace',
    BUILD_PICK: 'buildPick',
});

/**
 * Keyboard: `KeyboardEvent.code` values, so the binding survives a different
 * layout — `KeyW` is the same physical key on AZERTY.
 *
 * The remappable half is `DEFAULT_KEYBINDS` itself, not a copy of it: the
 * action ids here were chosen to match its keys exactly, so spreading it in
 * means the remap screen and this table cannot drift. What follows are the ones
 * the remap screen does not manage — menu keys and build mode, fixed for now.
 *
 * These are the shipped defaults. What the player actually has is pushed in by
 * `keyboard.js` through `setBindings`, every time it loads or saves.
 */
export const KEYBOARD_BINDINGS = {
    ...DEFAULT_KEYBINDS,
    [ACTION.PAUSE]: ['Escape'],
    [ACTION.BUILD]: ['KeyB'],

    [ACTION.NAV_UP]: ['ArrowUp'],
    [ACTION.NAV_DOWN]: ['ArrowDown'],
    [ACTION.NAV_LEFT]: ['ArrowLeft'],
    [ACTION.NAV_RIGHT]: ['ArrowRight'],
    [ACTION.CONFIRM]: ['Enter'],
    [ACTION.BACK]: ['Escape'],

    [ACTION.BUILD_NEXT]: ['KeyQ'],
    [ACTION.BUILD_ROTATE]: ['KeyR'],
    [ACTION.BUILD_PLACE]: ['KeyT'],
};

/**
 * Gamepad: indices into the standard mapping. See `mapController.md` for the
 * layout and the reasoning behind each choice.
 */
export const GAMEPAD_BINDINGS = {
    [ACTION.INTERACT]: [0],          // A
    [ACTION.CONFIRM]: [0],           // A
    [ACTION.BACK]: [1],              // B
    [ACTION.BUILD]: [2],             // X
    [ACTION.INVENTORY]: [3, 8],      // Y, View
    [ACTION.TOOL_WHEEL]: [4],        // LB, held
    [ACTION.TOOL_CYCLE]: [5],        // RB, while the wheel is up
    [ACTION.USE_TOOL]: [7],          // RT
    [ACTION.MERCHANTS]: [6],         // LT
    [ACTION.PAUSE]: [9],             // Start

    [ACTION.CHOICE_1]: [0],          // A
    [ACTION.CHOICE_2]: [1],          // B
    [ACTION.CHOICE_3]: [2],          // X
    [ACTION.CHOICE_4]: [3],          // Y

    // Same four buttons the world uses for tools and merchants. They never
    // overlap in practice: the world section reads its ids, a panel reads these.
    [ACTION.PANE_LEFT]: [6],         // LT
    [ACTION.PANE_RIGHT]: [7],        // RT
    [ACTION.TAB_PREV]: [4],          // LB
    [ACTION.TAB_NEXT]: [5],          // RB

    [ACTION.NAV_UP]: [12],
    [ACTION.NAV_DOWN]: [13],
    [ACTION.NAV_LEFT]: [14],
    [ACTION.NAV_RIGHT]: [15],

    [ACTION.MOVE_UP]: [12],
    [ACTION.MOVE_DOWN]: [13],
    [ACTION.MOVE_LEFT]: [14],
    [ACTION.MOVE_RIGHT]: [15],

    // Build mode takes the D-pad over, so these overlap with navigation on
    // purpose — the build section reads them only while building.
    [ACTION.BUILD_PREV]: [14],
    [ACTION.BUILD_NEXT]: [15],
    [ACTION.BUILD_ROTATE]: [12, 13],
    [ACTION.BUILD_PLACE]: [7],       // RT
    [ACTION.BUILD_PICK]: [6],        // LT
};

/**
 * Mobile: the touch layer is gestures and on-screen buttons rather than codes,
 * so the table records which actions it can produce. The joystick covers
 * movement; the rest are HUD buttons the player taps.
 */
export const MOBILE_BINDINGS = {
    [ACTION.MOVE_UP]: ['joystick'],
    [ACTION.MOVE_DOWN]: ['joystick'],
    [ACTION.MOVE_LEFT]: ['joystick'],
    [ACTION.MOVE_RIGHT]: ['joystick'],
    [ACTION.INTERACT]: ['interactButton'],
};

const TABLES = {
    keyboard: KEYBOARD_BINDINGS,
    gamepad: GAMEPAD_BINDINGS,
    mobile: MOBILE_BINDINGS,
};

/** Runtime overrides from the remap screens, per source. */
const overrides = { keyboard: {}, gamepad: {}, mobile: {} };

/**
 * What triggers `action` for `source`, remaps included.
 * @returns {Array<string|number>}
 */
export function bindingsFor(source, action) {
    return overrides[source]?.[action] ?? TABLES[source]?.[action] ?? [];
}

/**
 * Was any button bound to `action` pressed on this frame?
 * @param {{ has: (index: number) => boolean }} pressed - the frame's new presses
 * @param {string} action - an ACTION value
 */
export function firedAction(pressed, action) {
    return bindingsFor('gamepad', action).some((index) => pressed.has(index));
}

/**
 * Is this the trigger for that action?
 * @param {'keyboard'|'gamepad'|'mobile'} source
 * @param {string} action - an ACTION value
 * @param {string|number} trigger - a KeyboardEvent.code or a button index
 */
export function matches(source, action, trigger) {
    return bindingsFor(source, action).includes(trigger);
}

/**
 * Replaces the bindings for one source. Passing `null` for an action restores
 * its default rather than leaving it unbound — an action with no trigger is
 * invisible to the player and impossible to diagnose.
 */
export function setBindings(source, next) {
    if (!TABLES[source]) return;
    for (const [action, triggers] of Object.entries(next ?? {})) {
        if (triggers === null) delete overrides[source][action];
        else overrides[source][action] = Array.isArray(triggers) ? triggers : [triggers];
    }
    announce(source);
}

/**
 * Tells the screens their prompts may have changed.
 *
 * Guarded because this now runs while modules are still loading — keyboard.js
 * publishes the player's keys the moment it reads them — and a document that is
 * not there yet should not stop the game from starting.
 */
function announce(source) {
    try {
        document.dispatchEvent(new CustomEvent('input:bindingschanged', { detail: { source } }));
    } catch {}
}

/** Back to the shipped table for that source. */
export function resetBindings(source) {
    overrides[source] = {};
    announce(source);
}

export default { ACTION, bindingsFor, matches, setBindings, resetBindings };
