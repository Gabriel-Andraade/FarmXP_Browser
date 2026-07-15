/**
 * @file npcJeremy.js - NPC Jeremy, um dos gêmeos
 * @description Registra o NPC Jeremy na cidade com sprite idle e hitbox.
 * Desaparece às 19:00 e reaparece às 6:10.
 * @module NpcJeremy
 */

import { getSystem, registerSystem } from '../gameState.js';
import { i18n } from '../i18n/i18n.js';
import { getItem } from '../itemUtils.js';
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

// Quest "comida da fazenda pro Jeremy". Ele aceita QUALQUER produto alimentício
// da fazenda (type 'food' = colheitas, + ovo/leite), MENOS o que a Lara vende
// (comida de mercado). IDs da Lara em merchant.js.
const LARA_FOOD_IDS = new Set([5, 6, 23, 24, 25, 26, 27, 28]);
const FARM_ANIMAL_FOOD_IDS = new Set([60, 61]); // Ovo Cru, Leite (type 'resource')
/** Valor que o Jeremy paga se o player negociou preço (opção da Stella). */
const JEREMY_FOOD_PRICE = 90;

// ─── State ──────────────────────────────────────────────────────────────────

let isVisible = true;
let pendingChange = null; // 'show' | 'hide' | null

// Handles dos intervals para evitar vazamento em hot-reload / re-registro.
let visibilityIntervalId = null;
let pendingIntervalId = null;

/** Estado do diálogo: 'idle' | 'rejected' (já foi ignorado uma vez) */
let dialogueState = 'idle';

/** Dia (WeatherSystem.day) do primeiro diálogo (o ignore). O pedido de comida
 *  só aparece no dia SEGUINTE (igual à quest da Bru). */
let introDoneDay = null;

/** Passo 1 da quest: 'idle' | 'declined' | 'accepted' | 'delivered'. */
let supplyQuest = 'idle';
/** Se o player negociou o preço (opção da Stella) — Jeremy paga na entrega. */
let priceAgreed = false;
/** Nome do item entregue (pro Gancho da quest de escolhas: "obrigado por trazer X"). */
let deliveredFoodName = '';

/** Passo 2 (quest de escolhas): 'idle' | 'done'. */
let choicesQuest = 'idle';
/** Traços acumulados (motor de personalidade) + resultado final. */
let jeremyTraits = { C: 0, R: 0, Re: 0 };
let jeremyChoice = null; // 'sozinho' | 'com_a_familia'
// Transitórios (só durante o diálogo de escolhas): ordem dos traços + escolha da Etapa 4.
let traitOrder = [];
let stage4Choice = null;

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
            if (typeof WeatherSystem?.day === 'number') introDoneDay = WeatherSystem.day;
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

// ─── Quest passo 1: comida da fazenda ───────────────────────────────────────

function markDirtySave() {
    try { getSystem('save')?.markDirty?.(); } catch (_) { /* ignore */ }
}

/** O pedido de comida só libera no dia SEGUINTE ao primeiro diálogo (igual Bru). */
function hasRequestDayArrived() {
    if (dialogueState !== 'rejected') return false;
    if (typeof introDoneDay !== 'number') return false;
    const today = (typeof WeatherSystem?.day === 'number') ? WeatherSystem.day : introDoneDay;
    return today > introDoneDay;
}

/** Item conta como "comida da fazenda"? (type 'food' ou ovo/leite, exceto Lara). */
function isFarmFood(id) {
    if (LARA_FOOD_IDS.has(id)) return false;
    if (FARM_ANIMAL_FOOD_IDS.has(id)) return true;
    const item = getItem(id);
    return !!item && item.type === 'food';
}

/** Retorna o id de um produto da fazenda no inventário do player, ou null. */
function findFarmFoodInInventory() {
    const inv = getSystem('inventory');
    const cats = inv?.getInventory?.();
    if (!cats) return null;
    for (const cat of Object.values(cats)) {
        for (const it of (cat.items || [])) {
            if (it && it.quantity > 0 && isFarmFood(it.id)) return it.id;
        }
    }
    return null;
}

function acceptSupply(withPrice) {
    supplyQuest = 'accepted';
    priceAgreed = !!withPrice;
    markDirtySave();
}

function declineSupply() {
    supplyQuest = 'declined';
    markDirtySave();
}

function deliverFood(foodId) {
    const inv = getSystem('inventory');
    if (!inv?.removeItem || !inv.removeItem(foodId, 1)) return;
    deliveredFoodName = getItem(foodId)?.name || '';
    supplyQuest = 'delivered';
    if (priceAgreed) {
        const currency = getSystem('currency');
        if (currency?.earn) currency.earn(JEREMY_FOOD_PRICE, 'quest:jeremy_food');
    }
    markDirtySave();
}

/** Resolve _label/_goto em índices numéricos `next` (linha e opções de escolha). */
function resolveDialogueLabels(config) {
    const { lines } = config;
    const labelIndex = {};
    lines.forEach((line, i) => { if (line._label) labelIndex[line._label] = i; });
    for (const line of lines) {
        if (line._goto != null) { line.next = labelIndex[line._goto]; delete line._goto; }
        if (Array.isArray(line.options)) {
            for (const opt of line.options) {
                if (opt._goto != null) { opt.next = labelIndex[opt._goto]; delete opt._goto; }
            }
        }
        delete line._label;
    }
    return config;
}

function jeremyLine(enc) {
    const kind = enc.slice(0, 1);
    const text = enc.slice(2);
    if (kind === 'J') return { side: 'right', text, setPortrait: { side: 'right', src: JEREMY_DIALOG_01 } };
    if (kind === 'N') return { side: 'left', text, thought: true, narration: true };
    return { side: 'left', text }; // 'M'
}

function jeremySeg(key) {
    const v = t(`npc.jeremy.supply.${key}`);
    return Array.isArray(v) ? v.map(jeremyLine) : [];
}

function jeremyStr(key) {
    return t(`npc.jeremy.supply.${key}`);
}

/**
 * Pedido de comida (dia seguinte ao ignore). `short` = reoferta curta após recusa.
 */
function buildRequestDialogue(short) {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Jeremy', portrait: JEREMY_DIALOG_01 },
        lines: [],
    };
    const L = config.lines;
    const jer = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: JEREMY_DIALOG_01 }, ...extra });

    if (charId === 'ben') {
        if (short) L.push(jer(jeremyStr('benReask')));
        else L.push(...jeremySeg('benIntro'));
        L.push({ side: 'left', text: '', _label: 'options', type: 'choice', options: [
            { text: jeremyStr('optBring'), _goto: 'thanks', onSelect: () => acceptSupply(false) },
            { text: jeremyStr('optWhat'), _goto: 'explain' },
            { text: jeremyStr('optDecline'), _goto: 'declineEnd', onSelect: declineSupply },
        ] });
        L.push(jer(jeremyStr('benExplain'), { _label: 'explain', _goto: 'options' }));
        L.push(jer(jeremyStr('thanks'), { _label: 'thanks', end: true }));
        L.push(jer(jeremyStr('declineBen'), { _label: 'declineEnd', end: true }));

    } else if (charId === 'graham') {
        if (short) L.push(jer(jeremyStr('grahamReask')));
        else L.push(...jeremySeg('grahamIntro'));
        L.push({ side: 'left', text: '', _label: 'options', type: 'choice', options: [
            { text: jeremyStr('optBring'), _goto: 'thanks', onSelect: () => acceptSupply(false) },
            { text: jeremyStr('optWhat'), _goto: 'explain' },
            { text: jeremyStr('optDecline'), _goto: 'declineEnd', onSelect: declineSupply },
        ] });
        L.push(jer(jeremyStr('grahamExplain'), { _label: 'explain', _goto: 'options' }));
        L.push(jer(jeremyStr('thanks'), { _label: 'thanks', end: true }));
        L.push(jer(jeremyStr('declineGraham'), { _label: 'declineEnd', end: true }));

    } else {
        if (short) L.push(jer(jeremyStr('stellaReask')));
        else L.push(...jeremySeg('stellaIntro'));
        L.push({ side: 'left', text: '', _label: 'options', type: 'choice', options: [
            { text: jeremyStr('optBringStella'), _goto: 'thanks', onSelect: () => acceptSupply(false) },
            { text: jeremyStr('optPrice'), _goto: 'price' },
            { text: jeremyStr('optDeclineStella'), _goto: 'declineEnd', onSelect: declineSupply },
        ] });
        const priceLines = jeremySeg('stellaPrice');
        if (priceLines.length) {
            priceLines[0]._label = 'price';
            const last = priceLines[priceLines.length - 1];
            last.action = () => acceptSupply(true);
            last._goto = 'thanks';
        }
        L.push(...priceLines);
        L.push(jer(jeremyStr('thanks'), { _label: 'thanks', end: true }));
        L.push(jer(jeremyStr('declineStella'), { _label: 'declineEnd', end: true }));
    }

    return resolveDialogueLabels(config);
}

/** Entrega da comida (estado 'accepted'). */
function buildDeliveryDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Jeremy', portrait: JEREMY_DIALOG_01 },
        lines: [],
    };
    const L = config.lines;

    const foodId = findFarmFoodInInventory();
    if (foodId == null) {
        const reminder = jeremySeg('deliveryReminder');
        if (reminder.length) reminder[reminder.length - 1].end = true;
        L.push(...reminder);
        return config;
    }

    const give = jeremySeg('deliveryGive');
    if (give.length) {
        const last = give[give.length - 1];
        last.end = true;
        last.action = () => deliverFood(foodId);
    }
    L.push(...give);
    return config;
}

// ─── Passo 2: quest de escolhas (motor de personalidade) ────────────────────

/**
 * Motor genérico e REUTILIZÁVEL: dada a contagem de traços e a ordem em que
 * foram pontuados, retorna o traço dominante. Desempate: (1) o traço pontuado
 * mais recentemente entre os empatados; (2) prioridade fixa Re > C > R.
 */
function resolveDominantTrait(counts, order) {
    const keys = Object.keys(counts);
    const max = Math.max(...keys.map((k) => counts[k] || 0));
    const tied = keys.filter((k) => (counts[k] || 0) === max);
    if (tied.length === 1) return tied[0];
    for (let i = order.length - 1; i >= 0; i--) {
        if (tied.includes(order[i])) return order[i];
    }
    for (const p of ['Re', 'C', 'R']) if (tied.includes(p)) return p;
    return tied[0];
}

// Estrutura da quest de escolhas do Jeremy. O TEXTO fica no i18n
// (npc.jeremy.choices.*); aqui ficam só os traços, o seletor X/Y e o resultado.
// Cada opção não-final dá +1 no `trait`; a Etapa 4 (2 opções) é o seletor final
// (`choice`) e NÃO soma no dominante.
const JEREMY_CHOICES = {
    reward: { xp: 80 }, // ajustável
    ganchoKey: 'gancho',
    stages: [
        { setupKey: 'stage1setup', options: [
            { textKey: 'stage1optA', trait: 'C', reactionKey: 'stage1reactA' },
            { textKey: 'stage1optB', trait: 'Re', reactionKey: 'stage1reactB' },
            { textKey: 'stage1optC', trait: 'R', reactionKey: 'stage1reactC' },
        ] },
        { setupKey: 'stage2setup', options: [
            { textKey: 'stage2optD', trait: 'R', reactionKey: 'stage2reactD' },
            { textKey: 'stage2optE', trait: 'Re', reactionKey: 'stage2reactE' },
            { textKey: 'stage2optF', trait: 'C', reactionKey: 'stage2reactF' },
        ] },
        { setupKey: 'stage3setup', options: [
            { textKey: 'stage3optL', trait: 'C', reactionKey: 'stage3reactL' },
            { textKey: 'stage3optM', trait: 'R', reactionKey: 'stage3reactM' },
            { textKey: 'stage3optN', trait: 'R', reactionKey: 'stage3reactN' },
        ] },
        { setupKey: 'stage4setup', options: [
            { textKey: 'stage4optX', choice: 'X' },
            { textKey: 'stage4optY', choice: 'Y' },
        ] },
    ],
    endings: {
        'Re:X': { result: 'com_a_familia', linesKey: 'endReX' },
        'Re:Y': { result: 'com_a_familia', linesKey: 'endReY' },
        'C:X':  { result: 'com_a_familia', linesKey: 'endCX' },
        'C:Y':  { result: 'com_a_familia', linesKey: 'endCY' },
        'R:X':  { result: 'com_a_familia', linesKey: 'endRX' },
        'R:Y':  { result: 'sozinho',       linesKey: 'endRY' },
    },
};

/** "J|texto" (Jeremy) / "M|texto" (player), interpolando {food}. */
function choiceLineDecode(enc) {
    const kind = enc.slice(0, 1);
    const text = enc.slice(2).split('{food}').join(deliveredFoodName || 'aquilo');
    if (kind === 'J') return { side: 'right', text, setPortrait: { side: 'right', src: JEREMY_DIALOG_01 } };
    return { side: 'left', text };
}

function jChoiceStr(key) { return t(`npc.jeremy.choices.${key}`); }
function jChoiceSeg(key) {
    const v = t(`npc.jeremy.choices.${key}`);
    return Array.isArray(v) ? v.map(choiceLineDecode) : [];
}

/**
 * Diálogo de escolhas (Gancho + 4 etapas). Cada opção, ao ser clicada, mostra a
 * FALA do player + a reação (multi-fala) do Jeremy, e soma o traço. No fim
 * (onEnd), o motor calcula o dominante e emenda no final.
 */
function buildChoicesDialogue() {
    jeremyTraits = { C: 0, R: 0, Re: 0 };
    traitOrder = [];
    stage4Choice = null;

    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Jeremy', portrait: JEREMY_DIALOG_01 },
        lines: [],
        onEnd: finishJeremyChoices,
    };
    const L = config.lines;

    L.push(...jChoiceSeg(JEREMY_CHOICES.ganchoKey));

    const stages = JEREMY_CHOICES.stages;
    stages.forEach((stage, si) => {
        const isFinal = si === stages.length - 1;

        const setupStart = L.length;
        L.push(...jChoiceSeg(stage.setupKey));
        L[setupStart]._label = `s${si}setup`;

        L.push({
            side: 'left',
            text: '',
            type: 'choice',
            options: stage.options.map((opt, oi) => ({
                text: jChoiceStr(opt.textKey),
                _goto: `s${si}o${oi}`,
                onSelect: isFinal
                    ? () => { stage4Choice = opt.choice; }
                    : () => { jeremyTraits[opt.trait] = (jeremyTraits[opt.trait] || 0) + 1; traitOrder.push(opt.trait); },
            })),
        });

        stage.options.forEach((opt, oi) => {
            const secStart = L.length;
            L.push({ side: 'left', text: jChoiceStr(opt.textKey) }); // mostra a opção clicada como fala do player
            if (opt.reactionKey) L.push(...jChoiceSeg(opt.reactionKey));
            L[secStart]._label = `s${si}o${oi}`;
            const last = L[L.length - 1];
            if (isFinal) last.end = true;
            else last._goto = `s${si + 1}setup`;
        });
    });

    return resolveDialogueLabels(config);
}

/** Roda no onEnd das escolhas: calcula dominante, grava resultado + recompensa, e emenda no final. */
function finishJeremyChoices() {
    const dominant = resolveDominantTrait(jeremyTraits, traitOrder);
    const ending = JEREMY_CHOICES.endings[`${dominant}:${stage4Choice}`] || JEREMY_CHOICES.endings['R:Y'];
    jeremyChoice = ending.result;
    choicesQuest = 'done';
    const xp = getSystem('xp');
    if (xp?.grantXP && JEREMY_CHOICES.reward.xp) xp.grantXP(JEREMY_CHOICES.reward.xp, 'quest:jeremy_choices');
    markDirtySave();
    getSystem('dialogue')?.start(buildEndingDialogue(ending.linesKey));
}

function buildEndingDialogue(linesKey) {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Jeremy', portrait: JEREMY_DIALOG_01 },
        lines: jChoiceSeg(linesKey),
    };
    if (config.lines.length) config.lines[config.lines.length - 1].end = true;
    return config;
}

/** Fala curta pós-quest (reflete o resultado). */
function buildPostChoicesDialogue() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const text = jChoiceStr(jeremyChoice === 'sozinho' ? 'postSozinho' : 'postComFamilia');
    return {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Jeremy', portrait: JEREMY_DIALOG_01 },
        lines: [{ side: 'right', text, setPortrait: { side: 'right', src: JEREMY_DIALOG_01 }, end: true }],
    };
}

// ─── Interaction handler ────────────────────────────────────────────────────

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[Jeremy] DialogueSystem not available');
        return;
    }

    // Primeiro contato: o ignore (marca 'rejected' + o dia).
    if (dialogueState === 'idle') {
        dlg.start(buildIdleDialogue());
        return;
    }

    // Comida entregue → passo 2: quest de escolhas (e depois a fala pós-quest).
    if (supplyQuest === 'delivered') {
        if (choicesQuest === 'idle') { dlg.start(buildChoicesDialogue()); return; }
        dlg.start(buildPostChoicesDialogue());
        return;
    }
    if (supplyQuest === 'accepted') { dlg.start(buildDeliveryDialogue()); return; }
    if (supplyQuest === 'declined') { dlg.start(buildRequestDialogue(true)); return; }

    if (hasRequestDayArrived()) {
        dlg.start(buildRequestDialogue(false));
        return;
    }

    // Mesmo dia do ignore: só o aceno/pós-evento.
    dlg.start(buildPostEventDialogue());
}

// ─── Save / Load ────────────────────────────────────────────────────────────

function getQuestState() {
    return {
        dialogue: dialogueState, introDoneDay, supplyQuest, priceAgreed,
        deliveredFoodName, choicesQuest, jeremyTraits, jeremyChoice,
    };
}

function setQuestState(data) {
    if (!data) return;
    if (typeof data === 'string') {
        dialogueState = data;
        return;
    }
    if (data.dialogue) dialogueState = data.dialogue;
    if (typeof data.introDoneDay === 'number') introDoneDay = data.introDoneDay;
    if (data.supplyQuest) supplyQuest = data.supplyQuest;
    if (typeof data.priceAgreed === 'boolean') priceAgreed = data.priceAgreed;
    if (typeof data.deliveredFoodName === 'string') deliveredFoodName = data.deliveredFoodName;
    if (data.choicesQuest) choicesQuest = data.choicesQuest;
    if (data.jeremyTraits && typeof data.jeremyTraits === 'object') jeremyTraits = data.jeremyTraits;
    if (data.jeremyChoice) jeremyChoice = data.jeremyChoice;
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

    if (visibilityIntervalId) clearInterval(visibilityIntervalId);
    if (pendingIntervalId) clearInterval(pendingIntervalId);
    visibilityIntervalId = setInterval(updateVisibility, 2000);
    pendingIntervalId = setInterval(checkPendingChange, 500);

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