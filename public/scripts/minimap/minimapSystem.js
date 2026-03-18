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

    for (const [key, filename] of Object.entries(iconMap)) {
      const img = new Image();
      img.src = `${basePath}${filename}`;
      img.onload = () => { this.icons[key] = img; };
    }
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
  }

  /** Check if a world position has been explored */
  _isExplored(worldX, worldY) {
    const fx = Math.round(this._fullOffsetX + worldX * this._fullScale);
    const fy = Math.round(this._fullOffsetY + worldY * this._fullScale);
    if (fx < 0 || fy < 0 || fx >= this.minimapWidth || fy >= this.minimapHeight) return false;
    const pixel = this.explorationCtx.getImageData(fx, fy, 1, 1).data;
    return pixel[0] !== 0 || pixel[1] !== 0 || pixel[2] !== 0;
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
   * @returns {string}
   */
  exportExploration() {
    return this.explorationMap.toDataURL('image/png');
  }

  /**
   * Import exploration data from a saved base64 string
   * @param {string} dataUrl
   */
  importExploration(dataUrl) {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
      this.explorationCtx.clearRect(0, 0, this.minimapWidth, this.minimapHeight);
      this.explorationCtx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
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
    // For each minimap pixel, check if corresponding world position is explored
    // Optimization: draw the full exploration map scaled/offset to match the viewport
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
