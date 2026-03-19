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

    // Zoomed scale: minimap shows a viewport around the player
    this.scaleX = this.minimapWidth / VIEWPORT_WORLD_WIDTH;
    this.scaleY = this.minimapHeight / VIEWPORT_WORLD_HEIGHT;

    // Exploration uses full-world scale for persistent fog
    this._fullScaleX = this.minimapWidth / this.worldWidth;
    this._fullScaleY = this.minimapHeight / this.worldHeight;
    this._fullScale = Math.min(this._fullScaleX, this._fullScaleY);
    this._fullOffsetX = (this.minimapWidth - this.worldWidth * this._fullScale) / 2;
    this._fullOffsetY = (this.minimapHeight - this.worldHeight * this._fullScale) / 2;
    this._explorationRadiusFull = EXPLORATION_RADIUS_WORLD * this._fullScale;

    // Persistent exploration canvas (fog of war, full world)
    this.explorationMap = document.createElement('canvas');
    this.explorationMap.width = this.minimapWidth;
    this.explorationMap.height = this.minimapHeight;
    this.explorationCtx = this.explorationMap.getContext('2d');
    this.explorationCtx.fillStyle = '#000000';
    this.explorationCtx.fillRect(0, 0, this.minimapWidth, this.minimapHeight);

    // Boolean grid for fast exploration lookup (avoids per-pixel getImageData)
    this._explorationGrid = new Set();

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
   * Load icons from assets/icons/ folder
   * @param {string} basePath - Base path to icons folder
   * @returns {Promise} Resolves when all icons finish loading (or fail)
   */
  loadIcons(basePath = 'assets/icons/') {
    const iconMap = {
      tree: 'TreeIcon.png',
      rock: 'rockIcon.png',
      house: 'houseIcon.png',
      thicket: 'thicketIcon.png',
      stella: 'stellaIcon.png',
      ben: 'benIcon.png',
      graham: 'grahamIcon.png',
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
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      for (let dy = -radiusCells; dy <= radiusCells; dy++) {
        const cellCenterX = (cx + dx + 0.5) * EXPLORE_CELL_SIZE;
        const cellCenterY = (cy + dy + 0.5) * EXPLORE_CELL_SIZE;
        const distX = cellCenterX - worldX;
        const distY = cellCenterY - worldY;
        if (distX * distX + distY * distY > radiusSq) continue;
        this._explorationGrid.add(`${cx + dx},${cy + dy}`);
      }
    }
  }

  /** Fast O(1) check if a world position has been explored */
  _isExplored(worldX, worldY) {
    const key = `${Math.floor(worldX / EXPLORE_CELL_SIZE)},${Math.floor(worldY / EXPLORE_CELL_SIZE)}`;
    return this._explorationGrid.has(key);
  }

  /** Rebuild exploration grid from canvas pixels (one-time, for legacy saves) */
  _rebuildGridFromCanvas() {
    this._explorationGrid = new Set();
    const imgData = this.explorationCtx.getImageData(0, 0, this.minimapWidth, this.minimapHeight).data;
    const cellPixelW = EXPLORE_CELL_SIZE * this._fullScale;
    const cellPixelH = EXPLORE_CELL_SIZE * this._fullScale;

    const maxCellX = Math.ceil(this.worldWidth / EXPLORE_CELL_SIZE);
    const maxCellY = Math.ceil(this.worldHeight / EXPLORE_CELL_SIZE);

    for (let gx = 0; gx < maxCellX; gx++) {
      for (let gy = 0; gy < maxCellY; gy++) {
        // Sample center pixel of this cell on the exploration canvas
        const px = Math.round(this._fullOffsetX + (gx + 0.5) * cellPixelW);
        const py = Math.round(this._fullOffsetY + (gy + 0.5) * cellPixelH);
        if (px < 0 || py < 0 || px >= this.minimapWidth || py >= this.minimapHeight) continue;
        const idx = (py * this.minimapWidth + px) * 4;
        // Non-black pixel = explored
        if (imgData[idx] !== 0 || imgData[idx + 1] !== 0 || imgData[idx + 2] !== 0) {
          this._explorationGrid.add(`${gx},${gy}`);
        }
      }
    }
    logger.debug(`[MinimapSystem] Rebuilt exploration grid from canvas: ${this._explorationGrid.size} cells`);
  }

  /** Get the active character name and direction for player icon */
  _getPlayerInfo() {
    const ps = getSystem('player');
    return {
      charId: ps?.activeCharacter?.id || 'stella',
      direction: ps?.currentPlayer?.direction || 'right',
    };
  }

  /**
   * Export exploration data as base64 for saving
   * @returns {{ image: string, grid: string[] }}
   */
  exportExploration() {
    return {
      image: this.explorationMap.toDataURL('image/png'),
      grid: [...this._explorationGrid],
    };
  }

  /**
   * Import exploration data from a saved state
   * @param {string|Object} data - base64 dataUrl (legacy) or { image, grid }
   * @returns {Promise}
   */
  importExploration(data) {
    if (!data) return Promise.resolve();

    // Support legacy format (plain string) and new format (object)
    const imageUrl = typeof data === 'string' ? data : data.image;
    const gridArr = typeof data === 'object' ? data.grid : null;

    // Restore boolean grid
    if (gridArr && Array.isArray(gridArr)) {
      this._explorationGrid = new Set(gridArr);
    }

    if (!imageUrl) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.explorationCtx.clearRect(0, 0, this.minimapWidth, this.minimapHeight);
        this.explorationCtx.drawImage(img, 0, 0);

        // Rebuild grid from canvas pixels for legacy saves without grid data
        if (!gridArr) {
          this._rebuildGridFromCanvas();
        }

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

    // Draw exploration fog for visible viewport area
    this._drawExplorationLayer(ctx);

    // World objects
    this._renderObjects(ctx, worldArrays.trees, 'tree', ICON_SIZE);
    this._renderObjects(ctx, worldArrays.rocks, 'rock', ICON_SIZE - 2);
    this._renderObjects(ctx, worldArrays.thickets, 'thicket', ICON_SIZE - 4);
    // Filter houses to only HOUSE_WALLS to avoid duplicates (HOUSE_ROOF is the same position)
    const wallsOnly = worldArrays.houses?.filter(h => h && h.type === 'HOUSE_WALLS') || [];
    this._renderObjects(ctx, wallsOnly, 'house', ICON_SIZE + 4);
    this._renderObjects(ctx, worldArrays.placedBuildings, 'building', ICON_SIZE);
    this._renderObjects(ctx, worldArrays.placedWells, 'well', ICON_SIZE - 2);

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
