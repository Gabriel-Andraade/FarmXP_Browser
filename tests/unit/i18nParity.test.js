import { describe, test, expect } from 'bun:test';
import en from '../../public/scripts/i18n/en.js';
import es from '../../public/scripts/i18n/es.js';
import ptBR from '../../public/scripts/i18n/pt-BR.js';

/**
 * Flattens a nested translation dictionary into the set of leaf key paths,
 * e.g. "npc.couple.jeremyIntro". Arrays are treated as leaves (their shape is
 * the value, not more key paths).
 */
function keyPaths(obj, prefix = '', out = new Set()) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keyPaths(value, path, out);
    } else {
      out.add(path);
    }
  }
  return out;
}

// English is the reference locale; es/pt-BR must match its key paths exactly.
const enKeys = keyPaths(en);
const otherLocales = { es, 'pt-BR': ptBR };

describe('i18n key parity across locales (en/es/pt-BR)', () => {
  for (const [name, dict] of Object.entries(otherLocales)) {
    const keys = keyPaths(dict);

    test(`${name} is not missing any key present in en`, () => {
      const missing = [...enKeys].filter((k) => !keys.has(k)).sort();
      expect(missing).toEqual([]);
    });

    test(`${name} has no key absent from en`, () => {
      const extra = [...keys].filter((k) => !enKeys.has(k)).sort();
      expect(extra).toEqual([]);
    });
  }

  test('all three locales have the same number of key paths', () => {
    expect(keyPaths(es).size).toBe(enKeys.size);
    expect(keyPaths(ptBR).size).toBe(enKeys.size);
  });
});
