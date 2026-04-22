/**
 * @file npcJohn.js - NPC John Alexander Miller, pai da família
 * @description Registra o NPC John na cidade com sprite idle e hitbox.
 * Desaparece às 19:00 e reaparece às 6:10.
 * Diálogo de introdução envolve John, Lucas e Isabela.
 * @module NpcJohn
 */

import { getSystem, registerSystem } from '../../gameState.js';
import { i18n } from '../../i18n/i18n.js';
import { WeatherSystem } from '../../weather.js';
import { camera } from '../../thePlayer/cameraSystem.js';
import { logger } from '../../logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────

// Posição inicial (mesmo ponto onde o sprite idle ficava).
const JOHN_START_X = 61;
const JOHN_START_Y = 1167;

// Caixa lógica (y-sort + hitbox). Pés ficam em johnPosY + JOHN_DRAW_H.
const JOHN_DRAW_W = 20;
const JOHN_DRAW_H = 49;

// Tamanhos de desenho SEPARADOS por estado (padrão do player).
// John é mais alto que Molly, então stand e moving refletem isso.
const JOHN_STAND_DRAW_W = 30;
const JOHN_STAND_DRAW_H = 52;
const JOHN_MOVE_DRAW_W  = 30;
const JOHN_MOVE_DRAW_H  = 52;

// Literais duplicados (e não identificadores) aqui para o hot-reload do
// npcSystem conseguir reparsar o bloco. Mantenha em sincronia com
// JOHN_START_X/Y e JOHN_DRAW_W/H.
const JOHN = {
    id: 'john',
    name: 'John',
    x: 61,
    y: 1167,
    width: 24,
    height: 44,
    sprite: 'assets/character/family/moveJohn/John_stand.png',
    map: 'city',
    interactRadius: 60,
};

// Sprites de movimento (mesmo esquema da Molly: R0..R8 + stand).
const JOHN_SPRITE_FOLDER = 'assets/character/family/moveJohn';
const JOHN_SPRITE_STAND = `${JOHN_SPRITE_FOLDER}/John_stand.png`;
const JOHN_SPRITE_PREINTRO = 'assets/character/family/idle_family/john_idle_00.png';
const JOHN_MOVING_FRAMES = 8;

// Portraits
const JOHN_DIALOG_00  = 'assets/character/family/john_dialog_00.png';
const JOHN_DIALOG_01  = 'assets/character/family/john_dialog_01.png';
const JOHN_DIALOG_02  = 'assets/character/family/john_dialog_02.png';
const LUCAS_DIALOG_00 = 'assets/character/family/lucas_dialog_00.png';
const LUCAS_DIALOG_01 = 'assets/character/family/lucas_dialog_01.png';
const ISABELA_DIALOG_00 = 'assets/character/family/isabela_dialog_00.png';
const ISABELA_DIALOG_01 = 'assets/character/family/isabela_dialog_01.png';
const ISABELA_DIALOG_02 = 'assets/character/family/isabela_dialog_02.png';

const NIGHT_HOUR = 19;
const MORNING_HOUR = 6;
const MORNING_MINUTE = 10;

// Roam / animação
const JOHN_ROAM_RADIUS = 90;
const JOHN_SPEED = 40; // px/s — mais lento que o player (150)

// Bordas do mapa (city = 2560×2560).
const MAP_W = 2560;
const MAP_H = 2560;
const BORDER_MARGIN = 8;
const JOHN_FRAME_DELAY_MS = 220;
const JOHN_IDLE_MIN_MS = 1500;
const JOHN_IDLE_MAX_MS = 4500;
const JOHN_MOVE_MIN_MS = 1200;
const JOHN_MOVE_MAX_MS = 3000;
const JOHN_HITBOX_SYNC_THRESHOLD = 4;

// ─── State ──────────────────────────────────────────────────────────────────

let isVisible = true;
let pendingChange = null;

/** 'idle' | 'intro_done' */
let dialogueState = 'idle';

/** Dia (WeatherSystem.day) em que o intro foi concluído. A família só começa a
 *  circular livremente a partir do dia seguinte. */
let introDoneDay = null;

function markIntroDone() {
    dialogueState = 'intro_done';
    if (typeof WeatherSystem?.day === 'number') introDoneDay = WeatherSystem.day;
}

/** true quando já passou pelo menos 1 dia desde o intro — destrava free-roam
 *  da família e aparição da Molly. */
function hasFamilyRoamStarted() {
    if (dialogueState !== 'intro_done') return false;
    if (typeof introDoneDay !== 'number') return false;
    const today = (typeof WeatherSystem?.day === 'number') ? WeatherSystem.day : introDoneDay;
    return today > introDoneDay;
}

/** Quest do leite: 'idle' | 'in_progress' | 'declined' | 'delivered' */
let milkQuestState = 'idle';

/** Recompensa em moedas quando o leite é entregue */
const MILK_REWARD_COINS = 50;

/** Item ID for milk bottle quest */
const MILK_BOTTLE_ITEM_ID = 95;

/** Whether the milk bottle has been seeded into the house storage */
let milkBottleSeededInStorage = false;

// Movimento
const johnMovingImgs = []; // raw Images
let johnStandImg = null;
let johnPreIntroImg = null;
let johnImagesReady = false;

let johnPosX = JOHN_START_X;
let johnPosY = JOHN_START_Y;
let johnLastSyncedX = johnPosX;
let johnLastSyncedY = johnPosY;

let johnTargetX = JOHN_START_X;
let johnTargetY = JOHN_START_Y;

let johnIsMoving = false;
let johnFacingLeft = false;

let johnFrameIndex = 0;
let johnLastFrameTime = 0;

let johnStateTimer = 0;
let johnStateDuration = JOHN_IDLE_MIN_MS;
let johnLastTickTime = 0;
let johnAiInterval = null;

// ─── Sprite preload ─────────────────────────────────────────────────────────

function onJohnImageReady(img) {
    return new Promise((resolve) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.onload = () => resolve();
        img.onerror = () => resolve();
    });
}

function preloadJohnSprites() {
    if (johnMovingImgs.length > 0) return;
    const loaders = [];
    for (let i = 0; i < JOHN_MOVING_FRAMES; i++) {
        const img = new Image();
        img.src = `${JOHN_SPRITE_FOLDER}/John_moving(R${i}).png`;
        johnMovingImgs[i] = img;
        loaders.push(onJohnImageReady(img));
    }
    johnStandImg = new Image();
    johnStandImg.src = JOHN_SPRITE_STAND;
    loaders.push(onJohnImageReady(johnStandImg));

    johnPreIntroImg = new Image();
    johnPreIntroImg.src = JOHN_SPRITE_PREINTRO;
    loaders.push(onJohnImageReady(johnPreIntroImg));

    Promise.all(loaders).then(() => {
        johnImagesReady = true;
    });
}

// ─── Free-roam AI ───────────────────────────────────────────────────────────

function johnPickNewState() {
    johnFrameIndex = 0;
    if (Math.random() > 0.45) {
        johnIsMoving = true;
        johnStateDuration = JOHN_MOVE_MIN_MS + Math.random() * (JOHN_MOVE_MAX_MS - JOHN_MOVE_MIN_MS);
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * JOHN_ROAM_RADIUS;
        johnTargetX = JOHN_START_X + Math.cos(angle) * dist;
        johnTargetY = JOHN_START_Y + Math.sin(angle) * dist;
        johnTargetX = Math.max(BORDER_MARGIN, Math.min(MAP_W - JOHN_DRAW_W - BORDER_MARGIN, johnTargetX));
        johnTargetY = Math.max(BORDER_MARGIN, Math.min(MAP_H - JOHN_DRAW_H - BORDER_MARGIN, johnTargetY));
    } else {
        johnIsMoving = false;
        johnStateDuration = JOHN_IDLE_MIN_MS + Math.random() * (JOHN_IDLE_MAX_MS - JOHN_IDLE_MIN_MS);
    }
}

function johnTick() {
    const now = performance.now();
    const dt = johnLastTickTime === 0 ? 16 : Math.min(100, now - johnLastTickTime);
    johnLastTickTime = now;

    // Não atualiza enquanto invisível (noite) nem durante diálogo.
    if (!isVisible) {
        johnIsMoving = false;
        johnFrameIndex = 0;
        return;
    }
    const dlg = getSystem('dialogue');
    const dialogueActive = dlg && dlg.isDialogueActive && dlg.isDialogueActive();
    if (dialogueActive) {
        johnIsMoving = false;
        johnFrameIndex = 0;
        johnStateTimer = now;
        johnStateDuration = JOHN_IDLE_MIN_MS;
        return;
    }

    // Pre-roam: fica parado na posição inicial até o dia seguinte ao intro.
    // (Intro no dia 1 → só começa a circular no dia 2.)
    if (!hasFamilyRoamStarted()) {
        johnIsMoving = false;
        johnFrameIndex = 0;
        if (johnPosX !== JOHN_START_X || johnPosY !== JOHN_START_Y) {
            johnPosX = JOHN_START_X;
            johnPosY = JOHN_START_Y;
            johnTargetX = JOHN_START_X;
            johnTargetY = JOHN_START_Y;
            const npcSys = getSystem('npc');
            if (npcSys?.updateNpc) npcSys.updateNpc(JOHN.id, { x: johnPosX, y: johnPosY });
            johnLastSyncedX = johnPosX;
            johnLastSyncedY = johnPosY;
        }
        johnStateTimer = now;
        return;
    }

    if (now - johnStateTimer > johnStateDuration) {
        johnPickNewState();
        johnStateTimer = now;
    }

    if (johnIsMoving) {
        const dx = johnTargetX - johnPosX;
        const dy = johnTargetY - johnPosY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            johnIsMoving = false;
            johnFrameIndex = 0;
            johnStateTimer = now;
            johnStateDuration = JOHN_IDLE_MIN_MS;
        } else {
            const step = JOHN_SPEED * (dt / 1000);
            const vx = (dx / dist) * step;
            const vy = (dy / dist) * step;
            johnPosX += vx;
            johnPosY += vy;

            const minX = BORDER_MARGIN;
            const minY = BORDER_MARGIN;
            const maxX = MAP_W - JOHN_DRAW_W - BORDER_MARGIN;
            const maxY = MAP_H - JOHN_DRAW_H - BORDER_MARGIN;
            if (johnPosX < minX) { johnPosX = minX; johnTargetX = JOHN_START_X; }
            if (johnPosY < minY) { johnPosY = minY; johnTargetY = JOHN_START_Y; }
            if (johnPosX > maxX) { johnPosX = maxX; johnTargetX = JOHN_START_X; }
            if (johnPosY > maxY) { johnPosY = maxY; johnTargetY = JOHN_START_Y; }

            if (Math.abs(vx) > 0.01) johnFacingLeft = vx < 0;

            if (now - johnLastFrameTime >= JOHN_FRAME_DELAY_MS) {
                johnLastFrameTime = now;
                johnFrameIndex = (johnFrameIndex + 1) % JOHN_MOVING_FRAMES;
            }
        }
    }

    // Clamp dentro do raio (se algo puxar ele pra longe).
    const fromStartX = johnPosX - JOHN_START_X;
    const fromStartY = johnPosY - JOHN_START_Y;
    const distFromStart = Math.sqrt(fromStartX * fromStartX + fromStartY * fromStartY);
    if (distFromStart > JOHN_ROAM_RADIUS * 1.2) {
        johnTargetX = JOHN_START_X;
        johnTargetY = JOHN_START_Y;
        johnIsMoving = true;
        johnStateTimer = now;
        johnStateDuration = JOHN_MOVE_MAX_MS;
    }

    // Sincroniza hitbox de interação só quando andou o suficiente.
    const sdx = johnPosX - johnLastSyncedX;
    const sdy = johnPosY - johnLastSyncedY;
    if (sdx * sdx + sdy * sdy >= JOHN_HITBOX_SYNC_THRESHOLD * JOHN_HITBOX_SYNC_THRESHOLD) {
        const npcSys = getSystem('npc');
        if (npcSys && typeof npcSys.updateNpc === 'function') {
            npcSys.updateNpc(JOHN.id, { x: johnPosX, y: johnPosY });
        }
        johnLastSyncedX = johnPosX;
        johnLastSyncedY = johnPosY;
    }
}

// ─── Custom draw (altura travada, largura por proporção, âncora centro-base) ──

function johnCustomDraw(ctx, cam, zoom) {
    if (!cam || !johnImagesReady) return;
    const preRoam = !hasFamilyRoamStarted();
    const source = preRoam
        ? (johnPreIntroImg || johnStandImg)
        : (johnIsMoving ? (johnMovingImgs[johnFrameIndex] || johnStandImg) : johnStandImg);
    if (!source || !source.complete || source.naturalWidth === 0) return;

    const dw = (!preRoam && johnIsMoving) ? JOHN_MOVE_DRAW_W : JOHN_STAND_DRAW_W;
    const dh = (!preRoam && johnIsMoving) ? JOHN_MOVE_DRAW_H : JOHN_STAND_DRAW_H;
    const drawW = dw * zoom;
    const drawH = dh * zoom;

    const anchorWorldX = johnPosX + JOHN_DRAW_W / 2;
    const anchorWorldY = johnPosY + JOHN_DRAW_H;
    const anchorScreen = cam.worldToScreen(anchorWorldX, anchorWorldY);
    // Snap to integer pixel (vide npcMolly.js pro motivo).
    const drawX = Math.round(anchorScreen.x - drawW / 2);
    const drawY = Math.round(anchorScreen.y - drawH);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (johnFacingLeft) {
        ctx.translate(drawX + drawW, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(source, 0, 0, drawW, drawH);
    } else {
        ctx.drawImage(source, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function t(key, params) { return i18n.t(key, params); }

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
    return camera.isInViewport(johnPosX, johnPosY, JOHN_DRAW_W, JOHN_DRAW_H);
}

function showNpc() {
    if (isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    // Ao reaparecer de manhã, John volta à posição base.
    johnPosX = JOHN_START_X;
    johnPosY = JOHN_START_Y;
    johnLastSyncedX = johnPosX;
    johnLastSyncedY = johnPosY;
    johnTargetX = johnPosX;
    johnTargetY = johnPosY;
    johnIsMoving = false;
    johnFrameIndex = 0;
    johnStateTimer = performance.now();
    johnStateDuration = JOHN_IDLE_MIN_MS;
    npcSys.addNpc({ ...JOHN, x: johnPosX, y: johnPosY, customDraw: johnCustomDraw, onInteract });
    isVisible = true;
    pendingChange = null;
    logger.info('[John] NPC appeared (morning)');
}

function hideNpc() {
    if (!isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.removeNpc(JOHN.id);
    isVisible = false;
    pendingChange = null;
    logger.info('[John] NPC disappeared (night)');
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

function getActiveCharacterId() {
    const playerSys = getSystem('player');
    return playerSys?.activeCharacter?.id || 'stella';
}

function getPlayerName() {
    const id = getActiveCharacterId();
    return { stella: 'Stella', ben: 'Ben', graham: 'Graham' }[id] || 'Stella';
}

function getPlayerDialogPortrait() {
    const id = getActiveCharacterId();
    return `assets/character/${id}/dialog_${id.charAt(0).toUpperCase() + id.slice(1)}_00.png`;
}

// ─── Right-side speaker swap helper ────────────────────────────────────────

function makeSpeakerSwap(config, name) {
    return () => {
        config.right.name = name;
        const el = document.querySelector('.dlg-speaker');
        if (el) el.textContent = name;
    };
}

// ─── Dialogue builder ─────────────────────────────────────────────────────

function buildFirstDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family';

    const config = {
        left: { name: playerName, portrait: LUCAS_DIALOG_01 },
        right: { name: 'Lucas', portrait: LUCAS_DIALOG_01 },
        lines: [],
    };

    const lines = config.lines;
    const swapToJohn = makeSpeakerSwap(config, 'John');
    const swapToLucas = makeSpeakerSwap(config, 'Lucas');
    const swapToIsabela = makeSpeakerSwap(config, 'Isabela');

    // ── Abertura: Lucas e John conversando entre si ──

    // Lucas(01): "Sei não pai... tá certo mesmo?"
    // (portrait do lucas_dialog_01 aparece no lugar do sprite do player)
    lines.push({
        side: 'right',
        text: t(`${K}.lucasDoubt`),
    });

    // John(02): "Hm.... acho que invertemos algo."
    lines.push({
        side: 'right',
        text: t(`${K}.johnHmm`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_02 },
        action: swapToJohn,
    });

    // Lucas(01): "Hm..... sério pai?"
    lines.push({
        side: 'right',
        text: t(`${K}.lucasSerious`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_01 },
        action: swapToLucas,
    });

    // Isabela(02) *ri olhando para celular*
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaLaugh`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_02 },
        action: swapToIsabela,
    });

    // John: "Isa."
    lines.push({
        side: 'right',
        text: t(`${K}.johnIsa1`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Isabela: *rindo ainda no celular*
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaStillLaughing`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_02 },
        action: swapToIsabela,
    });

    // John: "Isabela!"
    lines.push({
        side: 'right',
        text: t(`${K}.johnIsabela`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Isabela nota o player — reação depende do personagem
    // Isabela nota o player — portrait depende do personagem:
    // Graham → dialog_00, Stella → dialog_01, Ben → dialog_01
    const noticeKey = {
        stella: `${K}.isabelaNoticeStella`,
        ben: `${K}.isabelaNoticeBen`,
        graham: `${K}.isabelaNoticeGraham`,
    }[charId] || `${K}.isabelaNoticeStella`;
    const noticePortrait = charId === 'graham' ? ISABELA_DIALOG_00 : ISABELA_DIALOG_01;
    lines.push({
        side: 'right',
        text: t(noticeKey),
        setPortrait: { side: 'right', src: noticePortrait },
        action: swapToIsabela,
    });

    // John(01): "olá?"
    lines.push({
        side: 'right',
        text: t(`${K}.johnHello`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_01 },
        action: swapToJohn,
    });

    // ── Player se apresenta ──
    // Troca left portrait para o player real
    lines.push({
        side: 'left',
        text: t(`${K}.playerIntro`, { name: playerName }),
        setPortrait: { side: 'left', src: playerPortrait },
    });

    // Lucas(00) aparece do lado direito: "Oie."
    lines.push({
        side: 'right',
        text: t(`${K}.lucasHi`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
        action: swapToLucas,
    });

    // John(00): "E está perdido?"
    lines.push({
        side: 'right',
        text: t(`${K}.johnLost`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // ── Branch por personagem ──
    if (charId === 'stella') {
        buildStellaDialogue(lines, config, K, playerName);
    } else if (charId === 'graham') {
        buildGrahamDialogue(lines, config, K, playerName);
    } else {
        buildBenDialogue(lines, config, K, playerName);
    }

    return config;
}

// ─── Stella branch ──────────────────────────────────────────────────────────

function buildStellaDialogue(lines, config, K) {
    const swapToJohn = makeSpeakerSwap(config, 'John');
    const swapToIsabela = makeSpeakerSwap(config, 'Isabela');
    const swapToLucas = makeSpeakerSwap(config, 'Lucas');

    // Stella: "Não não.. estou conhecendo o bairro..."
    lines.push({ side: 'left', text: t(`${K}.stellaNotLost`) });

    // John: "Sozinha?"
    lines.push({
        side: 'right',
        text: t(`${K}.johnAlone`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Stella: "Sim... conheciam o senhor Gilbert?"
    lines.push({ side: 'left', text: t(`${K}.stellaGilbert`) });

    // John: "Meu pesames..."
    lines.push({
        side: 'right',
        text: t(`${K}.johnCondolencesStella`),
    });

    // Stella: "Sim, estou sim."
    lines.push({ side: 'left', text: t(`${K}.stellaYes`) });

    // John: "entendo... sou John Alexander Miller..." (apresenta família)
    lines.push({
        side: 'right',
        text: t(`${K}.johnIntroFamily`),
    });

    // Isabela(01): "bem vindo a essa cidade minuscula."
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaWelcome`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_01 },
        action: swapToIsabela,
    });

    // John: "isa."
    lines.push({
        side: 'right',
        text: t(`${K}.johnIsa2`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Isabela(02): *murmura voltando pro celular*
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaMumble`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_02 },
        end: true,
        action: () => { swapToIsabela(); markIntroDone(); },
    });
}

// ─── Graham branch ──────────────────────────────────────────────────────────

function buildGrahamDialogue(lines, config, K) {
    const swapToJohn = makeSpeakerSwap(config, 'John');
    const swapToIsabela = makeSpeakerSwap(config, 'Isabela');
    const swapToLucas = makeSpeakerSwap(config, 'Lucas');

    // Graham: "não, conhecendo o bairro"
    lines.push({ side: 'left', text: t(`${K}.grahamNotLost`) });

    // John(01): "parente de alguem?"
    lines.push({
        side: 'right',
        text: t(`${K}.johnRelative`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_01 },
        action: swapToJohn,
    });

    // Graham: "Gilbert, o fazendeiro que faleceu semana passada."
    lines.push({ side: 'left', text: t(`${K}.grahamGilbert`) });

    // John: "neto dele? meus pesames..."
    lines.push({
        side: 'right',
        text: t(`${K}.johnCondolencesGraham`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
    });

    // Graham: "já sinto falta dele. E quem são as crianças?"
    lines.push({ side: 'left', text: t(`${K}.grahamMissHim`) });

    // John: "este é..." (isabela corta)
    // Isabela(00): "sou Isabela, pode me chamar de Isa..."
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaCutIn`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_00 },
        action: swapToIsabela,
    });

    // John: "isa."
    lines.push({
        side: 'right',
        text: t(`${K}.johnIsa2`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Lucas: "opa, e ela que é pateta."
    lines.push({
        side: 'right',
        text: t(`${K}.lucasPateta`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
        action: swapToLucas,
    });

    // John: "Sou John, ele é Lucas e ela é Isabela"
    lines.push({
        side: 'right',
        text: t(`${K}.johnIntroAll`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Isabela: *acena com a mão*
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaWave`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_00 },
        action: swapToIsabela,
    });

    // John: "fuzileiro?"
    lines.push({
        side: 'right',
        text: t(`${K}.johnMarine`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Graham: "sim, marinha?"
    lines.push({ side: 'left', text: t(`${K}.grahamNavy`) });

    // John: "Aeronáutica, batalhão?"
    lines.push({ side: 'right', text: t(`${K}.johnAirForce`) });

    // Graham: "107 batalhão."
    lines.push({ side: 'left', text: t(`${K}.graham107`) });

    // John: "piloto de caça."
    lines.push({ side: 'right', text: t(`${K}.johnPilot`) });

    // Lucas: "que legal, outro do exército."
    lines.push({
        side: 'right',
        text: t(`${K}.lucasCool`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
        action: swapToLucas,
    });

    // John: "bom Graham, prazer em conhecer..."
    lines.push({
        side: 'right',
        text: t(`${K}.johnFarewellGraham`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Isabela: *sorrindo* "ou eu! e bom... bem vindo a capa de ganso!"
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaFarewellGraham`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_01 },
        action: swapToIsabela,
    });

    // Lucas: *franze a testa para isabela*
    lines.push({
        side: 'right',
        text: t(`${K}.lucasFrown`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_01 },
        action: swapToLucas,
    });

    // Graham: "digo o mesmo a todos. Aliás estou na fazenda do meu avô."
    lines.push({ side: 'left', text: t(`${K}.grahamSameToYou`) });

    // John: "ok, tenha um bom passeio"
    lines.push({
        side: 'right',
        text: t(`${K}.johnGoodWalk`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        end: true,
        action: () => { swapToJohn(); markIntroDone(); },
    });
}

// ─── Ben branch ─────────────────────────────────────────────────────────────

function buildBenDialogue(lines, config, K) {
    const swapToJohn = makeSpeakerSwap(config, 'John');
    const swapToIsabela = makeSpeakerSwap(config, 'Isabela');
    const swapToLucas = makeSpeakerSwap(config, 'Lucas');

    // Ben: "ah não... conhecendo o pessoal daqui do bairro."
    lines.push({ side: 'left', text: t(`${K}.benNotLost`) });

    // John: "e onde está seus pais?"
    lines.push({
        side: 'right',
        text: t(`${K}.johnParents`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Ben: "bom... meio que cuidando da fazenda do meu avô."
    lines.push({ side: 'left', text: t(`${K}.benFarm`) });

    // John: "Gilbert?"
    lines.push({ side: 'right', text: t(`${K}.johnGilbert`) });

    // Ben: "sim."
    lines.push({ side: 'left', text: t(`${K}.benYes`) });

    // John: "conheci o Gilbert, meus pesames..."
    lines.push({ side: 'right', text: t(`${K}.johnCondolencesBen`) });

    // Isabela: "então tu é o neto do fazendeiro?"
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaFarmer`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_01 },
        action: swapToIsabela,
    });

    // Ben: "*cora* s-sim."
    lines.push({ side: 'left', text: t(`${K}.benBlush`) });

    // Isabela: "cê tem oque? 15 anos?"
    lines.push({ side: 'right', text: t(`${K}.isabelaAge`) });

    // Ben: "17..."
    lines.push({ side: 'left', text: t(`${K}.ben17`) });

    // Lucas: "sério? você tem a idade da minha irmã..."
    lines.push({
        side: 'right',
        text: t(`${K}.lucasAge`),
        setPortrait: { side: 'right', src: LUCAS_DIALOG_00 },
        action: swapToLucas,
    });

    // Isabela: "cala boca pirralho!"
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaShutUp`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_02 },
        action: swapToIsabela,
    });

    // John: "Isa, Lucas. Agora não."
    lines.push({
        side: 'right',
        text: t(`${K}.johnNotNow`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // John: "bom, este é meu garoto mais velho..."
    lines.push({ side: 'right', text: t(`${K}.johnIntroBen`) });

    // John: "sou John alexander Miller garoto..."
    lines.push({ side: 'right', text: t(`${K}.johnFullIntroBen`) });

    // Ben: "tá bom... eu... se precisarem..."
    lines.push({ side: 'left', text: t(`${K}.benFarewell`) });

    // John(02) e Lucas(01): *acenam com a mão*
    lines.push({
        side: 'right',
        text: t(`${K}.johnLucasWave`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_02 },
        action: swapToJohn,
    });

    // Isabela(02): *volta para o celular*
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaBackToPhone`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_02 },
        end: true,
        action: () => { swapToIsabela(); markIntroDone(); },
    });
}

// ─── Milk Quest ─────────────────────────────────────────────────────────────

function buildMilkQuestDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.milk';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'John', portrait: JOHN_DIALOG_00 },
        lines: [],
    };

    const lines = config.lines;
    const swapToJohn = makeSpeakerSwap(config, 'John');
    const swapToIsabela = makeSpeakerSwap(config, 'Isabela');

    // John cumprimenta
    lines.push({
        side: 'right',
        text: t(`${K}.greeting`, { name: playerName }),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Reply do player
    const replyKey = { stella: `${K}.replyStella`, graham: `${K}.replyGraham`, ben: `${K}.replyBen` }[charId] || `${K}.replyStella`;
    lines.push({ side: 'left', text: t(replyKey) });

    // John: avô de valor
    lines.push({
        side: 'right',
        text: t(`${K}.johnOfValue`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // Isabela grita
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaShout`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_00 },
        action: swapToIsabela,
    });

    // John: não grita
    lines.push({
        side: 'right',
        text: t(`${K}.johnNoShout`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_01 },
        action: swapToJohn,
    });

    // Isabela murmura
    lines.push({
        side: 'right',
        text: t(`${K}.isabelaMumble`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_00 },
        action: swapToIsabela,
    });

    // John se desculpa
    lines.push({
        side: 'right',
        text: t(`${K}.johnApology`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    // John pede o leite
    lines.push({
        side: 'right',
        text: t(`${K}.johnAskMilk`, { name: playerName }),
    });

    // Escolha
    const choiceLine = {
        side: 'left',
        text: '',
        type: 'choice',
        options: [
            { text: t(`${K}.choiceAccept`), value: 'accept', next: -1 },
            { text: t(`${K}.choiceAskPrice`), value: 'price', next: -1 },
            { text: t(`${K}.choiceDecline`), value: 'decline', next: -1 },
        ],
    };
    lines.push(choiceLine);

    // ── Branch ACEITAR ──
    const acceptIdx = lines.length;
    const acceptKey = { stella: `${K}.acceptStella`, graham: `${K}.acceptGraham`, ben: `${K}.acceptBen` }[charId] || `${K}.acceptStella`;
    lines.push({ side: 'left', text: t(acceptKey) });

    lines.push({
        side: 'right',
        text: t(`${K}.johnThanks`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    lines.push({
        side: 'right',
        text: t(`${K}.isabelaThanksMurmur`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_00 },
        end: true,
        action: () => { swapToIsabela(); milkQuestState = 'in_progress'; seedMilkBottle(); },
    });

    // ── Branch PERGUNTAR PREÇO ──
    const priceIdx = lines.length;
    const priceKey = { stella: `${K}.askPriceStella`, graham: `${K}.askPriceGraham`, ben: `${K}.askPriceBen` }[charId] || `${K}.askPriceStella`;
    lines.push({ side: 'left', text: t(priceKey) });

    lines.push({
        side: 'right',
        text: t(`${K}.johnPrice`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    const priceOkKey = { stella: `${K}.priceOkStella`, graham: `${K}.priceOkGraham`, ben: `${K}.priceOkBen` }[charId] || `${K}.priceOkStella`;
    lines.push({
        side: 'left',
        text: t(priceOkKey),
        end: true,
        action: () => { milkQuestState = 'in_progress'; seedMilkBottle(); },
    });

    // ── Branch RECUSAR ──
    const declineIdx = lines.length;
    const declineKey = { stella: `${K}.declineStella`, graham: `${K}.declineGraham`, ben: `${K}.declineBen` }[charId] || `${K}.declineStella`;
    lines.push({ side: 'left', text: t(declineKey) });

    lines.push({
        side: 'right',
        text: t(`${K}.johnDeclineReply`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    lines.push({
        side: 'right',
        text: t(`${K}.isabelaDeclineMurmur`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_00 },
        action: swapToIsabela,
    });

    lines.push({
        side: 'right',
        text: t(`${K}.johnSolve`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_01 },
        end: true,
        action: () => { swapToJohn(); milkQuestState = 'declined'; },
    });

    // Ajustar indices
    choiceLine.options[0].next = acceptIdx;
    choiceLine.options[1].next = priceIdx;
    choiceLine.options[2].next = declineIdx;

    return config;
}

function playerHasMilk() {
    const inv = getSystem('inventory') || window.inventorySystem;
    if (!inv || typeof inv.getItemQuantity !== 'function') return false;
    return (inv.getItemQuantity(MILK_BOTTLE_ITEM_ID) || 0) > 0;
}

function consumeMilkAndReward() {
    // Guarda contra re-entrada — evita recompensa dupla se o fluxo for reaberto
    // antes do estado persistir (ex.: duas interações concorrentes).
    if (milkQuestState === 'delivered') return false;
    const inv = getSystem('inventory') || window.inventorySystem;
    if (!inv) return false;
    // Double-check antes de remover — evita trocar estado/marcar save sem o item.
    if (!playerHasMilk()) return false;
    const removed = inv.removeItem(MILK_BOTTLE_ITEM_ID, 1);
    if (!removed) return false;
    milkQuestState = 'delivered';

    // Registry aplica recompensas (XP + currency) e dispara eventos.
    const registry = getSystem('questRegistry');
    if (registry?.complete) {
        registry.complete('john_milk');
    } else {
        // Fallback se o registry não carregou.
        const currency = getSystem('currency');
        if (currency?.earn) currency.earn(MILK_REWARD_COINS, 'john_milk_quest');
        document.dispatchEvent(new CustomEvent('questUpdated', {
            detail: { id: 'john_milk', status: 'completed' },
        }));
        const save = getSystem('save');
        if (save?.markDirty) save.markDirty();
    }
    return true;
}

function buildMilkDeliverDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.milk';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'John', portrait: JOHN_DIALOG_00 },
        lines: [],
    };
    const lines = config.lines;
    const swapToJohn = makeSpeakerSwap(config, 'John');
    const swapToIsabela = makeSpeakerSwap(config, 'Isabela');

    lines.push({
        side: 'right',
        text: t(`${K}.askIfGot`, { name: playerName }),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    const handKey = { stella: `${K}.handStella`, graham: `${K}.handGraham`, ben: `${K}.handBen` }[charId] || `${K}.handStella`;
    lines.push({
        side: 'left',
        text: t(handKey),
        action: () => { consumeMilkAndReward(); },
    });

    lines.push({
        side: 'right',
        text: t(`${K}.johnPerfect`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        action: swapToJohn,
    });

    lines.push({
        side: 'right',
        text: t(`${K}.isabelaGrab`),
        setPortrait: { side: 'right', src: ISABELA_DIALOG_00 },
        action: swapToIsabela,
    });

    lines.push({
        side: 'right',
        text: t(`${K}.johnShake`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_01 },
        end: true,
        action: swapToJohn,
    });

    return config;
}

function buildMilkWaitingDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.milk';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'John', portrait: JOHN_DIALOG_00 },
        lines: [],
    };

    config.lines.push({
        side: 'right',
        text: t(`${K}.askStill`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
    });

    const stillKey = { stella: `${K}.stillStella`, graham: `${K}.stillGraham`, ben: `${K}.stillBen` }[charId] || `${K}.stillStella`;
    config.lines.push({ side: 'left', text: t(stillKey) });

    config.lines.push({
        side: 'right',
        text: t(`${K}.johnTranquilo`),
        setPortrait: { side: 'right', src: JOHN_DIALOG_00 },
        end: true,
    });

    return config;
}

function buildMilkDoneDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.family.milk';

    return {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'John', portrait: JOHN_DIALOG_00 },
        lines: [
            { side: 'right', text: t(`${K}.questDone`), setPortrait: { side: 'right', src: JOHN_DIALOG_00 }, end: true },
        ],
    };
}

// ─── Milk bottle seeding ────────────────────────────────────────────────────

/**
 * Seeds the milk bottle into the house storage when quest is accepted.
 * Called when milkQuestState changes to 'in_progress'.
 */
function seedMilkBottle() {
    if (milkBottleSeededInStorage) return;
    if (milkQuestState !== 'in_progress') return;

    const storage = getSystem('storage') || window.storageSystem;
    if (!storage) {
        // Storage ainda não carregou. Agenda nova tentativa.
        seedMilkBottle._retries = (seedMilkBottle._retries || 0) + 1;
        if (seedMilkBottle._retries > 30) {
            logger.warn('[John] StorageSystem never became available — milk not seeded');
            return;
        }
        setTimeout(seedMilkBottle, 500);
        return;
    }

    // Check if milk is already in storage
    const resourceItems = storage.storage?.resources || [];
    const alreadyInStorage = resourceItems.some(s => s.itemId === MILK_BOTTLE_ITEM_ID);
    if (alreadyInStorage) {
        milkBottleSeededInStorage = true;
        return;
    }

    // Add milk to house storage (resources category)
    const added = storage._addToCategory('resources', MILK_BOTTLE_ITEM_ID, 1);
    if (added) {
        milkBottleSeededInStorage = true;
        logger.info('[John] Milk bottle seeded into house storage');
    } else {
        logger.warn('[John] Failed to seed milk bottle into storage');
    }
}

// ─── Interaction handler ────────────────────────────────────────────────────

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[John] DialogueSystem not available');
        return;
    }

    if (dialogueState === 'idle') {
        dlg.start(buildFirstDialogue());
        return;
    }

    // Após intro, abre quest do leite
    if (milkQuestState === 'idle' || milkQuestState === 'declined') {
        dlg.start(buildMilkQuestDialogue());
    } else if (milkQuestState === 'in_progress') {
        if (playerHasMilk()) {
            dlg.start(buildMilkDeliverDialogue());
        } else {
            dlg.start(buildMilkWaitingDialogue());
        }
    } else {
        // delivered
        dlg.start(buildMilkDoneDialogue());
    }
}

// ─── Save / Load ────────────────────────────────────────────────────────────

function getQuestState() {
    return {
        dialogue: dialogueState,
        introDoneDay,
        milkQuest: milkQuestState,
    };
}

function setQuestState(data) {
    if (!data) return;
    if (typeof data === 'string') { dialogueState = data; return; }
    if (data.dialogue) dialogueState = data.dialogue;
    if (typeof data.introDoneDay === 'number') introDoneDay = data.introDoneDay;
    if (data.milkQuest) {
        milkQuestState = data.milkQuest;
        // Reset seed flag if loading old state, will re-seed if needed
        if (milkQuestState !== 'in_progress') {
            milkBottleSeededInStorage = false;
        } else {
            // If quest is in_progress on load, seed the milk
            setTimeout(seedMilkBottle, 1000);
        }
    }
}

// ─── Register NPC ───────────────────────────────────────────────────────────

function register() {
    const npcSys = getSystem('npc');
    if (!npcSys) {
        logger.warn('[John] NpcSystem not available, retrying...');
        setTimeout(register, 500);
        return;
    }

    preloadJohnSprites();

    if (shouldBeVisible()) {
        npcSys.addNpc({ ...JOHN, x: johnPosX, y: johnPosY, customDraw: johnCustomDraw, onInteract });
        isVisible = true;
    } else {
        isVisible = false;
    }

    johnStateTimer = performance.now();
    if (!johnAiInterval) johnAiInterval = setInterval(johnTick, 50);

    setInterval(updateVisibility, 2000);
    setInterval(checkPendingChange, 500);

    logger.info('[John] NPC registered in city (free-roam)');
}

// ─── Public API ─────────────────────────────────────────────────────────────

const johnAPI = {
    register,
    getQuestState,
    setQuestState,
    hasFamilyRoamStarted,
};

registerSystem('npcJohn', johnAPI);

register();

export default johnAPI;
