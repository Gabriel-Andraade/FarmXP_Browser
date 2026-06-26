/**
 * @file searchMatch.js - Forgiving text search for item lists.
 * @description Accent/case-insensitive, word-prefix matching so typing the
 * start of a word (or words) surfaces items that begin with it.
 * @module searchMatch
 */

const DIACRITICS = /[̀-ͯ]/g;

/** Lowercase + strip accents (so "maca" matches "Maçã"). */
export function normalizeSearch(str) {
  return String(str ?? '')
    .normalize('NFD').replace(DIACRITICS, '')
    .toLowerCase().trim();
}

/** Split a query into normalized word tokens. */
export function searchTokens(query) {
  const n = normalizeSearch(query);
  return n ? n.split(/\s+/).filter(Boolean) : [];
}

/**
 * True if every query token is a prefix of some word in `name`.
 * e.g. tokens ["ma","br"] match "Madeira Bruta"; "mad" matches "Madeira".
 */
export function matchesSearch(name, tokens) {
  if (!tokens.length) return true;
  const words = normalizeSearch(name).split(/\s+/).filter(Boolean);
  return tokens.every(tok => words.some(w => w.startsWith(tok)));
}
