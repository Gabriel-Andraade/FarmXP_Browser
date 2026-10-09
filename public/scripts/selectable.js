/**
 * @file selectable.js - Makes a non-button element behave like a button (#264).
 *
 * The game builds a lot of its controls as plain `<div>`s with a click handler.
 * That works for the mouse and fails for everything else: a `<div>` cannot take
 * focus, so Tab skips it and the controller — which navigates by moving focus —
 * cannot reach it at all. The main menu was the clearest case: the only focusable
 * things on it were the three language flags, so the controller could change the
 * language and nothing else.
 *
 * Rather than patch each screen, every such control passes through here.
 *
 * `tests/unit/selectable.test.js` fails the build when a new clickable element
 * skips it, so this stays true without anyone having to remember.
 *
 * Not for the dark backdrop behind a modal. Those carry a click handler too —
 * "click outside to close" — but they are not controls, and making one focusable
 * lets the highlight rest on it, so the next confirm closes the panel.
 */

/**
 * @param {HTMLElement} el - the element that already has its click handler
 * @param {{ role?: string }} [opts] - `role` defaults to `button`
 * @returns {HTMLElement} the same element, so it can be chained
 */
export function selectable(el, { role = 'button' } = {}) {
    if (!el || el.dataset?.selectable === 'true') return el;
    el.dataset.selectable = 'true';

    el.tabIndex = 0;
    if (!el.hasAttribute?.('role')) el.setAttribute('role', role);

    // A real <button> fires click on Enter and Space; a <div> does not, so a
    // keyboard user could focus the control and still not use it. The gamepad
    // calls .click() directly and never needed this, but the two should not
    // disagree about what the element does.
    el.addEventListener('keydown', (event) => {
        // Only when this element is the one focused. Several of the elements
        // wrapped here contain real controls — a recipe row holds its "craft"
        // button, a storage card holds its action button and its amount field —
        // and a key pressed on one of those bubbles up here. Acting on it
        // cancelled the button's own click and clicked the wrapper instead, so
        // a keyboard user could not craft, take or store, and typing in the
        // amount field swallowed Space and Enter.
        if (event.target !== el) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        // The game listens for keys on `document` too. Without this the same
        // Space both presses the control and reaches whatever the world does
        // with it — which is why the one panel that hand-rolled this behaviour
        // stopped propagation as well.
        event.stopPropagation();
        el.click();
    });

    return el;
}

/** Applies {@link selectable} to several elements at once. */
export function selectableAll(elements, opts) {
    for (const el of elements ?? []) selectable(el, opts);
    return elements;
}

export default selectable;
