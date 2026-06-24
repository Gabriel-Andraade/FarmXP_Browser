import { describe, test, expect, mock } from 'bun:test';
import '../setup.js';

// Bug fix: tilled soil must NOT revert to grass while a crop is growing on it.

mock.module('../../public/scripts/logger.js', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
}));

const weather = { _t: 0, getGameMinutes: () => weather._t, weatherType: 'clear' };
const crop = { _has: false, hasCropAt: () => crop._has };
const systems = { weather, crop };

mock.module('../../public/scripts/gameState.js', () => ({
  getSystem: (name) => systems[name] || null,
  registerSystem: () => {},
}));
mock.module('../../public/scripts/itemUtils.js', () => ({ getItem: () => null }));
mock.module('../../public/scripts/worldConstants.js', () => ({ TILE_SIZE: 32 }));

const hoeTool = (await import('../../public/scripts/hoeTool.js')).default;

function tillExpiredTileAt(key) {
  hoeTool._tilled.clear();
  // expiresAt in the past → eligible to revert on the next scan.
  hoeTool._tilled.set(key, { state: 'dry', expiresAt: 0, rainSince: null });
  weather._t = 1000;      // in-game "now" well past expiresAt
  hoeTool._lastScan = -1e9; // bypass the scan throttle regardless of clock
}

describe('tilled soil lifecycle vs crops (bug fix)', () => {
  test('expired soil reverts to grass when the plot is empty', () => {
    tillExpiredTileAt('32,32');
    crop._has = false;
    hoeTool.update();
    expect(hoeTool._tilled.has('32,32')).toBe(false);
  });

  test('expired soil is KEPT while a crop is growing on it', () => {
    tillExpiredTileAt('32,32');
    crop._has = true;
    hoeTool.update();
    expect(hoeTool._tilled.has('32,32')).toBe(true);
  });

  test('soil reverts once the crop is gone (e.g. withered/harvested away)', () => {
    tillExpiredTileAt('32,32');
    crop._has = true;
    hoeTool.update();
    expect(hoeTool._tilled.has('32,32')).toBe(true);

    crop._has = false;
    hoeTool._lastScan = -1e9; // allow another scan
    hoeTool.update();
    expect(hoeTool._tilled.has('32,32')).toBe(false);
  });
});
