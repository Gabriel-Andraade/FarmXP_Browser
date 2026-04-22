/**
 * @file npcJuan.js - NPC Juan, morador da cidade
 * @description Registra o NPC Juan na cidade com sprite idle e hitbox.
 * Desaparece às 19:00 e reaparece às 6:10.
 * @module NpcJuan
 */

import { getSystem, registerSystem } from '../gameState.js';
import { WeatherSystem } from '../weather.js';
import { camera } from '../thePlayer/cameraSystem.js';
import { logger } from '../logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const JUAN = {
    id: 'juan',
    name: 'Juan',
    x: 493,
    y: 420,
    width: 55,
    height: 55,
    sprite: 'assets/character/juan/juan_idle_00.png',
    map: 'city',
    interactRadius: 60,
};

const NIGHT_HOUR = 19;
const MORNING_HOUR = 6;
const MORNING_MINUTE = 10;

// ─── State ──────────────────────────────────────────────────────────────────

let isVisible = true;
let pendingChange = null; // 'show' | 'hide' | null

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    // Visible from 6:10 to 18:59
    if (hour > MORNING_HOUR && hour < NIGHT_HOUR) return true;
    if (hour === MORNING_HOUR && minute >= MORNING_MINUTE) return true;
    return false;
}

function isNpcOnScreen() {
    if (typeof camera?.isInViewport !== 'function') return false;
    return camera.isInViewport(JUAN.x, JUAN.y, JUAN.width, JUAN.height);
}

function showNpc() {
    if (isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.addNpc({ ...JUAN, onInteract });
    isVisible = true;
    pendingChange = null;
    logger.info('[Juan] NPC appeared (morning)');
}

function hideNpc() {
    if (!isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.removeNpc(JUAN.id);
    isVisible = false;
    pendingChange = null;
    logger.info('[Juan] NPC disappeared (night)');
}

function updateVisibility() {
    const wantVisible = shouldBeVisible();
    if (wantVisible === isVisible) {
        pendingChange = null;
        return;
    }
    // Defer change if NPC is on screen to avoid pop-in/pop-out
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

// ─── Interaction handler ────────────────────────────────────────────────────

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[Juan] DialogueSystem not available');
        return;
    }

    // Placeholder — dialogue will be added later
    logger.info('[Juan] Interaction triggered (no dialogue configured yet)');
}

// ─── Register NPC ───────────────────────────────────────────────────────────

function register() {
    const npcSys = getSystem('npc');
    if (!npcSys) {
        logger.warn('[Juan] NpcSystem not available, retrying...');
        setTimeout(register, 500);
        return;
    }

    // Only add if it's daytime
    if (shouldBeVisible()) {
        npcSys.addNpc({ ...JUAN, onInteract });
        isVisible = true;
    } else {
        isVisible = false;
    }

    setInterval(updateVisibility, 2000);
    setInterval(checkPendingChange, 500);

    logger.info('[Juan] NPC registered in city');
}

// ─── Public API ─────────────────────────────────────────────────────────────

const juanAPI = {
    register,
};

registerSystem('npcJuan', juanAPI);

register();

export default juanAPI;
