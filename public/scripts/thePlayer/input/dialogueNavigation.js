/**
 * @file dialogueNavigation.js - Answering a conversation with a controller (#264).
 *
 * Up to four answers, one face button each:
 *
 *   (A) first   (B) second   (X) third   (Y) fourth
 *
 * Past four there is no fifth face button, so longer lists fall back to the
 * highlight and the D-pad. A conversation should not have to be written around
 * how many buttons a controller has.
 *
 * The letters are not written down here: the dialogue prints what the binding
 * says, and this listens for the same binding, so the prompt and the button can
 * never drift apart.
 */
import { ACTION, firedAction } from './bindings.js';
import { chooseByAction } from '../../dialogueSystem.js';

const CHOICE_ACTIONS = [ACTION.CHOICE_1, ACTION.CHOICE_2, ACTION.CHOICE_3, ACTION.CHOICE_4];

export function isDialogue(panel) {
    return panel?.classList?.contains('dlg-overlay') === true;
}

/**
 * @returns {boolean} true when the answers carry buttons — then the D-pad has
 *   nothing to walk, because the buttons are the whole affordance.
 */
export function driveDialogue(panel, pressed) {
    for (const action of CHOICE_ACTIONS) {
        if (!firedAction(pressed, action)) continue;
        // Refused while the choices are still locked, and refused when there is
        // no question on screen — in which case A falls through and advances the
        // line, which is what it means the rest of the time.
        // 'consumed', not just true: the caller has to know the press was
        // spent here, because the same buttons mean confirm and back to it.
        if (chooseByAction(action)) return 'consumed';
    }
    return hasButtonChoices(panel);
}

/** Is a question on screen with a button on each answer? */
export function hasButtonChoices(panel) {
    return panel?.querySelector?.('.dlg-choice-btn[data-choice-action]') != null;
}

export default { isDialogue, driveDialogue, hasButtonChoices };
