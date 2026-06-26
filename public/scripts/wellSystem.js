/**
 * @file wellSystem.js - Sistema de poços de água
 * @description Gerencia a criação, interação e mecânicas de poços no mundo do jogo.
 * Permite ao jogador coletar água, encher garrafas e beber para restaurar sede.
 * @module WellSystem
 */

import { inventorySystem } from "./thePlayer/inventorySystem.js";
import { assets } from "./assetManager.js";
import { camera } from "./thePlayer/cameraSystem.js";
import { collisionSystem } from "./collisionSystem.js";
import { registerSystem, getObject, getSystem } from "./gameState.js";
import { handleWarn } from "./errorHandler.js";
import { logger } from "./logger.js";
import { t } from "./i18n/i18n.js";

/**
 * Configurações do sistema de poços
 * Define IDs de itens, valores de recursos e dimensões
 * @constant {Object}
 */
const WELL_CONFIG = {
  ITEM_ID_IN_HAND: 93,
  BUCKET_EMPTY_ID: 16,
  BUCKET_WATER_ID: 42,
  BOTTLE_EMPTY_ID: 40,
  BOTTLE_WATER_ID: 41,
  WATERING_CAN_ID: 12,

  WATER_PER_BOTTLE: 30,
  WATER_PER_WATERING_CAN: 20,
  THIRST_RESTORE: 15,

  MIN_TIME_MINUTES: 1,
  MAX_TIME_MINUTES: 5,

  WIDTH: 75,
  HEIGHT: 95,
  INTERACTION_DIST: 50,

  COLLISION_OFFSET_X: 40,
  COLLISION_OFFSET_Y: 121,
};

const wellState = {
  isOpen: false,
  isPulling: false,
  waterLevel: 100,
  pullEndAt: 0,        // timestamp when the current pull finishes
  pullTimerId: null,   // setInterval id for the pull tick
  wells: {},
};

function generateId() {
  return `well_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const wellSystem = {
  // retorna todos os poços registrados
  getWells() {
    return Object.values(wellState.wells);
  },

  // cria e registra um poço no mundo
  placeWell(a, b, c) {
    let id, x, y;

    if (typeof a === "string") {
      id = a;
      x = Number(b) || 0;
      y = Number(c) || 0;
    } else {
      x = Number(a) || 0;
      y = Number(b) || 0;
      id = generateId();
    }

    // Use the canonical config size (matches the build preview), NOT the
    // asset's natural pixel resolution — wellAsset.width is the full PNG size
    // (much larger), which made placed wells render gigantic vs. the preview.
    const width = WELL_CONFIG.WIDTH;
    const height = WELL_CONFIG.HEIGHT;

    const wellObject = {
      id,
      objectId: id,
      type: "well",
      originalType: "well",
      x,
      y,
      width,
      height,
      draw: (ctx) => wellSystem.drawWell(ctx, wellObject),
    };

    wellState.wells[id] = wellObject;

    // Register in world.placedWells if not already present
    const world = getObject("world");
    if (world) {
      if (!Array.isArray(world.placedWells)) world.placedWells = [];
      if (!world.placedWells.find(w => w.id === id)) {
        world.placedWells.push(wellObject);
      }
    }
    // notifica mudança no mundo
    (world?.markWorldChanged || window.theWorld?.markWorldChanged)?.();

    //  se algum listener quebrar
    try {
      document.dispatchEvent(
        new CustomEvent("wellPlaced", { detail: { well: wellObject } })
      );
    } catch (err) {
      handleWarn("falha ao disparar evento wellPlaced", "wellSystem:placeWell:dispatchEvent", {
        id,
        err,
      });
    }

    return wellObject;
  },

  // remove um poço do mundo
  removeWell(id) {
    const world = getObject("world");
    const wells = world?.placedWells || [];
    const index = wells.findIndex((w) => w.id === id);

    // track both sources of truth
    const hadWorld = index !== -1;
    const hadLocal = Boolean(wellState.wells[id]);

    // only return false if not found in either source
    if (!hadWorld && !hadLocal) return false;

    // conditionally remove from world.placedWells
    if (hadWorld) {
      wells.splice(index, 1);
    }

    // always delete from local registry if it existed
    if (hadLocal) {
      delete wellState.wells[id];
    }

    // fix: Proper indentation and error handling for hitbox removal (L148-152)
    try {
      if (typeof collisionSystem?.removeHitbox === "function") {
        // fix: Correctly indented hitbox removal inside if block (L151)
        collisionSystem.removeHitbox(id);
      }
      collisionSystem?.interactionHitboxes?.delete(id);
    } catch (err) {
      handleWarn("falha ao remover hitbox do poço", "wellSystem:removeWell:hitbox", { id, err });
    }

    // notifica mudança no mundo
    try {
      (world?.markWorldChanged || window.theWorld?.markWorldChanged)?.();
    } catch (err) {
      handleWarn("falha ao marcar mundo como alterado", "wellSystem:removeWell:markWorldChanged", { id, err });
    }

    // fix: Restored wellRemoved event dispatch with error handling (L154-158)
    try {
      document.dispatchEvent(new CustomEvent("wellRemoved", { detail: { id } }));
    } catch (err) {
      handleWarn("falha ao disparar evento wellRemoved", "wellSystem:removeWell:dispatchEvent", { id, err });
    }

    this.updateUI();
    return true;
  },

  // desenha o poço no mundo
  drawWell(ctx, wellObject) {
    if (!wellObject) return;

    const wellAsset = assets.furniture?.well || null;
    const screenPos = camera.worldToScreen(wellObject.x, wellObject.y);
    const zoom = camera?.zoom || 1;

    if (wellAsset?.img?.complete) {
      try {
        ctx.drawImage(
          wellAsset.img,
          Math.floor(screenPos.x),
          Math.floor(screenPos.y),
          Math.floor(wellObject.width * zoom),
          Math.floor(wellObject.height * zoom)
        );
        return;
      } catch (err) {
        handleWarn("falha ao desenhar sprite do poço", "wellSystem:drawWell:drawImage", {
          id: wellObject?.id,
          err,
        });
      }
    }

    // fallback simples se sprite não estiver disponível
    ctx.fillStyle = "#4a6b8a";
    ctx.fillRect(
      Math.floor(screenPos.x),
      Math.floor(screenPos.y),
      Math.floor(wellObject.width * zoom),
      Math.floor(wellObject.height * zoom)
    );

    ctx.strokeStyle = "#2d4052";
    ctx.strokeRect(
      Math.floor(screenPos.x),
      Math.floor(screenPos.y),
      Math.floor(wellObject.width * zoom),
      Math.floor(wellObject.height * zoom)
    );
  },

  /**
   * Verifica se os estilos CSS do poço estão carregados
   * CSS carregado externamente via style/well.css
   * @deprecated CSS agora é carregado externamente
   */
  injectStyles() {
    // CSS movido para style/well.css - incluir no index.html
    // Este método é mantido para compatibilidade, mas não injeta mais estilos
  },

  openWellMenu() {
    const existingOverlay = document.getElementById("well-overlay");
    if (existingOverlay) {
      existingOverlay.classList.add("active");
      wellState.isOpen = true;
      this.updateUI();
      return;
    }

    // fix: innerHTML → DOM API
    const overlay = document.createElement("div");
    overlay.id = "well-overlay";
    overlay.classList.add("active");
    const modal = document.createElement('div');
    modal.id = 'well-modal';

    const closeBtn = document.createElement('div');
    closeBtn.className = 'well-close-btn';
    closeBtn.id = 'well-close';
    closeBtn.textContent = 'X';

    // Coluna backpack
    const col1 = document.createElement('div');
    col1.className = 'well-col';
    const h3_1 = document.createElement('h3');
    h3_1.textContent = t('well.backpack');
    const slotBucket = document.createElement('div');
    slotBucket.className = 'well-item-slot';
    slotBucket.id = 'slot-bucket';
    const qtyBucket = document.createElement('div');
    qtyBucket.id = 'qty-bucket';
    qtyBucket.textContent = '0';
    slotBucket.appendChild(qtyBucket);
    const slotBottle = document.createElement('div');
    slotBottle.className = 'well-item-slot';
    slotBottle.id = 'slot-bottle';
    const qtyBottle = document.createElement('div');
    qtyBottle.id = 'qty-bottle';
    qtyBottle.textContent = '0';
    slotBottle.appendChild(qtyBottle);
    col1.append(h3_1, slotBucket, slotBottle);

    // Coluna actions
    const col2 = document.createElement('div');
    col2.className = 'well-col';
    const h3_2 = document.createElement('h3');
    h3_2.textContent = t('well.actions');
    const btnDrink = document.createElement('button');
    btnDrink.className = 'well-main-btn well-btn-blue';
    btnDrink.id = 'btn-drink';
    btnDrink.textContent = t('well.drink');
    const btnTransfer = document.createElement('button');
    btnTransfer.className = 'well-main-btn well-btn-red';
    btnTransfer.id = 'btn-transfer-menu';
    btnTransfer.textContent = t('well.collect');
    const transferOpts = document.createElement('div');
    transferOpts.id = 'transfer-options';
    transferOpts.hidden = true;
    const btnFillBottle = document.createElement('button');
    btnFillBottle.className = 'well-main-btn';
    btnFillBottle.id = 'btn-fill-bottle';
    btnFillBottle.textContent = t('well.fillBottle');
    transferOpts.appendChild(btnFillBottle);
    // Issue #165: fill the watering can (charge state in wateringCan.js).
    const btnFillCan = document.createElement('button');
    btnFillCan.className = 'well-main-btn';
    btnFillCan.id = 'btn-fill-can';
    btnFillCan.textContent = t('well.fillWateringCan');
    transferOpts.appendChild(btnFillCan);
    // Fill the bucket (volume) — uses the same target slider as the can.
    const btnFillBucket = document.createElement('button');
    btnFillBucket.className = 'well-main-btn';
    btnFillBucket.id = 'btn-fill-bucket';
    btnFillBucket.textContent = t('well.fillBucket');
    transferOpts.appendChild(btnFillBucket);
    // Choose how full to fill the can/bucket (conserves well water). Default 100%.
    const fillCanRow = document.createElement('div');
    fillCanRow.className = 'well-fill-can-row';
    fillCanRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:6px;';
    const canSlider = document.createElement('input');
    canSlider.type = 'range';
    canSlider.id = 'fill-can-slider';
    canSlider.min = '0'; canSlider.max = '100'; canSlider.step = '5'; canSlider.value = '100';
    canSlider.style.flex = '1';
    const canSliderVal = document.createElement('span');
    canSliderVal.id = 'fill-can-slider-val';
    canSliderVal.textContent = '100%';
    canSlider.addEventListener('input', () => { canSliderVal.textContent = `${canSlider.value}%`; });
    fillCanRow.append(canSlider, canSliderVal);
    transferOpts.appendChild(fillCanRow);
    col2.append(h3_2, btnDrink, btnTransfer, transferOpts);

    // Coluna well
    const col3 = document.createElement('div');
    col3.className = 'well-col';
    const h3_3 = document.createElement('h3');
    h3_3.textContent = t('well.well');
    const bucketContainer = document.createElement('div');
    bucketContainer.className = 'well-bucket-container';
    const waterLevel = document.createElement('div');
    waterLevel.className = 'well-water-fill';
    waterLevel.id = 'well-water-level';
    bucketContainer.appendChild(waterLevel);
    const btnPullWater = document.createElement('button');
    btnPullWater.className = 'well-main-btn well-btn-green';
    btnPullWater.id = 'btn-pull-water';
    btnPullWater.textContent = t('well.lowerBucket');
    const wellTimer = document.createElement('div');
    wellTimer.id = 'well-timer';
    wellTimer.hidden = true;
    wellTimer.textContent = '00:00';
    col3.append(h3_3, bucketContainer, btnPullWater, wellTimer);

    modal.append(closeBtn, col1, col2, col3);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    closeBtn.addEventListener('click', () => this.closeWellMenu());
    btnPullWater.addEventListener('click', () => this.startPullingWater());
    btnDrink.addEventListener('click', () => this.drinkFromWell());
    btnTransfer.addEventListener('click', () => {
      transferOpts.hidden = !transferOpts.hidden;
    });
    btnFillBottle.addEventListener('click', () => this.fillBottle());
    btnFillCan.addEventListener('click', () => this.fillWateringCan());
    btnFillBucket.addEventListener('click', () => this.fillBucket());

    wellState.isOpen = true;
    this.updateUI();
  },

  closeWellMenu() {
    document.getElementById("well-overlay")?.remove();
    wellState.isOpen = false;
  },

  updateUI() {
    const bucketQtyEl = document.getElementById("qty-bucket");
    const bottleQtyEl = document.getElementById("qty-bottle");
    const levelEl = document.getElementById("well-water-level");
    const timerEl = document.getElementById("well-timer");

    const bucketQty = inventorySystem.getItemQuantity?.("tools", WELL_CONFIG.BUCKET_EMPTY_ID) || 0;
    const bottleQty = inventorySystem.getItemQuantity?.("consumable", WELL_CONFIG.BOTTLE_EMPTY_ID) || 0;

    if (bucketQtyEl) bucketQtyEl.textContent = bucketQty ? "1" : "0";
    if (bottleQtyEl) bottleQtyEl.textContent = bottleQty.toString();

    if (levelEl) {
      levelEl.style.setProperty('--water-level', `${wellState.waterLevel}%`);
      levelEl.textContent = `${Math.floor(wellState.waterLevel)}%`;
    }

    if (timerEl) timerEl.hidden = !wellState.isPulling;

    // Enquanto o balde está descendo (isPulling), bloqueia coletar/beber e
    // descer de novo — só dá pra agir quando o balde volta.
    const pulling = wellState.isPulling;
    for (const id of ['btn-drink', 'btn-transfer-menu', 'btn-fill-bottle', 'btn-fill-can', 'btn-pull-water']) {
      const b = document.getElementById(id);
      if (b) b.disabled = pulling;
    }
  },

  startPullingWater() {
    if (wellState.isPulling) return; // já descendo — não reinicia

    wellState.isPulling = true;

    const minMs = WELL_CONFIG.MIN_TIME_MINUTES * 60000;
    const maxMs = WELL_CONFIG.MAX_TIME_MINUTES * 60000;
    const duration = Math.random() * (maxMs - minMs) + minMs;
    wellState.pullEndAt = Date.now() + duration;

    // Mostra o timer e desabilita coletar/beber imediatamente.
    this.updateUI();

    // setInterval (não rAF): a contagem corre mesmo com o menu fechado/reaberto
    // ou aba em segundo plano, e o elemento do timer é re-buscado a cada tick
    // (não fica preso num timerEl órfão se o menu for recriado). Isso conserta
    // o "às vezes não começa a contar" (estado/elemento travado).
    if (wellState.pullTimerId) clearInterval(wellState.pullTimerId);
    wellState.pullTimerId = setInterval(() => {
      const left = wellState.pullEndAt - Date.now();
      if (left <= 0) {
        clearInterval(wellState.pullTimerId);
        wellState.pullTimerId = null;
        wellState.isPulling = false;
        wellState.waterLevel = 100;
        this.updateUI();
        return;
      }
      const timerEl = document.getElementById("well-timer");
      if (timerEl) {
        const m = Math.floor(left / 60000);
        const s = Math.floor((left % 60000) / 1000);
        timerEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
    }, 250);
  },

  drinkFromWell() {
    if (wellState.isPulling) return; // balde descido — não dá pra beber
    if (wellState.waterLevel < 5) {
      handleWarn(t('well.insufficientWater'), "wellSystem:drinkFromWell");
      return;
    }

    const playerSystem = getSystem('player');
    if (playerSystem?.restoreNeeds) {
      playerSystem.restoreNeeds(0, WELL_CONFIG.THIRST_RESTORE, 0);
      wellState.waterLevel -= 5;
    } else {
      handleWarn(t('well.playerNotAvailable'), "wellSystem:drinkFromWell");
    }
    this.updateUI();
  },

  fillBottle() {
    if (wellState.isPulling) return; // balde descido — não dá pra coletar
    const inv = inventorySystem.getInventory?.();
    if (!inv) return;

    let catFound = null;

    for (const cat in inv) {
      if (inv[cat]?.items?.some((i) => i.id === WELL_CONFIG.BOTTLE_EMPTY_ID)) {
        catFound = cat;
        break;
      }
    }

    if (!catFound) {
      handleWarn(t('well.noEmptyBottle'), "wellSystem:fillBottle");
      return;
    }

    if (wellState.waterLevel < WELL_CONFIG.WATER_PER_BOTTLE) {
      handleWarn(t('well.insufficientWater'), "wellSystem:fillBottle");
      return;
    }

    inventorySystem.removeItem(catFound, WELL_CONFIG.BOTTLE_EMPTY_ID, 1);
    inventorySystem.addItem(catFound, WELL_CONFIG.BOTTLE_WATER_ID, 1);

    wellState.waterLevel -= WELL_CONFIG.WATER_PER_BOTTLE;
    this.updateUI();
  },

  fillWateringCan() {
    if (wellState.isPulling) return; // balde descido — não dá pra coletar
    const hasCan = (inventorySystem.getItemQuantity?.("tools", WELL_CONFIG.WATERING_CAN_ID) ?? 0) > 0;
    if (!hasCan) {
      handleWarn(t('well.noWateringCan'), "wellSystem:fillWateringCan");
      return;
    }
    const canSystem = getSystem('wateringCan');
    if (!canSystem || typeof canSystem.fillTo !== 'function') {
      handleWarn('Watering can system unavailable', 'wellSystem:fillWateringCan');
      return;
    }

    // Fill up to the slider target (default 100%). The well drains in proportion
    // to the water actually added, and the fill is capped by what's left.
    const slider = document.getElementById('fill-can-slider');
    const target = slider ? Number(slider.value) : 100;
    const current = canSystem.getLevel?.() ?? 0;
    const want = Math.max(0, target - current);
    if (want <= 0) return; // already at/above the chosen level

    const perPct = WELL_CONFIG.WATER_PER_WATERING_CAN / 100; // well units per 1% of can
    const affordablePct = perPct > 0 ? Math.floor(wellState.waterLevel / perPct) : want;
    const addPct = Math.min(want, affordablePct);
    if (addPct <= 0) {
      handleWarn(t('well.insufficientWater'), "wellSystem:fillWateringCan");
      return;
    }

    const added = canSystem.fillTo(current + addPct);
    wellState.waterLevel = Math.max(0, wellState.waterLevel - added * perPct);
    this.updateUI();
  },

  // Fill the bucket to the slider target, mirroring fillWateringCan().
  fillBucket() {
    if (wellState.isPulling) return;
    const hasBucket = (inventorySystem.getItemQuantity?.("tools", WELL_CONFIG.BUCKET_EMPTY_ID) ?? 0) > 0;
    if (!hasBucket) {
      handleWarn(t('well.noBucket'), "wellSystem:fillBucket");
      return;
    }
    const bucket = getSystem('bucket');
    if (!bucket || typeof bucket.fillTo !== 'function') {
      handleWarn('Bucket system unavailable', 'wellSystem:fillBucket');
      return;
    }

    const slider = document.getElementById('fill-can-slider');
    const target = slider ? Number(slider.value) : 100;
    const current = bucket.getLevel?.() ?? 0;
    const want = Math.max(0, target - current);
    if (want <= 0) return;

    const perPct = WELL_CONFIG.WATER_PER_WATERING_CAN / 100; // same cost basis as the can
    const affordablePct = perPct > 0 ? Math.floor(wellState.waterLevel / perPct) : want;
    const addPct = Math.min(want, affordablePct);
    if (addPct <= 0) {
      handleWarn(t('well.insufficientWater'), "wellSystem:fillBucket");
      return;
    }

    const added = bucket.fillTo(current + addPct);
    wellState.waterLevel = Math.max(0, wellState.waterLevel - added * perPct);
    this.updateUI();
  },

  init() {},
};

// Registrar no gameState (legacy window.wellSystem tratado por installLegacyGlobals)
registerSystem("well", wellSystem);
wellSystem.init();
