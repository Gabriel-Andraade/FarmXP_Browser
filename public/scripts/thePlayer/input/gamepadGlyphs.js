/**
 * @file gamepadGlyphs.js - Button names in place of key names (#264).
 *
 * The game writes prompts like "E" or "Esc" all over the HUD and the help
 * panel. Once the player picks up the controller those are lies, so anything
 * tagged `data-gp-action` gets rewritten to the button that does the same job,
 * and switches back the moment a key is pressed.
 *
 * Tag-based rather than scanning for key names: searching the DOM for the
 * letter "E" would rewrite half the interface.
 */
import { bindingsFor } from './bindings.js';

/**
 * Action -> button, following mapController.md. The label is what the player
 * sees; `face` picks the Xbox colour for the four face buttons.
 */
export const GLYPHS = Object.freeze({
    interact: { label: 'A', face: 'a' },
    confirm: { label: 'A', face: 'a' },
    cancel: { label: 'B', face: 'b' },
    back: { label: 'B', face: 'b' },
    build: { label: 'X', face: 'x' },
    inventory: { label: 'Y', face: 'y' },
    rotate: { label: 'Y', face: 'y' },
    toolWheel: { label: 'LB' },
    nextTool: { label: 'RB' },
    useTool: { label: 'RT' },
    pause: { label: 'Start' },
    navigate: { label: 'D-Pad' },
    aim: { label: 'R-Stick' },
    move: { label: 'L-Stick' },
});

/**
 * The face buttons by their standard-mapping index.
 *
 * Lets a screen that puts a button on a choice derive the letter it prints from
 * the binding it will listen for, rather than writing "A" next to something that
 * answers to a different button.
 */
export const FACE_BY_INDEX = Object.freeze({ 0: 'A', 1: 'B', 2: 'X', 3: 'Y' });

/**
 * Every button of the standard mapping, as the player would name it.
 *
 * The four D-pad directions come back as one `D-Pad`, because a screen listing
 * "move up" and "move down" separately would otherwise print the same four
 * arrows twice over.
 */
const BUTTON_LABELS = Object.freeze({
    0: 'A', 1: 'B', 2: 'X', 3: 'Y',
    4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
    8: 'View', 9: 'Start', 10: 'L3', 11: 'R3',
    12: 'D-Pad', 13: 'D-Pad', 14: 'D-Pad', 15: 'D-Pad',
});

/**
 * What the controller presses for an action, by name.
 *
 * Read from the bindings table rather than a list written here, so a screen
 * that prints this and the game that answers to it cannot disagree — and an
 * action with no button on the controller answers honestly with nothing.
 *
 * @param {string} action - an ACTION value
 * @returns {string[]} button names, empty when the controller has none
 */
export function buttonsForAction(action) {
    const seen = new Set();
    for (const index of bindingsFor('gamepad', action)) {
        const label = BUTTON_LABELS[index];
        if (label) seen.add(label);
    }
    return [...seen];
}

/** Movement is the stick as much as the D-pad; both are worth naming. */
export const MOVEMENT_ACTIONS = Object.freeze(['moveUp', 'moveDown', 'moveLeft', 'moveRight']);

/** One face button, by its letter. Same circled badge as the prompts. */
export function faceGlyph(letter) {
    const face = String(letter ?? '').toLowerCase();
    if (!'abxy'.includes(face) || face.length !== 1) return null;
    const el = document.createElement('span');
    el.className = `gp-glyph gp-glyph-${face}`;
    el.textContent = letter;
    return el;
}

/** Renders one glyph; returns a span so callers can place it anywhere. */
export function glyphFor(action) {
    const glyph = GLYPHS[action];
    if (!glyph) return null;
    const el = document.createElement('span');
    el.className = `gp-glyph${glyph.face ? ` gp-glyph-${glyph.face}` : ''}`;
    el.textContent = glyph.label;
    return el;
}

/*
 * There used to be a `data-gp-action` swapper here: tag a prompt, and it would
 * rewrite "E" to "A" when the controller took over. It was built, initialised
 * and listening for the whole of #264 - and the game never tagged a single
 * element, so it rewrote nothing.
 *
 * The screens that needed it ask directly instead, through `buttonsForAction`:
 * the help panel and the equipped-item badge have the action in hand already,
 * and get a straight answer from the bindings table rather than a second table
 * living here. Deleted rather than left waiting for a caller.
 */

export default { glyphFor, faceGlyph, buttonsForAction, GLYPHS, FACE_BY_INDEX };