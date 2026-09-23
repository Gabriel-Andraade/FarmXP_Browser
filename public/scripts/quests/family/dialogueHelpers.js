/**
 * @file dialogueHelpers.js - Retratos da família Miller + re-export das
 * utilidades genéricas de diálogo.
 *
 * As funções genéricas (`getActiveCharacterId`, `getPlayerName`,
 * `getPlayerDialogPortrait`, `makeSpeakerSwap`, `resolveDialogueLabels` e
 * `pickByCharacter`) agora vivem no `dialogueSystem.js` — fonte única para
 * evitar a quinta cópia. Este arquivo re-exporta esses nomes pra não quebrar
 * os importadores existentes (`askAboutJohn`, `npcLucas`, `lunaChick`).
 *
 * `PORTRAITS` continua aqui por ser específico da família Miller.
 *
 * @module FamilyDialogueHelpers
 */

export {
    getActiveCharacterId,
    getPlayerName,
    getPlayerDialogPortrait,
    makeSpeakerSwap,
    resolveDialogueLabels,
    pickByCharacter,
} from '../../dialogueSystem.js';

/** Retratos de diálogo da família (só `_dialog_00` existe pros menores). */
export const PORTRAITS = {
    john:    'assets/character/family/john_dialog_00.png',
    molly:   'assets/character/family/molly_dialog_00.png',
    luna:    'assets/character/family/luna_dialog_00.png',
    clara:   'assets/character/family/clara_dialog_00.png',
    theo:    'assets/character/family/theo_dialog_00.png',
    lucas:   'assets/character/family/lucas_dialog_00.png',
    isabela: 'assets/character/family/isabela_dialog_00.png',
};
