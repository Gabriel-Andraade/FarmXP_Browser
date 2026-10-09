/**
 * @file panels.js - Which panel is open, and how to walk it (#264).
 *
 * The single answer to "is a panel on screen, and which one?". It used to be
 * answered twice — the pause menu kept one list and the controller another —
 * and they disagreed: the pause menu cannot see into a shadow root, so pressing
 * B in the inventory closed the inventory *and* opened the pause menu, because
 * only one of the two knew the inventory was there.
 *
 * Everything that needs to know asks here.
 */

/**
 * Panels that own Escape while they are on screen.
 *
 * It is a list because the panels share no "open" registry — each toggles its
 * own class. **Add new full-screen panels here**, or Escape will reach past
 * them to the pause menu.
 */
export const OVERLAY_SELECTORS = [
    // The game's own convention: a panel is `modal` plus `active`. One entry
    // covers the house door, the warehouse, the quest log and the settings —
    // and the next panel written that way, without anyone editing this list.
    '.modal.active',
    '#keybinds-modal.is-open',
    '#keybinds-overlay.is-open',
    '.save-modal-overlay.active',
    '.save-dialog-overlay',
    '#khp-help-overlay.is-open',
    '#enclosure-animal-panel.eap-visible',
    '#vet-overlay.vet-visible',
    '#commerceModal.active',
    '#merchantsListModal.active',
    '#tradeConfirmModal.active',
    '#playerPanel.active',
    '#tomb-memorial-modal.active',
    // Crafting and the chest both put their backdrop and their panel side by
    // side rather than nesting them, so the panel is what to name: the backdrop
    // holds no controls. The chest was listed as '.cht-overlay.open', a class it
    // never gets — it is built on open and removed on close.
    '.crf-panel',
    '#cht-panel',
    '.contract-panel-overlay.open',
    '.dlg-overlay.active',
    '.mm-overlay',
    '.gal-overlay',
    '.mm-ach-reward-overlay',
    '#travel-map-overlay.tmap-visible',
    '.tmap-popup-overlay.tmap-popup-active',
    '.tmap-refuel-modal.tmap-refuel-active',
    '#well-overlay.active',
    '#map-transition-screen',
    '#ldg-initial-screen',
    // Sleeping is not a menu, but it is a screen the world must not run behind:
    // the keyboard is blocked while it is up and the stick was not.
    '#ldg-sleep-screen',
];

/**
 * Panels whose markup lives inside a shadow root, as host -> inner selector.
 * `document.querySelector` stops at the shadow boundary, which is why the
 * inventory read as "nothing open" and the character kept walking behind it.
 */
export const SHADOW_PANELS = [
    { host: '#inventory-ui-host', inner: '#inventoryModal.open' },
];

/**
 * Screens that take no input at all.
 *
 * Not menus: there is nothing on them to choose. They are listed so the world
 * stops behind them, and then every button is swallowed — sleeping blocked the
 * keyboard and not the stick, so the player slept and strolled off at once.
 */
export const BLOCKING_SELECTORS = [
    '#ldg-sleep-screen',
    '#map-transition-screen',
    '#ldg-initial-screen',
];

export function isBlocking(panel) {
    return BLOCKING_SELECTORS.some((sel) => panel?.matches?.(sel));
}

/** Selectors the pause menu adds to the list — it cannot contain itself. */
const PAUSE_SELECTOR = '#pauseMenu.active';

/**
 * Rendered, as opposed to merely present.
 * Not `offsetParent`: that is null for every `position: fixed` element, which
 * these all are.
 */
export function onScreen(el) {
    if (!el) return false;
    if (typeof el.getClientRects !== 'function') return true;   // stubbed DOM (tests)
    return el.getClientRects().length > 0;
}

/**
 * The real focused element, following shadow roots.
 *
 * `document.activeElement` reports the *host* when focus is inside a shadow
 * root, so acting on it clicked the inventory's wrapper instead of the item —
 * which is why the inventory felt completely dead to the controller.
 */
export function deepActiveElement() {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el;
}

/** The open shadow-hosted panel, or null. */
function openShadowPanel() {
    for (const { host, inner } of SHADOW_PANELS) {
        const el = document.querySelector(host)?.shadowRoot?.querySelector(inner);
        if (onScreen(el)) return el;
    }
    return null;
}

/**
 * The topmost panel on screen, by paint order, or null in the world.
 * @param {{ includePause?: boolean }} opts - the pause menu asks without itself
 */
export function openPanel({ includePause = true } = {}) {
    const selectors = includePause ? [...OVERLAY_SELECTORS, PAUSE_SELECTOR] : OVERLAY_SELECTORS;
    let best = null;
    let bestZ = -Infinity;
    const consider = (el, depth) => {
        if (depth >= bestZ) { best = el; bestZ = depth; }
    };

    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (!onScreen(el)) continue;
        const z = Number(getComputedStyle(el).zIndex);
        consider(el, Number.isFinite(z) ? z : 0);
    }

    // In the same comparison, not as a fallback after it: the inventory lives
    // in a shadow root, and taking it only when no document overlay was found
    // let a lower one win over it.
    const shadow = openShadowPanel();
    if (shadow) {
        // Its own z-index is inside the shadow tree; what stacks against the
        // other panels is the host.
        const host = document.querySelector(SHADOW_PANELS[0].host);
        const z = host ? Number(getComputedStyle(host).zIndex) : 0;
        consider(shadow, Number.isFinite(z) ? z : 0);
    }

    return best;
}

export function isPanelOpen(opts) {
    return openPanel(opts) !== null;
}

// ── Walking a panel ─────────────────────────────────────────────────────────

const FOCUSABLE = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Focusable, rendered elements inside a panel — shadow roots included. */
export function focusableIn(root) {
    if (!root) return [];
    const out = [];
    const walk = (node) => {
        for (const el of node.querySelectorAll?.(FOCUSABLE) ?? []) {
            if (onScreen(el)) out.push(el);
        }
        for (const el of node.querySelectorAll?.('*') ?? []) {
            if (el.shadowRoot) walk(el.shadowRoot);
        }
    };
    walk(root);
    return out;
}

/**
 * Focuses an element and marks it as the controller's selection.
 *
 * Focus alone is not enough feedback: each panel styles `:hover` its own way
 * and several do nothing visible for `:focus`, so a player navigating by stick
 * could not tell where they were.
 */
/**
 * The highlight, written straight onto the element.
 *
 * Not a stylesheet rule, for two reasons that compound:
 *   - `gamepad.css` is a document stylesheet, and shadow DOM does not inherit
 *     those, so inside the inventory the selection was invisible
 *   - injecting a `<style>` into the shadow root would be blocked by
 *     `style-src 'self'` (#262), so it would have stayed invisible anyway
 *
 * `el.style` is a CSSOM write, which CSP does not cover — the same reason the
 * game's own `style.cssText` calls keep working.
 */
const FOCUS_STYLE = {
    outline: ['3px solid #c9a463', 'important'],
    'outline-offset': ['2px', ''],
    'border-radius': ['6px', ''],
    'box-shadow': ['0 0 0 1px rgba(0,0,0,0.6), 0 0 14px rgba(201,164,99,0.55)', 'important'],
};

/**
 * The outline without the glow. An inline `!important` beats an `!important`
 * rule in a stylesheet, so the media query in `gamepad.css` could never reach
 * this — the preference has to be read here.
 */
const REDUCED_SHADOW = '0 0 0 1px rgba(0,0,0,0.6)';

function reducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function paintHighlight(el) {
    const reduced = reducedMotion();
    for (const [prop, [value, priority]] of Object.entries(FOCUS_STYLE)) {
        const resolved = reduced && prop === 'box-shadow' ? REDUCED_SHADOW : value;
        el.style?.setProperty?.(prop, resolved, priority);
    }
}

/**
 * Where the highlight can actually be seen.
 *
 * A CSS switch hides its real `<input>` with `opacity: 0; width: 0; height: 0`
 * — it has to stay in the page, because it is the thing that toggles, but it has
 * no box to draw on. Focus landed on it correctly and the player saw *nothing*
 * selected on every switch in Settings. Draw on the first ancestor that has a
 * real box; focus still goes to the input itself.
 */
function highlightTarget(el) {
    let node = el;
    for (let up = 0; node && up < 4; up++) {
        const box = node.getBoundingClientRect?.();
        if (!box || (box.width >= 2 && box.height >= 2)) return node;
        node = node.parentElement;
    }
    return el;
}

function clearHighlight(el) {
    for (const prop of Object.keys(FOCUS_STYLE)) {
        el.style?.removeProperty?.(prop);
    }
    el.classList?.remove('gp-focused');
}

/**
 * Tooltips are wired to `mouseenter`/`mouseleave`, which a controller never
 * fires — so the item card stayed blank while the stick moved over the grid.
 * Sending the real events reuses whatever each panel already shows on hover.
 */
function syncHoverEvents(previous, next) {
    const at = (el) => {
        const r = el.getBoundingClientRect?.();
        return { clientX: (r?.left ?? 0) + (r?.width ?? 0) / 2, clientY: (r?.top ?? 0) + (r?.height ?? 0) / 2 };
    };
    if (previous && previous !== next) {
        previous.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false, ...at(previous) }));
    }
    if (next) {
        const point = at(next);
        next.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, ...point }));
        next.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, ...point }));
    }
}

/**
 * Clicks the neighbour of whatever is active in a strip of filter buttons.
 *
 * Used wherever a panel groups its contents behind tabs or pills — the market's
 * categories, crafting's recipe types — so a shoulder button means "the next
 * one" without each panel needing its own idea of that.
 *
 * @param {Element} root
 * @param {string} selector - the buttons of the strip
 * @param {number} step - +1 or -1
 * @param {string} [activeClass] - how this panel marks the chosen one
 * @returns {boolean} true when it clicked
 */
export function stepStrip(root, selector, step, activeClass = 'active') {
    const buttons = [...(root?.querySelectorAll(selector) ?? [])].filter(onScreen);
    if (buttons.length < 2) return false;
    const current = buttons.findIndex((b) => b.classList.contains(activeClass));
    const from = current < 0 ? 0 : current;
    buttons[(from + step + buttons.length) % buttons.length].click();
    return true;
}

/**
 * How many items sit on one row of a wrapping grid.
 *
 * Measured rather than read from the CSS: these grids are `auto-fill`, so the
 * count changes with the width of the window. Items share a row when their tops
 * line up.
 */
function gridColumns(items) {
    const first = items[0].getBoundingClientRect?.();
    if (!first) return items.length;            // stubbed DOM (tests)
    let columns = 0;
    for (const el of items) {
        if (Math.abs(el.getBoundingClientRect().top - first.top) > 2) break;
        columns++;
    }
    return Math.max(1, columns);
}

/**
 * The next item of a grid in that direction, or null at the edge.
 *
 * Clamped rather than wrapped: carrying the highlight from the end of a row to
 * the start of the next reads as it jumping backwards.
 *
 * @returns {Element|null}
 */
export function gridStep(items, current, dir) {
    if (!items.length) return null;
    if (current < 0) return items[0];

    const columns = gridColumns(items);
    const step = dir === 'ArrowRight' ? 1
        : dir === 'ArrowLeft' ? -1
        : dir === 'ArrowDown' ? columns
        : -columns;

    const next = current + step;
    return (next < 0 || next >= items.length) ? null : items[next];
}

export function focusAndMark(el) {
    if (!el) return;
    for (const previous of document.querySelectorAll('.gp-focused')) {
        clearHighlight(previous);
    }
    // The marked element may live in a shadow root, where the query above
    // cannot reach — clear there too.
    for (const { host } of SHADOW_PANELS) {
        const root = document.querySelector(host)?.shadowRoot;
        for (const previous of root?.querySelectorAll('.gp-focused') ?? []) {
            clearHighlight(previous);
        }
    }
    // The highlight and the focus can land on different elements: see
    // highlightTarget. Focus has to stay on the control that actually reacts.
    const target = highlightTarget(el);
    target.classList.add('gp-focused');
    paintHighlight(target);
    el.focus();
    target.scrollIntoView?.({ block: 'nearest' });
    syncHoverEvents(lastMarked, target);
    lastMarked = target;
}

/** The element the highlight was on, for the matching mouseleave. */
let lastMarked = null;

export default {
    OVERLAY_SELECTORS, SHADOW_PANELS, BLOCKING_SELECTORS, isBlocking,
    onScreen, deepActiveElement,
    openPanel, isPanelOpen, focusableIn, focusAndMark,
};
