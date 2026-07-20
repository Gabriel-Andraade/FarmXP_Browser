/**
 * @file minimapSystem.js - Minimap rendering engine
 * @description Renders a zoomed minimap centered on the player with exploration fog,
 * world objects, character icons, and player marker.
 * @module MinimapSystem
 */

import { logger } from '../logger.js';
import { getSystem } from '../gameState.js';

const ICON_SIZE = 14;
const PLAYER_ICON_SIZE = 20;
const EXPLORATION_RADIUS_WORLD = 280;
const RENDER_THROTTLE = 3;

// How many world pixels the minimap viewport covers
const VIEWPORT_WORLD_WIDTH = 1600;
const VIEWPORT_WORLD_HEIGHT = 1340;

// Exploration grid cell size (world pixels) for fast O(1) lookup
const EXPLORE_CELL_SIZE = 16;

export class MinimapSystem {
  constructor(minimapCanvas, worldWidth, worldHeight) {
    this.canvas = minimapCanvas;
    this.ctx = this.canvas.getContext('2d');
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.minimapWidth = this.canvas.width;
    this.minimapHeight = this.canvas.height;

    // Zoomed scale: fixed-size viewport (world px) around the player —
    // independent of the map, so it stays constant when switching maps.
    this.scaleX = this.minimapWidth / VIEWPORT_WORLD_WIDTH;
    this.scaleY = this.minimapHeight / VIEWPORT_WORLD_HEIGHT;

    // Per-map fog of war + exploration grid. Farm and city keep separate
    // canvases/grids so exploring one doesn't paint over the other (their
    // world coords overlap). setMap() swaps the active pointers.
    this._maps = {};
    this._activeMapId = null;
    this.setMap('farm', this.worldWidth, this.worldHeight);

    this.colors = {
      ground: '#2d5016',
      tree: '#228B22',
      rock: '#808080',
      house: '#d4a574',
      thicket: '#3a6b24',
      well: '#4fc3f7',
      building: '#b0855a',
    };

    this.icons = {};
    this._frameCounter = 0;

    // Current camera offset (world coords of top-left of minimap viewport)
    this._camX = 0;
    this._camY = 0;

    logger.debug('MinimapSystem initialized');
  }

  /**
   * Create (once) the fog canvas + exploration grid for a map, sized to that
   * map's world dimensions. Idempotent — returns the existing entry if present.
   */
  _createMapEntry(mapId, worldWidth, worldHeight) {
    if (this._maps[mapId]) return this._maps[mapId];
    const canvas = document.createElement('canvas');
    canvas.width = this.minimapWidth;
    canvas.height = this.minimapHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.minimapWidth, this.minimapHeight);
    const fullScale = Math.min(this.minimapWidth / worldWidth, this.minimapHeight / worldHeight);
    this._maps[mapId] = {
      worldWidth,
      worldHeight,
      canvas,
      ctx,
      grid: new Set(),
      fullScale,
      fullOffsetX: (this.minimapWidth - worldWidth * fullScale) / 2,
      fullOffsetY: (this.minimapHeight - worldHeight * fullScale) / 2,
      explorationRadiusFull: EXPLORATION_RADIUS_WORLD * fullScale,
    };
    return this._maps[mapId];
  }

  /**
   * Switch the active map: points fog/grid/scale at that map's entry (creating
   * it on first use). Exploration, render and camera all read these pointers,
   * so switching is enough to make the whole minimap map-aware.
   * @param {string} mapId - 'farm' | 'city' | ...
   * @param {number} worldWidth - map world width (px)
   * @param {number} worldHeight - map world height (px)
   */
  setMap(mapId, worldWidth, worldHeight) {
    const m = this._createMapEntry(mapId, worldWidth, worldHeight);
    this._activeMapId = mapId;
    this.worldWidth = m.worldWidth;
    this.worldHeight = m.worldHeight;
    this.explorationMap = m.canvas;
    this.explorationCtx = m.ctx;
    this._explorationGrid = m.grid;
    this._fullScale = m.fullScale;
    this._fullOffsetX = m.fullOffsetX;
    this._fullOffsetY = m.fullOffsetY;
    this._explorationRadiusFull = m.explorationRadiusFull;
    // Force the next updateExploration to repaint (new coord space).
    this._lastExplorationX = undefined;
    this._lastExplorationY = undefined;
  }

  /**
   * Load icons from assets/icons/ folder
   * @param {string} basePath - Base path to icons folder
   * @returns {Promise} Resolves when all icons finish loading (or fail)
   */
  loadIcons(basePath = 'assets/icons/') {
    const iconMap = {
      tree: 'treeIcon.png',
      rock: 'rockIcon.png',
      house: 'houseIcon.png',
      thicket: 'thicketIcon.png',
      stella: 'stellaIcon.png',
      ben: 'benIcon.png',
      graham: 'grahamIcon.png',
      // Cidade Goose Cape: marcador geral + casas por dono (#231).
      goosecape: 'gooseCapeIcon.png',
      bru: 'bruHouseIcon.png',
      millers: 'millersHouseIcon.png',
      twins: 'twinHouse.png',
      bartolomeu: 'bartolomeuHouseIcon.png',
      milly: 'millyHouseIcon.png',
      // Estruturas da fazenda: poço e cercado (um marcador por curral fechado —
      // as cercas individuais não são desenhadas, só o cercado que elas formam).
      well: 'wellIcon.png',
      enclosure: 'fenceIcon.png',
    };

    const promises = Object.entries(iconMap).map(([key, filename]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.icons[key] = img;
          resolve();
        };
        img.onerror = () => {
          logger.warn(`[MinimapSystem] Failed to load icon: ${filename}`);
          resolve();
        };
        img.src = `${basePath}${filename}`;
      });
    });

    return Promise.all(promises);
  }

  /** Update the camera to center on player */
  _updateCamera(playerX, playerY) {
    this._camX = Math.max(0, Math.min(playerX - VIEWPORT_WORLD_WIDTH / 2, this.worldWidth - VIEWPORT_WORLD_WIDTH));
    this._camY = Math.max(0, Math.min(playerY - VIEWPORT_WORLD_HEIGHT / 2, this.worldHeight - VIEWPORT_WORLD_HEIGHT));
  }

  /** Convert world coordinates to minimap coordinates (zoomed viewport) */
  worldToMinimap(worldX, worldY) {
    return {
      x: (worldX - this._camX) * this.scaleX,
      y: (worldY - this._camY) * this.scaleY,
    };
  }

  /** Check if world position is within current minimap viewport */
  _isInViewport(worldX, worldY) {
    return worldX >= this._camX && worldX <= this._camX + VIEWPORT_WORLD_WIDTH &&
           worldY >= this._camY && worldY <= this._camY + VIEWPORT_WORLD_HEIGHT;
  }

  /** Paint explored area around player on the full-world fog map */
  updateExploration(playerWorldX, playerWorldY) {
    // Skip se player não andou o suficiente. Antes: rodava 60×/s mesmo
    // parado, fazendo loop 2D de ~400 cells + 400 string allocs por frame.
    // Threshold = metade do raio de exploração (player precisa se mover
    // significativamente pra novas células serem descobertas).
    const lastX = this._lastExplorationX;
    const lastY = this._lastExplorationY;
    if (lastX !== undefined) {
      const ddx = playerWorldX - lastX;
      const ddy = playerWorldY - lastY;
      const moveThresholdSq = (EXPLORATION_RADIUS_WORLD * 0.5) ** 2;
      if (ddx * ddx + ddy * ddy < moveThresholdSq) return;
    }
    this._lastExplorationX = playerWorldX;
    this._lastExplorationY = playerWorldY;

    const fx = this._fullOffsetX + playerWorldX * this._fullScale;
    const fy = this._fullOffsetY + playerWorldY * this._fullScale;
    this.explorationCtx.fillStyle = this.colors.ground;
    this.explorationCtx.beginPath();
    this.explorationCtx.arc(fx, fy, this._explorationRadiusFull, 0, Math.PI * 2);
    this.explorationCtx.fill();

    // Update boolean grid for fast lookup
    this._markExploredGrid(playerWorldX, playerWorldY, EXPLORATION_RADIUS_WORLD);
  }

  /** Mark cells as explored in the boolean grid (circular) */
  _markExploredGrid(worldX, worldY, radius) {
    const radiusCells = Math.ceil(radius / EXPLORE_CELL_SIZE);
    const cx = Math.floor(worldX / EXPLORE_CELL_SIZE);
    const cy = Math.floor(worldY / EXPLORE_CELL_SIZE);
    const radiusSq = radius * radius;
    const maxCellX = Math.ceil(this.worldWidth / EXPLORE_CELL_SIZE) - 1;
    const maxCellY = Math.ceil(this.worldHeight / EXPLORE_CELL_SIZE) - 1;
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      for (let dy = -radiusCells; dy <= radiusCells; dy++) {
        const gridX = cx + dx;
        const gridY = cy + dy;
        if (gridX < 0 || gridY < 0 || gridX > maxCellX || gridY > maxCellY) continue;
        const cellCenterX = (cx + dx + 0.5) * EXPLORE_CELL_SIZE;
        const cellCenterY = (cy + dy + 0.5) * EXPLORE_CELL_SIZE;
        const distX = cellCenterX - worldX;
        const distY = cellCenterY - worldY;
        if (distX * distX + distY * distY > radiusSq) continue;
        this._explorationGrid.add(`${gridX},${gridY}`);
      }
    }
  }

  /** Fast O(1) check if a world position has been explored */
  _isExplored(worldX, worldY) {
    const key = `${Math.floor(worldX / EXPLORE_CELL_SIZE)},${Math.floor(worldY / EXPLORE_CELL_SIZE)}`;
    return this._explorationGrid.has(key);
  }

  /** Rebuild a map entry's grid from its fog canvas pixels (legacy saves w/o grid). */
  _rebuildGridInto(entry) {
    entry.grid = new Set();
    const imgData = entry.ctx.getImageData(0, 0, this.minimapWidth, this.minimapHeight).data;
    const cellPixelW = EXPLORE_CELL_SIZE * entry.fullScale;
    const cellPixelH = EXPLORE_CELL_SIZE * entry.fullScale;

    const maxCellX = Math.ceil(entry.worldWidth / EXPLORE_CELL_SIZE);
    const maxCellY = Math.ceil(entry.worldHeight / EXPLORE_CELL_SIZE);

    for (let gx = 0; gx < maxCellX; gx++) {
      for (let gy = 0; gy < maxCellY; gy++) {
        // Sample center pixel of this cell on the exploration canvas
        const px = Math.round(entry.fullOffsetX + (gx + 0.5) * cellPixelW);
        const py = Math.round(entry.fullOffsetY + (gy + 0.5) * cellPixelH);
        if (px < 0 || py < 0 || px >= this.minimapWidth || py >= this.minimapHeight) continue;
        const idx = (py * this.minimapWidth + px) * 4;
        // Non-black pixel = explored
        if (imgData[idx] !== 0 || imgData[idx + 1] !== 0 || imgData[idx + 2] !== 0) {
          entry.grid.add(`${gx},${gy}`);
        }
      }
    }
  }

  /** Get the active character name and direction for player icon */
  _getPlayerInfo() {
    const ps = getSystem('player');
    return {
      charId: ps?.activeCharacter?.id || 'stella',
      direction: ps?.currentPlayer?.direction || 'right',
    };
  }

  /** Reset exploration to an unexplored state (clears canvas + grid) — ALL maps. */
  resetExploration() {
    for (const id of Object.keys(this._maps)) {
      const m = this._maps[id];
      m.ctx.clearRect(0, 0, this.minimapWidth, this.minimapHeight);
      m.ctx.fillStyle = '#000000';
      m.ctx.fillRect(0, 0, this.minimapWidth, this.minimapHeight);
      m.grid = new Set();
    }
    // Rebind the active grid pointer (grid was reassigned above).
    if (this._maps[this._activeMapId]) this._explorationGrid = this._maps[this._activeMapId].grid;
  }

  /**
   * Export exploration for saving — per map (fog + grid), so farm and city
   * fog persist independently.
   * @returns {{ version: number, activeMap: string, maps: Object }}
   */
  exportExploration() {
    const maps = {};
    for (const id of Object.keys(this._maps)) {
      const m = this._maps[id];
      maps[id] = {
        worldWidth: m.worldWidth,
        worldHeight: m.worldHeight,
        image: m.canvas.toDataURL('image/png'),
        grid: [...m.grid],
      };
    }
    return { version: 2, activeMap: this._activeMapId, maps };
  }

  /** Load one map entry's fog canvas + grid from saved data. Returns a Promise. */
  _loadFogInto(entry, md) {
    const hasGrid = Array.isArray(md.grid);
    if (hasGrid) entry.grid = new Set(md.grid);

    const imageUrl = (typeof md === 'string') ? md : md.image;
    if (!imageUrl) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        entry.ctx.clearRect(0, 0, this.minimapWidth, this.minimapHeight);
        entry.ctx.drawImage(img, 0, 0);
        if (!hasGrid) this._rebuildGridInto(entry); // legacy save w/o grid
        resolve();
      };
      img.onerror = () => {
        logger.warn('[MinimapSystem] Failed to load exploration data');
        resolve();
      };
      img.src = imageUrl;
    });
  }

  /**
   * Import exploration from a saved state. Supports the per-map format
   * (`{ version: 2, maps }`) and the legacy single-map format (a dataURL string
   * or `{ image, grid }`, restored onto the farm map).
   * @param {string|Object} data
   * @returns {Promise}
   */
  importExploration(data) {
    if (!data) return Promise.resolve();

    // Per-map format.
    if (data.maps && typeof data.maps === 'object') {
      const tasks = [];
      for (const id of Object.keys(data.maps)) {
        const md = data.maps[id];
        const entry = this._createMapEntry(id, md.worldWidth || this.worldWidth, md.worldHeight || this.worldHeight);
        tasks.push(this._loadFogInto(entry, md));
      }
      return Promise.all(tasks).then(() => {
        // Grids were reassigned — rebind the active pointer.
        if (this._maps[this._activeMapId]) this._explorationGrid = this._maps[this._activeMapId].grid;
      });
    }

    // Legacy single-map (string dataURL or { image, grid }) → farm map.
    const farm = this._createMapEntry('farm', this.worldWidth, this.worldHeight);
    return this._loadFogInto(farm, data).then(() => {
      if (this._activeMapId === 'farm') this._explorationGrid = farm.grid;
    });
  }

  /**
   * Main render pass
   * @param {number} playerX - Player world X
   * @param {number} playerY - Player world Y
   * @param {Object} worldArrays
   */
  render(playerX, playerY, worldArrays) {
    const ctx = this.ctx;
    this._updateCamera(playerX, playerY);

    // Background (black = unexplored)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.minimapWidth, this.minimapHeight);

    // City: use the pre-rendered Goose Cape map (streets + houses) as the base
    // layer — far nicer than fog + generic markers. Falls back to fog if the
    // image isn't ready yet.
    const cityImg = this.icons.goosecape;
    const useCityBase = this._activeMapId === 'city' && cityImg && cityImg.complete && cityImg.naturalWidth > 0;

    if (useCityBase) {
      this._drawCityBaseMap(ctx, cityImg);
    } else {
      // Draw exploration fog for visible viewport area
      this._drawExplorationLayer(ctx);

      // World objects
      this._renderObjects(ctx, worldArrays.trees, 'tree', ICON_SIZE);
      this._renderObjects(ctx, worldArrays.rocks, 'rock', ICON_SIZE - 2);
      this._renderObjects(ctx, worldArrays.thickets, 'thicket', ICON_SIZE - 4);
      // Filter houses to only HOUSE_WALLS to avoid duplicates (HOUSE_ROOF is the same position)
      const wallsOnly = worldArrays.houses?.filter(h => h && h.type === 'HOUSE_WALLS') || [];
      this._renderObjects(ctx, wallsOnly, 'house', ICON_SIZE + 4);
      this._renderObjects(ctx, worldArrays.placedWells, 'well', ICON_SIZE - 2);

      // Fences aren't drawn individually — a closed pen shows as ONE marker at
      // its center, signaling "enclosure here" instead of every fence piece.
      this._renderEnclosures(ctx);

      // Points of interest (e.g. the Goose Cape marker on the farm).
      this._renderPois(ctx, worldArrays.pois);
    }

    // Player icon (character-based, flipped by direction)
    const { charId, direction } = this._getPlayerInfo();
    const playerIcon = this.icons[charId];
    const playerPos = this.worldToMinimap(playerX, playerY);
    const half = PLAYER_ICON_SIZE / 2;

    if (playerIcon) {
      ctx.save();
      ctx.translate(playerPos.x, playerPos.y);
      // Icons face right by default — flip horizontally when facing left
      if (direction === 'left') {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(playerIcon, -half, -half, PLAYER_ICON_SIZE, PLAYER_ICON_SIZE);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(playerPos.x, playerPos.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /**
   * Draw the Goose Cape base map. The icon is a top-down render of the whole
   * city, so we map the full image onto the full world and blit the slice that
   * matches the current viewport — it pans with the player just like the fog.
   */
  _drawCityBaseMap(ctx, img) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const srcX = (this._camX / this.worldWidth) * iw;
    const srcY = (this._camY / this.worldHeight) * ih;
    const srcW = (VIEWPORT_WORLD_WIDTH / this.worldWidth) * iw;
    const srcH = (VIEWPORT_WORLD_HEIGHT / this.worldHeight) * ih;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, this.minimapWidth, this.minimapHeight);
  }

  /** Draw the explored ground for the current viewport area */
  _drawExplorationLayer(ctx) {
    const sx = this._fullOffsetX + this._camX * this._fullScale;
    const sy = this._fullOffsetY + this._camY * this._fullScale;
    const sw = VIEWPORT_WORLD_WIDTH * this._fullScale;
    const sh = VIEWPORT_WORLD_HEIGHT * this._fullScale;

    ctx.drawImage(this.explorationMap, sx, sy, sw, sh, 0, 0, this.minimapWidth, this.minimapHeight);
  }

  /** Render an array of world objects */
  _renderObjects(ctx, objects, type, size) {
    if (!objects || objects.length === 0) return;

    const icon = this.icons[type];
    const halfSize = size / 2;

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (!obj || obj.destroyed) continue;
      if (!this._isInViewport(obj.x, obj.y)) continue;
      if (!this._isExplored(obj.x, obj.y)) continue;

      const pos = this.worldToMinimap(obj.x, obj.y);

      if (icon) {
        ctx.drawImage(icon, pos.x - halfSize, pos.y - halfSize, size, size);
      } else {
        ctx.fillStyle = this.colors[type] || '#ffffff';
        ctx.fillRect(pos.x - halfSize / 2, pos.y - halfSize / 2, halfSize, halfSize);
      }
    }
  }

  /**
   * Render a marker at the center of each detected animal enclosure (farm).
   * Gated by fog like world objects — pens reveal as their area is explored.
   */
  _renderEnclosures(ctx) {
    const list = getSystem('enclosure')?.getEnclosures?.();
    if (!Array.isArray(list) || list.length === 0) return;

    const icon = this.icons.enclosure;
    const size = ICON_SIZE + 4;
    const half = size / 2;

    for (const enc of list) {
      if (!enc) continue;
      if (!this._isInViewport(enc.centerX, enc.centerY)) continue;
      if (!this._isExplored(enc.centerX, enc.centerY)) continue;

      const pos = this.worldToMinimap(enc.centerX, enc.centerY);
      if (icon) {
        ctx.drawImage(icon, pos.x - half, pos.y - half, size, size);
      } else {
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(pos.x - half / 2, pos.y - half / 2, half, half);
      }
    }
  }

  /**
   * Render point-of-interest markers. Each POI: `{ x, y, icon, size?, alwaysShow? }`.
   * `alwaysShow` markers (e.g. the city on the farm) ignore fog; others only
   * appear once their spot has been explored (discovery), like world objects.
   */
  _renderPois(ctx, pois) {
    if (!Array.isArray(pois) || pois.length === 0) return;
    for (const poi of pois) {
      if (!poi) continue;
      if (!this._isInViewport(poi.x, poi.y)) continue;
      if (!poi.alwaysShow && !this._isExplored(poi.x, poi.y)) continue;

      const icon = this.icons[poi.icon];
      const size = poi.size || ICON_SIZE;
      const half = size / 2;
      const pos = this.worldToMinimap(poi.x, poi.y);

      if (icon) {
        ctx.drawImage(icon, pos.x - half, pos.y - half, size, size);
      } else {
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Math.max(2, half / 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Called every game frame. Throttles rendering for performance.
   */
  update(playerX, playerY, worldArrays) {
    // Always update exploration (cheap operation)
    this.updateExploration(playerX, playerY);

    // Throttle full render
    this._frameCounter++;
    if (this._frameCounter % RENDER_THROTTLE !== 0) return;

    this.render(playerX, playerY, worldArrays);
  }
}
