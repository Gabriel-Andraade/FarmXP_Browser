/**
 * @file achievementTracker.js - Achievement tracking engine
 * @description Listens to game events, tracks progress, emits unlock notifications.
 * Registers itself as 'achievements' in gameState.
 * @module AchievementTracker
 */

import { logger } from '../logger.js';
import { registerSystem, getSystem } from '../gameState.js';
import { ACHIEVEMENTS } from './achievementDefinitions.js';

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

        // Mark save as dirty
        try {
          const save = getSystem('save');
          if (save && save.markDirty) save.markDirty();
        } catch (_) { /* ignore */ }
      }
    }
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
