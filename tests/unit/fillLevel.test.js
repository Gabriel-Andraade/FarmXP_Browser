import { describe, test, expect, mock } from 'bun:test';
import '../setup.js';

let charges = 3;
const systems = { wateringCan: { capacity: 5, getCharges: () => charges } };
mock.module('../../public/scripts/gameState.js', () => ({
  getSystem: (n) => systems[n] || null,
  registerSystem: () => {},
}));

const items = {
  12: { id: 12, name: 'Watering Can', type: 'tool', toolType: 'watering_can' },
  16: { id: 16, name: 'Bucket', type: 'tool' },
  42: { id: 42, name: 'Water Bucket', type: 'resource' },
  9:  { id: 9,  name: 'Wood', type: 'resource' },
};
mock.module('../../public/scripts/itemUtils.js', () => ({
  getItem: (id) => items[id] || null,
}));

const { getItemFillLevel } = await import('../../public/scripts/fillLevel.js');

describe('getItemFillLevel', () => {
  test('watering can reports its charge percentage', () => {
    charges = 3;
    expect(getItemFillLevel(12)).toEqual({ percent: 60, current: 3, max: 5, icon: '💧' });
    charges = 5;
    expect(getItemFillLevel(12).percent).toBe(100);
    charges = 0;
    expect(getItemFillLevel(12).percent).toBe(0);
  });

  test('full bucket is 100%, empty bucket is 0%', () => {
    expect(getItemFillLevel(42).percent).toBe(100);
    expect(getItemFillLevel(16).percent).toBe(0);
  });

  test('a non-container item has no level', () => {
    expect(getItemFillLevel(9)).toBeNull();
  });

  test('an unknown item id is null', () => {
    expect(getItemFillLevel(99999)).toBeNull();
  });
});
