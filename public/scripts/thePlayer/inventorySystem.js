import { logger } from '../logger.js';
import { safeDispatch } from '../safeDispatch.js';
import { consumeItem, equipItem, discardItem } from './playerInventory.js';
import { mapTypeToCategory, INVENTORY_CATEGORIES } from '../categoryMapper.js';
import { getItem, getStackLimit, isPlaceable, isConsumable as itemUtilsIsConsumable, getConsumptionData as itemUtilsGetConsumptionData, getAllItems } from '../itemUtils.js';
import { t } from '../i18n/i18n.js';
import { UI_UPDATE_DELAY_MS, UI_MIN_UPDATE_INTERVAL_MS, INIT_DELAY_MS, CONSUMPTION_BAR_DURATION_MS } from '../constants.js';
import { sanitizeQuantity, isValidPositiveInteger, isValidItemId } from '../validation.js';
import { registerSystem, getDebugFlag, getSystem } from '../gameState.js';


export { getAllItems as allItems };

export class InventorySystem {
    constructor() {
        this.uiUpdateTimer = null;
        this.UI_UPDATE_DELAY = UI_UPDATE_DELAY_MS;
        this.lastUIUpdate = 0;

        // AbortController para cleanup de event listeners
        this.abortController = new AbortController();

        //  Inicializar categorias da configuração centralizada
        this.categories = {
            tools: { limit: INVENTORY_CATEGORIES.tools.limit, stackLimit: INVENTORY_CATEGORIES.tools.stackLimit, items: [] },
            seeds: { limit: INVENTORY_CATEGORIES.seeds.limit, stackLimit: INVENTORY_CATEGORIES.seeds.stackLimit, items: [] },
            construction: { limit: INVENTORY_CATEGORIES.construction.limit, stackLimit: INVENTORY_CATEGORIES.construction.stackLimit, items: [] },
            animal_food: { limit: INVENTORY_CATEGORIES.animal_food.limit, stackLimit: INVENTORY_CATEGORIES.animal_food.stackLimit, items: [] },
            food: { limit: INVENTORY_CATEGORIES.food.limit, stackLimit: INVENTORY_CATEGORIES.food.stackLimit, items: [] },
            resources: { limit: INVENTORY_CATEGORIES.resources.limit, stackLimit: INVENTORY_CATEGORIES.resources.stackLimit, items: [] }
        };
        
        // Issue #166: removido `food: null`. Equipar comida nunca foi
        // exposto na UI e a comida agora tem fluxo dedicado (consume
        // direto, sem slot de equip). Tool segue sendo único equipável.
        this.equipped = {
            tool: null,
        };
        
        this.selectedItem = null;
        
        this.init();
        this.setupGlobalListeners();

        logger.info('🎒 InventorySystem inicializado com categorias centralizadas');
    }
    
    _markSaveDirty() {
        const save = getSystem('save');
        if (!save || typeof save.markDirty !== 'function') return;
        // Evita marcar dirty durante restore de save (load)
        if (save.isApplyingSave) return;
        save.markDirty();
    }
    
    scheduleUIUpdate() {
        if (this.uiUpdateTimer) {
            clearTimeout(this.uiUpdateTimer);
        }
        
        this.uiUpdateTimer = setTimeout(() => {
            this.triggerUIUpdate();
        }, this.UI_UPDATE_DELAY);
    }
    
    triggerUIUpdate() {
        const now = Date.now();

        if (now - this.lastUIUpdate < UI_MIN_UPDATE_INTERVAL_MS) {
            return;
        }
        
        this.lastUIUpdate = now;
        this.uiUpdateTimer = null;
        
        safeDispatch(document, new CustomEvent('inventoryUpdated', {
            detail: { inventory: this.getInventory() }
        }));
    }
    
    setSelectedItem(itemId) {
        for (const [category, data] of Object.entries(this.categories)) {
            const item = data.items.find(item => item.id === itemId);
            if (item) {
                const fullItemData = getItem(itemId);
                if (!fullItemData) {
                    logger.error(`❌ Item ID ${itemId} não encontrado em item.js`);
                    return false;
                }
                
                // Mesclar dados do inventário com dados completos
                this.selectedItem = {
                    ...item,                    // Dados do inventário (quantidade, etc)
                    ...fullItemData,            // Dados completos (buildWidth, variants, etc)
                    category,                   // Categoria
                    placeable: isPlaceable(itemId)  // Validar se é construível
                };
                
                logger.debug(`🎯 Item selecionado: ${item.name} (${category})${this.selectedItem.placeable ? ' [Construível]' : ''}`);
                this.scheduleUIUpdate();
                return true;
            }
        }
        logger.warn(`❌ Item ID ${itemId} não encontrado no inventário`);
        this.selectedItem = null;
        this.scheduleUIUpdate();
        return false;
    }

    getSelectedItem() {
        return this.selectedItem;
    }

    clearSelectedItem() {
        this.selectedItem = null;
        this.scheduleUIUpdate();
    }

    setupGlobalListeners() {
        const { signal } = this.abortController;

        document.addEventListener('itemEquipped', (e) => {
            const item = e.detail.item;
            if (item.type === 'tool') {
                this.equipped.tool = item.id;
            }
            this._markSaveDirty();
            this.scheduleUIUpdate();
        }, { signal });

        document.addEventListener('itemUnequipped', () => {
            this.equipped.tool = null;
            this._markSaveDirty();
            this.scheduleUIUpdate();
        }, { signal });

        document.addEventListener('removeItemAfterConsumption', (e) => {
            const { category, itemId, quantity } = e.detail;
            if (category && itemId) {
                this.removeItem(category, itemId, quantity || 1);
            }
        }, { signal });
    }

    init() {
        setTimeout(() => {
            this.triggerUIUpdate();
        }, INIT_DELAY_MS);
        logger.info('🎒 Sistema de inventário pronto para uso');
    }

    addItem(categoryOrId, itemIdOrQty, quantity = 1, _recursionDepth = 0) {
        if (_recursionDepth > 100) {
            logger.error('❌ Limite de recursão excedido ao adicionar itens');
            return false;
        }

        let category = categoryOrId;
        let id = itemIdOrQty;
        let qty = quantity;
        let itemDataCached = null;

        if (typeof categoryOrId === 'number') {
            id = categoryOrId;
            qty = itemIdOrQty || 1;

            // Usar getItem() centralizado
            itemDataCached = getItem(id);
            if (!itemDataCached) {
                logger.error(`Erro: Item ID ${id} não existe no banco de dados`);
                return false;
            }

            // Usar mapeamento centralizado
            category = mapTypeToCategory(itemDataCached.type);
            logger.debug(`Adicionando: ${itemDataCached.name} (Tipo: ${itemDataCached.type}) → ${category}`);
        }

        // Sanitizar quantidade (bloqueia NaN, negativo, Infinity)
        qty = sanitizeQuantity(qty, 1, 9999);

        // Validar que o itemId é um número inteiro não-negativo válido
        if (!isValidItemId(id)) {
            logger.error(`Item ID inválido: ${id}`);
            return false;
        }

        // Validar que o item existe no banco de dados (reusar lookup se já feito)
        const itemData = itemDataCached || getItem(id);
        if (!itemData) {
            logger.error(`Item ID ${id} não encontrado no banco de dados`);
            return false;
        }

        if (!this.categories[category]) {
            logger.error(`❌ Categoria '${category}' não definida`);
            return false;
        }

        const categoryData = this.categories[category];
        const existingItem = categoryData.items.find(item => item.id === id);
        
        const stackLimit = getStackLimit(id);

        if (existingItem) {
            const newTotal = existingItem.quantity + qty;
            if (newTotal > stackLimit) {
                // Adicionar nova stack se houver espaço
                if (categoryData.items.length >= categoryData.limit) {
                    logger.warn(`🎒 Inventário de ${category} cheio!`);
                    return false;
                }

                // Limitar stack atual ao máximo permitido
                const overflow = newTotal - stackLimit;
                existingItem.quantity = stackLimit;

                // Criar nova stack com o overflow
                const itemData = getItem(id);
                categoryData.items.push({
                    id: itemData.id,
                    name: itemData.name,
                    icon: itemData.icon,
                    type: itemData.type,
                    quantity: overflow,
                    placeable: itemData.placeable || false,
                    variants: itemData.variants || null,
                    toolType: itemData.toolType || null,
                    fillUp: itemData.fillUp || null
                });

                logger.debug(` Stack dividida: ${itemData.name} - Principal: ${stackLimit}, Nova: ${overflow}`);
            } else {
                existingItem.quantity = newTotal;
            }
        } else {
            if (categoryData.items.length >= categoryData.limit) {
                logger.warn(`🎒 Inventário de ${category} cheio!`);
                return false;
            }

            const itemData = getItem(id);
            if (!itemData) {
                logger.error(`❌ Erro ao buscar dados do item ${id}`);
                return false;
            }

            // Criar nova stack respeitando stack limit
            const stackLimit = getStackLimit(id);
            const itemClone = {
                id: itemData.id,
                name: itemData.name,
                icon: itemData.icon,
                type: itemData.type,
                quantity: Math.min(qty, stackLimit),
                placeable: itemData.placeable || false,
                variants: itemData.variants || null,
                toolType: itemData.toolType || null,
                fillUp: itemData.fillUp || null
            };
            categoryData.items.push(itemClone);
            
            // Se houver overflow, chamar recursivamente
            if (qty > stackLimit) {
                const overflow = qty - stackLimit;
                logger.debug(`📚 Item split: criando nova stack com ${overflow} itens`);
                return this.addItem(category, id, overflow, _recursionDepth + 1);
            }
        }

        this._markSaveDirty();
        this.scheduleUIUpdate();
        return true;
    }

    /**
     * Acquire a newly obtained item: put it in the inventory, and if the
     * inventory category is full, route it to the warehouse instead so it's
     * never lost. Shows a notice when it goes to the warehouse (or when both
     * are full). Use this for collecting/buying; plain addItem() is still used
     * where overflow-to-warehouse is undesirable (e.g. warehouse withdraw).
     * @returns {boolean} true if the item landed in the inventory OR warehouse.
     */
    acquireItem(itemId, quantity = 1) {
        if (this.addItem(itemId, quantity)) return true;

        const storage = getSystem('storage');
        const name = getItem(itemId)?.name || '';
        if (storage?.addItem && storage.addItem(itemId, quantity)) {
            getSystem('hud')?.showMessage?.(t('inventory.fullSentToWarehouse', { name }));
            return true;
        }

        getSystem('hud')?.showMessage?.(t('inventory.bothFull', { name }));
        return false;
    }

    autoMapCategoryByItemType(itemType) {
        // Usar mapeamento centralizado em vez de replicado
        return mapTypeToCategory(itemType);
    }

    /**
     * Resolve o id pro objeto completo do item (do `items.js`). Wrapper
     * em torno de `getItem()` mantido por compat com chamadas antigas.
     *
     * @param {number} itemId
     * @returns {object|null}
     */
    findItemData(itemId) {
        // Usar getItem() centralizado em vez de items.find()
        return getItem(itemId);
    }

    /**
     * Remove `quantity` unidades de um item do inventário.
     *
     * Aceita duas formas de chamada por compat:
     *   - `removeItem(category, itemId, qty)` — explicit
     *   - `removeItem(itemId, qty)` — short form (descobre a categoria
     *     via `findItemCategory`)
     *
     * Se após a remoção o item ficar com `quantity === 0`, a entry é
     * removida do array. Se o item era a ferramenta equipada, faz unequip
     * implícito e marca o save como dirty (issue #166 / CodeRabbit fix).
     *
     * @param {string|number} categoryOrId - Nome da categoria OU id do item.
     * @param {number} itemIdOrQty - id do item OU quantidade (short form).
     * @param {number} [quantity=1] - Quantidade a remover (forma explícita).
     * @returns {boolean} `true` se removeu com sucesso, `false` em qualquer
     *   validação que falhe (categoria inválida, item ausente, qty insuf).
     */
    removeItem(categoryOrId, itemIdOrQty, quantity = 1) {
        let category = categoryOrId;
        let id = itemIdOrQty;
        let qty = quantity;

        if (typeof categoryOrId === 'number') {
            id = categoryOrId;
            qty = itemIdOrQty || 1;

            category = this.findItemCategory(id);
            if (!category) {
                logger.warn(`❌ Item ID ${id} não encontrado em nenhuma categoria para remover`);
                return false;
            }
        }

        // Sanitizar quantidade (bloqueia NaN, negativo, Infinity)
        qty = sanitizeQuantity(qty, 1, 9999);

        // Validar que o itemId é um número inteiro não-negativo válido
        if (!isValidItemId(id)) {
            logger.error(`Item ID inválido: ${id}`);
            return false;
        }

        if (!this.categories[category]) return false;

        const categoryData = this.categories[category];

        // An item can occupy several stacks (e.g. 200 fences = 99+99+2). Sum
        // across ALL of them and drain across stacks — not just the first, which
        // capped removals (and thus deposits/sells) at one stack's worth.
        const available = categoryData.items.reduce(
            (sum, it) => (it.id === id ? sum + (it.quantity || 0) : sum), 0);

        if (available <= 0) return false;
        if (available < qty) {
            logger.warn(` Quantidade insuficiente: tem ${available}, tentou remover ${qty}`);
            return false;
        }

        let remaining = qty;
        for (let i = categoryData.items.length - 1; i >= 0 && remaining > 0; i--) {
            const it = categoryData.items[i];
            if (it.id !== id) continue;
            const take = Math.min(it.quantity, remaining);
            it.quantity -= take;
            remaining -= take;
            if (it.quantity <= 0) categoryData.items.splice(i, 1);
        }

        // Issue #166 polish: quando o item equipado é removido programaticamente
        // (merchant vende, quest consome), dispara o evento canônico em vez de
        // setar `equipped.tool = null` direto. O playerSystem ouve, chama
        // `unequipItem()` que dispara `itemUnequipped` — esse evento cascateia:
        //   - `inventorySystem` (listener próprio) limpa `equipped.tool` + save dirty
        //   - `playerHUD` esconde o badge "Equipado: X"
        //   - Q-wheel deixa de marcar a slot como atual
        // Setar direto pulava todos os 3 → estado fantasma no HUD/wheel após venda.
        if (this.equipped.tool === id) {
            document.dispatchEvent(new Event('unequipItemRequest'));
        }

        this.scheduleUIUpdate();
        return true;
    }

    /**
     * Descobre em qual categoria um item está atualmente. Usado pelo
     * `removeItem` short-form `(itemId, qty)` que não recebe a categoria.
     *
     * @param {number} itemId
     * @returns {string|null} Nome da categoria ou null se não encontrado.
     */
    findItemCategory(itemId) {
        for (const [category, data] of Object.entries(this.categories)) {
            if (data.items.some(item => item.id === itemId)) {
                return category;
            }
        }
        return null;
    }

    /**
     * Marca um item da categoria `tools` como equipado em
     * `this.equipped.tool` (shadow do estado de `playerSystem`).
     *
     * Validações:
     *   1. Categoria existe.
     *   2. Item existe na categoria.
     *   3. Categoria é `'tools'` (issue #166 removeu suporte a equipar
     *      comida — não há mais slot `equipped.food`).
     *   4. `item.type === 'tool'`.
     *
     * Não é chamado ativamente pelo código (playerSystem fica responsável
     * pela fonte da verdade); existe pra debug/legado. Em produção, o
     * fluxo usa `playerInventory.equipItem()` → `equipItemRequest` event.
     *
     * @param {string} category - Nome da categoria do inventário.
     * @param {number} itemId - ID do item a equipar.
     * @returns {boolean} `true` se equipou, `false` em qualquer falha de
     *   validação.
     */
    equipItem(category, itemId) {
        if (!this.categories[category]) return false;

        const item = this.categories[category].items.find(item => item.id === itemId);
        if (!item) return false;

        // Issue #166: removida a branch `food`. Só tools é equipável agora.
        if (category !== 'tools') {
            logger.warn(` Categoria '${category}' não pode ser equipada`);
            return false;
        }
        if (item.type !== 'tool') {
            logger.warn(` Tentativa de equipar não-ferramenta: ${item.name}`);
            return false;
        }
        this.equipped.tool = itemId;

        this._markSaveDirty();
        this.scheduleUIUpdate();
        return true;
    }

    useItem(category, itemId) {
        if (category === 'food' || category === 'animals') {
            return this.removeItem(category, itemId, 1);
        }
        return false;
    }

    getAvailableSpace(category) {
        if (!this.categories[category]) return 0;
        const categoryData = this.categories[category];
        return categoryData.limit - categoryData.items.length;
    }

    getItemQuantity(categoryOrId, itemId = null) {
        if (typeof categoryOrId === 'number') {
            const id = categoryOrId;
            let total = 0;
            for (const catData of Object.values(this.categories)) {
                for (const item of catData.items) if (item.id === id) total += item.quantity;
            }
            return total;
        }

        if (!this.categories[categoryOrId]) return 0;
        // Sum across all stacks of the item (an item can occupy several).
        return this.categories[categoryOrId].items.reduce(
            (sum, i) => (i.id === itemId ? sum + (i.quantity || 0) : sum), 0);
    }

    /**
     * Retorna a referência DIRETA do objeto de categorias. Mutar o
     * resultado afeta o estado interno — não clone manualmente, prefira
     * `addItem`/`removeItem`. Usado por `inventoryUI` e `toolWheel`.
     *
     * @returns {Record<string, {limit:number, stackLimit:number, items:object[]}>}
     */
    getInventory() {
        return this.categories;
    }

    /**
     * Retorna o estado dos slots equipados (`{ tool: id|null }`).
     * Após issue #166, só `tool` existe — `food` foi removido.
     *
     * @returns {{tool: number|null}}
     */
    getEquippedItems() {
        return this.equipped;
    }

    /**
     * Reset completo do inventário: esvazia todas as categorias e
     * desequipa qualquer ferramenta. Marca o save como dirty pra
     * persistir o reset.
     *
     * @returns {void}
     */
    clear() {
        Object.keys(this.categories).forEach(category => {
            this.categories[category].items = [];
        });
        this.equipped = { tool: null };
        this._markSaveDirty();
        this.triggerUIUpdate();
        logger.debug('🗑️ Inventário limpo');
    }

    updateUI() {
        logger.warn(' updateUI() chamado diretamente - use scheduleUIUpdate()');
        this.triggerUIUpdate();
    }

    debug() {
        logger.debug(' INVENTÁRIO (Sistema Corrigido):');
        logger.debug('='.repeat(60));

        Object.entries(this.categories).forEach(([category, data]) => {
            logger.debug(`📁 ${category.toUpperCase()} (${data.items.length}/${data.limit}):`);
            if (data.items.length === 0) {
                logger.debug('   🚫 Vazio');
            } else {
                data.items.forEach(item => {
                    const equipped = this.equipped.tool === item.id ? ' ⚡' : '';
                    const consumable = item.fillUp ? ' 🍽️' : '';
                    const placeable = item.placeable ? ' 🏗️' : '';
                    logger.debug(`   ${item.icon} ${item.name} x${item.quantity}${equipped}${consumable}${placeable}`);
                });
            }
            logger.debug('');
        });

        logger.debug('⚡ EQUIPADO:');
        logger.debug(`   Ferramenta: ${this.equipped.tool ? this.findItemData(this.equipped.tool)?.name : 'Nenhuma'}`);
        logger.debug('');

        const totalItems = Object.values(this.categories).reduce((total, cat) =>
            total + cat.items.reduce((sum, item) => sum + item.quantity, 0), 0);
        logger.debug(`📊 TOTAL DE ITENS: ${totalItems}`);
        logger.debug('='.repeat(60));
    }
    
    forceImmediateUpdate() {
        if (this.uiUpdateTimer) {
            clearTimeout(this.uiUpdateTimer);
            this.uiUpdateTimer = null;
        }
        this.triggerUIUpdate();
    }
    
    setUpdateDelay(delayMs) {
        this.UI_UPDATE_DELAY = Math.max(16, delayMs);
        logger.debug(` Delay do inventário ajustado para ${this.UI_UPDATE_DELAY}ms`);
    }

    isConsumable(itemId) {
        const item = this.findItemData(itemId);
        return item && item.fillUp;
    }

    getConsumptionData(itemId) {
        const item = this.findItemData(itemId);
        if (!item || !item.fillUp) return null;

        return {
            name: item.name,
            icon: item.icon,
            hunger: item.fillUp.hunger || 0,
            thirst: item.fillUp.thirst || 0,
            energy: item.fillUp.energy || 0
        };
    }

    /**
     * Limpa todos os event listeners e recursos do sistema
     * Remove todos os listeners registrados via AbortController
     * @returns {void}
     */
    destroy() {
        // Remove todos os event listeners
        this.abortController.abort();

        // Clear timer de UI update
        if (this.uiUpdateTimer) {
            clearTimeout(this.uiUpdateTimer);
            this.uiUpdateTimer = null;
        }
    }
}

export const inventorySystem = new InventorySystem();
registerSystem('inventory', inventorySystem);

// ====================================================================
// FUNÇÕES DE EXPORTAÇÃO (Interface pública)
// ====================================================================

export function getInventory() {
    return inventorySystem.getInventory();
}

export function addItemToInventory(category, itemId, quantity = 1) {
    return inventorySystem.addItem(category, itemId, quantity);
}

export function removeItemFromInventory(category, itemId, quantity = 1) {
    return inventorySystem.removeItem(category, itemId, quantity);
}

export function isConsumable(itemId) {
    return itemUtilsIsConsumable(itemId);
}

export function getConsumptionData(itemId) {
    return itemUtilsGetConsumptionData(itemId);
}

export function startConsuming(itemId, player) {
    const item = getItem(itemId);
    if (!item || !item.fillUp) return false;

    safeDispatch(document, new CustomEvent('startConsumptionBar', {
        detail: {
            item,
            player,
            duration: CONSUMPTION_BAR_DURATION_MS
        }
    }));

    return true;
}

export function forceInventoryUpdate() {
    return inventorySystem.forceImmediateUpdate();
}

export function setInventoryUpdateDelay(delayMs) {
    return inventorySystem.setUpdateDelay(delayMs);
}

/**
 * Adiciona botões de ação a um item do inventário
 * CSS carregado externamente via style/inventory-actions.css
 */
export function addItemActionButtons(itemElement, item, category, itemId) {
    const existingContainer = itemElement.querySelector('.inv-item-actions');
    if (existingContainer) existingContainer.remove();


    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'inv-item-actions';

    if (item.fillUp) {
        const consumeBtn = document.createElement('button');
        consumeBtn.className = 'inv-action-btn inv-consume-btn';
        consumeBtn.textContent = '🍽️ ' + t('inventory.actions.consume');
        consumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            consumeItem(category, itemId, 1);
        });
        buttonContainer.appendChild(consumeBtn);
    }

    if (item.type === 'tool') {
        const equipBtn = document.createElement('button');
        equipBtn.className = 'inv-action-btn inv-equip-btn';
        equipBtn.textContent = '⚔️ ' + t('inventory.actions.equip');
        equipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            equipItem(category, itemId);
        });
        buttonContainer.appendChild(equipBtn);
    }

    const discardBtn = document.createElement('button');
    discardBtn.className = 'inv-action-btn inv-discard-btn';
    discardBtn.textContent = '🗑️ ' + t('inventory.actions.discard');
    discardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        discardItem(category, itemId, 1);
    });
    buttonContainer.appendChild(discardBtn);

    itemElement.appendChild(buttonContainer);
}
export default InventorySystem;