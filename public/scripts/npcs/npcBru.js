/**
 * @file npcBru.js - NPC Bru, moradora da cidade
 * @description Registra a NPC Bru na cidade com sprite idle e hitbox.
 * Desaparece às 19:00 e reaparece às 6:10.
 * Diálogo de introdução envolve Bru e Juan.
 * @module NpcBru
 */

import { getSystem, registerSystem } from '../gameState.js';
import { i18n } from '../i18n/i18n.js';
import { WeatherSystem } from '../weather.js';
import { camera } from '../thePlayer/cameraSystem.js';
import { logger } from '../logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const BRU = {
    id: 'bru',
    name: 'Bru',
    x: 428,
    y: 484,
    width: 55,
    height: 52,
    sprite: 'assets/character/bru/bru_idle_00.png',
    map: 'city',
    interactRadius: 60,
};

const BRU_DIALOG_00 = 'assets/character/bru/bru_dialog_00.png';
const BRU_DIALOG_01 = 'assets/character/bru/bru_dialog_01.png';
const JUAN_DIALOG_00 = 'assets/character/juan/Juan_dialog_00.png';
const JUAN_DIALOG_01 = 'assets/character/juan/juan_dialog_01.png';

const NIGHT_HOUR = 19;
const MORNING_HOUR = 6;
const MORNING_MINUTE = 10;

/** % de combustível gasto ao oferecer carona pra Bru (ajustável). */
const RIDE_FUEL_COST = 15;

/** XP dado pela Bru ao fim da carona (ela não dá dinheiro — só XP). Ajustável. */
const BRU_RIDE_XP = 100;

/** Minutos de jogo que passam durante a viagem (ex.: 06:10 → 06:30). */
const RIDE_TIME_SKIP_MIN = 20;

// ─── State ──────────────────────────────────────────────────────────────────

let isVisible = true;
let pendingChange = null; // 'show' | 'hide' | null

/** 'idle' | 'intro_done' */
let dialogueState = 'idle';

/** Dia (WeatherSystem.day) em que o intro da Bru foi concluído. A quest da
 *  carona só fica disponível no dia SEGUINTE. */
let introDoneDay = null;

/** Quest da carona: 'idle' (não ofertada) | 'pending' (viu o encontro e
 *  recusou → reoferta curta) | 'riding' (aceitou a carona; cena do carro é
 *  parte B, a definir) | 'completed' (agradecimento do Juan — parte B). */
let rideQuest = 'idle';

/** Flag: player aceitou a carona no diálogo; a transição pra tela preta
 *  acontece no onEnd (depois do fade), evitando conflito de dois start(). */
let pendingRideOffer = false;

/** Se o Juan já agradeceu + entregou o dinheiro (uma vez só). */
let juanThanked = false;

/** Dia (WeatherSystem.day) em que a carona rolou. Nesse dia a Bru fica na
 *  empresa — some da cidade — e só reaparece no dia seguinte. */
let rideDay = null;

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

/** Índice de dia absoluto e monotônico, à prova de virada de mês/ano
 *  (WeatherSystem.day reseta a cada mês). Usado pra comparar "dia seguinte". */
function gameDayKey() {
    if (typeof WeatherSystem?.totalGameMinutes === 'number') {
        return Math.floor(WeatherSystem.totalGameMinutes / 1440);
    }
    const day = (typeof WeatherSystem?.day === 'number') ? WeatherSystem.day : null;
    if (day == null) return null;
    const month = (typeof WeatherSystem?.month === 'number') ? WeatherSystem.month : 0;
    return month * 100 + day;
}

function shouldBeVisible() {
    // Dia da carona: a Bru está na empresa — some da cidade até o dia seguinte.
    if (rideDay != null && gameDayKey() === rideDay) {
        return false;
    }
    const { hour, minute } = getCurrentTime();
    if (hour > MORNING_HOUR && hour < NIGHT_HOUR) return true;
    if (hour === MORNING_HOUR && minute >= MORNING_MINUTE) return true;
    return false;
}

function isNpcOnScreen() {
    if (typeof camera?.isInViewport !== 'function') return false;
    return camera.isInViewport(BRU.x, BRU.y, BRU.width, BRU.height);
}

function showNpc() {
    if (isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.addNpc({ ...BRU, onInteract });
    isVisible = true;
    pendingChange = null;
    logger.info('[Bru] NPC appeared (morning)');
}

function hideNpc() {
    if (!isVisible) return;
    const npcSys = getSystem('npc');
    if (!npcSys) return;
    npcSys.removeNpc(BRU.id);
    isVisible = false;
    pendingChange = null;
    logger.info('[Bru] NPC disappeared (night)');
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

function getGreeting() {
    const { hour } = getCurrentTime();
    return hour < 12
        ? t('npc.bruJuan.greetMorning')
        : t('npc.bruJuan.greetAfternoon');
}

// ─── Ride quest: dia seguinte + estado ─────────────────────────────────────

function markIntroDone() {
    dialogueState = 'intro_done';
    const key = gameDayKey();
    if (key != null) introDoneDay = key;
    getSystem('save')?.markDirty?.();
}

/** true quando já passou pelo menos 1 dia desde o intro (Bru+Juan). */
function hasRideDayArrived() {
    if (dialogueState !== 'intro_done') return false;
    if (typeof introDoneDay !== 'number') return false;
    const today = gameDayKey();
    if (today == null) return false;
    return today > introDoneDay;
}

/** Player recusou a carona → reoferta curta na próxima interação. */
function declineRide() {
    rideQuest = 'pending';
    const save = getSystem('save');
    if (save?.markDirty) save.markDirty();
}

/**
 * Resolve marcadores `_label`/`_goto` em índices `next` (na linha ou nas
 * opções de escolha), pra o roteiro ramificado ficar legível.
 */
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

/**
 * Executado no onEnd do encontro/reoferta: se o player aceitou a carona,
 * gasta combustível e abre a cena (tela preta) do carro. Chamado após o fade,
 * pra não conflitar com o start() do diálogo que está encerrando.
 */
function runPendingRideOffer() {
    if (!pendingRideOffer) return;
    pendingRideOffer = false;
    const fuel = getSystem('fuel');
    if (fuel?.consumePercent(RIDE_FUEL_COST)) {
        rideQuest = 'riding';
        const save = getSystem('save');
        if (save?.markDirty) save.markDirty();
        getSystem('dialogue')?.start(buildCarRideDialogue());
    }
}

/**
 * Fim da carona (rodado no onEnd da cena do carro): concede o XP da Bru,
 * pula {RIDE_TIME_SKIP_MIN} min do relógio e leva o player de volta pra
 * fazenda (transição direta, sem UI de viagem).
 */
function finishRide() {
    rideQuest = 'completed';
    const key = gameDayKey();
    if (key != null) rideDay = key; // some da cidade hoje
    const xp = getSystem('xp');
    if (xp?.grantXP) xp.grantXP(BRU_RIDE_XP, 'quest:bru_ride');
    const save = getSystem('save');
    if (save?.markDirty) save.markDirty();
    if (typeof WeatherSystem?.skipMinutes === 'function') WeatherSystem.skipMinutes(RIDE_TIME_SKIP_MIN);
    getSystem('mapManager')?.travelToFarmCutscene?.();
}

/** Estado da quest da carona (consultado pelo Juan pra sua fala contextual). */
function getRideQuestState() {
    return { rideQuest, available: hasRideDayArrived() && rideQuest === 'idle', juanThanked };
}

/** Marca que o Juan já agradeceu + pagou (chamado pelo npcJuan). */
function markJuanThanked() {
    juanThanked = true;
    const save = getSystem('save');
    if (save?.markDirty) save.markDirty();
}

// ─── Right-side speaker swap helper ────────────────────────────────────────
// The dialogue system sets speaker name from config BEFORE running action(),
// but all happens in the same JS frame (no paint between), so updating both
// config.right.name and the DOM in action() works flicker-free.

function makeSpeakerSwap(config, name) {
    return () => {
        config.right.name = name;
        const el = document.querySelector('.dlg-speaker');
        if (el) el.textContent = name;
    };
}

// ─── Dialogue builder ─────────────────────────────────────────────────────

function buildFirstDialogue() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.bruJuan';

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Bru', portrait: BRU_DIALOG_01 },
        lines: [],
    };

    const lines = config.lines;
    const swapToBru = makeSpeakerSwap(config, 'Bru');
    const swapToJuan = makeSpeakerSwap(config, 'Juan');

    // 0 — Bru rant (dialog_01)
    lines.push({ side: 'right', text: t(`${K}.bruRant`) });

    // 1 — Choice: approach or leave
    const choiceLine = {
        side: 'left',
        text: '',
        type: 'choice',
        options: [
            { text: t(`${K}.choiceApproach`), value: 'approach', next: -1 },
            { text: t(`${K}.choiceLeave`), value: 'leave', end: true },
        ],
    };
    lines.push(choiceLine);

    // 2 — Player approach (thought, char-specific)
    const approachIdx = lines.length;
    const approachKey = {
        stella: `${K}.approachStella`,
        graham: `${K}.approachGraham`,
        ben: `${K}.approachBen`,
    }[charId] || `${K}.approachStella`;
    lines.push({ side: 'left', text: t(approachKey), thought: true });

    // 3 — Bru reacts (switch to dialog_00): "quem é tu?"
    lines.push({
        side: 'right',
        text: t(`${K}.bruWho`, { name: playerName }),
        setPortrait: { side: 'right', src: BRU_DIALOG_00 },
    });

    // 4 — Player introduction (char-specific)
    const introKey = {
        stella: `${K}.introStella`,
        graham: `${K}.introGraham`,
        ben: `${K}.introBen`,
    }[charId] || `${K}.introStella`;
    lines.push({ side: 'left', text: t(introKey) });

    // 5+ — Bru response (switch to dialog_01, char-specific)
    if (charId === 'ben') {
        // Ben gets a shorter response
        lines.push({
            side: 'right',
            text: t(`${K}.bruGreetBen`),
            setPortrait: { side: 'right', src: BRU_DIALOG_01 },
        });
    } else {
        // Stella / Graham: two lines
        lines.push({
            side: 'right',
            text: t(`${K}.bruGreetDefault`),
            setPortrait: { side: 'right', src: BRU_DIALOG_01 },
        });
        lines.push({ side: 'right', text: t(`${K}.bruTaxiFar`) });
    }

    // — Player: "quer ajuda com algo?"
    lines.push({ side: 'left', text: t(`${K}.playerHelp`) });

    // — Bru warning (dialog_01)
    lines.push({ side: 'right', text: t(`${K}.bruWarning`) });

    // — Player looks (thought)
    lines.push({ side: 'left', text: t(`${K}.playerLooks`), thought: true });

    // — Juan enters (switch portrait to Juan dialog_01)
    lines.push({
        side: 'right',
        text: t(`${K}.juanIntro`),
        setPortrait: { side: 'right', src: JUAN_DIALOG_01 },
        action: swapToJuan,
    });

    // — Bru interrupts (switch back to Bru dialog_01)
    lines.push({
        side: 'right',
        text: t(`${K}.bruInterrupt`),
        setPortrait: { side: 'right', src: BRU_DIALOG_01 },
        action: swapToBru,
    });

    // — Juan corrects (switch to Juan dialog_00)
    lines.push({
        side: 'right',
        text: t(`${K}.juanCorrect`),
        setPortrait: { side: 'right', src: JUAN_DIALOG_00 },
        action: swapToJuan,
    });

    // — Player responds to Juan (char-specific)
    const toJuanKey = {
        stella: `${K}.toJuanStella`,
        graham: `${K}.toJuanGraham`,
        ben: `${K}.toJuanBen`,
    }[charId] || `${K}.toJuanStella`;
    lines.push({ side: 'left', text: t(toJuanKey) });

    // — Juan pleased (dialog_00)
    lines.push({ side: 'right', text: t(`${K}.juanLunch`) });

    // — Bru interferes (switch to Bru dialog_01)
    lines.push({
        side: 'right',
        text: t(`${K}.bruCook`),
        setPortrait: { side: 'right', src: BRU_DIALOG_01 },
        action: swapToBru,
    });

    // — Juan responds (switch to Juan dialog_01)
    lines.push({
        side: 'right',
        text: t(`${K}.juanIgnore`),
        setPortrait: { side: 'right', src: JUAN_DIALOG_01 },
        action: swapToJuan,
    });

    // — Player farewell (char-specific)
    if (charId === 'ben') {
        // Ben's sequence: looks back and forth between Bru and Juan
        lines.push({ side: 'left', text: t(`${K}.benLookThought`), thought: true });

        // Alternating portrait swaps — player clicks through each "..."
        lines.push({
            side: 'right',
            text: t(`${K}.benLookBru`),
            setPortrait: { side: 'right', src: BRU_DIALOG_01 },
            action: swapToBru,
        });
        lines.push({
            side: 'right',
            text: t(`${K}.benLookJuan`),
            setPortrait: { side: 'right', src: JUAN_DIALOG_00 },
            action: swapToJuan,
        });
        lines.push({
            side: 'right',
            text: t(`${K}.benLookBru`),
            setPortrait: { side: 'right', src: BRU_DIALOG_01 },
            action: swapToBru,
        });
        lines.push({
            side: 'right',
            text: t(`${K}.benLookJuan`),
            setPortrait: { side: 'right', src: JUAN_DIALOG_00 },
            action: swapToJuan,
        });
        lines.push({
            side: 'right',
            text: t(`${K}.benLookBru`),
            setPortrait: { side: 'right', src: BRU_DIALOG_01 },
            action: swapToBru,
        });

        lines.push({
            side: 'left',
            text: t(`${K}.benFarewell`, { greeting: getGreeting() }),
            end: true,
            action: markIntroDone,
        });
    } else if (charId === 'graham') {
        lines.push({
            side: 'left',
            text: t(`${K}.farewellGraham`),
            end: true,
            action: markIntroDone,
        });
    } else {
        // Stella
        lines.push({
            side: 'left',
            text: t(`${K}.farewellStella`),
            end: true,
            action: markIntroDone,
        });
    }

    // Patch choice → approach index
    choiceLine.options[0].next = approachIdx;

    return config;
}

// ─── Ride quest dialogues (parte A: encontro no ponto de táxi) ──────────────

/**
 * Encontro do "dia seguinte": Bru esperando o táxi (que sempre cancela), Juan
 * por perto. Roteiro ramificado (ouvir / interferir / se afastar → oferecer
 * carona). Oferecer a carona gasta combustível e leva à cena do carro (parte B).
 */
function buildTaxiEncounter() {
    const charId = getActiveCharacterId();
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.bruQuest';
    const T = (k, p) => t(`${K}.${k}`, p);
    const pick = (base) => T(`${base}${charId.charAt(0).toUpperCase()}${charId.slice(1)}`);
    const hasFuel = getSystem('fuel')?.hasEnough(RIDE_FUEL_COST) ?? false;

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Bru', portrait: BRU_DIALOG_01 },
        lines: [],
    };
    const lines = config.lines;
    const swapToBru = makeSpeakerSwap(config, 'Bru');
    const swapToJuan = makeSpeakerSwap(config, 'Juan');

    const bru01 = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: BRU_DIALOG_01 }, action: swapToBru, ...extra });
    const bru00 = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: BRU_DIALOG_00 }, action: swapToBru, ...extra });
    const juan01 = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: JUAN_DIALOG_01 }, action: swapToJuan, ...extra });
    const juan00 = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: JUAN_DIALOG_00 }, action: swapToJuan, ...extra });
    const me = (text, extra = {}) => ({ side: 'left', text, ...extra });

    // Opção "oferecer carona" (reutilizada nas duas escolhas): se tiver
    // combustível, marca a transição pra tela preta; senão, vai pro "sem gasolina".
    const offerRide = () => ({
        text: T('choiceOfferRide'),
        _goto: hasFuel ? 'rideAccept' : 'noFuel',
        onSelect: hasFuel ? () => { pendingRideOffer = true; } : undefined,
    });

    // ── Abertura ──
    lines.push(bru01(T('bruRant1')));
    lines.push(bru01(T('bruRant2')));
    lines.push(me(T('playerApproach', { name: playerName }), { thought: true }));
    lines.push(bru00(T('bruHiAgain')));
    lines.push(bru01(T('bruTaxiPrice')));
    lines.push(juan01(T('juanCalm')));
    lines.push(bru01(T('bruFast')));

    // ── Escolha 1: ouvir / interferir / se afastar ──
    lines.push(me('', {
        type: 'choice',
        options: [
            { text: T('choiceListen'), _goto: 'listen' },
            { text: T('choiceInterfere'), _goto: 'interfere' },
            { text: T('choiceWalkAway'), _goto: 'falaPlayer' },
        ],
    }));

    // ── Interferir → flui pro "fala {name}" ──
    lines.push(me(pick('interfere'), { _label: 'interfere' }));
    lines.push(juan01(T('juanHiPlayer', { name: playerName })));

    // ── "fala {name}" + escolha 2 ──
    lines.push(bru01(T('bruFalaPlayer', { name: playerName }), { _label: 'falaPlayer' }));
    lines.push(me('', {
        _label: 'falaChoice',
        type: 'choice',
        options: [
            { text: T('choiceAskOk'), _goto: 'askOk' },
            offerRide(),
            { text: T('choiceWaveLeave'), _goto: 'waveEnd', onSelect: declineRide },
        ],
    }));
    lines.push(bru01(T('bruTaxiStillFar', { name: playerName }), { _label: 'askOk', _goto: 'falaChoice' }));
    lines.push(me(T('playerWaveLeave'), { _label: 'waveEnd', end: true }));

    // ── Ouvir sem interferir ──
    lines.push(juan00(T('juanMaybeBug'), { _label: 'listen' }));
    lines.push(bru01(T('bruBugged')));
    lines.push(juan01(T('juanSeeing')));
    lines.push(bru01(T('bruThink')));
    lines.push(me(pick('check')));
    lines.push(bru01(T('bruTaxiCurse')));
    lines.push(juan01(T('juanHowAreYou', { name: playerName })));
    lines.push(me(T('playerFine')));
    lines.push(bru01(T('bruAwful')));
    lines.push(juan00(T('juanNoNeed')));
    lines.push(bru01(T('bruShutUp')));
    lines.push(me(T('playerSilent', { name: playerName }), { thought: true }));
    lines.push(juan00(T('juanSilent'), { thought: true }));
    lines.push(me('', {
        type: 'choice',
        options: [
            offerRide(),
            { text: T('choiceWishLuck'), _goto: 'wishLuck', onSelect: declineRide },
            { text: T('choiceLeave'), _goto: 'leaveEnd', onSelect: declineRide },
        ],
    }));
    lines.push(bru00(T('wishLuckBru'), { _label: 'wishLuck' }));
    lines.push(juan01(T('wishLuckJuan'), { end: true }));
    lines.push(me(T('playerLeaveQuiet'), { _label: 'leaveEnd', end: true }));

    // ── Aceitar carona (compartilhado) → tela preta acontece no onEnd ──
    lines.push(bru00(T('bruSerious'), { _label: 'rideAccept' }));
    lines.push(me(T('playerYes')));
    lines.push(bru00(T('bruLetsGo'), { end: true }));

    // ── Sem combustível (compartilhado) ──
    lines.push(me(T('playerNoFuel'), { _label: 'noFuel', end: true }));

    config.onEnd = runPendingRideOffer;
    return resolveDialogueLabels(config);
}

/** Reoferta curta quando o player recusou a carona antes. */
function buildRideReoffer() {
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    const K = 'npc.bruQuest';
    const T = (k, p) => t(`${K}.${k}`, p);
    const hasFuel = getSystem('fuel')?.hasEnough(RIDE_FUEL_COST) ?? false;

    const config = {
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Bru', portrait: BRU_DIALOG_01 },
        lines: [],
    };
    const lines = config.lines;
    const swapToBru = makeSpeakerSwap(config, 'Bru');
    const bru01 = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: BRU_DIALOG_01 }, action: swapToBru, ...extra });
    const bru00 = (text, extra = {}) => ({ side: 'right', text, setPortrait: { side: 'right', src: BRU_DIALOG_00 }, action: swapToBru, ...extra });
    const me = (text, extra = {}) => ({ side: 'left', text, ...extra });

    lines.push(bru01(T('reofferPrompt', { name: playerName })));
    lines.push(me('', {
        type: 'choice',
        options: [
            { text: T('choiceOfferRide'), _goto: hasFuel ? 'rideAccept' : 'noFuel', onSelect: hasFuel ? () => { pendingRideOffer = true; } : undefined },
            { text: T('reofferNo'), end: true },
        ],
    }));
    lines.push(bru00(T('bruSerious'), { _label: 'rideAccept' }));
    lines.push(me(T('playerYes')));
    lines.push(bru00(T('bruLetsGo'), { end: true }));
    lines.push(me(T('playerNoFuel'), { _label: 'noFuel', end: true }));

    config.onEnd = runPendingRideOffer;
    return resolveDialogueLabels(config);
}

/**
 * Cena do carro (parte B — a definir pelo usuário). Por enquanto: tela preta
 * (blackout) com a caixa de diálogo + sprites do player e da Bru, e uma fala
 * placeholder. O diálogo completo da conversa no carro entra aqui depois.
 */
/**
 * Cena da carona (parte B): TELA PRETA, sem retratos — só a caixa de diálogo
 * e o nome de quem fala. Ramifica por personagem (Stella/Graham/Ben). Ao
 * terminar (onEnd → finishRide) pula 20 min e volta o player pra fazenda.
 *
 * NOTA: texto em PT inline por ora (roteiro ainda em ajuste). Extrair pro
 * i18n com en/es quando o conteúdo estabilizar.
 */
function buildCarRideDialogue() {
    const charId = getActiveCharacterId();       // 'stella' | 'ben' | 'graham'
    const playerName = getPlayerName();
    const CK = 'npc.bruQuest.car';
    const seg = (k) => { const v = t(`${CK}.${k}`); return Array.isArray(v) ? v : []; };
    const str = (k) => t(`${CK}.${k}`);

    const config = {
        blackout: true,
        left: { name: playerName },   // sem retrato → só o nome aparece
        right: { name: 'Bru' },
        lines: [],
        onEnd: finishRide,
    };
    const lines = config.lines;

    // "B|texto" = Bru, "M|texto" = player, "N|texto" = narração (sem nome).
    // {name} é interpolado aqui (o t() não interpola dentro de arrays).
    const carLine = (enc) => {
        const kind = enc.slice(0, 1);
        const text = enc.slice(2).split('{name}').join(playerName);
        if (kind === 'B') return { side: 'right', text };
        if (kind === 'N') return { side: 'left', text, thought: true, narration: true };
        return { side: 'left', text }; // 'M'
    };
    const pushSeg = (key, opts = {}) => {
        const start = lines.length;
        for (const enc of seg(key)) lines.push(carLine(enc));
        if (opts.label && lines[start]) lines[start]._label = opts.label;
        const last = lines[lines.length - 1];
        if (last) {
            if (opts.gotoLast) last._goto = opts.gotoLast;
            if (opts.endLast) last.end = true;
        }
    };
    const pushChoice = (o1, o2, o3) => lines.push({ side: 'left', text: '', type: 'choice', options: [o1, o2, o3] });

    // ── Abertura compartilhada ──
    pushSeg('opening');
    pushChoice(
        { text: str('choiceThanks'), _goto: 'jobBridge' },
        { text: str('choiceSmile'), _goto: 'jobBridge' },
        { text: str('choiceWork'), _goto: 'job' },
    );
    pushSeg('jobBridge', { label: 'jobBridge' });
    pushSeg('job', { label: 'job' });
    pushSeg(charId === 'ben' ? 'jobReactBen' : charId === 'graham' ? 'jobReactGraham' : 'jobReactStella');
    pushSeg('faculdade');

    // ── Conversa principal por personagem ──
    const P = charId === 'graham' ? 'graham' : charId === 'ben' ? 'ben' : 'stella';
    const L = charId === 'graham' ? 'g' : charId === 'ben' ? 'b' : 's';

    pushSeg(`${P}Pre`);
    pushChoice(
        { text: str(`${P}Choice1`), _goto: `${L}Opt1` },
        { text: str(`${P}Choice2`), _goto: `${L}Opt2` },
        { text: str(`${P}Choice3`), _goto: `${L}Opt3` },
    );
    pushSeg(`${P}Opt1`, { label: `${L}Opt1`, gotoLast: `${L}Converge` });
    pushSeg(`${P}Opt2`, { label: `${L}Opt2`, gotoLast: `${L}Converge` });
    pushSeg(`${P}Opt3`, { label: `${L}Opt3` });
    pushSeg(`${P}Post`, { label: `${L}Converge`, endLast: true });

    return resolveDialogueLabels(config);
}

// ─── Interaction handler ────────────────────────────────────────────────────

function onInteract() {
    const dlg = getSystem('dialogue');
    if (!dlg) {
        logger.warn('[Bru] DialogueSystem not available');
        return;
    }

    // 1) Ainda não fez o primeiro diálogo (Bru+Juan).
    if (dialogueState === 'idle') {
        dlg.start(buildFirstDialogue());
        return;
    }

    // 2) Dia seguinte ao intro → encontro do táxi (quest da carona).
    if (rideQuest === 'idle' && hasRideDayArrived()) {
        dlg.start(buildTaxiEncounter());
        return;
    }

    // 3) Já viu o encontro e recusou → reoferta curta.
    if (rideQuest === 'pending') {
        dlg.start(buildRideReoffer());
        return;
    }

    // 4) Aceitou a carona mas a cena do carro não concluiu (ex.: save/load no
    //    meio) → retoma a cena, senão finishRide nunca roda e trava em 'riding'.
    const playerName = getPlayerName();
    const playerPortrait = getPlayerDialogPortrait();
    if (rideQuest === 'riding') {
        dlg.start(buildCarRideDialogue());
        return;
    }

    // 5) Intro feito mas o dia da carona ainda não chegou (ou quest encerrada).
    dlg.start({
        left: { name: playerName, portrait: playerPortrait },
        right: { name: 'Bru', portrait: BRU_DIALOG_00 },
        lines: [{ side: 'right', text: t('npc.bruQuest.genericGreet', { name: playerName }), end: true }],
    });
}

// ─── Save / Load ────────────────────────────────────────────────────────────

function getQuestState() {
    return { dialogue: dialogueState, introDoneDay, rideQuest, juanThanked, rideDay };
}

function setQuestState(data) {
    if (!data) return;
    // Reseta campos ausentes aos defaults — evita vazamento de estado entre
    // saves carregados na mesma sessão.
    if (typeof data === 'string') {
        dialogueState = data;
        introDoneDay = null;
        rideQuest = 'idle';
        juanThanked = false;
        rideDay = null;
    } else {
        dialogueState = data.dialogue ?? 'idle';
        introDoneDay = (typeof data.introDoneDay === 'number') ? data.introDoneDay : null;
        rideQuest = data.rideQuest ?? 'idle';
        juanThanked = data.juanThanked === true;
        rideDay = (typeof data.rideDay === 'number') ? data.rideDay : null;
    }
    // Migração: save antigo com intro concluído mas sem dia registrado → ancora
    // no dia atual pra a carona liberar no dia seguinte (não na mesma hora).
    if (dialogueState === 'intro_done' && introDoneDay == null) {
        introDoneDay = gameDayKey();
    }
}

// ─── Register NPC ───────────────────────────────────────────────────────────

function register() {
    const npcSys = getSystem('npc');
    if (!npcSys) {
        logger.warn('[Bru] NpcSystem not available, retrying...');
        setTimeout(register, 500);
        return;
    }

    if (shouldBeVisible()) {
        npcSys.addNpc({ ...BRU, onInteract });
        isVisible = true;
    } else {
        isVisible = false;
    }

    setInterval(updateVisibility, 2000);
    setInterval(checkPendingChange, 500);

    logger.info('[Bru] NPC registered in city');
}

// ─── Public API ─────────────────────────────────────────────────────────────

const bruAPI = {
    register,
    getQuestState,
    setQuestState,
    getRideQuestState,
    markJuanThanked,
};

registerSystem('npcBru', bruAPI);

register();

export default bruAPI;
