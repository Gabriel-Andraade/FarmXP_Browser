

// ─── DEFAULT (sprite 32×32 padrão) ──────────────────────────────────
export const REACH_DEFAULT = {
  down:  { x: 14, y: 20, width: 6, height: 16 },
  up:    { x: 14, y: -4, width: 6, height: 16 },
  left:  { x: -4, y: 14, width: 16, height: 6 },
  right: { x: 20, y: 14, width: 16, height: 6 },
};

// ─── POR ESPÉCIE ─────────────────────────────────────────────────────
export const REACH_BY_SPECIES = {
  // ── Bull 115×115 — centro ≈ (57, 57) ──
  Bull: {
    down:  { x: 50, y: 70, width: 20, height: 50 },
    up:    { x: 50, y: -5, width: 20, height: 50 },
    left:  { x: -5, y: 50, width: 50, height: 20 },
    right: { x: 70, y: 50, width: 50, height: 20 },
  },

  // ── Calf 96×96 — centro ≈ (48, 48) ──
  Calf: {
    down:  { x: 42, y: 58, width: 16, height: 42 },
    up:    { x: 42, y: -4, width: 16, height: 42 },
    left:  { x: -4, y: 42, width: 42, height: 16 },
    right: { x: 58, y: 42, width: 42, height: 16 },
  },

  // ── Cow 54×53 — centro ≈ (27, 26) ──
  Cow: {
    down:  { x: 24, y: 32, width: 10, height: 26 },
    up:    { x: 24, y: -4, width: 10, height: 26 },
    left:  { x: -4, y: 22, width: 26, height: 10 },
    right: { x: 32, y: 22, width: 26, height: 10 },
  },

  // ── Pig 54×54 ──
  Pig: {
    down:  { x: 24, y: 32, width: 10, height: 26 },
    up:    { x: 24, y: -4, width: 10, height: 26 },
    left:  { x: -4, y: 24, width: 26, height: 10 },
    right: { x: 32, y: 24, width: 26, height: 10 },
  },

  // ── Sheep 50×50 ──
  Sheep: {
    down:  { x: 22, y: 30, width: 8, height: 24 },
    up:    { x: 22, y: -4, width: 8, height: 24 },
    left:  { x: -4, y: 22, width: 24, height: 8 },
    right: { x: 30, y: 22, width: 24, height: 8 },
  },

  // ── Lamb 51×51 ──
  Lamb: {
    down:  { x: 22, y: 30, width: 8, height: 24 },
    up:    { x: 22, y: -4, width: 8, height: 24 },
    left:  { x: -4, y: 22, width: 24, height: 8 },
    right: { x: 30, y: 22, width: 24, height: 8 },
  },

  // ── Piglet 45×45 ──
  Piglet: {
    down:  { x: 20, y: 26, width: 8, height: 22 },
    up:    { x: 20, y: -4, width: 8, height: 22 },
    left:  { x: -4, y: 20, width: 22, height: 8 },
    right: { x: 26, y: 20, width: 22, height: 8 },
  },

  // ── Turkey 45×45 ──
  Turkey: {
    down:  { x: 20, y: 26, width: 8, height: 22 },
    up:    { x: 20, y: -4, width: 8, height: 22 },
    left:  { x: -4, y: 20, width: 22, height: 8 },
    right: { x: 26, y: 20, width: 22, height: 8 },
  },

  // ── Rooster 58×58 — centro ≈ (29, 29) ──
  Rooster: {
    down:  { x: 26, y: 34, width: 8, height: 28 },
    up:    { x: 26, y: -4, width: 8, height: 28 },
    left:  { x: -4, y: 26, width: 28, height: 8 },
    right: { x: 34, y: 26, width: 28, height: 8 },
  },

  // ── Chicken 28×29 ──
  Chicken: {
    down:  { x: 12, y: 16, width: 4, height: 16 },
    up:    { x: 12, y: -2, width: 4, height: 16 },
    left:  { x: -2, y: 12, width: 16, height: 4 },
    right: { x: 16, y: 12, width: 16, height: 4 },
  },

  // ── Chick 29×29 ──
  Chick: {
    down:  { x: 12, y: 16, width: 4, height: 16 },
    up:    { x: 12, y: -2, width: 4, height: 16 },
    left:  { x: -2, y: 12, width: 16, height: 4 },
    right: { x: 16, y: 12, width: 16, height: 4 },
  },
};

/** Retorna a config de alcance pra espécie + direção (fallback no default). */
export function resolveReach(assetName, facing) {
  const i = REACH_BY_SPECIES[assetName]?.[facing];
  return i || REACH_DEFAULT[facing];
}

// ─── DEVTOOLS: expor pra live-edit ────────────────────────────────────
if (typeof window !== 'undefined') {
  window.__debug = window.__debug || {};
  window.__debug.animalHitboxConfig = REACH_BY_SPECIES;
  window.__debug.animalHitboxDefault = REACH_DEFAULT;
}
