/**
 * @file graham.js - Graham character definition
 * @description Hardy character: -2% energy consumption, +2% hunger/thirst.
 * Uses 8 moving frames (R0–R7).
 * @module GrahamCharacter
 */

import { createCharacter } from './characterModule.js';

/**
 * Graham's character configuration.
 * @type {Object}
 */
export const CHARACTER_CONFIG = {
    id: 'player_graham',
    name: 'Graham',
    folder: 'graham',
    prefix: 'Graham',
    movingFrames: 8,
    standSize:     { width: 14, height: 56 },
    standUpSize:   { width: 20, height: 56 },
    standDownSize: { width: 20, height: 56 },
    needsModifiers: { energy: 0.98, hunger: 1.02, thirst: 1.02 }
};

const { character, updateCharacter, drawCharacter, syncNeeds } = createCharacter(CHARACTER_CONFIG);
export { character as graham, updateCharacter as updateGraham, drawCharacter as drawGraham, syncNeeds as syncGrahamNeeds };

// Standardized export — used by playerSystem.loadCharacterModule()
export default { entity: character, update: updateCharacter, draw: drawCharacter, syncNeeds };
