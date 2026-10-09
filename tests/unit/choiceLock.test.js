import { describe, test, expect, beforeEach } from 'bun:test';

/**
 * #264: holding a decision for a moment.
 *
 * Someone skipping a conversation is pressing as fast as they can. The moment a
 * question arrives, that same rhythm would answer it — the first option taken
 * before a word of it was read.
 *
 * Worth saying plainly, because this looks like a guard that was deleted
 * elsewhere in #264 for being a mask: that one was hiding an input bug that
 * reported one press as nine. This one guards a person. One press is one press
 * here — it is the hand that has not caught up with the screen.
 *
 * No DOM, no i18n, no dialogue: the rule is the whole module, which is why it
 * is a module.
 */

const { CHOICE_LOCK_MS, lockChoices, choicesAreLocked, clearChoiceLock } =
  await import('../../public/scripts/choiceLock.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Stands in for the element that shows it is holding. */
function marker() {
  const classes = new Set();
  return {
    classes,
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) },
  };
}

beforeEach(() => clearChoiceLock());

describe('choice lock (#264)', () => {
  test('the shipped window is long enough to break a skipping rhythm', () => {
    // Mashing runs 8-12 presses a second; under ~400ms would land inside one
    // of those gaps and change nothing.
    expect(CHOICE_LOCK_MS).toBeGreaterThanOrEqual(500);
    expect(CHOICE_LOCK_MS).toBeLessThanOrEqual(1200);
  });

  test('nothing is locked until a decision appears', () => {
    expect(choicesAreLocked()).toBe(false);
  });

  test('it holds, then opens on its own', async () => {
    // A short window on purpose: the shipped value is checked above, and
    // sitting on a real 800ms timer slows the whole suite for nothing.
    lockChoices(60);
    expect(choicesAreLocked()).toBe(true);

    await sleep(90);
    expect(choicesAreLocked()).toBe(false);
  });

  test('it shows that it is holding, and stops showing it', async () => {
    const el = marker();
    lockChoices(60, el);
    expect(el.classes.has('is-choice-locked')).toBe(true);

    await sleep(90);
    expect(el.classes.has('is-choice-locked')).toBe(false);
  });

  test('taking the decision clears it, so the next one starts fresh', () => {
    const el = marker();
    lockChoices(CHOICE_LOCK_MS, el);

    clearChoiceLock(el);
    expect(choicesAreLocked()).toBe(false);
    expect(el.classes.has('is-choice-locked')).toBe(false);
  });

  test('a second lock replaces the first rather than stacking timers', async () => {
    const el = marker();
    lockChoices(1000, el);
    lockChoices(60, el);

    await sleep(90);
    expect(choicesAreLocked()).toBe(false);
    expect(el.classes.has('is-choice-locked')).toBe(false);
  });
});
