/**
 * @file questSystem.js - Sistema de quests do jogo
 * @description Gerencia quests, exibe painel de missões, balões de fala,
 * hitbox/interação da picape e item de bateria no armazém da casa (storage).
 * @module QuestSystem
 */

import { registerSystem, getObject, getSystem } from './gameState.js';
import { collisionSystem } from './collisionSystem.js';
import { t } from './i18n/i18n.js';
import { logger } from './logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const BATTERY_ITEM_ID = 94; // ID do item bateria em item.js

// Pickup truck position (same as mapManager portal)
const PICKUP = {
    x: 2347,
    y: 2280,
    width: 70,
    height: 140,
    hitboxId: 'pickup_truck_hitbox',
};

// ─── Quest definitions ──────────────────────────────────────────────────────

const QUEST_DEFINITIONS = {
    fix_pickup: {
        id: 'fix_pickup',
        icon: '🔧',
        status: 'available', // available | active | completed
    },
};

// ─── State ──────────────────────────────────────────────────────────────────

const quests = {};
let isPanelOpen = false;
let hitboxRegistered = false;

/** Whether the battery has been seeded into the house storage */
let batterySeededInStorage = false;
/** Whether the player is locked near the pickup (repairing) */
let playerLockedForRepair = false;

for (const [id, def] of Object.entries(QUEST_DEFINITIONS)) {
    quests[id] = { ...def };
}

// ─── Pickup hitbox ──────────────────────────────────────────────────────────

export function registerPickupHitbox(force = false) {
    if (hitboxRegistered && !force) return;
    try {
        collisionSystem.addHitbox(
            PICKUP.hitboxId, 'PICKUP_TRUCK',
            PICKUP.x, PICKUP.y,
            PICKUP.width, PICKUP.height
        );
        hitboxRegistered = true;
    } catch (e) {
        logger.warn('[QuestSystem] Falha ao registrar hitbox da picape', e);
    }
}

// ─── Battery in house storage ───────────────────────────────────────────────

/**
 * Seeds the battery into the house storage (armazém da porta).
 * Called once when the game loads and quest is not yet completed.
 */
export function seedBatteryInStorage() {
    if (batterySeededInStorage) return;
    if (isQuestCompleted('fix_pickup')) return;

    const storage = getSystem('storage') || window.storageSystem;
    if (!storage) {
        logger.warn('[QuestSystem] StorageSystem not available yet, will retry battery seeding');
        return;
    }

    // Check if battery is already in storage
    const resourceItems = storage.storage?.resources || [];
    const alreadyInStorage = resourceItems.some(s => s.itemId === BATTERY_ITEM_ID);
    if (alreadyInStorage) {
        batterySeededInStorage = true;
        return;
    }

    // Check if player already has it in inventory
    const inv = getSystem('inventory') || window.inventorySystem;
    if (inv) {
        const inInv = inv.getItemQuantity(BATTERY_ITEM_ID);
        if (inInv > 0) {
            batterySeededInStorage = true;
            return;
        }
    }

    // Add battery to house storage (resources category)
    const added = storage._addToCategory('resources', BATTERY_ITEM_ID, 1);
    if (added) {
        batterySeededInStorage = true;
        logger.info('[QuestSystem] Battery seeded into house storage (armazém)');
    } else {
        logger.warn('[QuestSystem] Failed to seed battery into storage');
    }
}

/**
 * Checks if the player has the battery in their inventory.
 */
function playerHasBattery() {
    const inv = getSystem('inventory') || window.inventorySystem;
    if (!inv) return false;
    return inv.getItemQuantity(BATTERY_ITEM_ID) > 0;
}

/**
 * Removes the battery from the player's inventory.
 */
function removeBatteryFromInventory() {
    const inv = getSystem('inventory') || window.inventorySystem;
    if (!inv) return false;
    return inv.removeItem('resources', BATTERY_ITEM_ID, 1);
}

// ─── Player movement lock ───────────────────────────────────────────────────

function lockPlayerMovement() {
    playerLockedForRepair = true;
    // Set on playerSystem itself — characterModule syncs from playerSystem.isConsuming each frame
    const playerSys = getSystem('player');
    if (playerSys) {
        playerSys.isConsuming = true;
    }
    logger.info('[QuestSystem] Player movement locked for repair');
}

function unlockPlayerMovement() {
    playerLockedForRepair = false;
    const playerSys = getSystem('player');
    if (playerSys) {
        playerSys.isConsuming = false;
    }
    logger.info('[QuestSystem] Player movement unlocked');
}

// ─── Pickup interaction (called from mapManager) ────────────────────────────

/**
 * Handle the E press on the pickup truck.
 * - Not repaired + no battery → speech bubble (need battery)
 * - Not repaired + has battery → use battery, lock player, complete quest
 * - Repaired → allow travel (return true)
 * @returns {boolean} true if travel should proceed
 */
export function handlePickupInteraction() {
    const q = quests.fix_pickup;

    // Already repaired — allow travel
    if (q.status === 'completed') return true;

    // If player is locked for repair, don't allow anything
    if (playerLockedForRepair) return false;

    // Activate quest on first interaction
    if (q.status === 'available') {
        q.status = 'active';
        document.dispatchEvent(new CustomEvent('questUpdated', { detail: { id: 'fix_pickup', status: 'active' } }));
    }

    if (!playerHasBattery()) {
        showSpeechBubble(t('quests.fixPickup.bubbleNoBattery'), 3500);
        return false;
    }

    // Has battery — repair!
    removeBatteryFromInventory();
    lockPlayerMovement();
    showSpeechBubble(t('quests.fixPickup.bubbleRepairing'), 2000);

    setTimeout(() => {
        q.status = 'completed';
        unlockPlayerMovement();
        document.dispatchEvent(new CustomEvent('questUpdated', { detail: { id: 'fix_pickup', status: 'completed' } }));
        showSpeechBubble(t('quests.fixPickup.bubbleRepaired'), 4000);

        // Mark save as dirty
        const save = getSystem('save');
        if (save) save.markDirty();

        logger.info('[QuestSystem] Picape consertada com bateria!');
    }, 2000);

    return false;
}

// ─── Speech bubble ──────────────────────────────────────────────────────────

let bubbleTimeout = null;

export function showSpeechBubble(text, duration = 3000) {
    hideSpeechBubble();

    const bubble = document.createElement('div');
    bubble.id = 'speech-bubble';
    bubble.style.cssText = `
        position: fixed;
        left: 50%; top: 35%;
        transform: translateX(-50%);
        background: #fff;
        color: #333;
        padding: 10px 18px;
        border-radius: 16px;
        font-size: 15px;
        font-family: sans-serif;
        max-width: 280px;
        text-align: center;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        z-index: 8000;
        pointer-events: none;
        animation: bubbleFadeIn 0.3s ease;
    `;

    const arrow = document.createElement('div');
    arrow.style.cssText = `
        position: absolute;
        bottom: -8px; left: 50%;
        transform: translateX(-50%);
        width: 0; height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid #fff;
    `;

    bubble.textContent = text;
    bubble.appendChild(arrow);
    document.body.appendChild(bubble);

    if (!document.getElementById('bubble-keyframes')) {
        const style = document.createElement('style');
        style.id = 'bubble-keyframes';
        style.textContent = `
            @keyframes bubbleFadeIn {
                from { opacity: 0; transform: translateX(-50%) translateY(8px); }
                to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    bubbleTimeout = setTimeout(() => hideSpeechBubble(), duration);
}

export function hideSpeechBubble() {
    if (bubbleTimeout) { clearTimeout(bubbleTimeout); bubbleTimeout = null; }
    const el = document.getElementById('speech-bubble');
    if (el) el.remove();
}

// ─── Quest panel UI ─────────────────────────────────────────────────────────

export function toggleQuestPanel() {
    if (isPanelOpen) closeQuestPanel();
    else openQuestPanel();
}

export function openQuestPanel() {
    closeQuestPanel();
    isPanelOpen = true;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'questsModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const container = document.createElement('div');
    container.className = 'store-container';
    container.style.cssText = 'max-width: 500px; padding: 0;';

    const header = document.createElement('div');
    header.className = 'modal-header';
    const h2 = document.createElement('h2');
    h2.textContent = `📋 ${t('quests.title')}`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => closeQuestPanel());
    header.append(h2, closeBtn);

    const content = document.createElement('div');
    content.style.cssText = 'padding: 16px; max-height: 400px; overflow-y: auto;';

    const questEntries = Object.values(quests);
    if (questEntries.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = t('quests.noQuests');
        empty.style.cssText = 'color: #aaa; text-align: center; padding: 30px;';
        content.appendChild(empty);
    } else {
        for (const q of questEntries) {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(255,255,255,0.08);
                border-radius: 10px;
                padding: 14px;
                margin-bottom: 10px;
                border-left: 4px solid ${q.status === 'completed' ? '#4caf50' : q.status === 'active' ? '#ff9800' : '#888'};
            `;

            const titleRow = document.createElement('div');
            titleRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 6px;';
            const icon = document.createElement('span');
            icon.textContent = q.icon;
            icon.style.fontSize = '20px';
            const title = document.createElement('span');
            title.textContent = t(`quests.fixPickup.title`);
            title.style.cssText = 'font-weight: 600; font-size: 16px; color: #fff;';

            const statusKey = `quests.status.${q.status}`;
            const badge = document.createElement('span');
            badge.textContent = q.status === 'completed' ? '✅' : q.status === 'active' ? '🔶' : '⬜';
            badge.title = t(statusKey);
            badge.style.cssText = 'margin-left: auto; font-size: 14px;';
            titleRow.append(icon, title, badge);

            const desc = document.createElement('p');
            desc.textContent = t(`quests.fixPickup.description`);
            desc.style.cssText = 'color: #ccc; font-size: 13px; margin: 0; line-height: 1.4;';

            const statusText = document.createElement('p');
            statusText.textContent = t(statusKey);
            statusText.style.cssText = `color: ${q.status === 'completed' ? '#4caf50' : q.status === 'active' ? '#ff9800' : '#888'}; font-size: 12px; margin-top: 6px; font-weight: 500;`;

            card.append(titleRow, desc, statusText);
            content.appendChild(card);
        }
    }

    container.append(header, content);
    modal.appendChild(container);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeQuestPanel();
    });

    document.body.appendChild(modal);
}

export function closeQuestPanel() {
    isPanelOpen = false;
    const modal = document.getElementById('questsModal');
    if (modal) modal.remove();
}

// ─── Quest state ────────────────────────────────────────────────────────────

export function getQuest(id) {
    return quests[id] || null;
}

export function setQuestStatus(id, status) {
    if (quests[id]) {
        quests[id].status = status;
        document.dispatchEvent(new CustomEvent('questUpdated', { detail: { id, status } }));
    }
}

export function isQuestCompleted(id) {
    return quests[id]?.status === 'completed';
}

// ─── Save / Load helpers ────────────────────────────────────────────────────

export function getBatteryState() {
    return {
        seededInStorage: batterySeededInStorage,
    };
}

export function setBatteryState(state) {
    if (!state) return;
    batterySeededInStorage = !!state.seededInStorage;

    // Legacy compatibility: if old save had collected/inInventory flags
    if (state.collected && state.inInventory) {
        // Battery was in old "virtual inventory" → add to real inventory
        const inv = getSystem('inventory') || window.inventorySystem;
        if (inv && inv.getItemQuantity(BATTERY_ITEM_ID) === 0) {
            inv.addItem(BATTERY_ITEM_ID, 1);
        }
        batterySeededInStorage = true;
    }
}

// ─── Register system ────────────────────────────────────────────────────────

// Register pickup hitbox on load (farm map is default)
registerPickupHitbox();

// Seed battery into storage after a short delay (wait for storageSystem to init)
setTimeout(() => {
    seedBatteryInStorage();
}, 500);

const questAPI = {
    toggleQuestPanel,
    openQuestPanel,
    closeQuestPanel,
    showSpeechBubble,
    hideSpeechBubble,
    getQuest,
    setQuestStatus,
    isQuestCompleted,
    handlePickupInteraction,
    registerPickupHitbox,
    seedBatteryInStorage,
    getBatteryState,
    setBatteryState,
    quests,
    BATTERY_ITEM_ID,
};

registerSystem('quests', questAPI);
export default questAPI;
