import { describe, test, expect, mock } from 'bun:test';
import "../setup.js";

/**
 * #261: the pause menu's DOM needs a real browser, which this suite does not
 * have — `tests/setup.js` stubs `querySelector` to always return an element, so
 * asserting on rendered markup here would prove nothing.
 *
 * What is worth pinning is the part a future change can silently break: the row
 * configuration, the list of panels that own Esc, and the translations behind
 * every label.
 */

mock.module('../../public/scripts/logger.js', () => ({
  logger: { info() {}, warn() {}, error() {}, debug() {} },
}));

mock.module('../../public/scripts/gameState.js', () => ({
  registerSystem: (name, instance) => instance,
  getSystem: () => null,
  getObject: () => null,
  setObject: () => {},
  setGameFlag: () => {},
  checkGameFlag: () => false,
  setDebugFlag: () => {},
  getDebugFlag: () => false,
  initDebugFlagsFromUrl: () => {},
  exposeDebug: () => {},
  installLegacyGlobals: () => {},
  default: {},
}));

const { ITEMS } = await import('../../public/scripts/pauseMenu.js');
// #264: the panel list moved to its proper owner — one module answers "is a
// panel open", instead of the pause menu and the controller each keeping one.
const { OVERLAY_SELECTORS, SHADOW_PANELS } =
  await import('../../public/scripts/thePlayer/input/panels.js');

import en from '../../public/scripts/i18n/en.js';
import es from '../../public/scripts/i18n/es.js';
import ptBR from '../../public/scripts/i18n/pt-BR.js';

const LOCALES = { en, es, 'pt-BR': ptBR };
const lookup = (dict, path) => path.split('.').reduce((o, k) => o?.[k], dict);

describe('pause menu (#261)', () => {
  describe('rows', () => {
    test('carries the seven rows from the approved mockup', () => {
      expect(ITEMS.map((i) => i.id)).toEqual([
        'continue', 'save', 'settings', 'inventory', 'help', 'mainMenu', 'quit',
      ]);
    });

    test('Save sits directly under Continue', () => {
      const ids = ITEMS.map((i) => i.id);
      expect(ids.indexOf('save')).toBe(ids.indexOf('continue') + 1);
    });

    test('only "quit game" is shell-only', () => {
      // A browser tab cannot close itself, so that row is hidden on the web.
      // Anything else marked shellOnly would silently vanish there too.
      expect(ITEMS.filter((i) => i.shellOnly).map((i) => i.id)).toEqual(['quit']);
    });

    test('every row has an icon and a fallback label', () => {
      // The fallback is what shows if i18n has not loaded yet; an empty row
      // would look like a rendering bug.
      for (const item of ITEMS) {
        expect(item.icon, `${item.id} has no icon`).toBeTruthy();
        expect(item.fallback, `${item.id} has no fallback label`).toBeTruthy();
      }
    });

    test('row ids are unique', () => {
      const ids = ITEMS.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('translations', () => {
    test('every row label exists in all three locales', () => {
      for (const item of ITEMS) {
        for (const [locale, dict] of Object.entries(LOCALES)) {
          const value = lookup(dict, item.i18n);
          expect(typeof value, `${locale} → ${item.i18n} (row: ${item.id})`).toBe('string');
          expect(value.length, `${locale} → ${item.i18n} is empty`).toBeGreaterThan(0);
        }
      }
    });

    test('the title and both exit confirmations are translated', () => {
      const keys = [
        'pause.title',
        'pause.confirmQuit',
        'pause.confirmMainMenu',
        'pause.saveAndExit',
        'pause.exitAnyway',
      ];
      for (const key of keys) {
        for (const [locale, dict] of Object.entries(LOCALES)) {
          expect(typeof lookup(dict, key), `${locale} → ${key}`).toBe('string');
        }
      }
    });

    test('both confirmations warn about losing progress', () => {
      // The whole point of the dialog: leaving throws away the world in memory.
      const warnsAbout = { en: /lost/i, es: /perder/i, 'pt-BR': /perdid/i };
      for (const [locale, dict] of Object.entries(LOCALES)) {
        for (const key of ['pause.confirmQuit', 'pause.confirmMainMenu']) {
          expect(lookup(dict, key), `${locale} → ${key} must mention the risk`)
            .toMatch(warnsAbout[locale]);
        }
      }
    });
  });

  describe('Esc ownership', () => {
    test('defers to the panels that already handle Esc', () => {
      // ~16 panels bind Escape. The menu must not open on top of them.
      expect(OVERLAY_SELECTORS.length).toBeGreaterThan(10);
      for (const sel of OVERLAY_SELECTORS) {
        expect(typeof sel).toBe('string');
        expect(sel.trim(), 'empty selector').toBeTruthy();
      }
    });

    test('state classes match what the panels actually set', () => {
      // These were wrong on the first pass (guessed `.open` where the code uses
      // `.is-open`, ids that do not exist). A selector that matches nothing
      // fails silently — the menu just opens on top of that panel.
      const joined = OVERLAY_SELECTORS.join(' ');
      expect(joined).toContain('#khp-help-overlay.is-open');   // helpPanel CLS.open
      expect(joined).toContain('.dlg-overlay.active');         // dialogue.css
      expect(joined).toContain('.mm-overlay');                 // hidden via display:none
      expect(joined).toContain('#ldg-initial-screen');         // loadingScreen.js
    });

    test('covers the panels the menu itself can open', () => {
      // Opening one of these from the menu and pressing Esc must close *it*,
      // not toggle the menu underneath.
      const joined = OVERLAY_SELECTORS.join(' ');
      // Settings is matched by the generic `.modal.active` rather than by an
      // entry of its own, so what matters is that its classes are covered, not
      // that its id appears in the list. #configModal carries `modal` in the
      // markup and gains `active` when the menu opens it.
      const covers = (className) => {
        const classes = new Set(className.split(/\s+/));
        return OVERLAY_SELECTORS.some((sel) =>
          sel.startsWith('.') && sel.slice(1).split('.').every((c) => classes.has(c)));
      };
      expect(covers('modal active')).toBe(true);   // Settings
      expect(joined).toContain('save-modal');      // Save
      expect(joined).toContain('help-overlay');    // Help
      // The inventory is detected through SHADOW_PANELS, not this list: its
      // markup lives in a shadow root, where querySelector cannot reach.
      const shadow = SHADOW_PANELS.map((p) => `${p.host} ${p.inner}`).join(' ');
      expect(shadow).toContain('inventory');
    });

    test('the exit confirmation is in the list', () => {
      // Esc with the confirmation open must cancel *it* and leave the menu
      // paused. The menu's listener is registered first, so without this entry
      // one key press closed both layers and dropped the player into a
      // running world.
      expect(OVERLAY_SELECTORS).toContain('.save-dialog-overlay');
    });

    test('selectors are unique', () => {
      expect(new Set(OVERLAY_SELECTORS).size).toBe(OVERLAY_SELECTORS.length);
    });
  });
});
