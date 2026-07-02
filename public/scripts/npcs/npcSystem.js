/**
 * @file npcSystem.js - Sistema de NPCs do mundo
 * @description Gerencia NPCs estáticos no mundo: renderização, hitbox de interação,
 * detecção de proximidade e integração com dialogueSystem.
 * Inclui listener próprio de teclado (E) e clique no canvas.
 * @module NpcSystem
 */

import { registerSystem, getSystem, getObject } from '../gameState.js';
import { collisionSystem } from '../collisionSystem.js';
import { camera, CAMERA_ZOOM } from '../thePlayer/cameraSystem.js';
import { markWorldChanged } from '../theWorld.js';
import { i18n } from '../i18n/i18n.js';
import { logger } from '../logger.js';

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

    // Physical collision hitbox (mesmas proporções do player: feet region,
    // WIDTH_RATIO 0.7, HEIGHT_RATIO 0.3). Bloqueia o player de atravessar
    // o NPC e aparece em vermelho no F2.
    const physId = `npc_${npc.id}_phys`;
    const ph = collisionSystem.createPlayerHitbox(npc.x, npc.y, npc.width, npc.height);
    collisionSystem.removeHitbox(physId);
    collisionSystem.addHitbox(physId, 'NPC', ph.x, ph.y, ph.width, ph.height, npc);

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
    collisionSystem.removeHitbox(`npc_${id}_phys`);
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

        // Physical collision hitbox was also wiped by collisionSystem.clear()
        const physId = `npc_${npc.id}_phys`;
        const ph = collisionSystem.createPlayerHitbox(npc.x, npc.y, npc.width, npc.height);
        collisionSystem.removeHitbox(physId);
        collisionSystem.addHitbox(physId, 'NPC', ph.x, ph.y, ph.width, ph.height, npc);
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

        let drawFn;
        if (typeof npc.customDraw === 'function') {
            drawFn = (ctx) => npc.customDraw(ctx, camera, CAMERA_ZOOM);
        } else {
            const img = npcImages.get(npc.id);
            if (!img || !img.complete || img.naturalWidth === 0) continue;
            drawFn = (ctx) => drawNpc(ctx, npc, img);
        }

        const obj = {
            type: 'NPC',
            id: `npc_${npc.id}`,
            x: npc.x,
            y: npc.y,
            width: npc.width,
            height: npc.height,
            draw: drawFn,
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
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

/**
 * Live-update an NPC's position, size, sprite, and hitbox.
 * Only changed fields are applied. Hitbox is rebuilt automatically.
 * Used by hot-reload (F2 debug) and runtime config changes.
 *
 * @param {string} id - NPC id
 * @param {Object} props - Properties to update
 * @param {number} [props.x] - New world X
 * @param {number} [props.y] - New world Y
 * @param {number} [props.width] - New draw width
 * @param {number} [props.height] - New draw height
 * @param {string} [props.sprite] - New sprite path
 * @param {number} [props.interactRadius] - New interaction radius
 */
function updateNpc(id, props) {
    const npc = npcs.get(id);
    if (!npc) return;

    let changed = false;

    if (typeof props.x === 'number' && props.x !== npc.x) { npc.x = props.x; changed = true; }
    if (typeof props.y === 'number' && props.y !== npc.y) { npc.y = props.y; changed = true; }
    if (typeof props.width === 'number' && props.width !== npc.width) { npc.width = props.width; changed = true; }
    if (typeof props.height === 'number' && props.height !== npc.height) { npc.height = props.height; changed = true; }
    if (typeof props.interactRadius === 'number' && props.interactRadius !== npc.interactRadius) { npc.interactRadius = props.interactRadius; changed = true; }

    // Sprite change
    if (props.sprite && props.sprite !== npc.sprite) {
        npc.sprite = props.sprite;
        const img = npcImages.get(id);
        if (img) img.src = props.sprite;
        changed = true;
    }

    if (!changed) return;

    // Rebuild hitbox with new position/size
    const hitboxId = `npc_${id}`;
    const hbX = npc.x - npc.interactRadius / 2;
    const hbY = npc.y - npc.interactRadius / 2;
    const hbW = npc.width + npc.interactRadius;
    const hbH = npc.height + npc.interactRadius;

    const hitbox = {
        id: hitboxId,
        type: 'NPC',
        originalType: 'npc',
        x: hbX, y: hbY, width: hbW, height: hbH,
        npcId: id,
    };

    const oldHitbox = collisionSystem.interactionHitboxes.get(hitboxId);
    if (oldHitbox) collisionSystem._interGrid.remove(hitboxId, oldHitbox);
    collisionSystem.interactionHitboxes.set(hitboxId, hitbox);
    collisionSystem._interGrid.insert(hitboxId, hitbox);

    // Keep physical collision hitbox synced with NPC position/size.
    const physId = `npc_${id}_phys`;
    const ph = collisionSystem.createPlayerHitbox(npc.x, npc.y, npc.width, npc.height);
    if (collisionSystem.hitboxes.has(physId)) {
        collisionSystem.updateHitboxPosition(physId, ph.x, ph.y, ph.width, ph.height);
    } else {
        collisionSystem.addHitbox(physId, 'NPC', ph.x, ph.y, ph.width, ph.height, npc);
    }

    markWorldChanged();
    logger.debug(`[NpcSystem] NPC '${id}' live-updated at (${npc.x}, ${npc.y}) size ${npc.width}x${npc.height}`);
}

// ─── NPC Hot-Reload (F2 debug) ─────────────────────────────────────────────
// Fetches the raw JS source of each NPC file every 1.5s, parses the constant
// object (e.g. `const BRU = { x: 428, ... }`), and live-updates via updateNpc().
// This lets devs edit npcBru.js, save, and see changes in-game instantly.

const NPC_HOT_RELOAD_INTERVAL = 1500;
const NPC_SOURCE_FILES = [
    { id: 'bartolomeu', path: 'scripts/npcs/npcBartolomeu.js' },
    { id: 'milly',      path: 'scripts/npcs/npcMilly.js' },
    { id: 'juan',       path: 'scripts/npcs/npcJuan.js' },
    { id: 'bru',        path: 'scripts/npcs/npcBru.js' },
    { id: 'couple',     path: 'scripts/npcs/npcCouple.js' },
    { id: 'jeremy',     path: 'scripts/npcs/npcJeremy.js' },
    { id: 'john',       path: 'scripts/npcs/family/npcJohn.js' },
    { id: 'lucas',      path: 'scripts/npcs/family/npcLucas.js' },
    { id: 'isabela',    path: 'scripts/npcs/family/npcIsabela.js' },
    { id: 'molly',      path: 'scripts/npcs/family/npcMolly.js' },
];

let _npcHotReloadTimer = null;
const _npcLastSource = new Map();

/**
 * Extracts numeric/string props from the first `const SOMETHING = { ... };`
 * block in a JS source string. Returns { x, y, width, height, interactRadius, sprite }.
 */
function parseNpcConstant(source) {
    // Match the first object literal assigned to a const (greedy enough to capture the block)
    const match = source.match(/const\s+\w+\s*=\s*\{([^}]+)\}/);
    if (!match) return null;

    const block = match[1];
    const props = {};

    // Extract numeric fields using individual regex literals (no escaping issues)
    const xMatch = block.match(/\bx\s*:\s*([\d.]+)/);
    const yMatch = block.match(/\by\s*:\s*([\d.]+)/);
    const wMatch = block.match(/width\s*:\s*([\d.]+)/);
    const hMatch = block.match(/height\s*:\s*([\d.]+)/);
    const rMatch = block.match(/interactRadius\s*:\s*([\d.]+)/);

    if (xMatch) props.x = Number(xMatch[1]);
    if (yMatch) props.y = Number(yMatch[1]);
    if (wMatch) props.width = Number(wMatch[1]);
    if (hMatch) props.height = Number(hMatch[1]);
    if (rMatch) props.interactRadius = Number(rMatch[1]);

    // Extract sprite string
    const spriteMatch = block.match(/sprite\s*:\s*['"]([^'"]+)['"]/);
    if (spriteMatch) props.sprite = spriteMatch[1];

    return props;
}

async function _npcHotReloadTick() {
    for (const { id, path } of NPC_SOURCE_FILES) {
        // Skip NPCs that aren't registered (e.g. not on current map, or day/night hidden)
        if (!npcs.has(id)) continue;

        try {
            const resp = await fetch(path + '?t=' + Date.now());
            const text = await resp.text();

            // Only process if source changed
            if (text === _npcLastSource.get(id)) continue;
            _npcLastSource.set(id, text);

            const props = parseNpcConstant(text);
            if (props) {
                updateNpc(id, props);
            }
        } catch (_) {
            // Silently ignore fetch errors during hot-reload
        }
    }
}

function startNpcHotReload() {
    if (_npcHotReloadTimer) return;
    _npcLastSource.clear();
    _npcHotReloadTimer = setInterval(_npcHotReloadTick, NPC_HOT_RELOAD_INTERVAL);
    logger.info(`[NpcSystem] NPC hot-reload started (polling JS files every ${NPC_HOT_RELOAD_INTERVAL}ms)`);
}

function stopNpcHotReload() {
    if (_npcHotReloadTimer) {
        clearInterval(_npcHotReloadTimer);
        _npcHotReloadTimer = null;
        _npcLastSource.clear();
    }
}

// #227: NPCs de city carregam SOB DEMANDA (ao entrar no city). Só a Milly é
// eager no boot — o gato Madalena da quest dela vive na fazenda. Isso tira 9
// parses de módulo do boot na fazenda, onde nenhum desses NPCs aparece.
let _cityNpcsLoaded = false;
let _cityNpcsLoadPromise = null;
const CITY_NPC_MODULES = [
    './npcBartolomeu.js',
    './npcJuan.js',
    './npcBru.js',
    './npcCouple.js',
    './npcJeremy.js',
    './family/npcJohn.js',
    './family/npcLucas.js',
    './family/npcIsabela.js',
    './family/npcMolly.js',
];

/**
 * Carrega os módulos de NPC de city (idempotente). Chamado ao entrar no city
 * (portal ou save-load, via mapManager). Depois de carregar, re-aplica os
 * gameFlags do save — no load os NPCs ainda não existiam, então o
 * setQuestState foi ignorado; aqui os quest-states são restaurados.
 * @returns {Promise<void>}
 */
async function loadCityNpcs() {
    if (_cityNpcsLoaded) return;
    // Coalesce chamadas concorrentes na MESMA promise em voo, e só marca
    // "carregado" se TODOS os imports deram certo — assim uma falha (rede
    // instável, o cenário do público-alvo) pode ser retentada na próxima entrada.
    if (_cityNpcsLoadPromise) return _cityNpcsLoadPromise;
    _cityNpcsLoadPromise = (async () => {
        const results = await Promise.allSettled(CITY_NPC_MODULES.map(m => import(m)));
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                logger.warn(`[NpcSystem] Falha ao carregar NPC de city: ${CITY_NPC_MODULES[i]}`, r.reason);
            }
        });
        if (results.every(r => r.status === 'fulfilled')) _cityNpcsLoaded = true;
        getSystem('save')?.reapplyGameFlags?.();
    })();
    try {
        await _cityNpcsLoadPromise;
    } finally {
        _cityNpcsLoadPromise = null;
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
    updateNpc,
    loadCityNpcs,
    startNpcHotReload,
    stopNpcHotReload,
};

registerSystem('npc', npcAPI);

export { npcAPI as npcSystem };
export default npcAPI;
