import { describe, test, expect } from 'bun:test';
import { normalizeSearch, searchTokens, matchesSearch } from '../../public/scripts/searchMatch.js';

describe('searchMatch', () => {
  test('normalizeSearch lowercases and strips accents', () => {
    expect(normalizeSearch('Maçã')).toBe('maca');
    expect(normalizeSearch('  ÁguA  ')).toBe('agua');
  });

  test('word-prefix match, case-insensitive', () => {
    const t = searchTokens('mad');
    expect(matchesSearch('Madeira Bruta', t)).toBe(true);
    expect(matchesSearch('MADEIRA BRUTA', searchTokens('MAD'))).toBe(true);
    expect(matchesSearch('Pedra', t)).toBe(false);
  });

  test('multiple tokens must each prefix some word', () => {
    const t = searchTokens('ma br');
    expect(matchesSearch('Madeira Bruta', t)).toBe(true);   // ma→madeira, br→bruta
    expect(matchesSearch('Madeira', t)).toBe(false);        // no "br" word
  });

  test('matches a later word by its prefix', () => {
    expect(matchesSearch('Semente de Cenoura', searchTokens('cen'))).toBe(true);
  });

  test('accent-insensitive both ways (messy input)', () => {
    expect(matchesSearch('Maçã', searchTokens('maca'))).toBe(true);
    expect(matchesSearch('Maca', searchTokens('maçã'))).toBe(true);
  });

  test('substring that is not a word prefix does not match', () => {
    expect(matchesSearch('Madeira', searchTokens('deira'))).toBe(false);
  });

  test('empty query matches everything', () => {
    expect(matchesSearch('anything', searchTokens(''))).toBe(true);
    expect(searchTokens('   ')).toEqual([]);
  });
});
