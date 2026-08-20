/**
 * @file askAboutJohn.js - Opção "Cadê o seu pai?" no menu de interação.
 * @description Só a Molly, o Lucas e a Isabela respondem, e a opção só existe
 * quando o John está fora **por trabalho** (ausência de noite não rende
 * pergunta — todo mundo sabe que ele dorme).
 *
 * A resposta SEMPRE diz quando ele volta. É isso que transforma a ausência em
 * informação em vez de parede: sem o "quando", o jogador fica batendo na porta.
 *
 * A assimetria entre os três é personagem de graça — o Lucas sabe na hora, a
 * Isabela dá a informação certa com a confiança errada, e a Molly junta as
 * duas coisas.
 *
 * @module AskAboutJohn
 */

import { getSystem } from '../../gameState.js';
import { i18n } from '../../i18n/i18n.js';
import { weekdayIndex } from '../npcSchedule.js';
import { PORTRAITS, getPlayerName, getPlayerDialogPortrait, pickByCharacter }
    from '../../quests/family/dialogueHelpers.js';

const K = 'npc.family.askJohn';

const t = (key, params) => i18n.t(key, params);

/** Ausência atual do John, ou null se ele está por aí (ou só dormindo). */
function absence() {
    return getSystem('npcJohn')?.getAbsenceInfo?.() ?? null;
}

/** Nome do dia da semana em que ele volta (pra viagem longa). */
function returnDayName(day) {
    const dias = t('time.weekdays');
    return Array.isArray(dias) ? (dias[weekdayIndex(day)] ?? '') : '';
}

/** Hora cheia de volta, formatada (pra ausência de horário). */
function returnHour(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}h`;
}

/**
 * Monta a cena da resposta.
 *
 * @param {'molly'|'lucas'|'isabela'} speaker
 * @returns {Object|null} config do dialogueSystem, ou null se ele está presente
 */
export function buildAnswer(speaker) {
    const info = absence();
    if (!info) return null;

    const params = {
        dia: info.returnsOnDay != null ? returnDayName(info.returnsOnDay) : '',
        hora: info.returnsAtMinutes != null ? returnHour(info.returnsAtMinutes) : '',
    };

    return {
        left:  { name: getPlayerName(), portrait: getPlayerDialogPortrait() },
        right: { name: t(`npc.family.names.${speaker}`), portrait: PORTRAITS[speaker] },
        lines: [
            { side: 'right', text: t(`${K}.${speaker}.${info.work}`, params) },
            { side: 'left',  text: t(pickByCharacter(K, 'react')) },
        ],
    };
}

/**
 * Opção pronta pro `menuOptions` do NPC.
 *
 * @param {'molly'|'lucas'|'isabela'} speaker
 */
export function whereIsJohnOption(speaker) {
    return {
        textKey: `${K}.option`,
        isAvailable: () => absence() != null,
        onSelect: () => {
            const scene = buildAnswer(speaker);
            if (scene) getSystem('dialogue')?.start?.(scene);
        },
    };
}
