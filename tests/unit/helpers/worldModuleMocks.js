/**
 * @file worldModuleMocks.js - Stubs for theWorld.js's dependency tree.
 *
 * Import this (side-effect only, before importing anything that pulls in
 * `theWorld.js`) when a test needs the **real** theWorld but not the browser
 * APIs and asset pipeline behind it.
 *
 * Why the real module: `mock.module` registers globally for the whole `bun test`
 * run, so stubbing `theWorld.js` itself in one file breaks every other file that
 * tests it for real — `theWorld.test.js`, `weather.test.js` and
 * `saveSystem.test.js` all load the genuine module. Mocking only what theWorld
 * *imports* is safe, and is what those files already do.
 */
import { mock } from 'bun:test';

mock.module('../../../public/scripts/errorHandler.js', () => ({
  handleError: () => {},
  handleWarn: () => {},
}));

mock.module('../../../public/scripts/assetManager.js', () => ({
  assets: {},
}));

mock.module('../../../public/scripts/generatorSeeds.js', () => ({
  worldGenerator: { seed: 0, next: () => 0 },
  WORLD_GENERATOR_CONFIG: {},
}));

mock.module('../../../public/scripts/thePlayer/cameraSystem.js', () => ({
  camera: { x: 0, y: 0, zoom: 1 },
  CAMERA_ZOOM: 2,
}));

mock.module('../../../public/scripts/worldConstants.js', () => ({
  WORLD_WIDTH: 4000,
  WORLD_HEIGHT: 5010,
  GAME_WIDTH: 880,
  GAME_HEIGHT: 963.09,
  TILE_SIZE: 20,
}));

mock.module('../../../public/scripts/optimizationConstants.js', () => ({
  ZOOMED_TILE_SIZE: 40,
  ZOOMED_TILE_SIZE_INT: 40,
  INV_CAMERA_ZOOM: 0.5,
  OPTIMIZATION_CONFIG: {
    ENABLED: true,
    USE_PRECALCULATED_VALUES: true,
    MAX_DRAW_CALLS_PER_FRAME: 5000,
    LOG_PERFORMANCE: false,
    SLEEP_OPTIMIZATIONS: { CLEAR_CACHE: true, COMPACT_ARRAYS: true, FORCE_GC: true, RESET_CANVAS: true, OPTIMIZE_MEMORY: true },
  },
  perfLog: () => {},
  getCachedCalculation: (key, fn) => fn(),
  worldToScreenFast: (x, y) => ({ x, y }),
  screenToWorldFast: (x, y) => ({ x, y }),
  worldToScreenWithCamera: (x, y) => ({ x, y }),
  isInViewportFast: () => true,
  getVisibleTileBounds: () => ({ startX: 0, endX: 100, startY: 0, endY: 100, width: 100, height: 100 }),
  performSleepOptimizations: async () => ({ success: true, duration: 0, optimizationsApplied: 0 }),
  getMemoryStatus: () => ({ error: 'not available' }),
  clearRenderCache: () => false,
  quickOptimization: () => ({ clearCalculationCache: () => {}, getCacheSize: () => 0, getConfig: () => ({}) }),
  default: {},
}));

mock.module('../../../public/scripts/constants.js', () => ({
  DEFAULTS: { SPRITE_SIZE_PX: 32 },
  DEFAULT_SPRITE_SIZE_PX: 32,
  TIMING: { IDLE_STATE_MIN_MS: 1000, IDLE_STATE_MAX_MS: 3000, MOVE_STATE_MIN_MS: 500, MOVE_STATE_MAX_MS: 2000 },
  // Flat re-exports: animalAI.js imports these by name, and it has to stay the
  // real module — animalAI.test.js tests it for real, and a stub here would
  // reach that file too.
  IDLE_STATE_MIN_MS: 1000,
  IDLE_STATE_MAX_MS: 3000,
  MOVE_STATE_MIN_MS: 500,
  MOVE_STATE_MAX_MS: 2000,
  GAME_BALANCE: { DAMAGE: { TREE_HP: 6, ROCK_HP: 3, STRUCTURE_HP: 10, DEFAULT_HP: 1 } },
  SIZES: {},
  RANGES: { INTERACTION_RANGE: 70, ANIMAL_SIGHT_RADIUS: 128 },
  MOVEMENT: { PLAYER_SPEED: 5, ANIMAL_SPEED: 0.5, DIAGONAL_MULTIPLIER: 0.7071, COLLISION_STEP_PX: 4, MAX_COLLISION_ITERATIONS: 6 },
  ANIMATION: { FRAME_RATE_IDLE_MS: 500, FRAME_RATE_MOVE_MS: 150 },
  VISUAL: { HEALTH_BAR: {}, GLOW: {}, KEY_PROMPT: {}, GRID: {} },
  HITBOX_CONFIGS: {
    STATIC_OBJECTS: {
      TREE: { width: 38, height: 40, offsetY: 38, offsetX: 16 },
      ROCK: { width: 32, height: 27 },
      THICKET: { width: 30, height: 18, offsetY: 7, offsetX: 7 },
      CHEST: { width: 31, height: 31 },
      HOUSE_WALLS: { width: 20, height: 20, offsetX: 35, offsetY: -50 },
      HOUSE_ROOF: { width: 200, height: 190, offsetFromRight: 265, offsetFromBottom: 200 },
      WELL: { width: 63, height: 30, offsetY: 56 },
      FENCEX: { width: 28, height: 5, offsetX: 0, offsetY: 24 },
      FENCEY: { width: 4, height: 63, offsetX: 0, offsetY: 0 },
    },
    ANIMALS: { DEFAULT: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 } },
    PLAYER: { WIDTH_RATIO: 0.7, HEIGHT_RATIO: 0.3, OFFSET_X_RATIO: 0.15, OFFSET_Y_RATIO: 0.7 },
    INTERACTION_ZONES: { PLAYER: { WIDTH_RATIO: 1.8, HEIGHT_RATIO: 1.8, OFFSET_X: -0.4, OFFSET_Y: -0.4 } },
  },
  MOBILE: {},
  CAMERA: { CULLING_BUFFER: 200 },
  UI: { FONT_SIZES: {} },
}));
