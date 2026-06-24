import { describe, test, expect } from 'bun:test';
import { items } from '../../public/scripts/item.js';

// Crop economy balance: a seed should pay back in ~1 harvest at the best
// merchant, scaling profit with cycle length / rarity. Reads the REAL item.js
// prices so a future price change that breaks the margin trips this test.

const price = (id) => (items.find(i => i.id === id)?.price ?? 0);
// Best-merchant unit sell: food → cook (+40%), resources → materials (+40%).
// getSellPrice = floor(price/2); profession bonus = ×1.4.
const sellBest = (id) => Math.floor(Math.floor(price(id) * 0.5) * 1.4);

// Design inputs: seed cost = Rico's shop price (merchant.js); avgYield from the
// CROPS config (cropSystem.js). sellCrop=false → grown for processing/reseed
// (matinho → feed; sunflower returns its own seeds), so raw-sell payback isn't
// the metric that matters for it.
// Build CROP_ECON from source-of-truth configs (merchant + crop system),
// keeping only test-specific policy flags like `sellCrop`.

describe('crop economy balance', () => {
  test('no crop is a disaster: one harvest returns ≥ half the seed cost', () => {
    for (const c of CROP_ECON) {
      const revenue = sellBest(c.harvest) * c.avgYield;
      expect(revenue).toBeGreaterThanOrEqual(c.seed * 0.5);
    }
  });

  test('sell crops pay back their seed in ~1 harvest at the best merchant', () => {
    for (const c of CROP_ECON.filter(c => c.sellCrop)) {
      const revenue = sellBest(c.harvest) * c.avgYield;
      // payback ≤ ~1.25 harvests → revenue ≥ 80% of the seed cost
      expect(revenue).toBeGreaterThanOrEqual(c.seed * 0.8);
    }
  });

  test('premium/long crops return more per harvest than cheap/fast ones', () => {
    const rev = (id) => {
      const c = CROP_ECON.find(x => x.name === id);
      return sellBest(c.harvest) * c.avgYield;
    };
    expect(rev('Uva')).toBeGreaterThan(rev('Beterraba'));
    expect(rev('Abacaxi')).toBeGreaterThan(rev('Cenoura'));
  });
});
