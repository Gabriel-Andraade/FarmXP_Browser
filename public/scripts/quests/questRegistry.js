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
    lucas_drill: {
        id: 'lucas_drill',
        icon: '🔩',
        titleKey: 'quests.lucasDrill.title',
        descKey:  'quests.lucasDrill.description',
        // XP varia por galho (ignore=1, contar=60, comprar=120) via extraRewards.
        rewards:  { xp: 0 },
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

/**
 * Arco Miller.
 *
 * `luna_chick` tem recompensa em DUAS partes:
 *   - a base aqui (80 XP) — vale por ter fechado a quest, independente de quê
 *   - um bônus escalado pelo preço do filhote entregue, somado via
 *     `complete('luna_chick', { extraRewards })` no momento da entrega
 *
 * Separado assim porque o afeto da Luna é o mesmo com qualquer bicho, mas
 * entregar um leitão (150) custa três vezes mais que um pintinho (50) —
 * e o John faz questão de pagar pelo animal.
 */
QUEST_REGISTRY.luna_chick = {
    id: 'luna_chick',
    icon: '🐣',
    titleKey: 'quests.lunaChick.title',
    descKey:  'quests.lunaChick.description',
    rewards:  { xp: 80 },
};

// ─── Progresso por NPC ───────────────────────────────────────────────────────

/**
 * Quais quests cada NPC tem, e quando cada uma conta como concluída.
 *
 * Tabela separada de `QUEST_REGISTRY` de propósito: aquele catálogo é indexado
 * por *recompensa* (ex.: `molly_dinner_main` e `molly_dinner_dessert` são duas
 * variantes da MESMA quest), então usá-lo pra contar progresso contaria a
 * mesma quest duas vezes. Aqui a unidade é a quest de verdade.
 *
 * As definições são escritas contra o shape que vai pro save
 * (`gameFlags.<npc>_quest`), não contra o módulo do NPC: os NPCs de city são
 * lazy-loaded (#227), então logo após carregar um save na fazenda eles não
 * existem — o estado sai do sistema vivo quando há, senão do último save.
 *
 * "Concluída" = estado TERMINAL. Recusar conta: o jogador se envolveu e
 * decidiu — é escolha, não pendência.
 *
 * @type {Object<string, {system: string, flag: string, quests: Array<{id: string, field: string, done: string[]}>}>}
 */
export const NPC_QUESTS = {
    john: {
        system: 'npcJohn',
        flag: 'john_quest',
        quests: [
            { id: 'dialogue', field: 'dialogue', done: ['intro_done'] },
            { id: 'john_milk', field: 'milkQuest', done: ['delivered', 'declined'] },
        ],
    },
    lucas: {
        system: 'npcLucas',
        flag: 'lucas_quest',
        quests: [
            { id: 'lucas_secret', field: 'secretQuest', done: ['delivered', 'declined'] },
            { id: 'lucas_drill', field: 'drillQuest', done: ['ignored', 'told_alone', 'told_together', 'paid', 'confessed'] },
        ],
    },
    molly: {
        system: 'npcMolly',
        flag: 'molly_quest',
        quests: [
            { id: 'dialogue', field: 'dialogue', done: ['intro_done'] },
            { id: 'molly_dinner', field: 'dinnerQuest', done: ['completed'] },
        ],
    },
    jeremy: {
        system: 'npcJeremy',
        flag: 'jeremy_quest',
        quests: [
            { id: 'jeremy_supply', field: 'supplyQuest', done: ['delivered', 'declined'] },
            { id: 'jeremy_choices', field: 'choicesQuest', done: ['done'] },
        ],
    },
    bru: {
        system: 'npcBru',
        flag: 'bru_quest',
        quests: [
            { id: 'dialogue', field: 'dialogue', done: ['intro_done'] },
            { id: 'bru_ride', field: 'rideQuest', done: ['completed'] },
        ],
    },
    milly: {
        system: 'npcMilly',
        flag: 'milly_quest',
        quests: [
            { id: 'milly_q1', field: 'quest', done: ['completed', 'quest_declined'] },
        ],
    },
    bartolomeu: {
        system: 'npcBartolomeu',
        flag: 'bartolomeu_quest',
        quests: [
            { id: 'bartolomeu_q1', field: 'quest1', done: ['completed', 'declined'] },
            // `quest2` NÃO entra: é o imposto da fazenda, recorrente e sem fim.
            // Contá-la travaria o Bartolomeu num teto de progresso pra sempre
            // (nunca concluída), e limiares mais altos — como os 75% da visita
            // da avó Maria — jamais disparariam.
        ],
    },
    // Quests do arco Miller vivem agregadas em `family_quests` (envolvem mais
    // de um familiar), então o estado fica um nível abaixo — daí o `sub`.
    luna: {
        system: 'familyQuests',
        flag: 'family_quests',
        sub: 'luna_chick',
        quests: [
            { id: 'luna_chick', field: 'state', done: ['delivered'] },
        ],
    },
    // Isabela entra quando ganhar quest própria (`hasNoticed` é só intro).
};

/** Estado de um NPC: do sistema vivo se carregado, senão do último save. */
function _npcState(npcId) {
    const def = NPC_QUESTS[npcId];
    if (!def) return null;

    const live = getSystem(def.system)?.getQuestState?.();
    const raw = live ?? getSystem('save')?.getAppliedGameFlags?.()?.[def.flag] ?? null;

    // `sub`: estados agregados (arco Miller) guardam a quest um nível abaixo.
    return def.sub ? (raw?.[def.sub] ?? null) : raw;
}

/**
 * Progresso de um NPC.
 * @param {string} npcId
 * @returns {{total: number, done: number, pct: number}}
 */
function getProgress(npcId) {
    const def = NPC_QUESTS[npcId];
    if (!def) return { total: 0, done: 0, pct: 0 };

    const state = _npcState(npcId);
    const total = def.quests.length;
    const done = state
        ? def.quests.filter((q) => q.done.includes(state[q.field])).length
        : 0;

    return { total, done, pct: total ? done / total : 0 };
}

/**
 * Progresso de todos os NPCs.
 * @returns {Object<string, {total: number, done: number, pct: number}>}
 */
function getAllProgress() {
    const out = {};
    for (const npcId of Object.keys(NPC_QUESTS)) out[npcId] = getProgress(npcId);
    return out;
}

/**
 * Gatilho da "quest de passado": true quando TODOS os NPCs atingiram a fração
 * exigida. Conservador de propósito — NPC sem estado legível conta 0 e SEGURA
 * o gatilho, em vez de disparar o clímax do protagonista cedo demais.
 *
 * @param {number} [threshold=0.4]
 * @returns {boolean}
 */
function hasEveryoneReached(threshold = 0.4) {
    const all = getAllProgress();
    const ids = Object.keys(all);
    if (ids.length === 0) return false;
    return ids.every((id) => all[id].pct >= threshold);
}

/** NPCs que ainda não atingiram o limiar (debug / painel). */
function pendingFor(threshold = 0.4) {
    const all = getAllProgress();
    return Object.keys(all).filter((id) => all[id].pct < threshold);
}

// ─── Gatilho da quest de passado ─────────────────────────────────────────────

/** Fração de quests por NPC que destrava a quest de passado. */
export const PAST_QUEST_THRESHOLD = 0.4;

/**
 * Handler da quest de passado do protagonista. Fica null até ela existir —
 * e é isso que mantém a pausa inerte: sem quest de passado implementada,
 * pausar as ofertas travaria TODAS as quests do jogo pra sempre assim que o
 * limiar batesse. Registrando-a, a pausa passa a valer sozinha.
 *
 * @type {{isDone: () => boolean}|null}
 */
let _pastQuest = null;

/**
 * A quest de passado se registra aqui quando existir.
 * @param {{isDone: () => boolean}} handler
 */
function registerPastQuest(handler) {
    _pastQuest = (typeof handler?.isDone === 'function') ? handler : null;
}

/** O limiar já foi atingido com todos os NPCs? */
function isPastQuestUnlocked() {
    return hasEveryoneReached(PAST_QUEST_THRESHOLD);
}

/**
 * Os NPCs devem parar de oferecer quest nova?
 *
 * Vale entre o desbloqueio da quest de passado e a conclusão dela: o mundo
 * "prende o fôlego" pro clímax do protagonista. O sinal pro jogador é o
 * próprio diálogo repetido que os NPCs já fazem — sem mecanismo novo.
 *
 * @returns {boolean}
 */
function isOfferingPaused() {
    if (!_pastQuest) return false;
    return isPastQuestUnlocked() && !_pastQuest.isDone();
}

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
    // Progresso por NPC — alimenta o gatilho da "quest de passado".
    getProgress,
    getAllProgress,
    hasEveryoneReached,
    pendingFor,
    NPC_QUESTS,
    // Gatilho da quest de passado.
    registerPastQuest,
    isPastQuestUnlocked,
    isOfferingPaused,
    PAST_QUEST_THRESHOLD,
};

registerSystem('questRegistry', questRegistry);

export default questRegistry;
