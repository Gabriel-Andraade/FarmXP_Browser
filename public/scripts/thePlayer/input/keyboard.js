/**
 * @file keyboard.js - The keyboard half of the input layer (#264).
 *
 * What a key press means, and what the game reads afterwards. Three sources
 * feed the same action table — the keyboard here, the mobile joystick, and the
 * controller through `setGamepadActions` — so everything downstream asks "is
 * the player moving up?" and never "which device said so".
 *
 * `keys` is the old shape, kept in step for the code that still reads it
 * directly. New code should read the actions.
 *
 * Moved out of control.js, which keeps re-exporting all of it: the file had
 * grown to hold the keyboard, the mouse, the touch layer and the world
 * interaction at once, and only this part is about a keyboard.
 */
import { CONTROLS_STORAGE_KEY, DEFAULT_KEYBINDS } from '../../keybindDefaults.js';
import { setBindings } from './bindings.js';

// Where settingsUI lives, from here. Loaded lazily, by path, so a config screen
// that is not ready yet cannot break the controls.
const CONFIG_UI_MODULE_PATH = '../../settingsUI.js';

const CONFIG_STORAGE_KEYS = ['farmxp_config', 'farmxp_settings', 'farmxp_options'];

export const keys = {
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
    KeyA: false, KeyW: false, KeyS: false, KeyD: false,
    KeyE: false, Space: false
};

// ─────────────────────────────────────────────
// Remap (Config) -> farmxp_controls
// ─────────────────────────────────────────────
// tenta ler binds também do config/settings geral (se teu configUI usar outra key)


// caminho do configUI.js (control/control.js -> ../configUI.js)


function extractKeybindsFromConfig(candidate) {
    if (!candidate || typeof candidate !== "object") return null;

    // formatos mais comuns:
    if (candidate.keybinds && typeof candidate.keybinds === "object") return candidate.keybinds;
    if (candidate.controls && typeof candidate.controls === "object") return candidate.controls;

    // às vezes vem dentro de settings / config
    if (candidate.settings && typeof candidate.settings === "object") {
        if (candidate.settings.keybinds && typeof candidate.settings.keybinds === "object") return candidate.settings.keybinds;
        if (candidate.settings.controls && typeof candidate.settings.controls === "object") return candidate.settings.controls;
    }

    if (candidate.config && typeof candidate.config === "object") {
        if (candidate.config.keybinds && typeof candidate.config.keybinds === "object") return candidate.config.keybinds;
        if (candidate.config.controls && typeof candidate.config.controls === "object") return candidate.config.controls;
    }

    return null;
}

function tryReadKeybindsFromOtherStorage() {
    for (const k of CONFIG_STORAGE_KEYS) {
        try {
            const raw = localStorage.getItem(k);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            const extracted = extractKeybindsFromConfig(parsed);
            if (extracted) return extracted;
        } catch {}
    }
    return null;
}

// API pública (útil pro configUI chamar também, se quiser)
export function getKeybinds() {
    try { return JSON.parse(JSON.stringify(keybinds)); } catch { return sanitizeKeybinds(keybinds); }
}

export function setKeybinds(next, { persist = true, clearState = false } = {}) {
    keybinds = sanitizeKeybinds(next);
    if (persist) saveKeybinds(keybinds);
    if (clearState) clearAllInputState();
    publishBindings();
    recalcActions();
}

/**
 * Hands the player's live keys to the shared bindings table.
 *
 * Pushed from here rather than pulled from there, so bindings.js stays a table
 * — anything that reads it, the dialogue included, would otherwise load the
 * whole keyboard layer and touch localStorage just to ask what button does what.
 */
function publishBindings() {
    setBindings('keyboard', keybinds);
}

// tenta puxar do configUI.js (sem depender de nomes fixos de export)
async function bootstrapKeybindsFromConfigUI() {
    // 1) window (se configUI expõe algo global)
    try {
        const w = window;
        const fromWindow =
            extractKeybindsFromConfig(w?.FarmXPConfig) ||
            extractKeybindsFromConfig(w?.gameConfig) ||
            extractKeybindsFromConfig(w?.config) ||
            extractKeybindsFromConfig(w?.settings);

        if (fromWindow) {
            setKeybinds(fromWindow, { persist: true });
            return;
        }
    } catch {}

    // 2) módulo configUI (caminho: ../configUI.js)
    try {
        const mod = await import(CONFIG_UI_MODULE_PATH);

        // tenta achar binds em exports comuns (sem exigir que exista)
        const fromExports =
            (typeof mod.getKeybinds === "function" ? mod.getKeybinds() : null) ||
            (typeof mod.getControlsKeybinds === "function" ? mod.getControlsKeybinds() : null) ||
            (typeof mod.getConfig === "function" ? mod.getConfig() : null) ||
            mod.keybinds ||
            mod.controls ||
            mod.config ||
            mod.settings ||
            mod.default;

        const extracted = extractKeybindsFromConfig(fromExports) || (fromExports && typeof fromExports === "object" ? fromExports : null);
        if (extracted) {
            setKeybinds(extracted, { persist: true });
            return;
        }
    } catch {
        // ignore: não quebra o jogo se configUI não estiver pronto ainda
    }

    // 3) fallback: tenta ler de uma storage “geral” (se existir)
    const fromOtherStorage = tryReadKeybindsFromOtherStorage();
    if (fromOtherStorage) setKeybinds(fromOtherStorage, { persist: true });
}

// deixa acessível pra debug/ponte rápida (sem poluir muito)
window.FarmXPControls = window.FarmXPControls || {};
window.FarmXPControls.getKeybinds = getKeybinds;
window.FarmXPControls.setKeybinds = setKeybinds;


let keybinds = loadKeybinds();
publishBindings();   // the shared table starts out matching what was loaded

// pressed state por CODE (KeyW, ArrowLeft, Space, etc)
const pressed = Object.create(null);

// estado final por ação (já considerando joystick também)
const actions = {
    moveUp: false,
    moveDown: false,
    moveLeft: false,
    moveRight: false,
    interact: false,
    inventory: false,
    merchants: false,
    config: false,
};

// estado de movimento vindo do joystick (pra não quebrar mobile)
const joystickActions = { moveUp: false, moveDown: false, moveLeft: false, moveRight: false };

// #264: estado vindo do controle. Mesma ideia do joystick, mas cobre todas as
// ações, não só movimento — um gamepad tem botão pra interagir, inventário etc.
const gamepadActions = Object.create(null);

/**
 * Feeds gamepad state into the same action layer the keyboard and the mobile
 * joystick use, so everything downstream — movement, interaction, the legacy
 * `keys` object — works without knowing a controller exists.
 *
 * @param {Object} next - action name -> boolean; omitted actions are cleared
 */
export function setGamepadActions(next) {
    for (const action of Object.keys(actions)) {
        gamepadActions[action] = !!next?.[action];
    }
    // Keep the legacy `keys` object in step, the way the joystick does.
    keys.ArrowLeft = keys.KeyA = gamepadActions.moveLeft || pressed.KeyA || pressed.ArrowLeft || false;
    keys.ArrowRight = keys.KeyD = gamepadActions.moveRight || pressed.KeyD || pressed.ArrowRight || false;
    keys.ArrowUp = keys.KeyW = gamepadActions.moveUp || pressed.KeyW || pressed.ArrowUp || false;
    keys.ArrowDown = keys.KeyS = gamepadActions.moveDown || pressed.KeyS || pressed.ArrowDown || false;
    recalcActions();
}

function sanitizeKeybinds(raw) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
    if (!raw || typeof raw !== "object") return merged;

    for (const action of Object.keys(merged)) {
        if (Array.isArray(raw[action]) && raw[action].length) {
            merged[action] = raw[action]
                .slice(0, 2)
                .map(String)
                .filter(Boolean);
        }
    }
    return merged;
}

function loadKeybinds() {
    // prioridade 1: storage dedicada dos controles
    try {
        const raw = localStorage.getItem(CONTROLS_STORAGE_KEY);
        if (raw) return sanitizeKeybinds(JSON.parse(raw));
    } catch {}

    // prioridade 2: algum storage “geral” 
    const fromOther = tryReadKeybindsFromOtherStorage();
    if (fromOther) return sanitizeKeybinds(fromOther);

    // fallback
    return sanitizeKeybinds(null);
}


function saveKeybinds(next) {
    try {
        localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
}

function getEventCode(e) {
    return e.code || e.key; // prefer e.code
}

function isActionKeyEvent(e, action) {
    const code = getEventCode(e);
    return (keybinds[action] || []).includes(code);
}

function recalcActions() {
    for (const action of Object.keys(actions)) {
        const binds = keybinds[action] || [];
        let down = false;
        for (const code of binds) {
            if (pressed[code]) { down = true; break; }
        }

        // OR com joystick apenas para movimento
        if (action in joystickActions) {
            down = down || joystickActions[action];
        }

        // #264: o controle cobre todas as ações, não só movimento.
        if (gamepadActions[action]) {
            down = true;
        }

        actions[action] = down;
    }
}

function clearAllInputState() {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(pressed)) pressed[k] = false;
    for (const k of Object.keys(actions)) actions[k] = false;
    joystickActions.moveUp = joystickActions.moveDown = joystickActions.moveLeft = joystickActions.moveRight = false;
    for (const k of Object.keys(gamepadActions)) gamepadActions[k] = false;
}

function setPressedFromEvent(e, isDown) {
    const code = getEventCode(e);
    if (!code) return;

    pressed[code] = isDown;

    // compat: manter teu objeto keys atualizado pros codes que ele já conhece
    if (code in keys) keys[code] = isDown;
    if (e.key in keys) keys[e.key] = isDown;

    recalcActions();
}

// Used by control.js, which owns the listeners and the world interaction.
export {
    pressed, actions, joystickActions,
    recalcActions, clearAllInputState, setPressedFromEvent,
    getEventCode, isActionKeyEvent, bootstrapKeybindsFromConfigUI,
    extractKeybindsFromConfig,
};
