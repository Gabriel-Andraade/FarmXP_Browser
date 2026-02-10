import { logger } from '../logger.js';
import { consumeItem, equipItem, discardItem } from './playerInventory.js';
import { mapTypeToCategory, INVENTORY_CATEGORIES } from '../categoryMapper.js';
import { getItem, getStackLimit, isPlaceable, isConsumable as itemUtilsIsConsumable, getConsumptionData as itemUtilsGetConsumptionData, getAllItems } from '../itemUtils.js';
import { t } from '../i18n/i18n.js';
import { UI_UPDATE_DELAY_MS, UI_MIN_UPDATE_INTERVAL_MS, INIT_DELAY_MS, CONSUMPTION_BAR_DURATION_MS } from '../constants.js';
import { sanitizeQuantity, isValidPositiveInteger, isValidItemId } from '../validation.js';
import { registerSystem, getDebugFlag } from '../gameState.js';


export { getAllItems as allItems };

export class InventorySystem {
    constructor() {
        this.uiUpdateTimer = null;
        this.UI_UPDATE_DELAY = UI_UPDATE_DELAY_MS;
        this.lastUIUpdate = 0;

        // AbortController para cleanup de event listeners
        this.abortController = new AbortController();

        // 🔧 Inicializar categorias da configuração centralizada
        this.categories = {
            tools: { limit: INVENTORY_CATEGORIES.tools.limit, stackLimit: INVENTORY_CATEGORIES.tools.stackLimit, items: [] },
            seeds: { limit: INVENTORY_CATEGORIES.seeds.limit, stackLimit: INVENTORY_CATEGORIES.seeds.stackLimit, items: [] },
            construction: { limit: INVENTORY_CATEGORIES.construction.limit, stackLimit: INVENTORY_CATEGORIES.construction.stackLimit, items: [] },
            animal_food: { limit: INVENTORY_CATEGORIES.animal_food.limit, stackLimit: INVENTORY_CATEGORIES.animal_food.stackLimit, items: [] },
            food: { limit: INVENTORY_CATEGORIES.food.limit, stackLimit: INVENTORY_CATEGORIES.food.stackLimit, items: [] },
            resources: { limit: INVENTORY_CATEGORIES.resources.limit, stackLimit: INVENTORY_CATEGORIES.resources.stackLimit, items: [] }
        };
        
        this.equipped = {
            tool: null,
            food: null
        };
        
        this.selectedItem = null;
        
        this.init();
        this.setupGlobalListeners();

        logger.info('🎒 InventorySystem inicializado com categorias centralizadas');
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
        
        document.dispatchEvent(new CustomEvent('inventoryUpdated', {
            detail: { inventory: this.getInventory() }
        }));
    }
    
    setSelectedItem(itemId) {
        for (const [category, data] of Object.entries(this.categories)) {
            const item = data.items.find(item => item.id === itemId);
            if (item) {
                // ✅ Enriquecer item com dados completos do banco de dados
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
                    placeable: isPlaceable(itemId)  // ✅ Validar se é construível
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
            } else if (item.type === 'food') {
                this.equipped.food = item.id;
            }
            this.scheduleUIUpdate();
        }, { signal });

        document.addEventListener('itemUnequipped', () => {
            this.equipped.tool = null;
            this.equipped.food = null;
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
        // ✅ Proteção contra recursão infinita
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
        
        // 🔧 Usar stack limit centralizado
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

                logger.debug(`📚 Stack dividida: ${itemData.name} - Principal: ${stackLimit}, Nova: ${overflow}`);
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

        this.saveToStorage();
        this.scheduleUIUpdate();
        return true;
    }

    autoMapCategoryByItemType(itemType) {
        // 🔧 Usar mapeamento centralizado em vez de replicado
        return mapTypeToCategory(itemType);
    }

    findItemData(itemId) {
        // 🔧 Usar getItem() centralizado em vez de items.find()
        return getItem(itemId);
    }

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
        const itemIndex = categoryData.items.findIndex(item => item.id === id);

        if (itemIndex === -1) return false;

        const item = categoryData.items[itemIndex];

        // ✅ Validação crítica: quantidade suficiente?
        if (item.quantity < qty) {
            logger.warn(`❌ Quantidade insuficiente: tem ${item.quantity}, tentou remover ${qty}`);
            return false;
        }

        if (item.quantity > qty) {
            item.quantity -= qty;
        } else {
            categoryData.items.splice(itemIndex, 1);
        }

        if (this.equipped.tool === id) this.equipped.tool = null;
        if (this.equipped.food === id) this.equipped.food = null;

        this.saveToStorage();
        this.scheduleUIUpdate();
        return true;
    }

    findItemCategory(itemId) {
        for (const [category, data] of Object.entries(this.categories)) {
            if (data.items.some(item => item.id === itemId)) {
                return category;
            }
        }
        return null;
    }

    equipItem(category, itemId) {
        if (!this.categories[category]) return false;

        const item = this.categories[category].items.find(item => item.id === itemId);
        if (!item) return false;

        // ✅ Validação de tipo
        if (category === 'tools') {
            if (item.type !== 'tool') {
                logger.warn(`❌ Tentativa de equipar não-ferramenta: ${item.name}`);
                return false;
            }
            this.equipped.tool = itemId;
        } else if (category === 'food') {
            if (!item.fillUp) {
                logger.warn(`❌ Tentativa de equipar comida não-consumível: ${item.name}`);
                return false;
            }
            this.equipped.food = itemId;
        } else {
            logger.warn(`❌ Categoria '${category}' não pode ser equipada`);
            return false;
        }

        this.saveToStorage();
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
                const item = catData.items.find(i => i.id === id);
                if (item) total += item.quantity;
            }
            return total;
        }

        if (!this.categories[categoryOrId]) return 0;
        const item = this.categories[categoryOrId].items.find(i => i.id === itemId);
        return item ? item.quantity : 0;
    }

    getInventory() {
        return this.categories;
    }

    getEquippedItems() {
        return this.equipped;
    }

    saveToStorage() {
        const saveData = {
            categories: {},
            equipped: this.equipped,
            timestamp: Date.now()
        };
        
        for (const [catName, catData] of Object.entries(this.categories)) {
            saveData.categories[catName] = {
                items: catData.items.map(item => ({
                    id: item.id,
                    quantity: item.quantity
                })),
                limit: catData.limit
            };
        }
        
        if (getDebugFlag('debug')) {
            logger.debug('💾 (Simulado) Salvando inventário:', saveData);
        }
        
        // Em produção, você usaria localStorage ou um servidor
        // try {
        //     localStorage.setItem('farmingxp_inventory', JSON.stringify(saveData));
        // } catch (e) {
        //     console.warn('⚠️ Não foi possível salvar inventário:', e);
        // }
    }

    loadFromStorage() {
        logger.debug('💾 Carregamento de inventário (simulado)');
        
        // Em produção, você carregaria de localStorage
        // try {
        //     const saved = localStorage.getItem('farmingxp_inventory');
        //     if (saved) {
        //         const saveData = JSON.parse(saved);
        //         // Implementar carregamento
        //     }
        // } catch (e) {
        //     console.warn('⚠️ Não foi possível carregar inventário:', e);
        // }
        
        // Para testes, adicionar alguns itens padrão
        if (getDebugFlag('debug')) {
            logger.debug('🧪 Adicionando itens de teste...');
            
            // Ferramentas
            this.addItem(0, 1);  // Tesoura
            this.addItem(1, 1);  // Enxada
            
            // Sementes
            this.addItem(3, 5);  // Semente de Milho
            this.addItem(4, 3);  // Semente de Trigo
            
            // Comida
            this.addItem(5, 3);  // Maçã
            this.addItem(6, 2);  // Pão
            
            // Recursos
            this.addItem(9, 10); // Madeira
            this.addItem(10, 8); // Pedra
            
            // Construção
            this.addItem(43, 2); // Cerca de Madeira
        }
    }

    clear() {
        Object.keys(this.categories).forEach(category => {
            this.categories[category].items = [];
        });
        this.equipped = { tool: null, food: null };
        this.saveToStorage();
        this.triggerUIUpdate();
        logger.debug('🗑️ Inventário limpo');
    }

    updateUI() {
        logger.warn('⚠️ updateUI() chamado diretamente - use scheduleUIUpdate()');
        this.triggerUIUpdate();
    }

    debug() {
        logger.debug('🎒 INVENTÁRIO (Sistema Corrigido):');
        logger.debug('='.repeat(60));

        Object.entries(this.categories).forEach(([category, data]) => {
            logger.debug(`📁 ${category.toUpperCase()} (${data.items.length}/${data.limit}):`);
            if (data.items.length === 0) {
                logger.debug('   🚫 Vazio');
            } else {
                data.items.forEach(item => {
                    const equipped = (this.equipped.tool === item.id || this.equipped.food === item.id) ? ' ⚡' : '';
                    const consumable = item.fillUp ? ' 🍽️' : '';
                    const placeable = item.placeable ? ' 🏗️' : '';
                    logger.debug(`   ${item.icon} ${item.name} x${item.quantity}${equipped}${consumable}${placeable}`);
                });
            }
            logger.debug('');
        });

        logger.debug('⚡ EQUIPADO:');
        logger.debug(`   Ferramenta: ${this.equipped.tool ? this.findItemData(this.equipped.tool)?.name : 'Nenhuma'}`);
        logger.debug(`   Comida: ${this.equipped.food ? this.findItemData(this.equipped.food)?.name : 'Nenhuma'}`);
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
        logger.debug(`🎯 Delay do inventário ajustado para ${this.UI_UPDATE_DELAY}ms`);
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

    document.dispatchEvent(new CustomEvent('startConsumptionBar', {
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
        consumeBtn.onclick = (e) => {
            e.stopPropagation();
            consumeItem(category, itemId, 1);
        };
        buttonContainer.appendChild(consumeBtn);
    }

    if (item.type === 'tool') {
        const equipBtn = document.createElement('button');
        equipBtn.className = 'inv-action-btn inv-equip-btn';
        equipBtn.textContent = '⚔️ ' + t('inventory.actions.equip');
        equipBtn.onclick = (e) => {
            e.stopPropagation();
            equipItem(category, itemId);
        };
        buttonContainer.appendChild(equipBtn);
    }

    const discardBtn = document.createElement('button');
    discardBtn.className = 'inv-action-btn inv-discard-btn';
    discardBtn.textContent = '🗑️ ' + t('inventory.actions.discard');
    discardBtn.onclick = (e) => {
        e.stopPropagation();
        discardItem(category, itemId, 1);
    };
    buttonContainer.appendChild(discardBtn);

    itemElement.appendChild(buttonContainer);
}

// ====================================================================
// FUNÇÕES GLOBAIS DE DEBUG/TESTE
// ====================================================================

window.testInventoryCategorization = () => {
    logger.debug('🧪 TESTANDO CATEGORIZAÇÃO DE ITENS');
    logger.debug('='.repeat(60));

    // Limpar inventário primeiro
    inventorySystem.clear();

    // Testar diferentes tipos de itens
    const testCases = [
        { id: 0, expected: 'tools', name: 'Tesoura (ferramenta)' },
        { id: 1, expected: 'tools', name: 'Enxada (ferramenta)' },
        { id: 3, expected: 'seeds', name: 'Semente de Milho (seed)' },
        { id: 5, expected: 'food', name: 'Maçã (comida)' },
        { id: 7, expected: 'animals', name: 'Ração para Galinha (animal_food)' },
        { id: 9, expected: 'resources', name: 'Madeira Bruta (resource)' },
        { id: 43, expected: 'construction', name: 'Cerca (construction)' },
        { id: 63, expected: 'resources', name: 'Milho (crop)' }
    ];

    testCases.forEach(test => {
        logger.debug(`📦 Adicionando: ${test.name}`);
        const success = inventorySystem.addItem(test.id, 1);
        logger.debug(`   ✅ Sucesso: ${success}, Esperado: ${test.expected}`);
    });

    // Mostrar resultado
    setTimeout(() => {
        inventorySystem.debug();
    }, 100);
};

window.addTestItems = () => {
    // Adiciona um de cada tipo para teste
    inventorySystem.addItem(0, 1);  // Tesoura (tools)
    inventorySystem.addItem(3, 5);  // Semente (seeds)
    inventorySystem.addItem(5, 3);  // Maçã (food)
    inventorySystem.addItem(7, 2);  // Ração (animals)
    inventorySystem.addItem(9, 10); // Madeira (resources)
    inventorySystem.addItem(43, 3); // Cerca (construction)

    logger.debug('✅ Itens de teste adicionados!');
    inventorySystem.debug();
};

logger.info('🎒 InventorySystem carregado e pronto!');