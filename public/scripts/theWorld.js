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
import { setObject, getDebugFlag, getSystem } from "./gameState.js";

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

/** @type {Array<Object>} Cached array of sorted world objects */
let sortedWorldObjectsCache = [];

/** @type {boolean} Flag indicating if cache is still valid */
let cacheValid = false;

/** @type {number} Last known player Y position for cache invalidation */
let lastPlayerY = -1;

/** @type {number} Last known player height for cache invalidation */
let lastPlayerHeight = -1;

/**
 * Buffer zone around viewport for culling calculations
 * Objects within this buffer are still rendered to prevent pop-in
 * @constant {number}
 */
const CULLING_BUFFER = 200;

/**
 * Invalidates the world object cache, forcing recalculation on next render
 * Call this when any world object is added, removed, or modified
 * @returns {void}
 */
export function markWorldChanged() {
  cacheValid = false;
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
    const wid = id || `well_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
 * @returns {AnimalEntity} The created animal entity
 */
export function addAnimal(assetName, img, x, y) {
  if (!worldInitialized) {
    initializeWorld();
  }

  const animal = new AnimalEntity(assetName, img, x, y);

  if (!animal.id) {
    animal.id = `animal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    }
  } catch (e) {
    handleWarn("Failed to add hitbox for animal", "theWorld:addAnimal", { animalId: animal.id, assetName, err: e });
  }

  markWorldChanged();
  return animal;
}

/**
 * Updates all animals in the world (AI logic and collision positions)
 * Called each frame to process animal behavior and sync hitboxes
 * @returns {void}
 */
export function updateAnimals() {
  animals.forEach(animal => {
    if (animal && typeof animal.update === "function") {
      animal.update();
      try {
        if (animal.id) {
          const hb = animal.getHitbox();
          if (typeof collisionSystem.updateHitboxPosition === "function") {
            collisionSystem.updateHitboxPosition(animal.id, hb.x, hb.y, hb.width, hb.height);
          }
        }
      } catch (err) {
        handleWarn("Failed to update hitbox for animal", "theWorld:updateAnimals", { animalId: animal.id, err });
      }
    }
  });
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

/**
 * Builds and returns a Y-sorted list of all world objects for rendering
 * Uses caching to optimize performance when player position hasn't changed
 * Objects are sorted by their bottom Y coordinate for proper depth ordering
 * @param {Object} player - Player object with x, y, width, height properties
 * @returns {Array<Object>} Sorted array of world objects with draw functions
 */
export function getSortedWorldObjects(player) {
  const playerChanged = player && (player.y !== lastPlayerY || player.height !== lastPlayerHeight);

  if (cacheValid && !playerChanged) {
    if (typeof perfLog === "function") perfLog("using world objects cache");
    return sortedWorldObjectsCache;
  }

  if (typeof perfLog === "function") perfLog("recalculating world objects cache");
  const allObjects = [];

  for (const tree of trees) {
    const tid = tree.id || `tree_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!tree.id) tree.id = tid;

    allObjects.push({
      id: tid,
      type: "TREE",
      originalType: "tree",
      x: tree.x || 0,
      y: tree.y || 0,
      width: tree.width || 64,
      height: tree.height || 96,
      hp: tree.hp || 6,
      maxHealth: tree.hp || 6,
      draw: (ctx) => {
        if (isInViewportWithBuffer(tree.x, tree.y, tree.width || 64, tree.height || 96)) {
          drawSingleObject(ctx, tree, "trees", drawTreeFallback);
        }
      }
    });
  }

  for (const rock of rocks) {
    const rid = rock.id || `rock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!rock.id) rock.id = rid;

    allObjects.push({
      id: rid,
      type: "ROCK",
      originalType: "rock",
      x: rock.x || 0,
      y: rock.y || 0,
      width: rock.width || 48,
      height: rock.height || 48,
      hp: rock.hp || 3,
      maxHealth: rock.hp || 3,
      draw: (ctx) => {
        if (isInViewportWithBuffer(rock.x, rock.y, rock.width || 48, rock.height || 48)) {
          drawSingleObject(ctx, rock, "rocks", drawRockFallback);
        }
      }
    });
  }

  for (const thicket of thickets) {
    const thid = thicket.id || `thicket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!thicket.id) thicket.id = thid;

    allObjects.push({
      id: thid,
      type: "THICKET",
      originalType: "thicket",
      x: thicket.x || 0,
      y: thicket.y || 0,
      width: thicket.width || 32,
      height: thicket.height || 32,
      hp: thicket.hp || 1,
      maxHealth: thicket.hp || 1,
      draw: (ctx) => {
        if (isInViewportWithBuffer(thicket.x, thicket.y, thicket.width || 32, thicket.height || 32)) {
          drawSingleObject(ctx, thicket, "thickets", drawThicketFallback);
        }
      }
    });
  }

  for (const building of placedBuildings) {
    allObjects.push({
      ...building,
      type: building.type || "CONSTRUCTION",
      draw: (ctx) => {
        if (isInViewportWithBuffer(building.x, building.y, building.width || 32, building.height || 32)) {
          if (building.draw) building.draw(ctx);
          else drawBuilding(ctx, building);
        }
      }
    });
  }

  for (const well of placedWells) {
    allObjects.push({
      ...well,
      type: "WELL",
      originalType: "well",
      draw: (ctx) => {
        if (isInViewportWithBuffer(well.x, well.y, well.width || 64, well.height || 64)) {
          if (well.draw) well.draw(ctx);
          else drawBuilding(ctx, Object.assign({}, well, { originalType: "well" }));
        }
      }
    });
  }

  for (const house of houses) {
    const hid = house.id || `house_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!house.id) house.id = hid;

    allObjects.push({
      id: hid,
      type: house.type,
      originalType: "house",
      x: house.x || 0,
      y: house.y || 0,
      width: house.width || 128,
      height: house.height || 128,
      interactable: house.type === "HOUSE_WALLS",
      draw: (ctx) => {
        if (isInViewportWithBuffer(house.x, house.y, house.width || 128, house.height || 128)) {
          if (house.type === "HOUSE_WALLS") drawHouseWalls(ctx, house);
          else drawHouseRoof(ctx, house);
        }
      }
    });
  }

  for (const animal of animals) {
    const aid = animal.id || (`animal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    if (!animal.id) animal.id = aid;

    allObjects.push({
      type: "ANIMAL",
      id: aid,
      x: animal.x || 0,
      y: animal.y || 0,
      width: animal.width || 32,
      height: animal.height || 32,
      assetName: animal.assetName,
      draw: (ctx) => {
        try {
          animal.draw(ctx, camera);
        } catch (e) {
          handleWarn("Failed to draw animal", "theWorld:getSortedWorldObjects:animalDraw", { animalId: animal.id, err: e });
        }
      }
    });
  }

  if (player) {
    allObjects.push({
      type: "PLAYER",
      id: "player",
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
      draw: (ctx) => player.draw(ctx)
    });
    lastPlayerY = player.y;
    lastPlayerHeight = player.height;
  }

  sortedWorldObjectsCache = allObjects.sort((a, b) => {
    const ay = (a.y || 0) + (a.height || 0);
    const by = (b.y || 0) + (b.height || 0);
    return ay - by;
  });

  if (player) cacheValid = true;

  return sortedWorldObjectsCache;
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
  return "obj_" + Math.random().toString(36).substr(2, 9);
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

  try {
    if (camera?.isInViewport && !camera.isInViewport(obj.x || 0, obj.y || 0, objWidth, objHeight)) return;
  } catch (e) {
    handleWarn("Failed to check viewport for object", "theWorld:drawSingleObject:viewport", { err: e });
  }

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
    handleWarn("Failed to convert world to screen for object", "theWorld:drawSingleObject:worldToScreen", { err: e });
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
  } catch (err) { img = null; }

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

  if (building.originalType === "chest") {
    const chestImg = assets.furniture?.chest?.img;
    if (chestImg && chestImg.src && !chestImg.src.includes("data:,")) {
      try { 
        ctx.drawImage(chestImg, drawX, drawY, drawW, drawH); 
        return; 
      } catch (e) {
        handleWarn("Failed to draw chest image", "theWorld:drawBuilding:chestImage", { buildingId: building.id, err: e });
      }
    }
    drawSimpleChest(ctx, drawX, drawY, drawW, drawH);
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

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
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

  if (!img) { drawHouseRoofFallback(ctx, drawX, drawY, drawW, drawH); return; }

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

  if (!img) { drawHouseWallsFallback(ctx, drawX, drawY, drawW, drawH); return; }

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

  cacheValid = false;

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

  const id = (typeof objOrId === "string") ? objOrId : (objOrId.id || objOrId.objectId || null);
  const type = (typeof objOrId === "object") ? (objOrId.type || objOrId.originalType || null) : null;

  if (!id) {
    return;
  }

  function removeFromArray(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const entry = arr[i];
      if (!entry) continue;
      if (entry.id === id || entry.objectId === id) {
        arr.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  let removed = false;
  removed = removeFromArray(trees) || removed;
  removed = removeFromArray(rocks) || removed;
  removed = removeFromArray(thickets) || removed;
  removed = removeFromArray(placedBuildings) || removed;
  removed = removeFromArray(houses) || removed;
  removed = removeFromArray(placedWells) || removed;
  removed = removeFromArray(animals) || removed;

  try { 
    collisionSystem.removeHitbox(id); 
  } catch (err) {
    handleWarn("Failed to remove hitbox", "theWorld:objectDestroyed", { id, err });
  }

  markWorldChanged();

  document.dispatchEvent(new CustomEvent("objectDestroyed", { detail: { id, type } }));
}

/**
 * Returns the initial spawn position for the player
 * Spawns near the house if available, otherwise at world center
 * @returns {{x: number, y: number}} Player spawn coordinates
 */
export function getInitialPlayerPosition() {
  if (houses.length > 0) {
    const houseWalls = houses.find(h => h.type === "HOUSE_WALLS");
    if (houseWalls) {
      return {
        x: houseWalls.x + houseWalls.width / 2 - 20,
        y: houseWalls.y + houseWalls.height - 50
      };
    }
  }
  return { x: WORLD_WIDTH / 2 - 20, y: WORLD_HEIGHT / 2 - 25 };
}

/**
 * Draws the world background including sky fill and grass tiles
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @returns {void}
 */
export function drawBackground(ctx) {
  try {
    ctx.fillStyle = "#5a9367";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  } catch (e) {
    handleWarn("Failed to draw background fill", "theWorld:drawBackground:fill", { err: e });
    return;
  }

  try {
    drawGrass(ctx);
  } catch (e) {
    handleWarn("Failed to draw grass", "theWorld:drawBackground:grass", { err: e });
  }
}

function drawGrass(ctx) {
  const camX = camera?.x ?? 0;
  const camY = camera?.y ?? 0;
  const camW = camera?.width ?? GAME_WIDTH;
  const camH = camera?.height ?? GAME_HEIGHT;

  const startCol = Math.max(0, Math.floor((camX - CULLING_BUFFER) / TILE_SIZE));
  const endCol = Math.min(Math.ceil(WORLD_WIDTH / TILE_SIZE),
    Math.ceil((camX + camW + CULLING_BUFFER) / TILE_SIZE));
  const startRow = Math.max(0, Math.floor((camY - CULLING_BUFFER) / TILE_SIZE));
  const endRow = Math.min(Math.ceil(WORLD_HEIGHT / TILE_SIZE),
    Math.ceil((camY + camH + CULLING_BUFFER) / TILE_SIZE));

  const toScreen = (typeof worldToScreenFast === "function")
    ? worldToScreenFast
    : (x, y) => (camera?.worldToScreen ? camera.worldToScreen(x, y) : { x, y });

  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const worldX = x * TILE_SIZE;
      const worldY = y * TILE_SIZE;

      const screenPos = toScreen(worldX, worldY);
      const drawX = Math.floor(screenPos.x);
      const drawY = Math.floor(screenPos.y);

      if (assets.nature?.floor?.length > 0) {
        const grassType = (x + y) % assets.nature.floor.length;
        const grassAsset = assets.nature.floor[grassType];
        if (grassAsset?.img?.complete) {
          ctx.drawImage(grassAsset.img, drawX, drawY, ZOOMED_TILE_SIZE_INT, ZOOMED_TILE_SIZE_INT);
          continue;
        }
      }

      ctx.fillStyle = (x + y) % 2 === 0 ? "#5a9367" : "#528a5e";
      ctx.fillRect(drawX, drawY, ZOOMED_TILE_SIZE_INT, ZOOMED_TILE_SIZE_INT);
    }
  }
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

/* função global útil para adicionar objetos dinâmicos */
window.addWorldObject = function(objectData) {
  const objectId = objectData.id || `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let collisionType = (objectData.originalType || objectData.type || "construction").toString().toUpperCase();

  if (collisionType === "CHEST" || collisionType.toLowerCase() === "chest") collisionType = "CHEST";
  else if (collisionType === "WELL" || collisionType.toLowerCase() === "well") collisionType = "WELL";
  else if (collisionType === "FENCEX" || collisionType.toLowerCase() === "fencex") collisionType = "FENCEX";
  else if (collisionType === "FENCEY" || collisionType.toLowerCase() === "fencey") collisionType = "FENCEY";
  else if (collisionType === "FENCE" || collisionType.toLowerCase() === "fence") collisionType = "FENCE";
  else if (collisionType === "FURNITURE") collisionType = "CONSTRUCTION";
  else if (!["CHEST", "WELL", "CONSTRUCTION", "FENCE", "FENCEX", "FENCEY", "HOUSE_WALLS"].includes(collisionType)) collisionType = "CONSTRUCTION";

  const building = {
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
// Note: BuildSystem override será aplicado após main.js registrar o sistema
setTimeout(() => {
  const BuildSystem = getSystem('build');
  if (BuildSystem && BuildSystem.saveBuildings) {
    const originalSaveBuildings = BuildSystem.saveBuildings;
    BuildSystem.saveBuildings = function(buildings) {
      const buildingsToSave = buildings ? buildings.filter(b => b.originalType !== "chest") : [];
      return originalSaveBuildings.call(this, buildingsToSave);
    };
  }
}, 0);

/* função principal de renderização do mundo */
export function renderWorld(ctx, player) {
  const BuildSystem = getSystem('build');
  if (BuildSystem) {
    BuildSystem._gridDrawnThisFrame = false;
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
  placeWell,
  addAnimal,
  updateAnimals,
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
