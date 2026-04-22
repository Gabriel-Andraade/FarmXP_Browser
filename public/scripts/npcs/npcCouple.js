/**
 * @file npcCouple.js - NPC Couple (Mary e Noah), moradores da cidade
 * @description Registra o casal Mary + Noah na cidade com sprite idle e hitbox.
 * Diálogo de introdução envolve Mary, Noah e Jeremy.
 * Desaparece às 19:00 e reaparece às 6:10.
 * @module NpcCouple
 */

import { getSystem, registerSystem } from '../gameState.js';
import { i18n } from '../i18n/i18n.js';
import { WeatherSystem } from '../weather.js';
import { camera } from '../thePlayer/cameraSystem.js';
import { logger } from '../logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const COUPLE = {
    id: 'couple',
    name: 'Mary & Noah',
    x: 1300,
    y: 587,
    width: 55,
    height: 55,
    sprite: 'assets/character/couple/couple_idle.png',
    map: 'city',
    interactRadius: 60,
};

// Sprites individuais para diálogo
const COUPLE_DIALOG_00 = 'assets/character/couple/couple_dialog_00.png';   // ambos juntos
const COUPLE_DIALOG_01 = 'assets/character/couple/couple_dialog_01.png';
const MARY_DIALOG_00 = 'assets/character/mary/mary_dialog_00.png';
const MARY_DIALOG_01 = 'assets/character/mary/mary_dialog_01.png';
const MARY_DIALOG_02 = 'assets/character/mary/mary_dialog_02.png';
const NOAH_DIALOG_00 = 'assets/character/noah/noah_dialog_00.png';
const NOAH_DIALOG_01 = 'assets/character/noah/noah_dialog_01.png';
const JEREMY_DIALOG_00 = 'assets/character/jeremy/jeremy_dialog_00.png';
const JEREMY_DIALOG_01 = 'assets/character/jeremy/jeremy_dialog_01.png';

const NIGHT_HOUR = 19;
const MORNING_HOUR = 6;
const MORNING_MINUTE = 10;

// ─── State ──────────────────────────────────────────────────────────────────

let isVisible = true;
let pendingChange = null; // 'show' | 'hide' | null

/** 'idle' | 'intro_done' */
let dialogueState = 'idle';

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
    return camera.isInViewport(COUPLE.x, COUPLE.y, COUPLE.width, COUPLE.height);
}

function showNpc() {
    if (isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.addNpc({ ...COUPLE, onInteract });
    isVisible = true;
    pendingChange = null;
    logger.info('[Couple] NPC appeared (morning)');
}

function hideNpc() {
    if (!isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.removeNpc(COUPLE.id);
    isVisible = false;
    pendingChange = null;
    logger.info('[Couple] NPC disappeared (night)');
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

function getGreeting() {
    const { hour } = getCurrentTime();
    return hour < 12
        ? t('npc.couple.greetMorning')
        : t('npc.couple.greetAfternoon');
}

// Ajudante para trocar speaker e portrait no diálogo
function makeSpeakerSwap(config, name, portrait) {
    return () => {
        config.right.name = name;
        const speakerEl = document.querySelector('.dlg-speaker');
        if (speakerEl) speakerEl.textContent = name;
        // portrait change is done via setPortrait in the line definition
    };
}

// ─── Dialogue builder ─────────────────────────────────────────────────────

function buildFirstDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const greeting = getGreeting();
    const K = 'npc.couple';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Mary & Noah', portrait: COUPLE_DIALOG_00 },
        lines: [],
    };

    const lines = config.lines;
    const swapToCouple = makeSpeakerSwap(config, 'Mary & Noah', COUPLE_DIALOG_00);
    const swapToMary = makeSpeakerSwap(config, 'Mary', MARY_DIALOG_00);
    const swapToNoah = makeSpeakerSwap(config, 'Noah', NOAH_DIALOG_00);
    const swapToJeremy = makeSpeakerSwap(config, 'Jeremy', JEREMY_DIALOG_00);

    // ---- Abertura: Mary e Noah brincando, Jeremy reclama ----
    // Mary: "para bobo!!! hoje eu tô de folga"
    lines.push({
        side: 'right',
        text: t(`${K}.maryTease`),
        setPortrait: { side: 'right', src: COUPLE_DIALOG_00 }, // usa casal, mas é Mary falando
        action: swapToMary, // muda nome para Mary
    });

    // Noah: "ué e essa roupa de escritorio?"
    lines.push({
        side: 'right',
        text: t(`${K}.noahReply`),
        setPortrait: { side: 'right', src: COUPLE_DIALOG_00 },
        action: swapToNoah,
    });

    // Mary: "é pro cosplay! já já chega a peruca."
    lines.push({
        side: 'right',
        text: t(`${K}.maryCosplay`),
        setPortrait: { side: 'right', src: MARY_DIALOG_01 },
        action: swapToMary,
    });

    // Noah: "aaaha, e o outro ali já vai tarde trabalhar *olha para Jeremy*"
    lines.push({
        side: 'right',
        text: t(`${K}.noahJeremyLook`),
        setPortrait: { side: 'right', src: NOAH_DIALOG_00 },
        action: swapToNoah,
    });

    // Jeremy: "e tenho culpa que não chega o taxi?"
    lines.push({
        side: 'right',
        text: t(`${K}.jeremyTaxi`),
        setPortrait: { side: 'right', src: JEREMY_DIALOG_00 },
        action: swapToJeremy,
    });

    // Mary & Noah (juntos): "sim"
    lines.push({
        side: 'right',
        text: t(`${K}.coupleYes`),
        setPortrait: { side: 'right', src: COUPLE_DIALOG_01 },
        action: swapToCouple,
    });

    // Jeremy: "*murmura*"
    lines.push({
        side: 'right',
        text: t(`${K}.jeremyMurmur`),
        setPortrait: { side: 'right', src: JEREMY_DIALOG_01 },
        action: swapToJeremy,
    });

    // Mary: "*nota (nome do player)* oi?"
    lines.push({
        side: 'right',
        text: t(`${K}.maryNotice`, { name: playerName }),
        setPortrait: { side: 'right', src: MARY_DIALOG_00 },
        action: swapToMary,
    });

    // Noah: "opa! boa tarde!" (ou bom dia)
    lines.push({
        side: 'right',
        text: t(`${K}.noahGreet`, { greeting }),
        setPortrait: { side: 'right', src: NOAH_DIALOG_00 },
        action: swapToNoah,
    });

    // ---- Escolha inicial ----
    const choiceLine = {
        side: 'left',
        text: '',
        type: 'choice',
        options: [
            { text: t(`${K}.choiceHello`), value: 'hello', next: -1 },
            { text: t(`${K}.choiceCosplay`), value: 'cosplay', next: -1 },
            { text: t(`${K}.choiceWave`), value: 'wave', end: true },
        ],
    };
    lines.push(choiceLine);

    // ---- Branch "acenar e sair" ----
    const waveIdx = lines.length;
    lines.push({
        side: 'left',
        text: t(`${K}.playerWave`),
        thought: true,
        end: true,
    });

    // ---- Branch "olá" ----
    const helloIdx = lines.length;
    // Casal responde "opa!"
    lines.push({
        side: 'right',
        text: t(`${K}.coupleOpa`),
        setPortrait: { side: 'right', src: COUPLE_DIALOG_01 },
        action: swapToCouple,
    });

    // Noah pergunta nome
    const newHereKey = charId === 'stella' ? `${K}.newHereF` :
                      (charId === 'ben' || charId === 'graham') ? `${K}.newHereM` :
                      `${K}.newHereF`;
    lines.push({
        side: 'right',
        text: t(newHereKey, { name: playerName }),
        setPortrait: { side: 'right', src: NOAH_DIALOG_01 },
        action: swapToNoah,
    });

    // Player se apresenta (específico por personagem)
    const introKey = {
        stella: `${K}.introStella`,
        graham: `${K}.introGraham`,
        ben: `${K}.introBen`,
    }[charId] || `${K}.introStella`;
    lines.push({ side: 'left', text: t(introKey) });

    // Mary: "Gilbert?"
    lines.push({
        side: 'right',
        text: t(`${K}.maryGilbert`),
        setPortrait: { side: 'right', src: MARY_DIALOG_01 },
        action: swapToMary,
    });

    // Player: "sim"
    lines.push({ side: 'left', text: t(`${K}.playerYes`) });

    // Noah: "ah... é mesmo, infelizmente ele não está entre nós."
    lines.push({
        side: 'right',
        text: t(`${K}.noahCondolence`),
        setPortrait: { side: 'right', src: NOAH_DIALOG_01 },
        action: swapToNoah,
    });

    // Mary: "hmmm, agora acho que não vou ter mais um avaliador de cosplay...."
    lines.push({
        side: 'right',
        text: t(`${K}.maryCosplayJudge`),
        setPortrait: { side: 'right', src: MARY_DIALOG_02 },
        action: swapToMary,
    });

    // Noah: "verdade... ele sempre dava uma nota"
    lines.push({
        side: 'right',
        text: t(`${K}.noahNote`),
        setPortrait: { side: 'right', src: NOAH_DIALOG_00 },
        action: swapToNoah,
    });

    // Player pergunta "cosplay?" (liga a branch olá com a branch cosplay)
    lines.push({ side: 'left', text: t(`${K}.choiceCosplay`) });

    // Pula para a parte do cosplay (compartilhada)
    const cosplaySharedIdx = lines.length;

    // ---- Branch "cosplay?" (direto ou após introdução) ----
    // Se escolheu "cosplay?" na primeira escolha, vem direto para cá.
    // Se veio pelo "olá", também chega aqui.

    // Mary explica cosplay
    lines.push({
        side: 'right',
        text: t(`${K}.maryCosplayExplain`),
        setPortrait: { side: 'right', src: MARY_DIALOG_02 },
        action: swapToMary,
    });

    // Mary se apresenta
    lines.push({
        side: 'right',
        text: t(`${K}.maryIntro`),
        setPortrait: { side: 'right', src: MARY_DIALOG_01 },
        action: swapToMary,
    });

    // Noah se apresenta
    lines.push({
        side: 'right',
        text: t(`${K}.noahIntro`),
        setPortrait: { side: 'right', src: NOAH_DIALOG_00 },
        action: swapToNoah,
    });

    // Mary elogia Noah
    lines.push({
        side: 'right',
        text: t(`${K}.maryPraise`),
        setPortrait: { side: 'right', src: MARY_DIALOG_00 },
        action: swapToMary,
    });

    // Noah retribui
    lines.push({
        side: 'right',
        text: t(`${K}.noahPraise`),
        setPortrait: { side: 'right', src: NOAH_DIALOG_00 },
        action: swapToNoah,
    });

    // Risos tímidos do casal
    lines.push({
        side: 'right',
        text: t(`${K}.coupleLaugh`),
        setPortrait: { side: 'right', src: COUPLE_DIALOG_00 },
        action: swapToCouple,
    });

    // Jeremy reclama (varia por personagem)
    const jeremyComplainKey = {
        stella: `${K}.jeremyComplainF`,
        ben: `${K}.jeremyComplainM`,
        graham: `${K}.jeremyComplainM`,
    }[charId] || `${K}.jeremyComplainF`;
    lines.push({
        side: 'right',
        text: t(jeremyComplainKey),
        setPortrait: { side: 'right', src: JEREMY_DIALOG_01 },
        action: swapToJeremy,
    });

    // Player se vira para Jeremy
    lines.push({ side: 'left', text: t(`${K}.playerTurn`), thought: true });

    // Reação do player — depende de ter interagido com Jeremy antes
    const jeremySys = getSystem('npcJeremy');
    const jeremyBefore = jeremySys?.getQuestState?.()?.dialogue === 'rejected';

    if (jeremyBefore) {
        // Reações específicas por personagem (já foi ignorado antes)
        const jeremyReactionKey = {
            stella: `${K}.playerReactionJeremyStella`,
            ben: `${K}.playerReactionJeremyBen`,
            graham: `${K}.playerReactionJeremyGraham`,
        }[charId] || `${K}.playerReactionJeremyStella`;
        // Graham ignora — fala vazia, pula a linha
        if (charId !== 'graham') {
            lines.push({ side: 'left', text: t(jeremyReactionKey) });
        }
    } else {
        // Primeira vez vendo Jeremy — todos dizem "ah oi"
        lines.push({ side: 'left', text: t(`${K}.playerReactionJeremyNew`) });
    }

    // Jeremy se apresenta
    lines.push({
        side: 'right',
        text: t(`${K}.jeremyIntro`),
        setPortrait: { side: 'right', src: JEREMY_DIALOG_00 },
        action: swapToJeremy,
    });

    // Player responde (Graham pula direto, sem fala)
    if (charId !== 'graham') {
        const responseKey = {
            stella: `${K}.playerResponseStella`,
            ben: `${K}.playerResponseBen`,
        }[charId] || `${K}.playerResponseStella`;
        lines.push({ side: 'left', text: t(responseKey) });
    }

    // Noah: "liga não! ele é todo frustradinho mesmo."
    lines.push({
        side: 'right',
        text: t(`${K}.noahDismiss`),
        setPortrait: { side: 'right', src: NOAH_DIALOG_01 },
        action: swapToNoah,
    });

    // Jeremy: "ainda te dou um processo"
    lines.push({
        side: 'right',
        text: t(`${K}.jeremyLawsuit`),
        setPortrait: { side: 'right', src: JEREMY_DIALOG_00 },
        action: swapToJeremy,
    });

    // Mary: "essa já é a quinta vez do dia que disse que vai processa-lo."
    lines.push({
        side: 'right',
        text: t(`${K}.maryFifthTime`),
        setPortrait: { side: 'right', src: MARY_DIALOG_00 },
        action: swapToMary,
    });

    // Noah explica parentesco + convite
    lines.push({
        side: 'right',
        text: t(`${K}.noahExplain`),
        setPortrait: { side: 'right', src: NOAH_DIALOG_00 },
        action: swapToNoah,
    });
    lines.push({
        side: 'right',
        text: t(`${K}.noahInvite`),
        setPortrait: { side: 'right', src: NOAH_DIALOG_01 },
        action: swapToNoah,
    });

    // Mary: "sim!! posso preparar algo para gente!!!"
    lines.push({
        side: 'right',
        text: t(`${K}.maryCook`),
        setPortrait: { side: 'right', src: MARY_DIALOG_01 },
        action: swapToMary,
    });

    // Noah: "a gente prepara gata!"
    lines.push({
        side: 'right',
        text: t(`${K}.noahWeCook`),
        setPortrait: { side: 'right', src: NOAH_DIALOG_00 },
        action: swapToNoah,
    });

    // Mary: "*ri timidamente* para bobinho!"
    lines.push({
        side: 'right',
        text: t(`${K}.maryBlush`),
        setPortrait: { side: 'right', src: MARY_DIALOG_00 },
        action: swapToMary,
    });

    // Jeremy: "vem logo taxista....."
    lines.push({
        side: 'right',
        text: t(`${K}.jeremyTaxiFinal`),
        setPortrait: { side: 'right', src: JEREMY_DIALOG_00 },
        end: true,
        action: () => { swapToJeremy(); dialogueState = 'intro_done'; },
    });

    // ---- Ajustar índices das escolhas ----
    choiceLine.options[0].next = helloIdx;      // "olá"
    choiceLine.options[1].next = cosplaySharedIdx; // "cosplay?"
    choiceLine.options[2].next = waveIdx;       // "acenar e sair"

    // Se a pessoa escolheu "olá", depois da parte do luto, deve pular para a explicação do cosplay
    // Já está encadeado: após "noahNote" o fluxo continua naturalmente para "maryCosplayExplain"

    return config;
}

// Diálogo pós-intro: Mary & Noah cumprimentam, Jeremy acena, player reage por personagem
function buildFreeDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.couple';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Mary & Noah', portrait: COUPLE_DIALOG_00 },
        lines: [],
    };

    const swapToCouple = makeSpeakerSwap(config, 'Mary & Noah');
    const swapToJeremy = makeSpeakerSwap(config, 'Jeremy');

    // Mary & Noah cumprimentam de novo
    config.lines.push({
        side: 'right',
        text: t(`${K}.freeGreet`),
        setPortrait: { side: 'right', src: COUPLE_DIALOG_00 },
    });

    // Jeremy acena com a mão
    config.lines.push({
        side: 'right',
        text: t(`${K}.jeremyWave`),
        setPortrait: { side: 'right', src: JEREMY_DIALOG_00 },
        action: swapToJeremy,
    });

    // Reação do player conforme personagem
    const reactionKey = {
        stella: `${K}.postReactionStella`,
        graham: `${K}.postReactionGraham`,
        ben: `${K}.postReactionBen`,
    }[charId] || `${K}.postReactionStella`;

    config.lines.push({
        side: 'left',
        text: t(reactionKey),
        end: true,
    });

    return config;
}

// ─── Interaction handler ────────────────────────────────────────────────────

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[Couple] DialogueSystem not available');
        return;
    }

    if (dialogueState === 'idle') {
        dlg.start(buildFirstDialogue());
    } else {
        dlg.start(buildFreeDialogue());
    }
}

// ─── Save / Load ────────────────────────────────────────────────────────────

function getQuestState() {
    return { dialogue: dialogueState };
}

function setQuestState(data) {
    if (!data) return;
    if (typeof data === 'string') {
        dialogueState = data;
        return;
    }
    if (data.dialogue) dialogueState = data.dialogue;
}

// ─── Register NPC ───────────────────────────────────────────────────────────

function register() {
    const npcSys = getSystem('npc');
    if (!npcSys) {
        logger.warn('[Couple] NpcSystem not available, retrying...');
        setTimeout(register, 500);
        return;
    }

    if (shouldBeVisible()) {
        npcSys.addNpc({ ...COUPLE, onInteract });
        isVisible = true;
    } else {
        isVisible = false;
    }

    setInterval(updateVisibility, 2000);
    setInterval(checkPendingChange, 500);

    logger.info('[Couple] NPC registered in city');
}

// ─── Public API ─────────────────────────────────────────────────────────────

const coupleAPI = {
    register,
    getQuestState,
    setQuestState,
};

registerSystem('npcCouple', coupleAPI);

register();

export default coupleAPI;