/**
 * @file cssManager.js - CSS Stylesheet Loading Manager
 * @description Manages dynamic loading of CSS stylesheets for the game.
 * Provides sequential loading with versioning support for cache busting.
 * Stylesheets are loaded from the style/ folder in a specific order.
 *
 * @module CSSManager
 * @author FarmXP Team
 *
 * @example
 * // Load all stylesheets on game initialization
 * import { cssManager } from './cssManager.js';
 * await cssManager.loadAll();
 *
 * @example
 * // Load a single stylesheet
 * await cssManager.loadOne('custom.css');
 */

import { logger } from './logger.js';

/**
 * CSS stylesheet loading manager object
 * @type {Object}
 * @property {string} basePath - Base path for CSS files
 * @property {string} version - Version string for cache busting
 * @property {string[]} files - List of CSS files to load
 */
export const cssManager = {
  /**
   * Base path where CSS files are located
   * @type {string}
   */
  basePath: "./style/",

  /**
   * Version string appended to CSS URLs for cache busting
   * @type {string}
   */
  version: "1.0.0",

  /**
   * List of CSS files to load in order
   * Files are loaded sequentially to ensure proper cascade
   * @type {string[]}
   */
  files: [
    "base.css",           // Base styles and resets
    "modals.css",         // Modal/dialog styles
    //"hud.css",          // HUD styles (disabled)
    "player-panel.css",   // Player panel UI
    "game.css",           // Main game styles
    "character-select.css", // Character selection screen
    "house.css",          // House/building interior styles
    "commerce.css",       // Trading/merchant UI styles
    "config.css",         // Configuration modal styles
  ],

  /**
   * Loads a single CSS file dynamically by creating a link element
   * Appends version query parameter for cache busting
   *
   * @param {string} file - The CSS filename to load
   * @returns {Promise<string>} Resolves with filename on success
   * @throws {Error} Rejects with error message on load failure
   *
   * @example
   * await cssManager.loadOne('custom.css');
   */
  loadOne(file) {
    return new Promise((resolve, reject) => {
      // Create link element for stylesheet
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = `${this.basePath}${file}?v=${this.version}`;

      // Handle load success/failure
      link.onload = () => resolve(file);
      link.onerror = () => reject(new Error(`Falha ao carregar: ${file}`));

      // Append to document head to begin loading
      document.head.appendChild(link);
    });
  },

  /**
   * Loads all CSS files in the files array sequentially
   * Files are loaded in order to ensure proper CSS cascade
   *
   * @returns {Promise<void>} Resolves when all files are loaded
   * @throws {Error} Throws if any file fails to load
   *
   * @example
   * // In game initialization
   * try {
   *   await cssManager.loadAll();
   *   console.log('All styles loaded');
   * } catch (err) {
   *   console.error('Failed to load styles:', err);
   * }
   */
  async loadAll() {
    for (const file of this.files) {
      await this.loadOne(file);
    }
  },
};
