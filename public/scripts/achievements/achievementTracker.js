/**
 * @file achievementTracker.js - Achievement tracking engine
 * @description Listens to game events, tracks progress, emits unlock notifications.
 * Registers itself as 'achievements' in gameState.
 * @module AchievementTracker
 */

import { logger } from '../logger.js';
import { registerSystem, getSystem } from '../gameState.js';
import { ACHIEVEMENTS } from './achievementDefinitions.js';

const GLOBAL_ACHIEVEMENTS_KEY = 'farmxp_achievements_global';

export class AchievementTracker {
  constructor() {
    /** @type {Object<string, {current: number, unlocked: boolean, unlockedAt: number|null}>} */
    this.progress = {};
    this.definitions = ACHIEVEMENTS;
    this._muted = false;

    // Initialize progress for all achievements
    for (const def of this.definitions) {
      this.progress[def.id] = { current: 0, unlocked: false, unlockedAt: null };
    }

    // Restore from global storage (persists across all saves)
    this._loadGlobal();

    this._boundEvents = new Map();
    this._bindEvents();
    registerSystem('achievements', this);
    logger.debug('AchievementTracker initialized');

    // Retroactive check: playerReady may have already fired before tracker loaded
    this._checkRetroactive();
  }

  /**
   * Check for events that already fired before the tracker was initialized.
   * Dispatches synthetic events so achievements like 'first_steps' still trigger.
   */
  _checkRetroactive() {
    // If player system already exists, playerReady already fired
    const player = getSystem('player');
    if (player && player.currentPlayer) {
      this._onEvent('playerReady', { player: player.currentPlayer });
    }
  }

  // ───────────────────── EVENT BINDING ─────────────────────

  _bindEvents() {
    // Collect unique event names
    const eventNames = new Set();
    for (const def of this.definitions) {
      for (const ev of def.events) {
        eventNames.add(ev);
      }
    }

    // Bind one listener per event type
    for (const eventName of eventNames) {
      const handler = (e) => this._onEvent(eventName, e.detail || {});
      document.addEventListener(eventName, handler);
      this._boundEvents.set(eventName, handler);
    }
  }

  // ───────────────────── EVENT HANDLER ─────────────────────

  _onEvent(eventName, detail) {
    if (this._muted) return;
    for (const def of this.definitions) {
      if (!def.events.includes(eventName)) continue;

      const prog = this.progress[def.id];
      if (!prog || prog.unlocked) continue;

      let matches = false;
      try {
        matches = def.condition(detail);
      } catch (_) {
        continue;
      }

      if (!matches) continue;

      // Calculate increment
      let increment = 1;
      if (typeof def.increment === 'function') {
        try { increment = def.increment(detail) || 1; } catch (_) { increment = 1; }
      }

      if (def.type === 'threshold') {
        // For threshold: the condition itself checks the value, so just mark complete
        prog.current = def.target;
      } else {
        prog.current += increment;
      }

      // Check completion
      if (prog.current >= def.target && !prog.unlocked) {
        prog.unlocked = true;
        prog.unlockedAt = Date.now();

        logger.info(`Achievement unlocked: ${def.id}`);

        document.dispatchEvent(new CustomEvent('achievement:unlocked', {
          detail: { achievementId: def.id, definition: def }
        }));

        // Persist to global storage + mark save dirty
        this._saveGlobal();
        try {
          const save = getSystem('save');
          if (save && save.markDirty) save.markDirty();
        } catch (_) { /* ignore */ }
      }
    }
  }

  // ───────────────────── GLOBAL STORAGE ─────────────────────

  /** Save current progress to global localStorage (cross-save persistence) */
  _saveGlobal() {
    try {
      localStorage.setItem(GLOBAL_ACHIEVEMENTS_KEY, JSON.stringify(this.progress));
    } catch (_) { /* quota exceeded etc */ }
  }

  /** Load progress from global localStorage */
  _loadGlobal() {
    try {
      const raw = localStorage.getItem(GLOBAL_ACHIEVEMENTS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      for (const def of this.definitions) {
        if (data[def.id]) {
          this.progress[def.id] = {
            current: data[def.id].current || 0,
            unlocked: !!data[def.id].unlocked,
            unlockedAt: data[def.id].unlockedAt || null,
          };
        }
      }
      logger.debug('Achievement progress loaded from global storage');
    } catch (_) { /* corrupted etc */ }
  }

  /** Merge save data with global — keeps the best progress for each achievement */
  mergeWithGlobal(saveData) {
    this._loadGlobal();
    if (!saveData || typeof saveData !== 'object') return;

    for (const def of this.definitions) {
      const saved = saveData[def.id];
      if (!saved) continue;

      const prog = this.progress[def.id];
      if (saved.current > prog.current) prog.current = saved.current;
      if (saved.unlocked && !prog.unlocked) {
        prog.unlocked = true;
        prog.unlockedAt = saved.unlockedAt || prog.unlockedAt;
      }
    }

    this._saveGlobal();
    logger.debug('Achievement progress merged with global');
  }

  /** Clear global storage (called when ALL saves are deleted) */
  clearGlobal() {
    try { localStorage.removeItem(GLOBAL_ACHIEVEMENTS_KEY); } catch (_) { /* */ }
    this.resetProgress();
    logger.debug('Global achievement storage cleared');
  }

  // ───────────────────── PUBLIC API ─────────────────────

  /** Get full progress map (for saving) */
  getProgress() {
    return JSON.parse(JSON.stringify(this.progress));
  }

  /** Load progress from save data */
  loadProgress(data) {
    if (!data || typeof data !== 'object') return;

    for (const def of this.definitions) {
      if (data[def.id]) {
        this.progress[def.id] = {
          current: data[def.id].current || 0,
          unlocked: !!data[def.id].unlocked,
          unlockedAt: data[def.id].unlockedAt || null,
        };
      }
    }

    logger.debug('Achievement progress loaded from save');
  }

  /** Reset all progress to initial state (used when loading a fresh save) */
  resetProgress() {
    for (const def of this.definitions) {
      this.progress[def.id] = { current: 0, unlocked: false, unlockedAt: null };
    }
    logger.debug('Achievement progress reset');
  }

  /** Silencia o tracker (ignora eventos). Usar durante restore de save. */
  mute() { this._muted = true; }

  /** Reativa o tracker após restore. */
  unmute() { this._muted = false; }

  /** Get all achievements with their definitions and progress merged */
  getAll() {
    return this.definitions.map(def => ({
      ...def,
      progress: this.progress[def.id] || { current: 0, unlocked: false, unlockedAt: null },
    }));
  }

  /** Get achievements filtered by category */
  getByCategory(category) {
    if (category === 'all') return this.getAll();
    return this.getAll().filter(a => a.category === category);
  }

  /** Get only unlocked achievements */
  getUnlocked() {
    return this.getAll().filter(a => a.progress.unlocked);
  }

  /** Get count summary */
  getSummary() {
    const total = this.definitions.length;
    const unlocked = Object.values(this.progress).filter(p => p.unlocked).length;
    return { total, unlocked };
  }
}
