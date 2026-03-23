/**
 * @file minimapIntegration.js - Minimap initialization and game loop integration
 * @description Initializes MinimapUI + MinimapSystem and provides the update function
 * to be called from the main game loop.
 * @module MinimapIntegration
 */

import { MinimapUI } from './minimapUI.js';
import { MinimapSystem } from './minimapSystem.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../worldConstants.js';
import { trees, rocks, thickets, houses, placedBuildings, placedWells } from '../theWorld.js';
import { registerSystem } from '../gameState.js';
import { logger } from '../logger.js';

let minimapUI = null;
let minimapSystem = null;

function resetMinimapState() {
  minimapUI = null;
  minimapSystem = null;
}

/**
 * Initialize the minimap system. Call once after DOM is ready.
 */
export async function initMinimap() {
  if (minimapUI && minimapSystem) {
    logger.debug('Minimap already initialized');
    return;
  }

  try {
    minimapUI = new MinimapUI('.game');
    const canvas = minimapUI.getCanvas();

    if (!canvas) {
      logger.error('Minimap: failed to get canvas');
      resetMinimapState();
      return;
    }

    minimapSystem = new MinimapSystem(canvas, WORLD_WIDTH, WORLD_HEIGHT);
    await minimapSystem.loadIcons('assets/icons/');

    registerSystem('minimap', minimapSystem);
    logger.debug('Minimap fully initialized');
  } catch (e) {
    logger.error('Minimap init failed:', e);
    resetMinimapState();
  }
}

/**
 * Update the minimap. Call from gameLoop every frame.
 * @param {Object} currentPlayer - Player object with x, y properties
 */
export function updateMinimap(currentPlayer) {
  if (!minimapSystem || !currentPlayer) return;

  const worldArrays = {
    trees,
    rocks,
    thickets,
    houses,
    placedBuildings,
    placedWells,
  };

  if (minimapUI?.isVisible) {
    minimapSystem.update(currentPlayer.x, currentPlayer.y, worldArrays);
  } else {
    minimapSystem.updateExploration(currentPlayer.x, currentPlayer.y);
  }
}
