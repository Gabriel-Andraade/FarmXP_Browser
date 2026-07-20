/**
 * @file minimapIntegration.js - Minimap initialization and game loop integration
 * @description Initializes MinimapUI + MinimapSystem and provides the update function
 * to be called from the main game loop. Map-aware: follows farm↔city transitions,
 * sourcing the right point-of-interest markers per map (#231).
 * @module MinimapIntegration
 */

import { MinimapUI } from './minimapUI.js';
import { MinimapSystem } from './minimapSystem.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../worldConstants.js';
import { trees, rocks, thickets, houses, placedWells } from '../theWorld.js';
import { registerSystem, getSystem } from '../gameState.js';
import { MAPS, getCurrentMapId, getPortalForMap } from '../mapManager.js';
import { logger } from '../logger.js';

let minimapUI = null;
let minimapSystem = null;
let _mapListenerBound = false;

// City house owner (lowercase) → minimap icon key. Used only as a FALLBACK: if
// the pre-rendered Goose Cape map image fails to load, the minimap draws these
// house markers so the houses still show. Bartolomeu spans two hitboxes → one.
const CITY_HOUSE_ICON = {
  bru: 'bru',
  family: 'millers',
  twins: 'twins',
  bartolomeu: 'bartolomeu',
  milly: 'milly',
};

function resetMinimapState() {
  minimapUI = null;
  minimapSystem = null;
}

/** Point the minimap at a map (its dimensions + own fog). */
function _applyMap(mapId) {
  const map = MAPS[mapId] || MAPS.farm;
  minimapSystem?.setMap(mapId, map.width, map.height);
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

    // Sync to the current map, then follow farm↔city transitions so fog and
    // dimensions track the active map.
    _applyMap(getCurrentMapId());
    if (!_mapListenerBound) {
      document.addEventListener('mapChanged', (e) => {
        const id = e.detail?.mapId;
        if (id) _applyMap(id);
      });
      _mapListenerBound = true;
    }

    logger.debug('Minimap fully initialized');
  } catch (e) {
    logger.error('Minimap init failed:', e);
    resetMinimapState();
  }
}

/** Farm POIs: a Goose Cape marker at the farm→city portal (known destination). */
function _buildFarmPois() {
  const portal = getPortalForMap('farm');
  if (!portal) return [];
  return [{
    x: portal.x + portal.width / 2,
    y: portal.y + portal.height / 2,
    icon: 'goosecape',
    size: 22,
    alwaysShow: true, // visible even before exploring — it's a known place
  }];
}

/**
 * City house markers — a FALLBACK for when the Goose Cape base image can't be
 * drawn (the minimap system only renders these if that image isn't available).
 * `alwaysShow` so they appear regardless of city fog in that degraded case.
 */
function _buildCityPois() {
  const list = getSystem('cityHouse')?.houses;
  if (!Array.isArray(list)) return [];

  const seen = new Set();
  const pois = [];
  for (const h of list) {
    if (!h || (h.width === 0 && h.height === 0)) continue; // skip placeholders
    const owner = String(h.owner || '').toLowerCase();
    if (seen.has(owner)) continue; // Bartolomeu spans 2 hitboxes → one marker
    seen.add(owner);
    pois.push({
      x: h.x + h.width / 2,
      y: h.y + h.height / 2,
      icon: CITY_HOUSE_ICON[owner] || 'house',
      size: 18,
      alwaysShow: true,
    });
  }
  return pois;
}

/**
 * Update the minimap. Call from gameLoop every frame.
 * @param {Object} currentPlayer - Player object with x, y properties
 */
export function updateMinimap(currentPlayer) {
  if (!minimapSystem || !currentPlayer) return;

  // Hidden: only keep painting fog (cheap) — skip building the render payload.
  if (!minimapUI?.isVisible) {
    minimapSystem.updateExploration(currentPlayer.x, currentPlayer.y);
    return;
  }

  // Map-aware payload. The city normally renders the pre-rendered Goose Cape
  // map (drawn by the minimap system); the house POIs ride along only as a
  // fallback if that image can't be drawn. The farm shows its world objects
  // plus the Goose Cape marker at the city portal.
  const worldArrays = (getCurrentMapId() === 'city')
    ? { pois: _buildCityPois() }
    : { trees, rocks, thickets, houses, placedWells, pois: _buildFarmPois() };

  minimapSystem.update(currentPlayer.x, currentPlayer.y, worldArrays);
}
