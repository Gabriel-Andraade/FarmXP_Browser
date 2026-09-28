import { describe, test, expect, beforeEach, mock } from 'bun:test';
import "../setup.js";

/**
 * #260: regression net for the save migrations.
 *
 * `tests/unit/fixtures/saves/vN.json` holds one real save per schema version.
 * Each is loaded through the actual `loadSlot()` path — which is what runs
 * `migrateSaveData()` — and checked against everything the migrations promise.
 * Remove a migration step and the fixtures older than it fail here, instead of
 * a player finding out with a half-loaded world.
 *
 * When SAVE_DATA_VERSION is bumped: add `vN.json` (a copy of the previous one
 * with the new fields and `_dataVersion` set), and add what the new migration
 * guarantees to MIGRATION_GUARANTEES below.
 */

mock.module('../../public/scripts/logger.js', () => ({
  logger: { info() {}, warn() {}, error() {}, debug() {} },
}));

// The full surface theWorld and saveSystem import — a partial stub only looks
// fine while another test file happens to register a richer one first.
mock.module('../../public/scripts/gameState.js', () => ({
  registerSystem: (name, instance) => instance,
  getSystem: () => null,
  getObject: () => null,
  setObject: () => {},
  setGameFlag: () => {},
  checkGameFlag: () => false,
  setDebugFlag: () => {},
  getDebugFlag: () => false,
  initDebugFlagsFromUrl: () => {},
  exposeDebug: () => {},
  installLegacyGlobals: () => {},
  default: {},
}));

// Stubs theWorld's dependencies, not theWorld itself: `mock.module` is global
// to the whole test run, so stubbing theWorld here would break every other file
// that loads the real one.
import './helpers/worldModuleMocks.js';

const { saveSystem, isNewerThanGame } = await import('../../public/scripts/saveSystem.js');

import v1 from './fixtures/saves/v1.json';
import v2 from './fixtures/saves/v2.json';
import v3 from './fixtures/saves/v3.json';
import v4 from './fixtures/saves/v4.json';
import v5 from './fixtures/saves/v5.json';

const FIXTURES = { v1, v2, v3, v4, v5 };

// Pinned on purpose rather than read from the module: bumping SAVE_DATA_VERSION
// without touching this file must fail here, and deriving it would let that
// change sail through with the newest migration untested.
const CURRENT_VERSION = 5;

/**
 * What each migration must have produced, checked on every save that started
 * below that version. Keyed by the version the migration targets.
 */
const MIGRATION_GUARANTEES = {
  2: (data) => {
    expect(data.gameFlags, 'v2 must create gameFlags').toBeDefined();
    expect(data.gameFlags.bru_quest, 'v2 must add bru_quest').toBeDefined();
    expect(typeof data.gameFlags.bru_quest.dialogue).toBe('string');
    // v2 only ensures the array when there is a world to put it on.
    if (data.world) {
      expect(Array.isArray(data.world.animals), 'v2 must ensure world.animals').toBe(true);
    }
  },
  3: (data) => {
    expect(data.gameFlags.john_quest, 'v3 must add john_quest').toBeDefined();
    expect(typeof data.gameFlags.john_quest.dialogue).toBe('string');
  },
  4: (data) => {
    expect(data.gameFlags.john_quest.milkQuest, 'v4 must add john_quest.milkQuest').toBeDefined();
    expect(data.gameFlags.lucas_quest, 'v4 must add lucas_quest').toBeDefined();
    expect(data.gameFlags.lucas_quest.secretQuest).toBeDefined();
  },
  5: (data) => {
    expect(data.gameFlags.molly_quest, 'v5 must add molly_quest').toBeDefined();
    expect(typeof data.gameFlags.molly_quest.dialogue).toBe('string');
  },
};

/** Put a fixture in slot 0 and load it, returning the loaded slot. */
function loadFixture(fixture) {
  const slot = structuredClone(fixture);
  delete slot._comment;
  saveSystem._clearCache();
  saveSystem._writeRoot({ version: 1, slots: [slot, null, null] });
  return saveSystem.loadSlot(0);
}

describe('save migrations (#260)', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    saveSystem.stopAutoSave();
    saveSystem.activeSlot = null;
    saveSystem._clearCache();
  });

  for (const [name, fixture] of Object.entries(FIXTURES)) {
    const startVersion = fixture.data._dataVersion ?? 1;

    describe(`${name} fixture`, () => {
      test(`migrates to v${CURRENT_VERSION}`, () => {
        const loaded = loadFixture(fixture);
        expect(loaded).not.toBeNull();
        expect(loaded.data._dataVersion).toBe(CURRENT_VERSION);
      });

      test('satisfies every migration it had to go through', () => {
        const { data } = loadFixture(fixture);
        for (let v = startVersion + 1; v <= CURRENT_VERSION; v++) {
          MIGRATION_GUARANTEES[v](data);
        }
      });

      test('keeps the data it already had', () => {
        const before = structuredClone(fixture.data);
        const { data } = loadFixture(fixture);

        expect(data.player).toEqual(before.player);
        expect(data.currency).toEqual(before.currency);
        expect(data.inventory).toEqual(before.inventory);
        expect(data.weather).toEqual(before.weather);
        expect(data.world.trees).toEqual(before.world.trees);
        expect(data.world.rocks).toEqual(before.world.rocks);
        expect(data.currentMap).toBe(before.currentMap);
      });

      test('does not reset quest progress it already had', () => {
        // The fixtures carry quest states past 'idle' on purpose: a migration
        // that assigns instead of filling in would wipe a player's progress.
        const before = structuredClone(fixture.data.gameFlags ?? {});
        const { data } = loadFixture(fixture);

        for (const [quest, state] of Object.entries(before)) {
          for (const [key, value] of Object.entries(state)) {
            expect(data.gameFlags[quest][key], `${name}: ${quest}.${key} was overwritten`).toBe(value);
          }
        }
      });

      test('is still a structurally valid save afterwards', () => {
        const { data } = loadFixture(fixture);
        expect(saveSystem._validateSlotPayload({ meta: {}, data }).ok).toBe(true);
      });
    });
  }

  test('a migrated save is written back, a current one is not', () => {
    // #183: loadSlot used to rewrite localStorage on every load.
    loadFixture(v1);
    expect(saveSystem._readRoot().slots[0].data._dataVersion).toBe(CURRENT_VERSION);

    loadFixture(v5);
    const root = saveSystem._readRoot();
    expect(root.slots[0].data._dataVersion).toBe(CURRENT_VERSION);
    expect(root.slots[0].meta.saveName).toBe('Current v5');
  });

  describe('a save from a newer build', () => {
    /** A save claiming a data version this build does not know yet. */
    function futureSlot(version = CURRENT_VERSION + 1) {
      const slot = structuredClone(v5);
      delete slot._comment;
      slot.meta.saveName = 'From the future';
      slot.data._dataVersion = version;
      slot.data.somethingNew = { weAreNotSupposedToUnderstandThis: true };
      return slot;
    }

    function seedFuture(version) {
      saveSystem._clearCache();
      saveSystem._writeRoot({ version: 1, slots: [futureSlot(version), null, null] });
    }

    test('isNewerThanGame draws the line at the current version', () => {
      // The predicate both loadSlot and the export path gate on.
      expect(isNewerThanGame({ _dataVersion: CURRENT_VERSION })).toBe(false);
      expect(isNewerThanGame({ _dataVersion: CURRENT_VERSION + 1 })).toBe(true);
      // A v1 save has no _dataVersion at all; it is older, never newer.
      expect(isNewerThanGame({})).toBe(false);
      expect(isNewerThanGame(null)).toBe(false);
      expect(isNewerThanGame(undefined)).toBe(false);
      // Garbage in the field must not read as "from the future".
      expect(isNewerThanGame({ _dataVersion: 'abc' })).toBe(false);
    });

    test('is refused by loadSlot', () => {
      seedFuture();
      expect(saveSystem.loadSlot(0)).toBeNull();
    });

    test('is reported as newer_version, so the UI can explain why', () => {
      seedFuture();
      expect(saveSystem.slotIssue(0)).toBe('newer_version');
    });

    test('is left completely untouched', () => {
      seedFuture();
      const before = structuredClone(saveSystem._readRoot().slots[0]);

      saveSystem.loadSlot(0);

      saveSystem._clearCache();
      expect(saveSystem._readRoot().slots[0]).toEqual(before);
    });

    test('does not become the active slot', () => {
      seedFuture();
      saveSystem.activeSlot = null;
      saveSystem.loadSlot(0);
      expect(saveSystem.activeSlot).toBeNull();
    });

    test('is refused however far ahead it is', () => {
      for (const version of [CURRENT_VERSION + 1, CURRENT_VERSION + 7, 999]) {
        seedFuture(version);
        expect(saveSystem.loadSlot(0), `data v${version} should be refused`).toBeNull();
      }
    });

    test('a save at exactly the current version still loads', () => {
      // The boundary: refuse "newer", never "current".
      seedFuture(CURRENT_VERSION);
      expect(saveSystem.slotIssue(0)).toBeNull();
      expect(saveSystem.loadSlot(0)).not.toBeNull();
    });

    test('an empty slot is reported as empty, not as a version problem', () => {
      saveSystem._clearCache();
      saveSystem._writeRoot({ version: 1, slots: [null, null, null] });
      expect(saveSystem.slotIssue(0)).toBe('empty');
      expect(saveSystem.loadSlot(0)).toBeNull();
    });

    test('exporting it is refused too', async () => {
      seedFuture();
      const res = await saveSystem.exportSlot(0);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('newer_version');
    });
  });

  test('every version from 1 to the current one has a fixture', () => {
    // Bumping SAVE_DATA_VERSION without adding a fixture leaves the newest
    // migration untested; this fails instead of passing quietly.
    for (let v = 1; v <= CURRENT_VERSION; v++) {
      expect(FIXTURES[`v${v}`], `missing tests/unit/fixtures/saves/v${v}.json`).toBeDefined();
    }
    expect(FIXTURES[`v${CURRENT_VERSION}`].data._dataVersion).toBe(CURRENT_VERSION);
  });
});
