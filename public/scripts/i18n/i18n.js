/**
 * @file i18n.js - Internationalization System
 * @description Handles multi-language support for FarmingXP game.
 * @module I18n
 */

import ptBR from './pt-BR.js';
import en from './en.js';
import es from './es.js';

const STORAGE_KEY = 'farmxp_language';
const DEFAULT_LANGUAGE = 'pt-BR';

// Pre-loaded translations (no dynamic import needed)
const AVAILABLE_TRANSLATIONS = {
  'pt-BR': ptBR,
  'en': en,
  'es': es
};

class I18nManager {
  /**
   * Initialize I18nManager singleton instance
   * Sets default language to Portuguese (Brazil)
   * Loads all available translations into memory
   * @constructor
   */
  constructor() {
    this.currentLanguage = DEFAULT_LANGUAGE;
    this.translations = { ...AVAILABLE_TRANSLATIONS };
    this.fallbackLanguage = 'en';
  }

  /**
   * Initialize i18n system
   * @param {string} [preferredLanguage] - Language to use
   */
  init(preferredLanguage) {
    // Determine language priority: parameter > localStorage > browser > default
    const detectedLang =
      preferredLanguage ||
      this.getStoredLanguage() ||
      this.detectBrowserLanguage() ||
      DEFAULT_LANGUAGE;

    // Validate that we have this language
    if (this.translations[detectedLang]) {
      this.currentLanguage = detectedLang;
    } else {
      console.log(`Language "${detectedLang}" not available, using default: ${DEFAULT_LANGUAGE}`);
      this.currentLanguage = DEFAULT_LANGUAGE;
    }

    console.log(`Language set to: ${this.currentLanguage}`);
    return true;
  }

  /**
   * Get stored language from localStorage
   * Safely retrieves language preference from browser storage
   * Returns null if localStorage is unavailable or empty
   * @returns {string|null} Stored language code (e.g., 'pt-BR', 'en', 'es') or null
   * @example
   * const lang = i18n.getStoredLanguage(); // 'pt-BR' or null
   */
  getStoredLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  /**
   * Detect browser's preferred language from navigator settings
   * Maps browser language codes to supported game languages
   * Returns null if browser language is not supported
   * @returns {string|null} Detected language code ('pt-BR', 'en', 'es') or null if not supported
   * @example
   * // If browser is Portuguese (Brazil)
   * const lang = i18n.detectBrowserLanguage(); // 'pt-BR'
   * 
   * // If browser is unsupported language
   * const lang = i18n.detectBrowserLanguage(); // null
   */
  detectBrowserLanguage() {
    try {
      const browserLang = navigator.language || navigator.userLanguage;

      // Map browser language codes to our supported languages
      const langMap = {
        'pt': 'pt-BR',
        'pt-BR': 'pt-BR',
        'pt-PT': 'pt-BR',
        'en': 'en',
        'en-US': 'en',
        'en-GB': 'en',
        'es': 'es',
        'es-ES': 'es',
        'es-MX': 'es',
      };

      return langMap[browserLang] || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get translation by key with parameter interpolation
   * @param {string} key - Translation key (dot notation, e.g., 'menu.play')
   * @param {Object} [params] - Parameters for interpolation
   * @returns {string} Translated text
   *
   * @example
   * t('menu.play') // "Jogar"
   * t('player.health', { value: 100 }) // "Saúde: 100"
   * t('time.day', { day: 5 }) // "Dia 5"
   */
  t(key, params = {}) {
    // Try current language
    let text = this.getNestedValue(
      this.translations[this.currentLanguage],
      key
    );

    // Fallback to default language if not found
    if (text === undefined) {
      text = this.getNestedValue(
        this.translations[this.fallbackLanguage],
        key
      );
    }

    // Still not found? Return key
    if (text === undefined) {
      console.warn(`[i18n] Missing translation: ${key}`);
      return key;
    }

    // Interpolate parameters
    return this.interpolate(text, params);
  }

  /**
   * Get nested object value by dot notation path
   * Safely traverses nested objects using dot-separated string keys
   * Returns undefined if path is invalid or key not found
   * @param {Object} obj - Object to search (usually translations object)
   * @param {string} path - Dot notation path (e.g., 'inventory.categories.tools')
   * @returns {*} Value at path or undefined if not found
   * @example
   * const translations = { menu: { play: 'Play' } };
   * i18n.getNestedValue(translations, 'menu.play'); // 'Play'
   * i18n.getNestedValue(translations, 'invalid.path'); // undefined
   */
  getNestedValue(obj, path) {
    if (!obj) return undefined;
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Interpolate variables into translation string
   * Replaces {placeholder} patterns with values from params object
   * Non-string text is returned unchanged
   * @param {string} text - Text template with {placeholders}
   * @param {Object} params - Key-value pairs for substitution
   * @returns {string} Text with interpolated values
   * @example
   * // Simple interpolation
   * i18n.interpolate("Hello {name}", { name: "John" }); // "Hello John"
   * 
   * // Multiple placeholders
   * i18n.interpolate("Day {day} of {month}", { day: 5, month: 'January' }); // "Day 5 of January"
   * 
   * // Missing param keeps placeholder
   * i18n.interpolate("Value: {missing}", { other: 'value' }); // "Value: {missing}"
   */
  interpolate(text, params) {
    if (typeof text !== 'string') return text;
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  /**
   * Change current language and notify listeners
   * @param {string} lang - New language code
   * @returns {boolean}
   */
  setLanguage(lang) {
    if (!this.translations[lang]) {
      console.log(`Language "${lang}" not available`);
      return false;
    }

    this.currentLanguage = lang;

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // localStorage might not be available
    }

    // Dispatch event for UI updates
    document.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: lang }
    }));

    console.log(`Language changed to: ${lang}`);
    return true;
  }

  /**
   * Get available languages in the game
   * Returns array of language code and human-readable names
   * Used to populate language selector in settings
   * @returns {Array<{code: string, name: string}>} Array of supported languages
   * @example
   * const langs = i18n.getAvailableLanguages();
   * // Returns:
   * // [
   * //   { code: 'pt-BR', name: 'Português (Brasil)' },
   * //   { code: 'en', name: 'English' },
   * //   { code: 'es', name: 'Español' }
   * // ]
   */
  getAvailableLanguages() {
    return [
      { code: 'pt-BR', name: 'Português (Brasil)' },
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' }
    ];
  }

  /**
   * Get current active language code
   * Returns the language code currently in use by i18n system
   * @returns {string} Current language code ('pt-BR', 'en', or 'es')
   * @example
   * const currentLang = i18n.getCurrentLanguage(); // 'pt-BR'
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }
}

// Singleton instance
export const i18n = new I18nManager();

// Shorthand function for convenience
export const t = (key, params) => i18n.t(key, params);

export default i18n;
