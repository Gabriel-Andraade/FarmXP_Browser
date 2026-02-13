/**
 * @file ben.js - Ben character definition
 * @description Resilient character: +2% energy consumption, -2% hunger/thirst.
 * Uses 7 moving frames (R0–R6). Stand file uses lowercase naming (ben_stand.png).
 * @module BenCharacter
 */

import { createCharacter } from './characterModule.js';

/**
 * Ben's character configuration.
 * @type {Object}
 */
export const CHARACTER_CONFIG = {
    id: 'player_ben',
    name: 'Ben',
    folder: 'ben',
    prefix: 'Ben',
    standFile: 'ben_stand.png',
    movingFrames: 7,
    standSize:     { width: 13, height: 58 },
    standUpSize:   { width: 17, height: 58 },
    standDownSize: { width: 17, height: 58 },
    needsModifiers: { energy: 1.02, hunger: 0.98, thirst: 0.98 }
};

const { character, updateCharacter, drawCharacter, syncNeeds } = createCharacter(CHARACTER_CONFIG);
export { character as ben, updateCharacter as updateBen, drawCharacter as drawBen, syncNeeds as syncBenNeeds };
