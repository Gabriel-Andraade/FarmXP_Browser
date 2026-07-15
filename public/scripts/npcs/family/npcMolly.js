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

/** Quest "Jantar com a família Miller": 'idle' | 'active' | 'completed'.
 *  Por enquanto só ativa (aparece no painel) — sem rastreio de ingredientes. */
let dinnerQuest = 'idle';
/** Receita escolhida pelo player: null | 'main' | 'dessert'. */
let dinnerRecipe = null;
/** Seguinte estado da reoferta após recusar no primeiro diálogo. */
let followupState = 'idle';

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

function t(key, params) {
    return i18n.t(key, params);
}

function pickText(stellaKey, benKey, grahamKey) {
    const charId = getActiveCharacterId();
    if (charId === 'ben') return t(benKey);
    if (charId === 'graham') return t(grahamKey);
    return t(stellaKey);
}

const MOLLY_PORTRAIT = 'assets/character/family/molly_dialog_00.png';
const JOHN_PORTRAIT  = 'assets/character/family/john_dialog_00.png';
const LUNA_PORTRAIT  = 'assets/character/family/luna_dialog_00.png';
const CLARA_PORTRAIT = 'assets/character/family/clara_dialog_00.png';

// Ingredientes por receita (ver item.js): 61=Leite, 60=Ovo Cru, 121=Brócolis,
// 133=Couve-Flor, 129=Pimentinha. A abóbora é resolvida pela Clara no diálogo,
// então NÃO entra na lista de itens a coletar.
const DINNER_RECIPES = {
    dessert: [ { id: 61, qty: 1 }, { id: 60, qty: 3 } ],
    main:    [ { id: 121, qty: 2 }, { id: 133, qty: 2 }, { id: 129, qty: 1 } ],
};

/**
 * Resolve marcadores `_label` / `_goto` em índices numéricos `next`, para que
 * o roteiro ramificado fique legível e seguro de editar (sem contagem manual
 * de índices). Cada `_goto` (na linha ou numa opção de escolha) aponta para a
 * linha marcada com o `_label` correspondente.
 */
function resolveDialogueLabels(config) {
    const { lines } = config;
    const labelIndex = {};
    lines.forEach((line, i) => { if (line._label) labelIndex[line._label] = i; });
    for (const line of lines) {
        if (line._goto != null) { line.next = labelIndex[line._goto]; delete line._goto; }
        if (Array.isArray(line.options)) {
            for (const opt of line.options) {
                if (opt._goto != null) { opt.next = labelIndex[opt._goto]; delete opt._goto; }
            }
        }
        delete line._label;
    }
    return config;
}

/**
 * Ativa a quest do jantar: marca como ativa, guarda a receita escolhida e
 * persiste. A partir daí, o progresso dos ingredientes aparece no painel e a
 * entrega (buildDeliveryDialogue) concede a recompensa via questRegistry.
 */
function activateDinnerQuest(recipe) {
    dinnerQuest = 'active';
    dinnerRecipe = recipe;
    followupState = 'resolved';
    const questId = recipe === 'dessert' ? 'molly_dinner_dessert' : 'molly_dinner_main';
    document.dispatchEvent(new CustomEvent('questUpdated', { detail: { id: questId, status: 'active' } }));
    const save = getSystem('save');
    if (save?.markDirty) save.markDirty();
}

/**
 * Cutscene de boas-vindas da Molly (primeiro contato).
 * Molly, John, Luna e Clara dividem o slot de retrato da direita: cada fala
 * troca a imagem (setPortrait) e o nome do falante (action mutando right.name).
 * Escolher a receita (principal/sobremesa) ativa a quest via activateDinnerQuest.
 */
function buildWelcomeDialogue() {
    const charId = getActiveCharacterId();            // 'stella' | 'ben' | 'graham'
    const isStella = charId === 'stella';
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();

    const right = { name: 'Molly', portrait: MOLLY_PORTRAIT };
    const left  = { name: playerName, portrait: playerPortrait };

    // Helpers de fala: cada um fixa retrato + nome do falante do lado direito.
    const molly       = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: MOLLY_PORTRAIT }, action: () => { right.name = 'Molly'; }, ...extra });
    const john        = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: JOHN_PORTRAIT },  action: () => { right.name = 'John'; },  ...extra });
    const luna        = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: LUNA_PORTRAIT },  action: () => { right.name = 'Luna'; },  ...extra });
    const lunaHidden  = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: LUNA_PORTRAIT },  action: () => { right.name = '???'; },   ...extra });
    const claraHidden = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: CLARA_PORTRAIT }, action: () => { right.name = '???'; },   ...extra });
    const me          = (text, extra = {}) => ({ side: 'left', text, ...extra });

    const farmer = isStella ? t('npc.family.mollyQuest.farmerRole.stella') : t('npc.family.mollyQuest.farmerRole.default');

    const aText = pickText('npc.family.mollyQuest.helpChoiceA.stella', 'npc.family.mollyQuest.helpChoiceA.ben', 'npc.family.mollyQuest.helpChoiceA.graham');
    const bText = pickText('npc.family.mollyQuest.helpChoiceB.stella', 'npc.family.mollyQuest.helpChoiceB.ben', 'npc.family.mollyQuest.helpChoiceB.graham');

    const lines = [
        molly(t('npc.family.mollyQuest.introGreeting', { name: playerName })),
    ];

    if (isStella) {
        lines.push(me(t('npc.family.mollyQuest.replyStella1')));
        lines.push(me(t('npc.family.mollyQuest.replyStella2')));
    } else {
        lines.push(me(pickText('npc.family.mollyQuest.replyDefault.stella', 'npc.family.mollyQuest.replyDefault.ben', 'npc.family.mollyQuest.replyDefault.graham')));
    }

    lines.push(molly(t('npc.family.mollyQuest.introFollowUp')));
    lines.push(john(t('npc.family.mollyQuest.johnAppears')));
    lines.push(molly(t('npc.family.mollyQuest.mollyStartled')));
    lines.push(me(t('npc.family.mollyQuest.playerLaugh', { name: playerName })));
    lines.push(molly(t('npc.family.mollyQuest.mollyScold')));
    lines.push(john(t('npc.family.mollyQuest.johnAgain')));
    lines.push(molly(t('npc.family.mollyQuest.mollyQuestion')));
    lines.push(john(t('npc.family.mollyQuest.johnWhat')));
    lines.push(molly(t('npc.family.mollyQuest.mollyLaugh')));
    lines.push(john(t('npc.family.mollyQuest.johnLaugh')));
    lines.push(molly(t('npc.family.mollyQuest.banquetOffer', { role: farmer })));

    lines.push(me(pickText('npc.family.mollyQuest.playerDecline.stella', 'npc.family.mollyQuest.playerDecline.ben', 'npc.family.mollyQuest.playerDecline.graham')));
    lines.push(john(t('npc.family.mollyQuest.johnSaveLife')));
    lines.push(lunaHidden(t('npc.family.mollyQuest.lunaHidden')));
    lines.push(molly(t('npc.family.mollyQuest.mollyCall')));
    lines.push(luna(t('npc.family.mollyQuest.lunaMilkOut')));
    lines.push(molly(t('npc.family.mollyQuest.mollyJohn')));
    lines.push(john(t('npc.family.mollyQuest.johnLookAway')));
    lines.push(molly(t('npc.family.mollyQuest.mollyJohnAgain')));
    lines.push(john(t('npc.family.mollyQuest.johnMurmur')));
    lines.push(molly(t('npc.family.mollyQuest.mollyJohnMiller')));
    lines.push(john(t('npc.family.mollyQuest.johnGoGet')));
    lines.push(john(t('npc.family.mollyQuest.johnLeave')));
    lines.push(molly(t('npc.family.mollyQuest.mollyForgot')));
    if (isStella) lines.push(me(t('npc.family.mollyQuest.playerUnderstandsStella')));
    lines.push(molly(t('npc.family.mollyQuest.mollyThreeJobs')));
    lines.push(me(t('npc.family.mollyQuest.playerThree')));
    lines.push(molly(t('npc.family.mollyQuest.mollyJobs')));
    lines.push(me(pickText('npc.family.mollyQuest.playerReaction.stella', 'npc.family.mollyQuest.playerReaction.ben', 'npc.family.mollyQuest.playerReaction.graham')));
    lines.push(molly(t('npc.family.mollyQuest.mollySmile')));
    lines.push(luna(t('npc.family.mollyQuest.lunaCallAgain')));
    lines.push(molly(t('npc.family.mollyQuest.mollyShout')));
    lines.push(luna(t('npc.family.mollyQuest.lunaPapa')));
    lines.push(molly(t('npc.family.mollyQuest.mollyYes')));
    lines.push(luna(t('npc.family.mollyQuest.lunaYay')));

    lines.push(molly(t('npc.family.mollyQuest.mollyApology', { name: playerName }), {
        type: 'choice',
        options: [
            { text: aText, _goto: 'playerA' },
            { text: bText, _goto: 'sectionB' },
        ],
    }));

    lines.push(me(bText, { _label: 'sectionB' }));
    lines.push(molly(t('npc.family.mollyQuest.declineBranch'), {
        type: 'choice',
        options: [
            { text: t('npc.family.mollyQuest.declineChoice'), _goto: 'declineEnd', onSelect: () => { followupState = 'pending'; } },
            { text: aText, _goto: 'playerA' },
        ],
    }));
    lines.push(me(t('npc.family.mollyQuest.declineChoice'), { _label: 'declineEnd', end: true }));

    lines.push(me(aText, { _label: 'playerA' }));
    lines.push(molly(t('npc.family.mollyQuest.helpOffer'), {
        type: 'choice',
        options: [
            { text: t('npc.family.mollyQuest.chooseMain'), _goto: 'principal', onSelect: () => activateDinnerQuest('main') },
            { text: t('npc.family.mollyQuest.chooseDessert'), _goto: 'sobremesa', onSelect: () => activateDinnerQuest('dessert') },
        ],
    }));

    lines.push(molly(t('npc.family.mollyQuest.dessertRequest'), { _label: 'sobremesa', end: true }));
    lines.push(molly(t('npc.family.mollyQuest.mainRequest'), { _label: 'principal' }));
    lines.push(molly(t('npc.family.mollyQuest.pumpkinDelay')));
    lines.push(me(pickText('npc.family.mollyQuest.pumpkinQuestion.stella', 'npc.family.mollyQuest.pumpkinQuestion.ben', 'npc.family.mollyQuest.pumpkinQuestion.graham')));
    lines.push(molly(t('npc.family.mollyQuest.claraHelp')));
    lines.push(claraHidden(t('npc.family.mollyQuest.claraReveal')));
    lines.push(molly(t('npc.family.mollyQuest.claraSaved', { name: playerName }), { end: true }));

    return resolveDialogueLabels({ left, right, lines });
}

function buildReofferDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const right = { name: 'Molly', portrait: MOLLY_PORTRAIT };
    const left = { name: playerName, portrait: playerPortrait };

    const molly = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: MOLLY_PORTRAIT }, action: () => { right.name = 'Molly'; }, ...extra });
    const me = (text, extra = {}) => ({ side: 'left', text, ...extra });

    const lines = [
        molly(t('npc.family.mollyQuest.reofferPrompt'), {
            type: 'choice',
            options: [
                { text: t('npc.family.mollyQuest.reofferYes'), _goto: 'yes', onSelect: () => { followupState = 'resolved'; } },
                { text: t('npc.family.mollyQuest.reofferNo'), _goto: 'no', onSelect: () => { followupState = 'declined'; } },
            ],
        }),
        me(t('npc.family.mollyQuest.reofferNo'), { _label: 'no' }),
        molly(t('npc.family.mollyQuest.reofferDecline'), { end: true }),
        me(t('npc.family.mollyQuest.reofferYes'), { _label: 'yes' }),
        molly(t('npc.family.mollyQuest.helpOffer'), {
            type: 'choice',
            options: [
                { text: t('npc.family.mollyQuest.chooseMain'), _goto: 'principal', onSelect: () => activateDinnerQuest('main') },
                { text: t('npc.family.mollyQuest.chooseDessert'), _goto: 'sobremesa', onSelect: () => activateDinnerQuest('dessert') },
            ],
        }),
        molly(t('npc.family.mollyQuest.dessertRequest'), { _label: 'sobremesa', end: true }),
        molly(t('npc.family.mollyQuest.mainRequest'), { _label: 'principal' }),
        molly(t('npc.family.mollyQuest.pumpkinDelay')),
        me(pickText('npc.family.mollyQuest.pumpkinQuestion.stella', 'npc.family.mollyQuest.pumpkinQuestion.ben', 'npc.family.mollyQuest.pumpkinQuestion.graham')),
        molly(t('npc.family.mollyQuest.claraHelp')),
        claraHidden(t('npc.family.mollyQuest.claraReveal')),
        molly(t('npc.family.mollyQuest.claraSaved', { name: playerName }), { end: true }),
    ];

    return resolveDialogueLabels({ left, right, lines });
}

// ─── Progresso / consumo dos ingredientes ───────────────────────────────────

function invQty(id) {
    const inv = getSystem('inventory');
    return inv?.getItemQuantity ? (inv.getItemQuantity(id) || 0) : 0;
}

/**
 * Progresso dos ingredientes da receita escolhida. Estrutura nomeada por
 * receita (main/dessert) pra o painel de quests montar a descrição dinâmica.
 */
function getIngredientProgress() {
    if (dinnerRecipe === 'dessert') {
        const milk = invQty(61), eggs = invQty(60);
        return {
            recipe: 'dessert',
            ready: milk >= 1 && eggs >= 3,
            milk: { have: milk, need: 1 },
            eggs: { have: eggs, need: 3 },
        };
    }
    // 'main' (default)
    const broc = invQty(121), cauli = invQty(133), chili = invQty(129);
    return {
        recipe: 'main',
        ready: broc >= 2 && cauli >= 2 && chili >= 1,
        broc:  { have: broc,  need: 2 },
        cauli: { have: cauli, need: 2 },
        chili: { have: chili, need: 1 },
    };
}

/**
 * Consome os ingredientes da receita, com pré-checagem e rollback: se qualquer
 * remoção falhar, devolve o que já foi removido pra não sumir item do player.
 */
function consumeIngredients() {
    const inv = getSystem('inventory');
    if (!inv?.removeItem) return false;
    const reqs = DINNER_RECIPES[dinnerRecipe];
    if (!reqs) return false;

    for (const r of reqs) {
        if (invQty(r.id) < r.qty) return false;
    }

    const removed = [];
    for (const r of reqs) {
        if (inv.removeItem(r.id, r.qty)) {
            removed.push(r);
        } else {
            for (const rr of removed) inv.addItem?.(rr.id, rr.qty); // rollback
            return false;
        }
    }
    return true;
}

// ─── Diálogos de entrega / conclusão ────────────────────────────────────────

function buildDeliveryDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const right = { name: 'Molly', portrait: MOLLY_PORTRAIT };
    const left = { name: playerName, portrait: playerPortrait };
    const molly = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: MOLLY_PORTRAIT }, action: () => { right.name = 'Molly'; }, ...extra });
    const me = (text, extra = {}) => ({ side: 'left', text, ...extra });

    const prog = getIngredientProgress();
    const lines = [ molly(t('npc.family.mollyQuest.deliveryAsk')) ];

    if (!prog.ready) {
        // Ainda falta algo: só lembra, sem consumir nada.
        lines.push(molly(t('npc.family.mollyQuest.notReady'), { end: true }));
        return { left, right, lines };
    }

    lines.push(me(t('npc.family.mollyQuest.deliverBring')));
    lines.push(molly(t('npc.family.mollyQuest.deliverThanks'), {
        end: true,
        action: () => {
            if (consumeIngredients()) {
                dinnerQuest = 'completed';
                const questId = dinnerRecipe === 'dessert' ? 'molly_dinner_dessert' : 'molly_dinner_main';
                const registry = getSystem('questRegistry');
                if (registry?.complete) {
                    registry.complete(questId);
                } else {
                    document.dispatchEvent(new CustomEvent('questUpdated', { detail: { id: questId, status: 'completed' } }));
                    const save = getSystem('save');
                    if (save?.markDirty) save.markDirty();
                }
            }
        },
    }));
    return { left, right, lines };
}

function buildDoneDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    return {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Molly', portrait: MOLLY_PORTRAIT },
        lines: [
            { side: 'right', text: t('npc.family.mollyQuest.questDone', { name: playerName }), end: true },
        ],
    };
}

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[Molly] DialogueSystem not available');
        return;
    }

    if (dialogueState === 'idle') {
        const config = buildWelcomeDialogue();
        config.onEnd = () => { dialogueState = 'intro_done'; };
        dlg.start(config);
        return;
    }

    if (dinnerQuest === 'active') {
        dlg.start(buildDeliveryDialogue());
        return;
    }

    if (dinnerQuest === 'completed') {
        dlg.start(buildDoneDialogue());
        return;
    }

    if (followupState === 'pending') {
        dlg.start(buildReofferDialogue());
        return;
    }

    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    dlg.start({
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Molly', portrait: MOLLY_PORTRAIT },
        lines: [
            { side: 'right', text: t('npc.family.mollyQuest.repeat', { name: playerName }), end: true },
        ],
    });
}

// ─── Save / Load ────────────────────────────────────────────────────────────

function getQuestState() {
    return { dialogue: dialogueState, dinnerQuest, dinnerRecipe, followupState };
}

function setQuestState(data) {
    if (!data) return;
    if (typeof data === 'string') { dialogueState = data; return; }
    if (data.dialogue) dialogueState = data.dialogue;
    if (data.dinnerQuest) dinnerQuest = data.dinnerQuest;
    if (data.dinnerRecipe) dinnerRecipe = data.dinnerRecipe;
    if (data.followupState) followupState = data.followupState;
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
    getIngredientProgress,
};

registerSystem('npcMolly', mollyAPI);

register();

export default mollyAPI;
