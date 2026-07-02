/**
 * @file foodTroughSystem.js - Sistema de Cocho de Ração
 * @description Interação do jogador com cochos de alimentação construídos.
 * Espelhado do waterTroughSystem.js mas com filtro de espécie (cattle/pork/bird).
 *
 * Fluxo de depósito: jogador aperta E perto do cocho com ração compatível
 * no inventário → cocho enche, ração some.
 *
 * Fluxo de animal: AI detecta fome, procura cocho da espécie correta, caminha
 * até ele, come por ~6s, fome sobe.
 *
 * @module FoodTroughSystem
 */

import { inventorySystem } from "./thePlayer/inventorySystem.js";
import { placedBuildings, animals } from "./theWorld.js";
import { registerSystem, getSystem, getDebugFlag } from "./gameState.js";
import { handleWarn } from "./errorHandler.js";
import { logger } from "./logger.js";
import { t } from "./i18n/i18n.js";
import { drawTroughHoverMarker, troughCenter as _troughCenter } from "./troughMarker.js";
import { getItem } from "./itemUtils.js";
import { createSlotRegistry, slotWorldRects, troughStandPosition } from "./animal/troughSlots.js";

const FOOD_TROUGH_CONFIG = {
  MAX_FOOD_LEVEL: 100,
  MAX_PREMIUM_LEVEL: 100,
  FOOD_PER_FEED: 50,
  PREMIUM_PER_FEED: 50,
};

// Map animal asset name → species code. There are only three trough species
// (cattle/pork/bird); Sheep/Lamb intentionally share the cattle trough — they're
// grazing livestock and there's no dedicated sheep trough variant. (#179)
const ANIMAL_TO_SPECIES = {
  Cow: "cattle", Bull: "cattle", Calf: "cattle",
  Sheep: "cattle", Lamb: "cattle",
  Pig: "pork", Piglet: "pork",
  Chicken: "bird", Chick: "bird", Rooster: "bird", Turkey: "bird",
};

// Feed classification is now dynamic — read `targetAnimals` off each
// animal_food item:
//   - targetAnimals === 'all'  → premium (universal seasoning)
//   - array that overlaps with the trough's targetAnimals → basic feed
// This way any new animal_food added to item.js works automatically with
// no list maintenance.


// Eat slots — 3 per trough, keyed by full variant so each species can be
// tuned independently (cattle sprite weight differs from bird/pork). X
// orientation has 3 slots side-by-side, Y has them stacked. Animal claims
// a slot, walks to its outer edge, then eats.
//
// LIVE-EDIT:
//   - URL ?eatSlots=1 to see the boxes
//   - devtools: __debug.foodTroughEatSlots.foodTroughcattleX[0].offsetY = 0.3
//   - reflects next frame (drawEatSlots reads each tick)
const _SLOTS_X = [
  { offsetX: 0.05, offsetY: 0.35, w: 0.28, h: 0.50 },
  { offsetX: 0.36, offsetY: 0.25, w: 0.28, h: 0.50 },
  { offsetX: 0.67, offsetY: 0.25, w: 0.28, h: 0.50 },
];
const _SLOTS_Y = [
  { offsetX: 0.25, offsetY: 0.05, w: 0.50, h: 0.28 },
  { offsetX: 0.25, offsetY: 0.36, w: 0.50, h: 0.28 },
  { offsetX: 0.25, offsetY: 0.67, w: 0.50, h: 0.28 },
];

// Per-species, per-orientation slot config. Same defaults; diverge here
// when a species' sprite needs different alignment.
const EAT_SLOTS = {
  foodTroughcattleX: _SLOTS_X.map(s => ({ ...s })),
  foodTroughcattleY: _SLOTS_Y.map(s => ({ ...s })),
  foodTroughporkX:   _SLOTS_X.map(s => ({ ...s })),
  foodTroughporkY:   _SLOTS_Y.map(s => ({ ...s })),
  foodTroughBirdX:   _SLOTS_X.map(s => ({ ...s })),
  foodTroughBirdY:   _SLOTS_Y.map(s => ({ ...s })),
};

function _slotsFor(variant) {
  if (EAT_SLOTS[variant]) return EAT_SLOTS[variant];
  // Fallback: pick by orientation if variant string is unknown.
  return (variant || '').endsWith('Y') ? _SLOTS_Y : _SLOTS_X;
}

// Slot reservation: troughId → [animalId|null, ...] (3 slots). Own registry
// instance — food occupancy is separate from water's. See troughSlots.js.
const _slots = createSlotRegistry();

let _hoveredId = null;
let _ftToastEl = null;
let _ftToastTimer = null;

function _toast(msg) {
  if (!msg) return;
  try {
    if (!_ftToastEl) {
      _ftToastEl = document.createElement('div');
      _ftToastEl.className = 'xp-toast';
      document.body.appendChild(_ftToastEl);
    }
    _ftToastEl.textContent = msg;
    _ftToastEl.classList.add('visible');
    clearTimeout(_ftToastTimer);
    _ftToastTimer = setTimeout(() => {
      _ftToastEl?.classList.remove('visible');
    }, 1500);
  } catch (_) {
    logger.info(`[foodTrough] ${msg}`);
  }
}

function _findTrough(id) {
  if (!id || !Array.isArray(placedBuildings)) return null;
  return placedBuildings.find(b => b && b.id === id && b.originalType === 'foodtrough') || null;
}

function _troughAtWorldPoint(wx, wy) {
  const troughs = (Array.isArray(placedBuildings) ? placedBuildings : [])
    .filter(b => b && b.originalType === 'foodtrough');
  for (const ft of troughs) {
    if (wx >= ft.x && wx <= ft.x + ft.width &&
        wy >= ft.y && wy <= ft.y + ft.height) {
      return ft;
    }
  }
  return null;
}

function _isPremiumFeed(itemData) {
  return itemData?.targetAnimals === 'all';
}

function _matchesTroughAsBasic(itemData, trough) {
  if (!itemData || itemData.type !== 'animal_food') return false;
  if (itemData.targetAnimals === 'all') return false; // universal goes to premium
  if (!Array.isArray(itemData.targetAnimals)) return false;
  const accepted = trough?.targetAnimals;
  if (!Array.isArray(accepted) || accepted.length === 0) return false;
  for (const asset of itemData.targetAnimals) {
    if (accepted.includes(asset)) return true;
  }
  return false;
}

// Walk the player's animal_food inventory and return the first id matching
// the trough as either basic or premium feed.
function _findFeedInInventory(trough, premium) {
  const inv = inventorySystem.getInventory?.();
  const slots = inv?.animal_food?.items || [];
  for (const slot of slots) {
    if ((slot.quantity || 0) <= 0) continue;
    const itemData = getItem(slot.id);
    if (!itemData) continue;
    if (premium) {
      if (_isPremiumFeed(itemData)) return slot.id;
    } else {
      if (_matchesTroughAsBasic(itemData, trough)) return slot.id;
    }
  }
  return null;
}

export const foodTroughSystem = {
  // Lists all food troughs in the world.
  getFoodTroughs() {
    return (Array.isArray(placedBuildings) ? placedBuildings : [])
      .filter(b => b && b.originalType === 'foodtrough');
  },

  // Add to main food bar.
  addFood(foodTroughId, amount) {
    const ft = _findTrough(foodTroughId);
    if (!ft) return false;

    const prev = ft.foodLevel || 0;
    ft.foodLevel = Math.min(prev + amount, FOOD_TROUGH_CONFIG.MAX_FOOD_LEVEL);

    if (ft.foodLevel > prev) {
      try {
        document.dispatchEvent(new CustomEvent('foodTroughFilled', {
          detail: { foodTrough: ft, previousLevel: prev, currentLevel: ft.foodLevel },
        }));
      } catch (err) {
        handleWarn('falha ao disparar foodTroughFilled', 'foodTroughSystem:addFood', { id: foodTroughId, err });
      }
    }
    return true;
  },

  // Add to premium ("tempero") bar — universal feeds only.
  addPremium(foodTroughId, amount) {
    const ft = _findTrough(foodTroughId);
    if (!ft) return false;
    const prev = ft.premiumLevel || 0;
    ft.premiumLevel = Math.min(prev + amount, FOOD_TROUGH_CONFIG.MAX_PREMIUM_LEVEL);
    return ft.premiumLevel > prev;
  },

  /**
   * Animal eats from the trough. Premium drains first when available —
   * slower rate but more hunger restored per tick (the "tempero" effect).
   * Returns { drained: bool, fromPremium: bool } or false if empty.
   */
  eat(foodTroughId, basicAmount = 5, premiumAmount = 3) {
    const ft = _findTrough(foodTroughId);
    if (!ft) return false;

    if ((ft.premiumLevel || 0) > 0) {
      const prev = ft.premiumLevel;
      ft.premiumLevel = Math.max(prev - premiumAmount, 0);
      return { drained: ft.premiumLevel < prev, fromPremium: true };
    }
    if ((ft.foodLevel || 0) > 0) {
      const prev = ft.foodLevel;
      ft.foodLevel = Math.max(prev - basicAmount, 0);
      return { drained: ft.foodLevel < prev, fromPremium: false };
    }
    return false;
  },

  /**
   * Player presses E next to trough. Auto-pick: basic first if main bar
   * has room, else premium if premium bar has room.
   */
  openFoodTroughMenu(foodTroughId) {
    const ft = _findTrough(foodTroughId);
    if (!ft) {
      logger.warn(`[foodTroughSystem] cocho não encontrado: ${foodTroughId}`);
      return;
    }

    const basicFull = (ft.foodLevel || 0) >= FOOD_TROUGH_CONFIG.MAX_FOOD_LEVEL;
    const premiumFull = (ft.premiumLevel || 0) >= FOOD_TROUGH_CONFIG.MAX_PREMIUM_LEVEL;

    if (basicFull && premiumFull) {
      _toast(t('foodTrough.alreadyFull') || 'Cocho de ração já está cheio');
      return;
    }

    // Try basic first; if no basic available or bar full, try premium.
    if (!basicFull && this.depositFeed(foodTroughId)) return;
    if (!premiumFull) this.depositPremium(foodTroughId);
  },

  /**
   * Consume 1 basic feed (species-specific) and add to the main bar.
   * Returns true on success.
   */
  depositFeed(foodTroughId) {
    const ft = _findTrough(foodTroughId);
    if (!ft) return false;
    if ((ft.foodLevel || 0) >= FOOD_TROUGH_CONFIG.MAX_FOOD_LEVEL) {
      _toast(t('foodTrough.alreadyFull') || 'Barra de ração já está cheia');
      return false;
    }

    const feedId = _findFeedInInventory(ft, false);
    if (feedId == null) {
      _toast(t('foodTrough.needFeed') || 'Precisa de ração compatível no inventário');
      return false;
    }

    if (!inventorySystem.removeItem(feedId, 1)) return false;

    this.addFood(foodTroughId, FOOD_TROUGH_CONFIG.FOOD_PER_FEED);
    const feedItem = getItem(feedId);
    _toast(t('foodTrough.filled', { feed: feedItem?.name || 'ração' })
      || `Cocho abastecido com ${feedItem?.name || 'ração'}`);
    return true;
  },

  depositPremium(foodTroughId) {
    const ft = _findTrough(foodTroughId);
    if (!ft) return false;
    if ((ft.premiumLevel || 0) >= FOOD_TROUGH_CONFIG.MAX_PREMIUM_LEVEL) {
      _toast(t('foodTrough.premiumFull') || 'Barra especial já está cheia');
      return false;
    }

    const feedId = _findFeedInInventory(ft, true);
    if (feedId == null) {
      _toast(t('foodTrough.needPremium') || 'Sem ração especial (Petisco/Premium) no inventário');
      return false;
    }

    if (!inventorySystem.removeItem(feedId, 1)) return false;

    this.addPremium(foodTroughId, FOOD_TROUGH_CONFIG.PREMIUM_PER_FEED);
    const feedItem = getItem(feedId);
    _toast(t('foodTrough.premiumFilled', { feed: feedItem?.name || 'especial' })
      || `Cocho temperado com ${feedItem?.name || 'especial'}`);
    return true;
  },

  // Update which trough is under the mouse (called by mousemove in control.js).
  updateHover(wx, wy) {
    const ft = _troughAtWorldPoint(wx, wy);
    _hoveredId = ft ? ft.id : null;
  },

  clearHover() {
    _hoveredId = null;
  },

  // Returns the trough clicked, or null.
  getMarkerAt(wx, wy) {
    return _troughAtWorldPoint(wx, wy);
  },

  /**
   * Draw the "+" marker over the hovered trough. Called by gameLoop
   * in main.js after drawing building hitboxes.
   */
  drawHoverMarker(ctx, camera) {
    if (!_hoveredId || !ctx || !camera) return;
    const ft = _findTrough(_hoveredId);
    if (!ft) { _hoveredId = null; return; }

    const foodPct = Math.round(((ft.foodLevel || 0) / FOOD_TROUGH_CONFIG.MAX_FOOD_LEVEL) * 100);
    const premPct = Math.round(((ft.premiumLevel || 0) / FOOD_TROUGH_CONFIG.MAX_PREMIUM_LEVEL) * 100);
    const label = premPct > 0 ? `🌾 ${foodPct}%  ⭐ ${premPct}%` : `🌾 ${foodPct}%`;
    drawTroughHoverMarker(ctx, camera, ft, label);
  },

  // Get current / max food level.
  getFoodLevel(foodTroughId) {
    const ft = _findTrough(foodTroughId);
    if (!ft) return 0;
    return ft.foodLevel || 0;
  },
  getMaxFoodLevel() {
    return FOOD_TROUGH_CONFIG.MAX_FOOD_LEVEL;
  },
  getFoodPerFeed() {
    return FOOD_TROUGH_CONFIG.FOOD_PER_FEED;
  },
  getPremiumLevel(foodTroughId) {
    const ft = _findTrough(foodTroughId);
    if (!ft) return 0;
    return ft.premiumLevel || 0;
  },
  getMaxPremiumLevel() {
    return FOOD_TROUGH_CONFIG.MAX_PREMIUM_LEVEL;
  },
  getPremiumPerFeed() {
    return FOOD_TROUGH_CONFIG.PREMIUM_PER_FEED;
  },
  // Whether the player has at least one feed matching this trough as basic.
  hasBasicFeedAvailable(trough) {
    if (!trough) return false;
    return _findFeedInInventory(trough, false) != null;
  },
  hasPremiumFeedAvailable(trough) {
    return _findFeedInInventory(trough || { targetAnimals: [] }, true) != null;
  },

  // Returns the 3 eat slots of a trough in world coords. Each: {idx, x, y, w, h}.
  getEatSlots(troughOrId) {
    const ft = (typeof troughOrId === 'string') ? _findTrough(troughOrId) : troughOrId;
    if (!ft) return [];
    return slotWorldRects(ft, _slotsFor(ft.variant));
  },

  // Find the index of a free slot in this trough, or -1.
  findFreeSlotIn(troughId, animalId) {
    const occ = _slots.occupancyFor(troughId);
    for (let i = 0; i < occ.length; i++) {
      if (occ[i] == null || occ[i] === animalId) return i;
      // Stale check: slot owner no longer exists in world.
      const owner = Array.isArray(animals) ? animals.find(a => a && a.id === occ[i]) : null;
      if (!owner) { occ[i] = null; return i; }
      // Stale check: owner is alive but no longer in food flow.
      if (owner.state !== 'seeking_food' && owner.state !== 'eating') {
        occ[i] = null;
        return i;
      }
    }
    return -1;
  },

  /**
   * Locate the nearest trough for an animal AND reserve a slot in it.
   * Returns { trough, slotIdx, slotWorld, eatPos } or null.
   * Animals seek troughs that have ANY food (basic or premium).
   */
  findFreeSlotFor(animal) {
    if (!animal) return null;
    const species = ANIMAL_TO_SPECIES[animal.assetName];
    if (!species) return null;

    const troughs = this.getFoodTroughs();
    if (troughs.length === 0) return null;

    // Mirror water trough enclosure rule: animal inside a fence can only
    // eat from troughs inside the SAME fence; animal loose on the farm
    // can use any trough of its species.
    const encSys = getSystem('enclosure');
    const animalEnc = encSys?.getEnclosureAtPoint?.(animal.x, animal.y) || null;

    // Sort candidates by distance, prefer ones with food.
    const candidates = [];
    for (const ft of troughs) {
      if (ft.species !== species) continue;
      if ((ft.foodLevel || 0) <= 0 && (ft.premiumLevel || 0) <= 0) continue;
      const { cx, cy } = _troughCenter(ft);
      if (animalEnc && encSys) {
        const troughEnc = encSys.getEnclosureAtPoint(cx, cy);
        if (!troughEnc || troughEnc.id !== animalEnc.id) continue;
      }
      const dx = animal.x - cx;
      const dy = animal.y - cy;
      candidates.push({ ft, d2: dx * dx + dy * dy });
    }
    candidates.sort((a, b) => a.d2 - b.d2);

    for (const { ft } of candidates) {
      const slotIdx = this.findFreeSlotIn(ft.id, animal.id);
      if (slotIdx >= 0) {
        const slots = this.getEatSlots(ft);
        const slot = slots[slotIdx];
        return {
          trough: ft,
          slotIdx,
          slotWorld: slot,
          eatPos: this.getEatPosition(ft, slot, animal),
        };
      }
    }
    return null;
  },

  /**
   * Where the animal must stand to eat from a specific slot. Mirrors
   * waterTroughSystem.getDrinkPosition. Stand on the OUTSIDE edge of the
   * trough, perpendicular to its long axis, aligned with the slot center.
   */
  getEatPosition(trough, slot, animal) {
    const isHorizontal = !(trough.variant || '').endsWith('Y');
    return troughStandPosition(trough, slot, animal, isHorizontal);
  },

  // Slot reservation — delegated to the shared registry (see troughSlots.js).
  claimSlot(troughId, slotIdx, animalId) {
    return _slots.claimSlot(troughId, slotIdx, animalId);
  },
  releaseSlot(troughId, slotIdx, animalId) {
    _slots.releaseSlot(troughId, slotIdx, animalId);
  },
  releaseAllSlotsFor(animalId) {
    _slots.releaseAllSlotsFor(animalId);
  },

  /**
   * Returns true when the animal's interaction hitbox overlaps the slot.
   * Mirrors water trough's `_interactionHitsSlot` — the eat slot lives
   * INSIDE the trough bounds, so the animal's body center can't reach it
   * from the outside. The interaction hitbox (wider reach zone) does.
   */
  isAnimalAtSlot(animal, troughId, slotIdx) {
    if (!animal) return false;
    const slots = this.getEatSlots(troughId);
    const slot = slots[slotIdx];
    if (!slot) return false;
    const ih = (typeof animal.getInteractionHitbox === 'function')
      ? animal.getInteractionHitbox()
      : null;
    if (!ih) return false;

    const overlaps = (r) =>
      ih.x < r.x + (r.w ?? r.width) &&
      ih.x + ih.w > r.x &&
      ih.y < r.y + (r.h ?? r.height) &&
      ih.y + ih.h > r.y;

    // Primary: reach hitbox pokes into the claimed slot.
    if (overlaps(slot)) return true;

    // Fallback (mirrors the water trough's lenient body-in-bounds check):
    // small species (Chicken/Chick) have a short reach hitbox that pokes into
    // the trough but falls short of the inset slot rect, so the strict slot
    // overlap above never matched and they bounced out of EATING immediately
    // (#179). The animal is positioned at the trough edge by getEatPosition,
    // so a reach touching the trough's outer bounds means it's in place to eat.
    const trough = _findTrough(troughId);
    return !!trough && overlaps(trough);
  },

  // Back-compat: any slot of the trough.
  isAnimalAtTrough(animal, troughId) {
    if (!animal) return false;
    const slots = this.getEatSlots(troughId);
    for (let i = 0; i < slots.length; i++) {
      if (this.isAnimalAtSlot(animal, troughId, i)) return true;
    }
    return false;
  },

  /**
   * Debug overlay — paint the 3 eat slots over each trough. Toggle with
   * URL flag `?eatSlots=1`. Mirror of waterTroughSystem.drawDrinkSlots.
   */
  drawEatSlots(ctx, camera) {
    if (!ctx || !camera) return;
    if (!getDebugFlag('eatSlots')) return;

    const zoom = camera.zoom || 1;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.font = `${Math.round(11 * zoom)}px monospace`;
    ctx.textBaseline = 'top';

    for (const ft of this.getFoodTroughs()) {
      const slots = this.getEatSlots(ft);
      const occ = _slots.occupancy.get(ft.id) || [];
      for (const s of slots) {
        const screen = camera.worldToScreen(s.x, s.y);
        const sx = Math.round(screen.x);
        const sy = Math.round(screen.y);
        const sw = Math.round(s.w * zoom);
        const sh = Math.round(s.h * zoom);
        const taken = occ[s.idx] != null;
        ctx.fillStyle   = taken ? 'rgba(255, 165, 0, 0.25)' : 'rgba(180, 140, 60, 0.18)';
        ctx.strokeStyle = taken ? 'rgba(255, 165, 0, 0.95)' : 'rgba(212, 152, 80, 0.85)';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(String(s.idx), sx + 3, sy + 2);
      }
    }
    ctx.restore();
  },

  init() {
    // Expose for live-edit in devtools (same pattern as drink slots).
    // Per-variant keys: foodTroughcattleX / foodTroughcattleY / pork… / Bird…
    // Example: __debug.foodTroughEatSlots.foodTroughBirdX[0].offsetY = 0.3
    if (typeof window !== 'undefined') {
      window.__debug = window.__debug || {};
      window.__debug.foodTroughEatSlots = EAT_SLOTS;
      // Quick test helper: drop every animal's hunger so the food-seeking
      // flow fires immediately. Without this you'd wait ~8min for natural
      // decay. Defaults to 15 (below any threshold in the 10-30 range).
      window.__debug.makeAnimalsHungry = (level = 15) => {
        const list = Array.isArray(animals) ? animals : [];
        for (const a of list) {
          if (a?.stats) a.stats.hunger = level;
        }
        logger.info(`[foodTrough] set hunger=${level} on ${list.length} animal(s)`);
      };
      // Fill every food trough's basic bar to 80. Skips troughs already above.
      window.__debug.fillAllFoodTroughs = (level = 80) => {
        const troughs = foodTroughSystem.getFoodTroughs();
        for (const t of troughs) {
          if ((t.foodLevel || 0) < level) t.foodLevel = level;
        }
        logger.info(`[foodTrough] set foodLevel=${level} on ${troughs.length} trough(s)`);
      };
      // Diagnostic: for each animal, print why findFreeSlotFor fails (or what
      // it returned). Run in console: __debug.whyNoEat()
      window.__debug.whyNoEat = () => {
        const list = Array.isArray(animals) ? animals : [];
        const troughs = foodTroughSystem.getFoodTroughs();
        const encSys = getSystem('enclosure');
        console.group('[foodTrough] eat diagnostic');
        console.log(`troughs in world: ${troughs.length}`,
          troughs.map(t => ({ id: t.id, species: t.species, food: t.foodLevel||0, premium: t.premiumLevel||0, variant: t.variant })));
        for (const a of list) {
          const species = ANIMAL_TO_SPECIES[a.assetName];
          const threshold = a._eatThreshold;
          const hunger = a.stats?.hunger;
          const claimed = a._claimedFoodTrough;
          const cooldown = (a._eatCooldownUntil || 0) - performance.now();
          const animalEnc = encSys?.getEnclosureAtPoint?.(a.x, a.y) || null;
          const found = foodTroughSystem.findFreeSlotFor(a);
          console.log(
            `${a.assetName}#${a.id?.slice?.(-6) || '?'}: ` +
            `species=${species} hunger=${hunger?.toFixed?.(1)} threshold=${threshold?.toFixed?.(1)} ` +
            `state=${a.state} mood=${a._mood} ` +
            `claim=${claimed ? claimed.slice(-6) : 'none'} cooldown=${cooldown > 0 ? Math.round(cooldown) + 'ms' : 'ready'} ` +
            `enc=${animalEnc?.id?.slice?.(-6) || 'open-field'} ` +
            `result=${found ? `→trough#${found.trough.id.slice(-6)} slot${found.slotIdx}` : 'NO MATCH'}`
          );
        }
        console.groupEnd();
      };
    }
  },
};

registerSystem('foodTrough', foodTroughSystem);
foodTroughSystem.init();

export default foodTroughSystem;
