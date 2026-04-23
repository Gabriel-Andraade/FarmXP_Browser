/**
 * @file npcBru.js - NPC Bru, moradora da cidade
 * @description Registra a NPC Bru na cidade com sprite idle e hitbox.
 * Desaparece às 19:00 e reaparece às 6:10.
 * Diálogo de introdução envolve Bru e Juan.
 * @module NpcBru
 */

import { getSystem, registerSystem } from '../gameState.js';
import { i18n } from '../i18n/i18n.js';
import { WeatherSystem } from '../weather.js';
import { camera } from '../thePlayer/cameraSystem.js';
import { logger } from '../logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const BRU = {
    id: 'bru',
    name: 'Bru',
    x: 428,
    y: 484,
    width: 55,
    height: 52,
    sprite: 'assets/character/bru/bru_idle_00.png',
    map: 'city',
    interactRadius: 60,
};

const BRU_DIALOG_00 = 'assets/character/bru/bru_dialog_00.png';
const BRU_DIALOG_01 = 'assets/character/bru/bru_dialog_01.png';
const JUAN_DIALOG_00 = 'assets/character/juan/Juan_dialog_00.png';
const JUAN_DIALOG_01 = 'assets/character/juan/juan_dialog_01.png';

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
    return camera.isInViewport(BRU.x, BRU.y, BRU.width, BRU.height);
}

function showNpc() {
    if (isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.addNpc({ ...BRU, onInteract });
    isVisible = true;
    pendingChange = null;
    logger.info('[Bru] NPC appeared (morning)');
}

function hideNpc() {
    if (!isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.removeNpc(BRU.id);
    isVisible = false;
    pendingChange = null;
    logger.info('[Bru] NPC disappeared (night)');
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
        ? t('npc.bruJuan.greetMorning')
        : t('npc.bruJuan.greetAfternoon');
}

// ─── Right-side speaker swap helper ────────────────────────────────────────
// The dialogue system sets speaker name from config BEFORE running action(),
// but all happens in the same JS frame (no paint between), so updating both
// config.right.name and the DOM in action() works flicker-free.

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
    const K = 'npc.bruJuan';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Bru', portrait: BRU_DIALOG_01 },
        lines: [],
    };

    const lines = config.lines;
    const swapToBru = makeSpeakerSwap(config, 'Bru');
    const swapToJuan = makeSpeakerSwap(config, 'Juan');

    // 0 — Bru rant (dialog_01)
    lines.push({ side: 'right', text: t(`${K}.bruRant`) });

    // 1 — Choice: approach or leave
    const choiceLine = {
        side: 'left',
        text: '',
        type: 'choice',
        options: [
            { text: t(`${K}.choiceApproach`), value: 'approach', next: -1 },
            { text: t(`${K}.choiceLeave`), value: 'leave', end: true },
        ],
    };
    lines.push(choiceLine);

    // 2 — Player approach (thought, char-specific)
    const approachIdx = lines.length;
    const approachKey = {
        stella: `${K}.approachStella`,
        graham: `${K}.approachGraham`,
        ben: `${K}.approachBen`,
    }[charId] || `${K}.approachStella`;
    lines.push({ side: 'left', text: t(approachKey), thought: true });

    // 3 — Bru reacts (switch to dialog_00): "quem é tu?"
    lines.push({
        side: 'right',
        text: t(`${K}.bruWho`, { name: playerName }),
        setPortrait: { side: 'right', src: BRU_DIALOG_00 },
    });

    // 4 — Player introduction (char-specific)
    const introKey = {
        stella: `${K}.introStella`,
        graham: `${K}.introGraham`,
        ben: `${K}.introBen`,
    }[charId] || `${K}.introStella`;
    lines.push({ side: 'left', text: t(introKey) });

    // 5+ — Bru response (switch to dialog_01, char-specific)
    if (charId === 'ben') {
        // Ben gets a shorter response
        lines.push({
            side: 'right',
            text: t(`${K}.bruGreetBen`),
            setPortrait: { side: 'right', src: BRU_DIALOG_01 },
        });
    } else {
        // Stella / Graham: two lines
        lines.push({
            side: 'right',
            text: t(`${K}.bruGreetDefault`),
            setPortrait: { side: 'right', src: BRU_DIALOG_01 },
        });
        lines.push({ side: 'right', text: t(`${K}.bruTaxiFar`) });
    }

    // — Player: "quer ajuda com algo?"
    lines.push({ side: 'left', text: t(`${K}.playerHelp`) });

    // — Bru warning (dialog_01)
    lines.push({ side: 'right', text: t(`${K}.bruWarning`) });

    // — Player looks (thought)
    lines.push({ side: 'left', text: t(`${K}.playerLooks`), thought: true });

    // — Juan enters (switch portrait to Juan dialog_01)
    lines.push({
        side: 'right',
        text: t(`${K}.juanIntro`),
        setPortrait: { side: 'right', src: JUAN_DIALOG_01 },
        action: swapToJuan,
    });

    // — Bru interrupts (switch back to Bru dialog_01)
    lines.push({
        side: 'right',
        text: t(`${K}.bruInterrupt`),
        setPortrait: { side: 'right', src: BRU_DIALOG_01 },
        action: swapToBru,
    });

    // — Juan corrects (switch to Juan dialog_00)
    lines.push({
        side: 'right',
        text: t(`${K}.juanCorrect`),
        setPortrait: { side: 'right', src: JUAN_DIALOG_00 },
        action: swapToJuan,
    });

    // — Player responds to Juan (char-specific)
    const toJuanKey = {
        stella: `${K}.toJuanStella`,
        graham: `${K}.toJuanGraham`,
        ben: `${K}.toJuanBen`,
    }[charId] || `${K}.toJuanStella`;
    lines.push({ side: 'left', text: t(toJuanKey) });

    // — Juan pleased (dialog_00)
    lines.push({ side: 'right', text: t(`${K}.juanLunch`) });

    // — Bru interferes (switch to Bru dialog_01)
    lines.push({
        side: 'right',
        text: t(`${K}.bruCook`),
        setPortrait: { side: 'right', src: BRU_DIALOG_01 },
        action: swapToBru,
    });

    // — Juan responds (switch to Juan dialog_01)
    lines.push({
        side: 'right',
        text: t(`${K}.juanIgnore`),
        setPortrait: { side: 'right', src: JUAN_DIALOG_01 },
        action: swapToJuan,
    });

    // — Player farewell (char-specific)
    if (charId === 'ben') {
        // Ben's sequence: looks back and forth between Bru and Juan
        lines.push({ side: 'left', text: t(`${K}.benLookThought`), thought: true });

        // Alternating portrait swaps — player clicks through each "..."
        lines.push({
            side: 'right',
            text: t(`${K}.benLookBru`),
            setPortrait: { side: 'right', src: BRU_DIALOG_01 },
            action: swapToBru,
        });
        lines.push({
            side: 'right',
            text: t(`${K}.benLookJuan`),
            setPortrait: { side: 'right', src: JUAN_DIALOG_00 },
            action: swapToJuan,
        });
        lines.push({
            side: 'right',
            text: t(`${K}.benLookBru`),
            setPortrait: { side: 'right', src: BRU_DIALOG_01 },
            action: swapToBru,
        });
        lines.push({
            side: 'right',
            text: t(`${K}.benLookJuan`),
            setPortrait: { side: 'right', src: JUAN_DIALOG_00 },
            action: swapToJuan,
        });
        lines.push({
            side: 'right',
            text: t(`${K}.benLookBru`),
            setPortrait: { side: 'right', src: BRU_DIALOG_01 },
            action: swapToBru,
        });

        lines.push({
            side: 'left',
            text: t(`${K}.benFarewell`, { greeting: getGreeting() }),
            end: true,
            action: () => { dialogueState = 'intro_done'; },
        });
    } else if (charId === 'graham') {
        lines.push({
            side: 'left',
            text: t(`${K}.farewellGraham`),
            end: true,
            action: () => { dialogueState = 'intro_done'; },
        });
    } else {
        // Stella
        lines.push({
            side: 'left',
            text: t(`${K}.farewellStella`),
            end: true,
            action: () => { dialogueState = 'intro_done'; },
        });
    }

    // Patch choice → approach index
    choiceLine.options[0].next = approachIdx;

    return config;
}

// ─── Interaction handler ────────────────────────────────────────────────────

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[Bru] DialogueSystem not available');
        return;
    }

    if (dialogueState === 'idle') {
        dlg.start(buildFirstDialogue());
    } else {
        // After intro is done, no further dialogue for now
        logger.info('[Bru] Intro already done, no further dialogue yet');
    }
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

// ─── Register NPC ───────────────────────────────────────────────────────────

function register() {
    const npcSys = getSystem('npc');
    if (!npcSys) {
        logger.warn('[Bru] NpcSystem not available, retrying...');
        setTimeout(register, 500);
        return;
    }

    if (shouldBeVisible()) {
        npcSys.addNpc({ ...BRU, onInteract });
        isVisible = true;
    } else {
        isVisible = false;
    }

    setInterval(updateVisibility, 2000);
    setInterval(checkPendingChange, 500);

    logger.info('[Bru] NPC registered in city');
}

// ─── Public API ─────────────────────────────────────────────────────────────

const bruAPI = {
    register,
    getQuestState,
    setQuestState,
};

registerSystem('npcBru', bruAPI);

register();

export default bruAPI;
