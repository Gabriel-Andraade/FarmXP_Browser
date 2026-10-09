import { describe, test, expect, mock } from 'bun:test';
import '../setup.js';
import { i18nModule } from './helpers/i18nMock.js';

/**
 * #264: one activation, one craft.
 *
 * Making the recipe row focusable gave crafting a second way in, and the two
 * did not know about each other: craft() checks the materials, waits 800ms for
 * the animation and only then removes them. Two presses inside that window both
 * passed the check, so one held Enter could craft twice from one set of
 * materials. Disabling the button did not help — the row is not the button.
 */

mock.module('../../public/scripts/logger.js', () => ({
  logger: { info() {}, warn() {}, error() {}, debug() {} },
}));
mock.module('../../public/scripts/i18n/i18n.js', () => i18nModule());

// The real recipe list, not a stand-in: mock.module replaces a module for the
// whole run, and a one-recipe stub reached every later file that reads it.
const { recipes } = await import('../../public/scripts/recipes.js');
const RECIPE_ID = recipes[0].id;

const { CraftingSystem } = await import('../../public/scripts/craftingSystem.js');

describe('crafting: one activation, one craft (#264)', () => {
  test('a second activation inside the pause is refused', async () => {
    const system = new CraftingSystem();
    let removals = 0;
    system.canCraft = () => true;
    system.removeRequiredItems = () => { removals++; };
    system.showMessage = () => {};
    system.renderRecipeList = () => {};
    system._setManagedTimeout = (cb) => { cb(); return 0; };

    // Both start before the first has taken anything: that is the window the
    // button's disabled flag never covered, because the row is a second door.
    await Promise.all([system.craft(RECIPE_ID), system.craft(RECIPE_ID)]);
    expect(removals).toBe(1);
  });

  test('once it finishes, the recipe can be made again', async () => {
    const system = new CraftingSystem();
    let removals = 0;
    system.canCraft = () => true;
    system.removeRequiredItems = () => { removals++; };
    system.showMessage = () => {};
    system.renderRecipeList = () => {};
    system._setManagedTimeout = (cb) => { cb(); return 0; };

    await system.craft(RECIPE_ID);
    await system.craft(RECIPE_ID);
    expect(removals).toBe(2);
  });

  test('a failed craft does not leave the recipe locked', async () => {
    const system = new CraftingSystem();
    let attempts = 0;
    system.canCraft = () => true;
    system.removeRequiredItems = () => { attempts++; if (attempts === 1) throw new Error('inventory said no'); };
    system.showMessage = () => {};
    system.renderRecipeList = () => {};
    system._setManagedTimeout = (cb) => { cb(); return 0; };

    await system.craft(RECIPE_ID);          // throws inside, reported to the player
    await system.craft(RECIPE_ID);          // must still be allowed to try again
    expect(attempts).toBe(2);
  });
});
