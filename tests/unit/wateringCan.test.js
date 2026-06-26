import { describe, test, expect, beforeEach, mock } from 'bun:test';
import '../setup.js';

mock.module('../../public/scripts/gameState.js', () => ({
  getSystem: () => null,
  registerSystem: () => {},
}));
mock.module('../../public/scripts/itemUtils.js', () => ({ getItem: () => null }));
mock.module('../../public/scripts/worldConstants.js', () => ({ TILE_SIZE: 32 }));

const wateringCan = (await import('../../public/scripts/wateringCan.js')).default;

describe('wateringCan volume', () => {
  beforeEach(() => { wateringCan._level = 0; });

  test('fill() fills to 100%', () => {
    wateringCan.fill();
    expect(wateringCan.getLevel()).toBe(100);
  });

  test('fillTo raises to the target and never lowers', () => {
    expect(wateringCan.fillTo(80)).toBe(80);
    expect(wateringCan.getLevel()).toBe(80);
    expect(wateringCan.fillTo(50)).toBe(0); // already above target
    expect(wateringCan.getLevel()).toBe(80);
    expect(wateringCan.fillTo(150)).toBe(20); // clamps to 100
    expect(wateringCan.getLevel()).toBe(100);
  });

  test('useAmount drains by the cost', () => {
    wateringCan.fill();
    expect(wateringCan.useAmount(12)).toBe(true);
    expect(wateringCan.getLevel()).toBe(88);
  });

  test('useAmount drains to 0 if the cost exceeds what is left (last watering)', () => {
    wateringCan._level = 3;
    expect(wateringCan.useAmount(12)).toBe(true);
    expect(wateringCan.getLevel()).toBe(0);
  });

  test('useAmount on an empty can returns false', () => {
    expect(wateringCan.useAmount(5)).toBe(false);
    expect(wateringCan.hasWater()).toBe(false);
  });

  test('serialize/restore round-trips and clamps to 0..100', () => {
    wateringCan._level = 60;
    expect(wateringCan.serialize()).toBe(60);
    wateringCan.restore(150);
    expect(wateringCan.getLevel()).toBe(100);
    wateringCan.restore(-5);
    expect(wateringCan.getLevel()).toBe(0);
  });
});
