/**
 * @file npcJeremy.js - NPC Jeremy, um dos gêmeos
 * @description Registra o NPC Jeremy na cidade com sprite idle e hitbox.
 * Desaparece às 19:00 e reaparece às 6:10.
 * @module NpcJeremy
 */

import { getSystem, registerSystem } from '../gameState.js';
import { i18n } from '../i18n/i18n.js';
import { WeatherSystem } from '../weather.js';
import { camera } from '../thePlayer/cameraSystem.js';
import { logger } from '../logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const JEREMY = {
    id: 'jeremy',
    name: 'Jeremy',
    x: 1253,
    y: 629,
    width: 45,
    height: 50,
    sprite: 'assets/character/jeremy/jeremy_idle_00.png',
    map: 'city',
    interactRadius: 60,
};

const JEREMY_DIALOG_00 = 'assets/character/jeremy/jeremy_dialog_00.png';
const JEREMY_DIALOG_01 = 'assets/character/jeremy/jeremy_dialog_01.png';

const NIGHT_HOUR = 19;
const MORNING_HOUR = 6;
const MORNING_MINUTE = 10;

// ─── State ──────────────────────────────────────────────────────────────────

let isVisible = true;
let pendingChange = null; // 'show' | 'hide' | null

/** Estado do diálogo: 'idle' | 'rejected' (já foi ignorado uma vez) */
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
    return camera.isInViewport(JEREMY.x, JEREMY.y, JEREMY.width, JEREMY.height);
}

function showNpc() {
    if (isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.addNpc({ ...JEREMY, onInteract });
    isVisible = true;
    pendingChange = null;
    logger.info('[Jeremy] NPC appeared (morning)');
}

function hideNpc() {
    if (!isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.removeNpc(JEREMY.id);
    isVisible = false;
    pendingChange = null;
    logger.info('[Jeremy] NPC disappeared (night)');
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

// ─── Dialogue builders ─────────────────────────────────────────────────────

/** Diálogo inicial (estado 'idle') */
function buildIdleDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.jeremy';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Jeremy', portrait: JEREMY_DIALOG_00 },
        lines: [],
    };

    // Tentativa de diálogo do player (específica por personagem)
    const tryKey = {
        stella: `${K}.tryStella`,
        graham: `${K}.tryGraham`,
        ben: `${K}.tryBen`,
    }[charId] || `${K}.tryStella`;
    config.lines.push({ side: 'left', text: t(tryKey) });

    // Jeremy encara (dialog_01)
    config.lines.push({
        side: 'right',
        text: t(`${K}.stare`),
        setPortrait: { side: 'right', src: JEREMY_DIALOG_01 },
    });

    // Jeremy ignora e volta pro celular (dialog_00) — marca como rejeitado
    config.lines.push({
        side: 'right',
        text: t(`${K}.ignore`),
        setPortrait: { side: 'right', src: JEREMY_DIALOG_00 },
        end: true,
        action: () => {
            dialogueState = 'rejected';
            try { getSystem('save')?.markDirty?.(); } catch (_) { /* ignore */ }
        },
    });

    return config;
}

/** Diálogo pós-rejeição: Jeremy acena, player reage por personagem */
function buildPostEventDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.jeremy';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Jeremy', portrait: JEREMY_DIALOG_00 },
        lines: [],
    };

    // Jeremy acena com a mão
    config.lines.push({
        side: 'right',
        text: t(`${K}.wave`),
        setPortrait: { side: 'right', src: JEREMY_DIALOG_00 },
    });

    // Reação do player (Stella ignora, Graham acena cabeça, Ben devolve aceno)
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
        logger.warn('[Jeremy] DialogueSystem not available');
        return;
    }

    let config;
    switch (dialogueState) {
        case 'rejected':
            config = buildPostEventDialogue();
            break;
        case 'idle':
        default:
            config = buildIdleDialogue();
            break;
    }

    dlg.start(config);
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
        logger.warn('[Jeremy] NpcSystem not available, retrying...');
        setTimeout(register, 500);
        return;
    }

    if (shouldBeVisible()) {
        npcSys.addNpc({ ...JEREMY, onInteract });
        isVisible = true;
    } else {
        isVisible = false;
    }

    setInterval(updateVisibility, 2000);
    setInterval(checkPendingChange, 500);

    logger.info('[Jeremy] NPC registered in city');
}

// ─── Public API ─────────────────────────────────────────────────────────────

const jeremyAPI = {
    register,
    getQuestState,
    setQuestState,
};

registerSystem('npcJeremy', jeremyAPI);

register();

export default jeremyAPI;