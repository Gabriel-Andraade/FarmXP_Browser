/**
 * @file saveMessages.js - Turns save import results into player-facing text.
 *
 * Shared by the two places that import saves: the in-game slots modal
 * (`saveSlotsUI.js`) and the main menu (`mainMenu/mainMenu.js`). Keeping the
 * mapping here is what stops the two from drifting apart — a new reason gets a
 * message in both at once.
 */
import { t } from './i18n/i18n.js';

/** `reason` from a failed importData() → i18n key. */
const IMPORT_ERROR_KEYS = {
    invalid_json: 'saveSlots.importInvalidJson',
    not_a_save: 'saveSlots.importNotASave',
    checksum_mismatch: 'saveSlots.importChecksumMismatch',
    bad_shape: 'saveSlots.importBadShape',
    newer_version: 'saveSlots.importNewerVersion',
    write_failed: 'saveSlots.importWriteFailed',
};

/**
 * Message for a failed import. An unmapped reason still says something useful
 * and carries the raw reason, so a new one is visible instead of silent.
 * @param {string} [reason]
 * @returns {string}
 */
export function importErrorMessage(reason) {
    const key = IMPORT_ERROR_KEYS[reason];
    if (key) return t(key);
    return `${t('saveSlots.importError')}${reason ? ` (${reason})` : ''}`;
}

/**
 * Message for a successful import. `warning` is set when the file carried no
 * checksum, or one this runtime cannot recompute: it went in, but it was never
 * verified, and the player should know that.
 * @param {string} [warning]
 * @returns {string}
 */
export function importSuccessMessage(warning) {
    return t(warning ? 'saveSlots.importSuccessUnverified' : 'saveSlots.importSuccess');
}
