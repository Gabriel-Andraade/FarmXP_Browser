/**
 * @file settingsUI.js - Settings UI Management
 * @description Handles the settings interface including language selection
 */

import { i18n, t } from './i18n/i18n.js';
import { logger } from './logger.js';

/**
 * Initialize settings UI components and language selector
 * Sets up event listeners for language changes and updates DOM translations
 * Attempts to initialize when DOM is ready
 * @returns {void}
 * @throws {void} Logs warning if language selector not found
 * @example
 * // Auto-initializes when DOM is ready
 * // Creates language selector listener and translates all DOM elements
 */
export function initSettingsUI() {
  const languageSelect = document.getElementById('languageSelect');

  if (!languageSelect) {
    logger.warn('⚠️ Language selector not found in DOM');
    return;
  }

  // Set current language in selector
  languageSelect.value = i18n.getCurrentLanguage();

  // Handle language change
  languageSelect.addEventListener('change', async (e) => {
    const newLang = e.target.value;
    logger.info(`🌍 Changing language to: ${newLang}`);

    const success = i18n.setLanguage(newLang);

    if (!success) {
      logger.error(`❌ Failed to load language: ${newLang}`);
      alert(t('messages.languageChangeFailed'));
      // Revert to current language
      languageSelect.value = i18n.getCurrentLanguage();
    } else {
      logger.info(`✅ Language changed successfully to: ${newLang}`);
      // Update HTML lang attribute for accessibility
      document.documentElement.lang = newLang;
      // Update all elements with data-i18n attributes
      translateDOM();
    }
  });

  // Update DOM on language change (from other sources)
  document.addEventListener('languageChanged', (e) => {
    const { language } = e.detail;
    languageSelect.value = language;
    document.documentElement.lang = language;
    translateDOM();
  });

  logger.info('✅ Settings UI initialized');
}

/**
 * Translate all DOM elements with data-i18n attributes to current language
 * Preserves emoji/icons if present at the beginning of element text
 * Queries all elements with data-i18n attribute and updates their textContent
 * @returns {void}
 * @example
 * // HTML: <button data-i18n="ui.close">Close</button>
 * // Result: <button>Fechar</button> (if language is Portuguese)
 * 
 * // Emoji preservation example:
 * // HTML: <div data-i18n="ui.merchants">🏪 Regional Merchants</div>
 * // Result: <div>🏪 Mercadores da Região</div>
 */
export function translateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');

    // Preserve emoji if present
    // Match leading emoji (broader pattern including ZWJ sequences)
    const emoji = el.textContent.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+/u)?.[0] || '';
    const translation = t(key);

    if (emoji) {
      el.textContent = `${emoji} ${translation}`;
    } else {
      el.textContent = translation;
    }
  });
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsUI);
  } else {
    // DOM already loaded
    initSettingsUI();
  }
}

export default { initSettingsUI, translateDOM };
