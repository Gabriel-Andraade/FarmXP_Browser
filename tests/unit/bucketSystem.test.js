import { describe, test, expect, beforeEach, mock } from 'bun:test';
import '../setup.js';

mock.module('../../public/scripts/gameState.js', () => ({
  registerSystem: () => {},
  getSystem: () => null,
}));

const bucket = (await import('../../public/scripts/bucketSystem.js')).default;

describe('bucketSystem volume', () => {
  beforeEach(() => { bucket._level = 0; });

  test('fillTo raises to the target and never lowers', () => {
    expect(bucket.fillTo(70)).toBe(70);
    expect(bucket.getLevel()).toBe(70);
    expect(bucket.fillTo(40)).toBe(0);
    expect(bucket.getLevel()).toBe(70);
    expect(bucket.fillTo(150)).toBe(30); // clamps to 100
    expect(bucket.getLevel()).toBe(100);
  });

  test('drain returns the amount actually removed, capped by what is left', () => {
    bucket.fill();
    expect(bucket.drain(30)).toBe(30);
    expect(bucket.getLevel()).toBe(70);
    expect(bucket.drain(999)).toBe(70); // only 70 left
    expect(bucket.getLevel()).toBe(0);
    expect(bucket.hasWater()).toBe(false);
  });

  test('serialize/restore round-trips and clamps to 0..100', () => {
    bucket._level = 40;
    expect(bucket.serialize()).toBe(40);
    bucket.restore(150);
    expect(bucket.getLevel()).toBe(100);
    bucket.restore(-1);
    expect(bucket.getLevel()).toBe(0);
  });
});
