import { describe, test, expect, mock } from 'bun:test';

// `t` returns the key itself, so these tests assert which key the mapping picks
// without dragging in the i18n runtime.
mock.module('../../public/scripts/i18n/i18n.js', () => ({
  t: (key) => key,
  i18n: { t: (key) => key, getCurrentLanguage: () => 'en' },
  default: {},
}));

const { importErrorMessage, importSuccessMessage } =
  await import('../../public/scripts/saveMessages.js');

import en from '../../public/scripts/i18n/en.js';
import es from '../../public/scripts/i18n/es.js';
import ptBR from '../../public/scripts/i18n/pt-BR.js';

/**
 * #259: the reason → message mapping is shared by the two import paths (the
 * in-game slots modal and the main menu). These tests pin the contract between
 * saveSystem's `reason` values, the mapping, and the three dictionaries — so a
 * new reason cannot ship with a message in only one place, or none at all.
 */

// Every `reason` importData() can return on failure.
const IMPORT_REASONS = [
  'invalid_json',
  'not_a_save',
  'checksum_mismatch',
  'bad_shape',
  'newer_version',
  'write_failed',
];

const LOCALES = { en, es, 'pt-BR': ptBR };

/** Resolve a dotted key path against a locale dictionary. */
const lookup = (dict, path) => path.split('.').reduce((o, k) => o?.[k], dict);

describe('save import messages (#259)', () => {
  test('every failure reason maps to a key that exists in all three locales', () => {
    for (const reason of IMPORT_REASONS) {
      const key = importErrorMessage(reason);
      // A mapped reason resolves to a key, never to the generic fallback.
      expect(key, `reason "${reason}" is not mapped`).not.toContain('importError');
      for (const [locale, dict] of Object.entries(LOCALES)) {
        const value = lookup(dict, key);
        expect(typeof value, `${locale} → ${key} (reason: ${reason})`).toBe('string');
        expect(value.length, `${locale} → ${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

  test('an unmapped reason falls back and keeps the raw reason visible', () => {
    // A reason added to saveSystem without a message still says something, and
    // shows what happened instead of failing silently.
    expect(importErrorMessage('something_new')).toBe('saveSlots.importError (something_new)');
    expect(importErrorMessage(undefined)).toBe('saveSlots.importError');
  });

  test('an unverified import reads differently from a verified one', () => {
    const verified = importSuccessMessage(undefined);
    const unverified = importSuccessMessage('unsigned');
    expect(verified).toBe('saveSlots.importSuccess');
    expect(unverified).toBe('saveSlots.importSuccessUnverified');

    for (const [locale, dict] of Object.entries(LOCALES)) {
      const ok = lookup(dict, verified);
      const warn = lookup(dict, unverified);
      expect(typeof warn, `${locale} → ${unverified}`).toBe('string');
      // If they read the same, the warning carries no information.
      expect(warn, `${locale}: unverified message must differ`).not.toBe(ok);
    }
  });

  test('the export-refused message exists in all three locales', () => {
    for (const [locale, dict] of Object.entries(LOCALES)) {
      const value = lookup(dict, 'saveSlots.exportInvalid');
      expect(typeof value, `${locale} → saveSlots.exportInvalid`).toBe('string');
    }
  });
});
