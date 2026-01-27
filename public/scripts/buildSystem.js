/**
 * @file buildSystem.js - Sistema de construção e posicionamento de objetos
 * @description Gerencia o modo de construção permitindo posicionar cercas, baús, poços e outras estruturas no mundo.
 * Inclui sistema de grid avançado, alinhamento de subposições e preview visual.
 * @module BuildSystem
 */

import { assets } from "./assetManager.js";
import { inventorySystem } from "./thePlayer/inventorySystem.js";
import { camera, CAMERA_ZOOM } from "./thePlayer/cameraSystem.js";
import { TILE_SIZE } from "./worldConstants.js";
import { perfLog } from "./optimizationConstants.js";
import { getObject, getSystem } from "./gameState.js";

/**
 * Sistema de construção e posicionamento de objetos no mundo
 * Gerencia modo de construção, preview, grid e colocação de estruturas
 * @type {Object}
 * @property {boolean} active - Se o modo de construção está ativo
 * @property {Object|null} selectedItem - Item selecionado para construção
 * @property {string|null} currentVariant - Variante atual do item (ex: fenceX, fenceY)
 * @property {HTMLImageElement|null} previewImg - Imagem de preview do item
 * @property {number} gridSize - Tamanho do tile do grid
 * @property {Object} mouseTile - Posição do tile sob o cursor
 */
export const BuildSystem = {
    active: false,
    selectedItem: null,
    currentVariant: null,
    previewImg: null,
    gridSize: TILE_SIZE,
    zoomedGridSize: TILE_SIZE * CAMERA_ZOOM,
    mouseTile: { x: 0, y: 0 },
    
    lastMouseUpdate: 0,
    mouseUpdateInterval: 25,
    mouseUpdatePending: false,
    pendingMouseX: 0,
    pendingMouseY: 0,
    
    currentSubPosX: 0, 
    currentSubPosY: 0, 

    showAdvancedGrid: true,
    gridAlpha: 0.4,
    
    subPositionColors: {
        '-1': 'rgba(0, 100, 255, 0.6)',
        '0': 'rgba(255, 50, 50, 0.6)',
        '1': 'rgba(150, 50, 255, 0.6)'
    },

    STORAGE_KEY_BUILDINGS: 'placedBuildings',
    STORAGE_KEY_WELLS: 'placedWells',

    debugMode: false, 
    debugElement: null,
    lastDebugUpdate: 0,
    debugUpdateInterval: 200,
    
    _gridDrawnThisFrame: false,
    
    _helpStyleId: 'build-help-style',
    _helpPanelId: 'build-help-panel',
    _helpPanelEl: null,

    _ensureBuildHelpUI() {
      if (!document.getElementById(this._helpStyleId)) {
        const style = document.createElement('style');
        style.id = this._helpStyleId;
        style.textContent = `
#${this._helpPanelId} {
  position: fixed;
  left: 18px;
  top: 18px;
  z-index: 9999;
  width: 340px;
  max-width: calc(100vw - 36px);
  background: linear-gradient(135deg, rgba(43, 26, 12, 0.97) 0%, rgba(59, 38, 18, 0.93) 100%);
  border: 2px solid #c9a463;
  border-radius: 14px;
  box-shadow: 0 12px 35px rgba(0,0,0,0.45);
  color: #f5e9d3;
  font-family: "Georgia", serif;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity .2s ease, transform .2s ease;
}

#${this._helpPanelId}.open {
  opacity: 1;
  transform: translateY(0);
}

#${this._helpPanelId} .bhp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(201, 164, 99, 0.35);
  background: rgba(46, 28, 15, 0.65);
  border-radius: 12px 12px 0 0;
}

#${this._helpPanelId} .bhp-title {
  font-weight: 800;
  font-size: 13px;
  letter-spacing: .5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

#${this._helpPanelId} .bhp-sub {
  font-size: 11px;
  color: #c9a463;
  font-weight: 700;
}

#${this._helpPanelId} .bhp-body {
  padding: 12px;
  display: grid;
  gap: 8px;
}

#${this._helpPanelId} .bhp-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(201, 164, 99, 0.08);
  border: 1px solid rgba(201, 164, 99, 0.18);
}

#${this._helpPanelId} .bhp-row strong {
  color: #f5e9d3;
  font-size: 12px;
}

#${this._helpPanelId} .bhp-row span {
  color: #c9a463;
  font-size: 11px;
  font-weight: 700;
}

#${this._helpPanelId} kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 11px;
  font-weight: 900;
  color: #2e1c0f;
  background: linear-gradient(135deg, #c9a463, #e0bc87);
  border: 1px solid rgba(245, 233, 211, 0.6);
  border-bottom-width: 2px;
  padding: 2px 7px;
  border-radius: 8px;
  box-shadow: 0 2px 0 rgba(0,0,0,0.25);
  margin-right: 6px;
  white-space: nowrap;
}
    `.trim();
        document.head.appendChild(style);
      }

      if (!this._helpPanelEl || !document.getElementById(this._helpPanelId)) {
        const panel = document.createElement('div');
        panel.id = this._helpPanelId;
        panel.innerHTML = `
  <div class="bhp-header">
    <div class="bhp-title">modo construcao</div>
    <div class="bhp-sub" id="bhp-item-name">-</div>
  </div>
  <div class="bhp-body">
    <div class="bhp-row"><strong><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd></strong><span>grade x: esq | cen | dir</span></div>
    <div class="bhp-row"><strong><kbd>4</kbd><kbd>5</kbd><kbd>6</kbd></strong><span>grade y: baixo | cen | cima</span></div>
    <div class="bhp-row"><strong><kbd>r</kbd></strong><span>rotacionar (variante)</span></div>
    <div class="bhp-row"><strong><kbd>t</kbd></strong><span>posicionar</span></div>
    <div class="bhp-row"><strong><kbd>esc</kbd></strong><span>sair do modo construcao</span></div>
  </div>
    `.trim();
        document.body.appendChild(panel);
        this._helpPanelEl = panel;
      }
    },

    _showBuildHelpPanel() {
      this._ensureBuildHelpUI();
      const label = this.selectedItem?.name ? this.selectedItem.name : '-';
      const nameEl = this._helpPanelEl?.querySelector('#bhp-item-name');
      if (nameEl) nameEl.textContent = label;
      this._helpPanelEl?.classList.add('open');
    },

    _hideBuildHelpPanel() {
      this._helpPanelEl?.classList.remove('open');
    },

    getMouseTileForRender() {
        if (this.mouseUpdatePending && (this.pendingMouseX !== 0 || this.pendingMouseY !== 0)) {
            return {
                x: Math.floor(this.pendingMouseX / this.gridSize),
                y: Math.floor(this.pendingMouseY / this.gridSize)
            };
        }
        return { x: this.mouseTile.x, y: this.mouseTile.y };
    },

    initAdvancedSystem() {
        this.zoomedGridSize = TILE_SIZE * CAMERA_ZOOM;
        perfLog("buildsystem ready for control.js commands");
    },

    updateMousePositionThrottled(wx, wy) {
        const now = performance.now();
        
        if (now - this.lastMouseUpdate >= this.mouseUpdateInterval) {
            this.mouseTile.x = Math.floor(wx / this.gridSize);
            this.mouseTile.y = Math.floor(wy / this.gridSize);
            this.lastMouseUpdate = now;
            
            if (this.debugMode && now - this.lastDebugUpdate >= this.debugUpdateInterval) {
                this.updateDebugInfo();
                this.lastDebugUpdate = now;
            }
        } else {
            this.pendingMouseX = wx;
            this.pendingMouseY = wy;
            
            if (!this.mouseUpdatePending) {
                this.mouseUpdatePending = true;
                setTimeout(() => {
                    this.processPendingMouseUpdate();
                }, this.mouseUpdateInterval);
            }
        }
    },
    
    processPendingMouseUpdate() {
        this.mouseTile.x = Math.floor(this.pendingMouseX / this.gridSize);
        this.mouseTile.y = Math.floor(this.pendingMouseY / this.gridSize);
        this.lastMouseUpdate = performance.now();
        this.mouseUpdatePending = false;
        
        if (this.debugMode) {
            this.updateDebugInfo();
        }
    },

    setSubPosition(axis, value) {
        if (axis === 'x') this.currentSubPosX = value;
        if (axis === 'y') this.currentSubPosY = value;

        this.updateDebugInfo();
        
        const labelX = this.currentSubPosX === -1 ? 'esq' : (this.currentSubPosX === 0 ? 'cen' : 'dir');
        const labelY = this.currentSubPosY === -1 ? 'topo' : (this.currentSubPosY === 0 ? 'cen' : 'baixo');

        this.showDebugMessage(`alinhamento: [${labelX} | ${labelY}]`, 1000);
    },

    startBuilding(itemData) {
        if (!itemData || !itemData.placeable) {
            this.showDebugMessage("item nao e construivel");
            return;
        }

        this.selectedItem = itemData;
        this.currentSubPosX = 0; 
        this.currentSubPosY = 0;
        
        const type = this.getConstructionType();
        
        if (type === 'chest') { 
            this.currentVariant = 'chest';
            this.previewImg = assets.furniture?.chest?.img;
        } else if (type === 'well') { 
            this.currentVariant = 'well';
            this.previewImg = assets.furniture?.well?.img;
        } else if (itemData.variants && itemData.variants.length > 0) {
            this.currentVariant = itemData.variants[0];
            this.previewImg = assets.furniture?.fences?.[this.currentVariant]?.img;
        } else {
            this.currentVariant = 'universal';
            this.previewImg = null; 
        }

        this.active = true;
        document.body.classList.add("building-mode");
        this._showBuildHelpPanel();
        
        if (this.debugMode) {
            this.createDebugOverlay();
            this.updateDebugInfo();
        }
        
        this.showDebugMessage(`construindo: ${itemData.name}`);
    },

    stopBuilding() {
        this.active = false;
        this.selectedItem = null;
        this.currentVariant = null;
        this.currentSubPosX = 0;
        this.currentSubPosY = 0;
        document.body.classList.remove("building-mode");
        this._hideBuildHelpPanel();
        this.removeDebugOverlay();
    },

    getConstructionType() {
        if (!this.selectedItem) return 'unknown';
        if (this.selectedItem.id === 69) return 'chest';
        if (this.selectedItem.id === 93) return 'well';
        if (this.selectedItem.variants && this.selectedItem.variants.length > 0) return 'fence';
        return 'construction';
    },

    getConstructionDimensions() {
        if (!this.selectedItem) return { width: 64, height: 64 };
        
        const type = this.getConstructionType();
        
        switch (type) {
            case 'chest': return { width: 31, height: 31 };
            case 'fence':
                return (this.currentVariant === 'fenceY') ? { width: 6, height: 62 } : { width: 32, height: 32 };
            case 'well': return { width: 75, height: 95 }; 
            default:
                return {
                    width: this.selectedItem.buildWidth || 64,
                    height: this.selectedItem.buildHeight || 64
                };
        }
    },

    getSnapPosition() {
        const tileX = this.mouseTile.x * this.gridSize;
        const tileY = this.mouseTile.y * this.gridSize;
        
        const dim = this.getConstructionDimensions();
        const tileCenter = this.gridSize / 2;

        let snapX, snapY;

        if (this.currentSubPosX === -1) snapX = tileX;
        else if (this.currentSubPosX === 0) snapX = tileX + tileCenter - (dim.width / 2);
        else snapX = tileX + this.gridSize - dim.width;

        if (this.currentSubPosY === -1) snapY = tileY;
        else if (this.currentSubPosY === 0) snapY = tileY + tileCenter - (dim.height / 2);
        else snapY = tileY + this.gridSize - dim.height;

        return { 
            x: snapX, 
            y: snapY,
            tileX: this.mouseTile.x,
            tileY: this.mouseTile.y,
            subX: this.currentSubPosX,
            subY: this.currentSubPosY
        };
    },

    placeObject() {
        if (!this.selectedItem) return;

        const theWorld = getObject('world');
        if (!theWorld) {
            console.error("the world object not available");
            this.showDebugMessage("erro de sistema (theworld)", 2000);
            return;
        }

        const pos = this.getSnapPosition();
        const dim = this.getConstructionDimensions();
        const constructionType = this.getConstructionType();
        const itemQuantity = inventorySystem.getItemQuantity ? inventorySystem.getItemQuantity(this.selectedItem.id) : (this.selectedItem.quantity || 1);

        if (!itemQuantity || itemQuantity <= 0) {
            this.showDebugMessage("acabou o item!");
            this.stopBuilding();
            return;
        }

        if (constructionType === 'chest') {
            const chestSystem = getSystem('chest');
            if (chestSystem && typeof chestSystem.addChest === 'function') {
                const newChestId = `chest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                const buildingData = {
                    id: newChestId,
                    itemId: this.selectedItem.id,
                    name: this.selectedItem.name,
                    assetId: this.selectedItem.assetId || 'chest', 
                    x: pos.x,
                    y: pos.y,
                    width: dim.width,
                    height: dim.height,
                    originalType: 'chest', 
                    isInteractable: true,
                    variants: this.selectedItem.variants, 
                };

                try {
                    chestSystem.addChest(buildingData);
                    inventorySystem.removeItem(this.selectedItem.id, 1);
                    const restante = itemQuantity - 1;
                    this.showDebugMessage(`bau colocado! (${restante} restante)`, 1000);
                    if (restante <= 0) this.stopBuilding();
                } catch (err) {
                    console.error("erro ao adicionar bau:", err);
                    this.showDebugMessage("falha ao colocar bau", 2000);
                }
            } else {
                this.showDebugMessage("sistema de baus carregando...", 1500);
                return;
            }
            return;
        }

        if (constructionType === 'well') {
            const wellSystem = getSystem('well');
            if ((wellSystem && typeof wellSystem.placeWell === 'function') || (theWorld && typeof theWorld.placeWell === 'function')) { 
                
                const wellId = `well_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                const wellBuildingData = {
                    id: wellId, 
                    itemId: this.selectedItem.id,
                    name: this.selectedItem.name,
                    assetId: this.selectedItem.assetId || 'well',
                    x: pos.x,
                    y: pos.y,
                    width: dim.width,
                    height: dim.height,
                    originalType: 'well',
                    isInteractable: true,
                };

                try {
                    let wellObject = null;
                    if (typeof theWorld.placeWell === 'function') {
                        wellObject = theWorld.placeWell(pos.x, pos.y, wellBuildingData);
                    } else if (wellSystem) {
                        wellObject = wellSystem.placeWell(wellId, pos.x, pos.y);
                    }

                    if (wellObject) {
                        inventorySystem.removeItem(this.selectedItem.id, 1);
                        const restante = itemQuantity - 1;
                        this.showDebugMessage(`poco colocado! (${restante} restante)`, 1000);
                        if (restante <= 0) this.stopBuilding();
                    } else {
                        this.showDebugMessage("erro ao colocar poco", 2000);
                    }
                } catch (err) {
                    console.error("excecao ao tentar colocar poco:", err);
                    this.showDebugMessage("erro ao colocar poco", 2000);
                }
            } else {
                this.showDebugMessage("sistema de pocos carregando...", 1500);
                return;
            }
            return;
        }

        if (typeof theWorld.addWorldObject === 'function') {
            try {
                let constructionTypeForCollision = constructionType;
                if (constructionType === 'fence') {
                    constructionTypeForCollision = (this.currentVariant === 'fenceY') ? 'fencey' : 'fencex';
                }

                const worldObj = {
                    x: pos.x,
                    y: pos.y,
                    itemId: this.selectedItem.id,
                    name: this.selectedItem.name,
                    width: dim.width,
                    height: dim.height,
                    type: constructionTypeForCollision,
                    originalType: this.currentVariant || constructionType,
                    variant: this.currentVariant || null,
                    icon: this.selectedItem.icon,
                    placeable: true
                };

                theWorld.addWorldObject(worldObj);
                inventorySystem.removeItem(this.selectedItem.id, 1);

                const restante = itemQuantity - 1;
                this.showDebugMessage(`colocado! (${restante} restante)`, 1000);

                if (restante <= 0) this.stopBuilding();
            } catch (err) {
                console.error("erro ao adicionar objeto ao mundo:", err);
                this.showDebugMessage("erro ao colocar objeto", 2000);
            }
        } else {
            console.error("theworld.addworldobject nao disponivel");
            this.showDebugMessage("erro: theworld.addworldobject nao disponivel", 2000);
        }
    },

    saveBuildings(objects, key = this.STORAGE_KEY_BUILDINGS) {
        try {
            const dataToSave = objects.map(b => {
                const { draw, onInteract, getHitbox, ...rest } = b;
                return rest;
            });
            localStorage.setItem(key, JSON.stringify(dataToSave));
        } catch (e) {
            console.error(`erro ao salvar ${key}:`, e);
        }
    },

    loadBuildings(key = this.STORAGE_KEY_BUILDINGS) {
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data)) {
                    return data;
                }
            }
        } catch (e) {
            console.error(`erro ao carregar ${key}:`, e);
        }
        return [];
    },

    drawPreview(ctx) {
        if (!this.active) return;

        this._gridDrawnThisFrame = false;
        
        this.renderAdvancedGrid(ctx);

        const worldPos = this.getSnapPosition();
        const screenPos = camera.worldToScreen(worldPos.x, worldPos.y); 
        const sx = Math.round(screenPos.x);
        const sy = Math.round(screenPos.y);

        const dim = this.getConstructionDimensions();
        const zoom = CAMERA_ZOOM;
        const zW = Math.round(dim.width * zoom);
        const zH = Math.round(dim.height * zoom);

        ctx.save();
        ctx.globalAlpha = 0.7;
        
        if (this.previewImg && this.previewImg.complete) {
            try {
                ctx.drawImage(this.previewImg, sx, sy, zW, zH);
            } catch (err) {
                ctx.fillStyle = this.subPositionColors[this.currentSubPosY] || 'red';
                ctx.fillRect(sx, sy, zW, zH);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.strokeRect(sx, sy, zW, zH);
            }
        } else {
            ctx.fillStyle = this.subPositionColors[this.currentSubPosY] || 'red';
            ctx.fillRect(sx, sy, zW, zH);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx, sy, zW, zH);
        }
        
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    renderAdvancedGrid(ctx) {
        if (!this.active || !this.showAdvancedGrid) return;
        if (this._gridDrawnThisFrame) return;
        this._gridDrawnThisFrame = true;

        const gs = this.gridSize;
        const zSize = this.zoomedGridSize; 

        const startCol = Math.floor(camera.x / gs);
        const endCol = Math.ceil((camera.x + camera.width) / gs);
        const startRow = Math.floor(camera.y / gs);
        const endRow = Math.ceil((camera.y + camera.height) / gs);

        ctx.save();
        ctx.globalAlpha = this.gridAlpha;
        ctx.lineWidth = 1;

        const divisions = [
            { pos: 0, color: this.subPositionColors['-1'] },
            { pos: 0.5, color: this.subPositionColors['0'] },
            { pos: 1, color: this.subPositionColors['1'] }
        ];

        const renderMouseTile = this.getMouseTileForRender();

        for (let col = startCol; col < endCol; col++) {
            for (let row = startRow; row < endRow; row++) {
                const wX = col * gs;
                const wY = row * gs;
                const sPos = camera.worldToScreen(wX, wY);

                const sx = Math.round(sPos.x);
                const sy = Math.round(sPos.y);
                const z = Math.round(zSize);

                divisions.forEach(div => {
                    ctx.strokeStyle = div.color;
                    ctx.beginPath(); 
                    ctx.moveTo(sx + Math.round(z * div.pos), sy); 
                    ctx.lineTo(sx + Math.round(z * div.pos), sy + z); 
                    ctx.stroke();
                    ctx.beginPath(); 
                    ctx.moveTo(sx, sy + Math.round(z * div.pos));
                    ctx.lineTo(sx + z, sy + Math.round(z * div.pos)); 
                    ctx.stroke();
                });

                if (col === renderMouseTile.x && row === renderMouseTile.y) {
                    const xr = this.currentSubPosX === -1 ? 0 : (this.currentSubPosX === 0 ? 0.5 : 1);
                    const yr = this.currentSubPosY === -1 ? 0 : (this.currentSubPosY === 0 ? 0.5 : 1);
                    const tx = sx + Math.round(z * xr);
                    const ty = sy + Math.round(z * yr);

                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(tx, ty, 6, 0, Math.PI*2);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    },

    updateMousePosition(wx, wy) {
        this.updateMousePositionThrottled(wx, wy);
    },

    rotate() {
        if (!this.selectedItem || this.getConstructionType() !== 'fence') return;
        const v = this.selectedItem.variants;
        this.currentVariant = v[(v.indexOf(this.currentVariant) + 1) % v.length];
        this.previewImg = assets.furniture?.fences?.[this.currentVariant]?.img;
        this.showDebugMessage(`variante: ${this.currentVariant}`);
    },

    createDebugOverlay() {
        if (!this.debugMode) return;
        this.removeDebugOverlay();
        this.debugElement = document.createElement('div');
        this.debugElement.id = 'buildSystem-debug';
        this.debugElement.style.cssText = "position:fixed; top:10px; left:10px; background:rgba(0,0,0,0.8); color:lime; padding:10px; z-index:9999; font-family:monospace; pointer-events:none;";
        this.debugElement.innerHTML = `<div id="bs-info"></div><div id="bs-msg" style="color:yellow; margin-top:5px;"></div>`;
        document.body.appendChild(this.debugElement);
    },

    updateDebugInfo() {
        if (!this.debugElement) return;
        const pos = this.getSnapPosition();
        this.debugElement.querySelector('#bs-info').innerHTML = `
            item: ${this.selectedItem?.name}<br>
            pos: [${Math.round(pos.x)}, ${Math.round(pos.y)}]<br>
            alinhamento: x(${this.currentSubPosX}) y(${this.currentSubPosY})
        `;
    },

    showDebugMessage(msg, time=2000) {
        if (!this.debugMode) return;
        if (!this.debugElement) this.createDebugOverlay(); 
        
        const el = this.debugElement.querySelector('#bs-msg');
        el.innerText = msg;
        
        clearTimeout(this.msgTimeout);
        this.msgTimeout = setTimeout(() => el.innerText = '', time);
    },

    removeDebugOverlay() {
        if (this.debugElement) { this.debugElement.remove(); this.debugElement = null; }
    },

    toggleDebug() {
        this.debugMode = !this.debugMode;
        if (this.debugMode) {
            this.createDebugOverlay();
            this.updateDebugInfo();
        } else {
            this.removeDebugOverlay();
        }
    }
};

// BuildSystem will be registered in gameState via main.js
// Legacy window.BuildSystem access is handled by installLegacyGlobals()

try {
    BuildSystem.initAdvancedSystem();
} catch (e) {
    console.warn("buildsystem: initadvancedsystem falhou na inicializacao automatica.", e);
}