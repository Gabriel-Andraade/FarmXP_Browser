/**
 * @file minimapUI.js - Minimap UI management
 * @description Creates and manages the minimap HTML structure, visibility toggle,
 * and keyboard shortcut (M key).
 * @module MinimapUI
 */

import { logger } from '../logger.js';
import { registerSystem } from '../gameState.js';
import { t } from '../i18n/i18n.js';

const MINIMAP_WIDTH = 372;
const MINIMAP_HEIGHT = 309;

export class MinimapUI {
  constructor(containerSelector = '.game') {
    this.container = document.querySelector(containerSelector);

    if (!this.container) {
      throw new Error(`MinimapUI: Container "${containerSelector}" not found`);
    }

    this.width = MINIMAP_WIDTH;
    this.height = MINIMAP_HEIGHT;
    this.isVisible = true;
    this.canvas = null;
    this._boundKeyHandler = null;
    this._boundLangHandler = null;

    this._createStructure();
    this._setupKeyboard();
    this._setupLanguageListener();

    registerSystem('minimap-ui', this);
    logger.debug('MinimapUI initialized');
  }

  /** Build the minimap DOM elements */
  _createStructure() {
    const wrapper = document.createElement('div');
    wrapper.id = 'minimap-container';
    wrapper.className = 'minimap-container';

    const frame = document.createElement('div');
    frame.className = 'minimap-frame';

    const canvas = document.createElement('canvas');
    canvas.id = 'minimap-canvas';
    canvas.className = 'minimap-canvas';
    canvas.width = this.width;
    canvas.height = this.height;

    // Toggle button (map icon)
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'minimap-toggle';
    toggleBtn.className = 'minimap-toggle';
    toggleBtn.title = t('ui.minimapToggle');
    toggleBtn.innerHTML = '<i class="fas fa-map"></i>';
    toggleBtn.addEventListener('click', () => this.toggle());

    frame.appendChild(canvas);
    wrapper.appendChild(toggleBtn);
    wrapper.appendChild(frame);
    this.container.appendChild(wrapper);

    this.canvas = canvas;
    this._wrapper = wrapper;
  }

  /** Update translatable texts when language changes */
  _setupLanguageListener() {
    this._boundLangHandler = () => {
      const btn = this._wrapper?.querySelector('#minimap-toggle');
      if (btn) btn.title = t('ui.minimapToggle');
    };
    document.addEventListener('languageChanged', this._boundLangHandler);
  }

  /** Listen for M key to toggle */
  _setupKeyboard() {
    this._boundKeyHandler = (e) => {
      if (e.key === 'm' || e.key === 'M') {
        // Don't toggle if user is typing in an input
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        this.toggle();
      }
    };
    document.addEventListener('keydown', this._boundKeyHandler);
  }

  /** @returns {HTMLCanvasElement} */
  getCanvas() {
    return this.canvas;
  }

  /** Toggle minimap open/closed */
  toggle() {
    this.isVisible = !this.isVisible;
    const frame = this._wrapper?.querySelector('.minimap-frame');
    if (frame) {
      frame.style.display = this.isVisible ? '' : 'none';
    }
  }

  /** Set minimap visibility */
  setVisibility(visible) {
    this.isVisible = visible;
    const frame = this._wrapper?.querySelector('.minimap-frame');
    if (frame) {
      frame.style.display = visible ? '' : 'none';
    }
  }

  /** Remove event listeners and DOM elements */
  destroy() {
    if (this._boundKeyHandler) {
      document.removeEventListener('keydown', this._boundKeyHandler);
    }
    if (this._boundLangHandler) {
      document.removeEventListener('languageChanged', this._boundLangHandler);
    }
    this._wrapper?.remove();
  }
}
