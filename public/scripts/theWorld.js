/**
 * @file theWorld.js - World management and rendering system
 * @description Manages the game world including terrain, objects, animals, buildings,
 * and all rendering operations. Handles world initialization, object placement,
 * culling optimization, and Y-sorting for proper depth rendering.
 * @module TheWorld
 */
import { handleError, handleWarn } from "./errorHandler.js";
import { assets } from "./assetManager.js";
import { worldGenerator, WORLD_GENERATOR_CONFIG } from "./generatorSeeds.js";
import { camera, CAMERA_ZOOM } from "./thePlayer/cameraSystem.js";
import { WORLD_WIDTH, WORLD_HEIGHT, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from "./worldConstants.js";
import { collisionSystem } from "./collisionSystem.js";
import { AnimalEntity } from "./animal/animalAI.js";
import { ZOOMED_TILE_SIZE_INT, perfLog, worldToScreenFast } from "./optimizationConstants.js";
import { CAMERA } from './constants.js';
import { setObject, getDebugFlag, getSystem } from "./gameState.js";
import { logger } from "./logger.js";

// Lazy-loaded to avoid circular dependency (mapManager imports from theWorld)
let _mapManager = null;
function getMapManager() {
  if (!_mapManager) _mapManager = getSystem('mapManager');
  return _mapManager;
}

// Lazy-loaded city renderer (only imported when needed)
let _cityRenderer = null;
async function getCityRenderer() {
  if (!_cityRenderer) {
    try { _cityRenderer = await import('./cityRenderer.js'); } catch (e) { /* ignored */ }
  }
  return _cityRenderer;
}
// Sync version for render loop (returns null until first async load)
let _cityRendererSync = null;
function getCityRendererSync() { return _cityRendererSync; }

// City renderer is fetched ONLY when the player actually enters the city.
// Previously this also pre-loaded on `gamestate:registered` for mapManager,
// which fired at boot — defeating the lazy-load. Now the only trigger is
// the `mapChanged` event with mapId === 'city'.
if (typeof document !== 'undefined') {
  document.addEventListener('mapChanged', async (e) => {
    _mapManager = getSystem('mapManager');
    if (e.detail?.mapId === 'city' && !_cityRendererSync) {
      try {
        _cityRendererSync = await getCityRenderer();
      } catch (err) {
        logger.warn('[theWorld] Failed to load cityRenderer module: ' + err.message);
      }
    }
  });
}

// =============================================================================
// RUNTIME DETECTION
// =============================================================================
const IS_BROWSER_RUNTIME =
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  typeof window.location !== "undefined";

// =============================================================================
// WORLD OBJECT ARRAYS
// Arrays that store all objects in the game world
// =============================================================================

/** @type {Array<Object>} Array of tree objects in the world */
export const trees = [];

/** @type {Array<Object>} Array of rock objects in the world */
export const rocks = [];

/** @type {Array<Object>} Array of thicket/bush objects in the world */
export const thickets = [];

/** @type {Array<Object>} Array of house structures in the world */
export const houses = [];

/** @type {Array<AnimalEntity>} Array of animal entities in the world */
export const animals = [];

/** @type {Array<Object>} Array of player-placed buildings */
export const placedBuildings = [];

/** @type {Array<Object>} Array of well structures in the world */
export const placedWells = [];

/** @type {boolean} Flag indicating if world has been initialized */
export let worldInitialized = false;

export { WORLD_WIDTH, WORLD_HEIGHT, GAME_WIDTH, GAME_HEIGHT };

// =============================================================================
// OPTIMIZATION CACHE VARIABLES
// Cache system for sorted world objects to improve rendering performance
// =============================================================================

// Static-objects render grid. Replaces the "walk every static per frame"
// approach: insert each static object into the cells it overlaps; per frame,
// query only the cells the viewport covers. For a 1920×1080 viewport with
// 512px cells, a typical frame touches ~3×4 = 12 cells regardless of world
// size. At 80 fences + 1000 trees + animals + troughs we go from iterating
// ~2k items every frame to ~60-150.
const RENDER_CELL_SIZE = 512;
const _renderGrid = new Map();           // cellKey → Array<wrapper>
let staticCacheValid = false;

function _rgKey(cx, cy) { return (cx << 16) | (cy & 0xFFFF); }

function _addToRenderGrid(wrapper) {
  const src = wrapper.original || wrapper;
  const x = src.x || 0, y = src.y || 0;
  const w = src.width || 32, h = src.height || 32;
  const minCX = Math.floor(x / RENDER_CELL_SIZE);
  const minCY = Math.floor(y / RENDER_CELL_SIZE);
  const maxCX = Math.floor((x + w) / RENDER_CELL_SIZE);
  const maxCY = Math.floor((y + h) / RENDER_CELL_SIZE);
  for (let cx = minCX; cx <= maxCX; cx++) {
    for (let cy = minCY; cy <= maxCY; cy++) {
      const k = _rgKey(cx, cy);
      let cell = _renderGrid.get(k);
      if (!cell) { cell = []; _renderGrid.set(k, cell); }
      cell.push(wrapper);
    }
  }
}

/**
 * Buffer zone around viewport for culling calculations
 * Objects within this buffer are still rendered to prevent pop-in
 * @constant {number}
 */
const CULLING_BUFFER = CAMERA.CULLING_BUFFER;

/**
 * Wrapper pool — stable identity per underlying object. WeakMap so wrappers
 * get GC'd automatically when the underlying object is removed.
 */
const _wrapperPool = new WeakMap();
function _getOrCreateWrapper(original, factory) {
  let w = _wrapperPool.get(original);
  if (!w) {
    w = factory(original);
    w.original = original;
    _wrapperPool.set(original, w);
  }
  return w;
}

// Per-frame render list + dedup Set are REUSED across frames (not reallocated)
// to cut GC churn — the drops it caused were only felt while moving (a dropped
// frame judders visibly when the world is scrolling). The list is consumed
// synchronously by the caller; do NOT hold the returned reference across frames.
const _frameList = [];
const _frameSeen = new Set();

// Stable player/portal wrappers (avoid a fresh object + closure every frame).
// They read the current player/mapManager off their own fields.
const _playerWrapper = {
  type: "PLAYER", id: "player", x: 0, y: 0, width: 0, height: 0,
  _p: null,
  draw(ctx, ...args) { this._p?.draw(ctx, ...args); },
};
const _portalWrapper = {
  type: "PORTAL", id: "map_portal", x: 0, y: 99999, width: 0, height: 0,
  _mgr: null,
  draw(ctx, ...args) { this._mgr?.drawPortal(ctx, ...args); },
};

/**
 * Invalidates the static-objects sorted cache. Called when objects are
 * added/removed/destroyed. Does NOT fire on player movement — the cache
 * stays stable while only the camera moves.
 */
export function markWorldChanged() {
  staticCacheValid = false;
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('worldChanged'));
  }
}
/**
 * Compacts module-scoped world arrays by removing invalid/destroyed entries.
 * Replaces the old window[arrayName] approach and works without legacy globals.
 * @returns {{ itemsCompacted: number }} Number of removed items
 */
export function compactLargeArrays() {
  const arrays = [trees, rocks, thickets, houses, animals, placedBuildings, placedWells];

  let removed = 0;
  for (const arr of arrays) {
    if (!Array.isArray(arr) || arr.length <= 50) continue;

    const before = arr.length;
    const filtered = arr.filter((item) => {
      if (!item) return false;
      if (item.destroyed) return false;
      if (item.health !== undefined && item.health <= 0) return false;
      if (item.hp !== undefined && item.hp <= 0) return false;
      return true;
    });

    if (filtered.length < before) {
      // Remove hitboxes for items that will be compacted out
      const filteredSet = new Set(filtered);
      for (const item of arr) {
       if (item && !filteredSet.has(item) && item.id) {
         try { collisionSystem.removeHitbox(item.id); } catch (_) { /* already gone */ }
       }
      }
      arr.length = 0;
      arr.push(...filtered);
      removed += (before - filtered.length);
    }
  }

  if (removed > 0) markWorldChanged();
  return { itemsCompacted: removed };
}

/**
 * Places a well object in the world
 * Supports multiple call signatures for flexibility
 * @param {string|number} a - Well ID (string) or X position (number)
 * @param {number} b - X position (if a is string) or Y position (if a is number)
 * @param {number|Object} c - Y position (if a is string) or options object (if a is number)
 * @returns {Object} The created well object
 */
export function placeWell(a, b, c) {
  let id = null, x = 0, y = 0, opts = {};
  if (typeof a === "string" && typeof b === "number" && typeof c === "number") {
    id = a; x = b; y = c;
  } else {
    x = Number(a) || 0;
    y = Number(b) || 0;
    opts = c || {};
  }

  let wellObject = null;
  try {
    const wellSystem = getSystem('well');
    if (wellSystem && typeof wellSystem.placeWell === "function") {
      if (id) wellObject = wellSystem.placeWell(id, x, y);
      else wellObject = wellSystem.placeWell(x, y, opts);
    }
  } catch (err) {
    handleWarn("Failed to place well via wellSystem", "theWorld:placeWell", { id, x, y, err });
  }

  if (!wellObject) {
    const wid = id || `well_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    wellObject = {
      id: wid,
      x,
      y,
      width: (opts.width || WORLD_GENERATOR_CONFIG?.TREES?.WIDTH || 64),
      height: (opts.height || WORLD_GENERATOR_CONFIG?.TREES?.HEIGHT || 64),
      originalType: "well",
      name: opts.name || "Poço",
      draw: (ctx) => { drawBuilding(ctx, Object.assign({}, { originalType: "well" }, wellObject)); }
    };
  }

  wellObject.id = wellObject.id || wellObject.objectId || `well_${Date.now()}`;
  wellObject.originalType = (wellObject.originalType || "well").toLowerCase();
  wellObject.type = wellObject.type || "WELL";

  if (!placedWells.find(w => w.id === wellObject.id)) {
    placedWells.push(wellObject);
  }

  try {
    const exists = (typeof collisionSystem.getAnyObjectById === "function") ? collisionSystem.getAnyObjectById(wellObject.id) : null;
    if (!exists && typeof collisionSystem.addHitbox === "function") {
      collisionSystem.addHitbox(
        wellObject.id,
        "WELL",
        wellObject.x,
        wellObject.y,
        wellObject.width,
        wellObject.height,
        wellObject
      );
    }
  } catch (err) {
    handleWarn("Failed to add hitbox for well", "theWorld:placeWell:addHitbox", { wellId: wellObject.id, err });
  }

  markWorldChanged();
  return wellObject;
}

/**
 * Adds a new animal entity to the world
 * Creates AnimalEntity instance and registers with collision system
 * @param {string} assetName - Name of the animal asset (e.g., "Bull", "Turkey")
 * @param {HTMLImageElement} img - Sprite image for the animal
 * @param {number} x - Initial X position in world coordinates
 * @param {number} y - Initial Y position in world coordinates
 * @param {Object} opts - Optional parameters (suspicious, injury, stats, initialMood, etc.)
 * @returns {AnimalEntity} The created animal entity
 */
export function addAnimal(assetName, img, x, y, opts = {}) {
  if (!worldInitialized) {
    initializeWorld();
  }

  const animal = new AnimalEntity(assetName, img, x, y, opts);

  if (!animal.id) {
    animal.id = `animal_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  animals.push(animal);

  try {
    if (typeof collisionSystem.addHitbox === "function") {
      const hb = animal.getHitbox();
      collisionSystem.addHitbox(
        animal.id,
        "ANIMAL",
        hb.x,
        hb.y,
        hb.width,
        hb.height,
        animal
      );
      if (typeof collisionSystem.setInteractionHitboxBounds === "function") {
        const m = 0.1;
        collisionSystem.setInteractionHitboxBounds(
          animal.id,
          animal.x + animal.width * m,
          animal.y + animal.height * m,
          animal.width * (1 - 2 * m),
          animal.height * (1 - 2 * m)
        );
      }
    }
  } catch (e) {
    handleWarn("Failed to add hitbox for animal", "theWorld:addAnimal", { animalId: animal.id, assetName, err: e });
  }

  markWorldChanged();

  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('animalAdded', {
      detail: { animal }
    }));
  }

  return animal;
}

// Frame counter used to throttle hitbox sync for off-viewport animals.
// AI ticks (animal.update()) still run every frame — only the spatial-grid
// sync is skipped, since far-away animals rarely interact with anything.
let _updateFrame = 0;
const OFFSCREEN_HITBOX_INTERVAL = 5;  // sync 1× every 5 frames when off-screen

/**
 * Updates all animals in the world. AI tick runs every frame so behavior
 * states (eating, drinking, seeking) keep progressing. Spatial-grid hitbox
 * sync is throttled for off-viewport animals — that's the heaviest part
 * per frame and far animals don't need pixel-perfect collision.
 */
export function updateAnimals() {
  _updateFrame++;
  const shouldSyncOffscreen = (_updateFrame % OFFSCREEN_HITBOX_INTERVAL) === 0;

  for (const animal of animals) {
    if (!animal || typeof animal.update !== "function") continue;

    animal.update();

    if (!animal.id) continue;

    const visible = isInViewportWithBuffer(
      animal.x, animal.y, animal.width || 32, animal.height || 32,
    );
    if (!visible && !shouldSyncOffscreen) continue;

    try {
      const hb = animal.getHitbox();
      if (typeof collisionSystem.updateHitboxPosition === "function") {
        collisionSystem.updateHitboxPosition(animal.id, hb.x, hb.y, hb.width, hb.height);
      }
      if (typeof collisionSystem.setInteractionHitboxBounds === "function") {
        const m = 0.1;
        collisionSystem.setInteractionHitboxBounds(
          animal.id,
          animal.x + animal.width * m,
          animal.y + animal.height * m,
          animal.width * (1 - 2 * m),
          animal.height * (1 - 2 * m),
        );
      }
    } catch (err) {
      handleWarn("Failed to update hitbox for animal", "theWorld:updateAnimals", { animalId: animal.id, err });
    }
  }

  // Update quest cat (Madalena) — single instance, cheap.
  const milly = getSystem('npcMilly');
  if (milly && typeof milly.updateMadalena === 'function') {
    milly.updateMadalena();
  }
}

/**
 * Checks if an object is within the viewport plus culling buffer
 * Used for frustum culling optimization to skip rendering off-screen objects
 * @param {number} x - Object X position in world coordinates
 * @param {number} y - Object Y position in world coordinates
 * @param {number} width - Object width in pixels
 * @param {number} height - Object height in pixels
 * @returns {boolean} True if object is visible or within buffer zone
 */
function isInViewportWithBuffer(x, y, width, height) {
  const camX = camera.x;
  const camY = camera.y;
  const camW = camera.width;
  const camH = camera.height;

  return (x + width + CULLING_BUFFER) > camX &&
         x < (camX + camW + CULLING_BUFFER) &&
         (y + height + CULLING_BUFFER) > camY &&
         y < (camY + camH + CULLING_BUFFER);
}

// Y-sort comparator extracted for reuse between static and per-frame sorts.
function _ySortCompare(a, b) {
  const aSrc = a.original || a;
  const bSrc = b.original || b;
  const ay = (aSrc.y || 0) + (aSrc.height || 0);
  const by = (bSrc.y || 0) + (bSrc.height || 0);
  const diff = ay - by;
  const al = a.layerIndex;
  const bl = b.layerIndex;
  if (al !== undefined && bl !== undefined && al !== bl && Math.abs(diff) < 30) {
    return al - bl;
  }
  return diff;
}

// Wrap static objects into the sorted-cache representation. Pulled out so
// rebuildStaticCache stays readable.
function _wrapTree(t) {
  if (!t.id) t.id = `tree_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return _getOrCreateWrapper(t, (x) => ({
    id: x.id, type: "TREE", originalType: "tree",
    x: x.x || 0, y: x.y || 0,
    width: x.width || 64, height: x.height || 96,
    hp: x.hp || 6, maxHealth: x.hp || 6,
    draw: (ctx) => drawSingleObject(ctx, x, "trees", drawTreeFallback),
  }));
}
function _wrapRock(r) {
  if (!r.id) r.id = `rock_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return _getOrCreateWrapper(r, (x) => ({
    id: x.id, type: "ROCK", originalType: "rock",
    x: x.x || 0, y: x.y || 0,
    width: x.width || 48, height: x.height || 48,
    hp: x.hp || 3, maxHealth: x.hp || 3,
    draw: (ctx) => drawSingleObject(ctx, x, "rocks", drawRockFallback),
  }));
}
function _wrapThicket(th) {
  if (!th.id) th.id = `thicket_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return _getOrCreateWrapper(th, (x) => ({
    id: x.id, type: "THICKET", originalType: "thicket",
    x: x.x || 0, y: x.y || 0,
    width: x.width || 32, height: x.height || 32,
    hp: x.hp || 1, maxHealth: x.hp || 1,
    draw: (ctx) => drawSingleObject(ctx, x, "thickets", drawThicketFallback),
  }));
}
function _wrapBuilding(b) {
  return _getOrCreateWrapper(b, (x) => ({
    ...x,
    type: x.type || "CONSTRUCTION",
    draw: (ctx) => { if (x.draw) x.draw(ctx); else drawBuilding(ctx, x); },
  }));
}
function _wrapWell(w) {
  return _getOrCreateWrapper(w, (x) => ({
    ...x,
    type: "WELL", originalType: "well",
    draw: (ctx) => {
      if (x.draw) x.draw(ctx);
      else drawBuilding(ctx, Object.assign({}, x, { originalType: "well" }));
    },
  }));
}
function _wrapHouse(h) {
  if (!h.id) h.id = `house_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return _getOrCreateWrapper(h, (x) => ({
    id: x.id, type: x.type, originalType: "house",
    x: x.x || 0, y: x.y || 0,
    width: x.width || 128, height: x.height || 128,
    interactable: x.type === "HOUSE_WALLS",
    draw: (ctx) => {
      if (x.type === "HOUSE_WALLS") drawHouseWalls(ctx, x);
      else drawHouseRoof(ctx, x);
    },
  }));
}
function _wrapTomb(tb, tombSys) {
  return _getOrCreateWrapper(tb, (x) => ({
    id: x.id, type: 'TOMB', originalType: 'tomb',
    x: x.x || 0, y: x.y || 0,
    width: x.width || 48, height: x.height || 48,
    draw: (ctx) => { if (typeof tombSys.drawSingle === 'function') tombSys.drawSingle(ctx, x); },
  }));
}
function _wrapAnimal(a) {
  if (!a.id) a.id = `animal_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return _getOrCreateWrapper(a, (x) => ({
    type: "ANIMAL", id: x.id,
    x: x.x || 0, y: x.y || 0,
    width: x.width || 32, height: x.height || 32,
    assetName: x.assetName,
    draw: (ctx, frameNow) => {
      try { x.draw(ctx, camera, frameNow); }
      catch (e) { handleWarn("Failed to draw animal", "theWorld:animalDraw", { animalId: x.id, err: e }); }
    },
  }));
}

/**
 * Rebuilds the static render grid. Runs only when markWorldChanged fires.
 * Inserts each static wrapper into every grid cell it touches, so per-frame
 * viewport queries return only the small subset that's actually visible.
 */
function rebuildStaticCache() {
  perfLog("rebuilding static world grid");
  _renderGrid.clear();
  for (const t of trees)             _addToRenderGrid(_wrapTree(t));
  for (const r of rocks)             _addToRenderGrid(_wrapRock(r));
  for (const th of thickets)         _addToRenderGrid(_wrapThicket(th));
  for (const b of placedBuildings)   _addToRenderGrid(_wrapBuilding(b));
  for (const w of placedWells)       _addToRenderGrid(_wrapWell(w));
  for (const h of houses)            _addToRenderGrid(_wrapHouse(h));

  const tombSys = getSystem('animalTomb');
  if (tombSys && typeof tombSys.getTombs === 'function') {
    for (const tb of tombSys.getTombs()) _addToRenderGrid(_wrapTomb(tb, tombSys));
  }

  staticCacheValid = true;
}

/**
 * Returns the per-frame visible world objects, Y-sorted for depth render.
 * Statics live in a spatial grid (cells of RENDER_CELL_SIZE) rebuilt only
 * on world mutation. Per frame we query just the cells the viewport covers
 * — cost is independent of world size. Dynamics (animals/player/NPCs) are
 * filtered and inserted each frame, then a single small sort merges them
 * with the visible statics.
 */
export function getSortedWorldObjects(player) {
  if (!staticCacheValid) rebuildStaticCache();

  const out = _frameList;
  out.length = 0;

  const vxMin = camera.x - CULLING_BUFFER;
  const vyMin = camera.y - CULLING_BUFFER;
  const vxMax = camera.x + camera.width + CULLING_BUFFER;
  const vyMax = camera.y + camera.height + CULLING_BUFFER;

  // 1. Query render grid for cells overlapping viewport. Dedup objects that
  //    span multiple cells via a per-frame Set (cheaper than scanning all
  //    statics in the world).
  const minCX = Math.floor(vxMin / RENDER_CELL_SIZE);
  const minCY = Math.floor(vyMin / RENDER_CELL_SIZE);
  const maxCX = Math.floor(vxMax / RENDER_CELL_SIZE);
  const maxCY = Math.floor(vyMax / RENDER_CELL_SIZE);
  const seen = _frameSeen;
  seen.clear();
  for (let cx = minCX; cx <= maxCX; cx++) {
    for (let cy = minCY; cy <= maxCY; cy++) {
      const cell = _renderGrid.get(_rgKey(cx, cy));
      if (!cell) continue;
      for (let i = 0; i < cell.length; i++) {
        const obj = cell[i];
        if (seen.has(obj)) continue;
        seen.add(obj);
        // Tight viewport check — grid cells include partial-overlap, so
        // some candidates may be just outside the actual viewport.
        const src = obj.original || obj;
        const sx = src.x || 0, sy = src.y || 0;
        const sw = src.width || 32, sh = src.height || 32;
        if (sx + sw > vxMin && sx < vxMax && sy + sh > vyMin && sy < vyMax) {
          out.push(obj);
        }
      }
    }
  }

  // 2. Animals — filter visible (most are off-screen at scale)
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    if (!a) continue;
    const ax = a.x || 0, ay = a.y || 0;
    const aw = a.width || 32, ah = a.height || 32;
    if (!(ax + aw > vxMin && ax < vxMax && ay + ah > vyMin && ay < vyMax)) continue;
    out.push(_wrapAnimal(a));
  }

  // 3. Player (reused wrapper — position refreshed each frame)
  if (player) {
    _playerWrapper._p = player;
    _playerWrapper.x = player.x;
    _playerWrapper.y = player.y;
    _playerWrapper.width = player.width;
    _playerWrapper.height = player.height;
    out.push(_playerWrapper);
  }

  // 4. City objects (rare — only in city map)
  const mgr = getMapManager();
  if (mgr && mgr.getCurrentMapId() === 'city') {
    const cr = getCityRendererSync();
    if (cr) {
      const cityObjs = cr.getCityObjects();
      for (let i = 0; i < cityObjs.length; i++) out.push(cityObjs[i]);
    }
  }

  // 5. NPCs
  const npcSys = getSystem('npc');
  if (npcSys && mgr) {
    const npcObjs = npcSys.getWorldObjects(mgr.getCurrentMapId());
    for (let i = 0; i < npcObjs.length; i++) out.push(npcObjs[i]);
  }

  // 6. Quest cat
  const milly = getSystem('npcMilly');
  if (milly && mgr && typeof milly.getCatWorldObjects === 'function') {
    const catObjs = milly.getCatWorldObjects(mgr.getCurrentMapId());
    for (let i = 0; i < catObjs.length; i++) out.push(catObjs[i]);
  }

  // 7. Portal (high Y forces it on top of everything) — reused wrapper
  if (mgr) {
    _portalWrapper._mgr = mgr;
    out.push(_portalWrapper);
  }

  // Final Y-sort. Input is small (~50-150 items even on a packed farm)
  // because the grid query already trimmed off-screen statics.
  out.sort(_ySortCompare);
  return out;
}

/**
 * Dispatches events for all world objects to register with other systems
 * Used for interaction system and other systems that need object references
 * @returns {void}
 */
export function registerWorldObjects() {
  trees.forEach(tree => {
    document.dispatchEvent(new CustomEvent("worldObjectAdded", {
      detail: {
        object: {
          id: tree.id || generateId(),
          type: "tree",
          subType: tree.subType || "Árvore",
          x: tree.x || 0, y: tree.y || 0,
          width: tree.width || 64, height: tree.height || 96,
          radius: 50
        }
      }
    }));
  });

  rocks.forEach(rock => {
    document.dispatchEvent(new CustomEvent("worldObjectAdded", {
      detail: {
        object: {
          id: rock.id || generateId(),
          type: "rock",
          subType: rock.subType || "Pedra",
          x: rock.x || 0, y: rock.y || 0,
          width: rock.width || 48, height: rock.height || 48,
          radius: 50
        }
      }
    }));
  });

  thickets.forEach(thicket => {
    document.dispatchEvent(new CustomEvent("worldObjectAdded", {
      detail: {
        object: {
          id: thicket.id || generateId(),
          type: "thicket",
          subType: thicket.subType || "Thicket",
          x: thicket.x || 0, y: thicket.y || 0,
          width: thicket.width || 32, height: thicket.height || 32,
          radius: 50
        }
      }
    }));
  });

  placedBuildings.forEach(building => {
    document.dispatchEvent(new CustomEvent("worldObjectAdded", { detail: { object: building } }));
  });

  placedWells.forEach(well => {
    document.dispatchEvent(new CustomEvent("worldObjectAdded", {
      detail: {
        object: {
          id: well.id || generateId(),
          type: "well",
          originalType: well.originalType || "well",
          name: well.name || "Poço",
          x: well.x || 0, y: well.y || 0,
          width: well.width || 64, height: well.height || 64,
          radius: well.radius || 32
        }
      }
    }));
  });
}

/**
 * Generates a unique ID for world objects
 * @returns {string} Unique identifier string
 */
function generateId() {
  return "obj_" + Math.random().toString(36).slice(2, 11);
}

/**
 * Draws a single nature object (tree, rock, thicket) with proper scaling
 * Handles viewport culling, asset loading, and fallback rendering
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {Object} obj - Object to draw with position and type info
 * @param {string} assetCategory - Asset category key ("trees", "rocks", "thickets")
 * @param {Function} drawFallback - Fallback drawing function if asset unavailable
 * @returns {void}
 */
function drawSingleObject(ctx, obj, assetCategory, drawFallback) {
  const objWidth = obj.width || 64;
  const objHeight = obj.height || 96;

  // Defensive viewport check — getSortedWorldObjects already filters,
  // but keep this so callers outside the sorted path (debug, etc.) don't
  // pay for off-screen draws.
  try {
    if (camera?.isInViewport && !camera.isInViewport(obj.x || 0, obj.y || 0, objWidth, objHeight)) return;
  } catch (_) { /* ignore — fall through */ }

  let actualWidth, actualHeight;
  if (assetCategory === "trees") {
    actualWidth = WORLD_GENERATOR_CONFIG.TREES.WIDTH;
    actualHeight = WORLD_GENERATOR_CONFIG.TREES.HEIGHT;
  } else if (assetCategory === "rocks") {
    actualWidth = WORLD_GENERATOR_CONFIG.ROCKS.WIDTH;
    actualHeight = WORLD_GENERATOR_CONFIG.ROCKS.HEIGHT;
  } else if (assetCategory === "thickets") {
    actualWidth = WORLD_GENERATOR_CONFIG.THICKETS.WIDTH;
    actualHeight = WORLD_GENERATOR_CONFIG.THICKETS.HEIGHT;
  }

  const zoom = CAMERA_ZOOM;
  const zoomedWidth = actualWidth * zoom;
  const zoomedHeight = actualHeight * zoom;

  let screenPos;
  try {
    screenPos = camera.worldToScreen(obj.x || 0, obj.y || 0);
  } catch (e) {
    handleWarn("Erro ao obter imagem do asset", "theWorld:drawSingleObject:worldToScreen", e);
    screenPos = { x: obj.x || 0, y: obj.y || 0 };
  }

  const drawX = Math.floor(screenPos.x);
  const drawY = Math.floor(screenPos.y);
  const drawW = Math.floor(zoomedWidth);
  const drawH = Math.floor(zoomedHeight);

  const adjustedX = drawX - (drawW - objWidth * zoom) / 2;
  const adjustedY = drawY - (drawH - objHeight * zoom) / 2;

  let img = null;
  try {
    const cat = assets.nature?.[assetCategory];
    if (Array.isArray(cat)) {
      const idx = typeof obj.type === "number" ? obj.type : 0;
      img = cat[idx]?.img || cat[0]?.img;
    } else {
      img = cat?.[obj.type]?.img;
    }
  } catch (err) {
    handleWarn("Erro ao obter imagem do asset", "theWorld:renderObject", err);
    img = null;
  }

  if (img && img.complete) {
    try {
      ctx.drawImage(img, adjustedX, adjustedY, drawW, drawH);
      return;
    } catch (err) {
      handleWarn("Failed to draw object image", "theWorld:drawSingleObject:drawImage", { assetCategory, err });
    }
  }

  if (typeof drawFallback === "function") {
    drawFallback(ctx, adjustedX, adjustedY, drawW, drawH);
  }
}

/**
 * Draws a simple chest fallback when asset is not available
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {number} x - Screen X position
 * @param {number} y - Screen Y position
 * @param {number} width - Draw width in pixels
 * @param {number} height - Draw height in pixels
 * @returns {void}
 */
function drawSimpleChest(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#654321";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = "#A0522D";
  ctx.fillRect(x + 3, y, width - 6, height * 0.15);
  ctx.fillStyle = "#DAA520";
  ctx.beginPath();
  ctx.arc(x + width / 2, y + height / 2, width * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a building or construction object (chest, well, fence, etc.)
 * Handles multiple building types with appropriate assets or fallbacks
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {Object} building - Building object with position and type info
 * @returns {void}
 */
function drawBuilding(ctx, building) {
  const bWidth = building.width || 32;
  const bHeight = building.height || 32;

  try {
    if (camera?.isInViewport && !camera.isInViewport(building.x || 0, building.y || 0, bWidth, bHeight)) return;
  } catch (e) {
    handleWarn("Failed to check viewport for building", "theWorld:drawBuilding:viewport", { buildingId: building.id, err: e });
  }

  let screenPos;
  try {
    screenPos = camera.worldToScreen(building.x || 0, building.y || 0);
  } catch (e) {
    handleWarn("Failed to convert world to screen for building", "theWorld:drawBuilding:worldToScreen", { buildingId: building.id, err: e });
    screenPos = { x: building.x || 0, y: building.y || 0 };
  }

  const zoom = CAMERA_ZOOM;
  const drawX = Math.floor(screenPos.x);
  const drawY = Math.floor(screenPos.y);
  const drawW = Math.floor(bWidth * zoom);
  const drawH = Math.floor(bHeight * zoom);

  ctx.save(); // fix: canvas context reset — isolate building draw state

  if (building.originalType === "chest") {
    const chestImg = assets.furniture?.chest?.img;
    if (chestImg && chestImg.src && !chestImg.src.includes("data:,")) {
      try {
        ctx.drawImage(chestImg, drawX, drawY, drawW, drawH);
        ctx.restore();
        return;
      } catch (e) {
        handleWarn("Failed to draw chest image", "theWorld:drawBuilding:chestImage", { buildingId: building.id, err: e });
      }
    }
    drawSimpleChest(ctx, drawX, drawY, drawW, drawH);
    ctx.restore();
    return;
  }

  if (building.originalType === "well") {
    const wellImg = assets.furniture?.well?.img;
    if (wellImg && wellImg.complete && wellImg.naturalWidth > 0) {
      try {
        ctx.drawImage(wellImg, drawX, drawY, drawW, drawH);
      } catch (err) {
        handleWarn("Failed to draw well image", "theWorld:drawBuilding:wellImage", { buildingId: building.id, err });
        ctx.fillStyle = "#4a6b8a";
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.strokeStyle = "#2d4052";
        ctx.strokeRect(drawX, drawY, drawW, drawH);
      }
    } else {
      ctx.fillStyle = "#4a6b8a";
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.strokeStyle = "#2d4052";
      ctx.strokeRect(drawX, drawY, drawW, drawH);
    }
    ctx.restore();
    return;
  }

  if (building.originalType === "foodtrough") {
    // Variant encodes species + orientation (e.g. foodTroughcattleX).
    // Use the "full" sprite if EITHER bar has content; only switch to
    // Empty when both basic and premium bars are zero.
    const baseVariant = building.variant || 'foodTroughcattleX';
    const hasAnyFood = (building.foodLevel || 0) > 0 || (building.premiumLevel || 0) > 0;
    const foodAssetKey = hasAnyFood ? baseVariant : `${baseVariant}Empty`;
    const foodTroughImg = assets.furniture?.foodTroughs?.[foodAssetKey]?.img;

    if (foodTroughImg && foodTroughImg.complete && foodTroughImg.naturalWidth > 0) {
      try {
        ctx.drawImage(foodTroughImg, drawX, drawY, drawW, drawH);
      } catch (err) {
        handleWarn("Failed to draw food trough image", "theWorld:drawBuilding:foodTroughImage", { buildingId: building.id, err });
        ctx.fillStyle = "#8B7355";
        ctx.fillRect(drawX, drawY, drawW, drawH);
      }
    } else {
      ctx.fillStyle = (building.foodLevel || 0) > 0 ? "#c8a464" : "#8B7355";
      ctx.fillRect(drawX, drawY, drawW, drawH);
    }
    ctx.restore();
    return;
  }

  if (building.originalType === "watertrough") {
    const isWaterY = building.variant === 'waterTroughY';
    const waterAssetKey = building.waterLevel > 0
      ? (isWaterY ? 'waterTroughY' : 'waterTroughX')
      : (isWaterY ? 'waterTroughYEmpty' : 'waterTroughXEmpty');
    const waterTroughImg = assets.furniture?.waterTroughs?.[waterAssetKey]?.img;
    
    if (waterTroughImg && waterTroughImg.complete && waterTroughImg.naturalWidth > 0) {
      try {
        ctx.drawImage(waterTroughImg, drawX, drawY, drawW, drawH);
      } catch (err) {
        handleWarn("Failed to draw water trough image", "theWorld:drawBuilding:waterTroughImage", { buildingId: building.id, err });
        ctx.fillStyle = "#8B7355";
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.strokeStyle = "#5D4E37";
        ctx.strokeRect(drawX, drawY, drawW, drawH);
      }
    } else {
      ctx.fillStyle = building.waterLevel > 0 ? "#87CEEB" : "#8B7355";
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.strokeStyle = building.waterLevel > 0 ? "#4682B4" : "#5D4E37";
      ctx.strokeRect(drawX, drawY, drawW, drawH);
    }
    ctx.restore();
    return;
  }

  if (building.variant && assets.furniture?.fences?.[building.variant]?.img) {
    const fenceImg = assets.furniture.fences[building.variant].img;
    if (fenceImg && fenceImg.complete && fenceImg.naturalWidth > 0) {
      ctx.drawImage(fenceImg, drawX, drawY, drawW, drawH);
    } else {
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(drawX, drawY, drawW, drawH);
    }
  } else {
    ctx.fillStyle = "rgba(139, 69, 19, 0.9)";
    ctx.fillRect(drawX, drawY, drawW, drawH);
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX, drawY, drawW, drawH);

    if (building.icon) {
      ctx.font = `${Math.max(16, drawH * 0.4)}px Arial`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(building.icon, drawX + drawW / 2, drawY + drawH / 2);
    }
  }

  if (getDebugFlag('hitboxes') && building.originalType !== "chest") {
    ctx.fillStyle = "#fff";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(building.name || "Objeto", drawX + drawW / 2, drawY - 8);
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(drawX, drawY, drawW, drawH);
    ctx.setLineDash([]);
    ctx.fillStyle = "#ff0000";
    ctx.font = "8px Arial";
    ctx.fillText(`Tipo: ${building.originalType || "construction"}`, drawX + 5, drawY + 12);
  }

  ctx.restore();
}

/**
 * Draws the build system preview if build mode is active
 * Shows placement preview before confirming building placement
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @returns {void}
 */
export function drawBuildPreview(ctx) {
  const BuildSystem = getSystem('build');
  if (BuildSystem && BuildSystem.active) {
    BuildSystem.drawPreview(ctx);
  }
}

/**
 * Draws the roof portion of a house structure
 * Houses are split into roof and walls for proper depth sorting
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {Object} house - House object with position and dimensions
 * @returns {void}
 */
function drawHouseRoof(ctx, house) {
  const hWidth = house.width || 128;
  const hHeight = house.height || 128;

  try {
    if (camera?.isInViewport && !camera.isInViewport(house.x || 0, house.y || 0, hWidth, hHeight)) return;
  } catch (e) {
    handleWarn("Failed to check viewport for house roof", "theWorld:drawHouseRoof:viewport", { houseId: house.id, err: e });
  }

  const img = assets.buildings?.house?.[0]?.img;
  const zoom = CAMERA_ZOOM;

  let screenPos;
  try {
    screenPos = camera.worldToScreen(house.x || 0, house.y || 0);
  } catch (e) {
    handleWarn("Failed to convert world to screen for house roof", "theWorld:drawHouseRoof:worldToScreen", { houseId: house.id, err: e });
    screenPos = { x: house.x || 0, y: house.y || 0 };
  }

  const drawX = Math.floor(screenPos.x);
  const drawY = Math.floor(screenPos.y);
  const drawW = Math.floor(hWidth * zoom);
  const drawH = Math.floor(hHeight * zoom);

  if (!img) {
    drawHouseRoofFallback(ctx, drawX, drawY, drawW, drawH);
    return;
  }

  const roofSrcHeight = Math.round(img.height * (hHeight / WORLD_GENERATOR_CONFIG.HOUSES.HEIGHT));
  ctx.drawImage(img, 0, 0, img.width, roofSrcHeight, drawX, drawY, drawW, drawH);
}

/**
 * Draws the walls portion of a house structure
 * Walls are the interactable part where player can enter
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {Object} house - House object with position and dimensions
 * @returns {void}
 */
function drawHouseWalls(ctx, house) {
  const hWidth = house.width || 128;
  const hHeight = house.height || 128;

  try {
    if (camera?.isInViewport && !camera.isInViewport(house.x || 0, house.y || 0, hWidth, hHeight)) return;
  } catch (e) {
    handleWarn("Failed to check viewport for house walls", "theWorld:drawHouseWalls:viewport", { houseId: house.id, err: e });
  }

  const img = assets.buildings?.house?.[0]?.img;
  const zoom = CAMERA_ZOOM;

  let screenPos;
  try {
    screenPos = camera.worldToScreen(house.x || 0, house.y || 0);
  } catch (e) {
    handleWarn("Failed to convert world to screen for house walls", "theWorld:drawHouseWalls:worldToScreen", { houseId: house.id, err: e });
    screenPos = { x: house.x || 0, y: house.y || 0 };
  }

  const drawX = Math.floor(screenPos.x);
  const drawY = Math.floor(screenPos.y);
  const drawW = Math.floor(hWidth * zoom);
  const drawH = Math.floor(hHeight * zoom);

  if (!img) {
    drawHouseWallsFallback(ctx, drawX, drawY, drawW, drawH);
    return;
  }

  const totalRef = WORLD_GENERATOR_CONFIG.HOUSES.HEIGHT;
  const wallRatio = hHeight / totalRef;
  const roofPortion = 1 - wallRatio;
  const srcRoofHeight = Math.round(img.height * roofPortion);
  const srcH = Math.round(img.height * wallRatio);

  ctx.drawImage(img, 0, srcRoofHeight, img.width, srcH, drawX, drawY, drawW, drawH);
}

function drawHouseWallsFallback(ctx, x, y, width, height) {
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#654321";
  ctx.fillRect(x + width * 0.4, y + height * 0.4, width * 0.2, height * 0.6);
}
function drawHouseRoofFallback(ctx, x, y, width, height) {
  ctx.fillStyle = "#FF0000";
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x + width / 2, y);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();
}

/**
 * Initializes the game world by generating terrain and registering hitboxes
 * Clears all existing objects and collision data before regenerating
 * @returns {void}
 */
export function initializeWorld() {
  collisionSystem.clear();

  trees.length = 0;
  rocks.length = 0;
  thickets.length = 0;
  houses.length = 0;
  placedBuildings.length = 0;
  placedWells.length = 0;
  animals.length = 0;

  staticCacheValid = false;

  const worldObjects = (worldGenerator && typeof worldGenerator.generateWorld === "function")
    ? worldGenerator.generateWorld()
    : { trees: [], rocks: [], thickets: [], houses: [] };

  trees.push(...(worldObjects.trees || []));
  rocks.push(...(worldObjects.rocks || []));
  thickets.push(...(worldObjects.thickets || []));
  houses.push(...(worldObjects.houses || []));

  for (const tree of trees) { 
    try { 
      collisionSystem.addHitbox(tree.id, "TREE", tree.x, tree.y, tree.width, tree.height); 
    } catch (e) {
      handleWarn("Failed to add hitbox for tree", "theWorld:initializeWorld:treeHitbox", { treeId: tree.id, err: e });
    }
  }
  for (const rock of rocks) { 
    try { 
      collisionSystem.addHitbox(rock.id, "ROCK", rock.x, rock.y, rock.width, rock.height); 
    } catch (e) {
      handleWarn("Failed to add hitbox for rock", "theWorld:initializeWorld:rockHitbox", { rockId: rock.id, err: e });
    }
  }
  for (const thicket of thickets) { 
    try { 
      collisionSystem.addHitbox(thicket.id, "THICKET", thicket.x, thicket.y, thicket.width, thicket.height); 
    } catch (e) {
      handleWarn("Failed to add hitbox for thicket", "theWorld:initializeWorld:thicketHitbox", { thicketId: thicket.id, err: e });
    }
  }

  for (const house of houses) {
    if (house.type === "HOUSE_WALLS") {
      try { 
        collisionSystem.addHitbox(house.id, "HOUSE_WALLS", house.x, house.y, house.width, house.height); 
      } catch (e) {
        handleWarn("Failed to add hitbox for house walls", "theWorld:initializeWorld:houseHitbox", { houseId: house.id, err: e });
      }
    }
  }

  if (Array.isArray(worldObjects.wells) && worldObjects.wells.length) {
    for (const w of worldObjects.wells) {
      const id = w.id || generateId();
      const wellObj = {
        id,
        x: w.x, y: w.y,
        width: w.width || (w.w || 64),
        height: w.height || (w.h || 64),
        originalType: "well",
        name: w.name || "Poço"
      };
      placedWells.push(wellObj);
      try { 
        collisionSystem.addHitbox(wellObj.id, "WELL", wellObj.x, wellObj.y, wellObj.width, wellObj.height); 
      } catch (e) {
        handleWarn("Failed to add hitbox for generated well", "theWorld:initializeWorld:wellHitbox", { wellId: wellObj.id, err: e });
      }
    }
  }

  registerWorldObjects();
  worldInitialized = true;
}

/**
 * Removes a destroyed object from the world and collision system
 * @param {string|Object} objOrId - Object ID string or object with id property
 * @returns {void}
 */
export function objectDestroyed(objOrId) {
  if (!objOrId) return;

  const id =
    typeof objOrId === "string"
      ? objOrId
      : (objOrId?.id ?? null);

  const removeFrom = (arr) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const o = arr[i];
      if (!o) continue;

      // remove por id (principal)
      if (id !== null && o.id === id) {
        arr.splice(i, 1);
        continue;
      }

      // remove por referência (caso do teste do rock)
      if (typeof objOrId === "object" && o === objOrId) {
        arr.splice(i, 1);
        continue;
      }
    }
  };

  removeFrom(trees);
  removeFrom(rocks);
  removeFrom(thickets);
  removeFrom(houses);
  removeFrom(placedBuildings);
  removeFrom(placedWells);
  removeFrom(animals);

  try { 
    if (id) collisionSystem.removeHitbox(id); 
  } catch (err) {
    handleWarn("Failed to remove hitbox", "theWorld:objectDestroyed", { id, err });
  }

  markWorldChanged();

  document.dispatchEvent(new CustomEvent("objectDestroyed", { detail: { id, type: typeof objOrId === "object" ? objOrId?.type : null } }));
}

/**
 * Returns the initial spawn position for the player
 * Spawns near the house if available, otherwise at world center
 * @returns {{x: number, y: number}} Player spawn coordinates
 */
export function getInitialPlayerPosition() {
  if (!houses.length) {
    return {
      x: (WORLD_WIDTH * TILE_SIZE) / 2,
      y: (WORLD_HEIGHT * TILE_SIZE) / 2
    };
  }

  // Prefer a HOUSE_WALLS entry if present; otherwise use the most recently added house.
  const preferred =
    [...houses].reverse().find(h => h && h.type === 'HOUSE_WALLS') ||
    houses[houses.length - 1];

  const hx = Number(preferred?.x) || 0;
  const hy = Number(preferred?.y) || 0;

  // Spawn slightly offset from the chosen house
  return { x: hx + 50, y: hy + 50 };
}

/**
 * Draws the world background including sky fill and grass tiles
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @returns {void}
 */
export function drawBackground(ctx) {
  const mgr = getMapManager();
  const bgColor = mgr ? mgr.getCurrentMap().bgColor : '#5a9367';
  const useGrass = mgr ? mgr.getCurrentMap().useGrass : true;
  const mapId = mgr ? mgr.getCurrentMapId() : 'farm';

  try {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  } catch (e) {
    handleWarn("Failed to draw background fill", "theWorld:drawBackground:fill", { err: e });
    return;
  }

  if (mapId === 'city') {
    // Draw city tiles on top of the flat color
    const cr = getCityRendererSync();
    if (cr) {
      try { cr.drawCityBackground(ctx); } catch (e) {
        handleWarn("Failed to draw city background", "theWorld:drawBackground:city", { err: e });
      }
    }
  } else if (useGrass) {
    try {
      drawGrass(ctx);
    } catch (e) {
      handleWarn("Failed to draw grass", "theWorld:drawBackground:grass", { err: e });
    }
  }
}

// Offscreen canvas cache para grass tiles
let _grassCache = null;

/** Invalida o cache de grass (chamado em transições de mapa) */
export function invalidateGrassCache() {
  _grassCache = null;
}

function _ensureGrassCache() {
  // Buffer extra em tiles ao redor do viewport para evitar re-renders frequentes
  const BUFFER_TILES = 10;
  const camX = camera?.x ?? 0;
  const camY = camera?.y ?? 0;
  const camW = camera?.width ?? GAME_WIDTH;
  const camH = camera?.height ?? GAME_HEIGHT;

  const startCol = Math.max(0, Math.floor((camX - CULLING_BUFFER) / TILE_SIZE) - BUFFER_TILES);
  const endCol = Math.min(Math.ceil(WORLD_WIDTH / TILE_SIZE),
    Math.ceil((camX + camW + CULLING_BUFFER) / TILE_SIZE) + BUFFER_TILES);
  const startRow = Math.max(0, Math.floor((camY - CULLING_BUFFER) / TILE_SIZE) - BUFFER_TILES);
  const endRow = Math.min(Math.ceil(WORLD_HEIGHT / TILE_SIZE),
    Math.ceil((camY + camH + CULLING_BUFFER) / TILE_SIZE) + BUFFER_TILES);

  // Reusar cache se a região atual ainda está dentro da região cacheada
  if (_grassCache &&
      startCol >= _grassCache.startCol && endCol <= _grassCache.endCol &&
      startRow >= _grassCache.startRow && endRow <= _grassCache.endRow) {
    return _grassCache;
  }

  const cols = endCol - startCol;
  const rows = endRow - startRow;
  const w = cols * ZOOMED_TILE_SIZE_INT;
  const h = rows * ZOOMED_TILE_SIZE_INT;

  let offCanvas, offCtx;
  if (_grassCache && _grassCache.canvas.width >= w && _grassCache.canvas.height >= h) {
    offCanvas = _grassCache.canvas;
    offCtx = _grassCache.ctx;
    offCtx.clearRect(0, 0, w, h);
  } else {
    offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    offCtx = offCanvas.getContext('2d', { alpha: false });
  }

  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const drawX = (x - startCol) * ZOOMED_TILE_SIZE_INT;
      const drawY = (y - startRow) * ZOOMED_TILE_SIZE_INT;

      if (assets.nature?.floor?.length > 0) {
        const grassType = (x + y) % assets.nature.floor.length;
        const grassAsset = assets.nature.floor[grassType];
        if (grassAsset?.img?.complete) {
          offCtx.drawImage(grassAsset.img, drawX, drawY, ZOOMED_TILE_SIZE_INT, ZOOMED_TILE_SIZE_INT);
          continue;
        }
      }

      offCtx.fillStyle = (x + y) % 2 === 0 ? "#5a9367" : "#528a5e";
      offCtx.fillRect(drawX, drawY, ZOOMED_TILE_SIZE_INT, ZOOMED_TILE_SIZE_INT);
    }
  }

  _grassCache = { canvas: offCanvas, ctx: offCtx, startCol, endCol, startRow, endRow };
  return _grassCache;
}

function drawGrass(ctx) {
  const cache = _ensureGrassCache();

  const toScreen = (typeof worldToScreenFast === "function")
    ? worldToScreenFast
    : (x, y) => (camera?.worldToScreen ? camera.worldToScreen(x, y) : { x, y });

  // Uma única drawImage ao invés de centenas
  const origin = toScreen(cache.startCol * TILE_SIZE, cache.startRow * TILE_SIZE);
  const cols = cache.endCol - cache.startCol;
  const rows = cache.endRow - cache.startRow;
  ctx.drawImage(cache.canvas,
    0, 0, cols * ZOOMED_TILE_SIZE_INT, rows * ZOOMED_TILE_SIZE_INT,
    Math.floor(origin.x), Math.floor(origin.y),
    cols * ZOOMED_TILE_SIZE_INT, rows * ZOOMED_TILE_SIZE_INT);
}

/* fallbacks simples para natureza */
function drawTreeFallback(ctx, x, y, width, height) {
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(x + width * 0.35, y + height * 0.5, width * 0.3, height * 0.5);
  ctx.fillStyle = "#228B22";
  ctx.beginPath();
  ctx.arc(x + width * 0.5, y + height * 0.3, width * 0.45, 0, Math.PI * 2);
  ctx.fill();
}
function drawRockFallback(ctx, x, y, width, height) {
  ctx.fillStyle = "#696969";
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, width / 2.5, height / 3, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawThicketFallback(ctx, x, y, width, height) {
  ctx.fillStyle = "#006400";
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, width / 2.5, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Normalizes a placed object's type into its collision-type label. Shared by
 * addWorldObject (placement) and importWorldState (save/load), so restored
 * fences/chests/wells/troughs get the exact same collision shape they had
 * when placed.
 */
function getPlacedBuildingCollisionType(objectData) {
  const raw = (objectData.originalType || objectData.type || "construction").toString().toUpperCase();
  const lower = raw.toLowerCase();
  if (lower === "chest") return "CHEST";
  if (lower === "well") return "WELL";
  if (lower === "watertroughx") return "WATERTROUGHX";
  if (lower === "watertroughy") return "WATERTROUGHY";
  if (lower === "fencex") return "FENCEX";
  if (lower === "fencey") return "FENCEY";
  if (lower === "fence") return "FENCE";
  // Issue #171: food troughs use generic FOODTROUGH for collision. Variant
  // and species live on the object itself, not in the collision label.
  if (raw === "FOODTROUGH" || raw === "FOODTROUGHX" || raw === "FOODTROUGHY") return "FOODTROUGH";
  if (raw === "FURNITURE") return "CONSTRUCTION";
  if (!["CHEST", "WELL", "CONSTRUCTION", "FENCE", "FENCEX", "FENCEY", "WATERTROUGHX", "WATERTROUGHY", "FOODTROUGH", "HOUSE_WALLS"].includes(raw)) return "CONSTRUCTION";
  return raw;
}

/* função global útil para adicionar objetos dinâmicos */
window.addWorldObject = function(objectData) {
  const objectId = objectData.id || `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const collisionType = getPlacedBuildingCollisionType(objectData);

  return collisionType;
}

/* função global útil para adicionar objetos dinâmicos */
window.addWorldObject = function(objectData) {
  const objectId = objectData.id || `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const collisionType = getPlacedBuildingCollisionType(objectData);

  const building = {
    // Preserve ANY custom fields from objectData (species, targetAnimals,
    // foodLevel, premiumLevel, waterLevel, etc.). Without this spread,
    // future systems would silently lose data and we'd play whack-a-mole
    // every time a new placeable type needed a field. Specific fields
    // below override to enforce shape correctness.
    ...objectData,
    id: objectId,
    type: objectData.type || "construction",
    originalType: objectData.originalType || objectData.type || "construction",
    itemId: objectData.itemId,
    name: objectData.name || "Objeto",
    x: objectData.x || 0,
    y: objectData.y || 0,
    width: objectData.width || 32,
    height: objectData.height || 32,
    icon: objectData.icon,
    variant: objectData.variant,
    interactable: objectData.interactable || false,
    storageId: objectData.storageId,
    draw: objectData.draw || function(ctx) {
      if (isInViewportWithBuffer(this.x, this.y, this.width, this.height)) {
        drawBuilding(ctx, this);
      }
    },
    onInteract: objectData.onInteract || null,
    getHitbox: objectData.getHitbox || null
  };

  placedBuildings.push(building);

  try {
    collisionSystem.addHitbox(building.id, collisionType, building.x, building.y, building.width, building.height, building);
  } catch (err) {
    handleWarn("Failed to add hitbox for world object", "theWorld:addWorldObject", { objectId, collisionType, err });
  }

  markWorldChanged();

  if (building.originalType !== "chest" && building.originalType !== "well") {
    document.dispatchEvent(new CustomEvent("worldObjectAdded", { detail: { object: building } }));
  }

  return building;
};

/* sobrescreve salvamento para excluir baús se BuildSystem existir */
// Note: aplica override quando BuildSystem estiver registrado
const tryApplyBuildSaveOverride = () => {
  const BuildSystem = getSystem('build');
  if (!BuildSystem || typeof BuildSystem.saveBuildings !== "function" || BuildSystem.__saveOverrideApplied) {
    return false;
  }
  const originalSaveBuildings = BuildSystem.saveBuildings;
  BuildSystem.saveBuildings = function(buildings) {
    const buildingsToSave = buildings ? buildings.filter(b => b.originalType !== "chest") : [];
    return originalSaveBuildings.call(this, buildingsToSave);
  };
  BuildSystem.__saveOverrideApplied = true;
  return true;
};

// Event-driven approach: listen for build system registration
if (IS_BROWSER_RUNTIME) {
  document.addEventListener('gamestate:registered', (e) => {
    if (e.detail?.name === 'build') {
      tryApplyBuildSaveOverride();
    }
  });

  // Try immediately in case build system is already registered
  tryApplyBuildSaveOverride();
}

/* função principal de renderização do mundo */
export function renderWorld(ctx, player) {
  const BuildSystem = getSystem('build');
  if (BuildSystem) {
    BuildSystem._gridDrawnThisFrame = false;
  }

  // Portal proximity check — run every frame, not tied to Y-sort cache rebuild
  const mgr = getMapManager();
  if (mgr && !mgr.isMapTransitioning()) {
    mgr.checkPortalInteraction(player.x, player.y, player.width, player.height);
  }

  drawBackground(ctx);

  const objects = getSortedWorldObjects(player);
  objects.forEach(obj => {
    try {
      obj.draw(ctx);
    } catch (err) {
      handleWarn("Failed to draw world object", "theWorld:renderWorld", { objId: obj.id, objType: obj.type, err });
    }
  });

  drawBuildPreview(ctx);
}

/**
 * Exports the current world state for serialization (save system)
 * @returns {Object} Serialized world state with all world object arrays
 */
export function exportWorldState() {
  return {
    trees: Array.isArray(trees) ? trees.map(t => ({
      id: t.id, x: t.x, y: t.y,
      width: t.width, height: t.height,
      type: t.type, subType: t.subType, hp: t.hp
    })) : [],
    rocks: Array.isArray(rocks) ? rocks.map(r => ({
      id: r.id, x: r.x, y: r.y,
      width: r.width, height: r.height,
      type: r.type, subType: r.subType, hp: r.hp
    })) : [],
    thickets: Array.isArray(thickets) ? thickets.map(th => ({
      id: th.id, x: th.x, y: th.y,
      width: th.width, height: th.height,
      type: th.type, subType: th.subType, hp: th.hp
    })) : [],
    houses: Array.isArray(houses) ? houses.map(h => ({
      id: h.id, x: h.x, y: h.y,
      width: h.width, height: h.height,
      type: h.type
    })) : [],
    placedBuildings: Array.isArray(placedBuildings) ? placedBuildings.map(b => ({
      id: b.id, x: b.x, y: b.y,
      width: b.width, height: b.height,
      type: b.type, originalType: b.originalType,
      name: b.name, icon: b.icon, variant: b.variant,
      itemId: b.itemId, interactable: b.interactable,
      storageId: b.storageId
    })) : [],
    placedWells: Array.isArray(placedWells) ? placedWells.map(w => ({
      id: w.id, x: w.x, y: w.y,
      width: w.width, height: w.height,
      originalType: w.originalType, name: w.name
    })) : [],
    animals: Array.isArray(animals) ? animals.map(a => {
      // Use serialize method if available, otherwise fallback to basic fields
      if (typeof a.serialize === 'function') {
        return a.serialize();
      }
      return {
        id: a.id, x: a.x, y: a.y,
        assetName: a.assetName
      };
    }) : [],
    // Hospital state — animais internados na veterinária. Lookup via
    // getSystem para evitar dependência circular com hospitalSystem.js.
    hospital: (() => {
      const hosp = getSystem('hospital');
      return hosp?.serializeState ? hosp.serializeState() : { entries: [] };
    })(),
    // Espécies por cercado — só o contador, cercados em si são
    // recalculados a partir das cercas no load. Sem isso, reload zera
    // "5 vacas no cercado X" e quebra o limite de 3 espécies.
    enclosureSpecies: (() => {
      const enc = getSystem('enclosure');
      return enc?.serializeState ? enc.serializeState() : {};
    })(),
    // Tumbas de animais. Persistem entre saves — memorial não some por
    // recarregar. Cada tomb tem nome, idade, últimas palavras, posição.
    animalTombs: (() => {
      const tomb = getSystem('animalTomb');
      return tomb?.serializeState ? tomb.serializeState() : [];
    })()
  };
}

/**
 * Registers physical collision hitboxes for the static world objects currently
 * in the world arrays. `registerWorldObjects()` only feeds the item interaction
 * registry — it does NOT add collision boxes — so a loaded save needs this or
 * its solid objects (trees, houses, buildings…) would be passable.
 * Mirrors mapManager.restoreFarmState so the load and map-return paths match.
 */
function registerStaticWorldHitboxes() {
  const add = (id, type, x, y, width, height, ctx) => {
    try {
      collisionSystem.addHitbox(id, type, x, y, width, height);
    } catch (e) {
      handleWarn("Failed to add static hitbox", ctx, { id, type, err: e });
    }
  };

  for (const tree of trees) add(tree.id, "TREE", tree.x, tree.y, tree.width, tree.height, "theWorld:importWorldState:treeHitbox");
  for (const rock of rocks) add(rock.id, "ROCK", rock.x, rock.y, rock.width, rock.height, "theWorld:importWorldState:rockHitbox");
  for (const thicket of thickets) add(thicket.id, "THICKET", thicket.x, thicket.y, thicket.width, thicket.height, "theWorld:importWorldState:thicketHitbox");

  for (const house of houses) {
    // HOUSE_ROOF is the box that actually blocks the player (offset wall).
    // Register both so the house is solid after a save load, matching
    // mapManager.restoreFarmState.
    if (house.type === "HOUSE_WALLS" || house.type === "HOUSE_ROOF") {
      add(house.id, house.type, house.x, house.y, house.width, house.height, "theWorld:importWorldState:houseHitbox");
    }
  }

  for (const b of placedBuildings) add(b.id, getPlacedBuildingCollisionType(b), b.x, b.y, b.width, b.height, "theWorld:importWorldState:buildingHitbox");
  for (const w of placedWells) add(w.id, "WELL", w.x, w.y, w.width, w.height, "theWorld:importWorldState:wellHitbox");
}

/**
 * Re-registers NPC, Milly, house-door and pickup-truck hitboxes after a save
 * load. `collisionSystem.clear()` wipes these along with the world hitboxes, so
 * without this NPCs and the house become non-interactive post-load. Mirrors the
 * farm branch of mapManager.performTransition (npcSystem.js:189, houseSystem,
 * npcMilly, questSystem). House-door lookup depends on HOUSE_WALLS already being
 * registered — call this AFTER registerStaticWorldHitboxes().
 */
function reregisterFarmEntityHitboxes() {
  const npcSys = getSystem('npc');
  if (npcSys?.registerHitboxesForMap) npcSys.registerHitboxesForMap('farm');

  const milly = getSystem('npcMilly');
  if (milly?.reregisterHitbox) milly.reregisterHitbox();

  const house = getSystem('house');
  if (house?.reregisterDoorHitbox) house.reregisterDoorHitbox();

  const quests = getSystem('quests');
  if (quests?.registerPickupHitbox) quests.registerPickupHitbox(true);
}

/**
 * Imports world state from saved data (save system)
 * Clears all existing world objects and restores from serialized data
 * @param {Object} data - Serialized world state from exportWorldState()
 */
export function importWorldState(data) {
  const payload = (data && typeof data === 'object' && data.world && typeof data.world === 'object') ? data.world : data;
  try {
    if (!payload || typeof payload !== "object") return;

    // Remove as hitboxes dos objetos atuais ANTES de zerar os arrays. Sem
    // isso, os objetos colocados (cerca/baú/poço/cocho) de um save anterior
    // permaneceriam como colisões-fantasma ao trocar de save (cf. #181).
    for (const arr of [trees, rocks, thickets, houses, placedBuildings, placedWells, animals]) {
      for (const o of arr) { if (o?.id) collisionSystem.removeHitbox(o.id); }
    }

    // Reset existing data
    trees.length = 0;
    rocks.length = 0;
    thickets.length = 0;
    houses.length = 0;
    placedBuildings.length = 0;
    placedWells.length = 0;
    animals.length = 0;

    // Rebuild arrays (ensure ids)
    if (Array.isArray(payload.trees)) {
      trees.push(...payload.trees.map(o => ({ ...o, id: o.id || generateId() })));
    }
    if (Array.isArray(payload.rocks)) {
      rocks.push(...payload.rocks.map(o => ({ ...o, id: o.id || generateId() })));
    }
    if (Array.isArray(payload.thickets)) {
      thickets.push(...payload.thickets.map(o => ({ ...o, id: o.id || generateId() })));
    }
    if (Array.isArray(payload.houses)) {
      houses.push(...payload.houses.map(o => ({ ...o, id: o.id || generateId() })));
    }
    if (Array.isArray(payload.placedBuildings)) {
      placedBuildings.push(...payload.placedBuildings.map(o => ({ ...o, id: o.id || generateId() })));
    }
    if (Array.isArray(payload.placedWells)) {
      placedWells.push(...payload.placedWells.map(o => ({ ...o, id: o.id || generateId() })));
    }

    // Rebuild static collision hitboxes for the freshly loaded world.
    registerStaticWorldHitboxes();

    if (Array.isArray(payload.animals)) {
      for (const o of payload.animals) {
        const assetData = assets.animals && assets.animals[o.assetName];
        if (assetData) {
          const animal = new AnimalEntity(o.assetName, assetData, o.x, o.y);
          animal.id = o.id || generateId();

          // Restore full state via deserialize if available
          if (typeof animal.deserialize === 'function') {
            animal.deserialize(o);
          }

          animals.push(animal);

          // Re-register collision hitbox so restored animals are interactive
          try {
            const hb = animal.getHitbox();
            collisionSystem.addHitbox(
              animal.id,
              "ANIMAL",
              hb.x,
              hb.y,
              hb.width,
              hb.height,
              animal
            );
          } catch (err) {
            handleWarn("Failed to add hitbox for restored animal", "theWorld:importWorldState:animalHitbox", { animalId: animal.id, err });
          }
        } else {
          handleWarn("Animal asset not found during import", "theWorld:importWorldState", { assetName: o.assetName });
        }
      }
    }

    // Restaura estado do hospital (animais internados). Lookup tardio para
    // evitar dependência circular com hospitalSystem.js.
    const hosp = getSystem('hospital');
    if (hosp?.restoreState) {
      hosp.restoreState(payload.hospital ?? { entries: [] });
    }

    // Re-registra as hitboxes de colisão dos objetos recarregados. Antes só
    // os animais ganhavam hitbox aqui — então cerca, baú, poço e cocho
    // colocados pelo player ficavam sem colisão após carregar (#165 save/load).
    const addRestoredHitbox = (id, type, x, y, w, h, obj) => {
      if (!id) return;
      try { collisionSystem.addHitbox(id, type, x, y, w, h, obj); }
      catch (e) { handleWarn("Failed to add hitbox for restored object", "theWorld:importWorldState:hitbox", { id, type, err: e }); }
    };
    for (const t of trees)     addRestoredHitbox(t.id, "TREE", t.x, t.y, t.width, t.height);
    for (const r of rocks)     addRestoredHitbox(r.id, "ROCK", r.x, r.y, r.width, r.height);
    for (const th of thickets) addRestoredHitbox(th.id, "THICKET", th.x, th.y, th.width, th.height);
    for (const h of houses) {
      if (h.type === "HOUSE_WALLS") addRestoredHitbox(h.id, "HOUSE_WALLS", h.x, h.y, h.width, h.height);
    }
    for (const b of placedBuildings) {
      addRestoredHitbox(b.id, getPlacedBuildingCollisionType(b), b.x, b.y, b.width, b.height, b);
    }
    for (const w of placedWells) {
      addRestoredHitbox(w.id, "WELL", w.x, w.y, w.width, w.height, w);
    }

    if (payload.seed && typeof worldGenerator.setSeed === "function") {
      worldGenerator.setSeed(payload.seed);
    }

    registerWorldObjects();
    markWorldChanged();

    // Restaura espécies por cercado APÓS registerWorldObjects (que recolora
    // as hitboxes das cercas). O `restoreState` chama `detect()` internamente
    // — então o enclosureSystem já encontra todas as cercas registradas e
    // reidrata o `species` dos enclosures recém-computados.
    const enc = getSystem('enclosure');
    if (enc?.restoreState) {
      enc.restoreState(payload.enclosureSpecies ?? {});
    }

    // Restaura tumbas (memorial persiste entre saves).
    const tomb = getSystem('animalTomb');
    if (tomb?.restoreState) {
      tomb.restoreState(payload.animalTombs ?? []);
    }

    // Re-register entity hitboxes wiped by collisionSystem.clear() so NPCs and
    // the house stay interactive after the load.
    reregisterFarmEntityHitboxes();
  } catch (error) {
    handleError(error, "theWorld:importWorldState");
  }
}

/* export público do world para outros módulos */
const theWorld = {
  addWorldObject: window.addWorldObject || null,
  placedBuildings,
  placedWells,
  objectDestroyed,
  getSortedWorldObjects,
  drawBackground,
  drawBuildPreview,
  renderWorld,
  initializeWorld,
  getInitialPlayerPosition,
  markWorldChanged,
  compactLargeArrays,
  placeWell,
  addAnimal,
  updateAnimals,
  exportWorldState,
  importWorldState,
  animals,
  worldInitialized,
  trees,
  rocks,
  thickets,
  houses,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  GAME_WIDTH,
  GAME_HEIGHT
};

// Registrar no gameState (legacy window.theWorld é tratado por installLegacyGlobals)
setObject('world', theWorld);