/**
 * @file npcSystem.js - Sistema de NPCs do mundo
 * @description Gerencia NPCs estáticos no mundo: renderização, hitbox de interação,
 * detecção de proximidade e integração com dialogueSystem.
 * Inclui listener próprio de teclado (E) e clique no canvas.
 * @module NpcSystem
 */

import { registerSystem, getSystem, getObject } from './gameState.js';
import { collisionSystem } from './collisionSystem.js';
import { camera, CAMERA_ZOOM } from './thePlayer/cameraSystem.js';
import { markWorldChanged } from './theWorld.js';
import { i18n } from './i18n/i18n.js';
import { logger } from './logger.js';

// ─── NPC Registry ───────────────────────────────────────────────────────────

/** @type {Map<string, NpcDef>} */
const npcs = new Map();

/** @type {Map<string, HTMLImageElement>} */
const npcImages = new Map();

let proximityInterval = null;
let hintElement = null;
let nearestNpcId = null;
let listenersSetup = false;

/**
 * @typedef {Object} NpcDef
 * @property {string} id - Unique NPC id
 * @property {string} name - Display name
 * @property {number} x - World X
 * @property {number} y - World Y
 * @property {number} width - Sprite width
 * @property {number} height - Sprite height
 * @property {string} sprite - Path to sprite image
 * @property {string} map - Map id where NPC exists ('farm' | 'city')
 * @property {Function} onInteract - Called when player presses E near NPC
 * @property {number} [interactRadius=60] - Extra radius around sprite for interaction
 */

// ─── Input listeners ────────────────────────────────────────────────────────

function setupListeners() {
    if (listenersSetup) return;
    listenersSetup = true;

    // E key listener — high priority (capture phase)
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'e' && e.key !== 'E') return;
        if (!nearestNpcId) return;

        // Check dialogue isn't already active
        const dlg = getSystem('dialogue');
        if (dlg && dlg.isDialogueActive()) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        tryInteract();
    }, true); // capture phase = runs before other listeners

    // Click on canvas — check if clicking near an NPC
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('click', (e) => {
            if (!nearestNpcId) return;

            const dlg = getSystem('dialogue');
            if (dlg && dlg.isDialogueActive()) return;

            tryInteract();
        });
    } else {
        // Canvas not ready yet, retry
        setTimeout(() => {
            const c = document.getElementById('gameCanvas');
            if (c) {
                c.addEventListener('click', () => {
                    if (!nearestNpcId) return;
                    const dlg = getSystem('dialogue');
                    if (dlg && dlg.isDialogueActive()) return;
                    tryInteract();
                });
            }
        }, 2000);
    }

    logger.info('[NpcSystem] Input listeners setup (E key + canvas click)');
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Register an NPC in the world.
 * @param {NpcDef} def
 */
function addNpc(def) {
    const npc = {
        interactRadius: 60,
        ...def,
    };

    npcs.set(npc.id, npc);

    // Load sprite image
    const img = new Image();
    img.src = npc.sprite;
    npcImages.set(npc.id, img);

    // Register interaction hitbox (bigger area for detection)
    const hitboxId = `npc_${npc.id}`;
    const hbX = npc.x - npc.interactRadius / 2;
    const hbY = npc.y - npc.interactRadius / 2;
    const hbW = npc.width + npc.interactRadius;
    const hbH = npc.height + npc.interactRadius;

    const hitbox = {
        id: hitboxId,
        type: 'NPC',
        originalType: 'npc',
        x: hbX,
        y: hbY,
        width: hbW,
        height: hbH,
        npcId: npc.id,
    };

    // Remove old if exists
    const oldHitbox = collisionSystem.interactionHitboxes.get(hitboxId);
    if (oldHitbox) collisionSystem._interGrid.remove(hitboxId, oldHitbox);

    // Add to both Map and spatial grid
    collisionSystem.interactionHitboxes.set(hitboxId, hitbox);
    collisionSystem._interGrid.insert(hitboxId, hitbox);

    logger.info(`[NpcSystem] NPC '${npc.id}' registered at (${npc.x}, ${npc.y}) on map '${npc.map}'`);

    // Invalidate world cache so NPC appears on next frame
    markWorldChanged();

    // Start systems if not running
    if (!proximityInterval) {
        startProximityCheck();
    }
    setupListeners();
}

/**
 * Remove an NPC.
 * @param {string} id
 */
function removeNpc(id) {
    npcs.delete(id);
    npcImages.delete(id);
    const hitboxId = `npc_${id}`;
    const hitbox = collisionSystem.interactionHitboxes.get(hitboxId);
    if (hitbox) collisionSystem._interGrid.remove(hitboxId, hitbox);
    collisionSystem.interactionHitboxes.delete(hitboxId);
}

/**
 * Get all NPCs for a specific map.
 * @param {string} mapId
 * @returns {Array<NpcDef>}
 */
function getNpcsForMap(mapId) {
    const result = [];
    for (const npc of npcs.values()) {
        if (npc.map === mapId) result.push(npc);
    }
    return result;
}

/**
 * Re-register interaction hitboxes for all NPCs on a given map.
 * Must be called after collisionSystem.clear() on map transitions.
 * @param {string} mapId
 */
function registerHitboxesForMap(mapId) {
    for (const npc of npcs.values()) {
        if (npc.map !== mapId) continue;

        const hitboxId = `npc_${npc.id}`;
        const hbX = npc.x - npc.interactRadius / 2;
        const hbY = npc.y - npc.interactRadius / 2;
        const hbW = npc.width + npc.interactRadius;
        const hbH = npc.height + npc.interactRadius;

        const hitbox = {
            id: hitboxId,
            type: 'NPC',
            originalType: 'npc',
            x: hbX,
            y: hbY,
            width: hbW,
            height: hbH,
            npcId: npc.id,
        };

        const oldHitbox = collisionSystem.interactionHitboxes.get(hitboxId);
        if (oldHitbox) collisionSystem._interGrid.remove(hitboxId, oldHitbox);

        collisionSystem.interactionHitboxes.set(hitboxId, hitbox);
        collisionSystem._interGrid.insert(hitboxId, hitbox);
    }

    markWorldChanged();
    logger.info(`[NpcSystem] Re-registered hitboxes for map '${mapId}'`);
}

/**
 * Draw all NPCs for the current map.
 * Called from theWorld.js getSortedWorldObjects.
 * @param {string} mapId
 * @returns {Array<Object>} World objects to add to sort list
 */
function getWorldObjects(mapId) {
    const objects = [];

    for (const npc of npcs.values()) {
        if (npc.map !== mapId) continue;

        const img = npcImages.get(npc.id);
        if (!img || !img.complete || img.naturalWidth === 0) continue;

        const obj = {
            type: 'NPC',
            id: `npc_${npc.id}`,
            x: npc.x,
            y: npc.y,
            width: npc.width,
            height: npc.height,
            draw: (ctx) => drawNpc(ctx, npc, img),
        };
        if (npc.layerIndex !== undefined) obj.layerIndex = npc.layerIndex;
        objects.push(obj);
    }

    return objects;
}

/**
 * Draw a single NPC on the canvas.
 */
function drawNpc(ctx, npc, img) {
    const screenPos = camera.worldToScreen(npc.x, npc.y);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
        img,
        screenPos.x,
        screenPos.y,
        npc.width * CAMERA_ZOOM,
        npc.height * CAMERA_ZOOM
    );
    ctx.restore();
}

// ─── Proximity & Interaction ────────────────────────────────────────────────

function startProximityCheck() {
    if (proximityInterval) return;
    proximityInterval = setInterval(checkProximity, 150);
}

function checkProximity() {
    const currentPlayer = getObject('currentPlayer');
    if (!currentPlayer) return;

    const mapMgr = getSystem('mapManager');
    const currentMapId = mapMgr ? mapMgr.getCurrentMapId() : 'farm';

    let closestNpc = null;
    let closestDist = Infinity;

    for (const npc of npcs.values()) {
        if (npc.map !== currentMapId) continue;

        const hitbox = collisionSystem.interactionHitboxes.get(`npc_${npc.id}`);
        if (!hitbox) continue;

        // Use the player interaction range (yellow hitbox) — same system the game uses
        const inRange = collisionSystem.checkPlayerInteraction(hitbox);

        if (inRange) {
            const dx = currentPlayer.x - (npc.x + npc.width / 2);
            const dy = currentPlayer.y - (npc.y + npc.height / 2);
            const dist = dx * dx + dy * dy;
            if (dist < closestDist) {
                closestDist = dist;
                closestNpc = npc;
            }
        }
    }

    if (closestNpc && nearestNpcId !== closestNpc.id) {
        nearestNpcId = closestNpc.id;
        showHint(closestNpc.name);
    } else if (!closestNpc && nearestNpcId) {
        nearestNpcId = null;
        hideHint();
    }
}

/**
 * Try to interact with the nearest NPC.
 * @returns {boolean} true if an NPC interaction was triggered
 */
function tryInteract() {
    if (!nearestNpcId) return false;

    const npc = npcs.get(nearestNpcId);
    if (!npc || !npc.onInteract) return false;

    // Check dialogue system isn't already active
    const dlg = getSystem('dialogue');
    if (dlg && dlg.isDialogueActive()) return false;

    hideHint();
    npc.onInteract(npc);
    return true;
}

// ─── Hint UI ────────────────────────────────────────────────────────────────

function showHint(npcName) {
    hideHint();

    hintElement = document.createElement('div');
    hintElement.id = 'npc-hint';
    hintElement.style.cssText = `
        position: fixed; bottom: 120px; left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.85); color: #ffeb3b;
        padding: 10px 20px; border-radius: 10px;
        font-size: 15px; font-family: sans-serif;
        z-index: 99999; pointer-events: none;
        border: 1px solid rgba(255,235,59,0.3);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;
    hintElement.textContent = i18n.t('dialogue.talkHint', { name: npcName });
    document.body.appendChild(hintElement);
}

function hideHint() {
    if (hintElement) {
        hintElement.remove();
        hintElement = null;
    }
}

// ─── Register ───────────────────────────────────────────────────────────────

/**
 * Update the sprite image for an existing NPC.
 * @param {string} id - NPC id
 * @param {string} spriteSrc - New sprite image path
 * @param {Object} [dims] - Optional draw dimensions { width, height } for the new sprite
 */
function updateSprite(id, spriteSrc, dims) {
    const img = npcImages.get(id);
    if (img && img.src !== spriteSrc) {
        img.src = spriteSrc;
        markWorldChanged();
    }
    if (dims) {
        const npc = npcs.get(id);
        if (npc) {
            if (typeof dims.width === 'number') npc.width = dims.width;
            if (typeof dims.height === 'number') npc.height = dims.height;
            markWorldChanged();
        }
    }
}

const npcAPI = {
    addNpc,
    removeNpc,
    getNpcsForMap,
    getWorldObjects,
    tryInteract,
    registerHitboxesForMap,
    updateSprite,
};

registerSystem('npc', npcAPI);

export { npcAPI as npcSystem };
export default npcAPI;
