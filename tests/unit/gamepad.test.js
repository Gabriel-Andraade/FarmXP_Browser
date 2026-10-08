import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import '../setup.js';

/**
 * @file gamepad.test.js - Playing with a controller (#264).
 *
 * Every test about the controller, in one file: reading the pad, the reticle,
 * driving each panel, and the buttons the game names on screen.
 *
 * One file because `mock.module` replaces a module for the whole run rather
 * than for the file that asked. Split across fourteen files, each one declared
 * its own stub of the same modules, and the differences between those stubs
 * were a bug source of their own — twice during this feature a stub written in
 * one file broke a different file entirely. Here the stubs are declared once,
 * and what each section needs is visible beside what every other section needs.
 *
 * The sections are block-scoped. They were separate files and several of them
 * named their helpers the same thing, which at the top level of one file is a
 * syntax error rather than a merge.
 */

// ── The stubs, once ─────────────────────────────────────────────────────────

mock.module('../../public/scripts/logger.js', () => ({
    logger: { info() {}, warn() {}, error() {}, debug() {} },
}));

/**
 * control.js: the union of what two sections steer. The reticle asks where the
 * pointer last was; the pad writes into the action table.
 */
let pointer = { x: 10, y: 20 };
mock.module('../../public/scripts/thePlayer/control.js', () => ({
    setGamepadActions: () => {},
    getKeybinds: () => ({}),
    keys: {},
    getPointerScreenPos: () => pointer,
}));

/** What the reticle finds under itself, steered by the sections that care. */
let objectAtPointer = null;
const realCollision = await import('../../public/scripts/collisionSystem.js');
mock.module('../../public/scripts/collisionSystem.js', () => ({
    ...realCollision,
    // Object.create, not a spread: spreading an instance copies only its own
    // properties and drops the prototype, where its methods and CONFIG_SIZES
    // live — its own tests failed on the two it reads.
    collisionSystem: Object.assign(Object.create(realCollision.collisionSystem), {
        getObjectAtMouse: () => objectAtPointer,
    }),
}));

const realCamera = await import('../../public/scripts/thePlayer/cameraSystem.js');
mock.module('../../public/scripts/thePlayer/cameraSystem.js', () => ({ ...realCamera }));

/**
 * panels.js with the highlight spied on.
 *
 * `...realPanels` keeps the surface whole — the selector lists and the panel
 * detection are read by several sections. The two overrides are the ones the
 * market and the vet were written against; neither disturbs the others, because
 * the stub elements have no geometry for the real `onScreen` to read anyway.
 */
const realPanels = await import('../../public/scripts/thePlayer/input/panels.js');
const marked = [];
mock.module('../../public/scripts/thePlayer/input/panels.js', () => ({
    ...realPanels,
    focusAndMark: (el) => marked.push(el),
    focusableIn: (root) => root?.items ?? [],
    onScreen: () => true,
}));

/**
 * A narrow stub, knowingly: importing the real dialogueSystem registers the
 * system and wires its listeners at load, and doing that from a test cost ten
 * tests in files that run later.
 */
let chosen = [];
let accepts = true;
mock.module('../../public/scripts/dialogueSystem.js', () => ({
    chooseByAction: (action) => { chosen.push(action); return accepts; },
}));

// ─── Who is driving ────────────────────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: the base of the input refactor.
     *
     * These two modules exist because the game had no single answer to "who is
     * driving?" and "what does this button do?" — each file decided for itself and
     * they disagreed, which is how B ended up closing the inventory *and* opening
     * the pause menu on one press.
     *
     * What is pinned here is the part that is easy to break silently: the action
     * ids the whole game is keyed by, and the rule that exactly one source is
     * active at a time.
     */

    const { current, isActive, setSource, pollGamepadActivity } =
      await import('../../public/scripts/thePlayer/input/inputSource.js');
    const { ACTION, bindingsFor, matches, setBindings, resetBindings,
            KEYBOARD_BINDINGS, GAMEPAD_BINDINGS } =
      await import('../../public/scripts/thePlayer/input/bindings.js');

    describe('input source (#264)', () => {
      beforeEach(() => setSource('keyboard'));

      test('starts on the keyboard', () => {
        expect(current()).toBe('keyboard');
      });

      test('marks the body so CSS can follow who is driving', () => {
        // This is what hides the system pointer: it used to sit frozen on screen
        // next to the reticle, and in menus it suggested the player could click.
        //
        // The shared stub's classList is a no-op that always reports false, so this
        // test brings a real one rather than asserting against a lie.
        const classes = new Set();
        const realBody = document.body;
        document.body = {
          classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
            contains: (c) => classes.has(c),
          },
        };

        try {
          setSource('gamepad');
          expect(classes.has('input-gamepad')).toBe(true);
          expect(classes.has('input-keyboard')).toBe(false);

          setSource('keyboard');
          expect(classes.has('input-keyboard')).toBe(true);
          expect(classes.has('input-gamepad')).toBe(false);
        } finally {
          document.body = realBody;
        }
      });

      test('exactly one source is active', () => {
        setSource('gamepad');
        expect(isActive('gamepad')).toBe(true);
        expect(isActive('keyboard')).toBe(false);
        expect(isActive('mobile')).toBe(false);
      });

      test('announces a change once, and only on a real change', () => {
        // Sections stand down on this event; firing it every frame would have them
        // tearing themselves down and rebuilding constantly.
        let changes = 0;
        const onChange = () => { changes++; };
        document.addEventListener('input:sourcechanged', onChange);

        setSource('gamepad');
        setSource('gamepad');
        setSource('gamepad');
        expect(changes).toBe(1);

        setSource('keyboard');
        expect(changes).toBe(2);

        document.removeEventListener('input:sourcechanged', onChange);
      });

      test('a resting pad does not steal control from the keyboard', () => {
        // A stick at rest reports values that wobble around zero. Without a wake
        // threshold the controller would take over while nobody touched it, and
        // the prompts would flip to button glyphs on their own.
        globalThis.navigator = {
          getGamepads: () => [{
            buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
            axes: [0.02, -0.03, 0.01, 0],
          }],
        };
        pollGamepadActivity();
        expect(current()).toBe('keyboard');
      });

      test('a real push hands control to the pad', () => {
        globalThis.navigator = {
          getGamepads: () => [{
            buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
            axes: [0.95, 0, 0, 0],
          }],
        };
        pollGamepadActivity();
        expect(current()).toBe('gamepad');
      });

      test('a pressed button hands control to the pad', () => {
        globalThis.navigator = {
          getGamepads: () => [{
            buttons: [{ pressed: true, value: 1 }],
            axes: [0, 0, 0, 0],
          }],
        };
        pollGamepadActivity();
        expect(current()).toBe('gamepad');
      });
    });

    describe('bindings (#264)', () => {
      beforeEach(() => {
        resetBindings('keyboard');
        resetBindings('gamepad');
      });

      test('every source is keyed by the same action ids', () => {
        // The point of the table: a screen asks for `interact` and never has to
        // know whether a key or a button answers.
        for (const table of [KEYBOARD_BINDINGS, GAMEPAD_BINDINGS]) {
          for (const action of Object.keys(table)) {
            expect(Object.values(ACTION), `unknown action "${action}"`).toContain(action);
          }
        }
      });

      test('the actions a player uses constantly are bound on both', () => {
        for (const action of [ACTION.INTERACT, ACTION.INVENTORY, ACTION.PAUSE, ACTION.BACK]) {
          expect(bindingsFor('keyboard', action).length, `keyboard: ${action}`).toBeGreaterThan(0);
          expect(bindingsFor('gamepad', action).length, `gamepad: ${action}`).toBeGreaterThan(0);
        }
      });

      test('keyboard bindings are physical key codes, not characters', () => {
        // `code`, not `key`: `KeyW` is the same physical key on AZERTY, where the
        // character would be "z".
        for (const codes of Object.values(KEYBOARD_BINDINGS)) {
          for (const code of codes) {
            expect(code, `"${code}" looks like a character`).toMatch(/^[A-Z]/);
          }
        }
      });

      test('gamepad bindings are standard-mapping indices', () => {
        for (const [action, buttons] of Object.entries(GAMEPAD_BINDINGS)) {
          for (const index of buttons) {
            expect(Number.isInteger(index), `${action} -> ${index}`).toBe(true);
            expect(index, `${action} -> ${index}`).toBeGreaterThanOrEqual(0);
            expect(index, `${action} -> ${index}`).toBeLessThanOrEqual(16);
          }
        }
      });

      test('matches() answers for the right source only', () => {
        expect(matches('keyboard', ACTION.INTERACT, 'KeyE')).toBe(true);
        expect(matches('gamepad', ACTION.INTERACT, 0)).toBe(true);
        // A key is not a button: asking the wrong table must not answer yes.
        expect(matches('gamepad', ACTION.INTERACT, 'KeyE')).toBe(false);
      });

      test('a remap replaces the default for that source alone', () => {
        setBindings('keyboard', { [ACTION.INTERACT]: ['KeyF'] });
        expect(matches('keyboard', ACTION.INTERACT, 'KeyF')).toBe(true);
        expect(matches('keyboard', ACTION.INTERACT, 'KeyE')).toBe(false);
        // The controller keeps its own binding.
        expect(matches('gamepad', ACTION.INTERACT, 0)).toBe(true);
      });

      test('clearing a remap restores the default instead of unbinding', () => {
        // An action with no trigger is invisible to the player and impossible to
        // diagnose, so null means "back to default", not "off".
        setBindings('keyboard', { [ACTION.INTERACT]: ['KeyF'] });
        setBindings('keyboard', { [ACTION.INTERACT]: null });
        expect(matches('keyboard', ACTION.INTERACT, 'KeyE')).toBe(true);
      });

      test('a single trigger does not have to be wrapped in an array', () => {
        setBindings('gamepad', { [ACTION.INTERACT]: 2 });
        expect(matches('gamepad', ACTION.INTERACT, 2)).toBe(true);
      });

      test('an unknown action reads as unbound rather than throwing', () => {
        expect(bindingsFor('keyboard', 'noSuchAction')).toEqual([]);
        expect(matches('keyboard', 'noSuchAction', 'KeyE')).toBe(false);
      });
    });
}

// ─── Reading the pad ───────────────────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: the controller layer. The parts worth pinning are the ones that fail
     * quietly — a pad picked wrong counts every press twice, a dead zone done per
     * axis snaps diagonals to 45°, and settings that do not clamp let a hand-edited
     * value lock the player out of their own controls.
     *
     * The polling loop itself needs a real pad and a real frame, so that is left to
     * hardware testing.
     */

    const { pickPad, stickVector, AXIS } =
      await import('../../public/scripts/thePlayer/input/gamepadInput.js');
    const { normalize, DEFAULTS, RANGES } =
      await import('../../public/scripts/thePlayer/input/gamepadSettings.js');

    /** Minimal pad stand-in. */
    const pad = (over = {}) => ({
      id: 'test pad',
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
      ...over,
    });

    describe('gamepad: choosing the pad (#264)', () => {
      test('prefers the standard mapping over the raw duplicate', () => {
        // Windows shows one physical controller twice: XInput (standard, 4 axes)
        // and DirectInput (unmapped, ~10 axes). Reading both counts every press
        // twice and makes the axes fight.
        const raw = pad({ id: 'Controller (XBOX 360 For Windows)', mapping: '', axes: new Array(10).fill(0) });
        const standard = pad({ id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)' });

        expect(pickPad([raw, standard]).id).toContain('XInput');
        expect(pickPad([standard, raw]).id).toContain('XInput');
      });

      test('falls back to an unmapped pad when that is all there is', () => {
        const raw = pad({ id: 'odd pad', mapping: '' });
        expect(pickPad([raw]).id).toBe('odd pad');
      });

      test('no pad is no crash', () => {
        expect(pickPad([])).toBeNull();
      });
    });

    describe('gamepad: stick dead zone (#264)', () => {
      const DEAD = 0.35;

      test('ignores drift inside the zone', () => {
        // A worn stick rests off-centre; without this the player walks on their own.
        const v = stickVector(pad({ axes: [0.2, 0.2, 0, 0] }), AXIS.LEFT_X, AXIS.LEFT_Y, DEAD);
        expect(v).toEqual({ x: 0, y: 0, magnitude: 0 });
      });

      test('is radial, so diagonals do not snap to 45 degrees', () => {
        // Testing each axis on its own crosses both thresholds at once, which pins
        // the diagonal exactly on the corner. Radial keeps the real angle.
        const v = stickVector(pad({ axes: [0.9, 0.2, 0, 0] }), AXIS.LEFT_X, AXIS.LEFT_Y, DEAD);
        expect(v.magnitude).toBeGreaterThan(0);
        expect(Math.abs(v.x)).toBeGreaterThan(Math.abs(v.y) * 3);
      });

      test('starts from zero just outside the zone, not from the zone value', () => {
        // Without rescaling the character would jump to 35% speed the instant the
        // stick passes the threshold.
        const justOutside = stickVector(pad({ axes: [DEAD + 0.01, 0, 0, 0] }), AXIS.LEFT_X, AXIS.LEFT_Y, DEAD);
        expect(justOutside.magnitude).toBeLessThan(0.05);
      });

      test('reaches full tilt at the edge', () => {
        const full = stickVector(pad({ axes: [1, 0, 0, 0] }), AXIS.LEFT_X, AXIS.LEFT_Y, DEAD);
        expect(full.magnitude).toBeCloseTo(1, 5);
        expect(full.x).toBeCloseTo(1, 5);
      });

      test('a pad with no axes reads as centred', () => {
        const v = stickVector({ axes: undefined }, AXIS.LEFT_X, AXIS.LEFT_Y, DEAD);
        expect(v.magnitude).toBe(0);
      });
    });

    describe('gamepad: button map (#264)', () => {
      test('bindings follow the standard layout mapController.md is written against', async () => {
        const { ACTION, bindingsFor } = await import('../../public/scripts/thePlayer/input/bindings.js');
        const only = (action) => bindingsFor('gamepad', action)[0];
        expect(only(ACTION.INTERACT)).toBe(0);        // A
        expect(only(ACTION.BACK)).toBe(1);            // B
        expect(only(ACTION.BUILD)).toBe(2);           // X
        expect(only(ACTION.TOOL_WHEEL)).toBe(4);      // LB
        expect(only(ACTION.TOOL_CYCLE)).toBe(5);      // RB
        expect(only(ACTION.USE_TOOL)).toBe(7);        // RT
        expect(only(ACTION.PAUSE)).toBe(9);           // Start
        expect(only(ACTION.NAV_UP)).toBe(12);
        expect(only(ACTION.NAV_RIGHT)).toBe(15);
        // Y and View both open the inventory.
        expect(bindingsFor('gamepad', ACTION.INVENTORY)).toEqual([3, 8]);
      });

      test('axis indices match the standard layout', () => {
        expect([AXIS.LEFT_X, AXIS.LEFT_Y, AXIS.RIGHT_X, AXIS.RIGHT_Y]).toEqual([0, 1, 2, 3]);
      });
    });

    describe('gamepad: settings (#264)', () => {
      test('defaults sit inside their own ranges', () => {
        for (const [key, range] of Object.entries(RANGES)) {
          expect(DEFAULTS[key], key).toBeGreaterThanOrEqual(range.min);
          expect(DEFAULTS[key], key).toBeLessThanOrEqual(range.max);
        }
      });

      test('clamps out-of-range values instead of rejecting them', () => {
        // A value that was once valid must not lock the player out of their
        // controls, so it is pulled back into range rather than thrown away.
        const got = normalize({ aimSpeedX: 99, deadZone: -5 });
        expect(got.aimSpeedX).toBe(RANGES.aimSpeedX.max);
        expect(got.deadZone).toBe(RANGES.deadZone.min);
      });

      test('ignores junk and keeps the defaults', () => {
        expect(normalize(null)).toEqual(DEFAULTS);
        expect(normalize('nonsense')).toEqual(DEFAULTS);
        expect(normalize({ aimSpeedX: 'fast', invertY: 'yes' })).toEqual(DEFAULTS);
      });

      test('keeps the values it is given', () => {
        const got = normalize({ aimSpeedX: 1.5, invertY: true, acceleration: false });
        expect(got.aimSpeedX).toBe(1.5);
        expect(got.invertY).toBe(true);
        expect(got.acceleration).toBe(false);
      });

      test('horizontal and vertical aim are independent', () => {
        // Split on purpose: the screen is wider than it is tall, so one speed for
        // both axes feels twitchy vertically.
        const got = normalize({ aimSpeedX: 2, aimSpeedY: 0.5 });
        expect(got.aimSpeedX).toBe(2);
        expect(got.aimSpeedY).toBe(0.5);
      });
    });

    describe('gamepad: one press is one action (#264)', () => {
      /**
       * The regression that made the whole controller feel broken: a panel is open,
       * the player taps A once, and the game ran several steps — the pause menu
       * opened the save dialog and both closed again, "exit to main menu" landed on
       * character selection.
       *
       * The cause was `_release()` clearing the button history. It runs on every
       * frame a panel is open, so the next frame read a button that was merely
       * still held as a brand-new press. A tap lasts 5 to 9 frames at 60 fps.
       */
      test('a button held across frames activates once, not once per frame', async () => {
        const { gamepadInput } = await import('../../public/scripts/thePlayer/input/gamepadInput.js');

        const held = pad();
        held.buttons[0] = { pressed: true, value: 1 };      // A, held down
        const previous = navigator.getGamepads;
        navigator.getGamepads = () => [held];
        // openPanel ranks candidates by z-index; the stub DOM has no CSS at all.
        globalThis.getComputedStyle ??= () => ({ zIndex: '0' });

        let activations = 0;
        gamepadInput.init({
          activateFocused: () => { activations++; return true; },
          moveFocus: () => true,
          ensureFocus: () => false,
          closeTopPanel: () => true,
          cursor: null,
        });

        try {
          for (let frame = 0; frame < 9; frame++) gamepadInput.update(1000 + frame * 16);
          expect(activations).toBe(1);

          // Released and pressed again: that is a second press and must act.
          held.buttons[0] = { pressed: false, value: 0 };
          gamepadInput.update(2000);
          held.buttons[0] = { pressed: true, value: 1 };
          gamepadInput.update(2016);
          expect(activations).toBe(2);
        } finally {
          navigator.getGamepads = previous;
        }
      });
    });
}

// ─── The reticle, and who gets the A press ─────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: when A belongs to the reticle, and when it does not.
     *
     * The reticle stays drawn after the right stick stops, so "on screen" is not the
     * same as "aiming at something". The two were treated as equal, and the result
     * was a bug nobody would guess from the symptom: nudge the right stick once, and
     * the door never opens again. A was being spent on empty ground, every time,
     * because the reticle claimed it and the proximity interact behind it never ran.
     */

    // Spread the real modules: `mock.module` replaces them for the whole run, and a
    // mock holding only what this file reads left collisionSystem's own tests
    // importing a module with its class and its CONFIG_SIZES missing.

    const { gamepadCursor } = await import('../../public/scripts/thePlayer/input/gamepadCursor.js');

    // The stub DOM has no MouseEvent, and clicking at the reticle builds three.
    globalThis.window ??= globalThis;
    globalThis.MouseEvent ??= class {
      constructor(type, init = {}) { Object.assign(this, init); this.type = type; }
    };

    /** What the reticle is sitting on top of. */
    function pointAt(element) {
      document.elementFromPoint = () => element;
    }

    const canvas = { tagName: 'CANVAS', clicks: 0, dispatchEvent() { this.clicks++; return true; } };

    beforeEach(() => {
      pointer = { x: 10, y: 20 };
      objectAtPointer = null;
      gamepadCursor.visible = false;
      canvas.clicks = 0;
    });

    describe('reticle: who gets the A press (#264)', () => {
      test('hidden, it takes nothing — proximity has the press', () => {
        pointAt(canvas);
        expect(gamepadCursor.confirmAction()).toBe(false);
      });

      test('on screen but over empty ground, it still takes nothing', () => {
        // The regression: this used to answer true, so standing at the door with
        // the reticle resting on grass, A did nothing at all.
        gamepadCursor.visible = true;
        pointAt(canvas);
        objectAtPointer = null;

        expect(gamepadCursor.confirmAction()).toBe(false);
        expect(canvas.clicks).toBe(0);
      });

      test('aimed at something, it takes the press and clicks there', () => {
        gamepadCursor.visible = true;
        pointAt(canvas);
        objectAtPointer = { object: {}, originalType: 'tree' };

        expect(gamepadCursor.confirmAction()).toBe(true);
        expect(canvas.clicks).toBeGreaterThan(0);
      });

      test('out of reach counts as nothing', () => {
        // getObjectAtMouse is asked with requirePlayerInRange, so a tree across the
        // map answers null: there is nothing to do with it from here, and what the
        // player is standing next to is the more useful answer.
        gamepadCursor.visible = true;
        pointAt(canvas);
        objectAtPointer = null;

        expect(gamepadCursor.confirmAction()).toBe(false);
      });

      test('over an HTML control it clicks that, without consulting the world', () => {
        const button = { tagName: 'BUTTON', clicks: 0, click() { this.clicks++; } };
        gamepadCursor.visible = true;
        pointAt(button);
        objectAtPointer = null;              // irrelevant here

        expect(gamepadCursor.confirmAction()).toBe(true);
        expect(button.clicks).toBe(1);
      });

      test('with the pointer never moved, it takes nothing', () => {
        gamepadCursor.visible = true;
        pointAt(canvas);
        pointer = null;

        expect(gamepadCursor.confirmAction()).toBe(false);
      });
    });
}

// ─── One table for what a key does ─────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264, refactor step 3: one table for what a key does.
     *
     * The game had two descriptions of the keyboard — `keybindDefaults.js`, which
     * the remap screen writes to, and a copy inside `bindings.js`. They agreed on
     * the day the copy was made, which is the only day a copy ever agrees.
     *
     * Now the shipped defaults are spread in from the one table, and the keys the
     * player actually has are pushed across whenever they load or change. Anything
     * asking "what opens the inventory?" gets the real answer, whoever is driving.
     */

    const { DEFAULT_KEYBINDS } = await import('../../public/scripts/keybindDefaults.js');
    const { ACTION, KEYBOARD_BINDINGS, bindingsFor } =
      await import('../../public/scripts/thePlayer/input/bindings.js');
    const { setKeybinds, getKeybinds } =
      await import('../../public/scripts/thePlayer/input/keyboard.js');

    describe('keyboard bindings: one table (#264)', () => {
      test('the remappable half is the remap screen own table, not a copy', () => {
        for (const [action, codes] of Object.entries(DEFAULT_KEYBINDS)) {
          expect(KEYBOARD_BINDINGS[action]).toEqual(codes);
        }
      });

      test('the action ids match its keys, which is what lets them be spread in', () => {
        // If an id were renamed on one side only, the spread would quietly add a
        // second entry instead of filling the first.
        for (const action of Object.keys(DEFAULT_KEYBINDS)) {
          expect(Object.values(ACTION)).toContain(action);
        }
      });

      test('menu and build keys are listed here, where the remap screen does not reach', () => {
        expect(bindingsFor('keyboard', ACTION.CONFIRM)).toEqual(['Enter']);
        expect(bindingsFor('keyboard', ACTION.BACK)).toEqual(['Escape']);
        expect(DEFAULT_KEYBINDS.confirm).toBeUndefined();
      });

      test('a remapped key reaches the shared table', () => {
        const before = getKeybinds();
        try {
          setKeybinds({ ...before, inventory: ['KeyM'] }, { persist: false });
          expect(bindingsFor('keyboard', ACTION.INVENTORY)).toEqual(['KeyM']);
        } finally {
          setKeybinds(before, { persist: false });
        }
        expect(bindingsFor('keyboard', ACTION.INVENTORY)).toEqual(DEFAULT_KEYBINDS.inventory);
      });
    });
}

// ─── Knowing a panel is open ───────────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    const { OVERLAY_SELECTORS } = await import('../../public/scripts/thePlayer/input/panels.js');

    /**
     * #264: a panel the input layer does not know about is worse than one that
     * cannot be navigated.
     *
     * The layer asks "is a panel open?" to decide whether to walk the player or the
     * highlight. A panel missing from the list reads as open world: the character
     * keeps walking behind the menu, and A acts on whatever is under the reticle
     * instead of on the option the player is looking at. That is how the house door
     * behaved before this — the menu was on screen and the game was still running.
     */

    /** Does a class attribute match any of the class-only selectors in the list? */
    function registered(className) {
        const classes = new Set(className.split(/\s+/).filter(Boolean));
        return OVERLAY_SELECTORS.some((selector) => {
            if (!selector.startsWith('.')) return false;         // id selectors: not decidable here
            return selector.slice(1).split('.').every((c) => classes.has(c));
        });
    }

    function sourceFiles(dir, out = []) {
        for (const entry of readdirSync(dir)) {
            const path = join(dir, entry);
            if (statSync(path).isDirectory()) sourceFiles(path, out);
            else if (entry.endsWith('.js')) out.push(path);
        }
        return out;
    }

    /** Class strings built with the game's `modal … active` convention. */
    function modalClassNames() {
        const found = [];
        for (const file of sourceFiles('public/scripts')) {
            for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
                const m = line.match(/\.className\s*=\s*['"`]([^'"`$]*)['"`]/);
                if (!m) continue;
                const classes = m[1].split(/\s+/);
                if (classes.includes('modal') && classes.includes('active')) {
                    found.push({ file: file.replace(/\\/g, '/').replace('public/scripts/', ''), className: m[1] });
                }
            }
        }
        return found;
    }

    describe('every full-screen panel is known to the input layer (#264)', () => {
        test('the modal convention is covered by one entry, not by one per panel', () => {
            const modals = modalClassNames();
            // If this finds nothing the scan has drifted, not the game.
            expect(modals.length).toBeGreaterThan(0);

            const unregistered = modals
                .filter(({ className }) => !registered(className))
                .map(({ file, className }) => `${file}: "${className}"`);

            expect(unregistered).toEqual([]);
        });

        test('the house door and the warehouse are among them', () => {
            // Named because they are what the door opens, and because they were the
            // ones running the world behind their own menu.
            expect(registered('modal hse-house-modal active')).toBe(true);
            expect(registered('modal storage-modal active')).toBe(true);
        });

        test('settings and the quest log stay covered without an entry of their own', () => {
            // Both used to be listed by id. They follow the convention, so the
            // generic entry carries them — this is what makes removing theirs safe.
            expect(registered('modal active')).toBe(true);
            expect(OVERLAY_SELECTORS).not.toContain('#questsModal.active');
        });

        test('crafting and the chest are listed by their panel, not their backdrop', () => {
            // Both build the backdrop and the panel as siblings rather than nesting
            // them, so naming the backdrop hands the navigator an element with no
            // controls in it. The chest was listed as '.cht-overlay.open' — a class
            // nothing ever sets, since it is built on open and removed on close, so
            // the entry matched nothing and the world ran on behind it.
            expect(OVERLAY_SELECTORS).toContain('.crf-panel');
            expect(OVERLAY_SELECTORS).toContain('#cht-panel');
            expect(OVERLAY_SELECTORS).not.toContain('.crf-overlay');
            expect(OVERLAY_SELECTORS).not.toContain('.cht-overlay.open');
        });

        test('the screens that are not menus are listed too', () => {
            // A panel the layer does not know about is open world: the character
            // keeps walking behind it. These four were, and sleeping is the one that
            // shows it worst — the keyboard is blocked while it is up, the stick was
            // not, so the player slept and strolled off at the same time.
            for (const selector of [
                '#travel-map-overlay.tmap-visible',
                '#well-overlay.active',
                '#ldg-sleep-screen',
                '.tmap-refuel-modal.tmap-refuel-active',
            ]) {
                expect(OVERLAY_SELECTORS).toContain(selector);
            }
        });
    });

    describe('screens that answer to nothing (#264)', () => {
        test('sleeping and the loading screens are listed as blocking', async () => {
            const { BLOCKING_SELECTORS } = await import('../../public/scripts/thePlayer/input/panels.js');
            // Being a panel stops the world; being blocking swallows the buttons on
            // top of that. Sleeping showed why both are needed: the keyboard was
            // blocked while it was up and the stick was not.
            expect(BLOCKING_SELECTORS).toContain('#ldg-sleep-screen');
            expect(BLOCKING_SELECTORS).toContain('#map-transition-screen');
            expect(BLOCKING_SELECTORS).toContain('#ldg-initial-screen');
        });

        test('every blocking screen is a panel first', () => {
            // One that blocked without being a panel would swallow the buttons and
            // let the player keep walking, which is the worse half of the problem.
            const { BLOCKING_SELECTORS } = require('../../public/scripts/thePlayer/input/panels.js');
            for (const selector of BLOCKING_SELECTORS) {
                expect(OVERLAY_SELECTORS).toContain(selector);
            }
        });
    });
}

// ─── The market ────────────────────────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: the market's own grammar.
     *
     * Every one of these works by clicking the control the mouse would click, so
     * what is worth pinning is which control each button reaches — a market that
     * filtered the player's bags when the highlight was on the trader's stock would
     * look like it was ignoring the button, not like it was filtering the wrong side.
     */

    /**
     * `mock.module` replaces the module for the whole run, not just this file, and
     * files run in alphabetical order — so a mock holding only the two functions
     * this file cares about left `pauseMenu.test.js` importing a panels.js with
     * most of its exports missing. Spreading the real module keeps the surface
     * whole and overrides only the two.
     */

    const {
      isMarket, driveMarket, moveMarketFocus, marketEntry, resetMarket, currentPane,
      isTradeConfirm, driveTradeConfirm, tradeConfirmEntry, moveTradeConfirmFocus,
      cancelTrade, confirmMarketItem,
    } = await import('../../public/scripts/thePlayer/input/marketNavigation.js');

    /** The frame's new presses, as the input layer hands them over. */
    const press = (...indices) => ({ has: (i) => indices.includes(i) });

    const LT = 6, RT = 7, LB = 4, RB = 5;
    const UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;

    /** A stand-in for one clickable control. */
    function control(className, { active = false } = {}) {
      const classes = new Set(className.split(' '));
      if (active) classes.add('active');
      return {
        clicks: 0,
        className,
        classList: { contains: (c) => classes.has(c) },
        click() { this.clicks++; },
        getBoundingClientRect: () => ({ top: 0, left: 0 }),
      };
    }

    /**
     * The market as the selectors see it: two grids, two category strips, the
     * storage tabs and the two arrows.
     */
    function market({ playerItems = 3, merchantItems = 2 } = {}) {
      const parts = {
        playerItems: Array.from({ length: playerItems }, () => control('mch-hexagon-slot')),
        merchantItems: Array.from({ length: merchantItems }, () => control('mch-merchant-hexagon')),
        playerCats: [control('mch-player-category-btn', { active: true }), control('mch-player-category-btn')],
        merchantCats: [control('mch-merchant-category-btn', { active: true }), control('mch-merchant-category-btn')],
        tabs: [control('mch-storage-toggle-btn', { active: true }), control('mch-storage-toggle-btn')],
        sell: control('mch-trade-arrow mch-sell-arrow'),
        buy: control('mch-trade-arrow mch-buy-arrow'),
      };

      const panel = {
        id: 'commerceModal',
        querySelector(sel) {
          if (sel === '#playerItemsGrid') return { querySelectorAll: () => parts.playerItems };
          if (sel === '#merchantItemsGrid') return { querySelectorAll: () => parts.merchantItems };
          if (sel.includes('mch-sell-arrow')) return parts.sell;
          if (sel.includes('mch-buy-arrow')) return parts.buy;
          return null;
        },
        querySelectorAll(sel) {
          if (sel === '.mch-player-category-btn') return parts.playerCats;
          if (sel === '.mch-merchant-category-btn') return parts.merchantCats;
          if (sel === '.mch-storage-toggle-btn') return parts.tabs;
          return [];
        },
      };
      return { panel, parts };
    }

    beforeEach(() => {
      marked.length = 0;
      resetMarket();
    });

    describe('market: which pane the buttons reach (#264)', () => {
      test('recognises the market and nothing else', () => {
        expect(isMarket({ id: 'commerceModal' })).toBe(true);
        expect(isMarket({ id: 'inventoryModal' })).toBe(false);
        expect(isMarket(null)).toBe(false);
      });

      test('it opens on the player bags, and LT/RT move between panes', () => {
        const { panel } = market();
        expect(currentPane()).toBe('player');

        driveMarket(panel, press(RT));
        expect(currentPane()).toBe('merchant');

        driveMarket(panel, press(LT));
        expect(currentPane()).toBe('player');
      });

      test('LB and RB filter the pane in play, not always the player', () => {
        const { panel, parts } = market();

        driveMarket(panel, press(RB));
        expect(parts.playerCats[1].clicks).toBe(1);
        expect(parts.merchantCats[1].clicks).toBe(0);

        driveMarket(panel, press(RT));
        driveMarket(panel, press(RB));
        expect(parts.merchantCats[1].clicks).toBe(1);
        expect(parts.playerCats[1].clicks).toBe(1);   // untouched by the trader's side
      });

      test('the category strip wraps, so the last one is one press from the first', () => {
        const { panel, parts } = market();
        driveMarket(panel, press(LB));                // backwards from the first
        expect(parts.playerCats[1].clicks).toBe(1);
      });

      test('D-pad up and down are sell and buy, applied on the press', () => {
        const { panel, parts } = market();

        driveMarket(panel, press(UP));
        expect(parts.sell.clicks).toBe(1);
        expect(parts.buy.clicks).toBe(0);

        driveMarket(panel, press(DOWN));
        expect(parts.buy.clicks).toBe(1);
      });

      test('sideways switches inventory and warehouse — on the player side only', () => {
        const { panel, parts } = market();

        driveMarket(panel, press(RIGHT));
        expect(parts.tabs[1].clicks).toBe(1);

        // The trader has no such split: sideways must do nothing rather than
        // reach across and move the player's tabs behind their back.
        driveMarket(panel, press(RT));
        driveMarket(panel, press(RIGHT));
        driveMarket(panel, press(LEFT));
        expect(parts.tabs[1].clicks).toBe(1);
      });

      test('it claims the D-pad every frame, so the highlight never also moves', () => {
        const { panel } = market();
        expect(driveMarket(panel, press())).toBe(true);
      });
    });

    describe('market: walking the items with the stick (#264)', () => {
      test('the highlight starts on the first item of the pane in play', () => {
        const { panel, parts } = market();
        expect(marketEntry(panel)).toBe(parts.playerItems[0]);

        driveMarket(panel, press(RT));
        expect(marketEntry(panel)).toBe(parts.merchantItems[0]);
      });

      test('right and left step one item', () => {
        const { panel, parts } = market();

        expect(moveMarketFocus(panel, 'ArrowRight', parts.playerItems[0])).toBe(true);
        expect(marked.at(-1)).toBe(parts.playerItems[1]);

        expect(moveMarketFocus(panel, 'ArrowLeft', parts.playerItems[1])).toBe(true);
        expect(marked.at(-1)).toBe(parts.playerItems[0]);
      });

      test('it stops at the edges instead of wrapping around', () => {
        const { panel, parts } = market();
        // Wrapping in a grid reads as the highlight jumping backwards.
        expect(moveMarketFocus(panel, 'ArrowLeft', parts.playerItems[0])).toBe(false);
        expect(moveMarketFocus(panel, 'ArrowRight', parts.playerItems[2])).toBe(false);
      });

      test('with nothing focused it takes the first item', () => {
        const { panel, parts } = market();
        expect(moveMarketFocus(panel, 'ArrowDown', null)).toBe(true);
        expect(marked.at(-1)).toBe(parts.playerItems[0]);
      });

      test('an empty grid is not a crash', () => {
        const { panel } = market({ playerItems: 0 });
        expect(moveMarketFocus(panel, 'ArrowRight', null)).toBe(false);
        expect(marketEntry(panel)).toBe(null);
      });
    });

    /** The amount panel, as its selectors see it. */
    function amountPanel({ quantity = 1 } = {}) {
      const parts = {
        minus: control('mch-quantity-btn mch-quantity-decrease'),
        plus: control('mch-quantity-btn mch-quantity-increase'),
        yes: control('mch-confirm-btn mch-confirm-yes'),
        no: control('mch-confirm-btn mch-confirm-no'),
        quantity,
      };
      const panel = {
        id: 'tradeConfirmModal',
        querySelector(sel) {
          if (sel === '#quantityIncreaseBtn') return parts.plus;
          if (sel === '#quantityDecreaseBtn') return parts.minus;
          if (sel === '.mch-confirm-yes') return parts.yes;
          if (sel === '.mch-confirm-no') return parts.no;
          return null;
        },
        querySelectorAll: (sel) => (sel === '.mch-confirm-btn' ? [parts.yes, parts.no] : []),
      };
      return { panel, parts };
    }

    describe('market: how many, before the deal (#264)', () => {
      test('it is told apart from the market behind it', () => {
        expect(isTradeConfirm({ id: 'tradeConfirmModal' })).toBe(true);
        expect(isTradeConfirm({ id: 'commerceModal' })).toBe(false);
      });

      test('sideways on the D-pad is one fewer and one more', () => {
        const { panel, parts } = amountPanel();

        driveTradeConfirm(panel, press(RIGHT));
        expect(parts.plus.clicks).toBe(1);
        expect(parts.minus.clicks).toBe(0);

        driveTradeConfirm(panel, press(LEFT));
        expect(parts.minus.clicks).toBe(1);
      });

      test('the highlight rests on confirm, because saying yes is the common case', () => {
        const { panel, parts } = amountPanel();
        expect(tradeConfirmEntry(panel)).toBe(parts.yes);
      });

      test('B cancels through the button, not through Escape', () => {
        const { panel, parts } = amountPanel();
        expect(cancelTrade(panel)).toBe(true);
        expect(parts.no.clicks).toBe(1);
      });

      test('the highlight walks the two decisions and nothing else', () => {
        const { panel, parts } = amountPanel();
        // Never the − and +: with the D-pad already changing the amount, letting
        // the highlight reach them would make A sometimes change a number instead
        // of agreeing to the deal.
        moveTradeConfirmFocus(panel, 'ArrowRight', parts.yes);
        expect(marked.at(-1)).toBe(parts.no);

        moveTradeConfirmFocus(panel, 'ArrowRight', parts.no);
        expect(marked.at(-1)).toBe(parts.yes);
      });
    });

    describe('market: A on an item asks how many (#264)', () => {
      test('it selects the item and opens the amount panel', () => {
        const { panel, parts } = market();
        const tradeButton = control('mch-trade-button');
        const query = panel.querySelector.bind(panel);
        panel.querySelector = (sel) =>
          (sel === '#tradeButton:not([disabled])' ? tradeButton : query(sel));

        expect(confirmMarketItem(panel, parts.playerItems[1])).toBe(true);
        expect(parts.playerItems[1].clicks).toBe(1);   // selected
        expect(tradeButton.clicks).toBe(1);            // and the amount asked for
      });

      test('it passes on anything that is not an item', () => {
        const { panel, parts } = market();
        expect(confirmMarketItem(panel, parts.playerCats[0])).toBe(false);
      });

      test('a deal that cannot happen leaves the item merely selected', () => {
        const { panel, parts } = market();
        // The trade button renders disabled when there is nothing to trade or the
        // trader cannot cover it, and then the selector finds nothing.
        expect(confirmMarketItem(panel, parts.playerItems[0])).toBe(true);
        expect(parts.playerItems[0].clicks).toBe(1);
      });
    });
}

// ─── The warehouse ─────────────────────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: the warehouse.
     *
     * Two steps, like taking something at the market: pick the item, then say how
     * many. What is worth pinning is the second step, because while it is open the
     * D-pad means something else entirely — and because the controls that would
     * rebuild the grid have to stay out of the way until it closes, or the amount
     * would belong to an item that is no longer there.
     */

    const {
      isStorage, driveStorage, storageEntry, moveStorageFocus,
      confirmStorage, backStorage, resetStorage, armedSlot,
    } = await import('../../public/scripts/thePlayer/input/storageNavigation.js');

    const press = (...indices) => ({ has: (i) => indices.includes(i) });
    const LT = 6, RT = 7, LB = 4, RB = 5, LEFT = 14, RIGHT = 15, DOWN = 13;

    function button(className, { active = false } = {}) {
      const classes = new Set(className.split(' '));
      if (active) classes.add('active');
      return {
        clicks: 0,
        dataset: {},
        classList: { contains: (c) => classes.has(c) },
        click() { this.clicks++; },
      };
    }

    /** One item card: the amount control and the take/put button. */
    function slot() {
      const parts = {
        minus: button('qty-step'),
        plus: button('qty-step'),
        field: button('qty-input'),
        action: button('withdraw-btn'),
      };
      return {
        parts,
        classList: { contains: (c) => c === 'storage-slot' },
        querySelector(sel) {
          if (sel.includes('data-step="1"')) return parts.plus;
          if (sel.includes('data-step="-1"')) return parts.minus;
          if (sel === '.qty-input') return parts.field;
          if (sel === '.withdraw-btn, .deposit-btn') return parts.action;
          return null;
        },
      };
    }

    function warehouse({ slots = [slot(), slot(), slot()] } = {}) {
      const tabs = {
        withdraw: button('storage-tab', { active: true }),
        deposit: button('storage-tab'),
      };
      const cats = [button('storage-category-btn', { active: true }), button('storage-category-btn')];
      const panel = {
        classList: { contains: (c) => c === 'storage-modal' },
        querySelector: (sel) =>
          (sel.includes('"withdraw"') ? tabs.withdraw : sel.includes('"deposit"') ? tabs.deposit : null),
        querySelectorAll: (sel) =>
          (sel === '.storage-slot' ? slots : sel === '.storage-category-btn' ? cats : []),
      };
      return { panel, slots, tabs, cats };
    }

    beforeEach(() => { marked.length = 0; resetStorage(); });

    describe('warehouse: picking the item (#264)', () => {
      test('it is told apart from the house menu it opens from', () => {
        expect(isStorage({ classList: { contains: (c) => c === 'storage-modal' } })).toBe(true);
        expect(isStorage({ classList: { contains: () => false } })).toBe(false);
        expect(isStorage(null)).toBe(false);
      });

      test('LT takes out and RT puts in', () => {
        const { panel, tabs } = warehouse();

        driveStorage(panel, press(RT));
        expect(tabs.deposit.clicks).toBe(1);

        // Already the active tab: clicking it again would redraw for nothing.
        driveStorage(panel, press(LT));
        expect(tabs.withdraw.clicks).toBe(0);
      });

      test('LB and RB step the categories', () => {
        const { panel, cats } = warehouse();
        driveStorage(panel, press(RB));
        expect(cats[1].clicks).toBe(1);
      });

      test('the highlight starts on the first item and walks the grid', () => {
        const { panel, slots } = warehouse();
        expect(storageEntry(panel)).toBe(slots[0]);

        expect(moveStorageFocus(panel, 'ArrowRight', slots[0])).toBe(true);
        expect(marked.at(-1)).toBe(slots[1]);
      });

      test('walking the items leaves the D-pad alone', () => {
        const { panel } = warehouse();
        expect(driveStorage(panel, press(DOWN))).toBe(false);
      });
    });

    describe('warehouse: saying how many (#264)', () => {
      test('A on an item opens the amount and highlights the number', () => {
        const { panel, slots } = warehouse();

        expect(confirmStorage(panel, slots[1])).toBe(true);
        expect(armedSlot()).toBe(slots[1]);
        expect(marked.at(-1)).toBe(slots[1].parts.field);
      });

      test('sideways is one fewer and one more, on that item', () => {
        const { panel, slots } = warehouse();
        confirmStorage(panel, slots[0]);

        driveStorage(panel, press(RIGHT));
        expect(slots[0].parts.plus.clicks).toBe(1);

        driveStorage(panel, press(LEFT));
        expect(slots[0].parts.minus.clicks).toBe(1);
      });

      test('while it is open the D-pad belongs to the amount', () => {
        const { panel, slots } = warehouse();
        confirmStorage(panel, slots[0]);

        expect(driveStorage(panel, press(RIGHT))).toBe(true);
        expect(moveStorageFocus(panel, 'ArrowRight', slots[0])).toBe(false);
      });

      test('the tabs and categories are ignored until it closes', () => {
        // Either would rebuild the grid and leave the open amount pointing at an
        // item that is no longer on screen.
        const { panel, slots, tabs, cats } = warehouse();
        confirmStorage(panel, slots[0]);

        driveStorage(panel, press(RT));
        driveStorage(panel, press(RB));
        expect(tabs.deposit.clicks).toBe(0);
        expect(cats[1].clicks).toBe(0);
      });

      test('A again takes it out, and the amount closes', () => {
        const { panel, slots } = warehouse();
        confirmStorage(panel, slots[2]);

        expect(confirmStorage(panel, slots[2])).toBe(true);
        expect(slots[2].parts.action.clicks).toBe(1);
        expect(armedSlot()).toBe(null);
      });

      test('B closes the amount and comes back to the item, not out of the warehouse', () => {
        const { panel, slots } = warehouse();
        confirmStorage(panel, slots[1]);

        expect(backStorage(panel)).toBe(true);
        expect(armedSlot()).toBe(null);
        expect(marked.at(-1)).toBe(slots[1]);

        // With no amount open, B is not ours: the modal closes the usual way.
        expect(backStorage(panel)).toBe(false);
      });
    });
}

// ─── The chest ─────────────────────────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: the chest.
     *
     * The same two steps as the warehouse — pick the item, then say how many —
     * because it is the same job. What is worth pinning is what differs: only the
     * chest sorts its contents into categories, so on your own bag the shoulder
     * buttons must do nothing rather than reach across and filter the other side.
     */

    const {
      isChest, driveChest, chestEntry, moveChestFocus,
      confirmChest, backChest, resetChest, currentSide, armedItem,
    } = await import('../../public/scripts/thePlayer/input/chestNavigation.js');

    const press = (...indices) => ({ has: (i) => indices.includes(i) });
    const LT = 6, RT = 7, LB = 4, RB = 5, LEFT = 14, RIGHT = 15;

    function button(className, { active = false } = {}) {
      const classes = new Set(className.split(' '));
      if (active) classes.add('active');
      return { clicks: 0, classList: { contains: (c) => classes.has(c) }, click() { this.clicks++; } };
    }

    /** An item card, with the amount control the mouse would use. */
    function item(row = 0) {
      const parts = {
        minus: button('cht-qty-step'),
        plus: button('cht-qty-step'),
        field: button('cht-qty-input'),
        action: button('cht-qty-action'),
      };
      return {
        parts,
        getBoundingClientRect: () => ({ top: row * 40, left: 0, width: 120, height: 36 }),
        querySelector(sel) {
          if (sel.includes('data-step="1"')) return parts.plus;
          if (sel.includes('data-step="-1"')) return parts.minus;
          if (sel === '.cht-qty-input') return parts.field;
          if (sel === '.cht-qty-action') return parts.action;
          return null;
        },
      };
    }

    function chest() {
      const slots = [item(0), item(1), item(2)];
      const bag = [item(0), item(1)];
      const cats = [button('cht-category-btn', { active: true }), button('cht-category-btn')];
      const panel = {
        id: 'cht-panel',
        querySelectorAll: (sel) =>
          (sel === '.cht-slot' ? slots
            : sel === '.cht-inventory-item' ? bag
            : sel === '.cht-category-btn' ? cats : []),
      };
      return { panel, slots, bag, cats };
    }

    beforeEach(() => { marked.length = 0; resetChest(); });

    describe('chest: the two sides (#264)', () => {
      test('it is told apart by its panel, which is what holds the controls', () => {
        expect(isChest({ id: 'cht-panel' })).toBe(true);
        expect(isChest({ id: 'cht-overlay' })).toBe(false);
        expect(isChest(null)).toBe(false);
      });

      test('it opens on the chest, and LT/RT move between the sides', () => {
        const { panel } = chest();
        expect(currentSide()).toBe('chest');

        driveChest(panel, press(RT));
        expect(currentSide()).toBe('bag');

        driveChest(panel, press(LT));
        expect(currentSide()).toBe('chest');
      });

      test('the highlight starts on the first item of the side in play', () => {
        const { panel, slots, bag } = chest();
        expect(chestEntry(panel)).toBe(slots[0]);

        driveChest(panel, press(RT));
        expect(chestEntry(panel)).toBe(bag[0]);
      });

      test('categories belong to the chest; on your bag the shoulders do nothing', () => {
        const { panel, cats } = chest();

        driveChest(panel, press(RB));
        expect(cats[1].clicks).toBe(1);

        // Your own bag has no categories here. Reaching across to the chest's would
        // filter a list the player is not even looking at.
        driveChest(panel, press(RT));
        driveChest(panel, press(RB));
        driveChest(panel, press(LB));
        expect(cats[1].clicks).toBe(1);
      });
    });

    describe('chest: saying how many (#264)', () => {
      test('A opens the amount and highlights the number', () => {
        const { panel, slots } = chest();
        expect(confirmChest(panel, slots[1])).toBe(true);
        expect(armedItem()).toBe(slots[1]);
        expect(marked.at(-1)).toBe(slots[1].parts.field);
      });

      test('sideways is one fewer and one more, on that item', () => {
        const { panel, slots } = chest();
        confirmChest(panel, slots[0]);

        driveChest(panel, press(RIGHT));
        expect(slots[0].parts.plus.clicks).toBe(1);
        driveChest(panel, press(LEFT));
        expect(slots[0].parts.minus.clicks).toBe(1);
      });

      test('the sides and categories are ignored until it closes', () => {
        const { panel, slots, cats } = chest();
        confirmChest(panel, slots[0]);

        driveChest(panel, press(RT));
        driveChest(panel, press(RB));
        expect(currentSide()).toBe('chest');
        expect(cats[1].clicks).toBe(0);
      });

      test('while it is open the D-pad belongs to the amount', () => {
        const { panel, slots } = chest();
        confirmChest(panel, slots[0]);

        expect(driveChest(panel, press(RIGHT))).toBe(true);
        expect(moveChestFocus(panel, 'ArrowDown', slots[0])).toBe(false);
      });

      test('A again moves the items, and the amount closes', () => {
        const { panel, slots } = chest();
        confirmChest(panel, slots[2]);

        expect(confirmChest(panel, slots[2])).toBe(true);
        expect(slots[2].parts.action.clicks).toBe(1);
        expect(armedItem()).toBe(null);
      });

      test('B closes the amount and comes back to the item, not out of the chest', () => {
        const { panel, slots } = chest();
        confirmChest(panel, slots[1]);

        expect(backChest()).toBe(true);
        expect(marked.at(-1)).toBe(slots[1]);
        expect(backChest()).toBe(false);   // nothing open: B belongs to the chest
      });
    });
}

// ─── Crafting ──────────────────────────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: the workbench.
     *
     * Simpler than the market — one list and a strip of recipe types — so what is
     * worth pinning is the one decision that is not obvious: the highlight follows
     * the recipe rows and not their "Craft" buttons, because a recipe the player
     * cannot afford renders that button disabled, and a disabled button cannot take
     * focus. Following the buttons would quietly hide every recipe you most want to
     * look at, and leave the panel with nowhere to put the highlight when nothing
     * is affordable.
     */

    const {
      isCrafting, driveCrafting, craftingEntry, moveCraftingFocus, confirmCrafting,
    } = await import('../../public/scripts/thePlayer/input/craftingNavigation.js');

    const press = (...indices) => ({ has: (i) => indices.includes(i) });
    const LB = 4, RB = 5, UP = 12, DOWN = 13;

    function button(className, { active = false, disabled = false } = {}) {
      const classes = new Set(className.split(' '));
      if (active) classes.add('crf-active');
      return {
        clicks: 0, disabled,
        classList: { contains: (c) => classes.has(c) },
        click() { this.clicks++; },
      };
    }

    /** A recipe row, with the craft button the mouse would press. */
    function recipe({ affordable = true } = {}) {
      const craft = button('crf-btn', { disabled: !affordable });
      return {
        craft,
        classList: { contains: (c) => c === 'crf-item' },
        querySelector: (sel) =>
          (sel === '.crf-btn:not([disabled])' && affordable ? craft : null),
      };
    }

    function workbench({ recipes = [recipe(), recipe(), recipe()], categories = 3 } = {}) {
      const cats = Array.from({ length: categories }, (_, i) =>
        button('crf-category-btn', { active: i === 0 }));
      const panel = {
        classList: { contains: (c) => c === 'crf-panel' },
        querySelectorAll: (sel) =>
          (sel === '.crf-item' ? recipes : sel === '.crf-category-btn' ? cats : []),
      };
      return { panel, recipes, cats };
    }

    beforeEach(() => { marked.length = 0; });

    describe('crafting: the recipe types (#264)', () => {
      test('it is told apart from the panels around it', () => {
        expect(isCrafting({ classList: { contains: (c) => c === 'crf-panel' } })).toBe(true);
        expect(isCrafting({ id: 'commerceModal', classList: { contains: () => false } })).toBe(false);
        expect(isCrafting(null)).toBe(false);
      });

      test('RB and LB step the strip, which marks its choice its own way', () => {
        const { panel, cats } = workbench();
        // `crf-active`, not `active` — reading the wrong class would always step
        // from the first button and feel like the strip was stuck.
        driveCrafting(panel, press(RB));
        expect(cats[1].clicks).toBe(1);

        driveCrafting(panel, press(LB));
        expect(cats[cats.length - 1].clicks).toBe(1);
      });

      test('it hands the D-pad back, so up and down keep walking the list', () => {
        const { panel } = workbench();
        expect(driveCrafting(panel, press(RB))).toBe(false);
        expect(driveCrafting(panel, press(UP, DOWN))).toBe(false);
      });
    });

    describe('crafting: walking the recipes (#264)', () => {
      test('the highlight starts on the first recipe, not on the close button', () => {
        const { panel, recipes } = workbench();
        expect(craftingEntry(panel)).toBe(recipes[0]);
      });

      test('down and up step one recipe and stop at the ends', () => {
        const { panel, recipes } = workbench();

        expect(moveCraftingFocus(panel, 'ArrowDown', recipes[0])).toBe(true);
        expect(marked.at(-1)).toBe(recipes[1]);

        expect(moveCraftingFocus(panel, 'ArrowUp', recipes[0])).toBe(false);
        expect(moveCraftingFocus(panel, 'ArrowDown', recipes[2])).toBe(false);
      });

      test('a recipe you cannot afford still takes the highlight', () => {
        // The whole reason the highlight follows rows instead of buttons: this one
        // is exactly the recipe the player wants to read the requirements of.
        const broke = recipe({ affordable: false });
        const { panel } = workbench({ recipes: [broke, recipe()] });
        expect(craftingEntry(panel)).toBe(broke);
      });

      test('an empty list is not a crash', () => {
        const { panel } = workbench({ recipes: [] });
        expect(craftingEntry(panel)).toBe(null);
        expect(moveCraftingFocus(panel, 'ArrowDown', null)).toBe(false);
      });
    });

    describe('crafting: making the thing (#264)', () => {
      test('A presses the row own craft button', () => {
        const { panel, recipes } = workbench();
        expect(confirmCrafting(panel, recipes[1])).toBe(true);
        expect(recipes[1].craft.clicks).toBe(1);
        expect(recipes[0].craft.clicks).toBe(0);
      });

      test('A on a recipe short of materials does nothing, and says so by doing nothing', () => {
        const broke = recipe({ affordable: false });
        const { panel } = workbench({ recipes: [broke] });
        expect(confirmCrafting(panel, broke)).toBe(true);   // handled
        expect(broke.craft.clicks).toBe(0);                 // but not made
      });

      test('it passes on anything that is not a recipe', () => {
        const { panel, cats } = workbench();
        expect(confirmCrafting(panel, cats[0])).toBe(false);
      });
    });
}

// ─── The vet ───────────────────────────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: the vet.
     *
     * Two sides — four things to ask Alice, and whatever that choice puts on the
     * stage: the animals to leave, the ones to fetch back, the medicines. What is
     * worth pinning is the crossing between them, and that B comes back one step at
     * a time rather than dropping the player out of the vet from inside a list.
     */

    const { isVet, vetEntry, moveVetFocus, confirmVet, backVet, resetVet } =
      await import('../../public/scripts/thePlayer/input/vetNavigation.js');

    /**
     * A control with a place on screen: gridStep measures how many items share a
     * row, so geometry is part of what is being tested — both of these are stacked
     * columns, one item per row.
     */
    function control(name, row = 0) {
      return {
        name,
        clicks: 0,
        click() { this.clicks++; },
        getBoundingClientRect: () => ({ top: row * 40, left: 0, width: 160, height: 36 }),
      };
    }

    /**
     * The vet as the selectors see it: a sidebar of actions and a stage holding
     * whatever the chosen action mounted.
     */
    function vet({ stage = [control('s0', 0), control('s1', 1)] } = {}) {
      const menu = ['talk', 'diagnose', 'hospitalize', 'medicine'].map((n, i) => control(n, i));
      const panel = {
        id: 'vet-overlay',
        querySelector: (sel) => (sel === '.vet-stage' ? { items: stage } : null),
        querySelectorAll: (sel) => (sel === '.vet-action-btn' ? menu : []),
      };
      return { panel, menu, stage };
    }

    beforeEach(() => { marked.length = 0; resetVet(); });

    describe('vet: the menu side (#264)', () => {
      test('it is told apart from the panels around it', () => {
        expect(isVet({ id: 'vet-overlay' })).toBe(true);
        expect(isVet({ id: 'commerceModal' })).toBe(false);
        expect(isVet(null)).toBe(false);
      });

      test('the highlight starts on the first thing to ask', () => {
        const { panel, menu } = vet();
        expect(vetEntry(panel)).toBe(menu[0]);
      });

      test('walking the menu changes the stage as it goes', () => {
        // The highlight promises that what you are on is what you are looking at.
        // Nothing behind these four is destructive, so there is nothing to gain by
        // asking the player to confirm before showing it.
        const { panel, menu } = vet();

        expect(moveVetFocus(panel, 'ArrowDown', menu[0])).toBe(true);
        expect(marked.at(-1)).toBe(menu[1]);
        expect(menu[1].clicks).toBe(1);
      });

      test('it stops at the ends of the menu', () => {
        const { panel, menu } = vet();
        expect(moveVetFocus(panel, 'ArrowUp', menu[0])).toBe(false);
        expect(moveVetFocus(panel, 'ArrowDown', menu[3])).toBe(false);
      });
    });

    describe('vet: crossing to the choices (#264)', () => {
      test('right steps across to the stage', () => {
        const { panel, menu, stage } = vet();
        expect(moveVetFocus(panel, 'ArrowRight', menu[0])).toBe(true);
        expect(marked.at(-1)).toBe(stage[0]);
      });

      test('with an empty stage there is nowhere to cross to', () => {
        const { panel, menu } = vet({ stage: [] });
        expect(moveVetFocus(panel, 'ArrowRight', menu[0])).toBe(false);
      });

      test('A on the menu opens it and crosses over', () => {
        const { panel, menu } = vet();
        expect(confirmVet(panel, menu[2])).toBe(true);
        expect(menu[2].clicks).toBe(1);
      });

      test('A on the stage is an ordinary press, left to what is under it', () => {
        const { panel, stage } = vet();
        expect(confirmVet(panel, stage[1])).toBe(false);
        expect(stage[1].clicks).toBe(0);
      });

      test('the highlight walks the stage', () => {
        const { panel, stage } = vet();
        expect(moveVetFocus(panel, 'ArrowDown', stage[0])).toBe(true);
        expect(marked.at(-1)).toBe(stage[1]);
      });
    });

    describe('vet: coming back (#264)', () => {
      test('left returns to the menu entry that opened the stage', () => {
        const { panel, menu, stage } = vet();
        confirmVet(panel, menu[2]);                       // asked for hospitalize

        expect(moveVetFocus(panel, 'ArrowLeft', stage[0])).toBe(true);
        expect(marked.at(-1)).toBe(menu[2]);              // not back to the top
      });

      test('B from the stage returns to the menu, B from the menu does not', () => {
        const { panel, menu, stage } = vet();

        expect(backVet(panel, stage[0])).toBe(true);
        expect(marked.at(-1)).toBe(menu[0]);

        // One step per press: from the menu, B belongs to the overlay, which
        // closes the vet the usual way.
        expect(backVet(panel, menu[0])).toBe(false);
      });
    });
}

// ─── The travel map ────────────────────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: the two small screens the travel map opens.
     *
     * The map itself navigates like any other panel; these two do not. The fuel
     * slider is the interesting one: it already answers to the arrow keys, for the
     * keyboard, so the controller sends it those rather than reaching in to set a
     * number — the slider owns its clamping, its rounding and its display, and a
     * second way in would have to keep all three in step.
     */

    const {
      isTravelPopup, isRefuel, travelPopupEntry, backTravelPopup,
      refuelEntry, driveRefuel, moveRefuelFocus, backRefuel,
    } = await import('../../public/scripts/thePlayer/input/travelNavigation.js');

    globalThis.KeyboardEvent ??= class {
      constructor(type, init = {}) { Object.assign(this, init); this.type = type; }
    };

    const press = (...indices) => ({ has: (i) => indices.includes(i) });
    const LEFT = 14, RIGHT = 15;

    function button(className) {
      const classes = new Set(className.split(' '));
      return { clicks: 0, classList: { contains: (c) => classes.has(c) }, click() { this.clicks++; } };
    }

    function popup({ twoAnswers = true, dismissible = true } = {}) {
      const yes = button('tmap-popup-btn');
      const no = button('tmap-popup-btn tmap-popup-btn-secondary');
      const buttons = twoAnswers ? [yes, no] : [yes];
      return {
        yes, no,
        panel: {
          dataset: { dismissible: dismissible ? 'true' : 'false' },
          classList: { contains: (c) => c === 'tmap-popup-overlay' },
          querySelectorAll: (sel) => (sel === '.tmap-popup-btn' ? buttons : []),
        },
      };
    }

    function refuel() {
      const keys = [];
      const shifts = [];
      const handle = {
        keys,
        dispatchEvent: (e) => { keys.push(e.key); shifts.push(e.shiftKey === true); return true; },
      };
      const cancel = button('tmap-refuel-btn tmap-refuel-cancel');
      const confirm = button('tmap-refuel-btn tmap-refuel-confirm');
      return {
        handle, cancel, confirm, keys, shifts,
        panel: {
          classList: { contains: (c) => c === 'tmap-refuel-modal' },
          querySelector: (sel) =>
            (sel === '.tmap-refuel-handle' ? handle
              : sel === '.tmap-refuel-cancel' ? cancel
              : sel === '.tmap-refuel-confirm' ? confirm : null),
          querySelectorAll: (sel) => (sel === '.tmap-refuel-btn' ? [cancel, confirm] : []),
        },
      };
    }

    beforeEach(() => { marked.length = 0; });

    describe('travel: the question (#264)', () => {
      test('the two screens are told apart', () => {
        expect(isTravelPopup(popup().panel)).toBe(true);
        expect(isRefuel(refuel().panel)).toBe(true);
        expect(isTravelPopup(refuel().panel)).toBe(false);
      });

      test('the highlight rests on the answer that goes ahead', () => {
        const { panel, yes } = popup();
        expect(travelPopupEntry(panel)).toBe(yes);
      });

      test('B refuses through the button that refuses', () => {
        const { panel, no } = popup();
        expect(backTravelPopup(panel)).toBe(true);
        expect(no.clicks).toBe(1);
      });

      test('a notice with one button is dismissed by B too', () => {
        const { panel, yes } = popup({ twoAnswers: false });
        expect(backTravelPopup(panel)).toBe(true);
        expect(yes.clicks).toBe(1);
      });

      test('a notice that may not be dismissed is left alone', () => {
        const { panel, yes } = popup({ twoAnswers: false, dismissible: false });
        expect(backTravelPopup(panel)).toBe(false);
        expect(yes.clicks).toBe(0);
      });
    });

    describe('travel: filling the tank (#264)', () => {
      test('the slider is where the highlight starts — the amount is the decision', () => {
        const { panel, handle } = refuel();
        expect(refuelEntry(panel)).toBe(handle);
      });

      test('right fills and left empties, through the keys it already answers to', () => {
        const { panel, keys } = refuel();

        expect(moveRefuelFocus(panel, 'ArrowRight', null)).toBe(true);
        expect(keys).toEqual(['ArrowRight']);

        moveRefuelFocus(panel, 'ArrowLeft', null);
        expect(keys).toEqual(['ArrowRight', 'ArrowLeft']);
      });

      test('each step is the slider coarse one, or the bar does not visibly move', () => {
        // The slider moves 0.1% a press and 1% with shift. A keyboard gets there by
        // the system repeating the key; a controller sends one event per press, so
        // without this a press moved the bar by a tenth of a percent — which reads
        // as the D-pad doing nothing at all.
        const { panel, shifts } = refuel();
        moveRefuelFocus(panel, 'ArrowRight', null);
        expect(shifts).toEqual([true]);
      });

      test('it claims no buttons, so holding the D-pad repeats like a held key', () => {
        // The repeat lives in the ordinary navigation; claiming the axis here would
        // have meant one step per press and no way to hold it.
        expect(driveRefuel()).toBe(false);
      });

      test('up and down move between the bar and the buttons', () => {
        const { panel, handle, cancel } = refuel();
        expect(moveRefuelFocus(panel, 'ArrowDown', handle)).toBe(true);
        expect(marked.at(-1)).toBe(cancel);
      });

      test('B cancels through the modal own cancel, which handles the refund', () => {
        const { panel, cancel } = refuel();
        expect(backRefuel(panel)).toBe(true);
        expect(cancel.clicks).toBe(1);
      });
    });
}

// ─── Answering a conversation ──────────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: answering a conversation with a face button.
     *
     * Up to four answers, one button each — (A) (B) (X) (Y) — instead of a list to
     * walk. Past four there is no fifth face button, so longer lists keep the
     * highlight and the D-pad: a conversation should not have to be written around
     * how many buttons a controller has.
     *
     * The letters live in the bindings table, not in either file. The dialogue
     * prints what the binding says and this listens for the same binding, so what
     * the player reads and what answers can never drift apart — these tests read
     * the table too, rather than restating it.
     */

    /**
     * A partial stub, knowingly.
     *
     * Spreading the real dialogueSystem would be the usual fix, but importing it
     * registers the system and wires its listeners at load, and doing that from
     * here cost ten tests in files that run later. So this stays narrow, and the
     * cost is that a later file importing dialogueSystem gets a module with only
     * this function on it. Nothing does today; if something needs to, the way out
     * is to give dialogueSystem an explicit init instead of doing it on import.
     */

    const { ACTION, bindingsFor } = await import('../../public/scripts/thePlayer/input/bindings.js');
    const { isDialogue, driveDialogue, hasButtonChoices } =
      await import('../../public/scripts/thePlayer/input/dialogueNavigation.js');

    const press = (...indices) => ({ has: (i) => indices.includes(i) });

    /** A dialogue overlay; `withButtons` says whether its answers carry badges. */
    function dialogue({ withButtons = true } = {}) {
      return {
        classList: { contains: (c) => c === 'dlg-overlay' },
        querySelector: (sel) =>
          (sel === '.dlg-choice-btn[data-choice-action]' && withButtons ? {} : null),
      };
    }

    beforeEach(() => { chosen = []; accepts = true; });

    describe('dialogue: a button per answer (#264)', () => {
      test('it is told apart from the panels around it', () => {
        expect(isDialogue(dialogue())).toBe(true);
        expect(isDialogue({ classList: { contains: () => false } })).toBe(false);
        expect(isDialogue(null)).toBe(false);
      });

      test('the four answers sit on the four face buttons', () => {
        // Read from the table: A, B, X, Y are indices 0 to 3 of the standard map.
        expect(bindingsFor('gamepad', ACTION.CHOICE_1)).toEqual([0]);
        expect(bindingsFor('gamepad', ACTION.CHOICE_2)).toEqual([1]);
        expect(bindingsFor('gamepad', ACTION.CHOICE_3)).toEqual([2]);
        expect(bindingsFor('gamepad', ACTION.CHOICE_4)).toEqual([3]);
      });

      test('each face button answers with its own choice', () => {
        const panel = dialogue();
        for (const [index, action] of [
          [0, ACTION.CHOICE_1], [1, ACTION.CHOICE_2],
          [2, ACTION.CHOICE_3], [3, ACTION.CHOICE_4],
        ]) {
          chosen = [];
          expect(driveDialogue(panel, press(index))).toBe(true);
          expect(chosen).toEqual([action]);
        }
      });

      test('with answers on screen it claims the D-pad, leaving nothing to walk', () => {
        expect(driveDialogue(dialogue(), press())).toBe(true);
      });

      test('with no question up, A is not an answer and falls through to advancing', () => {
        // The dialogue refuses, and the press goes on to mean what it means the
        // rest of the time: show me the next line.
        accepts = false;
        const panel = dialogue({ withButtons: false });

        expect(driveDialogue(panel, press(0))).toBe(false);
        expect(chosen).toEqual([ACTION.CHOICE_1]);   // asked, and told no
      });

      test('a locked choice is refused the same way', () => {
        // The 800ms lock lives in the dialogue, which answers no; nothing here
        // needs to know about it beyond respecting that no.
        accepts = false;
        expect(driveDialogue(dialogue({ withButtons: false }), press(1))).toBe(false);
      });

      test('more than four answers keep the highlight', () => {
        // The dialogue stops putting badges on them, and that absence is the whole
        // signal: no badges, no claim on the D-pad.
        const panel = dialogue({ withButtons: false });
        expect(hasButtonChoices(panel)).toBe(false);
        accepts = false;
        expect(driveDialogue(panel, press(0))).toBe(false);
      });
    });
}

// ─── Naming the buttons on screen ──────────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: what the buttons do, where you are.
     *
     * The glyph machinery existed for the whole feature and nothing used it — it
     * rewrites anything tagged `data-gp-action`, and the game tagged nothing. So
     * with a controller in hand the HUD still said "(Q)" for something done with
     * LB. This is the half that was missing: a corner that names the buttons of the
     * screen the player is on, and the letter beside a decision.
     *
     * What is worth pinning is the choice of screen, because getting it wrong is
     * silent — the corner says something plausible about the wrong place.
     */

    const { contextFor } = await import('../../public/scripts/thePlayer/input/buttonHints.js');
    const { BLOCKING_SELECTORS } = await import('../../public/scripts/thePlayer/input/panels.js');

    /** A panel that matches one selector, as `isBlocking` asks it to. */
    const panelMatching = (selector) => ({ matches: (sel) => sel === selector });
    const ordinaryPanel = { matches: () => false };

    describe('button hints: which screen is being named (#264)', () => {
      test('no panel and not building is the world', () => {
        expect(contextFor({ panel: null, building: false })).toBe('world');
      });

      test('build mode has its own, because none of its buttons mean what they did', () => {
        expect(contextFor({ panel: null, building: true })).toBe('build');
      });

      test('a panel takes its own kind when it has one', () => {
        expect(contextFor({ panel: ordinaryPanel, kind: 'market' })).toBe('market');
        expect(contextFor({ panel: ordinaryPanel, kind: 'storage' })).toBe('storage');
      });

      test('a panel with no kind of its own falls back to confirm and back', () => {
        expect(contextFor({ panel: ordinaryPanel, kind: null })).toBe('panel');
      });

      test('a screen that answers to nothing is named nothing', () => {
        // Sleeping, loading, map transition: a corner listing buttons that do not
        // work is worse than an empty corner.
        for (const selector of BLOCKING_SELECTORS) {
          expect(contextFor({ panel: panelMatching(selector) })).toBe(null);
        }
      });

      test('building behind an open panel still names the panel', () => {
        // The panel is what the player is looking at; the build hints would be
        // telling them about a screen they cannot reach from here.
        expect(contextFor({ panel: ordinaryPanel, building: true, kind: 'crafting' })).toBe('crafting');
      });
    });

    describe('button hints: the stacking that made it look broken (#264)', () => {
        test('the strip sits above every panel', async () => {
            // It was at 9000 while the panels climb to 20000, so it worked and
            // named the right screen — behind whatever the player had opened. That
            // reads exactly like a strip that never changes.
            const css = readFileSync('public/style/gamepad.css', 'utf8');
            const strip = /#gamepad-hints\s*\{[^}]*z-index:\s*(\d+)/.exec(css);
            expect(strip).not.toBeNull();

            const panelLayers = [...readFileSync('public/style/commerce.css', 'utf8')
                .matchAll(/z-index:\s*(\d+)/g)].map((m) => Number(m[1]));
            expect(panelLayers.length).toBeGreaterThan(0);
            expect(Number(strip[1])).toBeGreaterThan(Math.max(...panelLayers));
        });

        test('and below the reticle, which it must not cover', () => {
            const css = readFileSync('public/style/gamepad.css', 'utf8');
            const strip = Number(/#gamepad-hints\s*\{[^}]*z-index:\s*(\d+)/.exec(css)[1]);
            const reticle = Number(/#gamepad-cursor\s*\{[^}]*z-index:\s*(\d+)/.exec(css)[1]);
            expect(strip).toBeLessThan(reticle);
        });
    });
}

// ─── The help panel and the HUD badge ──────────────────────────────────────

// Scoped: each section keeps the small helpers it was written with, and
// several of them chose the same names.
{
    /**
     * #264: the screen people open because they do not know what to press.
     *
     * It listed the keyboard whichever device was in hand, which made it the one
     * place in the game guaranteed to be wrong for half its readers — and the
     * equipped-item badge said "(Q)" while the controller opens the wheel on LB.
     *
     * The buttons are read from the bindings table, not from a list written beside
     * the screen, so what the panel prints and what the game answers to cannot
     * drift. These tests read the table too, rather than restating it.
     */

    const { ACTION, bindingsFor } = await import('../../public/scripts/thePlayer/input/bindings.js');
    const { buttonsForAction } = await import('../../public/scripts/thePlayer/input/gamepadGlyphs.js');

    describe('help panel: naming the controller buttons (#264)', () => {
      test('an action names the button the game listens for', () => {
        expect(buttonsForAction(ACTION.INTERACT)).toEqual(['A']);
        expect(buttonsForAction(ACTION.TOOL_WHEEL)).toEqual(['LB']);
        expect(buttonsForAction(ACTION.USE_TOOL)).toEqual(['RT']);
        expect(buttonsForAction(ACTION.PAUSE)).toEqual(['Start']);
      });

      test('the inventory names both of its buttons', () => {
        expect(bindingsFor('gamepad', ACTION.INVENTORY)).toEqual([3, 8]);
        expect(buttonsForAction(ACTION.INVENTORY)).toEqual(['Y', 'View']);
      });

      test('the four D-pad directions collapse into one name', () => {
        // A panel listing "move up" and "move down" separately would otherwise
        // print the same four arrows over and over.
        expect(buttonsForAction(ACTION.MOVE_UP)).toEqual(['D-Pad']);
        expect(buttonsForAction(ACTION.MOVE_LEFT)).toEqual(['D-Pad']);
      });

      test('an action with no button on the controller answers with nothing', () => {
        // Which is what lets the panel say so, instead of falling back to a key
        // the player is not holding. Settings and help have no button of their own.
        expect(buttonsForAction(ACTION.CONFIG)).toEqual([]);
        expect(buttonsForAction(ACTION.HELP)).toEqual([]);
      });

      test('a remapped button changes what the panel prints', () => {
        const { setBindings, resetBindings } = require('../../public/scripts/thePlayer/input/bindings.js');
        try {
          setBindings('gamepad', { [ACTION.INTERACT]: [2] });
          expect(buttonsForAction(ACTION.INTERACT)).toEqual(['X']);
        } finally {
          resetBindings('gamepad');
        }
        expect(buttonsForAction(ACTION.INTERACT)).toEqual(['A']);
      });
    });
}
