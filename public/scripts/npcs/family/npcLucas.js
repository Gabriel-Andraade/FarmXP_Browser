/**
 * @file npcLucas.js - NPC Lucas, filho mais velho de John e Molly
 * @description Lucas anda livremente pela cidade (free-roam), 7 frames
 * moving (R0-R6) + idle. Só direção R; anda pra esquerda = sprite espelhado.
 * Desaparece às 19:00 e reaparece às 6:10 (igual John/Isabela).
 * Proporção próxima da Stella.
 * @module NpcLucas
 */

import { getSystem, registerSystem } from '../../gameState.js';
import { i18n } from '../../i18n/i18n.js';
import { WeatherSystem } from '../../weather.js';
import { camera } from '../../thePlayer/cameraSystem.js';
import { logger } from '../../logger.js';
import { whereIsJohnOption } from './askAboutJohn.js';
import { PORTRAITS } from '../../quests/family/dialogueHelpers.js';
import { getActiveCharacterId, getPlayerName, getPlayerDialogPortrait, makeSpeakerSwap, resolveDialogueLabels } from '../../dialogueSystem.js';
import { personalitySystem } from '../personalitySystem.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const LUCAS_ID = 'lucas';
const LUCAS_NAME = 'Lucas';
const LUCAS_MAP = 'city';

const LUCAS_START_X = 45;
const LUCAS_START_Y = 1169;

// Caixa lógica (y-sort + base para âncora). Pés em posY + LUCAS_DRAW_H.
const LUCAS_DRAW_W = 20;
const LUCAS_DRAW_H = 44;

// Tamanhos de desenho SEPARADOS por estado (padrão do player).
const LUCAS_STAND_DRAW_W = 22;
const LUCAS_STAND_DRAW_H = 44;
const LUCAS_MOVE_DRAW_W  = 22;
const LUCAS_MOVE_DRAW_H  = 44;

// Literais duplicados (não identificadores) pro hot-reload do npcSystem.
// Mantenha em sincronia com LUCAS_START_X/Y e LUCAS_DRAW_W/H.
const LUCAS = {
    id: 'lucas',
    // Agenda (#247): só aparece quando o John está fora a trabalho.
    menuOptions: [whereIsJohnOption('lucas')],
    name: 'Lucas',
    x: 45,
    y: 1169,
    width: 20,
    height: 44,
    sprite: 'assets/character/family/moveLucas/Lucas_idle.png',
    map: 'city',
    interactRadius: 60,
};

const LUCAS_SPRITE_FOLDER = 'assets/character/family/moveLucas';
const LUCAS_SPRITE_STAND = `${LUCAS_SPRITE_FOLDER}/Lucas_idle.png`;
const LUCAS_SPRITE_PREINTRO = 'assets/character/family/idle_family/lucas_idle_00.png';
const LUCAS_MOVING_FRAMES = 7;

const LUCAS_DIALOG_00 = 'assets/character/family/lucas_dialog_00.png';
const LUCAS_DIALOG_01 = 'assets/character/family/lucas_dialog_01.png';

// Materiais da quest secreta (ver item.js: 34 = Prego, 9 = Madeira Bruta).
const LUCAS_SCREW_ITEM_ID = 34;
const LUCAS_WOOD_ITEM_ID = 9;
const LUCAS_SCREW_REQUIRED = 3;
const LUCAS_WOOD_REQUIRED = 5;

// Reposição da parafusadeira (quest da parafusadeira).
const DRILL_REPLACEMENT_COST = 500;
const DRILL_XP_IGNORE = 1;
const DRILL_XP_TELL = 60;
const DRILL_XP_BUY = 120;
const DRILL_CONFESSION_DELAY = 3;
const DRILL_DONE_STATES = ['ignored', 'told_alone', 'told_together', 'paid', 'confessed'];

const NIGHT_HOUR = 19;
const MORNING_HOUR = 6;
const MORNING_MINUTE = 10;

// Roam / animação
const ROAM_RADIUS = 110;
const LUCAS_SPEED = 42;

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

/** 'idle' | 'in_progress' | 'declined' | 'delivered' */
let secretQuestState = 'idle';

/** Quest da parafusadeira: 'idle' (galhos virão depois). */
let drillQuestState = 'idle';

/** Dia em que o player pagou a reposição (pra confissão tardia do galho 3). */
let drillPaidDay = null;

const movingImgs = [];
let standImg = null;
let preIntroImg = null;
let imagesReady = false;

let posX = LUCAS_START_X;
let posY = LUCAS_START_Y;
let lastSyncedX = posX;
let lastSyncedY = posY;

let targetX = LUCAS_START_X;
let targetY = LUCAS_START_Y;

let isMoving = false;
let facingLeft = false;

let frameIndex = 0;
let lastFrameTime = 0;

let stateTimer = 0;
let stateDuration = IDLE_MIN_MS;
let lastTickTime = 0;
let aiInterval = null;
let visibilityInterval = null;
let pendingVisibilityInterval = null;

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
    for (let i = 0; i < LUCAS_MOVING_FRAMES; i++) {
        const img = new Image();
        img.src = `${LUCAS_SPRITE_FOLDER}/Lucas_moving(R${i}).png`;
        movingImgs[i] = img;
        loaders.push(onImageReady(img));
    }
    standImg = new Image();
    standImg.src = LUCAS_SPRITE_STAND;
    loaders.push(onImageReady(standImg));

    preIntroImg = new Image();
    preIntroImg.src = LUCAS_SPRITE_PREINTRO;
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
        targetX = LUCAS_START_X + Math.cos(angle) * dist;
        targetY = LUCAS_START_Y + Math.sin(angle) * dist;
        targetX = Math.max(BORDER_MARGIN, Math.min(MAP_W - LUCAS_DRAW_W - BORDER_MARGIN, targetX));
        targetY = Math.max(BORDER_MARGIN, Math.min(MAP_H - LUCAS_DRAW_H - BORDER_MARGIN, targetY));
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

    // Pre-roam: fica parado na posição inicial até o dia seguinte ao intro.
    const john = getSystem('npcJohn');
    if (!john?.hasFamilyRoamStarted?.()) {
        isMoving = false;
        frameIndex = 0;
        if (posX !== LUCAS_START_X || posY !== LUCAS_START_Y) {
            posX = LUCAS_START_X;
            posY = LUCAS_START_Y;
            targetX = LUCAS_START_X;
            targetY = LUCAS_START_Y;
            const npcSys = getSystem('npc');
            if (npcSys?.updateNpc) npcSys.updateNpc(LUCAS_ID, { x: posX, y: posY });
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
            const step = LUCAS_SPEED * (dt / 1000);
            const vx = (dx / dist) * step;
            const vy = (dy / dist) * step;
            posX += vx;
            posY += vy;

            const minX = BORDER_MARGIN;
            const minY = BORDER_MARGIN;
            const maxX = MAP_W - LUCAS_DRAW_W - BORDER_MARGIN;
            const maxY = MAP_H - LUCAS_DRAW_H - BORDER_MARGIN;
            if (posX < minX) { posX = minX; targetX = LUCAS_START_X; }
            if (posY < minY) { posY = minY; targetY = LUCAS_START_Y; }
            if (posX > maxX) { posX = maxX; targetX = LUCAS_START_X; }
            if (posY > maxY) { posY = maxY; targetY = LUCAS_START_Y; }

            if (Math.abs(vx) > 0.01) facingLeft = vx < 0;

            if (now - lastFrameTime >= FRAME_DELAY_MS) {
                lastFrameTime = now;
                frameIndex = (frameIndex + 1) % LUCAS_MOVING_FRAMES;
            }
        }
    }

    // Clamp dentro do raio
    const fromStartX = posX - LUCAS_START_X;
    const fromStartY = posY - LUCAS_START_Y;
    const distFromStart = Math.sqrt(fromStartX * fromStartX + fromStartY * fromStartY);
    if (distFromStart > ROAM_RADIUS * 1.2) {
        targetX = LUCAS_START_X;
        targetY = LUCAS_START_Y;
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
            npcSys.updateNpc(LUCAS_ID, { x: posX, y: posY });
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

    const dw = (!preRoam && isMoving) ? LUCAS_MOVE_DRAW_W : LUCAS_STAND_DRAW_W;
    const dh = (!preRoam && isMoving) ? LUCAS_MOVE_DRAW_H : LUCAS_STAND_DRAW_H;
    const drawW = dw * zoom;
    const drawH = dh * zoom;

    const anchorWorldX = posX + LUCAS_DRAW_W / 2;
    const anchorWorldY = posY + LUCAS_DRAW_H;
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

// ─── i18n / player helpers ─────────────────────────────────────────────────

function t(key, params) { return i18n.t(key, params); }

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
    return camera.isInViewport(posX, posY, LUCAS_DRAW_W, LUCAS_DRAW_H);
}

function showNpc() {
    if (isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    posX = LUCAS_START_X;
    posY = LUCAS_START_Y;
    lastSyncedX = posX;
    lastSyncedY = posY;
    targetX = posX;
    targetY = posY;
    isMoving = false;
    frameIndex = 0;
    stateTimer = performance.now();
    stateDuration = IDLE_MIN_MS;
    npcSys.addNpc({ ...LUCAS, x: posX, y: posY, customDraw, onInteract });
    isVisible = true;
    pendingChange = null;
    logger.info('[Lucas] NPC appeared (morning)');
}

function hideNpc() {
    if (!isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.removeNpc(LUCAS.id);
    isVisible = false;
    pendingChange = null;
    logger.info('[Lucas] NPC disappeared (night)');
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

// ─── Dialogues ──────────────────────────────────────────────────────────────

function buildSecretOfferDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.lucasQ';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Lucas', portrait: LUCAS_DIALOG_00 },
        lines: [],
    };
    const lines = config.lines;
    const swapToLucas = makeSpeakerSwap(config, 'Lucas');

    lines.push({
        side: 'right',
        text: t(`${K}.psiu`, { name: playerName }),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
        action: swapToLucas,
    });

    const reactKey = { stella: `${K}.reactStella`, graham: `${K}.reactGraham`, ben: `${K}.reactBen` }[charId] || `${K}.reactStella`;
    lines.push({ side: 'left', text: t(reactKey) });

    lines.push({
        side: 'right',
        text: t(`${K}.secretAsk`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
        action: swapToLucas,
    });

    const promiseKey = { stella: `${K}.promiseStella`, graham: `${K}.promiseGraham`, ben: `${K}.promiseBen` }[charId] || `${K}.promiseStella`;
    lines.push({ side: 'left', text: t(promiseKey) });

    lines.push({
        side: 'right',
        text: t(`${K}.lucasDeny`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
        action: swapToLucas,
    });

    lines.push({
        side: 'right',
        text: t(`${K}.askMaterials`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
    });

    const choiceLine = {
        side: 'left',
        text: '',
        type: 'choice',
        options: [
            { text: t(`${K}.choiceAccept`), value: 'accept', next: -1 },
            { text: t(`${K}.choiceCurious`), value: 'curious', next: -1 },
            { text: t(`${K}.choiceDecline`), value: 'decline', next: -1 },
        ],
    };
    lines.push(choiceLine);

    // ── ACEITAR ──
    const acceptIdx = lines.length;
    lines.push({
        side: 'right',
        text: t(`${K}.lucasThanks`, { name: playerName }),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
        action: swapToLucas,
    });

    const afterKey = { stella: `${K}.afterAcceptStella`, graham: `${K}.afterAcceptGraham`, ben: `${K}.afterAcceptBen` }[charId] || `${K}.afterAcceptStella`;
    lines.push({
        side: 'left',
        text: t(afterKey),
        end: true,
        action: () => { secretQuestState = 'in_progress'; },
    });

    // ── CURIOSO ──
    const curiousIdx = lines.length;
    const curiousKey = { stella: `${K}.curiousStella`, graham: `${K}.curiousGraham`, ben: `${K}.curiousBen` }[charId] || `${K}.curiousStella`;
    lines.push({ side: 'left', text: t(curiousKey) });

    lines.push({
        side: 'right',
        text: t(`${K}.lucasSurprise`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_01 },
        action: swapToLucas,
    });

    const okKey = { stella: `${K}.okStella`, graham: `${K}.okGraham`, ben: `${K}.okBen` }[charId] || `${K}.okStella`;
    lines.push({ side: 'left', text: t(okKey) });

    lines.push({
        side: 'right',
        text: t(`${K}.lucasSwear`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
        action: swapToLucas,
    });

    // Depois da curiosidade, aceita direto
    lines.push({
        side: 'right',
        text: t(`${K}.lucasThanks`, { name: playerName }),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
    });
    lines.push({
        side: 'left',
        text: t(afterKey),
        end: true,
        action: () => { secretQuestState = 'in_progress'; },
    });

    // ── RECUSAR ──
    const declineIdx = lines.length;
    const declineKey = { stella: `${K}.declineStella`, graham: `${K}.declineGraham`, ben: `${K}.declineBen` }[charId] || `${K}.declineStella`;
    lines.push({ side: 'left', text: t(declineKey) });

    lines.push({
        side: 'right',
        text: t(`${K}.lucasDeclineReply`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_01 },
        end: true,
        action: () => { swapToLucas(); secretQuestState = 'declined'; },
    });

    choiceLine.options[0].next = acceptIdx;
    choiceLine.options[1].next = curiousIdx;
    choiceLine.options[2].next = declineIdx;

    return config;
}

function buildSecretDeliveryDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.lucasQ';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Lucas', portrait: LUCAS_DIALOG_00 },
        lines: [],
    };
    const lines = config.lines;
    const swapToLucas = makeSpeakerSwap(config, 'Lucas');

    lines.push({
        side: 'right',
        text: t(`${K}.askBrought`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
        action: swapToLucas,
    });

    const prog = getMaterialProgress();

    if (!prog.ready) {
        // Ainda não tem os materiais: pede pra voltar depois, sem consumir nada.
        const noMatKey = { stella: `${K}.noMaterialsStella`, graham: `${K}.noMaterialsGraham`, ben: `${K}.noMaterialsBen` }[charId] || `${K}.noMaterialsStella`;
        lines.push({ side: 'left', text: t(noMatKey) });

        lines.push({
            side: 'right',
            text: t(`${K}.lucasWait`),
            setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
            end: true,
            action: swapToLucas,
        });
        return config;
    }

    const bringKey = { stella: `${K}.bringStella`, graham: `${K}.bringGraham`, ben: `${K}.bringBen` }[charId] || `${K}.bringStella`;
    lines.push({ side: 'left', text: t(bringKey) });

    lines.push({
        side: 'right',
        text: t(`${K}.lucasJoy`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_01 },
        action: swapToLucas,
    });

    lines.push({
        side: 'right',
        text: t(`${K}.lucasComeBack`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
    });

    const finalKey = { stella: `${K}.finalStella`, graham: `${K}.finalGraham`, ben: `${K}.finalBen` }[charId] || `${K}.finalStella`;
    lines.push({
        side: 'left',
        text: t(finalKey),
        end: true,
        action: () => {
            if (consumeMaterials()) {
                secretQuestState = 'delivered';
                const registry = getSystem('questRegistry');
                if (registry?.complete) {
                    registry.complete('lucas_secret');
                } else {
                    document.dispatchEvent(new CustomEvent('questUpdated', {
                        detail: { id: 'lucas_secret', status: 'completed' },
                    }));
                }
            }
        },
    });

    return config;
}

function buildDoneDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.lucasQ';
    return {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Lucas', portrait: LUCAS_DIALOG_00 },
        lines: [
            { side: 'right', text: t(`${K}.questDone`, { name: playerName }), end: true },
        ],
    };
}

// ─── Quest da parafusadeira (#247) ─────────────────────────────────────────

/**
 * Confissão do Lucas. Só dispara depois do segredo concluído (`delivered`) e
 * com o John fora a trabalho — é o momento em que o menino, sem o pai por
 * perto, deixa escapar que quebrou a parafusadeira.
 *
 * Depois da confissão, três saídas: contar (galho 1), ignorar (galho 2) e
 * ajudar a esconder (galho 3). O "deixar pra lá" do galho 1 desemboca no
 * mesmo gate de dinheiro do galho 3.
 */
function buildDrillConfessionDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.lucasDrill';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Lucas', portrait: LUCAS_DIALOG_00 },
        lines: [],
    };
    const lines = config.lines;

    // Abertura: pergunta sobre o projeto secreto.
    const greetKey = { stella: `${K}.greetStella`, graham: `${K}.greetGraham`, ben: `${K}.greetBen` }[charId] || `${K}.greetStella`;
    lines.push({ side: 'left', text: t(greetKey) });
    lines.push({ side: 'right', text: t(`${K}.hmm`) });
    lines.push({ side: 'left', text: t(`${K}.askFine`) });
    lines.push({ side: 'right', text: t(`${K}.evade`) });

    // A chamada do player força a confissão.
    const callKey = { stella: `${K}.callStella`, graham: `${K}.callGraham`, ben: `${K}.callBen` }[charId] || `${K}.callStella`;
    lines.push({ side: 'left', text: t(callKey) });
    lines.push({ side: 'right', text: t(`${K}.confess`, { name: playerName }) });
    lines.push({ side: 'right', text: t(`${K}.brokeDrill`) });

    // Reação por personagem (comprimentos diferentes).
    if (charId === 'stella') {
        lines.push({ side: 'left', text: t(`${K}.reactStella1`) });
        lines.push({ side: 'left', text: t(`${K}.reactStella2`) });
    } else if (charId === 'graham') {
        lines.push({ side: 'left', text: t(`${K}.reactGraham1`) });
        lines.push({ side: 'right', text: t(`${K}.showBroken`) });
        lines.push({ side: 'left', text: t(`${K}.reactGraham2`) });
    } else {
        lines.push({ side: 'left', text: t(`${K}.reactBen1`) });
        lines.push({ side: 'right', text: t(`${K}.brokenHowMuch`) });
        lines.push({ side: 'left', text: t(`${K}.reactBen2`) });
    }

    // ── Escolha 1 ──
    lines.push({
        side: 'left', text: '', type: 'choice',
        options: [
            { text: t(`${K}.choiceTell`), value: 'tell', _goto: 'drillTell' },
            {
                text: t(`${K}.choiceIgnore`), value: 'ignore', _goto: 'drillIgnore',
                onSelect: () => {
                    drillQuestState = 'ignored';
                    personalitySystem.score('lucas', 'R');
                    getSystem('questRegistry')?.complete?.('lucas_drill', { extraRewards: { xp: DRILL_XP_IGNORE } });
                },
            },
            {
                text: t(`${K}.choiceHelp`), value: 'help', _goto: 'drillHelp',
                onSelect: () => {
                    drillQuestState = 'hiding';
                    personalitySystem.score('lucas', 'C');
                    getSystem('save')?.markDirty?.();
                },
            },
        ],
    });

    pushDrillTellBranch(lines, K, charId);
    pushDrillIgnoreBranch(lines, K, charId);
    pushDrillHelpBranch(lines, K, charId);
    pushDrillMoneyGate(lines, K);

    return resolveDialogueLabels(config);
}

/** Galho 1: contar pro pai. Termina na sub-escolha (acompanhar / sozinho / deixar). */
function pushDrillTellBranch(lines, K, charId) {
    const first = lines.length;
    if (charId === 'stella') {
        lines.push({ side: 'right', text: t(`${K}.tellFearStella`) });
        lines.push({ side: 'left', text: t(`${K}.tellReassureStella1`) });
        lines.push({ side: 'right', text: t(`${K}.tellDoubtStella`) });
        lines.push({ side: 'left', text: t(`${K}.tellReassureStella2`) });
        lines.push({ side: 'right', text: t(`${K}.tellResolveStella`) });
        lines.push({ side: 'right', text: t(`${K}.tellComeStella`) });
    } else if (charId === 'graham') {
        lines.push({ side: 'right', text: t(`${K}.tellFearGraham`) });
        lines.push({ side: 'left', text: t(`${K}.tellReassureGraham1`) });
        lines.push({ side: 'right', text: t(`${K}.tellDoubtGraham`) });
        lines.push({ side: 'left', text: t(`${K}.tellReassureGraham2`) });
        lines.push({ side: 'left', text: t(`${K}.tellReassureGraham3`) });
        lines.push({ side: 'right', text: t(`${K}.tellResolveGraham`) });
        lines.push({ side: 'right', text: t(`${K}.tellComeGraham`) });
    } else {
        lines.push({ side: 'right', text: t(`${K}.tellFearBen`) });
        lines.push({ side: 'left', text: t(`${K}.tellReassureBen1`) });
        lines.push({ side: 'right', text: t(`${K}.tellDoubtBen`) });
        lines.push({ side: 'left', text: t(`${K}.tellReassureBen2`) });
        lines.push({ side: 'right', text: t(`${K}.tellComeBen`) });
    }
    lines[first]._label = 'drillTell';

    // Sub-escolha do galho 1.
    lines.push({
        side: 'left', text: '', type: 'choice',
        options: [
            {
                text: t(`${K}.subOptCome`), value: 'come', _goto: 'drillCome',
                onSelect: () => { drillQuestState = 'waiting_john'; getSystem('save')?.markDirty?.(); },
            },
            {
                text: t(`${K}.subOptAlone`), value: 'alone', _goto: 'drillAlone',
                onSelect: () => {
                    drillQuestState = 'told_alone';
                    personalitySystem.score('lucas', 'Re', 2);
                    getSystem('questRegistry')?.complete?.('lucas_drill', { extraRewards: { xp: DRILL_XP_TELL } });
                },
            },
            {
                text: t(`${K}.subOptForget`), value: 'forget', _goto: 'drillForget',
                onSelect: () => {
                    drillQuestState = 'hiding';
                    personalitySystem.score('lucas', 'C');
                    getSystem('save')?.markDirty?.();
                },
            },
        ],
    });

    // ── Acompanhar ──
    const come = lines.length;
    if (charId === 'stella') {
        lines.push({ side: 'left', text: t(`${K}.comeStella`) });
        lines.push({ side: 'right', text: t(`${K}.comeLucasStella`), end: true });
    } else if (charId === 'graham') {
        lines.push({ side: 'left', text: t(`${K}.comeGraham`) });
        lines.push({ side: 'right', text: t(`${K}.comeLucasGraham`), end: true });
    } else {
        lines.push({ side: 'left', text: t(`${K}.comeBen`) });
        lines.push({ side: 'right', text: t(`${K}.comeLucasBen`) });
        lines.push({ side: 'left', text: t(`${K}.comeBen2`), end: true });
    }
    lines[come]._label = 'drillCome';

    // ── Sozinho ──
    const alone = lines.length;
    if (charId === 'stella') {
        lines.push({ side: 'left', text: t(`${K}.aloneStella1`) });
        lines.push({ side: 'left', text: t(`${K}.aloneStella2`) });
        lines.push({ side: 'right', text: t(`${K}.aloneLucasStella`), end: true });
    } else if (charId === 'graham') {
        lines.push({ side: 'left', text: t(`${K}.aloneGraham`) });
        lines.push({ side: 'right', text: t(`${K}.aloneLucasGraham`), end: true });
    } else {
        lines.push({ side: 'left', text: t(`${K}.aloneBen`) });
        lines.push({ side: 'right', text: t(`${K}.aloneLucasBen`) });
        lines.push({ side: 'left', text: t(`${K}.aloneBen2`), end: true });
    }
    lines[alone]._label = 'drillAlone';

    // ── Deixar pra lá (cai no gate do dinheiro) ──
    const forget = lines.length;
    if (charId === 'stella') {
        lines.push({ side: 'left', text: t(`${K}.dropStella1`) });
        lines.push({ side: 'left', text: t(`${K}.dropStella2`) });
        lines.push({ side: 'right', text: t(`${K}.dropLucasStella`) });
    } else if (charId === 'graham') {
        lines.push({ side: 'left', text: t(`${K}.dropGraham1`) });
        lines.push({ side: 'left', text: t(`${K}.dropGraham2`) });
        lines.push({ side: 'right', text: t(`${K}.dropLucasGraham`) });
    } else {
        lines.push({ side: 'left', text: t(`${K}.dropBen1`) });
        lines.push({ side: 'left', text: t(`${K}.dropBen2`) });
        lines.push({ side: 'right', text: t(`${K}.dropLucasBen`) });
    }
    lines[forget]._label = 'drillForget';
    lines[lines.length - 1]._goto = 'drillMoneyGate';
}

/** Galho 2: ignorar. Fecha na hora — o Lucas encolhe. */
function pushDrillIgnoreBranch(lines, K, charId) {
    const first = lines.length;
    if (charId === 'stella') {
        lines.push({ side: 'left', text: t(`${K}.ignoreStella1`) });
        lines.push({ side: 'left', text: t(`${K}.ignoreStella2`) });
        lines.push({ side: 'right', text: t(`${K}.ignoreLucasStella`), end: true });
    } else if (charId === 'graham') {
        lines.push({ side: 'left', text: t(`${K}.ignoreGraham1`) });
        lines.push({ side: 'right', text: t(`${K}.ignoreLucasGraham`) });
        lines.push({ side: 'left', text: t(`${K}.ignoreGraham2`), end: true });
    } else {
        lines.push({ side: 'left', text: t(`${K}.ignoreBen1`) });
        lines.push({ side: 'right', text: t(`${K}.ignoreLucasBen`) });
        lines.push({ side: 'left', text: t(`${K}.ignoreBen2`) });
        lines.push({ side: 'right', text: t(`${K}.ignoreLucasBen2`), end: true });
    }
    lines[first]._label = 'drillIgnore';
}

/** Galho 3: ajudar a esconder. Leva ao gate do dinheiro. */
function pushDrillHelpBranch(lines, K, charId) {
    const first = lines.length;
    lines.push({ side: 'right', text: t(`${K}.helpLucasAsk`) });
    lines.push({ side: 'right', text: t(`${K}.helpLucasMoney`) });

    if (charId === 'stella') {
        lines.push({ side: 'left', text: t(`${K}.helpStella1`) });
        lines.push({ side: 'right', text: t(`${K}.helpDoubtStella`) });
        lines.push({ side: 'left', text: t(`${K}.helpStella2`) });
        lines.push({ side: 'right', text: t(`${K}.helpBlushStella`) });
    } else if (charId === 'graham') {
        lines.push({ side: 'left', text: t(`${K}.helpGraham1`) });
        lines.push({ side: 'right', text: t(`${K}.helpDoubtGraham`) });
        lines.push({ side: 'left', text: t(`${K}.helpGraham2`) });
    } else {
        lines.push({ side: 'left', text: t(`${K}.helpBen1`) });
        lines.push({ side: 'right', text: t(`${K}.helpDoubtBen`) });
        lines.push({ side: 'left', text: t(`${K}.helpBen2`) });
    }
    lines[first]._label = 'drillHelp';
    lines[lines.length - 1]._goto = 'drillMoneyGate';
}

/** Gate do dinheiro (compartilhado pelo galho 3 e pelo "deixar pra lá"). */
function pushDrillMoneyGate(lines, K) {
    const gate = lines.length;
    const canAfford = getSystem('currency')?.canAfford?.(DRILL_REPLACEMENT_COST) === true;
    const options = canAfford
        ? [{
            text: t(`${K}.moneyBuy`, { price: DRILL_REPLACEMENT_COST }), value: 'buy', _goto: 'drillPaid',
            onSelect: buyDrillReplacement,
        }]
        : [{
            text: t(`${K}.moneyWait`), value: 'wait', _goto: 'drillWait',
            onSelect: () => { drillQuestState = 'waiting_funds'; getSystem('save')?.markDirty?.(); },
        }];
    lines.push({ side: 'left', text: '', type: 'choice', options });
    lines[gate]._label = 'drillMoneyGate';

    // ── Comprar ──
    const paid = lines.length;
    lines.push({ side: 'right', text: t(`${K}.paidLucasReplace`) });
    lines.push({ side: 'right', text: t(`${K}.paidLucasThanks`) });
    lines.push({ side: 'right', text: t(`${K}.paidLucasNotSmile`), end: true });
    lines[paid]._label = 'drillPaid';

    // ── Vou conseguir o dinheiro ──
    const wait = lines.length;
    lines.push({ side: 'right', text: t(`${K}.waitLucas`), end: true });
    lines[wait]._label = 'drillWait';
}

/** Paga a reposição, fecha a quest e dá o XP maior (recompensa o gasto). */
function buyDrillReplacement() {
    const currency = getSystem('currency');
    if (!currency?.canAfford?.(DRILL_REPLACEMENT_COST)) return false;
    if (!currency.spend(DRILL_REPLACEMENT_COST, 'lucas_drill')) return false;
    drillQuestState = 'paid';
    drillPaidDay = typeof WeatherSystem?.day === 'number' ? WeatherSystem.day : 0;
    getSystem('questRegistry')?.complete?.('lucas_drill', { extraRewards: { xp: DRILL_XP_BUY } });
    return true;
}

/** Gate do dinheiro avulso (reaberto quando o player volta com grana). */
function buildDrillMoneyGateDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.lucasDrill';
    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Lucas', portrait: LUCAS_DIALOG_00 },
        lines: [],
    };
    pushDrillMoneyGate(config.lines, K);
    return resolveDialogueLabels(config);
}

/** Cena "juntos": o Lucas conta pro John com o player presente. */
function buildDrillJohnResolutionDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.lucasDrill';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Lucas', portrait: PORTRAITS.lucas },
        lines: [],
    };
    const lines = config.lines;
    const toLucas = makeSpeakerSwap(config, 'Lucas');
    const toJohn = makeSpeakerSwap(config, 'John');

    const lucas = (key) => lines.push({ side: 'right', text: t(`${K}.${key}`), setPortrait: { side: 'right', src: PORTRAITS.lucas }, action: toLucas });
    const john = (key, params) => lines.push({ side: 'right', text: t(`${K}.${key}`, params), setPortrait: { side: 'right', src: PORTRAITS.john }, action: toJohn });

    lucas('johnSceneLucas1');
    john('johnSceneJohn1');
    lucas('johnSceneLucas2');
    john('johnSceneJohn2');
    lucas('johnSceneLucas3');
    john('johnSceneJohn3');
    lucas('johnSceneLucas4');
    john('johnSceneJohn4');
    lucas('johnSceneLucas5');
    john('johnSceneJohn5');
    john('johnSceneJohn6', { name: playerName });

    // Reação do player + encerramento com os pontos.
    const endKey = { stella: `${K}.johnSceneEndStella`, graham: `${K}.johnSceneEndGraham`, ben: `${K}.johnSceneEndBen` }[charId] || `${K}.johnSceneEndStella`;
    lines.push({
        side: 'left',
        text: t(endKey),
        end: true,
        action: () => {
            drillQuestState = 'told_together';
            personalitySystem.score('lucas', 'Re');
            personalitySystem.score('john', 'Re');
            getSystem('questRegistry')?.complete?.('lucas_drill', { extraRewards: { xp: DRILL_XP_TELL } });
        },
    });

    return config;
}

/** John pergunta: tem cena de "contar junto" esperando ele? */
function tryStartDrillJohnScene() {
    if (drillQuestState !== 'waiting_john') return false;
    const dlg = getSystem('dialogue');
    if (!dlg) return false;
    dlg.start(buildDrillJohnResolutionDialogue());
    return true;
}

/** Dias depois de pagar: o Lucas não aguentou esconder e conta. */
function buildDrillConfessionFollowUpDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.lucasDrill';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Lucas', portrait: LUCAS_DIALOG_00 },
        lines: [],
    };
    const lines = config.lines;

    // O Lucas vem até o player, com a culpa espremendo pra fora.
    lines.push({ side: 'right', text: t(`${K}.followUpApproach`, { name: playerName }) });

    // Entrada — um gosto de cada protagonista.
    const entryKey = { stella: `${K}.followUpEntryStella`, graham: `${K}.followUpEntryGraham`, ben: `${K}.followUpEntryBen` }[charId] || `${K}.followUpEntryStella`;
    lines.push({ side: 'left', text: t(entryKey) });

    // Confissão em camadas: não é medo de ser descoberto, é ter mentido por omissão.
    lines.push({ side: 'right', text: t(`${K}.followUpTold`) });
    lines.push({ side: 'right', text: t(`${K}.followUpNotDrill`) });
    lines.push({ side: 'right', text: t(`${K}.followUpSleepless`) });
    lines.push({ side: 'right', text: t(`${K}.followUpAssume`) });
    lines.push({ side: 'right', text: t(`${K}.followUpSorry`) });
    lines.push({ side: 'right', text: t(`${K}.followUpForget`) });
    lines.push({ side: 'right', text: t(`${K}.followUpUpset`) });

    const finish = (trait, extraTrait) => {
        drillQuestState = 'confessed';
        personalitySystem.score('lucas', trait);
        if (extraTrait) personalitySystem.score('john', extraTrait);
        getSystem('save')?.markDirty?.();
    };

    // Escolha final.
    const choiceLine = {
        side: 'left', text: '', type: 'choice',
        options: [
            { text: t(`${K}.confessOptRight`), value: 'right', next: -1, onSelect: () => finish('Re', 'Re') },
            { text: t(`${K}.confessOptAfterAll`), value: 'after', next: -1, onSelect: () => finish('R') },
            { text: t(`${K}.confessOptOkay`), value: 'okay', next: -1, onSelect: () => finish('C') },
        ],
    };
    lines.push(choiceLine);

    // ── "Você fez a coisa certa." ──
    const rightIdx = lines.length;
    lines.push({ side: 'right', text: t(`${K}.followUpRight1`) });
    lines.push({ side: 'right', text: t(`${K}.followUpRight2`) });
    lines.push({ side: 'right', text: t(`${K}.followUpRight3`), end: true });

    // ── "Depois de tudo aquilo?" ──
    const afterIdx = lines.length;
    lines.push({ side: 'right', text: t(`${K}.followUpAfter1`) });
    lines.push({ side: 'right', text: t(`${K}.followUpAfter2`) });
    lines.push({ side: 'right', text: t(`${K}.followUpAfter3`), end: true });

    // ── "Tudo bem. Eu entendo." ──
    const okayIdx = lines.length;
    lines.push({ side: 'right', text: t(`${K}.followUpOkay1`) });
    lines.push({ side: 'right', text: t(`${K}.followUpOkay2`) });
    lines.push({ side: 'right', text: t(`${K}.followUpOkay3`), end: true });

    choiceLine.options[0].next = rightIdx;
    choiceLine.options[1].next = afterIdx;
    choiceLine.options[2].next = okayIdx;

    return config;
}

/** Fala padrão do Lucas depois que a quest da parafusadeira fecha. */
function buildDrillDoneDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.lucasDrill';
    return {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Lucas', portrait: LUCAS_DIALOG_00 },
        lines: [
            { side: 'right', text: t(`${K}.done`), end: true },
        ],
    };
}

// ─── Interaction handler ────────────────────────────────────────────────────

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[Lucas] DialogueSystem not available');
        return;
    }

    // Gated: enquanto o player não conheceu o pai, Lucas só acena.
    const john = getSystem('npcJohn');
    const johnIntroDone = john?.getQuestState()?.dialogue === 'intro_done';
    if (!johnIntroDone) {
        const playerName = getPlayerName();
        const playerPortrait = getPlayerDialogPortrait();
        dlg.start({
            left: { name: playerName, portrait: playerPortrait },
            right: { name: 'Lucas', portrait: LUCAS_DIALOG_00 },
            lines: [
                { side: 'right', text: t('npc.family.lucasWave'), end: true },
            ],
        });
        return;
    }

    // Parafusadeira: depois do segredo concluído, e só com o John fora a
    // trabalho — ele não pode ver o Lucas confessando.
    if (drillQuestState === 'idle' && secretQuestState === 'delivered' && john?.getAbsenceInfo?.() != null) {
        dlg.start(buildDrillConfessionDialogue());
        return;
    }

    // Parafusadeira: escondeu mas ainda não pagou — reabre o gate do dinheiro.
    if (drillQuestState === 'hiding' || drillQuestState === 'waiting_funds') {
        dlg.start(buildDrillMoneyGateDialogue());
        return;
    }

    // Parafusadeira: esperando o John voltar pra contar junto.
    if (drillQuestState === 'waiting_john') {
        const playerName = getPlayerName();
        const playerPortrait = getPlayerDialogPortrait();
        dlg.start({
            left: { name: playerName, portrait: playerPortrait },
            right: { name: 'Lucas', portrait: LUCAS_DIALOG_00 },
            lines: [{ side: 'right', text: t('npc.family.lucasDrill.waitingJohnReminder'), end: true }],
        });
        return;
    }

    // Parafusadeira: pagou — dias depois, o Lucas não aguentou esconder.
    if (drillQuestState === 'paid' && typeof drillPaidDay === 'number') {
        const today = typeof WeatherSystem?.day === 'number' ? WeatherSystem.day : drillPaidDay;
        if (today >= drillPaidDay + DRILL_CONFESSION_DELAY) {
            dlg.start(buildDrillConfessionFollowUpDialogue());
            return;
        }
    }

    // Parafusadeira: concluída — fala padrão pro Lucas não ficar mudo.
    if (DRILL_DONE_STATES.includes(drillQuestState)) {
        dlg.start(buildDrillDoneDialogue());
        return;
    }

    if (secretQuestState === 'idle' || secretQuestState === 'declined') {
        dlg.start(buildSecretOfferDialogue());
    } else if (secretQuestState === 'in_progress') {
        dlg.start(buildSecretDeliveryDialogue());
    } else {
        dlg.start(buildDoneDialogue());
    }
}

// ─── Material progress helpers ──────────────────────────────────────────────

function getMaterialProgress() {
    const inv = getSystem('inventory');
    const screws = inv?.getItemQuantity ? (inv.getItemQuantity(LUCAS_SCREW_ITEM_ID) || 0) : 0;
    const wood   = inv?.getItemQuantity ? (inv.getItemQuantity(LUCAS_WOOD_ITEM_ID)  || 0) : 0;
    const ready = screws >= LUCAS_SCREW_REQUIRED && wood >= LUCAS_WOOD_REQUIRED;
    return {
        screws: { have: screws, need: LUCAS_SCREW_REQUIRED },
        wood:   { have: wood,   need: LUCAS_WOOD_REQUIRED  },
        ready,
    };
}

function consumeMaterials() {
    const inv = getSystem('inventory');
    if (!inv?.removeItem) return false;
    const prog = getMaterialProgress();
    if (!prog.ready) return false;
    const okScrews = inv.removeItem(LUCAS_SCREW_ITEM_ID, LUCAS_SCREW_REQUIRED);
    if (!okScrews) return false;
    const okWood = inv.removeItem(LUCAS_WOOD_ITEM_ID, LUCAS_WOOD_REQUIRED);
    if (!okWood) {
        // Rollback: tenta devolver os pregos já removidos para não perder o item do jogador.
        if (inv.addItem) inv.addItem(LUCAS_SCREW_ITEM_ID, LUCAS_SCREW_REQUIRED);
        return false;
    }
    return true;
}

// ─── Save / Load ────────────────────────────────────────────────────────────

function getQuestState() {
    return { secretQuest: secretQuestState, drillQuest: drillQuestState, drillPaidDay };
}

function setQuestState(data) {
    if (!data) return;
    if (typeof data === 'string') { secretQuestState = data; return; }
    if (data.secretQuest) secretQuestState = data.secretQuest;
    if (data.drillQuest) drillQuestState = data.drillQuest;
    if (data.drillPaidDay === null || typeof data.drillPaidDay === 'number') drillPaidDay = data.drillPaidDay;
}

// ─── Register NPC ───────────────────────────────────────────────────────────

function register() {
    const npcSys = getSystem('npc');
    if (!npcSys) {
        logger.warn('[Lucas] NpcSystem not available, retrying...');
        setTimeout(register, 500);
        return;
    }

    preloadSprites();

    if (shouldBeVisible()) {
        npcSys.addNpc({ ...LUCAS, x: posX, y: posY, customDraw, onInteract });
        isVisible = true;
    } else {
        isVisible = false;
    }

    stateTimer = performance.now();
    if (!aiInterval) aiInterval = setInterval(tick, 50);

    if (!visibilityInterval) visibilityInterval = setInterval(updateVisibility, 2000);
    if (!pendingVisibilityInterval) pendingVisibilityInterval = setInterval(checkPendingChange, 500);

    logger.info('[Lucas] NPC registered in city (free-roam)');
}

// ─── Public API ─────────────────────────────────────────────────────────────

const lucasAPI = {
    register,
    getQuestState,
    setQuestState,
    getMaterialProgress,
    getDrillState: () => drillQuestState,
    tryStartDrillJohnScene,
};

registerSystem('npcLucas', lucasAPI);

register();

export default lucasAPI;
