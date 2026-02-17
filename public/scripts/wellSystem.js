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

  WATER_PER_BOTTLE: 30,
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
  wells: {},
};

function generateId() {
  return `well_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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

    const wellAsset = assets.furniture?.well || null;
    const width = wellAsset?.width || WELL_CONFIG.WIDTH;
    const height = wellAsset?.height || WELL_CONFIG.HEIGHT;

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

    document.getElementById("well-close").onclick = () => this.closeWellMenu();
    document.getElementById("btn-pull-water").onclick = () => this.startPullingWater();
    document.getElementById("btn-drink").onclick = () => this.drinkFromWell();
    document.getElementById("btn-transfer-menu").onclick = () => {
      const opts = document.getElementById("transfer-options");
      opts.hidden = !opts.hidden;
    };
    document.getElementById("btn-fill-bottle").onclick = () => this.fillBottle();

    overlay.style.display = "flex";
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
      levelEl.style.height = `${wellState.waterLevel}%`;
      levelEl.textContent = `${Math.floor(wellState.waterLevel)}%`;
    }

    if (timerEl) timerEl.hidden = !wellState.isPulling;
  },

  startPullingWater() {
    if (wellState.isPulling) return;

    wellState.isPulling = true;

    const minMs = WELL_CONFIG.MIN_TIME_MINUTES * 60000;
    const maxMs = WELL_CONFIG.MAX_TIME_MINUTES * 60000;
    const duration = Math.random() * (maxMs - minMs) + minMs;

    const end = Date.now() + duration;
    const timerEl = document.getElementById("well-timer");

    const tick = () => {
      const left = end - Date.now();
      if (left <= 0) {
        wellState.isPulling = false;
        wellState.waterLevel = 100;
        this.updateUI();
        return;
      }

      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      if (timerEl) timerEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  },

  drinkFromWell() {
    if (wellState.waterLevel < 5) {
      console.warn(`⚠️ ${t('well.insufficientWater')}`);
      return;
    }

    const playerSystem = getSystem('player');
    if (playerSystem?.restoreNeeds) {
      playerSystem.restoreNeeds(0, WELL_CONFIG.THIRST_RESTORE, 0);
      wellState.waterLevel -= 5;
    } else {
      console.warn(`⚠️ ${t('well.playerNotAvailable')}`);
    }
    this.updateUI();
  },

  fillBottle() {
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
      console.warn(`⚠️ ${t('well.noEmptyBottle')}`);
      return;
    }

    if (wellState.waterLevel < WELL_CONFIG.WATER_PER_BOTTLE) {
      console.warn(`⚠️ ${t('well.insufficientWater')}`);
      return;
    }

    inventorySystem.removeItem(catFound, WELL_CONFIG.BOTTLE_EMPTY_ID, 1);
    inventorySystem.addItem(catFound, WELL_CONFIG.BOTTLE_WATER_ID, 1);

    wellState.waterLevel -= WELL_CONFIG.WATER_PER_BOTTLE;
    this.updateUI();
  },

  init() {},
};

// Registrar no gameState (legacy window.wellSystem tratado por installLegacyGlobals)
registerSystem("well", wellSystem);
wellSystem.init();
