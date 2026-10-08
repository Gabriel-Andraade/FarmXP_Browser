/**
 * @file buttonHints.js - What the buttons do, where you are (#264).
 *
 * Two things, because they answer the same question in two places:
 *
 *   - a strip in the bottom-right corner naming what each button does in the
 *     screen the player is on — the world, build mode, the market, each panel
 *   - the circled letter beside a Confirm or a Cancel, so a decision says which
 *     button takes it without the player going to the corner to find out
 *
 * Only while a controller is driving. The moment a key is pressed the strip
 * disappears and the letters come off the buttons, because then they are lies.
 *
 * The glyphs come from the bindings table, not from letters written here, so a
 * remapped button changes what the corner says along with what the game does.
 */
import { ACTION, bindingsFor } from './bindings.js';
import { faceGlyph, FACE_BY_INDEX, glyphFor } from './gamepadGlyphs.js';
import { current as currentSource } from './inputSource.js';
import { isBlocking } from './panels.js';

const HOST_ID = 'gamepad-hints';

/**
 * What each screen is worth saying.
 *
 * Kept short on purpose: this is a reminder, not a manual. The ones a player
 * would otherwise have to guess come first — a screen whose only answer is
 * "A confirms, B goes back" says just that.
 */
const CONTEXTS = {
    world: [
        ['confirm', 'interact'],
        ['useTool', 'useTool'],
        ['inventory', 'inventory'],
        ['build', 'build'],
        ['pause', 'pause'],
    ],
    build: [
        ['navigate', 'buildPiece'],
        ['useTool', 'buildPlace'],
        ['toolWheel', 'buildPick'],
        ['cancel', 'buildExit'],
    ],
    panel: [
        ['navigate', 'navigate'],
        ['confirm', 'confirm'],
        ['cancel', 'back'],
    ],
    market: [
        ['paneLeft', 'marketPanes'],
        ['toolWheel', 'category'],
        ['navigate', 'marketDirection'],
        ['confirm', 'confirm'],
        ['cancel', 'back'],
    ],
    amount: [
        ['navigate', 'amount'],
        ['confirm', 'confirm'],
        ['cancel', 'cancel'],
    ],
    storage: [
        ['paneLeft', 'storagePanes'],
        ['toolWheel', 'category'],
        ['confirm', 'amountOpen'],
        ['cancel', 'back'],
    ],
    crafting: [
        ['toolWheel', 'category'],
        ['confirm', 'craft'],
        ['cancel', 'back'],
    ],
    vet: [
        ['navigate', 'vetMenu'],
        ['confirm', 'confirm'],
        ['cancel', 'back'],
    ],
    dialogue: [
        ['confirm', 'advance'],
    ],
    inventory: [
        ['navigate', 'navigate'],
        ['confirm', 'invPick'],
        ['cancel', 'invBack'],
    ],
};

/**
 * Button labels the strip uses, by the name above.
 *
 * `paneLeft` and `toolWheel` stand for their pairs — LT/RT and LB/RB — because
 * naming one of a pair and not the other reads as though only one did anything.
 */
const PAIRS = {
    paneLeft: ['LT', 'RT'],
    toolWheel: ['LB', 'RB'],
    navigate: ['D-Pad'],
};

let host = null;
let shownKey = null;

function ensureHost() {
    if (host?.isConnected) return host;
    host = document.getElementById(HOST_ID) ?? document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('aria-hidden', 'true');   // a reminder, not content
    if (!host.isConnected) document.body.appendChild(host);
    return host;
}

/** One glyph for a named button, falling back to plain text for the pairs. */
function glyphNode(name) {
    const pair = PAIRS[name];
    if (pair) {
        const wrap = document.createElement('span');
        wrap.className = 'gp-hint-keys';
        for (const label of pair) {
            const el = document.createElement('span');
            el.className = 'gp-glyph';
            el.textContent = label;
            wrap.appendChild(el);
        }
        return wrap;
    }
    return glyphFor(name);
}

function render(entries, translate) {
    const node = ensureHost();
    node.replaceChildren();
    for (const [button, label] of entries) {
        const row = document.createElement('span');
        row.className = 'gp-hint';
        const glyph = glyphNode(button);
        if (glyph) row.appendChild(glyph);
        const text = document.createElement('span');
        text.className = 'gp-hint-label';
        text.textContent = translate(label);
        row.appendChild(text);
        node.appendChild(row);
    }
    node.classList.toggle('is-visible', entries.length > 0);
}

export function hideHints() {
    if (host) host.classList.remove('is-visible');
    shownKey = null;
    clearDecorations();
}

/**
 * Which set of hints the player should be reading.
 * Exported so the choice can be tested without a screen.
 */
export function contextFor({ panel, building, kind }) {
    if (panel && isBlocking(panel)) return null;     // nothing to press
    if (!panel) return building ? 'build' : 'world';
    return kind ?? 'panel';
}

/**
 * Updates the corner. Cheap to call every frame: it only redraws when the
 * screen the player is on has actually changed.
 */
export function updateButtonHints({ panel, building, kind, translate }) {
    if (currentSource() !== 'gamepad') { hideHints(); return; }

    const context = contextFor({ panel, building, kind });
    const key = context ?? 'none';
    if (key === shownKey) { decorate(panel); return; }
    shownKey = key;

    render(context ? CONTEXTS[context] ?? CONTEXTS.panel : [], translate);
    decorate(panel);
}

// ── The letter beside a decision ────────────────────────────────────────────

/**
 * Buttons that take or refuse a decision.
 *
 * A short list rather than a guess at the words: matching on label would have
 * to know every language the game speaks, and would put an "A" on a button
 * called "Confirmar" that is not the one A presses.
 */
const DECISIONS = [
    ['.mch-confirm-yes', ACTION.CONFIRM],
    ['.mch-confirm-no', ACTION.BACK],
    ['.tmap-refuel-confirm', ACTION.CONFIRM],
    ['.tmap-refuel-cancel', ACTION.BACK],
    ['[data-gp-confirm]', ACTION.CONFIRM],
    ['[data-gp-cancel]', ACTION.BACK],
];

const MARK = 'data-gp-decorated';

function faceFor(action) {
    return FACE_BY_INDEX[bindingsFor('gamepad', action)[0]] ?? null;
}

function decorate(panel) {
    if (!panel?.querySelectorAll) return;
    for (const [selector, action] of DECISIONS) {
        for (const el of panel.querySelectorAll(selector)) {
            if (el.hasAttribute(MARK)) continue;
            const glyph = faceGlyph(faceFor(action));
            if (!glyph) continue;
            glyph.classList.add('gp-decision-glyph');
            el.setAttribute(MARK, 'true');
            el.prepend(glyph);
        }
    }
}

function clearDecorations() {
    for (const el of document.querySelectorAll(`[${MARK}]`)) {
        el.removeAttribute(MARK);
        el.querySelector('.gp-decision-glyph')?.remove();
    }
}

export default { updateButtonHints, hideHints, contextFor };
