/**
 * @file npcSchedule.js - Agenda de trabalho de NPC (presença por dia e hora).
 * @description Resolve "esse NPC está no mundo agora?" a partir do dia corrido
 * e da hora in-game, sem guardar nada no save.
 *
 * Tudo é **determinístico a partir do número do dia**. Isso é decisão de
 * projeto, não preguiça: sortear exigiria persistir o resultado, senão o
 * jogador carrega o save, o dado rola de novo e o NPC teleporta pra dentro ou
 * pra fora do mundo. Além disso, uma ausência sorteada não dá pra aprender —
 * só dá pra sofrer, porque não existe contra-jogo.
 *
 * O ritmo das viagens longas é irregular de propósito (intervalos que se
 * alternam), então o jogador sente "às vezes puxa, às vezes alivia" sem que o
 * jogo precise mentir pra ele.
 *
 * Genérico por NPC: o John é o primeiro, mas Bru (dois cargos), Jeremy (duas
 * faculdades + trabalho) e Bartolomeu (prefeitura) usam o mesmo mecanismo.
 *
 * @module NpcSchedule
 */

/**
 * @typedef {Object} ScheduleDef
 * @property {{from: number, until: number}} base - Janela padrão em minutos do dia
 * @property {Object<number, string>} weekly - índice do dia da semana (0=Seg) → id do trabalho
 * @property {Object<string, {from?: number, until?: number, allDay?: boolean}>} shifts
 * @property {{work: string, lengthDays: number, intervals: number[]}} [trip] - ausência longa
 */

/** Índice do dia da semana (0 = Segunda), igual ao `weather.getWeekday()`. */
export function weekdayIndex(day) {
    return (day - 1) % 7;
}

/**
 * A viagem longa cai neste dia?
 *
 * Percorre o ciclo de intervalos a partir do dia 1. Como os intervalos se
 * repetem, basta olhar a posição dentro de um ciclo — nenhum estado, e o
 * resultado é o mesmo em qualquer partida.
 *
 * @returns {{inTrip: boolean, endsOnDay: number|null}} `endsOnDay` = último dia fora
 */
export function tripStatus(trip, day) {
    if (!trip?.intervals?.length || !trip.lengthDays) return { inTrip: false, endsOnDay: null };

    const cycle = trip.intervals.reduce((a, b) => a + b, 0) + trip.intervals.length * trip.lengthDays;
    const pos = (day - 1) % cycle;

    let cursor = 0;
    for (const gap of trip.intervals) {
        cursor += gap;                      // dias em casa
        if (pos < cursor) return { inTrip: false, endsOnDay: null };

        cursor += trip.lengthDays;          // dias fora
        if (pos < cursor) {
            // Volta no dia seguinte ao último dia de viagem.
            const diasRestantes = cursor - pos;
            return { inTrip: true, endsOnDay: day + diasRestantes - 1 };
        }
    }
    return { inTrip: false, endsOnDay: null };
}

/** Trabalho do dia (viagem longa tem precedência sobre a semana fixa). */
export function workOfDay(def, day) {
    const trip = tripStatus(def.trip, day);
    if (trip.inTrip) return def.trip.work;
    return def.weekly?.[weekdayIndex(day)] ?? null;
}

/**
 * Estado de presença do NPC agora.
 *
 * @param {ScheduleDef} def
 * @param {number} day - dia corrido (1-based)
 * @param {number} minutes - minutos desde a meia-noite
 * @returns {{present: boolean, work: string|null, reason: 'night'|'work'|null,
 *            returnsAtMinutes: number|null, returnsOnDay: number|null}}
 */
export function resolvePresence(def, day, minutes) {
    const work = workOfDay(def, day);
    const shift = work ? def.shifts?.[work] : null;

    // Viagem/ausência de dia inteiro: nem entra na conta de horário.
    if (shift?.allDay) {
        const trip = tripStatus(def.trip, day);
        return {
            present: false, work, reason: 'work',
            returnsAtMinutes: null,
            returnsOnDay: trip.inTrip ? trip.endsOnDay + 1 : day + 1,
        };
    }

    // O trabalho encolhe a janela padrão; nunca a estende.
    const from  = Math.max(def.base.from,  shift?.from  ?? def.base.from);
    const until = Math.min(def.base.until, shift?.until ?? def.base.until);

    if (minutes < from) {
        // Antes de abrir: se o atraso é do trabalho, a razão é trabalho.
        const porTrabalho = shift?.from != null && shift.from > def.base.from;
        return {
            present: false, work, reason: porTrabalho ? 'work' : 'night',
            returnsAtMinutes: from, returnsOnDay: day,
        };
    }

    if (minutes >= until) {
        const porTrabalho = shift?.until != null && shift.until < def.base.until;
        return {
            present: false, work, reason: porTrabalho ? 'work' : 'night',
            returnsAtMinutes: def.base.from, returnsOnDay: day + 1,
        };
    }

    return { present: true, work, reason: null, returnsAtMinutes: null, returnsOnDay: null };
}
