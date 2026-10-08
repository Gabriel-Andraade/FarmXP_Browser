/**
 * @file gamepadInput.js - Reads the controller and feeds it into the game (#264).
 *
 * ## How it reaches the rest of the game
 *
 * Nothing downstream knows a controller exists. Three bridges do the work:
 *
 *   - **World actions** go into `setGamepadActions()` in control.js, the same
 *     action layer the keyboard and the mobile joystick already use.
 *   - **Menus** get synthetic `ArrowUp/Down/Left/Right`, `Enter` and `Escape`
 *     key events. Every panel in the game already handles those, so they became
 *     navigable without being touched — including ones not opened here.
 *   - **Aiming** goes through gamepadCursor.js, which feeds the same mouse
 *     position the canvas code already reads.
 *
 * ## The duplicate pad
 *
 * Windows exposes one physical controller twice: through XInput
 * (`mapping: "standard"`) and through DirectInput (`mapping: ""`, ~10 axes).
 * Reading both counts every press twice and makes the axes fight, so only
 * `standard` pads are used — falling back to a raw one only if that is all
 * there is.
 *
 * Button map and the reasoning behind it: `mapController.md`.
 */
import { setGamepadActions, getKeybinds } from '../control.js';
import { ACTION, bindingsFor } from './bindings.js';
import { getSystem } from '../../gameState.js';
import { gamepadSettings } from './gamepadSettings.js';
import { isActive, pollGamepadActivity } from './inputSource.js';
import { isPanelOpen, openPanel } from './panels.js';
import { updateButtonHints, hideHints } from './buttonHints.js';
import * as nav from './panelNavigation.js';
import { logger } from '../../logger.js';

/**
 * Which button does what lives in bindings.js, keyed by action id — the same
 * table the remap screen will write to. This file asks "was BACK pressed?",
 * never "was button 1 pressed?", so a remapped pad needs no change here.
 */
export const AXIS = Object.freeze({ LEFT_X: 0, LEFT_Y: 1, RIGHT_X: 2, RIGHT_Y: 3 });

/** Menu navigation repeat, matching the system's key repeat. */
const REPEAT_DELAY_MS = 420;
const REPEAT_RATE_MS = 110;

/** Treat a trigger as pressed past this, for pads that report them as axes. */
const TRIGGER_THRESHOLD = 0.5;

/**
 * Pads the browser will show us, newest API shape first.
 * @returns {Gamepad[]}
 */
export function readPads() {
    const list = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
        ? navigator.getGamepads()
        : null;
    return Array.from(list ?? []).filter(Boolean);
}

/**
 * The one pad to read. Prefers `standard`, because the same controller also
 * shows up unmapped and reading both double-counts everything.
 *
 * @param {Gamepad[]} pads
 * @returns {Gamepad|null}
 */
export function pickPad(pads) {
    if (!pads.length) return null;
    const standard = pads.filter((p) => p.mapping === 'standard');
    return (standard.length ? standard : pads)[0];
}

/** Is this button down? Tolerates pads that report triggers as values. */
function isDown(pad, index) {
    const button = pad.buttons?.[index];
    if (!button) return false;
    if (typeof button === 'number') return button > TRIGGER_THRESHOLD;
    return button.pressed === true || button.value > TRIGGER_THRESHOLD;
}

/** Is any button bound to this action being held? */
function held(pad, action) {
    return bindingsFor('gamepad', action).some((index) => isDown(pad, index));
}

/** Was any button bound to this action pressed on this frame? */
function fired(pressed, action) {
    return bindingsFor('gamepad', action).some((index) => pressed.has(index));
}

/**
 * Stick direction past the dead zone.
 *
 * Radial, not per axis: testing each axis separately makes diagonals snap to
 * exactly 45°, because both components cross the threshold at once.
 *
 * @returns {{x: number, y: number, magnitude: number}} normalised past the zone
 */
export function stickVector(pad, xAxis, yAxis, deadZone) {
    const x = pad.axes?.[xAxis] ?? 0;
    const y = pad.axes?.[yAxis] ?? 0;
    const magnitude = Math.hypot(x, y);
    if (magnitude < deadZone) return { x: 0, y: 0, magnitude: 0 };
    // Rescale so movement starts at 0 right outside the zone instead of
    // jumping to the dead-zone value.
    const scaled = (magnitude - deadZone) / (1 - deadZone);
    return { x: (x / magnitude) * scaled, y: (y / magnitude) * scaled, magnitude: scaled };
}

class GamepadInput {
    constructor() {
        this.connected = false;
        this._prevButtons = [];
        this._repeat = { dir: null, nextAt: 0 };
        this._wheelOpen = false;
        this._onPanel = () => false;
        this._cursor = null;
        this._resync = false;
    }

    /**
     * @param {Object} deps
     * @param {() => boolean} deps.isPanelOpen - true when a menu owns the input
     * @param {Object} deps.cursor - gamepadCursor module
     */
    init({ closeTopPanel, moveFocus, activateFocused, ensureFocus, panelButtons, panelKind, translate, cursor } = {}) {
        if (this._initialised) return;
        this._initialised = true;
        this._onPanel = isPanelOpen;
        // Leaving build mode calls the system directly instead of sending
        // Escape. Escape has two owners — control.js leaves build, the pause
        // menu opens — and which one wins depends on listener registration
        // order. Calling stopBuilding() removes the race entirely.
        //
        // In the open world B does nothing: Start is what pauses.
        const close = closeTopPanel ?? (() => false);
        this._back = () => {
            if (close()) return;
            if (this._building()) this._stopBuilding();
        };
        this._moveFocus = moveFocus ?? null;
        this._activate = activateFocused ?? null;
        this._ensureFocus = ensureFocus ?? null;
        this._panelButtons = panelButtons ?? null;
        this._panelKind = panelKind ?? (() => null);
        this._translate = translate ?? ((key) => key);
        this._cursor = cursor ?? null;

        window.addEventListener('gamepadconnected', (e) => {
            this.connected = true;
            logger.info(`[gamepad] ${e.gamepad.id} (${e.gamepad.mapping || 'unmapped'})`);
            document.dispatchEvent(new CustomEvent('gamepad:connected', { detail: { id: e.gamepad.id } }));
        });
        window.addEventListener('gamepaddisconnected', () => {
            this.connected = readPads().length > 0;
            this._standDown();
            document.dispatchEvent(new CustomEvent('gamepad:disconnected'));
        });

        // Who is driving is inputSource's job now — see input/inputSource.js.
    }

    /** Called once per frame from the game loop. */
    update(now = performance.now()) {
        // Another source took over (the player reached for the keyboard):
        // stand down so both do not drive at once.
        if (!isActive('gamepad')) {
            pollGamepadActivity();
            if (!isActive('gamepad')) { this._standDown(); hideHints(); return; }
        }

        const pad = pickPad(readPads());
        if (!pad) {
            if (this.connected) { this.connected = false; this._standDown(); }
            return;
        }
        this.connected = true;

        const settings = gamepadSettings.current;
        const pressed = this._edges(pad);
        pollGamepadActivity();

        if (this._onPanel()) {
            this._release();            // never walk the player while a menu is up
            this._driveMenu(pad, settings, now, pressed);
        } else {
            this._repeat.dir = null;
            this._driveWorld(pad, settings, pressed);
        }

        this._cursor?.update(pad, settings, this._onPanel());

        // The corner names what the buttons do here. Cheap every frame: it only
        // redraws when the screen the player is on has changed.
        const panel = openPanel();
        updateButtonHints({
            panel,
            building: this._building(),
            kind: this._panelKind(panel),
            translate: this._translate,
        });
    }

    // ── World ──────────────────────────────────────────────────────────────

    _driveWorld(pad, settings, pressed) {
        const stick = stickVector(pad, AXIS.LEFT_X, AXIS.LEFT_Y, settings.deadZone);
        // While building, the D-pad picks the piece and its orientation, so it
        // must not also walk the player. The left stick still moves.
        const building = this._building();
        const dpad = building ? { up: false, down: false, left: false, right: false } : {
            up: held(pad, ACTION.MOVE_UP), down: held(pad, ACTION.MOVE_DOWN),
            left: held(pad, ACTION.MOVE_LEFT), right: held(pad, ACTION.MOVE_RIGHT),
        };
        // 8-way, because the player moves at a fixed speed: the stick decides
        // direction, not how fast.
        const threshold = 0.4;
        // Movement is continuous and read from the `keys` object, so it goes
        // through the action layer.
        setGamepadActions({
            moveUp: dpad.up || stick.y < -threshold,
            moveDown: dpad.down || stick.y > threshold,
            moveLeft: dpad.left || stick.x < -threshold,
            moveRight: dpad.right || stick.x > threshold,
        });

        // Everything else is a one-shot the game listens for as a *keyboard
        // event* — `isActionKeyEvent(e, 'interact')` and friends. Setting a
        // boolean on the action object does nothing, because nothing reads it;
        // only a real keydown reaches those handlers. Using the player's own
        // binding means a remapped key keeps working.
        if (!building && fired(pressed, ACTION.INVENTORY)) this._action('inventory');
        if (!building && fired(pressed, ACTION.MERCHANTS)) this._action('merchants');

        // Tool wheel mirrors the keyboard: hold to open, release to equip.
        const holdingLB = held(pad, ACTION.TOOL_WHEEL);
        // Cancelling with B only lasts until LB is let go: without this the
        // "hold to open" check reopened the wheel on the very next frame, so B
        // did nothing at all while the finger stayed on LB.
        if (!holdingLB) this._wheelCancelled = false;
        if (holdingLB && !this._wheelOpen && !this._wheelCancelled) {
            this._wheelOpen = true;
            document.dispatchEvent(new CustomEvent('gamepad:toolwheel', { detail: { action: 'open' } }));
        } else if (!holdingLB && this._wheelOpen) {
            this._wheelOpen = false;
            document.dispatchEvent(new CustomEvent('gamepad:toolwheel', { detail: { action: 'equip' } }));
        }
        if (this._wheelOpen && fired(pressed, ACTION.TOOL_CYCLE)) {
            document.dispatchEvent(new CustomEvent('gamepad:toolwheel', { detail: { action: 'next' } }));
        }
        if (this._wheelOpen && fired(pressed, ACTION.BACK)) {
            this._wheelOpen = false;
            this._wheelCancelled = true;
            document.dispatchEvent(new CustomEvent('gamepad:toolwheel', { detail: { action: 'cancel' } }));
        }

        // A direct call, not Escape: the pause menu now ignores Escape while
        // the controller is driving (Escape there is only ever the synthetic
        // event B sends to close another panel), so sending it did nothing.
        if (fired(pressed, ACTION.PAUSE)) this._pause();
        if (fired(pressed, ACTION.BACK)) this._back?.();
        // Build mode is bound to a literal 'b' in control.js, not to a keybind.
        if (fired(pressed, ACTION.BUILD) && !this._building()) this._key('b', 'KeyB');
        if (this._building()) this._driveBuild(pressed);

        // RT uses the equipped tool — but never while the wheel is up, or the
        // player swings the moment they finish choosing.
        // While building RT places the piece (handled in _driveBuild), so the
        // tool must not swing at the same time.
        if (!this._wheelOpen && !building && fired(pressed, ACTION.USE_TOOL)) this._cursor?.primaryAction();
        if (!building && fired(pressed, ACTION.INTERACT)) {
            // mapController.md: A acts on whatever is under the reticle; with
            // nothing aimed at, it falls back to the proximity interact.
            if (!this._cursor?.confirmAction()) this._action('interact');
        }
    }

    /** Build mode runs its own map: see mapController.md. */
    _driveBuild(pressed) {
        // D-pad ← → : which piece. ↑ ↓ : its orientation (a fence lies
        // horizontally until it is rotated), both the same so either thumb
        // direction works.
        if (fired(pressed, ACTION.BUILD_PREV) || fired(pressed, ACTION.BUILD_NEXT)) this._key('q', 'KeyQ');
        if (fired(pressed, ACTION.BUILD_ROTATE)) this._key('r', 'KeyR');

        // A left click at the reticle, not the place key: the canvas handler
        // checks the enclosure "+" first and falls through to placing, so one
        // button does the right thing in both cases — same as the mouse.
        if (fired(pressed, ACTION.BUILD_PLACE)) this._cursor?.primaryAction();
        if (fired(pressed, ACTION.BUILD_PICK)) this._pickUp();    // take it back
    }

    /**
     * LT takes a placed piece back, which the mouse does with a right click —
     * so it is a right click at the reticle, reusing the handler that already
     * converts the coordinates and finds the fence.
     */
    _pickUp() {
        this._cursor?.secondaryAction();
    }

    // ── Menus ──────────────────────────────────────────────────────────────

    _driveMenu(pad, settings, now, pressed) {
        // A freshly opened panel has nothing focused; highlight its first item
        // so the player sees where they are before touching anything.
        this._ensureFocus?.();

        // A panel may claim the D-pad for itself — the market does, because it
        // is two panes with their own tabs. The stick is never claimed, so it
        // goes on walking whatever the panel holds.
        const claim = this._panelButtons?.(pressed) ?? false;
        const ownsDpad = !!claim;
        // A is both "first answer" and "confirm"; B is both "second answer" and
        // "back". When a dialogue answers with one of them, the generic
        // handlers below must not also act on the same press — A would fall
        // through to a synthetic Enter and advance the line it just answered.
        const consumed = claim === 'consumed';

        const stick = stickVector(pad, AXIS.LEFT_X, AXIS.LEFT_Y, settings.deadZone);
        const dpad = (action) => !ownsDpad && held(pad, action);
        const dir =
            dpad(ACTION.NAV_UP) || stick.y < -0.5 ? 'ArrowUp' :
            dpad(ACTION.NAV_DOWN) || stick.y > 0.5 ? 'ArrowDown' :
            dpad(ACTION.NAV_LEFT) || stick.x < -0.5 ? 'ArrowLeft' :
            dpad(ACTION.NAV_RIGHT) || stick.x > 0.5 ? 'ArrowRight' : null;

        if (dir !== this._repeat.dir) {
            // New direction fires immediately, then waits out the longer delay.
            this._repeat.dir = dir;
            this._repeat.nextAt = now + REPEAT_DELAY_MS;
            if (dir) this._navigate(dir);
        } else if (dir && now >= this._repeat.nextAt) {
            this._repeat.nextAt = now + REPEAT_RATE_MS;
            this._navigate(dir);
        }

        if (!consumed && fired(pressed, ACTION.CONFIRM)) {
            // Panels are navigated, never pointed at — the reticle is not
            // consulted here at all. Enter is the fallback for a panel with
            // nothing focusable in it.
            if (!this._activate?.()) this._key('Enter');
        }
        if (!consumed && fired(pressed, ACTION.BACK)) this._back?.();
        // Start is never an answer, so it keeps working either way.
        if (fired(pressed, ACTION.PAUSE)) this._pause();
    }

    /**
     * Menu navigation. Arrow keys first, because the pause menu listens for
     * them; then DOM focus, which is what makes every other panel work — they
     * only ever supported Tab and clicks.
     */
    /**
     * Menu navigation moves the focus, and only the focus.
     *
     * It used to also send the Arrow key, which gave panels with their own
     * selection — the pause menu — a second cursor of their own. The two drifted
     * apart and two rows lit up at once.
     */
    _navigate(dir) {
        if (this._moveFocus?.(dir)) return;
        // Nothing focusable: let a panel that listens for arrows handle it.
        this._key(dir);
    }

    // ── Plumbing ───────────────────────────────────────────────────────────

    /** Buttons that went down on this frame, as a Set plus an `any` flag. */
    _edges(pad) {
        const set = new Set();
        let any = false;
        for (let i = 0; i < pad.buttons.length; i++) {
            const down = isDown(pad, i);
            if (down) any = true;
            if (down && !this._prevButtons[i]) set.add(i);
            this._prevButtons[i] = down;
        }
        // Coming back after standing down: adopt whatever is held right now
        // without calling it a press. A button still down from before has to be
        // released and pressed again, which is what the player expects anyway.
        if (this._resync) {
            this._resync = false;
            set.clear();
            any = false;
        }
        set.has = Set.prototype.has.bind(set);
        set.any = any;
        return set;
    }

    /**
     * Fires the player's bound key for a game action, as a real keyboard event.
     * The game's handlers listen for keydown, not for polled state.
     */
    _action(action) {
        const codes = getKeybinds()[action] ?? [];
        const code = codes[0];
        if (!code) return;
        // `key` matters as much as `code`: some handlers compare e.key.
        const key = code.startsWith('Key') ? code.slice(3).toLowerCase() : code;
        this._key(key, code);
    }

    /** Synthetic key event — this is what makes every existing menu work. */
    _key(key, code = key) {
        const target = document.activeElement ?? document.body;
        for (const type of ['keydown', 'keyup']) {
            target.dispatchEvent(new KeyboardEvent(type, {
                key,
                code,
                bubbles: true,
                cancelable: true,
            }));
        }
    }

    /**
     * True while the build cursor is active — it owns the buttons then.
     * Reads the body class BuildSystem already sets, rather than holding a
     * reference: that reference only exists once the world has loaded, and the
     * input layer now starts at the main menu.
     */
    _building() {
        return document.body?.classList?.contains('building-mode') === true;
    }

    /**
     * Leaves build mode.
     *
     * BuildSystem is a plain export, not a registered system, and importing it
     * up front would pull a world module in at the main menu — where the input
     * layer now starts. So it is fetched only when it is actually needed.
     */
    _stopBuilding() {
        import('../../buildSystem.js')
            .then((m) => m.BuildSystem?.stopBuilding?.())
            .catch(() => this._key('Escape'));   // control.js also leaves on Escape
    }

    /** Start: toggles the pause menu through the system, not through a key. */
    _pause() {
        getSystem('pauseMenu')?.toggle?.();
    }

    /**
     * Stops driving the world. Runs **every frame** a panel is open, so it must
     * stay idempotent and must not touch the button history.
     *
     * It used to clear `_prevButtons` here, and that was the bug behind every
     * "it acted like a double click" report: with the history wiped, the next
     * frame saw a button that was merely still held as a brand-new press. A
     * normal press lasts 5 to 9 frames, so one tap of A fired 5 to 9 times and
     * ran straight through a menu, a dialog and whatever was behind it.
     */
    _release() {
        setGamepadActions({});
        this._wheelOpen = false;
    }

    /**
     * The layer is handing control over (the keyboard took it, or the pad is
     * gone). Forgetting the history is right here — but `_edges` has to adopt
     * the live state on the way back instead of reading it as a press.
     */
    _standDown() {
        this._release();
        this._prevButtons = [];
        this._resync = true;
    }

}

export const gamepadInput = new GamepadInput();
export default gamepadInput;
