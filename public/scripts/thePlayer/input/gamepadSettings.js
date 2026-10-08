/**
 * @file gamepadSettings.js - Player-tunable gamepad preferences (#264).
 *
 * Same shape as qualityMode/displayMode: one storage key, read through a getter,
 * written through `set()`, and an event so anything listening re-reads.
 *
 * Why each of these is adjustable rather than a constant I picked:
 *   - aim speed is split per axis because the screen is wider than it is tall,
 *     and a vertical speed that feels right horizontally feels twitchy
 *   - dead zone, because a worn stick drifts and only the player knows theirs
 *   - invert Y, because it is a preference with no right answer
 *   - acceleration, because without it the aim is either too slow to cross the
 *     screen or too fast to land on an animal
 *   - cursor size, for large screens and for players who need a bigger target
 */
const STORAGE_KEY = 'farmxp.gamepad';

/** name -> { min, max, default }. Percent values are stored as fractions. */
export const RANGES = {
    cursorScale: { min: 0.5, max: 2, default: 1 },
    aimSpeedX: { min: 0.25, max: 3, default: 1 },
    aimSpeedY: { min: 0.25, max: 3, default: 1 },
    deadZone: { min: 0.1, max: 0.5, default: 0.35 },
};

/** Switches, as opposed to the sliders above. */
export const TOGGLES = {
    invertY: false,
    acceleration: true,
};

/**
 * The controller settings, in the order a screen should show them.
 *
 * Data, not markup: the game has two settings screens — the gear in-game and
 * the one on the main menu — and they are written in different vocabularies,
 * so sharing a widget builder would mean one function emitting two kinds of
 * markup. What actually drifts is *which settings exist*, and the gamepad
 * section proved it: it was added to the in-game screen and nobody noticed for
 * the whole feature that the main menu had none of it.
 *
 * Both screens walk this list and draw it their own way. A new setting is one
 * entry here, and neither screen can be the one that forgot.
 *
 * `hint` names a second i18n key, used where a value needs explaining; a
 * screen with nowhere to put it may leave it out.
 */
export const SETTINGS_FIELDS = Object.freeze([
    { key: 'cursorScale', kind: 'slider', i18n: 'settings.gamepad.cursorScale', fallback: 'Tamanho da mira' },
    { key: 'aimSpeedX', kind: 'slider', i18n: 'settings.gamepad.aimSpeedX', fallback: 'Velocidade da mira (horizontal)' },
    { key: 'aimSpeedY', kind: 'slider', i18n: 'settings.gamepad.aimSpeedY', fallback: 'Velocidade da mira (vertical)' },
    {
        key: 'deadZone', kind: 'slider', i18n: 'settings.gamepad.deadZone', fallback: 'Zona morta',
        hint: 'settings.gamepad.deadZoneHint', hintFallback: 'Aumente se a mira se mexer sozinha.',
    },
    { key: 'invertY', kind: 'toggle', i18n: 'settings.gamepad.invertY', fallback: 'Inverter eixo Y' },
    {
        key: 'acceleration', kind: 'toggle', i18n: 'settings.gamepad.acceleration', fallback: 'Aceleração da mira',
        hint: 'settings.gamepad.accelerationHint',
        hintFallback: 'Empurrar devagar mira com precisão; empurrar forte atravessa a tela.',
    },
]);

export const DEFAULTS = Object.freeze({
    ...Object.fromEntries(Object.entries(RANGES).map(([k, r]) => [k, r.default])),
    ...TOGGLES,
});

const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));

/**
 * Coerces anything (old saves, hand-edited storage) into a usable settings
 * object. Out-of-range numbers are clamped rather than rejected: a value that
 * was once valid should not lock the player out of their own controls.
 */
export function normalize(raw) {
    const out = { ...DEFAULTS };
    if (!raw || typeof raw !== 'object') return out;
    for (const [key, range] of Object.entries(RANGES)) {
        const value = Number(raw[key]);
        if (Number.isFinite(value)) out[key] = clamp(value, range);
    }
    for (const key of Object.keys(TOGGLES)) {
        if (typeof raw[key] === 'boolean') out[key] = raw[key];
    }
    return out;
}

let cached = null;

export const gamepadSettings = {
    get current() {
        if (cached) return cached;
        try {
            cached = normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)));
        } catch {
            cached = { ...DEFAULTS };
        }
        return cached;
    },

    /** @param {Partial<typeof DEFAULTS>} patch */
    set(patch) {
        cached = normalize({ ...this.current, ...patch });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cached)); } catch {}
        document.dispatchEvent(new CustomEvent('gamepad:settingschanged', { detail: { ...cached } }));
        return cached;
    },

    reset() {
        return this.set({ ...DEFAULTS });
    },

    /** Drops the memo so the next read comes from storage (tests, remote edits). */
    _clearCache() {
        cached = null;
    },
};

export default gamepadSettings;
