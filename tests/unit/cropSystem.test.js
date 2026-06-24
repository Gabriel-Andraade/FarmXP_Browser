import { describe, test, expect, beforeEach, mock } from 'bun:test';
import '../setup.js';

// Issue #216: planting and harvesting must grant XP, scaled per crop.

mock.module('../../public/scripts/logger.js', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
}));

// Captured XP grants so we can assert on amount + source.
const xpGrants = [];
const xpSystem = { grantXP: (amount, source) => { xpGrants.push({ amount, source }); } };

// Controllable surroundings (active seed, tilled soil, clock).
let activeSeedId = 114; // matinho: noWater, growthDays 2
const weather = { _t: 0, getGameMinutes: () => weather._t };
const systems = {
  xp: xpSystem,
  seedWheel: { getActiveSeed: () => (activeSeedId != null ? { id: activeSeedId } : null) },
  hoeTool: { isTilled: () => true },
  player: { consumeNeeds: () => {} },
  weather,
};

mock.module('../../public/scripts/gameState.js', () => ({
  getSystem: (name) => systems[name] || null,
  registerSystem: () => {},
}));

const inv = {
  qty: {},
  getItemQuantity: (id) => inv.qty[id] ?? 0,
  removeItem: () => true,
  addItem: () => true,
};
mock.module('../../public/scripts/thePlayer/inventorySystem.js', () => ({ inventorySystem: inv }));

mock.module('../../public/scripts/itemUtils.js', () => ({ getItem: () => null }));
mock.module('../../public/scripts/worldConstants.js', () => ({ TILE_SIZE: 32 }));

const cropSystem = (await import('../../public/scripts/cropSystem.js')).default;

// Helper: plant a seed at (0,0), force it mature, harvest, return granted amounts.
function plantHarvest(seedId) {
  activeSeedId = seedId;
  inv.qty[seedId] = 5;
  weather._t = 0;
  cropSystem._crops.clear();
  xpGrants.length = 0;

  const planted = cropSystem.plantAt(0, 0);
  // Mature it directly (bypass the growth clock): every crop's matureStage is 2.
  [...cropSystem._crops.values()][0].stage = 2;
  const harvested = cropSystem.harvestAt(0, 0);

  return {
    planted,
    harvested,
    plantXp: xpGrants.find(g => g.source.startsWith('crop_plant_'))?.amount,
    harvestXp: xpGrants.find(g => g.source.startsWith('crop_harvest_'))?.amount,
  };
}

describe('crop XP rewards (#216)', () => {
  beforeEach(() => {
    cropSystem._crops.clear();
    xpGrants.length = 0;
  });

  test('planting a seed grants XP', () => {
    activeSeedId = 114;
    inv.qty[114] = 5;
    weather._t = 0;
    const ok = cropSystem.plantAt(0, 0);
    expect(ok).toBe(true);
    const plant = xpGrants.find(g => g.source.startsWith('crop_plant_'));
    expect(plant).toBeTruthy();
    expect(plant.amount).toBeGreaterThan(0);
  });

  test('harvesting a mature crop grants XP', () => {
    const { harvested, harvestXp } = plantHarvest(114);
    expect(harvested).toBe(true);
    expect(harvestXp).toBeGreaterThan(0);
  });

  test('harvest XP is larger than plant XP for the same crop', () => {
    const { plantXp, harvestXp } = plantHarvest(114);
    expect(harvestXp).toBeGreaterThan(plantXp);
  });

  test('harvest XP scales with the crop growth cycle (balanced per crop)', () => {
    const weed = plantHarvest(114);  // growthDays 2
    const grape = plantHarvest(126); // growthDays 20
    expect(grape.harvestXp).toBeGreaterThan(weed.harvestXp);
  });
});

// Issue #218: planting/harvesting dispatch events the achievement tracker uses.
describe('crop achievement events (#218)', () => {
  test('planting dispatches cropPlanted with the seedId', () => {
    activeSeedId = 114;
    inv.qty[114] = 5;
    weather._t = 0;
    cropSystem._crops.clear();

    let evt = null;
    const handler = (e) => { evt = e.detail; };
    document.addEventListener('cropPlanted', handler);
    cropSystem.plantAt(0, 0);
    document.removeEventListener('cropPlanted', handler);

    expect(evt).toBeTruthy();
    expect(evt.seedId).toBe(114);
  });

  test('harvesting dispatches cropHarvested with the seedId', () => {
    activeSeedId = 114;
    inv.qty[114] = 5;
    weather._t = 0;
    cropSystem._crops.clear();
    cropSystem.plantAt(0, 0);
    [...cropSystem._crops.values()][0].stage = 2;

    let evt = null;
    const handler = (e) => { evt = e.detail; };
    document.addEventListener('cropHarvested', handler);
    cropSystem.harvestAt(0, 0);
    document.removeEventListener('cropHarvested', handler);

    expect(evt).toBeTruthy();
    expect(evt.seedId).toBe(114);
  });
});

// Bug fix: hasCropAt lets the hoe keep soil tilled while a crop grows on it.
describe('hasCropAt', () => {
  test('reports a crop on its tile and nothing on an empty one', () => {
    activeSeedId = 114;
    inv.qty[114] = 5;
    weather._t = 0;
    cropSystem._crops.clear();
    cropSystem.plantAt(0, 0);
    expect(cropSystem.hasCropAt(0, 0)).toBe(true);
    expect(cropSystem.hasCropAt(999, 999)).toBe(false);
  });
});
