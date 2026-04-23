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
import { getTutorialQuests } from './npcs/tutorialQuests.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const BATTERY_ITEM_ID = 94; // ID do item bateria em item.js
const MILK_BOTTLE_ITEM_ID = 95; // ID da garrafa de leite fresco em item.js

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
let panelRefreshHandler = null;
let hitboxRegistered = false;

/** Whether the battery has been seeded into the house storage */
let batterySeededInStorage = false;
/** Whether the milk bottle has been seeded into the house storage */
let milkBottleSeededInStorage = false;
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
        // Storage ainda não carregou (houseSystem importa depois do questSystem).
        // Agenda nova tentativa; desiste após ~15s.
        seedBatteryInStorage._retries = (seedBatteryInStorage._retries || 0) + 1;
        if (seedBatteryInStorage._retries > 30) {
            logger.warn('[QuestSystem] StorageSystem never became available — battery not seeded');
            return;
        }
        setTimeout(seedBatteryInStorage, 500);
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
    const added = storage.addResource(BATTERY_ITEM_ID, 1);
    if (added) {
        batterySeededInStorage = true;
        logger.info('[QuestSystem] Battery seeded into house storage (armazém)');
    } else {
        logger.warn('[QuestSystem] Failed to seed battery into storage');
    }
}

/**
 * Seeds the fresh milk bottle into the house storage for John's milk quest.
 */
export function seedMilkBottleInStorage() {
    if (milkBottleSeededInStorage) return;

    const storage = getSystem('storage') || window.storageSystem;
    if (!storage) {
        seedMilkBottleInStorage._retries = (seedMilkBottleInStorage._retries || 0) + 1;
        if (seedMilkBottleInStorage._retries > 30) {
            logger.warn('[QuestSystem] StorageSystem never became available — milk bottle not seeded');
            return;
        }
        setTimeout(seedMilkBottleInStorage, 500);
        return;
    }

    const resourceItems = storage.storage?.resources || [];
    const alreadyInStorage = resourceItems.some(s => s.itemId === MILK_BOTTLE_ITEM_ID);
    if (alreadyInStorage) {
        milkBottleSeededInStorage = true;
        return;
    }

    const inv = getSystem('inventory') || window.inventorySystem;
    if (inv) {
        const inInv = inv.getItemQuantity(MILK_BOTTLE_ITEM_ID);
        if (inInv > 0) {
            milkBottleSeededInStorage = true;
            return;
        }
    }

    const added = storage.addResource(MILK_BOTTLE_ITEM_ID, 1);
    if (added) {
        milkBottleSeededInStorage = true;
        logger.info('[QuestSystem] Milk bottle seeded into house storage (armazém)');
    } else {
        logger.warn('[QuestSystem] Failed to seed milk bottle into storage');
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

// ─── Player-thought dialogue (substitui bolhas da picape) ───────────────────

function showPlayerThoughtDialogue(text) {
    const dlg = getSystem('dialogue');
    if (!dlg) return;
    const playerSys = getSystem('player');
    const charId = playerSys?.activeCharacter?.id || 'stella';
    const playerName = { stella: 'Stella', ben: 'Ben', graham: 'Graham' }[charId] || 'Stella';
    const playerPortrait =
        `assets/character/${charId}/dialog_${charId.charAt(0).toUpperCase() + charId.slice(1)}_00.png`;
    dlg.start({
        left: { name: playerName, portrait: playerPortrait },
        lines: [{ side: 'left', text, end: true }],
    });
}

// ─── Pickup interaction (called from mapManager) ────────────────────────────

/**
 * Handle the E press on the pickup truck.
 * - Not repaired + no battery → speech bubble (need battery)
 * - Not repaired + has battery → use battery, lock player, complete quest
 * - Repaired → allow travel (return true)
 * @returns {boolean} true if travel should proceed
 */
let repairTimer = null;

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
        showPlayerThoughtDialogue(t('quests.fixPickup.bubbleNoBattery'));
        return false;
    }

    // Has battery — repair!
    const removed = removeBatteryFromInventory();
    if (!removed) {
        // If removal failed, bail out and don't mark quest as completed
        showPlayerThoughtDialogue(t('quests.fixPickup.bubbleNoBattery'));
        return false;
    }
    
    lockPlayerMovement();
    showSpeechBubble(t('quests.fixPickup.bubbleRepairing'), 2000);

    // Clear any previous timer
    if (repairTimer) {
        clearTimeout(repairTimer);
        repairTimer = null;
    }

    repairTimer = setTimeout(() => {
        repairTimer = null;
        
        // Guard: only complete if quest is still active and player is locked
        if (q.status !== 'active' || !playerLockedForRepair) return;
        
        q.status = 'completed';
        unlockPlayerMovement();
        showPlayerThoughtDialogue(t('quests.fixPickup.bubbleRepaired'));

        // Registry aplica XP, dispara questUpdated e marca save.
        const registry = getSystem('questRegistry');
        if (registry?.complete) {
            registry.complete('fix_pickup');
        } else {
            document.dispatchEvent(new CustomEvent('questUpdated', {
                detail: { id: 'fix_pickup', status: 'completed' },
            }));
            const save = getSystem('save');
            if (save) save.markDirty();
        }

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

    // ── Tabs ──
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display: flex; border-bottom: 2px solid rgba(255,255,255,0.1); margin: 0 16px;';

    const tabActive = document.createElement('button');
    tabActive.style.cssText = 'flex: 1; padding: 10px; background: none; border: none; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; border-bottom: 3px solid #ff9800; transition: all 0.2s;';

    const tabCompleted = document.createElement('button');
    tabCompleted.style.cssText = 'flex: 1; padding: 10px; background: none; border: none; color: #888; font-size: 14px; font-weight: 500; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s;';

    tabBar.append(tabActive, tabCompleted);

    // ── Content ──
    const content = document.createElement('div');
    content.style.cssText = 'padding: 16px; max-height: 400px; overflow-y: auto;';

    let currentTab = 'active';

    function renderQuestList(questList, emptyKey) {
        content.innerHTML = '';
        if (questList.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = t(emptyKey);
            empty.style.cssText = 'color: #aaa; text-align: center; padding: 30px;';
            content.appendChild(empty);
            return;
        }
        for (const q of questList) {
            content.appendChild(buildQuestCard(q));
        }
    }

    function refresh() {
        const all = gatherAllQuests();
        const active = all.filter(q => q.status !== 'completed');
        const completed = all.filter(q => q.status === 'completed');
        tabActive.textContent = `${t('quests.tabActive')} (${active.length})`;
        tabCompleted.textContent = `${t('quests.tabCompleted')} (${completed.length})`;
        if (currentTab === 'active') {
            renderQuestList(active, 'quests.noActiveQuests');
        } else {
            renderQuestList(completed, 'quests.noCompletedQuests');
        }
    }

    refresh();

    tabActive.addEventListener('click', () => {
        if (currentTab === 'active') return;
        currentTab = 'active';
        tabActive.style.color = '#fff';
        tabActive.style.fontWeight = '600';
        tabActive.style.borderBottomColor = '#ff9800';
        tabCompleted.style.color = '#888';
        tabCompleted.style.fontWeight = '500';
        tabCompleted.style.borderBottomColor = 'transparent';
        refresh();
    });

    tabCompleted.addEventListener('click', () => {
        if (currentTab === 'completed') return;
        currentTab = 'completed';
        tabCompleted.style.color = '#fff';
        tabCompleted.style.fontWeight = '600';
        tabCompleted.style.borderBottomColor = '#4caf50';
        tabActive.style.color = '#888';
        tabActive.style.fontWeight = '500';
        tabActive.style.borderBottomColor = 'transparent';
        refresh();
    });

    // Re-renderiza quando inventário ou estado de missão mudam enquanto o painel está aberto.
    panelRefreshHandler = () => { if (isPanelOpen) refresh(); };
    document.addEventListener('inventoryUpdated', panelRefreshHandler);
    document.addEventListener('questUpdated', panelRefreshHandler);

    container.append(header, tabBar, content);
    modal.appendChild(container);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeQuestPanel();
    });

    document.body.appendChild(modal);
}

/**
 * Gathers all visible quests from local definitions + NPC systems.
 * Bartolomeu quest 2 (contract/tax) is permanent and never shown.
 *
 * Metadata (icon/titleKey/descKey) vem do questRegistry. Este aggregator
 * só decide QUAIS quests aparecem e em que STATUS (active/completed) —
 * além de computar `desc` dinâmico quando a quest tem progresso visível.
 */
function gatherAllQuests() {
    const result = [];
    const registry = getSystem('questRegistry');

    // Helper local: monta uma entry a partir do registry + overrides.
    const entryFromRegistry = (id, status, overrides = {}) => {
        const meta = registry?.getPanelMeta?.(id);
        return {
            id,
            icon: meta?.icon ?? '',
            status,
            titleKey: meta?.titleKey ?? '',
            descKey: meta?.descKey ?? '',
            ...overrides,
        };
    };

    // 0. Tutorial quests (sempre visíveis)
    try {
        const tutorials = getTutorialQuests();
        if (tutorials?.getQuestsForPanel) {
            result.push(...tutorials.getQuestsForPanel());
        }
    } catch (e) {
        logger.warn('[QuestSystem] tutorialQuests indisponível', e);
    }

    // 1. Local quests (fix_pickup)
    for (const q of Object.values(quests)) {
        result.push(entryFromRegistry(q.id, q.status));
    }

    // 2. Bartolomeu quest 1 (R$ 1000) — only when accepted or completed
    const bart = getSystem('npcBartolomeu');
    if (bart) {
        const bartState = bart.getQuestState();
        const q1 = bartState?.quest1 ?? bartState;
        if (q1 === 'accepted') {
            result.push(entryFromRegistry('bartolomeu_q1', 'active'));
        } else if (q1 === 'completed') {
            result.push(entryFromRegistry('bartolomeu_q1', 'completed'));
        }
        // quest 2 is permanent (tax), never shown
    }

    // 3. Milly quest (find Madalena) — only when quest_active, cat_found, or completed
    const milly = getSystem('npcMilly');
    if (milly) {
        const millyState = milly.getQuestState();
        const mq = millyState?.quest ?? millyState;
        if (mq === 'quest_active' || mq === 'cat_found') {
            result.push(entryFromRegistry('milly_q1', 'active'));
        } else if (mq === 'completed') {
            result.push(entryFromRegistry('milly_q1', 'completed'));
        }
    }

    // 4. John milk quest — active when in_progress, completed when delivered
    const john = getSystem('npcJohn');
    if (john) {
        const mq = john.getQuestState()?.milkQuest;
        if (mq === 'in_progress') {
            result.push(entryFromRegistry('john_milk', 'active'));
        } else if (mq === 'delivered') {
            result.push(entryFromRegistry('john_milk', 'completed'));
        }
    }

    // 5. Lucas secret quest
    const lucas = getSystem('npcLucas');
    if (lucas) {
        const sq = lucas.getQuestState()?.secretQuest;
        if (sq === 'in_progress') {
            const prog = lucas.getMaterialProgress?.() || null;
            let desc;
            if (prog?.ready) {
                desc = t('quests.lucasSecret.ready');
            } else if (prog) {
                desc = t('quests.lucasSecret.progress', {
                    screws: prog.screws.have,
                    screwsNeed: prog.screws.need,
                    wood: prog.wood.have,
                    woodNeed: prog.wood.need,
                });
            }
            result.push(entryFromRegistry('lucas_secret', 'active', { desc }));
        } else if (sq === 'delivered') {
            result.push(entryFromRegistry('lucas_secret', 'completed'));
        }
    }

    return result;
}

function buildQuestCard(q) {
    const card = document.createElement('div');
    const borderColor = q.status === 'completed' ? '#4caf50' : q.status === 'active' ? '#ff9800' : '#888';
    card.style.cssText = `
        background: rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 10px;
        border-left: 4px solid ${borderColor};
    `;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 6px;';
    const icon = document.createElement('span');
    icon.textContent = q.icon;
    icon.style.fontSize = '20px';
    const title = document.createElement('span');
    title.textContent = t(q.titleKey);
    title.style.cssText = 'font-weight: 600; font-size: 16px; color: #fff;';

    const statusKey = `quests.status.${q.status}`;
    const badge = document.createElement('span');
    badge.textContent = q.status === 'completed' ? '✅' : q.status === 'active' ? '🔶' : '⬜';
    badge.title = t(statusKey);
    badge.style.cssText = 'margin-left: auto; font-size: 14px;';
    titleRow.append(icon, title, badge);

    const desc = document.createElement('p');
    desc.textContent = q.desc || t(q.descKey);
    desc.style.cssText = 'color: #ccc; font-size: 13px; margin: 0; line-height: 1.4; white-space: pre-line;';

    const statusText = document.createElement('p');
    statusText.textContent = t(statusKey);
    statusText.style.cssText = `color: ${borderColor}; font-size: 12px; margin-top: 6px; font-weight: 500;`;

    card.append(titleRow, desc, statusText);
    return card;
}

export function closeQuestPanel() {
    isPanelOpen = false;
    if (panelRefreshHandler) {
        document.removeEventListener('inventoryUpdated', panelRefreshHandler);
        document.removeEventListener('questUpdated', panelRefreshHandler);
        panelRefreshHandler = null;
    }
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
    seedMilkBottleInStorage();
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
    seedMilkBottleInStorage,
    getBatteryState,
    setBatteryState,
    quests,
    BATTERY_ITEM_ID,
    MILK_BOTTLE_ITEM_ID,
};

registerSystem('quests', questAPI);
export default questAPI;
