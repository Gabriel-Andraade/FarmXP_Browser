/**
 * @file lunaChick.js - Quest "O pintinho" (Luna).
 * @description Luna quer um filhote pra cuidar.
 *
 * Estrutura das cenas (definida pelo roteiro em `quest.md`):
 *   - Cena 1 (John/Molly): a discussão, o pedido da Luna, e a decisão.
 *     Ao ACEITAR, a escolha do filhote acontece ali mesmo, encadeada na
 *     conversa — eles participam.
 *   - Cena 2 (voltando pra fazenda): só existe se o player RECUSOU. Ele muda
 *     de ideia sozinho e escolhe o filhote em pensamento: John e Luna não
 *     sabem, é surpresa.
 *
 * As três opções batem exatamente com as famílias que o `breedingSystem` já
 * cria (`poultry` → Chick, `sheep` → Lamb, `pig` → Piglet): a quest não
 * inventa sistema nem arte.
 *
 * @module LunaChickQuest
 */

import { getSystem } from '../../gameState.js';
import { getItem } from '../../itemUtils.js';
import { t } from '../../i18n/i18n.js';
import { personalitySystem } from '../../npcs/personalitySystem.js';
import {
    PORTRAITS,
    getPlayerName,
    getPlayerDialogPortrait,
    makeSpeakerSwap,
    pickByCharacter,
    resolveDialogueLabels,
} from './dialogueHelpers.js';

const K = 'npc.family.lunaChick';

/**
 * Filhote → família do breedingSystem + item que representa ele no inventário.
 *
 * `itemId` reusa os itens de compra de animal que já existem (300/301/302,
 * `type: 'animal'`): recolher o filhote do mundo devolve exatamente o item que
 * o colocaria de volta. Sem item novo, sem ícone novo.
 */
export const PET_CHOICES = {
    chick:  { young: 'Chick',  family: 'poultry', itemId: 300 },
    lamb:   { young: 'Lamb',   family: 'sheep',   itemId: 301 },
    piglet: { young: 'Piglet', family: 'pig',     itemId: 302 },
};

/**
 * `idle` → cena 1 ainda não rolou
 * `refused` → recusou; a cena 2 (surpresa, na fazenda) ainda vai rolar
 * `waiting_birth` → filhote escolhido, esperando nascer
 * `carrying` → filhote recolhido do mundo, no inventário, a caminho da Luna
 * `delivered` → entregue (cena 3, fora deste escopo)
 */
let state = 'idle';
let answer = null;   // 'promise' | 'father' | 'refuse'
let pet = null;      // 'chick' | 'lamb' | 'piglet'
let route = null;    // 'molly' | 'insist' | 'quiet' — como a entrega foi feita

const markDirty = () => getSystem('save')?.markDirty?.();

/** Ação (itálico cinza). Pensamento usa `thought: true` (só cinza). */
const asAction = (text) => `*${text}*`;

// ─── Ordem do arco ───────────────────────────────────────────────────────────

/**
 * A quest da Luna vem DEPOIS da garrafa de leite (John) e do segredo (Lucas).
 * Sem isso ela atropelava as duas — o jogador conhecia a família pela Luna
 * antes de ter vivido a intro do John.
 *
 * @returns {boolean}
 */
let _skipPrereqs = false;

function prerequisitesMet() {
    if (_skipPrereqs) return true;

    const johnMilk = getSystem('npcJohn')?.getQuestState?.()?.milkQuest;
    const lucasSecret = getSystem('npcLucas')?.getQuestState?.()?.secretQuest;

    const doneJohn = johnMilk === 'delivered' || johnMilk === 'declined';
    const doneLucas = lucasSecret === 'delivered' || lucasSecret === 'declined';
    return doneJohn && doneLucas;
}

/** Por que a quest não está disponível (pra devtool). */
function whyBlocked() {
    if (state !== 'idle') return `state = '${state}' (só dispara em 'idle')`;
    if (_skipPrereqs) return null;

    const johnMilk = getSystem('npcJohn')?.getQuestState?.()?.milkQuest ?? '(npcJohn não carregado)';
    const lucasSecret = getSystem('npcLucas')?.getQuestState?.()?.secretQuest ?? '(npcLucas não carregado)';
    if (prerequisitesMet()) return null;
    return `pré-requisitos: john.milkQuest = '${johnMilk}', lucas.secretQuest = '${lucasSecret}' (ambos precisam ser 'delivered' ou 'declined')`;
}

// ─── Cena 1: o encontro ──────────────────────────────────────────────────────

export function buildScene1() {
    const config = {
        left:  { name: getPlayerName(), portrait: getPlayerDialogPortrait() },
        right: { name: 'John', portrait: PORTRAITS.john },
        lines: [],
    };
    const L = config.lines;
    const toJohn  = makeSpeakerSwap(config, 'John');
    const toMolly = makeSpeakerSwap(config, 'Molly');
    const toLuna  = makeSpeakerSwap(config, 'Luna');

    const say = (who, key, portrait) => L.push({
        side: 'right',
        text: t(`${K}.${key}`),
        setPortrait: { side: 'right', src: portrait },
        action: who,
    });

    // Começa no meio da discussão — a família já estava nisso.
    say(toJohn,  'johnNo',       PORTRAITS.john);
    say(toMolly, 'mollyVisit',   PORTRAITS.molly);
    say(toJohn,  'johnAsk',      PORTRAITS.john);
    say(toMolly, 'mollyKitchen', PORTRAITS.molly);
    say(toLuna,  'lunaWant',     PORTRAITS.luna);
    say(toJohn,  'johnLuna',     PORTRAITS.john);
    say(toLuna,  'lunaSchool',   PORTRAITS.luna);
    say(toMolly, 'mollyNotice',  PORTRAITS.molly);

    L.push({ side: 'left', text: t(pickByCharacter(K, 'react')) });

    say(toJohn,  'johnSurprise', PORTRAITS.john);
    say(toMolly, 'mollyChicks',  PORTRAITS.molly);
    say(toJohn,  'johnLater',    PORTRAITS.john);

    // ── Escolha 1 (peso 1): a discussão já existia, o player só toma um lado.
    const sides = [
        { key: 'optAnytime',   tag: 'A', score: () => personalitySystem.score('molly', 'C') },
        { key: 'optJohnRight', tag: 'B', score: () => personalitySystem.score('john', 'Re') },
        { key: 'optDepends',   tag: 'C', score: () => personalitySystem.score('john', 'Re') },
    ];

    L.push({
        side: 'left', text: '', type: 'choice',
        options: sides.map((o) => ({
            text: t(`${K}.${o.key}`), _goto: `br${o.tag}`, onSelect: o.score,
        })),
    });

    // ── Galhos: convergem no pedido da Luna, mudando só o sabor.
    const branch = (tag, beats) => {
        const start = L.length;
        L.push({ side: 'left', text: t(`${K}.${sides.find((s) => s.tag === tag).key}`) });
        L[start]._label = `br${tag}`;
        for (const [who, key, portrait] of beats) say(who, key, portrait);
        L[L.length - 1]._goto = 'pedido';
    };

    branch('A', [[toMolly, 'mollyToldYou', PORTRAITS.molly], [toJohn, 'johnAsked', PORTRAITS.john], [toMolly, 'mollyHmph', PORTRAITS.molly]]);
    branch('B', [[toMolly, 'mollyTwoNow', PORTRAITS.molly], [toJohn, 'johnThanks', PORTRAITS.john]]);
    branch('C', [[toMolly, 'mollyFine', PORTRAITS.molly]]);

    // ── O pedido
    const pedido = L.length;
    say(toLuna, 'lunaSaw',       PORTRAITS.luna);
    L[pedido]._label = 'pedido';
    say(toJohn, 'johnInside',    PORTRAITS.john);
    say(toLuna, 'lunaNo',        PORTRAITS.luna);
    say(toJohn, 'johnLunaFirm',  PORTRAITS.john);
    say(toMolly, 'mollyJohn',    PORTRAITS.molly);
    say(toMolly, 'mollyAskPet',  PORTRAITS.molly);
    say(toJohn, 'johnBetterNot', PORTRAITS.john);

    // Narração: ação → itálico cinza.
    L.push({ side: 'right', text: asAction(t(`${K}.mollyStare`)), setPortrait: { side: 'right', src: PORTRAITS.molly }, action: toMolly });
    L.push({ side: 'left', text: t(pickByCharacter(K, 'stare')), thought: true });

    say(toJohn, 'johnFine',      PORTRAITS.john);

    // ── Escolha 2: aceitar, transferir a decisão, ou recusar.
    L.push({
        side: 'left', text: '', type: 'choice',
        options: [
            {
                text: t(`${K}.optPromise`), _goto: 'accept',
                onSelect: () => {
                    personalitySystem.score('luna', 'C', 2);
                    personalitySystem.score('molly', 'Re');
                    answer = 'promise'; markDirty();
                },
            },
            {
                text: t(`${K}.optFatherDecides`), _goto: 'accept',
                onSelect: () => {
                    personalitySystem.score('john', 'Re', 3);
                    answer = 'father'; markDirty();
                },
            },
            {
                text: t(`${K}.optRefuse`), _goto: 'refuse',
                onSelect: () => {
                    personalitySystem.score('luna', 'R', 2);
                    personalitySystem.score('john', 'Re');
                    answer = 'refuse'; state = 'refused'; markDirty();
                },
            },
        ],
    });

    // ── Recusa: a cena acaba aqui. A Luna abaixa a cabeça (ação).
    const refuse = L.length;
    L.push({ side: 'right', text: asAction(t(`${K}.reactRefuse`)), setPortrait: { side: 'right', src: PORTRAITS.luna }, action: toLuna });
    L[refuse]._label = 'refuse';
    L[L.length - 1]._goto = 'fim';

    // ── Aceite: a escolha do filhote acontece AQUI, encadeada na conversa.
    const accept = L.length;
    say(toJohn, 'johnEasyOne', PORTRAITS.john);
    L[accept]._label = 'accept';

    pushPetChoice(L, config);

    // ── Fim
    const fim = L.length;
    L.push({ side: 'left', text: '', _label: 'fim' });

    return resolveDialogueLabels(config);
}

// ─── Cena 2: de volta à fazenda (só se recusou) ──────────────────────────────

export function buildScene2() {
    const config = {
        left:  { name: getPlayerName(), portrait: getPlayerDialogPortrait() },
        right: { name: getPlayerName(), portrait: getPlayerDialogPortrait() },
        lines: [],
    };
    const L = config.lines;

    // A recusa foi razoável — e mesmo assim pesou.
    L.push({ side: 'left', text: t(pickByCharacter(K, 'farmGuilt')), thought: true });

    // Sem escolha aqui: ele decide sozinho, e decide pelo mais simples — o
    // pintinho. John e Luna não sabem de nada; é surpresa.
    L.push({
        side: 'left',
        text: t(`${K}.secretChick`),
        thought: true,
        action: () => {
            pet = 'chick';
            state = 'waiting_birth';
            markDirty();
        },
    });

    return config;
}

// ─── Cena 3: a entrega ───────────────────────────────────────────────────────

/** O filhote recolhido ainda está no inventário? */
function hasPetItem() {
    if (!pet) return false;
    const inv = getSystem('inventory');
    return (inv?.getItemQuantity?.(PET_CHOICES[pet].itemId) || 0) > 0;
}

/** Fração do preço do filhote que vira XP extra. */
const PET_XP_RATE = 0.6;

/**
 * Consome o filhote do inventário, paga a recompensa e fecha a quest.
 *
 * A recompensa escala com o **preço do item** (lido do catálogo, não duplicado
 * aqui): entregar um leitão custa três vezes um pintinho, então rende três
 * vezes mais. Rebalancear o preço rebalanceia a recompensa sozinho.
 *
 * **O dinheiro depende do caminho.** Entregando pela frente, o John faz questão
 * de pagar pelo animal — ele não aceitaria de graça. Na entrega furtiva não há
 * negócio nenhum: você deu o bicho pra uma criança pelas costas do pai, então
 * não há o que cobrar. O XP vem igual — ele não é pagamento, é experiência.
 */
function deliverPet() {
    const itemId = PET_CHOICES[pet].itemId;
    getSystem('inventory')?.removeItem?.(itemId, 1);

    const price = getItem(itemId)?.price ?? 0;
    getSystem('questRegistry')?.complete?.('luna_chick', {
        extraRewards: {
            xp: Math.round(price * PET_XP_RATE),
            currency: route === 'quiet' ? 0 : price,
        },
    });

    state = 'delivered';
    markDirty();
}

export function buildScene3() {
    const config = {
        left:  { name: getPlayerName(), portrait: getPlayerDialogPortrait() },
        right: { name: 'Luna', portrait: PORTRAITS.luna },
        lines: [],
    };
    const L = config.lines;
    const toJohn  = makeSpeakerSwap(config, 'John');
    const toMolly = makeSpeakerSwap(config, 'Molly');
    const toLuna  = makeSpeakerSwap(config, 'Luna');

    const say = (who, key, portrait) => L.push({
        side: 'right',
        text: t(`${K}.${key}`),
        setPortrait: { side: 'right', src: portrait },
        action: who,
    });

    say(toLuna, 'dLunaSees',  PORTRAITS.luna);
    say(toJohn, 'dJohnNo',    PORTRAITS.john);
    say(toLuna, 'dLunaPlead', PORTRAITS.luna);
    say(toJohn, 'dJohnFirm',  PORTRAITS.john);

    // Quem devolveu a decisão pro John lá atrás colhe aqui: ele lembra.
    if (answer === 'father') {
        say(toJohn, 'dJohnRemembers', PORTRAITS.john);
    }

    // ── A escolha: como empurrar isso.
    L.push({
        side: 'left', text: '', type: 'choice',
        options: [
            {
                text: t(`${K}.dOptMolly`), _goto: 'viaMolly',
                onSelect: () => {
                    personalitySystem.score('molly', 'Re', 2);
                    route = 'molly'; markDirty();
                },
            },
            {
                text: t(`${K}.dOptInsist`), _goto: 'viaInsist',
                onSelect: () => {
                    personalitySystem.score('john', 'R');
                    personalitySystem.score('luna', 'C');
                    route = 'insist'; markDirty();
                },
            },
            {
                text: t(`${K}.dOptQuiet`), _goto: 'viaQuiet',
                onSelect: () => {
                    personalitySystem.score('luna', 'C', 3);
                    personalitySystem.score('john', 'R', 2);
                    route = 'quiet'; markDirty();
                },
            },
        ],
    });

    // ── A: pela Molly. O jeito certo de ler aquela casa.
    const viaMolly = L.length;
    L.push({ side: 'left', text: t(`${K}.dOptMolly`) });
    L[viaMolly]._label = 'viaMolly';
    say(toMolly, 'dMollyThinks', PORTRAITS.molly);
    say(toJohn,  'dJohnMolly',   PORTRAITS.john);
    // Callback da cena 1: uma palavra dela, e ele para.
    say(toMolly, 'dMollyFinal',  PORTRAITS.molly);
    say(toJohn,  'dJohnCaves',   PORTRAITS.john);
    L[L.length - 1]._goto = 'entrega';

    // ── B: insistir. Ele não cede na marra — quem resolve ainda é ela.
    const viaInsist = L.length;
    L.push({ side: 'left', text: t(`${K}.dOptInsist`) });
    L[viaInsist]._label = 'viaInsist';
    say(toJohn,  'dJohnPressed',  PORTRAITS.john);
    say(toMolly, 'dMollyStepsIn', PORTRAITS.molly);
    say(toJohn,  'dJohnCavesB',   PORTRAITS.john);
    L[L.length - 1]._goto = 'entrega';

    // ── C: entregar calado. Funciona, e cobra depois.
    const viaQuiet = L.length;
    L.push({ side: 'right', text: asAction(t(`${K}.dQuietGive`)), setPortrait: { side: 'right', src: PORTRAITS.luna }, action: toLuna });
    L[viaQuiet]._label = 'viaQuiet';
    say(toJohn, 'dJohnSees',  PORTRAITS.john);
    // Mesma frase da cena 1 — o mesmo homem, e agora ela pesa.
    say(toJohn, 'dJohnLater', PORTRAITS.john);
    L[L.length - 1]._goto = 'entrega';

    // ── Entrega: consome o item e fecha a quest.
    const entrega = L.length;
    L.push({
        side: 'right',
        text: t(`${K}.dLunaThanks`),
        setPortrait: { side: 'right', src: PORTRAITS.luna },
        action: () => { toLuna(); deliverPet(); },
    });
    L[entrega]._label = 'entrega';

    L.push({ side: 'left', text: t(pickByCharacter(K, 'dEnd')), thought: true });

    return resolveDialogueLabels(config);
}

/**
 * Empilha a escolha do filhote (só no caminho do aceite — na recusa o player
 * decide sozinho, sem escolha, e é sempre o pintinho).
 *
 * @param {Array} L - linhas do diálogo
 * @param {Object} config
 */
function pushPetChoice(L, config) {
    const toLuna = makeSpeakerSwap(config, 'Luna');
    const toJohn = makeSpeakerSwap(config, 'John');

    const picks = [
        { id: 'chick',  key: 'optChick',  joy: 'lunaChickJoy',
          score: () => personalitySystem.score('john', 'Re', 2) },
        { id: 'lamb',   key: 'optLamb',   joy: 'lunaLambJoy',
          score: () => { personalitySystem.score('luna', 'C'); personalitySystem.score('john', 'Re'); } },
        { id: 'piglet', key: 'optPiglet', joy: 'lunaPigletJoy',
          score: () => { personalitySystem.score('luna', 'C', 2); personalitySystem.score('john', 'R'); } },
    ];

    const tag = 'pub';

    L.push({
        side: 'left', text: '', type: 'choice',
        options: picks.map((p, i) => ({
            text: t(`${K}.${p.key}`),
            _goto: `${tag}${i}`,
            onSelect: () => {
                p.score();
                pet = p.id;
                state = 'waiting_birth';
                markDirty();
            },
        })),
    });

    picks.forEach((p, i) => {
        const start = L.length;
        L.push({ side: 'left', text: t(`${K}.${p.key}`) });
        L[start]._label = `${tag}${i}`;

        L.push({ side: 'right', text: t(`${K}.${p.joy}`), setPortrait: { side: 'right', src: PORTRAITS.luna }, action: toLuna });
        if (p.id === 'piglet') {
            L.push({ side: 'right', text: t(`${K}.johnNotYet`), setPortrait: { side: 'right', src: PORTRAITS.john }, action: toJohn });
        }
        L[L.length - 1]._goto = 'fim';
    });
}

// ─── API da quest ────────────────────────────────────────────────────────────

export const lunaChickQuest = {
    id: 'luna_chick',
    npc: 'luna',

    canStartScene1: () => state === 'idle' && prerequisitesMet(),
    /** Cena 2 é a surpresa — só existe pra quem recusou. */
    canStartScene2: () => state === 'refused',
    /**
     * Cena 3 é a entrega. Exige o filhote em mãos: se o player vendeu ou
     * descartou o item, a cena não abre e o objetivo continua pendente.
     */
    canStartScene3: () => state === 'carrying' && hasPetItem(),

    buildScene1,
    buildScene2,
    buildScene3,

    getObjective: () => {
        if (state === 'waiting_birth') return t(`${K}.objective`);
        if (state === 'carrying') return t(`${K}.objectiveDeliver`);
        return null;
    },
    getPet: () => (pet ? { id: pet, ...PET_CHOICES[pet] } : null),

    /** O filhote já está com o player, a caminho da Luna? */
    isCarrying: () => state === 'carrying',

    /**
     * Marca que o filhote foi recolhido do mundo. Quem move o animal e o item
     * é o `familyQuests.collectPet` — aqui só avança o estado da quest.
     * @returns {boolean} false se a quest não estava esperando o nascimento.
     */
    onPetCollected: () => {
        if (state !== 'waiting_birth') return false;
        state = 'carrying';
        markDirty();
        return true;
    },

    getState: () => ({ state, answer, pet, route }),
    setState: (data) => {
        if (!data) return;
        if (typeof data.state === 'string') state = data.state;
        if (data.answer === null || typeof data.answer === 'string') answer = data.answer;
        if (data.pet === null || typeof data.pet === 'string') pet = data.pet;
        if (data.route === null || typeof data.route === 'string') route = data.route;
    },
    reset: () => { state = 'idle'; answer = null; pet = null; route = null; },

    whyBlocked,
    /** Debug: ignora a ordem do arco pra testar a cena isolada. */
    setSkipPrereqs: (v) => { _skipPrereqs = v !== false; },
};

export default lunaChickQuest;
