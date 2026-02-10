/**
 * @file accessibility.js - Accessibility Utilities
 * @description Provides keyboard navigation, screen reader support,
 * and visual accessibility features for FarmingXP.
 *
 * NOTE:
 * - This module is intentionally "UI-facing": it owns persistent a11y/display preferences
 *   and applies them as DOM effects (classes, inline styles, filters).
 * - Game-side systems can listen to the dispatched events to apply deeper changes
 *   (e.g. true camera zoom or canvas daltonization inside the render loop).
 *
 * Events:
 * - a11ySettingsChanged  -> { key, value, settings }
 * - gameZoomChanged      -> { zoom }
 * - colorVisionChanged   -> { mode }
 *
 * @module Accessibility
 */

import { registerSystem } from './gameState.js';
import { logger } from './logger.js';

const STORAGE_KEY = 'farmxp_a11y';

/**
 * Default settings.
 * - Keep legacy keys (textSize) for compatibility with existing UI.
 * - Add new keys requested in issue #16: uiScale, gameZoom, colorVisionMode.
 */
const DEFAULTS = {
  // Visual a11y
  highContrast: false,
  reducedMotion: false,

  // Legacy text size (kept for backward compatibility)
  // Values: 'normal' | 'large' | 'extra-large'
  textSize: 'normal',

  // New (preferred) UI scale (numeric multiplier)
  // When uiScale !== 1, it overrides textSize so you don't "double scale"
  uiScale: 1,

  // Game zoom (numeric multiplier)
  // Default: 1 (no CSS zoom). For true camera zoom, listen to `gameZoomChanged`.
  gameZoom: 1,

  // Color vision (daltonism) mode
  // Values: 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
  colorVisionMode: 'off',

  // Screen reader support
  screenReaderAnnouncements: true
};

class AccessibilityManager {
  constructor() {
    this.settings = { ...DEFAULTS };
    this._announcer = null;
    this._previousFocus = null;
    this._trapHandlers = new WeakMap();
    this._injectedStyleEl = null;
    this._cvdSvgEl = null;
  }

  /**
   * Initialize all accessibility features.
   * Should be called once after DOM is ready.
   */
  init() {
    this._loadSettings();

    // Inject minimal CSS needed for new settings (uiScale/gameZoom/cvd)
    this._ensureInjectedStyles();
    this._ensureColorVisionSvgFilters();

    this._applyAllSettings({ emitEvents: false });
    this._setupKeyboardDetection();
    this._createSkipLink();
    this._createAnnouncer();
    this._setCanvasAria();

    registerSystem('accessibility', this);
    logger.debug('AccessibilityManager initialized');
  }

  // ── Settings ──────────────────────────────────────────

  /**
   * Get a setting value
   * @param {string} key
   * @returns {*}
   */
  getSetting(key) {
    return this.settings[key];
  }

  /**
   * Get a shallow copy of all settings
   */
  getAllSettings() {
    return { ...this.settings };
  }

  /**
   * Update a setting, apply it, and persist (default).
   * @param {string} key
   * @param {*} value
   * @param {{persist?: boolean}} [options]
   */
  setSetting(key, value, options = {}) {
    if (!(key in DEFAULTS)) return;

    const { persist = true } = options;

    this.settings[key] = value;
    this._applySetting(key, value);

    if (persist) this._saveSettings();

    // Emit a generic change event for game systems that want to react
    document.dispatchEvent(new CustomEvent('a11ySettingsChanged', {
      detail: { key, value, settings: this.getAllSettings() }
    }));
  }

  /**
   * Set many settings at once (optionally persist once).
   * @param {Partial<typeof DEFAULTS>} patch
   * @param {{persist?: boolean}} [options]
   */
  setMany(patch, options = {}) {
    const { persist = true } = options;

    let changedAny = false;
    for (const [key, value] of Object.entries(patch || {})) {
      if (!(key in DEFAULTS)) continue;
      this.settings[key] = value;
      this._applySetting(key, value);
      changedAny = true;
    }

    if (changedAny) {
      if (persist) this._saveSettings();
      document.dispatchEvent(new CustomEvent('a11ySettingsChanged', {
        detail: { key: '*', value: null, settings: this.getAllSettings() }
      }));
    }
  }

  /**
   * Reset settings to defaults.
   */
  reset() {
    this.settings = { ...DEFAULTS };
    this._applyAllSettings();
    this._saveSettings();
    document.dispatchEvent(new CustomEvent('a11ySettingsChanged', {
      detail: { key: '*', value: null, settings: this.getAllSettings() }
    }));
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        for (const key of Object.keys(DEFAULTS)) {
          if (saved[key] !== undefined) this.settings[key] = saved[key];
        }
      }
    } catch {
      logger.warn('Failed to load a11y settings from localStorage');
    }
  }

  _saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      logger.warn('Failed to save a11y settings to localStorage');
    }
  }

  _applyAllSettings({ emitEvents = true } = {}) {
    for (const [key, value] of Object.entries(this.settings)) {
      this._applySetting(key, value, { emitEvents });
    }
  }

  _applySetting(key, value, { emitEvents = true } = {}) {
    switch (key) {
      case 'highContrast':
        document.body.classList.toggle('high-contrast', !!value);
        break;

      case 'reducedMotion':
        document.body.classList.toggle('reduced-motion', !!value);
        break;

      case 'textSize': {
        // If uiScale is active, ignore legacy textSize to avoid double scaling
        const uiScale = Number(this.settings.uiScale || 1);
        if (uiScale !== 1) return;

        document.documentElement.classList.remove('text-large', 'text-extra-large');
        if (value === 'large') {
          document.documentElement.classList.add('text-large');
        } else if (value === 'extra-large') {
          document.documentElement.classList.add('text-extra-large');
        }
        break;
      }

      case 'uiScale': {
        const scale = Number(value || 1);

        // When uiScale is active, disable legacy textSize classes
        if (scale !== 1) {
          document.documentElement.classList.remove('text-large', 'text-extra-large');
        } else {
          // If uiScale returns to 1, re-apply legacy textSize
          this._applySetting('textSize', this.settings.textSize);
        }

        // Inline font-size scaling for entire UI
        if (scale && scale !== 1) {
          document.documentElement.style.fontSize = `${16 * scale}px`;
        } else {
          document.documentElement.style.fontSize = '';
        }
        break;
      }

      case 'gameZoom': {
        const zoom = Number(value || 1);
        this._applyCssGameZoom(zoom);

        if (emitEvents) {
          document.dispatchEvent(new CustomEvent('gameZoomChanged', { detail: { zoom } }));
        }
        break;
      }

      case 'colorVisionMode': {
        const mode = String(value || 'off');
        this._applyColorVisionFilter(mode);

        if (emitEvents) {
          document.dispatchEvent(new CustomEvent('colorVisionChanged', { detail: { mode } }));
        }
        break;
      }

      case 'screenReaderAnnouncements':
        // No DOM side-effect; checked at announce() time
        break;
    }
  }

  // ── Keyboard vs Mouse detection ──────────────────────

  _setupKeyboardDetection() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') document.body.classList.add('using-keyboard');
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('using-keyboard');
    });
  }

  // ── Skip link ────────────────────────────────────────

  _createSkipLink() {
    if (document.querySelector('.skip-link')) return;
    const link = document.createElement('a');
    link.href = '#gameCanvas';
    link.className = 'skip-link';
    link.textContent = 'Skip to game';
    document.body.insertBefore(link, document.body.firstChild);
  }

  // ── ARIA announcer ───────────────────────────────────

  _createAnnouncer() {
    if (document.getElementById('aria-announcer')) return;
    const el = document.createElement('div');
    el.id = 'aria-announcer';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    document.body.appendChild(el);
    this._announcer = el;
  }

  /**
   * Announce a message to screen readers
   * @param {string} message
   * @param {'polite'|'assertive'} priority
   */
  announce(message, priority = 'polite') {
    if (!this.settings.screenReaderAnnouncements) return;
    const el = this._announcer || document.getElementById('aria-announcer');
    if (!el) return;

    el.setAttribute('aria-live', priority);
    el.textContent = '';
    setTimeout(() => { el.textContent = message; }, 100);
  }

  // ── Canvas ARIA ──────────────────────────────────────

  _setCanvasAria() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    if (!canvas.getAttribute('aria-label')) {
      canvas.setAttribute('aria-label', 'Farm game view');
    }
    if (!canvas.getAttribute('role')) {
      canvas.setAttribute('role', 'img');
    }
  }

  // ── Focus trap for modals ────────────────────────────

  /**
   * Trap focus inside a container (call when modal opens)
   * @param {HTMLElement} container
   */
  trapFocus(container) {
    this._previousFocus = document.activeElement;

    const handler = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handler);
    this._trapHandlers.set(container, handler);

    const firstFocusable = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }

  /**
   * Release focus trap and return focus to previous element
   * @param {HTMLElement} container
   */
  releaseFocus(container) {
    const handler = this._trapHandlers.get(container);
    if (handler) {
      container.removeEventListener('keydown', handler);
      this._trapHandlers.delete(container);
    }
    if (this._previousFocus?.isConnected) {
      this._previousFocus.focus();
    }
    this._previousFocus = null;
  }

  // ── New: injected styles for zoom + CVD ───────────────

  _ensureInjectedStyles() {
    if (document.getElementById('a11y-inline-style')) return;

    const style = document.createElement('style');
    style.id = 'a11y-inline-style';
    style.textContent = `
      /* Injected by scripts/accessibility.js */
      #gameCanvas {
        transform-origin: 0 0;
      }
    `;
    document.head.appendChild(style);
    this._injectedStyleEl = style;
  }

  _applyCssGameZoom(zoom) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    if (z === 1) {
      canvas.style.transform = '';
    } else {
      canvas.style.transform = `scale(${z})`;
    }
  }

  // ── New: Color vision (daltonism) filter ─────────────

  _ensureColorVisionSvgFilters() {
    // SVG filters are a lightweight fallback; true accessibility usually needs palette support.
    // But this at least gives the user a way to "shift" colors globally without rewriting art.
    if (document.getElementById('cvd-filters')) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'cvd-filters');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';
    svg.style.overflow = 'hidden';

    svg.innerHTML = `
      <filter id="cvd-protanopia">
        <feColorMatrix type="matrix" values="
          0.567 0.433 0 0 0
          0.558 0.442 0 0 0
          0     0.242 0.758 0 0
          0     0     0     1 0" />
      </filter>

      <filter id="cvd-deuteranopia">
        <feColorMatrix type="matrix" values="
          0.625 0.375 0 0 0
          0.700 0.300 0 0 0
          0     0.300 0.700 0 0
          0     0     0     1 0" />
      </filter>

      <filter id="cvd-tritanopia">
        <feColorMatrix type="matrix" values="
          0.950 0.050 0 0 0
          0     0.433 0.567 0 0
          0     0.475 0.525 0 0
          0     0     0     1 0" />
      </filter>

      <filter id="cvd-achromatopsia">
        <feColorMatrix type="matrix" values="
          0.2126 0.7152 0.0722 0 0
          0.2126 0.7152 0.0722 0 0
          0.2126 0.7152 0.0722 0 0
          0      0      0      1 0" />
      </filter>
    `;

    document.body.appendChild(svg);
    this._cvdSvgEl = svg;
  }

  _applyColorVisionFilter(mode) {
    const canvas = document.getElementById('gameCanvas');

    // Prefer applying on canvas only (avoid distorting menus/HUD text)
    const target = canvas || null;

    if (!target) return;

    // Clear previous
    target.style.filter = '';

    // Store mode on <html> for CSS-based approaches (optional)
    document.documentElement.dataset.colorVision = mode;

    const normalized = (mode || 'off').toLowerCase();

    if (normalized === 'off' || normalized === 'none') {
      target.style.filter = '';
      return;
    }

    const filterId = {
      protanopia: 'cvd-protanopia',
      deuteranopia: 'cvd-deuteranopia',
      tritanopia: 'cvd-tritanopia',
      achromatopsia: 'cvd-achromatopsia'
    }[normalized];

    if (filterId) {
      // SVG filter reference (works in most modern browsers)
      target.style.filter = `url(#${filterId})`;
      return;
    }

    // Fallback: a generic "assist" filter
    target.style.filter = 'contrast(1.15) saturate(1.35)';
  }
}

export const a11y = new AccessibilityManager();

/**
 * Shorthand for announcing a message to screen readers.
 * @param {string} message
 * @param {'polite'|'assertive'} priority
 */
export function announce(message, priority = 'polite') {
  a11y.announce(message, priority);
}

export default a11y;