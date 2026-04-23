/**
 * @file npcIsabela.js - NPC Isabela, filha mais velha de John e Molly
 * @description Isabela anda livremente pela cidade (free-roam), 6 frames
 * moving (R0-R5) + idle. Só direção R; anda pra esquerda = sprite espelhado.
 * Desaparece às 19:00 e reaparece às 6:10 (igual John).
 * Proporção próxima da Stella.
 * @module NpcIsabela
 */

import { getSystem, registerSystem } from '../../gameState.js';
import { i18n, t } from '../../i18n/i18n.js';
import { WeatherSystem } from '../../weather.js';
import { camera } from '../../thePlayer/cameraSystem.js';
import { logger } from '../../logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const ISABELA_ID = 'isabela';
const ISABELA_NAME = 'Isabela';
const ISABELA_MAP = 'city';

const ISABELA_START_X = 174;
const ISABELA_START_Y = 1214;

// Caixa lógica (y-sort + base para âncora). Pés em posY + ISABELA_DRAW_H.
const ISABELA_DRAW_W = 20;
const ISABELA_DRAW_H = 44;

// Tamanhos de desenho SEPARADOS por estado (padrão do player).
const ISABELA_STAND_DRAW_W = 22;
const ISABELA_STAND_DRAW_H = 44;
const ISABELA_MOVE_DRAW_W  = 22;
const ISABELA_MOVE_DRAW_H  = 44;

// Literais duplicados (não identificadores) pro hot-reload do npcSystem.
// Mantenha em sincronia com ISABELA_START_X/Y e ISABELA_DRAW_W/H.
const ISABELA = {
    id: 'isabela',
    name: 'Isabela',
    x: 174,
    y: 1214,
    width: 20,
    height: 44,
    sprite: 'assets/character/family/moveIsabela/Isabela_idle.png',
    map: 'city',
    interactRadius: 60,
};

const ISABELA_SPRITE_FOLDER = 'assets/character/family/moveIsabela';
const ISABELA_SPRITE_STAND = `${ISABELA_SPRITE_FOLDER}/Isabela_idle.png`;
const ISABELA_SPRITE_PREINTRO = 'assets/character/family/idle_family/isabela_idle_00.png';
const ISABELA_MOVING_FRAMES = 7;

// Dialogue portraits
const ISABELA_DIALOG_00 = 'assets/character/family/isabela_dialog_00.png';
const ISABELA_DIALOG_01 = 'assets/character/family/isabela_dialog_01.png';
const ISABELA_DIALOG_02 = 'assets/character/family/isabela_dialog_02.png';

const NIGHT_HOUR = 19;
const MORNING_HOUR = 6;
const MORNING_MINUTE = 10;

// Roam / animação
const ROAM_RADIUS = 110;
const ISABELA_SPEED = 42;

// Bordas do mapa (city = 2560×2560). Margem para não encostar na borda visível.
const MAP_W = 2560;
const MAP_H = 2560;
const BORDER_MARGIN = 8;
const FRAME_DELAY_MS = 220;
const IDLE_MIN_MS = 1500;
const IDLE_MAX_MS = 4200;
const MOVE_MIN_MS = 1200;
const MOVE_MAX_MS = 2800;
const HITBOX_SYNC_THRESHOLD = 4;

// ─── State ──────────────────────────────────────────────────────────────────

let isVisible = true;
let pendingChange = null;

const movingImgs = [];
let standImg = null;
let preIntroImg = null;
let imagesReady = false;

let posX = ISABELA_START_X;
let posY = ISABELA_START_Y;
let lastSyncedX = posX;
let lastSyncedY = posY;

let targetX = ISABELA_START_X;
let targetY = ISABELA_START_Y;

let isMoving = false;
let facingLeft = false;

let frameIndex = 0;
let lastFrameTime = 0;

let stateTimer = 0;
let stateDuration = IDLE_MIN_MS;
let lastTickTime = 0;
let aiInterval = null;

/** true depois que o player interagiu com ela a primeira vez (pré-intro) */
let hasNoticedPlayer = false;

// ─── Sprite preload ─────────────────────────────────────────────────────────

function onImageReady(img) {
    return new Promise((resolve) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.onload = () => resolve();
        img.onerror = () => resolve();
    });
}

function preloadSprites() {
    if (movingImgs.length > 0) return;
    const loaders = [];
    for (let i = 0; i < ISABELA_MOVING_FRAMES; i++) {
        const img = new Image();
        img.src = `${ISABELA_SPRITE_FOLDER}/Isabela_moving(R${i}).png`;
        movingImgs[i] = img;
        loaders.push(onImageReady(img));
    }
    standImg = new Image();
    standImg.src = ISABELA_SPRITE_STAND;
    loaders.push(onImageReady(standImg));

    preIntroImg = new Image();
    preIntroImg.src = ISABELA_SPRITE_PREINTRO;
    loaders.push(onImageReady(preIntroImg));

    Promise.all(loaders).then(() => {
        imagesReady = true;
    });
}

// ─── Free-roam AI ───────────────────────────────────────────────────────────

function pickNewState() {
    frameIndex = 0;
    if (Math.random() > 0.45) {
        isMoving = true;
        stateDuration = MOVE_MIN_MS + Math.random() * (MOVE_MAX_MS - MOVE_MIN_MS);
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * ROAM_RADIUS;
        targetX = ISABELA_START_X + Math.cos(angle) * dist;
        targetY = ISABELA_START_Y + Math.sin(angle) * dist;
        targetX = Math.max(BORDER_MARGIN, Math.min(MAP_W - ISABELA_DRAW_W - BORDER_MARGIN, targetX));
        targetY = Math.max(BORDER_MARGIN, Math.min(MAP_H - ISABELA_DRAW_H - BORDER_MARGIN, targetY));
    } else {
        isMoving = false;
        stateDuration = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
    }
}

function tick() {
    const now = performance.now();
    const dt = lastTickTime === 0 ? 16 : Math.min(100, now - lastTickTime);
    lastTickTime = now;

    if (!isVisible) {
        isMoving = false;
        frameIndex = 0;
        return;
    }
    const dlg = getSystem('dialogue');
    const dialogueActive = dlg && dlg.isDialogueActive && dlg.isDialogueActive();
    if (dialogueActive) {
        isMoving = false;
        frameIndex = 0;
        stateTimer = now;
        stateDuration = IDLE_MIN_MS;
        return;
    }

    // Pre-roam: fica parada na posição inicial até o dia seguinte ao intro.
    const john = getSystem('npcJohn');
    if (!john?.hasFamilyRoamStarted?.()) {
        isMoving = false;
        frameIndex = 0;
        if (posX !== ISABELA_START_X || posY !== ISABELA_START_Y) {
            posX = ISABELA_START_X;
            posY = ISABELA_START_Y;
            targetX = ISABELA_START_X;
            targetY = ISABELA_START_Y;
            const npcSys = getSystem('npc');
            if (npcSys?.updateNpc) npcSys.updateNpc(ISABELA_ID, { x: posX, y: posY });
            lastSyncedX = posX;
            lastSyncedY = posY;
        }
        stateTimer = now;
        return;
    }

    if (now - stateTimer > stateDuration) {
        pickNewState();
        stateTimer = now;
    }

    if (isMoving) {
        const dx = targetX - posX;
        const dy = targetY - posY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            isMoving = false;
            frameIndex = 0;
            stateTimer = now;
            stateDuration = IDLE_MIN_MS;
        } else {
            const step = ISABELA_SPEED * (dt / 1000);
            const vx = (dx / dist) * step;
            const vy = (dy / dist) * step;
            posX += vx;
            posY += vy;

            const minX = BORDER_MARGIN;
            const minY = BORDER_MARGIN;
            const maxX = MAP_W - ISABELA_DRAW_W - BORDER_MARGIN;
            const maxY = MAP_H - ISABELA_DRAW_H - BORDER_MARGIN;
            if (posX < minX) { posX = minX; targetX = ISABELA_START_X; }
            if (posY < minY) { posY = minY; targetY = ISABELA_START_Y; }
            if (posX > maxX) { posX = maxX; targetX = ISABELA_START_X; }
            if (posY > maxY) { posY = maxY; targetY = ISABELA_START_Y; }

            if (Math.abs(vx) > 0.01) facingLeft = vx < 0;

            if (now - lastFrameTime >= FRAME_DELAY_MS) {
                lastFrameTime = now;
                frameIndex = (frameIndex + 1) % ISABELA_MOVING_FRAMES;
            }
        }
    }

    // Clamp dentro do raio
    const fromStartX = posX - ISABELA_START_X;
    const fromStartY = posY - ISABELA_START_Y;
    const distFromStart = Math.sqrt(fromStartX * fromStartX + fromStartY * fromStartY);
    if (distFromStart > ROAM_RADIUS * 1.2) {
        targetX = ISABELA_START_X;
        targetY = ISABELA_START_Y;
        isMoving = true;
        stateTimer = now;
        stateDuration = MOVE_MAX_MS;
    }

    // Sync hitbox quando andou o suficiente
    const sdx = posX - lastSyncedX;
    const sdy = posY - lastSyncedY;
    if (sdx * sdx + sdy * sdy >= HITBOX_SYNC_THRESHOLD * HITBOX_SYNC_THRESHOLD) {
        const npcSys = getSystem('npc');
        if (npcSys && typeof npcSys.updateNpc === 'function') {
            npcSys.updateNpc(ISABELA_ID, { x: posX, y: posY });
        }
        lastSyncedX = posX;
        lastSyncedY = posY;
    }
}

// ─── Custom draw ────────────────────────────────────────────────────────────

function customDraw(ctx, cam, zoom) {
    if (!cam || !imagesReady) return;
    const john = getSystem('npcJohn');
    const preRoam = !john?.hasFamilyRoamStarted?.();
    const source = preRoam
        ? (preIntroImg || standImg)
        : (isMoving ? (movingImgs[frameIndex] || standImg) : standImg);
    if (!source || !source.complete || source.naturalWidth === 0) return;

    const dw = (!preRoam && isMoving) ? ISABELA_MOVE_DRAW_W : ISABELA_STAND_DRAW_W;
    const dh = (!preRoam && isMoving) ? ISABELA_MOVE_DRAW_H : ISABELA_STAND_DRAW_H;
    const drawW = dw * zoom;
    const drawH = dh * zoom;

    const anchorWorldX = posX + ISABELA_DRAW_W / 2;
    const anchorWorldY = posY + ISABELA_DRAW_H;
    const anchorScreen = cam.worldToScreen(anchorWorldX, anchorWorldY);
    const drawX = Math.round(anchorScreen.x - drawW / 2);
    const drawY = Math.round(anchorScreen.y - drawH);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (facingLeft) {
        ctx.translate(drawX + drawW, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(source, 0, 0, drawW, drawH);
    } else {
        ctx.drawImage(source, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
}

// ─── Visibility (night / day) ───────────────────────────────────────────────

function getCurrentTime() {
    if (typeof WeatherSystem?.getHour === 'function') {
        const hour = WeatherSystem.getHour();
        const minute = typeof WeatherSystem?.getMinute === 'function'
            ? WeatherSystem.getMinute()
            : (typeof WeatherSystem?.currentTime === 'number' ? WeatherSystem.currentTime % 60 : 0);
        return { hour, minute };
    }
    const currentTime = WeatherSystem?.currentTime;
    if (typeof currentTime === 'number') {
        return { hour: Math.floor(currentTime / 60), minute: currentTime % 60 };
    }
    return { hour: 12, minute: 0 };
}

function shouldBeVisible() {
    const { hour, minute } = getCurrentTime();
    if (hour > MORNING_HOUR && hour < NIGHT_HOUR) return true;
    if (hour === MORNING_HOUR && minute >= MORNING_MINUTE) return true;
    return false;
}

function isNpcOnScreen() {
    if (typeof camera?.isInViewport !== 'function') return false;
    return camera.isInViewport(posX, posY, ISABELA_DRAW_W, ISABELA_DRAW_H);
}

function showNpc() {
    if (isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    posX = ISABELA_START_X;
    posY = ISABELA_START_Y;
    lastSyncedX = posX;
    lastSyncedY = posY;
    targetX = posX;
    targetY = posY;
    isMoving = false;
    frameIndex = 0;
    stateTimer = performance.now();
    stateDuration = IDLE_MIN_MS;
    npcSys.addNpc({ ...ISABELA, x: posX, y: posY, customDraw, onInteract });
    isVisible = true;
    pendingChange = null;
    logger.info('[Isabela] NPC appeared (morning)');
}

function hideNpc() {
    if (!isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.removeNpc(ISABELA.id);
    isVisible = false;
    pendingChange = null;
    logger.info('[Isabela] NPC disappeared (night)');
}

function updateVisibility() {
    const wantVisible = shouldBeVisible();
    if (wantVisible === isVisible) {
        pendingChange = null;
        return;
    }
    if (isNpcOnScreen()) {
        pendingChange = wantVisible ? 'show' : 'hide';
        return;
    }
    if (wantVisible) showNpc();
    else hideNpc();
}

function checkPendingChange() {
    if (!pendingChange) return;
    if (!isNpcOnScreen()) {
        if (pendingChange === 'show') showNpc();
        else hideNpc();
    }
}

// ─── Dialogue builder ───────────────────────────────────────────────────────
function buildFirstDialogue() {
    const playerSys = getSystem('player');
    const charId = playerSys?.activeCharacter?.id || 'stella';

    const playerName = {
        stella: 'Stella',
        ben: 'Ben',
        graham: 'Graham',
    }[charId] || 'Stella';

    const playerPortrait =
        `assets/character/${charId}/dialog_${charId.charAt(0).toUpperCase() + charId.slice(1)}_00.png`;

    return {
        left: {
            name: playerName,
            portrait: playerPortrait,
        },
        right: {
            name: 'Isabela',
            portrait: ISABELA_DIALOG_02,
        },
        lines: [
            {
                side: 'right',
                text: '*tira o olho do celular*',
                thought: true,
                setPortrait: { side: 'right', src: ISABELA_DIALOG_02 },
            },
            {
                side: 'right',
                text: 'Que foi? Paaaaai, tem gente aqui.',
                setPortrait: { side: 'right', src: ISABELA_DIALOG_01 },
                end: true,
            },
        ],
    };
}

// ─── Interaction handler ────────────────────────────────────────────────────

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[Isabela] DialogueSystem not available');
        return;
    }

    const john = getSystem('npcJohn');
    const johnIntroDone = john?.getQuestState()?.dialogue === 'intro_done';

    // Antes do intro do John: sempre mostra o diálogo (primeira vez ou não)
    if (!johnIntroDone) {
        if (!hasNoticedPlayer) {
            hasNoticedPlayer = true;
        }
        dlg.start(buildFirstDialogue());
        return;
    }

    // Pós-intro: placeholder até ter quest própria.
    dlg.start(buildBusyDialogue());
}

function buildBusyDialogue() {
    const playerSys = getSystem('player');
    const charId = playerSys?.activeCharacter?.id || 'stella';
    const playerName = { stella: 'Stella', ben: 'Ben', graham: 'Graham' }[charId] || 'Stella';
    const playerPortrait =
        `assets/character/${charId}/dialog_${charId.charAt(0).toUpperCase() + charId.slice(1)}_00.png`;

    return {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Isabela', portrait: ISABELA_DIALOG_01 },
        lines: [
            { side: 'right', text: i18n.t('npc.family.isabelaBusy'), end: true },
        ],
    };
}

// ─── Register NPC ───────────────────────────────────────────────────────────

function register() {
    const npcSys = getSystem('npc');
    if (!npcSys) {
        logger.warn('[Isabela] NpcSystem not available, retrying...');
        setTimeout(register, 500);
        return;
    }

    preloadSprites();

    if (shouldBeVisible()) {
        npcSys.addNpc({ ...ISABELA, x: posX, y: posY, customDraw, onInteract });
        isVisible = true;
    } else {
        isVisible = false;
    }

    stateTimer = performance.now();
    if (!aiInterval) aiInterval = setInterval(tick, 50);

    setInterval(updateVisibility, 2000);
    setInterval(checkPendingChange, 500);

    logger.info('[Isabela] NPC registered in city (free-roam)');
}

function getQuestState() {
    return { hasNoticed: hasNoticedPlayer };
}

function setQuestState(data) {
    if (!data) return;
    if (typeof data.hasNoticed === 'boolean') hasNoticedPlayer = data.hasNoticed;
}

const isabelaAPI = {
    register,
    getQuestState,
    setQuestState,
};

registerSystem('npcIsabela', isabelaAPI);

register();

export default isabelaAPI;