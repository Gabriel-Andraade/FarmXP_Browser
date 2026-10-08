/**
 * @file gamepadProbe.js - On-screen check that the pad reaches the page (#264).
 *
 * Step 1 of gamepad support is a shell problem, not a game one: off-screen
 * rendering left `document.hasFocus()` false, and Chromium only hands gamepads
 * to a focused document, so `navigator.getGamepads()` came back empty however
 * many buttons were pressed.
 *
 * Verifying the fix needs DevTools, which the packaged build does not give you
 * — F12 belongs to the Steam overlay there. So this draws the same numbers on
 * screen instead.
 *
 * Off by default. Three ways in, because the packaged build has no console:
 *   - Ctrl+Shift+G in game
 *   - `__debug.gamepad.show()` where DevTools is available
 *   - `?gamepadProbe` in the URL
 *
 * It is a diagnostic, not a feature: nothing else in the game reads it.
 */

const STYLE = {
    position: 'fixed',
    left: '10px',
    top: '10px',
    zIndex: '99998',
    padding: '8px 12px',
    borderRadius: '6px',
    background: 'rgba(12, 9, 4, 0.88)',
    color: '#f5e9d3',
    font: '12px/1.5 monospace',
    whiteSpace: 'pre',
    pointerEvents: 'none',
    userSelect: 'none',
};

let panel = null;
let rafId = 0;

/** Pads the browser is willing to show us right now. */
function readPads() {
    const list = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    return Array.from(list ?? []).filter(Boolean);
}

function describe(pad) {
    const pressed = pad.buttons
        .map((b, i) => (b.pressed ? i : -1))
        .filter((i) => i >= 0);
    const axes = Array.from(pad.axes, (a) => a.toFixed(2)).join(' ');
    return [
        `  id      ${pad.id.slice(0, 48)}`,
        `  mapping ${pad.mapping || '(none)'}`,
        `  buttons ${pressed.length ? pressed.join(',') : '-'}`,
        `  axes    ${axes}`,
    ].join('\n');
}

function frame() {
    if (!panel) return;
    const pads = readPads();
    const lines = [
        `hasFocus      ${document.hasFocus()}`,
        `visibility    ${document.visibilityState}`,
        `getGamepads   ${pads.length} connected`,
    ];
    for (const pad of pads) lines.push(describe(pad));
    if (pads.length === 0) {
        lines.push('  press a button on the controller');
        // The gate is focus: with hasFocus false, the list stays empty no
        // matter what is plugged in.
        if (!document.hasFocus()) lines.push('  (hasFocus is false — that is the blocker)');
    }
    panel.textContent = lines.join('\n');
    rafId = requestAnimationFrame(frame);
}

export function showGamepadProbe() {
    if (panel) return;
    panel = document.createElement('div');
    panel.id = 'gamepad-probe';
    Object.assign(panel.style, STYLE);
    document.body.appendChild(panel);
    rafId = requestAnimationFrame(frame);
}

export function hideGamepadProbe() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    panel?.remove();
    panel = null;
}

/** One-shot reading, for the console. */
export function gamepadSnapshot() {
    const pads = readPads();
    return {
        hasFocus: document.hasFocus(),
        visibility: document.visibilityState,
        count: pads.length,
        pads: pads.map((p) => ({ id: p.id, mapping: p.mapping, axes: p.axes.length, buttons: p.buttons.length })),
    };
}

export function initGamepadProbe() {
    window.__debug = window.__debug || {};
    window.__debug.gamepad = {
        show: showGamepadProbe,
        hide: hideGamepadProbe,
        snapshot: gamepadSnapshot,
    };

    // Chromium fires this only once the page may see pads at all — which is
    // exactly what #264 was missing, so it doubles as the proof.
    window.addEventListener('gamepadconnected', (e) => {
        console.info(`[gamepad] connected: ${e.gamepad.id} (mapping: ${e.gamepad.mapping || 'none'})`);
    });
    window.addEventListener('gamepaddisconnected', (e) => {
        console.info(`[gamepad] disconnected: ${e.gamepad.id}`);
    });

    // Ctrl+Shift+G: the way in on the packaged build, where F12 belongs to the
    // Steam overlay and there is no console to type into.
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
            e.preventDefault();
            panel ? hideGamepadProbe() : showGamepadProbe();
        }
    });

    try {
        if (new URLSearchParams(location.search).has('gamepadProbe')) showGamepadProbe();
    } catch { /* no URL access, no auto-show */ }
}
