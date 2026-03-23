/**
 * @file mainMenu.js - Main Menu system
 * @description Full main menu with sub-states (play, settings), keyboard navigation,
 * language flags, and integration with CharacterSelection / SaveSystem.
 * Settings submenu reads/writes the same localStorage keys as the in-game settings,
 * so changes persist and sync automatically.
 * @module MainMenu
 */

import { logger } from '../logger.js';
import { t, i18n } from '../i18n/i18n.js';
import { registerSystem } from '../gameState.js';
import { a11y } from '../accessibility.js';

const MenuState = {
  MAIN: 'main',
  PLAY: 'play',
  SETTINGS: 'settings',
  ACHIEVEMENTS: 'achievements',
  GALLERY: 'gallery',
};

// localStorage keys (same as the in-game systems)
const LS_MUSIC  = 'farmxp_musicVolume';
const LS_AMBIENT = 'farmxp_ambientVolume';
const LS_ANIMAL = 'farmxp_animalVolume';

export class MainMenu {
  constructor() {
    this.container = null;
    this.menuArea = null;
    this.backArea = null;
    this.flagsArea = null;
    this.subtitleEl = null;
    this.currentState = MenuState.MAIN;
    this.selectedIndex = 0;
    this._keyHandler = null;
    this._mainOptions = [];
    this.init();
  }

  init() {
    this._createUI();
    this._bindKeyboard();
    registerSystem('mainMenu', this);
    logger.debug('MainMenu initialized');
  }

  // ───────────────────── UI CREATION ─────────────────────

  _createUI() {
    this.container = document.createElement('div');
    this.container.className = 'mm-overlay';

    const content = document.createElement('div');
    content.className = 'mm-content';

    const title = document.createElement('div');
    title.className = 'mm-title';
    title.textContent = 'FarmingXP';

    this.subtitleEl = document.createElement('div');
    this.subtitleEl.className = 'mm-subtitle';
    this.subtitleEl.textContent = `\u2500 ${t('mainMenu.subtitle')} \u2500`;

    this.menuArea = document.createElement('div');
    this.menuArea.className = 'mm-cards';

    this.backArea = document.createElement('div');
    this.backArea.className = 'mm-back-area';

    this.flagsArea = document.createElement('div');
    this.flagsArea.className = 'mm-flags';
    this._createFlags();

    content.append(title, this.subtitleEl, this.menuArea, this.backArea, this.flagsArea);
    this.container.appendChild(content);
    document.body.appendChild(this.container);

    this._renderMain();
  }

  _createFlags() {
    const languages = [
      { code: 'pt-BR', label: 'PT', flag: 'br' },
      { code: 'en',    label: 'EN', flag: 'us' },
      { code: 'es',    label: 'ES', flag: 'es' },
    ];

    languages.forEach(lang => {
      const btn = document.createElement('button');
      btn.className = 'mm-flag';
      btn.dataset.lang = lang.code;
      btn.setAttribute('aria-label', lang.label);

      if (i18n.getCurrentLanguage() === lang.code) {
        btn.classList.add('active');
      }

      const flagImg = document.createElement('img');
      flagImg.className = 'mm-flag-img';
      flagImg.src = `https://flagcdn.com/w40/${lang.flag}.png`;
      flagImg.alt = lang.label;
      flagImg.width = 30;
      flagImg.height = 20;
      btn.appendChild(flagImg);

      const labelEl = document.createElement('span');
      labelEl.className = 'mm-flag-label';
      labelEl.textContent = lang.label;
      btn.appendChild(labelEl);

      btn.addEventListener('click', () => this._changeLanguage(lang.code));
      this.flagsArea.appendChild(btn);
    });
  }

  // ───────────────────── LANGUAGE ─────────────────────

  _changeLanguage(langCode) {
    if (i18n.getCurrentLanguage() === langCode) return;

    const success = i18n.setLanguage(langCode);
    if (!success) return;

    this.flagsArea.querySelectorAll('.mm-flag').forEach(f => {
      f.classList.toggle('active', f.dataset.lang === langCode);
    });

    this.subtitleEl.textContent = `\u2500 ${t('mainMenu.subtitle')} \u2500`;
    if (this.currentState === MenuState.MAIN) {
      this._renderMain();
    } else if (this.currentState === MenuState.PLAY) {
      this._renderPlaySub();
    } else if (this.currentState === MenuState.SETTINGS) {
      this._renderSettings();
    } else if (this.currentState === MenuState.ACHIEVEMENTS) {
      this._renderAchievements();
    } else if (this.currentState === MenuState.GALLERY) {
      this._renderGallery();
    }
  }

  // ───────────────────── MAIN MENU ─────────────────────

  _renderMain() {
    this.currentState = MenuState.MAIN;
    this.selectedIndex = 0;
    this._clearMenuArea();

    this._mainOptions = [
      { id: 'play',         text: t('mainMenu.play'),         future: false },
      { id: 'settings',     text: t('mainMenu.settings'),     future: false },
      { id: 'gallery',      text: t('mainMenu.gallery'),      future: false },
      { id: 'achievements', text: t('mainMenu.achievements'), future: false },
      { id: 'credits',      text: t('mainMenu.credits'),      future: false },
      { id: 'feedback',     text: t('mainMenu.feedback'),     future: true  },
      { id: 'quit',         text: t('mainMenu.quit'),         future: false },
    ];

    this._mainOptions.forEach((opt, idx) => {
      const card = document.createElement('div');
      card.className = 'mm-card';
      if (opt.future) card.classList.add('future');
      card.dataset.index = idx;

      const label = document.createElement('span');
      label.textContent = opt.text;
      card.appendChild(label);

      card.addEventListener('click', () => this._handleMain(opt.id));
      card.addEventListener('mouseenter', () => {
        this.selectedIndex = idx;
        this._highlightCards('.mm-card');
      });

      this.menuArea.appendChild(card);
    });

    this._clearNode(this.backArea);
    this._highlightCards('.mm-card');
  }

  // ───────────────────── PLAY SUBMENU ─────────────────────

  _renderPlaySub() {
    this.currentState = MenuState.PLAY;
    this.selectedIndex = 0;
    this._clearMenuArea();

    const sub = document.createElement('div');
    sub.className = 'mm-submenu';

    const options = [
      { id: 'newGame',  text: t('mainMenu.newGame'),  icon: '\uD83C\uDF31' },
      { id: 'loadGame', text: t('mainMenu.loadGame'), icon: '\uD83D\uDCC2' },
    ];

    options.forEach((opt, idx) => {
      const card = document.createElement('div');
      card.className = 'mm-sub-card';
      card.dataset.index = idx;

      const icon = document.createElement('span');
      icon.className = 'mm-sub-icon';
      icon.textContent = opt.icon;

      const label = document.createElement('span');
      label.textContent = opt.text;

      card.append(icon, label);
      card.addEventListener('click', () => this._handlePlay(opt.id));
      card.addEventListener('mouseenter', () => {
        this.selectedIndex = idx;
        this._highlightCards('.mm-sub-card');
      });

      sub.appendChild(card);
    });

    this.menuArea.appendChild(sub);
    this._addBackButton();
    this._highlightCards('.mm-sub-card');
  }

  // ───────────────────── SETTINGS SUBMENU ─────────────────────

  _renderSettings() {
    this.currentState = MenuState.SETTINGS;
    this._clearMenuArea();

    const panel = document.createElement('div');
    panel.className = 'mm-settings-panel';

    // ── Language ──
    panel.appendChild(this._createSettingsSection(
      t('settings.language'),
      this._buildLanguageRow()
    ));

    // ── Audio ──
    panel.appendChild(this._createSettingsSection(
      t('settings.audio.title'),
      this._buildAudioRows()
    ));

    // ── Accessibility ──
    panel.appendChild(this._createSettingsSection(
      t('settings.accessibility'),
      this._buildAccessibilityRows()
    ));

    // ── Controls ──
    panel.appendChild(this._createSettingsSection(
      t('settings.controls.title'),
      this._buildControlsRow()
    ));

    this.menuArea.appendChild(panel);
    this._addBackButton();
  }

  /** Wrapper for a settings section with title */
  _createSettingsSection(title, contentEl) {
    const section = document.createElement('div');
    section.className = 'mm-cfg-section';

    const heading = document.createElement('h3');
    heading.className = 'mm-cfg-heading';
    heading.textContent = title;

    section.append(heading, contentEl);
    return section;
  }

  // ── Language row ──

  _buildLanguageRow() {
    const wrap = document.createElement('div');
    wrap.className = 'mm-cfg-rows';

    const row = document.createElement('div');
    row.className = 'mm-cfg-row';

    const label = document.createElement('span');
    label.className = 'mm-cfg-label';
    label.textContent = t('settings.language');

    const select = document.createElement('select');
    select.className = 'mm-cfg-select';

    const langs = [
      { code: 'pt-BR', name: 'Portugu\u00eas (Brasil)' },
      { code: 'en',    name: 'English' },
      { code: 'es',    name: 'Espa\u00f1ol' },
    ];

    langs.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.name;
      if (i18n.getCurrentLanguage() === l.code) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      this._changeLanguage(select.value);
    });

    row.append(label, select);
    wrap.appendChild(row);
    return wrap;
  }

  // ── Audio rows ──

  _buildAudioRows() {
    const wrap = document.createElement('div');
    wrap.className = 'mm-cfg-rows';

    const sliders = [
      { key: LS_MUSIC,   label: t('settings.audio.musicVolume'),   event: 'musicVolumeChanged' },
      { key: LS_AMBIENT, label: t('settings.audio.ambientVolume'), event: 'ambientVolumeChanged' },
      { key: LS_ANIMAL,  label: t('settings.audio.animalVolume'),  event: 'animalVolumeChanged' },
    ];

    sliders.forEach(s => {
      const stored = this._loadVolume(s.key);

      const row = document.createElement('div');
      row.className = 'mm-cfg-row';

      const label = document.createElement('span');
      label.className = 'mm-cfg-label';
      label.textContent = s.label;

      const sliderWrap = document.createElement('div');
      sliderWrap.className = 'mm-cfg-slider-wrap';

      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = '100';
      range.value = String(Math.round(stored * 100));
      range.className = 'mm-cfg-range';

      const valueLabel = document.createElement('span');
      valueLabel.className = 'mm-cfg-range-val';
      valueLabel.textContent = `${range.value}%`;

      range.addEventListener('input', () => {
        const val = Number(range.value) / 100;
        valueLabel.textContent = `${range.value}%`;
        this._saveVolume(s.key, val);
        document.dispatchEvent(new CustomEvent(s.event, { detail: { volume: val } }));
      });

      sliderWrap.append(range, valueLabel);
      row.append(label, sliderWrap);
      wrap.appendChild(row);
    });

    return wrap;
  }

  // ── Accessibility rows ──

  _buildAccessibilityRows() {
    const wrap = document.createElement('div');
    wrap.className = 'mm-cfg-rows';

    // High contrast toggle
    wrap.appendChild(this._buildToggleRow(
      t('settings.highContrast'),
      a11y.getSetting('highContrast'),
      (checked) => { a11y.setSetting('highContrast', checked); }
    ));

    // Reduced motion toggle
    wrap.appendChild(this._buildToggleRow(
      t('settings.reducedMotion'),
      a11y.getSetting('reducedMotion'),
      (checked) => { a11y.setSetting('reducedMotion', checked); }
    ));

    // Screen reader toggle
    wrap.appendChild(this._buildToggleRow(
      t('settings.screenReader'),
      a11y.getSetting('screenReaderAnnouncements'),
      (checked) => { a11y.setSetting('screenReaderAnnouncements', checked); }
    ));

    // Text size select
    const textSizeRow = document.createElement('div');
    textSizeRow.className = 'mm-cfg-row';

    const tsLabel = document.createElement('span');
    tsLabel.className = 'mm-cfg-label';
    tsLabel.textContent = t('settings.textSize');

    const tsSelect = document.createElement('select');
    tsSelect.className = 'mm-cfg-select';

    const textSizes = [
      { value: 'normal',      text: t('settings.textNormal') },
      { value: 'large',       text: t('settings.textLarge') },
      { value: 'extra-large', text: t('settings.textExtraLarge') },
    ];

    const currentSize = a11y.getSetting('textSize') || 'normal';
    textSizes.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.value;
      opt.textContent = s.text;
      if (currentSize === s.value) opt.selected = true;
      tsSelect.appendChild(opt);
    });

    tsSelect.addEventListener('change', () => {
      a11y.setSetting('textSize', tsSelect.value);
    });

    textSizeRow.append(tsLabel, tsSelect);
    wrap.appendChild(textSizeRow);

    // Color vision select
    const cvRow = document.createElement('div');
    cvRow.className = 'mm-cfg-row';

    const cvLabel = document.createElement('span');
    cvLabel.className = 'mm-cfg-label';
    cvLabel.textContent = t('settings.colorVision');

    const cvSelect = document.createElement('select');
    cvSelect.className = 'mm-cfg-select';

    const cvModes = [
      { value: 'off',            text: t('settings.cvOff') },
      { value: 'protanopia',     text: t('settings.cvProtanopia') },
      { value: 'deuteranopia',   text: t('settings.cvDeuteranopia') },
      { value: 'tritanopia',     text: t('settings.cvTritanopia') },
      { value: 'achromatopsia',  text: t('settings.cvAchromatopsia') },
    ];

    const currentCV = a11y.getSetting('colorVisionMode') || 'off';
    cvModes.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.text;
      if (currentCV === m.value) opt.selected = true;
      cvSelect.appendChild(opt);
    });

    cvSelect.addEventListener('change', () => {
      a11y.setSetting('colorVisionMode', cvSelect.value);
    });

    cvRow.append(cvLabel, cvSelect);
    wrap.appendChild(cvRow);

    return wrap;
  }

  /** Build a toggle (checkbox styled as switch) row */
  _buildToggleRow(labelText, currentValue, onChange) {
    const row = document.createElement('div');
    row.className = 'mm-cfg-row';

    const label = document.createElement('span');
    label.className = 'mm-cfg-label';
    label.textContent = labelText;

    const toggle = document.createElement('label');
    toggle.className = 'mm-cfg-toggle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!currentValue;

    const slider = document.createElement('span');
    slider.className = 'mm-cfg-toggle-slider';

    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
    });

    toggle.append(checkbox, slider);
    row.append(label, toggle);
    return row;
  }

  // ── Controls row ──

  _buildControlsRow() {
    const wrap = document.createElement('div');
    wrap.className = 'mm-cfg-rows';

    const row = document.createElement('div');
    row.className = 'mm-cfg-row';

    const label = document.createElement('span');
    label.className = 'mm-cfg-label';
    label.textContent = t('settings.controls.remap');

    const btn = document.createElement('button');
    btn.className = 'mm-cfg-select';
    btn.style.cursor = 'pointer';
    btn.textContent = t('settings.controls.openRemap');
    btn.addEventListener('click', async () => {
      try {
        const settingsModule = await import('../settingsUI.js');
        settingsModule.openKeybindsModal();
      } catch (e) {
        logger.error('MainMenu: failed to open keybinds modal', e);
      }
    });

    row.append(label, btn);
    wrap.appendChild(row);

    // hint text
    const hint = document.createElement('div');
    hint.className = 'mm-cfg-row';
    const hintLabel = document.createElement('span');
    hintLabel.className = 'mm-cfg-label';
    hintLabel.style.opacity = '0.6';
    hintLabel.style.fontSize = '0.8rem';
    hintLabel.textContent = t('settings.controls.remapHint');
    hint.appendChild(hintLabel);
    wrap.appendChild(hint);

    return wrap;
  }

  // ── Volume helpers (same localStorage keys as in-game) ──

  _loadVolume(key) {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) {
        const num = parseFloat(val);
        if (!isNaN(num)) return Math.max(0, Math.min(1, num));
      }
    } catch (_) { /* ignore */ }
    return 0.5;
  }

  _saveVolume(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (_) { /* ignore */ }
  }

  // ───────────────────── ACHIEVEMENTS SUBMENU ─────────────────────

  async _renderAchievements() {
    this.currentState = MenuState.ACHIEVEMENTS;
    this._clearMenuArea();

    try {
      const { renderAchievementsMenu } = await import('../achievements/achievementMenuUI.js');
      renderAchievementsMenu(this.menuArea);
    } catch (e) {
      this._showToast(t('mainMenu.achievementsComingSoon'));
      logger.error('MainMenu: failed to load achievements UI', e);
    }

    this._addBackButton();
  }

  // ───────────────────── GALLERY SUBMENU ─────────────────────

  async _renderGallery() {
    this.currentState = MenuState.GALLERY;
    this._clearMenuArea();

    try {
      const { renderGalleryMenu } = await import('../gallery/galleryUI.js');
      renderGalleryMenu(this.menuArea);
    } catch (e) {
      this._showToast(t('mainMenu.galleryComingSoon'));
      logger.error('MainMenu: failed to load gallery UI', e);
    }

    this._addBackButton();
  }

  // ───────────────────── HANDLERS ─────────────────────

  _handleMain(id) {
    switch (id) {
      case 'play':
        this._renderPlaySub();
        break;
      case 'settings':
        this._renderSettings();
        break;
      case 'gallery':
        this._renderGallery();
        break;
      case 'achievements':
        this._renderAchievements();
        break;
      case 'credits':
        this._showToast(t('mainMenu.creditsText'));
        break;
      case 'feedback':
        this._showToast(t('mainMenu.feedbackComingSoon'));
        break;
      case 'quit':
        this._showToast(t('mainMenu.quitMessage'));
        break;
    }
  }

  _handlePlay(id) {
    if (id === 'newGame') {
      this.hide();
      document.dispatchEvent(new CustomEvent('mainMenu:newGame'));
    } else if (id === 'loadGame') {
      this._loadGame();
    }
  }

  async _loadGame() {
    try {
      const saveModule = await import('../saveSystem.js');
      const saveSystem = saveModule.saveSystem;

      if (!saveSystem.hasAnySave()) {
        this._showToast(t('characterSelection.noSavesFound'));
        return;
      }

      const uiModule = await import('../saveSlotsUI.js');
      const saveSlotsUI = uiModule.saveSlotsUI;

      saveSlotsUI.open('load', (slot) => {
        window._pendingSaveData = slot;
        this.hide();
        document.dispatchEvent(new CustomEvent('mainMenu:loadGame', {
          detail: { saveData: slot },
        }));
      });
    } catch (e) {
      this._showToast(t('characterSelection.saveSystemError'));
      logger.error('MainMenu:loadGame', e);
    }
  }

  // ───────────────────── KEYBOARD NAV ─────────────────────

  _bindKeyboard() {
    this._keyHandler = (e) => {
      if (this.container.style.display === 'none') return;

      // ESC goes back from any submenu
      if (e.key === 'Escape' && this.currentState !== MenuState.MAIN) {
        this._renderMain();
        e.preventDefault();
        return;
      }

      // Keyboard nav only for MAIN and PLAY (settings/achievements have their own interactive elements)
      if (this.currentState === MenuState.SETTINGS || this.currentState === MenuState.ACHIEVEMENTS || this.currentState === MenuState.GALLERY) return;

      const isMain = this.currentState === MenuState.MAIN;
      const maxIndex = isMain ? this._mainOptions.length - 1 : 1;

      if (e.key === 'ArrowDown') {
        this.selectedIndex = (this.selectedIndex + 1) % (maxIndex + 1);
        this._highlightCards(isMain ? '.mm-card' : '.mm-sub-card');
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        this.selectedIndex = (this.selectedIndex - 1 + maxIndex + 1) % (maxIndex + 1);
        this._highlightCards(isMain ? '.mm-card' : '.mm-sub-card');
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (isMain) {
          const opt = this._mainOptions[this.selectedIndex];
          if (opt) this._handleMain(opt.id);
        } else {
          this._handlePlay(this.selectedIndex === 0 ? 'newGame' : 'loadGame');
        }
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', this._keyHandler);
  }

  // ───────────────────── HELPERS ─────────────────────

  _addBackButton() {
    this._clearNode(this.backArea);
    const backBtn = document.createElement('div');
    backBtn.className = 'mm-back-btn';
    backBtn.textContent = `\u2190 ${t('mainMenu.back')}`;
    backBtn.addEventListener('click', () => this._renderMain());
    this.backArea.appendChild(backBtn);
  }

  _highlightCards(selector) {
    const cards = this.menuArea.querySelectorAll(selector);
    cards.forEach((card, idx) => {
      card.classList.toggle('selected', idx === this.selectedIndex);
    });
  }

  _clearMenuArea() {
    this._clearNode(this.menuArea);
  }

  _clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  _showToast(message) {
    const existing = document.querySelector('.mm-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'mm-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 400);
    }, 2500);
  }

  // ───────────────────── PUBLIC API ─────────────────────

  show() {
    if (this.container) {
      this.container.style.display = 'flex';
      this._renderMain();
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
}
