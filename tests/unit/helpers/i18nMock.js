/**
 * @file i18nMock.js - A complete stand-in for i18n.js.
 *
 * `mock.module` replaces a module for the whole test run, not just the file
 * that asked, and the files run in alphabetical order. So a stub holding only
 * `t` is not a local shortcut: every later file importing one of the other
 * exports gets a module without it, and the import throws before a single test
 * in that file runs. It reports as one unnamed failure, which says nothing
 * about the cause.
 *
 * That happened twice during #264 — the dialogue reads `i18n.t(...)`, and the
 * help panel and settings reach for more — and each time it cost an afternoon
 * to trace back to a stub in an unrelated file.
 *
 * Use this instead of writing a stub by hand:
 *
 *     mock.module('../../public/scripts/i18n/i18n.js', () => i18nModule());
 *
 * A file needing translations of its own passes its own `t`; everything else
 * stays complete:
 *
 *     mock.module('../../public/scripts/i18n/i18n.js', () => i18nModule((key) => {
 *       if (key === 'time.weekdays') return ['Segunda', ...];
 *       return key;
 *     }));
 */

/**
 * @param {(key: string, params?: object) => any} [t] - defaults to echoing the
 *   key, which is what most tests want: it makes a missing translation visible
 *   in an assertion instead of silently becoming an empty string.
 * @param {string} [language]
 */
export function i18nModule(t = (key) => key, language = 'pt-BR') {
    const i18n = {
        t,
        currentLanguage: language,
        init: () => {},
        setLanguage: () => {},
        getCurrentLanguage: () => language,
        getStoredLanguage: () => language,
        detectBrowserLanguage: () => language,
        getAvailableLanguages: () => ['pt-BR', 'en', 'es'],
        getNestedValue: (obj, path) =>
            String(path).split('.').reduce((acc, key) => acc?.[key], obj),
        interpolate: (text, params = {}) =>
            String(text).replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`),
    };

    return { t, i18n, default: i18n };
}

export default i18nModule;
