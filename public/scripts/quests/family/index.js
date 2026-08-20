/**
 * @file index.js - Roteador das quests da família Miller.
 * @description As quests do arco envolvem mais de um Miller ao mesmo tempo
 * (a da Luna passa por John e Molly; a da Clara junta quatro irmãos), então
 * elas não cabem dentro do arquivo de um NPC só.
 *
 * Este módulo é o **ponto único de integração**: os NPCs perguntam
 * "tem cena pra mim?" e delegam. Adicionar a próxima quest do arco não exige
 * tocar de novo em `npcJohn`, `npcMolly` & cia.
 *
 * Também agrega o estado de save de todas elas numa flag só
 * (`gameFlags.family_quests`) — uma migration em vez de uma por quest.
 *
 * @module FamilyQuests
 */

import { registerSystem, getSystem } from '../../gameState.js';
import { logger } from '../../logger.js';
import { animals, objectDestroyed } from '../../theWorld.js';
import lunaChick from './lunaChick.js';

/** Todas as quests do arco. Adicionar as próximas aqui. */
const QUESTS = [lunaChick];

/** Quais NPCs podem abrir a cena de abertura de cada quest. */
const SCENE1_TRIGGERS = {
    luna_chick: ['npcJohn', 'npcMolly'],
};

/**
 * Tenta abrir uma cena da família ao interagir com um NPC.
 * O NPC chama isto ANTES da própria lógica — se retornar true, a cena da
 * família tomou a vez e o NPC não deve seguir com o diálogo dele.
 *
 * @param {string} npcSystemId - nome registrado do NPC (ex.: 'npcJohn')
 * @returns {boolean} true se uma cena foi iniciada
 */
function tryStartSceneFor(npcSystemId) {
    const dlg = getSystem('dialogue');
    if (!dlg) return false;

    // Entrega vem ANTES de abrir quest nova: quem chega com o filhote em mãos
    // quer entregar, não começar outra conversa.
    for (const q of QUESTS) {
        const triggers = SCENE1_TRIGGERS[q.id] || [];
        if (triggers.includes(npcSystemId) && q.canStartScene3?.()) {
            dlg.start(q.buildScene3());
            logger.info(`[FamilyQuests] cena 3 (entrega) de ${q.id} iniciada por ${npcSystemId}`);
            return true;
        }
    }

    for (const q of QUESTS) {
        const triggers = SCENE1_TRIGGERS[q.id] || [];
        if (triggers.includes(npcSystemId) && q.canStartScene1?.()) {
            dlg.start(q.buildScene1());
            logger.info(`[FamilyQuests] cena 1 de ${q.id} iniciada por ${npcSystemId}`);
            return true;
        }
    }
    return false;
}

/**
 * Cena que dispara ao voltar pra fazenda (não depende de falar com ninguém).
 * Chamado na transição de mapa city → farm.
 *
 * @returns {boolean} true se uma cena foi iniciada
 */
function tryStartFarmReturnScene() {
    const dlg = getSystem('dialogue');
    if (!dlg) return false;

    for (const q of QUESTS) {
        if (q.canStartScene2?.()) {
            dlg.start(q.buildScene2());
            logger.info(`[FamilyQuests] cena 2 de ${q.id} iniciada (retorno à fazenda)`);
            return true;
        }
    }
    return false;
}

/** Objetivos ativos, pro painel de quests. */
function getActiveObjectives() {
    return QUESTS
        .map((q) => ({ id: q.id, text: q.getObjective?.() }))
        .filter((o) => o.text);
}

/** Quest que está esperando um filhote nascer (ou null). */
function getPendingPetQuest() {
    for (const q of QUESTS) {
        const pet = q.getPet?.();
        if (pet && q.getState?.().state === 'waiting_birth') return { quest: q, pet };
    }
    return null;
}

/**
 * Recolhe do mundo o filhote que a quest está esperando e o coloca no
 * inventário, pra ser levado até a Luna.
 *
 * O filhote vira o item de animal correspondente (300/301/302) — o mesmo que
 * o recolocaria na fazenda. Assim o jogador "carrega" o bichinho sem precisar
 * de item, ícone ou sistema de transporte novo.
 *
 * Só funciona no animal exato que a quest espera; qualquer outro é ignorado
 * (o botão nem aparece neles, isto é a segunda linha de defesa).
 *
 * @param {Object} animal - Animal do mundo, vindo do UiPanel.
 * @returns {{ok: boolean, reason?: string}}
 */
function collectPet(animal) {
    const pending = getPendingPetQuest();
    if (!pending) return { ok: false, reason: 'no_quest' };
    if (!animal || animal.assetName !== pending.pet.young) {
        return { ok: false, reason: 'wrong_animal' };
    }

    const inv = getSystem('inventory');
    if (!inv?.addItem) return { ok: false, reason: 'no_inventory' };

    // Item primeiro: se o inventário estiver cheio, o animal continua no mundo
    // em vez de sumir sem nada em troca.
    if (!inv.addItem(pending.pet.itemId, 1)) {
        return { ok: false, reason: 'inventory_full' };
    }

    const idx = animals.indexOf(animal);
    if (idx >= 0) animals.splice(idx, 1);
    objectDestroyed(animal.id);

    if (!pending.quest.onPetCollected?.()) {
        logger.warn?.('[familyQuests] filhote recolhido fora do estado esperado');
    }

    getSystem('save')?.markDirty?.();
    logger.info?.(`[familyQuests] filhote ${pending.pet.young} recolhido pra Luna`);
    return { ok: true };
}

// ─── Save ────────────────────────────────────────────────────────────────────

/** Estado agregado de todas as quests do arco. */
function getQuestState() {
    const out = {};
    for (const q of QUESTS) out[q.id] = q.getState?.() ?? null;
    return out;
}

/** Restaura o estado agregado. Quest ausente no save volta ao default. */
function setQuestState(data) {
    for (const q of QUESTS) {
        const saved = data?.[q.id];
        if (saved) q.setState?.(saved);
        else q.reset?.();
    }
}

export const familyQuests = {
    tryStartSceneFor,
    tryStartFarmReturnScene,
    getActiveObjectives,
    getPendingPetQuest,
    collectPet,
    getQuestState,
    setQuestState,
    QUESTS,
};

registerSystem('familyQuests', familyQuests);

// ─── Devtool ────────────────────────────────────────────────────────────────
// `getSystem` não existe no console (é export de módulo). O projeto já usa
// `window.__debug` pra isso — mesmo padrão do foodTroughSystem/waterTrough.
//
//   __debug.family.status()        → o que está bloqueando cada quest
//   __debug.family.skipOrder()     → ignora a ordem do arco (testar isolada)
//   __debug.family.reset()         → volta tudo pro início
//   __debug.family.scene1()        → força a cena 1 agora
//   __debug.family.scene2()        → força a cena 2 (surpresa na fazenda)
if (typeof window !== 'undefined') {
    window.__debug = window.__debug || {};
    window.__debug.family = {
        status: () => QUESTS.map((q) => ({
            id: q.id,
            estado: q.getState?.(),
            bloqueio: q.whyBlocked?.() ?? '(disponível)',
        })),
        skipOrder: (v = true) => {
            QUESTS.forEach((q) => q.setSkipPrereqs?.(v));
            return `ordem do arco ${v ? 'ignorada' : 'restaurada'}`;
        },
        reset: () => { QUESTS.forEach((q) => q.reset?.()); return 'quests da família resetadas'; },
        scene1: () => {
            const dlg = getSystem('dialogue');
            const q = QUESTS[0];
            if (!dlg) return 'dialogue não carregado';
            dlg.start(q.buildScene1());
            return `cena 1 de ${q.id} forçada`;
        },
        scene2: () => {
            const dlg = getSystem('dialogue');
            const q = QUESTS[0];
            if (!dlg) return 'dialogue não carregado';
            dlg.start(q.buildScene2());
            return `cena 2 de ${q.id} forçada`;
        },
    };
}

export default familyQuests;
