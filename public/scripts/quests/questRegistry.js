/**
 * @file questRegistry.js - Catálogo central de quests.
 * @description
 *   Fonte única da verdade para metadata (título, descrição, ícone) e
 *   recompensas (XP, currency, itens) de todas as quests do jogo. NPCs e
 *   sistemas continuam donos da lógica de flow (diálogo, checagens de
 *   inventário, estado), mas delegam a **finalização** pro registry:
 *
 *     questRegistry.complete('lucas_secret');
 *
 *   O helper aplica todas as recompensas configuradas, dispara
 *   `questUpdated` e marca o save como dirty. Isso elimina a duplicação de
 *   `xp.grantXP + currency.earn + markDirty` espalhada por 5+ arquivos e
 *   deixa o balanceamento num lugar só.
 *
 *   Esse módulo foi desenhado para ser trocável por um arquivo de config
 *   externo no futuro (JSON/YAML) — a forma dos dados é serializável.
 *
 * @module QuestRegistry
 */

import { registerSystem, getSystem } from '../gameState.js';
import { logger } from '../logger.js';

// ─── Tabela de definições ─────────────────────────────────────────────────────

/**
 * @typedef {Object} QuestRewards
 * @property {number} [xp]       - XP concedido ao completar.
 * @property {number} [currency] - Moedas concedidas ao completar.
 * @property {Array<{id:number, quantity:number}>} [items] - Itens entregues.
 */

/**
 * @typedef {Object} QuestDefinition
 * @property {string} id         - Identificador estável da quest.
 * @property {string} icon       - Emoji exibido no painel.
 * @property {string} titleKey   - Chave i18n do título.
 * @property {string} descKey    - Chave i18n da descrição base.
 * @property {QuestRewards} rewards
 */

/** @type {Object<string, QuestDefinition>} */
export const QUEST_REGISTRY = {
    // ── Quests de sistema ────────────────────────────────────────────────────
    fix_pickup: {
        id: 'fix_pickup',
        icon: '🔧',
        titleKey: 'quests.fixPickup.title',
        descKey:  'quests.fixPickup.description',
        rewards:  { xp: 60 },
    },

    // ── NPCs da cidade ───────────────────────────────────────────────────────
    bartolomeu_q1: {
        id: 'bartolomeu_q1',
        icon: '💰',
        titleKey: 'quests.bartolomeu.title',
        descKey:  'quests.bartolomeu.description',
        // Quest custa $1000 ao player — a "recompensa" é em XP (esforço real).
        rewards:  { xp: 200 },
    },
    milly_q1: {
        id: 'milly_q1',
        icon: '🐱',
        titleKey: 'quests.milly.title',
        descKey:  'quests.milly.description',
        rewards:  { xp: 75, currency: 200 },
    },

    // ── Família (John/Lucas) ─────────────────────────────────────────────────
    john_milk: {
        id: 'john_milk',
        icon: '🥛',
        titleKey: 'quests.johnMilk.title',
        descKey:  'quests.johnMilk.description',
        rewards:  { xp: 50, currency: 50 },
    },
    lucas_secret: {
        id: 'lucas_secret',
        icon: '🔩',
        titleKey: 'quests.lucasSecret.title',
        descKey:  'quests.lucasSecret.description',
        rewards:  { xp: 120 },
    },
    // Jantar da Molly — recompensa depende da receita escolhida pelo player.
    // Ambas compartilham título/descrição/ícone; só as recompensas mudam.
    // 310 = Marmita da Molly, 311 = Fatia do Bolo da Molly (ver item.js).
    molly_dinner_main: {
        id: 'molly_dinner_main',
        icon: '🍲',
        titleKey: 'quests.mollyDinner.title',
        descKey:  'quests.mollyDinner.description',
        rewards:  { xp: 50, currency: 350, items: [{ id: 310, quantity: 1 }] },
    },
    molly_dinner_dessert: {
        id: 'molly_dinner_dessert',
        icon: '🍲',
        titleKey: 'quests.mollyDinner.title',
        descKey:  'quests.mollyDinner.description',
        rewards:  { xp: 20, currency: 150, items: [{ id: 311, quantity: 1 }] },
    },

    // ── Tutoriais (todos com mesma recompensa base) ──────────────────────────
    tutorial_first_meeting: {
        id: 'tutorial_first_meeting',
        icon: '👋',
        titleKey: 'quests.tutorial.firstMeeting.title',
        descKey:  'quests.tutorial.firstMeeting.description',
        rewards:  { xp: 25 },
    },
    tutorial_pet_animal: {
        id: 'tutorial_pet_animal',
        icon: '❤️',
        titleKey: 'quests.tutorial.petAnimal.title',
        descKey:  'quests.tutorial.petAnimal.description',
        rewards:  { xp: 25 },
    },
    tutorial_name_animal: {
        id: 'tutorial_name_animal',
        icon: '✏️',
        titleKey: 'quests.tutorial.nameAnimal.title',
        descKey:  'quests.tutorial.nameAnimal.description',
        rewards:  { xp: 25 },
    },
    tutorial_explore_city: {
        id: 'tutorial_explore_city',
        icon: '🏘️',
        titleKey: 'quests.tutorial.exploreCity.title',
        descKey:  'quests.tutorial.exploreCity.description',
        rewards:  { xp: 25 },
    },
    tutorial_store_item: {
        id: 'tutorial_store_item',
        icon: '📦',
        titleKey: 'quests.tutorial.storeItem.title',
        descKey:  'quests.tutorial.storeItem.description',
        rewards:  { xp: 25 },
    },
};

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Retorna a definição crua de uma quest (ou null).
 * @param {string} id
 * @returns {QuestDefinition|null}
 */
function getDefinition(id) {
    return QUEST_REGISTRY[id] || null;
}

/**
 * Retorna só a metadata de UI (icon/titleKey/descKey) pra alimentar o painel.
 * @param {string} id
 * @returns {{id:string, icon:string, titleKey:string, descKey:string}|null}
 */
function getPanelMeta(id) {
    const def = getDefinition(id);
    if (!def) return null;
    return {
        id: def.id,
        icon: def.icon,
        titleKey: def.titleKey,
        descKey: def.descKey,
    };
}

/**
 * Aplica as recompensas configuradas para a quest e dispara os eventos
 * padrão. Chamado pelos NPCs no momento exato de "entregar" a quest.
 *
 * Ordem das operações:
 *   1. grantXP (se configurado)
 *   2. currency.earn (se configurado)
 *   3. inventory.addItem (por item)
 *   4. dispatchEvent('questUpdated') com status 'completed'
 *   5. save.markDirty()
 *
 * @param {string} id                        - ID da quest no registry
 * @param {Object} [opts]
 * @param {string} [opts.source]             - override do source do XP (default: `quest:<id>`)
 * @param {Partial<QuestRewards>} [opts.extraRewards] - somar a essas recompensas (ex: bônus contextual)
 * @returns {boolean} true se encontrou a definição e aplicou; false se id inválido
 */
function complete(id, opts = {}) {
    const def = getDefinition(id);
    if (!def) {
        logger.warn(`[QuestRegistry] complete() chamado com id desconhecido: ${id}`);
        return false;
    }

    const base = def.rewards || {};
    const extra = opts.extraRewards || {};
    const source = opts.source || `quest:${id}`;

    const xpAmount = (base.xp || 0) + (extra.xp || 0);
    const currencyAmount = (base.currency || 0) + (extra.currency || 0);
    const items = [
        ...(Array.isArray(base.items) ? base.items : []),
        ...(Array.isArray(extra.items) ? extra.items : []),
    ];

    // 1. XP
    if (xpAmount > 0) {
        const xp = getSystem('xp');
        if (xp?.grantXP) xp.grantXP(xpAmount, source);
    }

    // 2. Currency
    if (currencyAmount > 0) {
        const currency = getSystem('currency');
        if (currency?.earn) currency.earn(currencyAmount, source);
    }

    // 3. Itens
    if (items.length > 0) {
        const inventory = getSystem('inventory');
        if (inventory?.addItem) {
            for (const it of items) {
                if (it && Number.isFinite(it.id) && Number.isFinite(it.quantity) && it.quantity > 0) {
                    inventory.addItem(it.id, it.quantity);
                }
            }
        }
    }

    // 4. Evento (painel de quest re-renderiza, tracker de achievements ouve)
    document.dispatchEvent(new CustomEvent('questUpdated', {
        detail: { id, status: 'completed', rewards: { xp: xpAmount, currency: currencyAmount, items } },
    }));

    // 5. Persistência
    const save = getSystem('save');
    if (save?.markDirty) save.markDirty();

    logger.info(`[QuestRegistry] '${id}' concluída (+${xpAmount} XP, +${currencyAmount} $, ${items.length} itens)`);
    return true;
}

/**
 * Lista todos os IDs registrados (útil pra sanity-check em testes/UIs).
 * @returns {string[]}
 */
function listIds() {
    return Object.keys(QUEST_REGISTRY);
}

// ─── Singleton registrado ────────────────────────────────────────────────────

export const questRegistry = {
    getDefinition,
    getPanelMeta,
    complete,
    listIds,
    REGISTRY: QUEST_REGISTRY,
};

registerSystem('questRegistry', questRegistry);

export default questRegistry;
