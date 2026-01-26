/**
 * @file gameState.js - Centralized Game State Manager
 * @description Single source of truth for all game systems and state.
 * Replaces scattered window.* globals with organized, typed access.
 * @module GameState
 */

/**
 * Game state container - holds references to all systems
 * @type {Object}
 */
const gameState = {
  // Core systems (initialized during game startup)
  systems: Object.create(null),

  // Game objects (camera, world, player, etc)
  objects: Object.create(null),

  // Debug flags
  debug: Object.create(null),

  // Game state flags
  flags: {
    isLoading: true,
    isPaused: false,
    isSleeping: false,
    isInMenu: false,
    interactionsBlocked: false,
  },
};

/**
 * Initialize a system in the game state
 * @param {string} systemName - Name of the system
 * @param {Object} systemInstance - The system instance
 * @returns {Object} The registered system instance
 */
export function registerSystem(systemName, systemInstance) {
  gameState.systems[systemName] = systemInstance;
  console.log(`✅ Registered system: ${systemName}`);
  return systemInstance;
}

/**
 * Get a system by name
 * @param {string} systemName - Name of the system
 * @returns {Object|null} The system or null
 */
export function getSystem(systemName) {
  return gameState.systems[systemName] || null;
}

/**
 * Set a game object (camera, world, player, etc)
 * @param {string} name - Object name
 * @param {*} value - Object value
 * @returns {*} The value that was set
 */
export function setObject(name, value) {
  gameState.objects[name] = value;
  return value;
}

/**
 * Get a game object by name
 * @param {string} name - Object name
 * @returns {*} The object or undefined
 */
export function getObject(name) {
  return gameState.objects[name];
}

/**
 * Set a debug flag
 * @param {string} flag - Flag name
 * @param {boolean} value - Flag value
 */
export function setDebugFlag(flag, value) {
  gameState.debug[flag] = !!value;
}

/**
 * Get a debug flag value
 * @param {string} flag - Flag name
 * @returns {boolean} Flag value
 */
export function getDebugFlag(flag) {
  return !!gameState.debug[flag];
}

/**
 * Set a game state flag
 * @param {string} flag - Flag name
 * @param {boolean} value - Flag value
 */
export function setGameFlag(flag, value) {
  if (gameState.flags.hasOwnProperty(flag)) {
    gameState.flags[flag] = value;
  }
}

/**
 * Check if game is in a specific state
 * @param {string} flag - Flag name
 * @returns {boolean} Flag value
 */
export function checkGameFlag(flag) {
  return gameState.flags[flag] ?? false;
}

/**
 * Initialize debug flags from URL parameters
 * ?debug=1 - Enable debug mode
 * ?hitboxes=1 - Show hitboxes
 */
export function initDebugFlagsFromUrl() {
  if (typeof window === "undefined") return;
  const q = new URLSearchParams(window.location.search);

  // ?debug=1 habilita exposição de debug no window
  if (q.has("debug")) setDebugFlag("debug", q.get("debug") !== "0");

  // ?hitboxes=1 liga hitboxes
  if (q.has("hitboxes")) setDebugFlag("hitboxes", q.get("hitboxes") !== "0");
}

/**
 * Expose debug information to window.__debug (only when debug flag is enabled)
 * @param {Object} extra - Additional debug information to expose
 */
export function exposeDebug(extra = {}) {
  if (typeof window === "undefined") return;
  if (!getDebugFlag("debug")) return;

  window.__debug = {
    systems: gameState.systems,
    objects: gameState.objects,
    debugFlags: gameState.debug,
    flags: gameState.flags,
    ...extra,
  };
}

/**
 * Install legacy globals bridge for gradual migration
 * Creates getters/setters on window.* that warn about deprecated usage
 */
export function installLegacyGlobals() {
  if (typeof window === "undefined") return;

  const legacyMappings = {
    playerSystem: 'player',
    inventorySystem: 'inventory',
    currencyManager: 'currency',
    merchantSystem: 'merchant',
    BuildSystem: 'build',
    WeatherSystem: 'weather',
    itemSystem: 'item',
    collisionSystem: 'collision',
    chestSystem: 'chest',
    storageSystem: 'storage',
    wellSystem: 'well',
    houseSystem: 'house',
  };

  for (const [windowKey, systemKey] of Object.entries(legacyMappings)) {
    Object.defineProperty(window, windowKey, {
      get() {
        return gameState.systems[systemKey];
      },
      set(value) {
        gameState.systems[systemKey] = value;
      },
      configurable: true,
    });
  }

  // Legacy object mappings
  Object.defineProperty(window, 'theWorld', {
    get() { return gameState.objects.world; },
    set(value) { gameState.objects.world = value; },
    configurable: true,
  });

  Object.defineProperty(window, 'currentPlayer', {
    get() { return gameState.objects.currentPlayer; },
    set(value) { gameState.objects.currentPlayer = value; },
    configurable: true,
  });

  Object.defineProperty(window, 'camera', {
    get() { return gameState.objects.camera; },
    set(value) { gameState.objects.camera = value; },
    configurable: true,
  });

  Object.defineProperty(window, 'DEBUG_HITBOXES', {
    get() { return getDebugFlag('hitboxes'); },
    set(value) { setDebugFlag('hitboxes', value); },
    configurable: true,
  });

  Object.defineProperty(window, 'interactionsBlocked', {
    get() { return gameState.flags.interactionsBlocked; },
    set(value) { gameState.flags.interactionsBlocked = value; },
    configurable: true,
  });

  console.log('🔗 Legacy globals bridge installed');
}

// Expose gameState for debugging in console (optional)
if (typeof window !== 'undefined') {
  window.__gameState = gameState;
}

export default gameState;
