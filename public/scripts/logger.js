/**
 * @file logger.js
 * logger configurável com níveis e saída controlada por ambiente.
 */

export const LOG_LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
};

class Logger {
  /**
   * cria uma instância do logger e define o nível inicial.
   * usa DEBUG no localhost ou quando window.DEBUG_MODE estiver ativo;
   * caso contrário, usa ERROR.
   */
  constructor() {
    const isDev =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "";

    this.level = window.DEBUG_MODE
      ? LOG_LEVELS.DEBUG
      : isDev
        ? LOG_LEVELS.DEBUG
        : LOG_LEVELS.ERROR;
  }

  /**
   * define o nível de log.
   * @param {number} level nível baseado em LOG_LEVELS.
   */
  setLevel(level) {
    this.level = level;
  }

  /**
   * registra mensagens de debug.
   * @param {...any} args argumentos a serem logados.
   */
  debug(...args) {
    if (this.level >= LOG_LEVELS.DEBUG) console.log("[DEBUG]", ...args);
  }

  /**
   * registra mensagens informativas.
   * @param {...any} args argumentos a serem logados.
   */
  info(...args) {
    if (this.level >= LOG_LEVELS.INFO) console.log("[INFO]", ...args);
  }

  /**
   * registra avisos.
   * @param {...any} args argumentos a serem logados.
   */
  warn(...args) {
    if (this.level >= LOG_LEVELS.WARN) console.warn("[WARN]", ...args);
  }

  /**
   * registra erros.
   * @param {...any} args argumentos a serem logados.
   */
  error(...args) {
    if (this.level >= LOG_LEVELS.ERROR) console.error("[ERROR]", ...args);
  }
}

/**
 * instância padrão do logger para uso no projeto.
 */
export const logger = new Logger();
