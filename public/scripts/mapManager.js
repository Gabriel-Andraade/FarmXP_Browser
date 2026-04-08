/**
 * @file mapManager.js - Sistema de gerenciamento de mapas
 * @description Controla transições entre mapas (fazenda ↔ cidade).
 * Mantém camera, clima e dia/noite inalterados — apenas troca o "cenário".
 * @module MapManager
 */

import { registerSystem, getObject, getSystem } from './gameState.js';
import { collisionSystem } from './collisionSystem.js';
import { camera } from './thePlayer/cameraSystem.js';
import { markWorldChanged, invalidateGrassCache, trees, rocks, thickets, houses, animals, placedBuildings, placedWells } from './theWorld.js';
import { blockInteractions, unblockInteractions } from './loadingScreen.js';
import { logger } from './logger.js';
import { loadCityAssets, areCityAssetsLoaded, invalidateCityCache, ensureCityRendererReady } from './cityRenderer.js';
import { cityHouseSystem } from './cityHouseSystem.js';
import { cityObstaclesSystem } from './cityObstaclesSystem.js';
import { t } from './i18n/i18n.js';

// ─── Map definitions ────────────────────────────────────────────────────────

export const MAPS = {
    farm: {
        id: 'farm',
        name: 'Fazenda',
        width: 4000,
        height: 5010,
        bgColor: '#5a9367',
        useGrass: true,
    },
    city: {
        id: 'city',
        name: 'Goose Cape City',
        width: 2560,   // 80 tiles × 32px
        height: 2560,
        bgColor: '#7a7a7a',
        useGrass: false,
    }
};

// ─── State ──────────────────────────────────────────────────────────────────

let currentMapId = 'farm';
let isTransitioning = false;

/** Saved farm state so we can restore when coming back */
let savedFarmState = null;

// ─── Pickup truck image (farm portal) ───────────────────────────────────────

const pickupImg = new Image();
pickupImg.src = 'assets/character/player_car/sGreenPickup.png';

function getPickupImage() {
    return pickupImg;
}

// ─── Portal definitions ─────────────────────────────────────────────────────

/**
 * Returns the portal config for the current map.
 * Farm: pickup truck to the right of the house.
 * City: green square at spawn area → goes back to farm.
 */
export function getPortalForMap(mapId) {
    if (mapId === 'farm') {
        return {
            id: 'portal_to_city',
            x: 2000 + 295 + 30,
            y: 2280,
            width: 150,
            height: 200,
            label: 'Picape',
            targetMap: 'city',
            targetSpawn: { x: 32, y: 2421 },
            useImage: true, // flag to draw image instead of colored square
        };
    }
    if (mapId === 'city') {
        return {
            id: 'portal_to_farm',
            x: 32,
            y: 2421,
            width: 50,
            height: 50,
            color: '#42f554',
            label: 'Fazenda',
            targetMap: 'farm',
            targetSpawn: { x: 2375, y: 2490 },
        };
    }
    return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getCurrentMap() {
    return MAPS[currentMapId];
}

export function getCurrentMapId() {
    return currentMapId;
}

export function isMapTransitioning() {
    return isTransitioning;
}

/**
 * Draw the portal for the current map.
 * Farm: draws the pickup truck image.
 * City: draws a colored square.
 */
export function drawPortal(ctx) {
    const portal = getPortalForMap(currentMapId);
    if (!portal) return;

    const screenPos = camera.worldToScreen(portal.x, portal.y);
    const w = portal.width * camera.zoom;
    const h = portal.height * camera.zoom;

    ctx.save();

    if (portal.useImage) {
        // Draw pickup truck image with custom size
        const img = getPickupImage();
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, screenPos.x, screenPos.y, 150, 200);
        }
    } else {
        // Colored square (city portal)
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = portal.color;
        ctx.fillRect(screenPos.x, screenPos.y, w, h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenPos.x, screenPos.y, w, h);

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(12 * camera.zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(portal.label, screenPos.x + w / 2, screenPos.y - 6 * camera.zoom);
    }

    ctx.restore();
}

/**
 * Check if the player is colliding with the portal and show hint / handle interaction.
 */
export function checkPortalInteraction(playerX, playerY, playerW, playerH) {
    const portal = getPortalForMap(currentMapId);
    if (!portal || isTransitioning) return false;

    const px = playerX;
    const py = playerY;

    // Simple AABB check
    const collides =
        px < portal.x + portal.width &&
        px + playerW > portal.x &&
        py < portal.y + portal.height &&
        py + playerH > portal.y;

    const hintEl = document.getElementById('portal-hint');

    if (collides) {
        if (!hintEl) {
            showPortalHint(portal.label);
        }
        return true;
    } else {
        if (hintEl) hintEl.remove();
        return false;
    }
}

/**
 * Trigger the map transition (call when player presses E near portal).
 * On the farm, the pickup is broken → show speech bubble instead.
 */
export async function triggerPortalTransition() {
    const portal = getPortalForMap(currentMapId);
    if (!portal || isTransitioning) return;

    // Farm pickup: check quest status via handlePickupInteraction
    if (currentMapId === 'farm') {
        const questSys = getSystem('quests');
        if (questSys) {
            const canTravel = questSys.handlePickupInteraction();
            if (!canTravel) { hidePortalHint(); return; }
        }
    }

    isTransitioning = true;
    hidePortalHint();
    blockInteractions();

    // Show transition overlay
    showTransitionScreen(portal.label);

    // Small delay for UX
    await wait(800);

    if (currentMapId === 'farm') {
        // Save farm state before leaving
        savedFarmState = snapshotFarmState();
        clearWorldObjects();
        // Pre-load city assets
        if (!areCityAssetsLoaded()) {
            await loadCityAssets();
        }
        // Ensure cityRenderer module is ready for sync rendering
        await ensureCityRendererReady();
        // Register city house hitboxes when entering city
        cityHouseSystem.registerHouseHitboxes();
        await cityObstaclesSystem.registerObstacles();
        // Re-register NPC hitboxes (cleared by collisionSystem.clear())
        const npcSys = getSystem('npc');
        if (npcSys) npcSys.registerHitboxesForMap('city');
    } else {
        // Leaving city — clear city-only objects and hitboxes
        cityHouseSystem.clearHouseHitboxes();
        cityObstaclesSystem.clearObstacles();
        clearWorldObjects();
        invalidateCityCache();
    }

    // Switch map
    const targetMapId = portal.targetMap;
    const targetSpawn = portal.targetSpawn;
    currentMapId = targetMapId;

    // Update camera bounds
    const map = MAPS[targetMapId];
    updateCameraBounds(map.width, map.height);

    if (targetMapId === 'farm' && savedFarmState) {
        restoreFarmState(savedFarmState);
    }

    // Teleport player
    const player = getObject('currentPlayer');
    if (player) {
        player.x = targetSpawn.x;
        player.y = targetSpawn.y;
    }

    markWorldChanged();
    invalidateGrassCache();

    // Register portal hitbox for collision system
    registerPortalHitbox();

    // Re-register NPC hitboxes for target map
    const npcSysAfter = getSystem('npc');
    if (npcSysAfter) npcSysAfter.registerHitboxesForMap(targetMapId);

    // Re-register Madalena hitbox if quest is active on the farm
    if (targetMapId === 'farm') {
        const millyAfter = getSystem('npcMilly');
        if (millyAfter && typeof millyAfter.reregisterHitbox === 'function') {
            millyAfter.reregisterHitbox();
        }

        // Re-register the house door interaction hitbox — collisionSystem.clear()
        // dropped it during the map transition.
        const houseAfter = getSystem('house');
        if (houseAfter && typeof houseAfter.reregisterDoorHitbox === 'function') {
            houseAfter.reregisterDoorHitbox();
        }
    }

    await wait(700);

    hideTransitionScreen();
    unblockInteractions();
    isTransitioning = false;

    logger.info(`Map transitioned to: ${targetMapId}`);
    document.dispatchEvent(new CustomEvent('mapChanged', { detail: { mapId: targetMapId } }));
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updateCameraBounds(width, height) {
    // Patch the camera.follow method to use new bounds
    camera._mapWidth = width;
    camera._mapHeight = height;
}

function snapshotFarmState() {
    return {
        trees: [...trees],
        rocks: [...rocks],
        thickets: [...thickets],
        houses: [...houses],
        animals: [...animals],
        placedBuildings: [...placedBuildings],
        placedWells: [...placedWells],
    };
}

function restoreFarmState(state) {
    trees.length = 0;
    rocks.length = 0;
    thickets.length = 0;
    houses.length = 0;
    animals.length = 0;
    placedBuildings.length = 0;
    placedWells.length = 0;

    trees.push(...state.trees);
    rocks.push(...state.rocks);
    thickets.push(...state.thickets);
    houses.push(...state.houses);
    animals.push(...state.animals);
    placedBuildings.push(...state.placedBuildings);
    placedWells.push(...state.placedWells);

    // Re-register hitboxes
    collisionSystem.clear();
    for (const tree of trees) {
        collisionSystem.addHitbox(tree.id, 'TREE', tree.x, tree.y, tree.width, tree.height);
    }
    for (const rock of rocks) {
        collisionSystem.addHitbox(rock.id, 'ROCK', rock.x, rock.y, rock.width, rock.height);
    }
    for (const thicket of thickets) {
        collisionSystem.addHitbox(thicket.id, 'THICKET', thicket.x, thicket.y, thicket.width, thicket.height);
    }
    for (const house of houses) {
        if (house.type === 'HOUSE_WALLS') {
            collisionSystem.addHitbox(house.id, 'HOUSE_WALLS', house.x, house.y, house.width, house.height);
        } else if (house.type === 'HOUSE_ROOF') {
            // HOUSE_ROOF é o que realmente bloqueia o player (parede colidível
            // gerada via offsets no registerPhysicalHitbox). Sem isso a casa
            // fica passável após voltar de outro mapa.
            collisionSystem.addHitbox(house.id, 'HOUSE_ROOF', house.x, house.y, house.width, house.height);
        }
    }
    for (const b of placedBuildings) {
        collisionSystem.addHitbox(b.id, b.type || 'CONSTRUCTION', b.x, b.y, b.width, b.height);
    }
    for (const w of placedWells) {
        collisionSystem.addHitbox(w.id, 'WELL', w.x, w.y, w.width, w.height);
    }

    // Re-register pickup truck hitbox (force=true since collisionSystem was cleared)
    const questSys = getSystem('quests');
    if (questSys) questSys.registerPickupHitbox(true);
}

function clearWorldObjects() {
    trees.length = 0;
    rocks.length = 0;
    thickets.length = 0;
    houses.length = 0;
    animals.length = 0;
    placedBuildings.length = 0;
    placedWells.length = 0;
    collisionSystem.clear();
}

function registerPortalHitbox() {
    const portal = getPortalForMap(currentMapId);
    if (portal && currentMapId !== 'city') {
        collisionSystem.addHitbox(portal.id, 'PORTAL', portal.x, portal.y, portal.width, portal.height);
    }
}

// ─── UI helpers ─────────────────────────────────────────────────────────────

function showPortalHint(label) {
    hidePortalHint();
    const hint = document.createElement('div');
    hint.id = 'portal-hint';
    hint.className = 'door-hint active';
    const content = document.createElement('div');
    content.className = 'hint-content';
    const text = document.createElement('span');
    text.className = 'hint-text';
    text.textContent = `${t('quests.hint')} — ${label}`;
    content.appendChild(text);
    hint.appendChild(content);
    document.body.appendChild(hint);
}

function hidePortalHint() {
    const el = document.getElementById('portal-hint');
    if (el) el.remove();
}

function showTransitionScreen(targetName) {
    const overlay = document.createElement('div');
    overlay.id = 'map-transition-screen';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: #000; display: flex; align-items: center;
        justify-content: center; flex-direction: column;
        opacity: 0; transition: opacity 0.5s;
        color: #fff; font-family: sans-serif;
    `;

    const title = document.createElement('h2');
    title.textContent = t('quests.traveling', { target: targetName });
    title.style.cssText = 'font-size: 28px; margin-bottom: 16px;';

    const dots = document.createElement('div');
    dots.className = 'ldg-dots';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'ldg-dot';
        dots.appendChild(dot);
    }

    overlay.append(title, dots);
    document.body.appendChild(overlay);
    // Force reflow for transition
    overlay.offsetHeight;
    overlay.style.opacity = '1';
}

function hideTransitionScreen() {
    const el = document.getElementById('map-transition-screen');
    if (el) {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
    }
}

// ─── Init ───────────────────────────────────────────────────────────────────

// ─── Save/Load support ─────────────────────────────────────────────────────

/**
 * Restore the map when loading a save (no transition animation).
 * If the saved map is 'city', loads city assets and registers hitboxes.
 * @param {string} mapId - 'farm' or 'city'
 */
async function restoreMap(mapId) {
    if (mapId === currentMapId) return;

    if (mapId === 'city') {
        savedFarmState = snapshotFarmState();
        clearWorldObjects();

        if (!areCityAssetsLoaded()) {
            await loadCityAssets();
        }
        await ensureCityRendererReady();

        currentMapId = 'city';
        updateCameraBounds(MAPS.city.width, MAPS.city.height);

        cityHouseSystem.registerHouseHitboxes();
        await cityObstaclesSystem.registerObstacles();

        const npcSys = getSystem('npc');
        if (npcSys) npcSys.registerHitboxesForMap('city');

        registerPortalHitbox();
        markWorldChanged();
        invalidateGrassCache();

        logger.info('[MapManager] Restored map to city (from save)');
    } else {
        cityHouseSystem.clearHouseHitboxes();
        cityObstaclesSystem.clearObstacles();
        clearWorldObjects();
        invalidateCityCache();

        currentMapId = 'farm';
        updateCameraBounds(MAPS.farm.width, MAPS.farm.height);

        if (savedFarmState) {
            restoreFarmState(savedFarmState);
        }

        registerPortalHitbox();
        markWorldChanged();
        invalidateGrassCache();

        logger.info('[MapManager] Restored map to farm (from save)');
    }
}

registerSystem('mapManager', {
    getCurrentMap,
    getCurrentMapId,
    getPortalForMap,
    triggerPortalTransition,
    checkPortalInteraction,
    drawPortal,
    isMapTransitioning,
    restoreMap,
    MAPS,
});

export default {
    getCurrentMap,
    getCurrentMapId,
    getPortalForMap,
    triggerPortalTransition,
    checkPortalInteraction,
    drawPortal,
    isMapTransitioning,
    restoreMap,
    MAPS,
};
