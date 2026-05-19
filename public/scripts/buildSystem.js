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
    // fix: stored setTimeout ID so destroy() can cancel the throttled mouse update
    _mouseUpdateTimer: null,
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
        // Help reformulado: Q (ciclo), R (rotacionar), T/click (colocar),
        // clique direito (pegar), esc (sair). Subpos antigo (1-6) virou
        // no-op com o snap livre, então removido pra não confundir.
        // Labels de keycaps "click"/"right click" via i18n.
        const rows = [
          { keys: ['q'],                  label: t('build.cycle') },
          { keys: ['r'],                  label: t('build.rotate') },
          { keys: ['t', t('ui.click')],   label: t('build.placeClick') },
          { keys: [t('ui.rightClick')],   label: t('build.pickClick') },
          { keys: ['esc'],                label: t('build.exit') },
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

        // Cartinha de dica abaixo do body. Inline-styled pra não exigir
        // edits no build.css (que é externo). Cor da nota mostarda pra
        // chamar atenção sem competir com o resto da UI.
        const tip = document.createElement('div');
        tip.className = 'bhp-tip';
        Object.assign(tip.style, {
          margin: '8px 10px 10px',
          padding: '8px 10px',
          background: '#fff4d2',
          border: '1px solid #c5a14a',
          borderLeft: '4px solid #b8860b',
          borderRadius: '6px',
          fontSize: '12px',
          lineHeight: '1.35',
          color: '#5a3f0a',
        });
        const tipTitle = document.createElement('strong');
        tipTitle.textContent = t('build.tipTitle');
        Object.assign(tipTitle.style, { display: 'block', marginBottom: '4px' });
        const tipBody = document.createElement('span');
        tipBody.textContent = t('build.tipText');
        tip.append(tipTitle, tipBody);

        panel.append(header, body, tip);
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
        // Modo livre: `mouseTile.x/y` agora guarda coord de MUNDO bruta
        // (não mais tile index dividido por gridSize). Player coloca o
        // objeto exatamente onde o cursor está, sem snap a grid.
        // O check antigo `(pendingX !== 0 || pendingY !== 0)` foi removido
        // porque ignorava cliques legítimos na origem do mundo (0,0).
        if (this.mouseUpdatePending) {
            return { x: this.pendingMouseX, y: this.pendingMouseY };
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
            // Coord de mundo bruta, sem floor/grid — modo livre.
            this.mouseTile.x = wx;
            this.mouseTile.y = wy;
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
                this._mouseUpdateTimer = setTimeout(() => {
                    this._mouseUpdateTimer = null;
                    this.processPendingMouseUpdate();
                }, this.mouseUpdateInterval);
            }
        }
    },

    processPendingMouseUpdate() {
        this.mouseTile.x = this.pendingMouseX;
        this.mouseTile.y = this.pendingMouseY;
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

    /**
     * Aplica `itemData` ao state (selectedItem + preview). Extraído pra
     * ser reutilizado por `startBuilding` e `cycleNextItem`. Item null
     * = estado vazio (sem nada equipado).
     */
    _applyItemToBuildState(itemData) {
        this.selectedItem = itemData;
        this.currentSubPosX = 0;
        this.currentSubPosY = 0;

        if (!itemData) {
            this.currentVariant = null;
            this.previewImg = null;
            return;
        }

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
    },

    startBuilding(itemData) {
        // itemData null = abre em estado vazio. Player cicla com Q.
        // itemData não-placeable = recusa (mantém comportamento antigo).
        if (itemData && !itemData.placeable) {
            this.showDebugMessage(t('build.notBuildable'));
            return;
        }

        this._applyItemToBuildState(itemData || null);

        this.active = true;
        document.body.classList.add("building-mode");
        this._showBuildHelpPanel();

        if (this.debugMode) {
            this.createDebugOverlay();
            this.updateDebugInfo();
        }

        if (itemData) {
            this.showDebugMessage(t('build.building', { name: getItemName(itemData.id, itemData.name) }));
        } else {
            this.showDebugMessage(t('build.emptyHint'), 1500);
        }
    },

    /**
     * Lista de itens disponíveis pro cycle do Q. Por enquanto retorna
     * uma única "cerca sintética" (modo livre, sem inventário) — quando
     * o inventário tiver fences/poços de verdade, dá pra trocar esta
     * função por uma enumeração do inventário (`inventorySystem.list()`
     * filtrado por `placeable === true`).
     */
    _getCycleItems() {
        return [
            {
                id: -1,
                name: t('build.fenceName'),
                placeable: true,
                variants: ['fenceX', 'fenceY'],
                type: 'fence',
                _isSynthetic: true,
            },
        ];
    },

    /**
     * Q no modo construção: cicla pelos itens. Sequência:
     *   vazio → items[0] → items[1] → ... → items[N-1] → vazio → ...
     *
     * Estado vazio (selectedItem null) = clique pega cerca existente.
     * Estado com item = clique esquerdo coloca, direito pega.
     */
    cycleNextItem() {
        if (!this.active) return;

        const items = this._getCycleItems();
        if (items.length === 0) return;

        const currentId = this.selectedItem?.id ?? null;
        const currentIdx = items.findIndex(it => it.id === currentId);

        // Avança: empty → 0 → 1 → ... → last → empty (loop completo)
        let next;
        if (currentIdx === -1) {
            next = items[0];                   // empty → primeiro item
        } else if (currentIdx >= items.length - 1) {
            next = null;                       // último item → empty
        } else {
            next = items[currentIdx + 1];      // próximo item
        }

        this._applyItemToBuildState(next);
        const label = next ? getItemName(next.id, next.name) : t('build.emptyItem');
        this.showDebugMessage(t('build.itemLabel', { name: label }), 1200);
    },

    stopBuilding() {
        if (this._mouseUpdateTimer) {
            clearTimeout(this._mouseUpdateTimer);
            this._mouseUpdateTimer = null;
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
                // fenceY: 6×48 (entre o original 62 e o muito-baixo 32).
                // Mantém a sensação de "poste alto" sem ficar tão desproporcional
                // quanto 62. Encaixe vertical: 2 fenceY = 96px ≈ 3 fenceX (96px).
                return (this.currentVariant === 'fenceY') ? { width: 6, height: 48 } : { width: 32, height: 32 };
            case 'well': return { width: 75, height: 95 };
            default:
                return {
                    width: this.selectedItem.buildWidth || 64,
                    height: this.selectedItem.buildHeight || 64
                };
        }
    },

    getSnapPosition() {
        // Modo livre: peça centralizada no cursor. `mouseTile.x/y` agora
        // é coord de mundo bruta (não tile index). Sem snap a grid — onde
        // o mouse passa, é onde o objeto fica. Subpos virou no-op.
        const dim = this.getConstructionDimensions();
        const snapX = this.mouseTile.x - dim.width / 2;
        const snapY = this.mouseTile.y - dim.height / 2;

        return {
            x: snapX,
            y: snapY,
            tileX: this.mouseTile.x,
            tileY: this.mouseTile.y,
            subX: this.currentSubPosX,
            subY: this.currentSubPosY
        };
    },

    /**
     * Acha cerca colocada em (worldX, worldY). Usado pelo click handler do
     * build mode pra implementar "pegar e realocar" — se o player clica em
     * cima de uma cerca existente, a peça some do mundo e o cursor de
     * construção passa a ter aquela variant.
     *
     * Itera `placedBuildings` filtrando por originalType fenceX/fenceY.
     * O array é curto em prática (centenas no máximo), AABB é trivial.
     */
    findPlacedFenceAt(wx, wy) {
        const world = window.theWorld;
        if (!world || !Array.isArray(world.placedBuildings)) return null;
        for (const b of world.placedBuildings) {
            if (!b) continue;
            const orig = (b.originalType || '').toLowerCase();
            if (orig !== 'fencex' && orig !== 'fencey') continue;
            if (wx >= b.x && wx < b.x + b.width && wy >= b.y && wy < b.y + b.height) {
                return b;
            }
        }
        return null;
    },

    /**
     * Pega cerca existente: remove do mundo e ajusta o cursor de construção
     * pra corresponder à variant. Player pode posicionar o mouse em outro
     * lugar e apertar T (ou click) pra realocar. Em modo sintético (livre),
     * não devolve nada ao inventário; em modo normal, faz `addItem`.
     */
    pickUpFence(fence) {
        if (!fence || !window.theWorld) return false;
        const variant = (fence.variant === 'fenceY' || (fence.originalType || '').toLowerCase() === 'fencey')
            ? 'fenceY' : 'fenceX';

        try {
            // objectDestroyed remove de placedBuildings E do collisionSystem.
            // O enclosureSystem (listener de objectDestroyed) recomputa
            // automaticamente endpoints e cercados.
            window.theWorld.objectDestroyed(fence.id ?? fence);
        } catch (err) {
            logger.warn?.('[BuildSystem] pickUpFence: falha ao destruir', err);
            return false;
        }

        // Equipa cerca de pickup (FINITA, diferente do Q-synthetic infinito).
        // Stack: pegar mais cercas da MESMA variant soma ao contador. Pegar
        // variant diferente cria novo (perde a quantidade anterior, decisão
        // de design pra evitar UI complexa de 2 contadores).
        const cur = this.selectedItem;
        const stacking = cur?._fromPickup && this.currentVariant === variant;

        if (stacking) {
            cur._pickupQty = (cur._pickupQty || 0) + 1;
        } else {
            this._applyItemToBuildState({
                id: -1,
                name: t('build.fenceNamePickup'),
                placeable: true,
                variants: ['fenceX', 'fenceY'],
                type: 'fence',
                _isSynthetic: true,
                _fromPickup: true,   // ← chave: marca como quantidade finita
                _pickupQty: 1,
            });
            this.currentVariant = variant;
            this.previewImg = assets.furniture?.fences?.[variant]?.img || null;
        }

        const qty = this.selectedItem._pickupQty;
        this.showDebugMessage(t('build.pickedUp', { qty }), 1200);
        return true;
    },

    placeObject() {
        // Sem item equipado = no-op silencioso. Player usa Q pra escolher.
        if (!this.selectedItem) return;

        if (!window.theWorld) {
            logger.error("the world object not available");
            this.showDebugMessage(t('build.systemError'), 2000);
            return;
        }

        const pos = this.getSnapPosition();
        const dim = this.getConstructionDimensions();
        const constructionType = this.getConstructionType();

        // 3 modos de quantidade:
        //   _fromPickup → quantidade FINITA (contador `_pickupQty`),
        //     vem de pegar cercas existentes. Esgota → volta pro vazio.
        //   _isSynthetic puro → quantidade INFINITA, modo livre via Q
        //     (testing/dev sem precisar craftar peças).
        //   default → inventário real (item craftado/comprado).
        const isFromPickup = this.selectedItem?._fromPickup === true;
        const isSynthetic  = this.selectedItem?._isSynthetic === true;

        let itemQuantity;
        if (isFromPickup) {
            itemQuantity = this.selectedItem._pickupQty || 0;
        } else if (isSynthetic) {
            itemQuantity = Infinity;
        } else {
            itemQuantity = inventorySystem.getItemQuantity
                ? inventorySystem.getItemQuantity(this.selectedItem.id)
                : (this.selectedItem.quantity || 1);
        }

        if (itemQuantity <= 0) {
            if (isFromPickup) {
                // Esgotou as cercas pegas — volta pro estado vazio,
                // sem fechar o build mode (player pode pegar mais).
                this._applyItemToBuildState(null);
                this.showDebugMessage(t('build.pickupEmpty'), 800);
                return;
            }
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

                // Decremento por modo:
                if (isFromPickup) {
                    this.selectedItem._pickupQty -= 1;
                } else if (!isSynthetic) {
                    inventorySystem.removeItem(this.selectedItem.id, 1);
                }
                // isSynthetic puro = não decrementa nada (infinito).

                const restante = isFromPickup
                    ? this.selectedItem._pickupQty
                    : (isSynthetic ? Infinity : (itemQuantity - 1));
                this.showDebugMessage(t('build.placed', { remaining: restante }), 1000);

                // Pickup esgotou → volta pro vazio (mantém build mode aberto).
                // Inventário esgotou → fecha build mode (comportamento antigo).
                if (isFromPickup && this.selectedItem._pickupQty <= 0) {
                    this._applyItemToBuildState(null);
                } else if (!isSynthetic && !isFromPickup && restante <= 0) {
                    this.stopBuilding();
                }
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
            logger.error(`erro ao salvar ${key}:`, e);
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
            logger.warn(`erro ao carregar ${key}:`, e);
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

        // Endpoints do rascunho (cerca-fantasma). Só pra fence — chest/
        // well não têm conceito de conexão. Gate de DEBUG_HITBOXES é
        // tratado dentro de drawPreviewEndpoints.
        if (this.getConstructionType() === 'fence') {
            const encSys = getSystem('enclosure');
            encSys?.drawPreviewEndpoints?.(
                ctx, camera,
                { x: worldPos.x, y: worldPos.y, width: dim.width, height: dim.height },
                this.currentVariant
            );
        }
    },

    renderAdvancedGrid(ctx) {
        // Modo livre: grid removido. Player posiciona livremente onde
        // o cursor estiver. Função mantida pra não quebrar quem chama
        // (drawPreview chama no início), mas retorna logo.
        return;

        // ─── código antigo do grid (mantido como referência, inativo) ───
        // Pra reativar: remover o `return` acima.
        // eslint-disable-next-line no-unreachable
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

    destroy() {
        this.stopBuilding();
        clearTimeout(this.msgTimeout);
        this.msgTimeout = null;
        // fix: cleared the throttled mouse-update timer to prevent post-destroy callback
        clearTimeout(this._mouseUpdateTimer);
        this._mouseUpdateTimer = null;
        this.mouseUpdatePending = false;

        // Remove o painel de ajuda do DOM
        if (this._helpPanelEl) {
            this._helpPanelEl.remove();
            this._helpPanelEl = null;
        }

        logger.debug('BuildSystem destruído');
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
