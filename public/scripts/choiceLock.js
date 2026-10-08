/**
 * @file choiceLock.js - Holding a decision for a moment (#264).
 *
 * A player skipping a conversation is pressing as fast as they can. The moment a
 * question appears, that same rhythm answers it for them — the first option
 * taken before a word of it was read. The few hundred milliseconds here are the
 * gap between "skipping the talk" and "answering the question", and the game
 * should not let one run into the other.
 *
 * This guards a person, not a bug. The input layer reports one press per press;
 * what is being slowed down is a hand that has not caught up with the screen.
 * (A similar-looking guard was removed from the inventory during #264 — that one
 * was covering for a real defect, where one press arrived as nine.)
 *
 * On its own rather than inside the dialogue, because the rule is not about
 * dialogue: anything that puts a decision in front of someone who is still
 * pressing wants it.
 */

/** Long enough to break a skipping rhythm — mashing runs 8-12 presses a second. */
export const CHOICE_LOCK_MS = 800;

let lockedUntil = 0;
let timer = null;

/** Monotonic where available; Date.now is close enough and always there. */
function now() {
    return (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now();
}

/**
 * Holds any decision taken through {@link choicesAreLocked} for a moment.
 *
 * @param {number} [ms]
 * @param {Element} [element] - marked `is-choice-locked` while it holds, so the
 *   lock is something the player sees rather than guesses: a press that vanishes
 *   without a trace reads as the game being broken.
 */
export function lockChoices(ms = CHOICE_LOCK_MS, element = null) {
    lockedUntil = now() + ms;
    clearTimeout(timer);

    element?.classList?.add('is-choice-locked');
    timer = setTimeout(() => {
        element?.classList?.remove('is-choice-locked');
        timer = null;
    }, ms);
}

export function choicesAreLocked() {
    return now() < lockedUntil;
}

/** Called when the decision goes away — taken, or the screen closed. */
export function clearChoiceLock(element = null) {
    clearTimeout(timer);
    timer = null;
    lockedUntil = 0;
    element?.classList?.remove('is-choice-locked');
}

export default { CHOICE_LOCK_MS, lockChoices, choicesAreLocked, clearChoiceLock };
