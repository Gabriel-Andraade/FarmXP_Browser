/**
 * @file npcMolly.js - NPC Molly, esposa do John
 * @description Molly anda livremente pela cidade (estilo animais), com 7 frames
 * de movimento (R0-R6) + sprite stand. Só tem direção R; quando anda para a
 * esquerda o sprite é espelhado horizontalmente. Mesmo tamanho da Stella.
 * Ritmo de movimento mais lento que o player.
 * @module NpcMolly
 */

import { getSystem, registerSystem } from '../../gameState.js';
import { i18n } from '../../i18n/i18n.js';
import { camera } from '../../thePlayer/cameraSystem.js';
import { logger } from '../../logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const MOLLY_ID = 'molly';
const MOLLY_NAME = 'Molly';
const MOLLY_MAP = 'city';

// Posição inicial (perto do John, mas com espaço para vagar).
const MOLLY_START_X = 180;
const MOLLY_START_Y = 1200;

// Caixa lógica (y-sort + hitbox de interação). Pés ficam em posY + MOLLY_DRAW_H.
const MOLLY_DRAW_W = 20;
const MOLLY_DRAW_H = 42;

// Tamanhos de desenho SEPARADOS por estado (como player:
// standSize vs moving). Calibre cada um visualmente.
const MOLLY_STAND_DRAW_W = 22;
const MOLLY_STAND_DRAW_H = 44;
const MOLLY_MOVE_DRAW_W  = 22;
const MOLLY_MOVE_DRAW_H  = 44;

// Raio em que ela vagueia em torno do ponto inicial.
const ROAM_RADIUS = 140;

// Velocidade (px/s). Player base = 150. Molly bem mais lenta.
const MOLLY_SPEED = 45;

// Bordas do mapa (city = 2560×2560).
const MAP_W = 2560;
const MAP_H = 2560;
const BORDER_MARGIN = 8;

// Animação
const MOVING_FRAMES = 7;            // R0..R6
const FRAME_DELAY_MS = 220;
const IDLE_MIN_MS = 1500;
const IDLE_MAX_MS = 4000;
const MOVE_MIN_MS = 1200;
const MOVE_MAX_MS = 2800;

// Sync da hitbox de interação só quando andou >= esse delta (perf).
const HITBOX_SYNC_THRESHOLD = 4;

// Sprite paths
const SPRITE_FOLDER = 'assets/character/family/moveMlly';
const SPRITE_STAND = `${SPRITE_FOLDER}/Molly_stand.png`;

// ─── State ──────────────────────────────────────────────────────────────────

const movingImgs = []; // 7 imagens (raw)
let standImg = null;
let imagesReady = false;

let posX = MOLLY_START_X;
let posY = MOLLY_START_Y;
let lastSyncedX = posX;
let lastSyncedY = posY;

let targetX = MOLLY_START_X;
let targetY = MOLLY_START_Y;

let isMoving = false;
let facingLeft = false;

let frameIndex = 0;
let lastFrameTime = 0;

let stateTimer = 0;
let stateDuration = IDLE_MIN_MS;

let lastTickTime = 0;
let aiInterval = null;

/** true depois que a Molly foi adicionada no npcSystem (gated por intro do John) */
let isRegistered = false;

/** 'idle' | 'intro_done' */
let dialogueState = 'idle';

// ─── Image preload ──────────────────────────────────────────────────────────

function onImageReady(img) {
    return new Promise((resolve) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.onload = () => resolve();
        img.onerror = () => resolve();
    });
}

function preloadSprites() {
    const loaders = [];
    for (let i = 0; i < MOVING_FRAMES; i++) {
        const img = new Image();
        img.src = `${SPRITE_FOLDER}/Molly_moving(R${i}).png`;
        movingImgs[i] = img;
        loaders.push(onImageReady(img));
    }
    standImg = new Image();
    standImg.src = SPRITE_STAND;
    loaders.push(onImageReady(standImg));

    Promise.all(loaders).then(() => {
        imagesReady = true;
    });
}

// ─── AI ─────────────────────────────────────────────────────────────────────

function pickNewState() {
    frameIndex = 0;
    if (Math.random() > 0.45) {
        // MOVE
        isMoving = true;
        stateDuration = MOVE_MIN_MS + Math.random() * (MOVE_MAX_MS - MOVE_MIN_MS);
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * ROAM_RADIUS;
        targetX = MOLLY_START_X + Math.cos(angle) * dist;
        targetY = MOLLY_START_Y + Math.sin(angle) * dist;
        targetX = Math.max(BORDER_MARGIN, Math.min(MAP_W - MOLLY_DRAW_W - BORDER_MARGIN, targetX));
        targetY = Math.max(BORDER_MARGIN, Math.min(MAP_H - MOLLY_DRAW_H - BORDER_MARGIN, targetY));
    } else {
        // IDLE
        isMoving = false;
        stateDuration = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
    }
}

function tick() {
    const now = performance.now();
    const dt = lastTickTime === 0 ? 16 : Math.min(100, now - lastTickTime);
    lastTickTime = now;

    // Molly só entra em cena no dia seguinte ao primeiro contato com o John.
    // (Se o intro acontece no dia 1, ela só aparece no dia 2.)
    const john = getSystem('npcJohn');
    const canRoam = !!john?.hasFamilyRoamStarted?.();
    if (!canRoam) {
        if (isRegistered) {
            const npcSys = getSystem('npc');
            if (npcSys?.removeNpc) npcSys.removeNpc(MOLLY_ID);
            isRegistered = false;
        }
        return;
    }
    if (!isRegistered) {
        addMollyToNpcSystem();
    }

    // Não anda durante diálogo (fica parada).
    const dlg = getSystem('dialogue');
    const dialogueActive = dlg && dlg.isDialogueActive && dlg.isDialogueActive();
    if (dialogueActive) {
        isMoving = false;
        frameIndex = 0;
        stateTimer = now;
        stateDuration = IDLE_MIN_MS;
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
            const step = MOLLY_SPEED * (dt / 1000);
            const vx = (dx / dist) * step;
            const vy = (dy / dist) * step;
            posX += vx;
            posY += vy;

            const minX = BORDER_MARGIN;
            const minY = BORDER_MARGIN;
            const maxX = MAP_W - MOLLY_DRAW_W - BORDER_MARGIN;
            const maxY = MAP_H - MOLLY_DRAW_H - BORDER_MARGIN;
            if (posX < minX) { posX = minX; targetX = MOLLY_START_X; }
            if (posY < minY) { posY = minY; targetY = MOLLY_START_Y; }
            if (posX > maxX) { posX = maxX; targetX = MOLLY_START_X; }
            if (posY > maxY) { posY = maxY; targetY = MOLLY_START_Y; }

            // Direção visual: sprite olha para R por padrão.
            // Anda para a esquerda → flip horizontal.
            if (Math.abs(vx) > 0.01) facingLeft = vx < 0;

            // Avança frame da animação
            if (now - lastFrameTime >= FRAME_DELAY_MS) {
                lastFrameTime = now;
                frameIndex = (frameIndex + 1) % MOVING_FRAMES;
            }
        }
    }

    // Mantém clampado dentro do raio de vagar (segurança)
    const fromStartX = posX - MOLLY_START_X;
    const fromStartY = posY - MOLLY_START_Y;
    const distFromStart = Math.sqrt(fromStartX * fromStartX + fromStartY * fromStartY);
    if (distFromStart > ROAM_RADIUS * 1.2) {
        // Puxa de volta
        targetX = MOLLY_START_X;
        targetY = MOLLY_START_Y;
        isMoving = true;
        stateTimer = now;
        stateDuration = MOVE_MAX_MS;
    }

    // Sync hitbox de interação quando moveu o suficiente
    const sdx = posX - lastSyncedX;
    const sdy = posY - lastSyncedY;
    if (sdx * sdx + sdy * sdy >= HITBOX_SYNC_THRESHOLD * HITBOX_SYNC_THRESHOLD) {
        const npcSys = getSystem('npc');
        if (npcSys && typeof npcSys.updateNpc === 'function') {
            npcSys.updateNpc(MOLLY_ID, { x: posX, y: posY });
        }
        lastSyncedX = posX;
        lastSyncedY = posY;
    }
}

// ─── Custom draw ────────────────────────────────────────────────────────────

function customDraw(ctx, cam, zoom) {
    if (!cam || !imagesReady) return;
    const source = isMoving
        ? (movingImgs[frameIndex] || standImg)
        : standImg;
    if (!source || !source.complete || source.naturalWidth === 0) return;

    // Tamanho de desenho depende do estado (stand vs moving),
    // igual o player faz com standSize.
    const dw = isMoving ? MOLLY_MOVE_DRAW_W : MOLLY_STAND_DRAW_W;
    const dh = isMoving ? MOLLY_MOVE_DRAW_H : MOLLY_STAND_DRAW_H;
    const drawW = dw * zoom;
    const drawH = dh * zoom;

    // Âncora centro-base: pés sempre em (posX + MOLLY_DRAW_W/2, posY + MOLLY_DRAW_H)
    // — alturas diferentes entre stand e moving NÃO deslocam o personagem.
    const anchorWorldX = posX + MOLLY_DRAW_W / 2;
    const anchorWorldY = posY + MOLLY_DRAW_H;
    const anchorScreen = cam.worldToScreen(anchorWorldX, anchorWorldY);
    // Snap to integer pixel — evita jitter/onda causada por posição fracional
    // (posX do AI é float, sem o round o canvas quantiza pra inteiros
    // diferentes a cada frame com smoothing off = jitter de 1px).
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

// ─── Dialogue ───────────────────────────────────────────────────────────────

function t(key, params) { return i18n.t(key, params); }

function getActiveCharacterId() {
    const player = getSystem('player');
    return player?.activeCharacter?.id || 'stella';
}

function getPlayerName() {
    const id = getActiveCharacterId();
    return { stella: 'Stella', ben: 'Ben', graham: 'Graham' }[id] || 'Stella';
}

function getPlayerDialogPortrait() {
    const id = getActiveCharacterId();
    return `assets/character/${id}/dialog_${id.charAt(0).toUpperCase() + id.slice(1)}_00.png`;
}

const MOLLY_PORTRAIT = 'assets/character/family/molly_dialog_00.png';

function buildIntroDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.molly';

    const replyKey = { stella: `${K}.replyStella`, graham: `${K}.replyGraham`, ben: `${K}.replyBen` }[charId] || `${K}.replyStella`;

    return {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Molly', portrait: MOLLY_PORTRAIT },
        lines: [
            { side: 'right', text: t(`${K}.greet`, { name: playerName }) },
            { side: 'left',  text: t(replyKey) },
            { side: 'right', text: t(`${K}.intro`) },
            { side: 'right', text: t(`${K}.farewell`), end: true, action: () => { dialogueState = 'intro_done'; } },
        ],
    };
}

function buildRepeatDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.molly';

    return {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Molly', portrait: MOLLY_PORTRAIT },
        lines: [
            { side: 'right', text: t(`${K}.repeat`, { name: playerName }), end: true },
        ],
    };
}

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[Molly] DialogueSystem not available');
        return;
    }
    // Molly ainda não tem diálogo próprio — placeholder em tela de diálogo.
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    dlg.start({
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Molly', portrait: MOLLY_PORTRAIT },
        lines: [
            { side: 'right', text: i18n.t('npc.family.mollySilent'), end: true },
        ],
    });
}

// ─── Save / Load ────────────────────────────────────────────────────────────

function getQuestState() {
    return { dialogue: dialogueState };
}

function setQuestState(data) {
    if (!data) return;
    if (typeof data === 'string') { dialogueState = data; return; }
    if (data.dialogue) dialogueState = data.dialogue;
}

// ─── Register ───────────────────────────────────────────────────────────────

function addMollyToNpcSystem() {
    if (isRegistered) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.addNpc({
        id: MOLLY_ID,
        name: MOLLY_NAME,
        x: posX,
        y: posY,
        width: MOLLY_DRAW_W,
        height: MOLLY_DRAW_H,
        sprite: SPRITE_STAND, // fallback (não usado por causa de customDraw)
        map: MOLLY_MAP,
        interactRadius: 60,
        customDraw,
        onInteract,
    });
    isRegistered = true;
    logger.info('[Molly] NPC added to scene (post-intro)');
}

function register() {
    const npcSys = getSystem('npc');
    if (!npcSys) {
        logger.warn('[Molly] NpcSystem not available, retrying...');
        setTimeout(register, 500);
        return;
    }

    preloadSprites();

    // Gated pela intro do John; o tick() adiciona/remove a Molly conforme o estado.
    stateTimer = performance.now();
    aiInterval = setInterval(tick, 50);

    logger.info('[Molly] NPC registered in city with free-roam AI (gated)');
}

const mollyAPI = {
    register,
    getQuestState,
    setQuestState,
};

registerSystem('npcMolly', mollyAPI);

register();

export default mollyAPI;
