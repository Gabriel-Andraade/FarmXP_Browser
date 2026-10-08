import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import '../setup.js';

/**
 * #264: the game has two settings screens, and they must offer the same things.
 *
 * The gear in-game and the one on the main menu are written in different class
 * vocabularies, so they each draw the settings their own way. What they must
 * not do is disagree about *which settings exist* — and they did: the whole
 * controller section was added to the in-game screen and was missing from the
 * main menu for the entire feature, which nobody noticed because nothing could.
 *
 * The list is now data, in one place, and both screens walk it.
 */

const { SETTINGS_FIELDS, RANGES, TOGGLES } =
  await import('../../public/scripts/thePlayer/input/gamepadSettings.js');

const source = (path) => readFileSync(path, 'utf8');

describe('settings parity: the controller section (#264)', () => {
  test('every setting that exists is declared, and every declaration is real', () => {
    const declared = SETTINGS_FIELDS.map((f) => f.key).sort();
    const actual = [...Object.keys(RANGES), ...Object.keys(TOGGLES)].sort();
    expect(declared).toEqual(actual);
  });

  test('each declaration says how to draw it and what to call it', () => {
    for (const field of SETTINGS_FIELDS) {
      expect(['slider', 'toggle']).toContain(field.kind);
      expect(field.i18n).toMatch(/^settings\.gamepad\./);
      expect(field.fallback.length).toBeGreaterThan(0);
      // A slider needs a range to draw; a toggle must not claim one.
      expect(field.kind === 'slider').toBe(field.key in RANGES);
    }
  });

  test('both screens draw the declaration rather than their own list', () => {
    // Written as a check on the source because the alternative — each screen
    // naming its six settings in its own markup — is exactly the shape that
    // let one of them fall behind.
    for (const path of ['public/scripts/settingsUI.js', 'public/scripts/mainMenu/mainMenu.js']) {
      expect(source(path)).toContain('SETTINGS_FIELDS');
    }
  });

  test('neither screen hard-codes a setting key beside the loop', () => {
    // A key written in by hand is a setting the other screen will not know about.
    const keys = SETTINGS_FIELDS.map((f) => f.key);
    for (const path of ['public/scripts/settingsUI.js', 'public/scripts/mainMenu/mainMenu.js']) {
      const text = source(path);
      for (const key of keys) {
        const quoted = new RegExp(`['"\`]${key}['"\`]`);
        expect(quoted.test(text)).toBe(false);
      }
    }
  });

  test('the main menu offers the controller section at all', () => {
    // The one that was missing. Named here so removing it fails loudly.
    // The call, not the definition: a method that exists and is never called
    // is the same missing section with extra steps.
    expect(source('public/scripts/mainMenu/mainMenu.js')).toContain('this._buildGamepadRows()');
    expect(source('public/scripts/mainMenu/mainMenu.js')).toContain('settings.gamepad.title');
  });
});
