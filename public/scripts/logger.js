/**
 * @file logger.js - Production-Ready Logger
 * @description Configurable logging that can be disabled in production
 * @module Logger
 */

const LOG_LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
};

class Logger {
  constructor() {
    // Detecta ambiente de desenvolvimento
    // Em produção (GitHub Pages ou domínio público), apenas ERROR
    // Em desenvolvimento (localhost), DEBUG completo
    const isDev = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname === '';

    this.level = window.DEBUG_MODE ? LOG_LEVELS.DEBUG :
                 (isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR);
  }

  setLevel(level) {
    this.level = level;
  }

  debug(...args) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }
}

export const logger = new Logger();
export { LOG_LEVELS };
