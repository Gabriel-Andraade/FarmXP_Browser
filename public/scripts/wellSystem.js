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
import { registerSystem, getObject } from "./gameState.js";
import { handleWarn } from "./errorHandler.js";

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

    // notifica mudança no mundo sem try/catch 
    const world = getObject("world");
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
    const world = getObject("world") || window.theWorld;
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

   // hitbox cleanup
if (typeof collisionSystem?.removeHitbox === "function") {
  try {
    collisionSystem.removeHitbox(id);
  } catch (err) {
    handleWarn("falha ao remover hitbox do poço", "wellSystem:removeWell:removeHitbox", { id, err });
  }
}


    // notifica mudança no mundo sem try/catch
    (world?.markWorldChanged || window.theWorld?.markWorldChanged)?.();

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

  injectStyles() {
    if (document.getElementById("well-styles")) return;

    const style = document.createElement("style");
    style.id = "well-styles";
    style.textContent = `
      #well-overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); z-index: 9000; }
      #well-modal { width: 700px; max-width: calc(100% - 40px); background:#2c241b; color:#fff; border-radius:12px; padding:16px; display:flex; gap:12px; position:relative; }
      .well-col { flex:1; border-radius:8px; padding:10px; background: rgba(0,0,0,0.12); border:2px solid rgba(0,0,0,0.2); }
      .item-slot { width:100%; height:80px; display:flex; align-items:center; justify-content:center; flex-direction:column; }
      .main-btn { padding:12px; border-radius:8px; cursor:pointer; border:none; font-weight:bold; }
      .btn-blue { background:#2980b9; color:#fff; }
      .btn-red { background:#c0392b; color:#fff; }
      .btn-green { background:#1e8449; color:#fff; }
      .well-bucket-container { width:100%; height:180px; background:#d2b48c; border:4px solid #5a3a22; border-radius:12px; display:flex; align-items:flex-end; overflow:hidden; }
      .water-fill { width:100%; text-align:center; transition:height 0.5s ease; background: rgba(52,152,219,0.85); }
      .close-btn { position:absolute; right:8px; top:8px; width:30px; height:30px; cursor:pointer; }
    `;
    document.head.appendChild(style);
  },

  openWellMenu() {
    this.injectStyles();

    const existing = document.getElementById("well-overlay");
    if (existing) {
      existing.style.display = "flex";
      wellState.isOpen = true;
      this.updateUI();
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "well-overlay";
    overlay.innerHTML = `
      <div id="well-modal">
        <div class="close-btn" id="well-close">X</div>

        <div class="well-col">
          <h3>Mochila</h3>
          <div class="item-slot" id="slot-bucket"><div id="qty-bucket">0</div></div>
          <div class="item-slot" id="slot-bottle"><div id="qty-bottle">0</div></div>
        </div>

        <div class="well-col">
          <h3>Acoes</h3>
          <button class="main-btn btn-blue" id="btn-drink">Beber</button>
          <button class="main-btn btn-red" id="btn-transfer-menu">Coletar</button>
          <div id="transfer-options" style="display:none">
            <button class="main-btn" id="btn-fill-bottle">Encher garrafa</button>
          </div>
        </div>

        <div class="well-col">
          <h3>Poco</h3>
          <div class="well-bucket-container">
            <div class="water-fill" id="well-water-level"></div>
          </div>
          <button class="main-btn btn-green" id="btn-pull-water">Descer balde</button>
          <div id="well-timer" style="display:none">00:00</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("well-close").onclick = () => this.closeWellMenu();
    document.getElementById("btn-pull-water").onclick = () => this.startPullingWater();
    document.getElementById("btn-drink").onclick = () => this.drinkFromWell();
    document.getElementById("btn-transfer-menu").onclick = () => {
      const opts = document.getElementById("transfer-options");
      opts.style.display = opts.style.display === "block" ? "none" : "block";
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
    if (bottleQtyEl) bottleQtyEl.textContent = toString(bottleQty);

    if (levelEl) {
      levelEl.style.height = `${wellState.waterLevel}%`;
      levelEl.textContent = `${Math.floor(wellState.waterLevel)}%`;
    }

    if (timerEl) timerEl.style.display = wellState.isPulling ? "block" : "none";
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
    if (wellState.waterLevel < 5) return;

    window.playerSystem?.restoreNeeds?.(0, WELL_CONFIG.THIRST_RESTORE, 0);
    wellState.waterLevel -= 5;
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

    if (!catFound) return;
    if (wellState.waterLevel < WELL_CONFIG.WATER_PER_BOTTLE) return;

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
