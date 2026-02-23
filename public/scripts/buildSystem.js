/**
 * @file buildSystem.js - Sistema de construção e posicionamento de objetos
 * @description Gerencia o modo de construção permitindo posicionar cercas, baús, poços e outras estruturas no mundo.
 * Inclui sistema de grid avançado, alinhamento de subposições e preview visual.
 * @module BuildSystem
 */

import { logger } from './logger.js';
import { assets } from "./assetManager.js";
import { inventorySystem } from "./thePlayer/inventorySystem.js";
import { camera, CAMERA_ZOOM } from "./thePlayer/cameraSystem.js";
import { TILE_SIZE } from "./worldConstants.js";
import { perfLog } from "./optimizationConstants.js";
import { wellSystem } from "./wellSystem.js";
import { t } from './i18n/i18n.js';
import { MOUSE_UPDATE_INTERVAL_MS, DEBUG_UPDATE_INTERVAL_MS, VISUAL } from './constants.js';
import { getObject, getSystem } from "./gameState.js";

/**
 * Obtém nome traduzido do item pelo ID
 * @param {number} itemId - ID do item
 * @param {string} fallbackName - Nome padrão se tradução não existir
 * @returns {string} Nome traduzido
 */
function getItemName(itemId, fallbackName = '') {
  const translatedName = t(`itemNames.${itemId}`);
  if (translatedName === `itemNames.${itemId}`) {
    return fallbackName;
  }
  return translatedName || fallbackName;
}

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
    mouseUpdateInterval: MOUSE_UPDATE_INTERVAL_MS,
    mouseUpdatePending: false,
    pendingMouseX: 0,
    pendingMouseY: 0,

    currentSubPosX: 0,
    currentSubPosY: 0,

    showAdvancedGrid: true,
    gridAlpha: VISUAL.GRID.ALPHA ?? 0.4,
    
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
    debugUpdateInterval: DEBUG_UPDATE_INTERVAL_MS,
    
    _gridDrawnThisFrame: false,
    
    _helpStyleId: 'bhp-help-style',
    _helpPanelId: 'bhp-help-panel',
    _helpPanelEl: null,
    _mouseTimeoutId: null,

    /**
     * Cria o painel de ajuda do modo construção
     * CSS carregado externamente via style/build.css
     */
    _ensureBuildHelpUI() {
      // CSS movido para style/build.css - incluir no index.html
      const existing = document.getElementById(this._helpPanelId);
      if (existing) {
        this._helpPanelEl = existing;
        return;
      }
      if (!this._helpPanelEl) {
        const panel = document.createElement('div');
        panel.id = this._helpPanelId;
        // fix: innerHTML → DOM API
        const header = document.createElement('div');
        header.className = 'bhp-header';
        const title = document.createElement('div');
        title.className = 'bhp-title';
        title.textContent = t('build.mode');
        const sub = document.createElement('div');
        sub.className = 'bhp-sub';
        sub.id = 'bhp-item-name';
        sub.textContent = '-';
        header.append(title, sub);

        const body = document.createElement('div');
        body.className = 'bhp-body';
        const rows = [
          { keys: ['1', '2', '3'], label: t('build.gridX') },
          { keys: ['4', '5', '6'], label: t('build.gridY') },
          { keys: ['r'], label: t('build.rotate') },
          { keys: ['t'], label: t('build.place') },
          { keys: ['esc'], label: t('build.exit') },
        ];
        for (const row of rows) {
          const rowDiv = document.createElement('div');
          rowDiv.className = 'bhp-row';
          const strong = document.createElement('strong');
          for (const k of row.keys) {
            const kbd = document.createElement('kbd');
            kbd.textContent = k;
            strong.appendChild(kbd);
          }
          const span = document.createElement('span');
          span.textContent = row.label;
          rowDiv.append(strong, span);
          body.appendChild(rowDiv);
        }
        panel.append(header, body);
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
                this._mouseTimeoutId = setTimeout(() => {
                    this._mouseTimeoutId = null;
                    if (this.active) {
                        this.processPendingMouseUpdate();
                    } else {
                        this.mouseUpdatePending = false;
                    }
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
        
        const labelX = this.currentSubPosX === -1 ? t('build.alignLeft') : (this.currentSubPosX === 0 ? t('build.alignCenter') : t('build.alignRight'));
        const labelY = this.currentSubPosY === -1 ? t('build.alignTop') : (this.currentSubPosY === 0 ? t('build.alignCenter') : t('build.alignBottom'));

        this.showDebugMessage(`${t('build.alignment')}: [${labelX} | ${labelY}]`, 1000);
    },

    startBuilding(itemData) {
        if (!itemData || !itemData.placeable) {
            this.showDebugMessage(t('build.notBuildable'));
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
        
        this.showDebugMessage(t('build.building', { name: getItemName(itemData.id, itemData.name) }));
    },

    stopBuilding() {
        if (this._mouseTimeoutId) {
            clearTimeout(this._mouseTimeoutId);
            this._mouseTimeoutId = null;
        }
        this.mouseUpdatePending = false;
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

        if (!window.theWorld) {
            logger.error("the world object not available");
            this.showDebugMessage(t('build.systemError'), 2000);
            return;
        }

        const pos = this.getSnapPosition();
        const dim = this.getConstructionDimensions();
        const constructionType = this.getConstructionType();
        const itemQuantity = inventorySystem.getItemQuantity ? inventorySystem.getItemQuantity(this.selectedItem.id) : (this.selectedItem.quantity || 1);

        if (!itemQuantity || itemQuantity <= 0) {
            this.showDebugMessage(t('build.itemEmpty'));
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
                    this.showDebugMessage(t('build.chestPlaced', { remaining: restante }), 1000);
                    if (restante <= 0) this.stopBuilding();
                } catch (err) {
                    logger.error(t('build.chestError'), err);
                    this.showDebugMessage(t('build.chestFailed'), 2000);
                }
            } else {
                this.showDebugMessage(t('build.chestLoading'), 1500);
                return;
            }
            return;
        }

        if (constructionType === 'well') {
            const wellSystem = getSystem('well');
            if ((wellSystem && typeof wellSystem.placeWell === 'function') || (window.theWorld && typeof window.theWorld.placeWell === 'function')) { 
                
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
                    if (window.theWorld && typeof window.theWorld.placeWell === 'function') {
                        wellObject = window.theWorld.placeWell(pos.x, pos.y, wellBuildingData);
                    } else if (wellSystem) {
                        wellObject = wellSystem.placeWell(wellId, pos.x, pos.y);
                    }

                    if (wellObject) {
                        inventorySystem.removeItem(this.selectedItem.id, 1);
                        const restante = itemQuantity - 1;
                        this.showDebugMessage(t('build.wellPlaced', { remaining: restante }), 1000);
                        if (restante <= 0) this.stopBuilding();
                    } else {
                        this.showDebugMessage(t('build.wellError'), 2000);
                    }
                } catch (err) {
                    logger.error(t('build.wellError'), err);
                    this.showDebugMessage(t('build.wellError'), 2000);
                }
            } else {
                this.showDebugMessage(t('build.wellLoading'), 1500);
                return;
            }
            return;
        }

        if (window.theWorld && typeof window.theWorld.addWorldObject === 'function') {
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

                window.theWorld.addWorldObject(worldObj);
                inventorySystem.removeItem(this.selectedItem.id, 1);

                const restante = itemQuantity - 1;
                this.showDebugMessage(t('build.placed', { remaining: restante }), 1000);

                if (restante <= 0) this.stopBuilding();
            } catch (err) {
                logger.error(t('build.placeError'), err);
                this.showDebugMessage(t('build.placeError'), 2000);
            }
        } else {
            logger.error("theworld.addworldobject not available");
            this.showDebugMessage(t('build.worldNotAvailable'), 2000);
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
            console.warn(`erro ao carregar ${key}:`, e);
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
        this.showDebugMessage(t('build.variant', { name: this.currentVariant }));
    },

    createDebugOverlay() {
        if (!this.debugMode) return;
        this.removeDebugOverlay();
        this.debugElement = document.createElement('div');
        this.debugElement.id = 'buildSystem-debug';
        // fix: innerHTML → DOM API (estilos via build.css)
        const infoDiv = document.createElement('div');
        infoDiv.id = 'bs-info';
        const msgDiv = document.createElement('div');
        msgDiv.id = 'bs-msg';
        this.debugElement.append(infoDiv, msgDiv);
        document.body.appendChild(this.debugElement);
    },

    updateDebugInfo() {
        if (!this.debugElement) return;
        const pos = this.getSnapPosition();
        // fix: innerHTML → textContent
        this.debugElement.querySelector('#bs-info').textContent =
            `item: ${this.selectedItem?.name} | pos: [${Math.round(pos.x)}, ${Math.round(pos.y)}] | alinhamento: x(${this.currentSubPosX}) y(${this.currentSubPosY})`;
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
    logger.warn("buildsystem: initadvancedsystem falhou na inicializacao automatica.", e);
}
 export const buildSystem = BuildSystem;
 export default BuildSystem;
