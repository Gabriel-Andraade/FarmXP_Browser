/**
 * @file tutorialQuests.js - Sistema de quests tutoriais (NPC virtual)
 * @description 5 quests tutoriais sempre visíveis no painel. Concluem via eventos
 * existentes (animalAction[pet], animalNamed, mapChanged, itemStored) e via polling
 * do dialogueState do John (first_meeting).
 * @module TutorialQuests
 */

import { getSystem, registerSystem } from '../gameState.js';
import { logger } from '../logger.js';

// ─── Definitions ────────────────────────────────────────────────────────────

// Mapeamento das chaves internas (usadas pra orquestrar eventos) → id público
// no questRegistry. Metadata (icon/titleKey/descKey) vive no registry;
// tutorialQuests só cuida de QUANDO marcar cada uma como concluída.
const TUTORIAL_KEY_TO_ID = {
    first_meeting:  'tutorial_first_meeting',
    pet_animal:     'tutorial_pet_animal',
    name_animal:    'tutorial_name_animal',
    explore_city:   'tutorial_explore_city',
    store_item:     'tutorial_store_item',
};

// ─── State ──────────────────────────────────────────────────────────────────

const state = {
    first_meeting: false,
    pet_animal: false,
    name_animal: false,
    explore_city: false,
    store_item: false,
};

function markDone(key) {
    if (state[key]) return;
    state[key] = true;
    // Delega ao registry: aplica XP, dispara questUpdated e marca save.
    const registry = getSystem('questRegistry');
    const questId = TUTORIAL_KEY_TO_ID[key];
    if (registry?.complete) {
        registry.complete(questId);
    } else {
        // Fallback defensivo: registry ainda não carregou.
        document.dispatchEvent(new CustomEvent('questUpdated', {
            detail: { id: questId, status: 'completed' },
        }));
        const save = getSystem('save');
        if (save?.markDirty) save.markDirty();
    }
    logger.info(`[TutorialQuests] Quest '${key}' completed`);
}

// ─── Event listeners ────────────────────────────────────────────────────────

document.addEventListener('animalAction', (e) => {
    if (e.detail?.action === 'pet') markDone('pet_animal');
});
document.addEventListener('animalNamed', () => markDone('name_animal'));
document.addEventListener('itemStored', () => markDone('store_item'));
document.addEventListener('mapChanged', (e) => {
    if (e.detail?.mapId === 'city') markDone('explore_city');
});

// first_meeting é polled via getQuestsForPanel (lê dialogueState do John)

// ─── Public API ─────────────────────────────────────────────────────────────

function refreshFirstMeeting() {
    if (state.first_meeting) return;
    const john = getSystem('npcJohn');
    if (john?.getQuestState?.()?.dialogue === 'intro_done') {
        markDone('first_meeting');
    }
}

function getQuestsForPanel() {
    refreshFirstMeeting();
    const registry = getSystem('questRegistry');
    return Object.entries(TUTORIAL_KEY_TO_ID).map(([key, questId]) => {
        const meta = registry?.getPanelMeta?.(questId);
        return {
            id: questId,
            icon: meta?.icon ?? '',
            status: state[key] ? 'completed' : 'active',
            titleKey: meta?.titleKey ?? '',
            descKey: meta?.descKey ?? '',
        };
    });
}

function getQuestState() {
    return { ...state };
}

function setQuestState(data) {
    if (!data || typeof data !== 'object') return;
    for (const k of Object.keys(state)) {
        if (typeof data[k] === 'boolean') state[k] = data[k];
    }
}

const tutorialQuestsAPI = {
    getQuestsForPanel,
    getQuestState,
    setQuestState,
};

registerSystem('tutorialQuests', tutorialQuestsAPI);

export function getTutorialQuests() {
    return tutorialQuestsAPI;
}

export default tutorialQuestsAPI;
