/**
 * @file npcBartolomeu.js - NPC Bartolomeu, o prefeito de Capa de Ganso
 * @description Registra o NPC Bartolomeu na cidade e define seus diálogos
 * condicionais baseados no personagem ativo (Stella, Ben ou Graham).
 * Quest: juntar R$ 1.000 e entregar ao Bartolomeu para ajudar a cidade.
 * @module NpcBartolomeu
 */

import { getSystem, registerSystem } from './gameState.js';
import { i18n, t } from './i18n/i18n.js';
import { logger } from './logger.js';
import { placedBuildings, placedWells } from './theWorld.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const BARTOLOMEU = {
    id: 'bartolomeu',
    name: 'Bartolomeu',
    x: 2274,
    y: 844,
    width: 48,
    height: 64,
    sprite: 'assets/character/bartolomeu/bartolomeu_sit_00.png',
    map: 'city',
    interactRadius: 70,
};

const DIALOGUE_PORTRAIT = 'assets/character/bartolomeu/bartolomeu.png';
const SPRITE_NORMAL = 'assets/character/bartolomeu/bartolomeu_sit_00.png';
const SPRITE_UMBRELLA = 'assets/character/bartolomeu/bartolomeu_sit_01.png';

// Tamanhos por sprite. O sprite com guarda-chuva é mais largo (o guarda-chuva
// estoura a silhueta normal), então damos uma esticada leve no width pra não
// comprimir a imagem.
const SPRITE_NORMAL_DIMS   = { width: 48, height: 64 };
const SPRITE_UMBRELLA_DIMS = { width: 90, height: 64 };
const QUEST_COST = 1000;

// ─── Tax constants ─────────────────────────────────────────────────────────

const TAX_BASE = 20;
const TAX_FENCE_INCREMENT = 2;     // +2 a cada 15 cercas
const TAX_FENCE_THRESHOLD = 15;
const TAX_WELL_INCREMENT = 0.90;   // +0.90 a cada 3 poços
const TAX_WELL_THRESHOLD = 3;
const TAX_INTERVAL_DAYS = 10;

// ─── State ──────────────────────────────────────────────────────────────────

/** Quest 1: 'intro' | 'declined' | 'accepted' | 'completed' */
let questState = 'intro';

/** Quest 2: 'idle' | 'intro' | 'declined' | 'accepted' */
let quest2State = 'idle';

/** Day when tax was last paid (prevents double-charging on reload) */
let lastTaxDay = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getActiveCharacterId() {
    const playerSys = getSystem('player');
    return playerSys?.activeCharacter?.id || 'stella';
}

function getPlayerDialogPortrait() {
    const charId = getActiveCharacterId();
    return `assets/character/${charId}/dialog_${charId.charAt(0).toUpperCase() + charId.slice(1)}_00.png`;
}

function getPlayerName() {
    const charId = getActiveCharacterId();
    const names = { stella: 'Stella', ben: 'Ben', graham: 'Graham' };
    return names[charId] || 'Stella';
}

/** Returns currency symbol based on current language */
function getCurrency() {
    const lang = i18n.getCurrentLanguage();
    if (lang === 'en') return '$';
    if (lang === 'es') return '€';
    return 'R$'; // pt-BR default
}

/** Returns currency name based on current language */
function getCurrencyName() {
    const lang = i18n.getCurrentLanguage();
    if (lang === 'en') return 'dollars';
    if (lang === 'es') return 'euros';
    return 'reais';
}

/** Formats money string: "R$ 1000 reais" */
function formatMoney(amount) {
    return `${getCurrency()} ${amount} ${getCurrencyName()}`;
}

function getPlayerBalance() {
    const currency = getSystem('currency');
    return currency ? currency.getMoney() : 0;
}

/** Gets a character-specific i18n key, falling back to 'default' */
function tChar(baseKey, charId, params) {
    const specific = i18n.t(`${baseKey}.${charId}`, params);
    // If key not found, i18n returns the key string itself
    if (specific === `${baseKey}.${charId}`) {
        return i18n.t(`${baseKey}.default`, params);
    }
    return specific;
}

// ─── Dialogue builders ─────────────────────────────────────────────────────

function buildFirstDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const B = 'npc.bartolomeu';
    const money = formatMoney(QUEST_COST);

    const left = { name: playerName, portrait: playerPortrait };
    const right = { name: 'Bartolomeu', portrait: DIALOGUE_PORTRAIT };

    const lines = [];

    lines.push({ side: 'right', text: t(`${B}.sleeping`), thought: true });
    lines.push({ side: 'left', text: t(`${B}.playerHi`) });
    lines.push({
        side: 'right',
        text: tChar(`${B}.wakeUp`, charId),
        setPortrait: { side: 'right', src: DIALOGUE_PORTRAIT },
    });
    lines.push({ side: 'left', text: tChar(`${B}.playerIntro`, charId) });
    lines.push({ side: 'right', text: tChar(`${B}.bartolomeuIntro`, charId) });
    lines.push({ side: 'left', text: tChar(`${B}.playerReaction`, charId) });
    lines.push({ side: 'right', text: tChar(`${B}.gilbertLine`, charId, { money }) });

    // Pergunta sobre mercadores (todos os personagens)
    const choiceIdx = lines.length;
    const yesIdx = choiceIdx + 1;
    const noIdx = choiceIdx + 2;
    const thoughtIdx = choiceIdx + 3;

    lines.push({
        side: 'right',
        text: t(`${B}.merchantQuestion`),
        type: 'choice',
        options: [
            { text: t(`${B}.merchantYes`), value: 'yes', next: yesIdx },
            { text: t(`${B}.merchantNo`), value: 'no', next: noIdx },
        ],
    });

    lines.push({
        side: 'right',
        text: t(`${B}.merchantKnown`),
        next: thoughtIdx,
    });

    lines.push({
        side: 'right',
        text: t(`${B}.merchantExplain`),
    });

    lines.push({
        side: 'left',
        text: t(`${B}.playerThought`),
        thought: true,
    });

    lines.push({ side: 'right', text: t(`${B}.questOffer`) });
    lines.push({ side: 'right', text: t(`${B}.questWhisper`), thought: true });

    const acceptIdx = lines.length + 1;
    const declineIdx = lines.length + 2;

    lines.push({
        side: 'right',
        text: t(`${B}.questAcceptQ`),
        type: 'choice',
        options: [
            {
                text: t(`${B}.questAcceptOpt`),
                value: 'accept',
                next: acceptIdx,
                onSelect: () => { questState = 'accepted'; },
            },
            {
                text: t(`${B}.questDeclineOpt`),
                value: 'decline',
                next: declineIdx,
                onSelect: () => { questState = 'declined'; },
            },
        ],
    });

    lines.push({ side: 'right', text: t(`${B}.questAccepted`, { money }), end: true });
    lines.push({ side: 'right', text: t(`${B}.questDeclined`), end: true });

    return { left, right, lines };
}

/**
 * Diálogo após o jogador ter recusado a quest anteriormente.
 * Oferece duas opções: aceitar agora ou apenas passar.
 */
function buildDeclinedDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const B = 'npc.bartolomeu';
    const money = formatMoney(QUEST_COST);

    const left = { name: playerName, portrait: playerPortrait };
    const right = { name: 'Bartolomeu', portrait: DIALOGUE_PORTRAIT };

    const lines = [
        { side: 'right', text: t(`${B}.declinedGreet`) },
        {
            side: 'left',
            type: 'choice',
            options: [
                {
                    text: t(`${B}.declinedAcceptOpt`),
                    value: 'accept_now',
                    next: 2,
                    onSelect: () => { questState = 'accepted'; },
                },
                {
                    text: t(`${B}.declinedLeaveOpt`),
                    value: 'leave',
                    next: 3,
                },
            ],
        },
        { side: 'right', text: t(`${B}.declinedAccepted`, { money }), end: true },
        { side: 'right', text: t(`${B}.declinedLeave`), end: true },
    ];

    return { left, right, lines };
}

function buildQuestActiveDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const balance = getPlayerBalance();
    const B = 'npc.bartolomeu';
    const costMoney = formatMoney(QUEST_COST);
    const balanceMoney = formatMoney(balance);

    const left = { name: playerName, portrait: playerPortrait };
    const right = { name: 'Bartolomeu', portrait: DIALOGUE_PORTRAIT };

    if (balance >= QUEST_COST) {
        const lines = [
            { side: 'right', text: t(`${B}.activeGreet`) },
            { side: 'left', text: t(`${B}.activePlayerHas`, { money: balanceMoney }) },
            {
                side: 'right',
                text: t(`${B}.activeDeliverPrompt`, { money: costMoney }),
                type: 'choice',
                options: [
                    {
                        text: t(`${B}.activeDeliverOpt`, { money: costMoney }),
                        value: 'deliver',
                        next: 3,
                        onSelect: () => {
                            const currency = getSystem('currency');
                            if (currency) currency.spend(QUEST_COST, 'quest_bartolomeu_city');
                            questState = 'completed';
                        },
                    },
                    {
                        text: t(`${B}.activeWaitOpt`),
                        value: 'wait',
                        next: 5,
                    },
                ],
            },
            { side: 'right', text: t(`${B}.activeDelivered`) },
            { side: 'right', text: t(`${B}.activeDiscount`), end: true },
            { side: 'right', text: t(`${B}.activeWait`), end: true },
        ];

        return { left, right, lines };
    } else {
        const lines = [
            { side: 'right', text: t(`${B}.activeNotEnoughGreet`) },
            { side: 'left', text: t(`${B}.activeNotEnoughPlayer`, { money: balanceMoney }) },
            { side: 'right', text: t(`${B}.activeNotEnoughBart`, { money: costMoney }), end: true },
        ];

        return { left, right, lines };
    }
}

function buildCompletedDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const B = 'npc.bartolomeu';

    return {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Bartolomeu', portrait: DIALOGUE_PORTRAIT },
        lines: [
            { side: 'right', text: t(`${B}.completedGreet`) },
            { side: 'left', text: t(`${B}.completedPlayer`) },
            { side: 'right', text: t(`${B}.completedBart`), end: true },
        ],
    };
}

// ─── Quest 2 dialogue builders ────────────────────────────────────────────

function buildQuest2IntroDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const Q = 'npc.bartolomeu.q2';

    const left = { name: playerName, portrait: playerPortrait };
    const right = { name: 'Bartolomeu', portrait: DIALOGUE_PORTRAIT };

    const lines = [];

    // Saudação
    lines.push({ side: 'right', text: tChar(`${Q}.greet`, charId) });
    lines.push({ side: 'left', text: t(`${Q}.playerHi`) });
    lines.push({ side: 'right', text: t(`${Q}.bartExcited`) });
    lines.push({ side: 'left', text: t(`${Q}.playerAbout`) });
    lines.push({ side: 'right', text: t(`${Q}.bartCutsOff`) });

    // Nome do player
    lines.push({ side: 'left', text: tChar(`${Q}.nameIntro`, charId) });

    // Linha extra para Stella
    if (charId === 'stella') {
        lines.push({ side: 'right', text: t(`${Q}.bartAfterNameStella`) });
    }

    // Prazer
    lines.push({ side: 'right', text: tChar(`${Q}.bartPleasure`, charId) });

    // Explicação das lojas
    lines.push({ side: 'right', text: t(`${Q}.bartShops`) });
    lines.push({ side: 'left', text: t(`${Q}.playerCenter`) });
    lines.push({ side: 'right', text: t(`${Q}.bartLaugh`) });

    // ── Escolhas rodada 1 ──
    const continueIdx = lines.length + 1;
    const whatIGetIdx = lines.length + 2;
    const whereSignIdx = lines.length + 3;
    const notTodayIdx = lines.length + 4;

    lines.push({
        side: 'right',
        type: 'choice',
        text: '',
        options: [
            { text: t(`${Q}.choiceContinue`), value: 'continue', next: continueIdx },
            { text: t(`${Q}.choiceWhatIGet`), value: 'what_i_get', next: whatIGetIdx },
            { text: t(`${Q}.choiceWhereSign`), value: 'where_sign', next: whereSignIdx },
            { text: t(`${Q}.choiceNotToday`), value: 'not_today', next: notTodayIdx },
        ],
    });

    // ── continueIdx: explicação detalhada ──
    const explainShopsIdx = lines.length;
    lines.push({ side: 'right', text: t(`${Q}.bartExplainShops`) });
    lines.push({ side: 'left', text: tChar(`${Q}.shopReaction`, charId) });
    lines.push({ side: 'right', text: tChar(`${Q}.bartShopReply`, charId) });

    // Escolhas rodada 2
    const signIdx2 = lines.length + 1;
    const whatGainIdx2 = lines.length + 2;
    const refuseIdx2 = lines.length + 3;

    lines.push({
        side: 'right',
        type: 'choice',
        text: '',
        options: [
            { text: t(`${Q}.choice2Sign`), value: 'sign', next: signIdx2, onSelect: () => onSignContract() },
            { text: t(`${Q}.choice2WhatGain`), value: 'what_gain', next: whatGainIdx2 },
            { text: t(`${Q}.choice2Refuse`), value: 'refuse', next: refuseIdx2, onSelect: () => { quest2State = 'declined'; } },
        ],
    });

    // signIdx2: agradecimento
    const thanksIdx = lines.length;
    lines.push({ side: 'right', text: t(`${Q}.bartThanks`), end: true });

    // whatGainIdx2: explica ganho → volta pro sign
    const explainGainReturnIdx = lines.length + 1;
    lines.push({ side: 'right', text: t(`${Q}.bartExplainGain`) });
    lines.push({
        side: 'right',
        type: 'choice',
        text: '',
        options: [
            { text: t(`${Q}.choice2Sign`), value: 'sign', next: thanksIdx, onSelect: () => onSignContract() },
            { text: t(`${Q}.choice2Refuse`), value: 'refuse', next: refuseIdx2 + 1, onSelect: () => { quest2State = 'declined'; } },
        ],
    });

    // refuseIdx2: suspiro
    lines.push({ side: 'right', text: t(`${Q}.bartSigh`), end: true });

    // ── whatIGetIdx: explicação do ganho direto ──
    // Fix: we need to point continueIdx, whatIGetIdx, whereSignIdx, notTodayIdx
    // They were set before lines were pushed, so let's recalculate:
    // Actually the indices were set correctly because they point to lines.length at that moment.
    // But we pushed more lines since. We need to fix this.

    // The approach: whatIGetIdx, whereSignIdx, notTodayIdx point to lines that don't exist yet.
    // We need to add them now. Let's use a different approach with placeholder patching.

    // We'll mark the actual target indices now:
    const whatIGetActualIdx = lines.length;
    lines.push({ side: 'right', text: t(`${Q}.bartExplainGain`) });
    lines.push({
        side: 'right',
        type: 'choice',
        text: '',
        options: [
            { text: t(`${Q}.choice2Sign`), value: 'sign', next: thanksIdx, onSelect: () => onSignContract() },
            { text: t(`${Q}.choiceNotToday`), value: 'not_today', end: true, onSelect: () => { quest2State = 'declined'; } },
        ],
    });

    // whereSignIdx → direto pro thanks
    const whereSignActualIdx = lines.length;
    lines.push({ side: 'right', text: t(`${Q}.bartThanks`), end: true, action: () => onSignContract() });

    // notTodayIdx → suspiro
    const notTodayActualIdx = lines.length;
    lines.push({ side: 'right', text: t(`${Q}.bartSigh`), end: true, action: () => { quest2State = 'declined'; } });

    // Patch the choice options to point to the correct indices
    const choiceLine = lines[continueIdx - 1]; // the choice line
    choiceLine.options[0].next = explainShopsIdx;
    choiceLine.options[1].next = whatIGetActualIdx;
    choiceLine.options[2].next = whereSignActualIdx;
    choiceLine.options[3].next = notTodayActualIdx;

    return { left, right, lines };
}

function buildQuest2DeclinedDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const Q = 'npc.bartolomeu.q2';

    const left = { name: playerName, portrait: playerPortrait };
    const right = { name: 'Bartolomeu', portrait: DIALOGUE_PORTRAIT };

    const lines = [];

    // 0: saudação
    lines.push({ side: 'right', text: t(`${Q}.declinedGreet`) });

    // 1: escolhas (indices patched below)
    lines.push({
        side: 'left',
        type: 'choice',
        text: '',
        options: [
            { text: t(`${Q}.declinedExplain`), value: 'explain', next: 0 },
            { text: t(`${Q}.declinedSign`), value: 'sign', next: 0 },
            { text: t(`${Q}.declinedVisit`), value: 'visit', next: 0 },
        ],
    });
    const choiceLine = lines[1];

    // explainIdx → explicação + escolha assinar/recusar
    const explainIdx = lines.length;
    lines.push({ side: 'right', text: t(`${Q}.bartExplainShops`) });

    const thanksLineIdx = lines.length + 1; // will be pushed 2 lines ahead
    lines.push({
        side: 'right',
        type: 'choice',
        text: '',
        options: [
            { text: t(`${Q}.choice2Sign`), value: 'sign', next: 0, onSelect: () => onSignContract() },
            { text: t(`${Q}.choice2Refuse`), value: 'refuse', end: true, onSelect: () => { quest2State = 'declined'; } },
        ],
    });

    // signIdx → assinar direto
    const signIdx = lines.length;
    lines.push({ side: 'right', text: t(`${Q}.bartThanks`), end: true, action: () => onSignContract() });

    // Patch the thanks target in the explain choice
    lines[explainIdx + 1].options[0].next = signIdx;

    // visitIdx → reação por personagem
    const visitIdx = lines.length;
    if (charId === 'stella') {
        lines.push({ side: 'right', text: tChar(`${Q}.bartVisitReply`, charId) });
        lines.push({ side: 'left', text: t(`${Q}.stellaVisitReply`), end: true });
    } else {
        lines.push({ side: 'right', text: tChar(`${Q}.bartVisitReply`, charId), end: true });
    }

    // Patch choice indices
    choiceLine.options[0].next = explainIdx;
    choiceLine.options[1].next = signIdx;
    choiceLine.options[2].next = visitIdx;

    return { left, right, lines };
}

function buildQuest2ActiveDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const Q = 'npc.bartolomeu.q2';
    const T = 'npc.bartolomeu.tax';

    const left = { name: playerName, portrait: playerPortrait };
    const right = { name: 'Bartolomeu', portrait: DIALOGUE_PORTRAIT };

    const lines = [];

    if (taxPending) {
        const taxAmount = calculateTax();
        lines.push({ side: 'right', text: t(`${T}.reminder`, { value: taxAmount }) });

        lines.push({
            side: 'left',
            type: 'choice',
            text: '',
            options: [
                {
                    text: t(`${T}.payOption`, { value: taxAmount }),
                    value: 'pay',
                    next: 2,
                    onSelect: () => payTax(),
                },
                {
                    text: t(`${T}.laterOption`),
                    value: 'later',
                    next: 3,
                },
            ],
        });

        lines.push({ side: 'right', text: t(`${T}.thanksPaid`), end: true });
        lines.push({ side: 'right', text: t(`${T}.warnLater`), end: true });
    } else {
        // No tax pending → free dialogue per character
        return buildBartolomeuFreeDialogue();
    }

    return { left, right, lines };
}

/**
 * Free dialogue available after both quest 1 and quest 2 are complete (contract signed).
 * Branches per character on the "just passing by" choice.
 */
function buildBartolomeuFreeDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const F = 'npc.bartolomeu.free';

    const left = { name: playerName, portrait: playerPortrait };
    const right = { name: 'Bartolomeu', portrait: DIALOGUE_PORTRAIT };

    const lines = [];

    // 0: greeting with player name
    lines.push({ side: 'right', text: t(`${F}.greet`, { name: playerName }) });

    // 1: choice (indices patched after we push the branches)
    const choiceLine = {
        side: 'left',
        type: 'choice',
        text: '',
        options: [
            { text: t(`${F}.choicePassing`), value: 'passing', next: 0 },
            { text: t(`${F}.choiceShops`), value: 'shops', next: 0 },
        ],
    };
    lines.push(choiceLine);

    // ── Branch A: "just passing by" → per character ──
    const passingIdx = lines.length;

    if (charId === 'graham') {
        // B asks military, Graham answers, B reminisces, end
        lines.push({ side: 'right', text: t(`${F}.graham.l1`) });
        lines.push({ side: 'left',  text: t(`${F}.graham.l2`) });
        lines.push({ side: 'right', text: t(`${F}.graham.l3`) });
        lines.push({ side: 'left',  text: t(`${F}.graham.l4`) });
        lines.push({ side: 'right', text: t(`${F}.graham.l5`), thought: true });
        lines.push({ side: 'right', text: t(`${F}.graham.l6`), thought: true });
        lines.push({ side: 'left',  text: t(`${F}.graham.l7`), thought: true, end: true });
    } else if (charId === 'ben') {
        lines.push({ side: 'right', text: t(`${F}.ben.l1`) });
        lines.push({ side: 'left',  text: t(`${F}.ben.l2`) });
        lines.push({ side: 'right', text: t(`${F}.ben.l3`) });
        lines.push({ side: 'left',  text: t(`${F}.ben.l4`) });
        lines.push({ side: 'right', text: t(`${F}.ben.l5`), thought: true });
        lines.push({ side: 'left',  text: t(`${F}.ben.l6`) });
        lines.push({ side: 'right', text: t(`${F}.ben.l7`) });
        lines.push({ side: 'left',  text: t(`${F}.ben.l8`), thought: true, end: true });
    } else {
        // Stella default
        lines.push({ side: 'right', text: t(`${F}.stella.l1`) });
        lines.push({ side: 'left',  text: t(`${F}.stella.l2`), thought: true });
        lines.push({ side: 'left',  text: t(`${F}.stella.l3`) });
        lines.push({ side: 'right', text: t(`${F}.stella.l4`) });
        lines.push({ side: 'left',  text: t(`${F}.stella.l5`), thought: true });
        lines.push({ side: 'right', text: t(`${F}.stella.l6`) });
        lines.push({ side: 'left',  text: t(`${F}.stella.l7`) });
        lines.push({ side: 'right', text: t(`${F}.stella.l8`), thought: true });
        lines.push({ side: 'left',  text: t(`${F}.stella.l9`), thought: true, end: true });
    }

    // ── Branch B: "what shops?" ──
    const shopsIdx = lines.length;
    lines.push({ side: 'right', text: t(`${F}.shops.l1`) });
    lines.push({ side: 'left',  text: t(`${F}.shops.l2`) });
    lines.push({ side: 'left',  text: t(`${F}.shops.l3`), thought: true, end: true });

    // Patch choice indices
    choiceLine.options[0].next = passingIdx;
    choiceLine.options[1].next = shopsIdx;

    return { left, right, lines };
}

/** Called when player signs the contract */
function onSignContract() {
    quest2State = 'accepted';

    // Add contract letter to inventory
    const inv = getSystem('inventory');
    if (inv) {
        inv.addItem(100, 1); // item 100 = contract letter
    }

    // Start tax system
    startTaxSystem();

    logger.info('[Bartolomeu] Quest 2 accepted — contract signed, tax system started');
}

// ─── Tax System ────────────────────────────────────────────────────────────

let taxListenerActive = false;
let taxPending = false;     // true when a tax is due but not yet paid
let taxDueDay = 0;          // day the current tax was issued
let taxOverdue = false;     // true if 10 days passed without paying → blocks merchants

function calculateTax() {
    let tax = TAX_BASE;

    const fenceCount = placedBuildings.filter(b =>
        b.type === 'FENCE' || b.type === 'FENCEX' || b.type === 'FENCEY'
    ).length;
    tax += Math.floor(fenceCount / TAX_FENCE_THRESHOLD) * TAX_FENCE_INCREMENT;

    tax += Math.floor(placedWells.length / TAX_WELL_THRESHOLD) * TAX_WELL_INCREMENT;

    return Math.round(tax * 100) / 100;
}

/** Called every day — issues tax or checks overdue */
function onDayChanged(e) {
    if (quest2State !== 'accepted') return;

    const day = e.detail?.day;
    if (!day) return;

    // Check if pending tax became overdue (10 days without paying)
    if (taxPending && day >= taxDueDay + TAX_INTERVAL_DAYS) {
        taxOverdue = true;
        logger.warn(`[Tax] Overdue! Lara and Thomas blocked since day ${taxDueDay}`);
    }

    // Issue new tax every TAX_INTERVAL_DAYS
    if (day % TAX_INTERVAL_DAYS === 0 && lastTaxDay < day) {
        taxPending = true;
        taxDueDay = day;

        const taxAmount = calculateTax();
        document.dispatchEvent(new CustomEvent('showNotification', {
            detail: { message: t('npc.bartolomeu.tax.reminder', { value: taxAmount }) }
        }));

        logger.info(`[Tax] Tax of ${taxAmount} due on day ${day}`);
    }
}

/** Pay the current pending tax. Returns true if paid. */
function payTax() {
    if (!taxPending) return false;

    const taxAmount = calculateTax();
    const currency = getSystem('currency');

    if (!currency || currency.getMoney() < taxAmount) {
        document.dispatchEvent(new CustomEvent('showNotification', {
            detail: { message: t('npc.bartolomeu.tax.notEnough') }
        }));
        return false;
    }

    currency.spend(taxAmount, 'tax_bartolomeu');
    taxPending = false;
    taxOverdue = false;
    lastTaxDay = taxDueDay;

    document.dispatchEvent(new CustomEvent('showNotification', {
        detail: { message: t('npc.bartolomeu.tax.paid', { value: taxAmount }) }
    }));

    logger.info(`[Tax] Paid ${taxAmount}`);
    return true;
}

/** Returns true if tax is pending */
function isTaxPending() { return taxPending; }

/** Returns true if merchant is blocked due to overdue tax */
function isMerchantBlocked(merchantId) {
    if (!taxOverdue) return false;
    // Only Rico is exempt
    return merchantId !== 'rico';
}

function startTaxSystem() {
    if (taxListenerActive) return;
    taxListenerActive = true;
    document.addEventListener('dayChanged', onDayChanged);
    logger.info('[Bartolomeu] Tax system started');
}

// ─── Interaction handler ────────────────────────────────────────────────────

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[Bartolomeu] DialogueSystem not available');
        return;
    }

    let config;

    // Quest 1 flow
    if (questState !== 'completed') {
        switch (questState) {
            case 'intro':
                config = buildFirstDialogue();
                break;
            case 'declined':
                config = buildDeclinedDialogue();
                break;
            case 'accepted':
                config = buildQuestActiveDialogue();
                break;
            default:
                config = buildFirstDialogue();
        }
    }
    // Quest 2 flow (after quest 1 completed)
    else {
        switch (quest2State) {
            case 'idle':
                quest2State = 'intro';
                config = buildQuest2IntroDialogue();
                break;
            case 'intro':
                config = buildQuest2IntroDialogue();
                break;
            case 'declined':
                config = buildQuest2DeclinedDialogue();
                break;
            case 'accepted':
                config = buildQuest2ActiveDialogue();
                break;
            default:
                config = buildQuest2IntroDialogue();
        }
    }

    dlg.start(config);
}

// ─── Register NPC ───────────────────────────────────────────────────────────

function register() {
    const npcSys = getSystem('npc');
    if (!npcSys) {
        logger.warn('[Bartolomeu] NpcSystem not available, retrying...');
        setTimeout(register, 500);
        return;
    }

    npcSys.addNpc({
        ...BARTOLOMEU,
        onInteract,
    });

    // Check weather periodically to swap sprite (umbrella when raining/storming)
    setInterval(updateSpriteForWeather, 2000);
    updateSpriteForWeather();

    logger.info('[Bartolomeu] NPC registered in city');
}

/** Swaps Bartolomeu's sprite based on current weather */
function updateSpriteForWeather() {
    const npcSys = getSystem('npc');
    if (!npcSys || !npcSys.updateSprite) return;

    try {
        // WeatherSystem is a legacy global or can be accessed via import
        const weather = getSystem('weather') || window.WeatherSystem;
        if (!weather) return;

        const condition = weather.weatherType;
        const isRainy = condition === 'rain' || condition === 'storm';
        npcSys.updateSprite(
            BARTOLOMEU.id,
            isRainy ? SPRITE_UMBRELLA : SPRITE_NORMAL,
            isRainy ? SPRITE_UMBRELLA_DIMS : SPRITE_NORMAL_DIMS
        );
    } catch (_) { /* weather not ready yet */ }
}

/** Returns all quest state for save system */
function getQuestState() {
    return {
        quest1: questState,
        quest2: quest2State,
        lastTaxDay,
        taxPending,
        taxDueDay,
        taxOverdue,
    };
}

/** Restores quest state from save system */
function setQuestState(state) {
    // Support legacy string format (quest 1 only)
    if (typeof state === 'string') {
        if (['intro', 'declined', 'accepted', 'completed'].includes(state)) {
            questState = state;
        }
        return;
    }

    // New object format
    if (state && typeof state === 'object') {
        if (state.quest1 && ['intro', 'declined', 'accepted', 'completed'].includes(state.quest1)) {
            questState = state.quest1;
        }
        if (state.quest2 && ['idle', 'intro', 'declined', 'accepted'].includes(state.quest2)) {
            quest2State = state.quest2;
        }
        if (typeof state.lastTaxDay === 'number') lastTaxDay = state.lastTaxDay;
        if (typeof state.taxPending === 'boolean') taxPending = state.taxPending;
        if (typeof state.taxDueDay === 'number') taxDueDay = state.taxDueDay;
        if (typeof state.taxOverdue === 'boolean') taxOverdue = state.taxOverdue;

        // Re-activate tax system if quest2 was accepted
        if (quest2State === 'accepted') {
            startTaxSystem();
        }
    }
}

const bartolomeuAPI = {
    register, getQuestState, setQuestState,
    // Tax API — used by houseSystem and merchant
    isTaxPending, isMerchantBlocked, payTax, calculateTax,
};
registerSystem('npcBartolomeu', bartolomeuAPI);

register();

export default bartolomeuAPI;