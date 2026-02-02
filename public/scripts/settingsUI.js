/**
 * @file settingsUI.js - Settings UI Management
 * @description Handles the settings interface including language selection
 */

import { i18n, t } from './i18n/i18n.js';
import { logger } from './logger.js';

/**
 * Initialize settings UI components
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

    const success = await i18n.setLanguage(newLang);

    if (!success) {
      logger.error(`❌ Failed to load language: ${newLang}`);
      alert(t('messages.languageChangeFailed'));
      // Revert to current language
      languageSelect.value = i18n.getCurrentLanguage();
    } else {
      logger.info(`✅ Language changed successfully to: ${newLang}`);
      // Update all elements with data-i18n attributes
      translateDOM();
    }
  });

  // Update DOM on language change (from other sources)
  document.addEventListener('languageChanged', (e) => {
    const { language } = e.detail;
    languageSelect.value = language;
    translateDOM();
  });

  logger.info('✅ Settings UI initialized');
}

/**
 * Translate all DOM elements with data-i18n attributes
 */
export function translateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');

    // Preserve emoji if present
    const emoji = el.textContent.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u)?.[0] || '';
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
