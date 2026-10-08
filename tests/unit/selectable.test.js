import { describe, test, expect } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * #264: every control the player can click has to be reachable without a mouse.
 *
 * A `<div>` with a click handler works for the mouse and for nothing else: it
 * cannot take focus, so Tab skips it and the controller — which navigates by
 * moving focus — cannot land on it. That is why the main menu answered the
 * controller only on the language flags: they were the only real `<button>`s on
 * the screen, and every option below them was invisible to it.
 *
 * Fixing the screens we knew about is not enough, because the next screen
 * someone writes brings the problem back. So this walks the source instead: a
 * clickable element that is neither a native control nor passed through
 * `selectable()` fails here, with the file and line to fix.
 *
 * A dark backdrop is the deliberate exception. It carries a click handler too —
 * "click outside to close" — but it is not a control, and making one focusable
 * lets the highlight rest on it, so the next confirm closes the panel. Those are
 * listed below by name, each with the reason, so adding one is a decision rather
 * than an oversight.
 */

const NATIVE = new Set(['button', 'a', 'input', 'select', 'textarea']);

/**
 * Click targets that must stay unfocusable, as `file:class`.
 * Everything here is a modal backdrop whose handler is `if (e.target === overlay)`.
 */
const BACKDROPS = new Set([
    'achievements/achievementMenuUI.js:mm-ach-reward-overlay',
    'animal/enclosureAnimalPanel.js:*',
    'animal/hospitalizePanel.js:vet-confirm-overlay',
    'chestSystem.js:cht-overlay',
    'craftingSystem.js:crf-overlay',
    'foodTroughPanelSimple.js:*',
    'gallery/galleryUI.js:gal-overlay',
    'houseSystem.js:modal hse-house-modal active',
    'houseSystem.js:modal storage-modal active',
    'pauseMenu.js:pause-overlay',
    'questSystem.js:modal active',
    'saveSlotsUI.js:save-dialog-overlay',
    'thePlayer/inventoryUI.js:*',
    'travelMap.js:*',
    'travelMap.js:tmap-popup-overlay',
    'vetSystem.js:*',
    'waterTroughPanel.js:*',
]);

/**
 * Click targets that are controls but are driven by something other than focus.
 */
const DRIVEN_ELSEWHERE = new Set([
    // The wheels open on LB and cycle on RB; the highlight never enters them,
    // so a focusable slot would only be a place for it to get stuck.
    'thePlayer/toolWheel.js:tw-slot',
    'thePlayer/seedWheel.js:tw-slot',
]);

function sourceFiles(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) sourceFiles(path, out);
        else if (entry.endsWith('.js')) out.push(path);
    }
    return out;
}

/**
 * Click targets in one file that cannot take focus.
 *
 * Resolves the three shapes the game uses to wire a click: straight onto the
 * variable it just created, later through `querySelectorAll`, and delegated from
 * `document` with `e.target.closest('.foo')` — the market uses the last one.
 *
 * Two passes, because none of the three is written in a reliable order: a file
 * may call `selectable()` after wiring the click, and the market declares the
 * class of its item boxes five hundred lines below the listener that reads it.
 */
function unreachableIn(file) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    const vars = {};            // variable -> { tag, cls }
    const byClass = {};         // class    -> tag
    const found = [];

    const reachable = new Set();
    for (const line of lines) {
        const m = line.match(/selectable(?:All)?\(\s*(\w+)/)
            ?? line.match(/(\w+)\.tabIndex\s*=\s*0/)
            ?? line.match(/(\w+)\.setAttribute\(['"`]tabindex['"`],\s*['"`]0['"`]\)/);
        if (m) reachable.add(m[1]);
    }

    for (const line of lines) {
        let m = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*document\.createElement\(['"`](\w+)['"`]\)/);
        if (m) vars[m[1]] = { tag: reachable.has(m[1]) ? 'button' : m[2].toLowerCase(), cls: null };

        // Plain string or template literal — the market names its item boxes
        // `` `mch-hexagon-slot ${selected ? ... : ''}` ``, so stopping at the
        // first `${` is what makes those visible here.
        m = line.match(/(\w+)\.className\s*=\s*['"`]([^'"`$]*)/);
        if (m && vars[m[1]] && m[2].trim()) {
            vars[m[1]].cls = m[2].trim();
            byClass[m[2].trim().split(' ')[0]] = vars[m[1]].tag;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Wired straight away.
        let m = line.match(/(\w+)\.addEventListener\(\s*['"`]click['"`]/);
        if (m && vars[m[1]] && !NATIVE.has(vars[m[1]].tag)) {
            found.push({ line: i + 1, cls: vars[m[1]].cls ?? '*', tag: vars[m[1]].tag });
        }

        // Built first, wired later: querySelectorAll('.foo') ... click
        m = line.match(/querySelectorAll\(['"`]\.([\w-]+)['"`]\)/);
        if (m && lines.slice(i, i + 4).join(' ').includes("addEventListener('click'")) {
            const tag = byClass[m[1]];
            if (tag && !NATIVE.has(tag)) found.push({ line: i + 1, cls: m[1], tag });
        }

        // Delegated: one listener on document, `e.target.closest('.foo')`.
        // The market is built this way, so without this the item boxes read as
        // having no handler at all.
        m = line.match(/closest\(['"`]\.([\w-]+)['"`]\)/);
        if (m && lines.slice(Math.max(0, i - 4), i + 1).join(' ').includes("addEventListener('click'")) {
            const tag = byClass[m[1]];
            if (tag && !NATIVE.has(tag)) found.push({ line: i + 1, cls: m[1], tag });
        }
    }
    return found;
}

describe('every clickable element can be reached without a mouse (#264)', () => {
    test('no click handler lands on an element the controller cannot focus', () => {
        const offenders = [];
        for (const file of sourceFiles('public/scripts')) {
            const key = file.replace(/\\/g, '/').replace('public/scripts/', '');
            for (const hit of unreachableIn(file)) {
                const id = `${key}:${hit.cls}`;
                if (BACKDROPS.has(id) || DRIVEN_ELSEWHERE.has(id)) continue;
                offenders.push(`${key}:${hit.line}  <${hit.tag} class="${hit.cls}">`);
            }
        }

        // Printed in full so the fix is "wrap it in selectable()", not a hunt.
        expect(offenders).toEqual([]);
    });

    test('the helper gives a div what a button already has', async () => {
        const { selectable } = await import('../../public/scripts/selectable.js');
        const attrs = {};
        const el = {
            dataset: {},
            style: {},
            hasAttribute: () => false,
            setAttribute: (k, v) => { attrs[k] = v; },
            addEventListener: () => {},
        };

        selectable(el);
        expect(el.tabIndex).toBe(0);
        expect(attrs.role).toBe('button');
        expect(el.dataset.selectable).toBe('true');
    });

    test('applying it twice does not stack listeners', async () => {
        const { selectable } = await import('../../public/scripts/selectable.js');
        let listeners = 0;
        const el = {
            dataset: {},
            hasAttribute: () => false,
            setAttribute: () => {},
            addEventListener: () => { listeners++; },
        };

        selectable(el);
        selectable(el);
        expect(listeners).toBe(1);
    });

    test('an explicit role is kept — a slider must not become a button', async () => {
        const { selectable } = await import('../../public/scripts/selectable.js');
        const attrs = {};
        const el = {
            dataset: {},
            hasAttribute: (k) => k === 'role',
            setAttribute: (k, v) => { attrs[k] = v; },
            addEventListener: () => {},
        };

        selectable(el);
        expect(attrs.role).toBeUndefined();
    });
});
