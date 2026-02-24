/**
 * @file stella.js - Stella character definition
 * @description Baseline character with balanced needs modifiers (all 1.0).
 * Uses 8 moving frames (R0–R7). Acts as the default fallback character.
 * @module StellaCharacter
 */

import { createCharacter } from './characterModule.js';

/**
 * Stella's character configuration.
 * @type {Object}
 */
export const CHARACTER_CONFIG = {
    id: 'player_stella',
    name: 'Stella',
    folder: 'stella',
    prefix: 'Stella',
    movingFrames: 8,
    standSize:     { width: 20, height: 44 },
    standUpSize:   { width: 16, height: 44 },
    standDownSize: { width: 16, height: 44 },
    needsModifiers: { energy: 1.0, hunger: 1.0, thirst: 1.0 }
};

const { character, updateCharacter, drawCharacter, syncNeeds } = createCharacter(CHARACTER_CONFIG);
export { character as stella, updateCharacter as updateStella, drawCharacter as drawStella, syncNeeds as syncStellaNeeds };

// Standardized export — used by playerSystem.loadCharacterModule()
export default { entity: character, update: updateCharacter, draw: drawCharacter, syncNeeds };
