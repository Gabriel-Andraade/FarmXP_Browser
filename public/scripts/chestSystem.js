import { logger } from './logger.js';
import { storageSystem } from './storageSystem.js';
import { inventorySystem } from './thePlayer/inventorySystem.js';
import { camera, CAMERA_ZOOM } from './thePlayer/cameraSystem.js';
import { TILE_SIZE } from './worldConstants.js';
import { registerSystem, getObject } from './gameState.js';
import { t } from './i18n/i18n.js';

/**
 * Sistema de gerenciamento de baús no mundo do jogo
 * Responsável por criar, manipular e persistir baús de armazenamento
 * @namespace chestSystem
 */
export const chestSystem = {
    chests: {}, // Baús no mundo
    currentChest: null,
    categories: ['tools', 'construction', 'animals', 'food', 'resources'],
    slotsPerCategory: 5,
    
    /**
     * Inicializa o sistema de baús
     * Injeta estilos CSS e carrega baús salvos do localStorage
     * @returns {Object} Retorna a própria instância do chestSystem para encadeamento
     */
    init() {
        this.injectStyles();
        this.loadChests();
        registerSystem('chest', this);
        console.log('📦 Sistema de baús inicializado');
        return this;
    },
    
    /**
     * Verifica se os estilos CSS do baú estão carregados
     * Os estilos devem ser incluídos via link externo em index.html: style/chest.css
     * @returns {void}
     * @deprecated CSS agora é carregado externamente via style/chest.css
     */
    injectStyles() {
        // CSS movido para style/chest.css - incluir no index.html
        // Este método é mantido para compatibilidade, mas não injeta mais estilos
    },
    
    /**
     * Adiciona um novo baú ao mundo do jogo
     * Cria a estrutura de dados do baú, inicializa o armazenamento por categorias
     * e adiciona o baú ao mundo visual
     * @param {Object} chestData - Dados de configuração do baú
     * @param {string} [chestData.id] - ID único do baú (gerado automaticamente se não fornecido)
     * @param {string} [chestData.name='Baú'] - Nome exibido do baú
     * @param {number} chestData.x - Posição X no mundo
     * @param {number} chestData.y - Posição Y no mundo
     * @param {number} [chestData.width=31] - Largura do baú em pixels
     * @param {number} [chestData.height=31] - Altura do baú em pixels
     * @returns {string} ID do baú criado
     */
    addChest(chestData) {
        const chestId = chestData.id || `chest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const chest = {
            id: chestId,
            name: chestData.name || 'Baú',
            x: chestData.x,
            y: chestData.y,
            width: chestData.width || 31,
            height: chestData.height || 31,
            icon: '📦',
            type: 'chest',
            originalType: 'chest',
            interactable: true,
            storageId: chestId,
            // Dados de armazenamento por categoria
            storage: {}
        };
        
        // Inicializar armazenamento por categoria
        this.categories.forEach(category => {
            chest.storage[category] = {
                items: [],
                limit: this.slotsPerCategory
            };
        });

        this.chests[chestId] = chest;

        logger.debug(`✅ Baú adicionado: ${chestId}`, chest);

        // Adicionar ao mundo visual
        this.addChestToWorld(chest);
        
        // Salvar baús
        this.saveChests();
        
        return chestId;
    },
    
    /**
     * Adiciona o baú ao mundo visual do jogo
     * Cria um objeto interativo no mundo que pode ser clicado pelo jogador
     * @param {Object} chest - Objeto do baú a ser adicionado ao mundo
     * @returns {void}
     */
    addChestToWorld(chest) {
        const theWorld = getObject('world');
        const addWorldObject = theWorld?.addWorldObject;

        if (addWorldObject) {
            addWorldObject({
                id: chest.id,
                name: chest.name,
                x: chest.x,
                y: chest.y,
                width: chest.width,
                height: chest.height,
                type: 'chest',
                originalType: 'chest',
                interactable: true,
                draw: undefined, // Remove a função draw personalizada
                getHitbox: () => ({
                    x: chest.x,
                    y: chest.y,
                    width: chest.width,
                    height: chest.height
                }),
                onInteract: () => this.openChest(chest.id)
            });
        } else {
            logger.warn('⚠️ addWorldObject não disponível');
        }
    },
    
    /**
     * Abre a interface de gerenciamento do baú
     * Valida a existência do baú e cria a UI completa
     * @param {string} chestId - ID do baú a ser aberto
     * @returns {void}
     */
    openChest(chestId) {
        const chest = this.chests[chestId];
        if (!chest) {
            this.showMessage(`❌ ${t('chest.notFound')}`, 'error');
            return;
        }
        
        this.currentChest = chest;
        
        // Criar interface
        this.createChestUI(chest);

        logger.debug(`📦 Baú aberto: ${chestId}`);
    },

    /**
     * Cria a interface completa do baú
     * Gera o HTML da UI, adiciona event listeners e renderiza todo o conteúdo
     * @param {Object} chest - Objeto do baú
     * @returns {void}
     */
    createChestUI(chest) {
        // Remover UI existente
        this.closeChestUI();
        
        // Criar overlay
        const overlay = document.createElement('div');
        overlay.className = 'cht-overlay';
        overlay.id = 'cht-overlay';
        document.body.appendChild(overlay);
        
        // Criar painel principal
        const panel = document.createElement('div');
        panel.className = 'cht-panel';
        panel.id = 'cht-panel';
        
        panel.innerHTML = `
            <div class="cht-header">
                <h2><span>📦</span> ${t('chest.title')} - ${chest.name}</h2>
                <button class="cht-close-btn">&times;</button>
            </div>
            
            <div class="cht-content">
                <!-- Lado esquerdo: Baú -->
                <div class="cht-side">
                    <div class="cht-side-title">📦 ${t('chest.storage')}</div>
                    
                    <div class="cht-categories" id="cht-categories">
                        <!-- Categorias serão injetadas aqui -->
                    </div>
                    
                    <div class="cht-slots" id="cht-slots">
                        <!-- Slots serão injetados aqui -->
                    </div>
                </div>
                
                <!-- Lado direito: Inventário do Jogador -->
                <div class="cht-side">
                    <div class="cht-side-title">🎒 ${t('chest.inventory')}</div>
                    
                    <div class="cht-player-inventory" id="cht-player-inventory">
                        <!-- Itens do inventário serão injetados aqui -->
                    </div>
                </div>
            </div>
            
            <div class="cht-controls">
                <button class="cht-btn take-all" id="take-all-btn">
                    <span>⬇️</span> ${t('chest.takeAll')}
                </button>
                <button class="cht-btn store-all" id="store-all-btn">
                    <span>⬆️</span> ${t('chest.storeAll')}
                </button>
                <button class="cht-btn" id="organize-btn">
                    <span>🔧</span> ${t('chest.organize')}
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Adicionar event listeners
        panel.querySelector('.cht-close-btn').addEventListener('click', () => this.closeChestUI());
        overlay.addEventListener('click', () => this.closeChestUI());
        
        document.getElementById('take-all-btn').addEventListener('click', () => this.takeAllItems(chest.id));
        document.getElementById('store-all-btn').addEventListener('click', () => this.storeAllItems(chest.id));
        document.getElementById('organize-btn').addEventListener('click', () => this.organizeChest(chest.id));
        
        // Renderizar conteúdo
        this.renderChestCategories(chest.id);
        this.renderChestItems(chest.id);
        this.renderPlayerInventory(chest.id);
        
        // Fechar com ESC
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    },
    
    /**
     * Gerencia eventos de teclado para a interface do baú
     * Fecha a UI quando a tecla ESC é pressionada
     * @param {KeyboardEvent} e - Evento de teclado
     * @returns {void}
     */
    handleKeyPress(e) {
        if (e.key === 'Escape' && this.currentChest) {
            this.closeChestUI();
        }
    },
    
    /**
     * Fecha a interface do baú
     * Remove todos os elementos da UI e limpa os event listeners
     * @returns {void}
     */
    closeChestUI() {
        const overlay = document.getElementById('cht-overlay');
        const panel = document.getElementById('cht-panel');
        
        if (overlay) overlay.remove();
        if (panel) panel.remove();
        
        document.removeEventListener('keydown', this.handleKeyPress);
        
        this.currentChest = null;
    },
    
    /**
     * Renderiza os botões de categorias do baú
     * Exibe todas as categorias com contadores de itens
     * @param {string} chestId - ID do baú
     * @returns {void}
     */
    renderChestCategories(chestId) {
        const chest = this.chests[chestId];
        if (!chest) return;
        
        const container = document.getElementById('cht-categories');
        if (!container) return;
        
        let html = '';
        this.categories.forEach(category => {
            const itemCount = chest.storage[category]?.items?.length || 0;
            html += `
                <button class="cht-category-btn" data-category="${category}">
                    ${this.getCategoryIcon(category)} ${category} (${itemCount})
                </button>
            `;
        });
        
        container.innerHTML = html;
        
        // Adicionar event listeners
        container.querySelectorAll('.cht-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Atualizar categoria ativa
                container.querySelectorAll('.cht-category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Ativar primeira categoria
        const firstBtn = container.querySelector('.cht-category-btn');
        if (firstBtn) firstBtn.classList.add('active');
    },
    
    /**
     * Renderiza todos os itens armazenados no baú
     * Exibe itens de todas as categorias com ícones, nomes e quantidades
     * @param {string} chestId - ID do baú
     * @returns {void}
     */
    renderChestItems(chestId) {
        const chest = this.chests[chestId];
        const container = document.getElementById('cht-slots');
        if (!chest || !container) return;
        
        let html = '';
        
        // Contar total de itens
        let totalItems = 0;
        this.categories.forEach(category => {
            totalItems += chest.storage[category]?.items?.length || 0;
        });
        
        if (totalItems === 0) {
            html = `<div style="grid-column: 1 / -1; text-align: center; color: #aaa; padding: 40px;">📦 ${t('chest.empty')}</div>`;
        } else {
            // Mostrar todos os itens de todas as categorias
            this.categories.forEach(category => {
                const items = chest.storage[category]?.items || [];
                items.forEach(item => {
                    html += `
                        <div class="cht-slot" data-item-id="${item.id}" data-category="${category}">
                            <div class="item-icon">${item.icon || '📦'}</div>
                            <div class="item-name">${item.name}</div>
                            <div class="item-quantity">${item.quantity}</div>
                        </div>
                    `;
                });
            });
            
            // Adicionar slots vazios
            const emptySlots = (this.categories.length * this.slotsPerCategory) - totalItems;
            for (let i = 0; i < emptySlots; i++) {
                html += '<div class="cht-slot empty"></div>';
            }
        }
        
        container.innerHTML = html;
        
        // Adicionar event listeners para os slots
        container.querySelectorAll('.cht-slot:not(.empty)').forEach(slot => {
            slot.addEventListener('click', () => {
                const itemId = parseInt(slot.dataset.itemId);
                const category = slot.dataset.category;
                this.takeItemFromChest(chestId, itemId, category);
            });
        });
    },
    
    /**
     * Renderiza o inventário do jogador na interface do baú
     * Exibe todos os itens que o jogador possui em todas as categorias
     * @param {string} chestId - ID do baú (usado para contexto)
     * @returns {void}
     */
    renderPlayerInventory(chestId) {
        const container = document.getElementById('cht-player-inventory');
        if (!container) return;
        
        if (!window.inventorySystem) {
            container.innerHTML = `<div style="color: #aaa; text-align: center;">${t('ui.inventoryNotAvailable')}</div>`;
            return;
        }
        
        const inventory = window.inventorySystem.getInventory();
        let html = '';
        let itemCount = 0;
        
        // Coletar todos os itens do inventário
        Object.entries(inventory).forEach(([category, data]) => {
            data.items.forEach(item => {
                itemCount++;
                html += `
                    <div class="cht-inventory-item" data-item-id="${item.id}" data-category="${category}">
                        <div class="item-icon">${item.icon || '🎒'}</div>
                        <div class="item-name">${item.name}</div>
                        <div class="item-quantity">${item.quantity}</div>
                    </div>
                `;
            });
        });
        
        if (itemCount === 0) {
            html = `<div style="grid-column: 1 / -1; text-align: center; color: #aaa; padding: 40px;">🎒 ${t('inventory.empty')}</div>`;
        }
        
        container.innerHTML = html;
        
        // Adicionar event listeners
        container.querySelectorAll('.cht-inventory-item').forEach(item => {
            item.addEventListener('click', () => {
                const itemId = parseInt(item.dataset.itemId);
                const category = item.dataset.category;
                this.storeItemInChest(chestId, itemId, category);
            });
        });
    },
    
    /**
     * Armazena um item do inventário do jogador no baú
     * Remove o item do inventário e adiciona ao baú na categoria apropriada
     * @param {string} chestId - ID do baú
     * @param {number} itemId - ID do item a ser armazenado
     * @param {string} fromCategory - Categoria de origem do item no inventário
     * @returns {void}
     */
    storeItemInChest(chestId, itemId, fromCategory) {
        const chest = this.chests[chestId];
        if (!chest) return;
        
        // Obter dados do item
        const itemData = window.inventorySystem?.findItemData(itemId);
        if (!itemData) return;
        
        // Determinar categoria no baú
        const toCategory = this.autoMapCategory(itemData.type || fromCategory);
        
        // Verificar se há espaço na categoria
        if (chest.storage[toCategory].items.length >= this.slotsPerCategory) {
            this.showMessage(`❌ ${t('chest.categoryFull', { category: toCategory })}`, 'error');
            return;
        }
        
        // Remover 1 item do inventário
        if (window.inventorySystem?.removeItem(itemId, 1)) {
            // Adicionar ao baú
            const existingItem = chest.storage[toCategory].items.find(i => i.id === itemId);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                chest.storage[toCategory].items.push({
                    ...itemData,
                    quantity: 1
                });
            }
            
            this.showMessage(`✅ ${t('chest.stored', { name: itemData.name })}`, 'success');
            this.renderChestItems(chestId);
            this.renderPlayerInventory(chestId);
            this.renderChestCategories(chestId);
            this.saveChests();
        }
    },
    
    /**
     * Remove um item do baú e adiciona ao inventário do jogador
     * Decrementa a quantidade ou remove completamente se for o último
     * @param {string} chestId - ID do baú
     * @param {number} itemId - ID do item a ser retirado
     * @param {string} fromCategory - Categoria do item no baú
     * @returns {void}
     */
    takeItemFromChest(chestId, itemId, fromCategory) {
        const chest = this.chests[chestId];
        if (!chest) return;
        
        const categoryData = chest.storage[fromCategory];
        if (!categoryData) return;
        
        const itemIndex = categoryData.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;
        
        const item = categoryData.items[itemIndex];
        
        // Adicionar ao inventário do jogador
        if (window.inventorySystem?.addItem(itemId, 1)) {
            // Remover do baú
            if (item.quantity > 1) {
                item.quantity--;
            } else {
                categoryData.items.splice(itemIndex, 1);
            }
            
            this.showMessage(`✅ ${t('chest.taken', { name: item.name })}`, 'success');
            this.renderChestItems(chestId);
            this.renderPlayerInventory(chestId);
            this.renderChestCategories(chestId);
            this.saveChests();
        }
    },
    
    /**
     * Remove todos os itens do baú e adiciona ao inventário do jogador
     * Itera por todas as categorias e transfere todos os itens possíveis
     * @param {string} chestId - ID do baú
     * @returns {void}
     */
    takeAllItems(chestId) {
        const chest = this.chests[chestId];
        if (!chest) return;
        
        let takenCount = 0;
        
        this.categories.forEach(category => {
            const items = [...chest.storage[category].items];
            items.forEach(item => {
                while (item.quantity > 0) {
                    if (window.inventorySystem?.addItem(item.id, 1)) {
                        item.quantity--;
                        takenCount++;
                    } else {
                        break;
                    }
                }
            });
            
            // Remover itens com quantidade zero
            chest.storage[category].items = chest.storage[category].items.filter(i => i.quantity > 0);
        });
        
        if (takenCount > 0) {
            this.showMessage(`✅ ${t('chest.takenAll', { count: takenCount })}`, 'success');
            this.renderChestItems(chestId);
            this.renderPlayerInventory(chestId);
            this.renderChestCategories(chestId);
            this.saveChests();
        }
    },
    
    /**
     * Armazena todos os itens possíveis do inventário do jogador no baú
     * Move um item de cada tipo, respeitando os limites de espaço do baú
     * @param {string} chestId - ID do baú
     * @returns {void}
     */
    storeAllItems(chestId) {
        const chest = this.chests[chestId];
        if (!chest || !window.inventorySystem) return;
        
        let storedCount = 0;
        const inventory = window.inventorySystem.getInventory();
        
        Object.entries(inventory).forEach(([category, data]) => {
            const itemsToStore = [...data.items];
            itemsToStore.forEach(item => {
                const targetCategory = this.autoMapCategory(item.type || category);
                
                // Verificar se há espaço
                if (chest.storage[targetCategory].items.length >= this.slotsPerCategory) {
                    return;
                }
                
                // Mover 1 unidade de cada item
                if (window.inventorySystem.removeItem(item.id, 1)) {
                    const existingItem = chest.storage[targetCategory].items.find(i => i.id === item.id);
                    if (existingItem) {
                        existingItem.quantity++;
                    } else {
                        chest.storage[targetCategory].items.push({
                            ...window.inventorySystem.findItemData(item.id),
                            quantity: 1
                        });
                    }
                    storedCount++;
                }
            });
        });
        
        if (storedCount > 0) {
            this.showMessage(`✅ ${t('chest.storedAll', { count: storedCount })}`, 'success');
            this.renderChestItems(chestId);
            this.renderPlayerInventory(chestId);
            this.renderChestCategories(chestId);
            this.saveChests();
        }
    },
    
    /**
     * Organiza os itens dentro do baú
     * Ordena alfabeticamente os itens em cada categoria
     * @param {string} chestId - ID do baú
     * @returns {void}
     */
    organizeChest(chestId) {
        const chest = this.chests[chestId];
        if (!chest) return;
        
        // Ordenar itens em cada categoria
        this.categories.forEach(category => {
            chest.storage[category].items.sort((a, b) => {
                // Ordenar por nome
                return a.name.localeCompare(b.name);
            });
        });
        
        this.showMessage(`🔧 ${t('chest.organized')}`, 'success');
        this.renderChestItems(chestId);
        this.saveChests();
    },
    
    /**
     * Mapeia automaticamente o tipo de item para a categoria correta do baú
     * Converte tipos de itens do sistema de inventário para categorias de baú
     * @param {string} itemType - Tipo do item no sistema de inventário
     * @returns {string} Categoria correspondente no baú
     */
    autoMapCategory(itemType) {
        const map = {
            'tool': 'tools',
            'food': 'food',
            'animal_food': 'animals',
            'seed': 'construction',
            'construction': 'construction',
            'material': 'construction',
            'resource': 'resources',
            'crop': 'resources',
            'decoration': 'construction'
        };
        return map[itemType] || 'resources';
    },
    
    /**
     * Retorna o emoji representativo de cada categoria
     * @param {string} category - Nome da categoria
     * @returns {string} Emoji correspondente à categoria
     */
    getCategoryIcon(category) {
        const icons = {
            'tools': '🔨',
            'construction': '🏗️',
            'animals': '🐾',
            'food': '🍎',
            'resources': '🪵'
        };
        return icons[category] || '📦';
    },
    
    /**
     * Exibe uma mensagem temporária na tela
     * Cria um elemento de notificação que desaparece automaticamente após 3 segundos
     * @param {string} text - Texto da mensagem
     * @param {string} [type='info'] - Tipo da mensagem (info, error, success)
     * @returns {void}
     */
    showMessage(text, type = 'info') {
        // Remover mensagem anterior
        const existing = document.querySelector('.cht-message');
        if (existing) existing.remove();
        
        const msg = document.createElement('div');
        msg.className = `cht-message ${type}`;
        msg.textContent = text;
        msg.style.borderColor = type === 'error' ? '#c97878' : 
                               type === 'success' ? '#90c978' : '#8b5a2b';
        
        document.body.appendChild(msg);
        
        setTimeout(() => {
            if (msg.parentNode) msg.remove();
        }, 3000);
    },
    
    /**
     * Salva todos os baús no localStorage
     * Serializa os dados dos baús removendo referências circulares
     * @returns {void}
     */
    saveChests() {
        try {
            const chestsToSave = {};
            
            for (const chestId in this.chests) {
                const chest = this.chests[chestId];
                // Remover referências circulares
                chestsToSave[chestId] = {
                    id: chest.id,
                    name: chest.name,
                    x: chest.x,
                    y: chest.y,
                    width: chest.width,
                    height: chest.height,
                    storage: chest.storage,
                    type: chest.type,
                    originalType: chest.originalType
                };
            }

            localStorage.setItem('farmingXP_chests', JSON.stringify(chestsToSave));
            logger.debug('💾 Baús salvos no localStorage');
        } catch (e) {
            logger.error('❌ Erro ao salvar baús:', e);
        }
    },
    
    /**
     * Carrega baús salvos do localStorage
     * Deserializa os dados e recria os baús no mundo do jogo
     * @returns {void}
     */
    loadChests() {
        try {
            const saved = localStorage.getItem('farmingXP_chests');
            if (saved) {
                const loadedChests = JSON.parse(saved);
                const theWorld = getObject('world');
                const addWorldObject = theWorld?.addWorldObject;

                for (const chestId in loadedChests) {
                    const chestData = loadedChests[chestId];
                    this.chests[chestId] = chestData;

                    // Adicionar ao mundo visual (sem função draw personalizada)
                    if (addWorldObject) {
                        addWorldObject({
                            id: chestData.id,
                            name: chestData.name,
                            x: chestData.x,
                            y: chestData.y,
                            width: chestData.width,
                            height: chestData.height,
                            type: 'chest',
                            originalType: 'chest',
                            interactable: true,
                            draw: undefined, // Deixa o theWorld.js desenhar
                            getHitbox: () => ({
                                x: chestData.x,
                                y: chestData.y,
                                width: chestData.width,
                                height: chestData.height
                            }),
                            onInteract: () => this.openChest(chestData.id)
                        });
                    }
                }

                console.log('💾 Baús carregados do localStorage:', Object.keys(loadedChests).length);
            }
        } catch (e) {
            logger.error('❌ Erro ao carregar baús:', e);
        }
    },
    
    /**
     * Remove um baú do jogo
     * Deleta o baú do mundo visual e do sistema de armazenamento
     * @param {string} chestId - ID do baú a ser removido
     * @returns {void}
     */
    removeChest(chestId) {
        if (this.chests[chestId]) {
            // fix: Using correct removeWorldObject function instead of objectDestroyed (L1059-1062)
            // Remover do mundo visual
            // Note: window.removeWorldObject is the correct function for removal
            // theWorld.objectDestroyed has different cleanup behavior
            const theWorld = getObject('world');
            const removeWorldObject = window.removeWorldObject || theWorld?.objectDestroyed;
            if (removeWorldObject) {
                removeWorldObject(chestId);
            }

            delete this.chests[chestId];
            this.saveChests();
            logger.debug(`🗑️ Baú removido: ${chestId}`);
        }
    },
    
    /**
     * Verifica se o jogador está próximo o suficiente para interagir com algum baú
     * Calcula a distância entre o centro do jogador e cada baú
     * @param {number} playerX - Posição X do jogador
     * @param {number} playerY - Posição Y do jogador
     * @param {number} playerWidth - Largura do jogador
     * @param {number} playerHeight - Altura do jogador
     * @returns {Object|null} Objeto do baú se estiver no alcance, null caso contrário
     */
    checkChestInteraction(playerX, playerY, playerWidth, playerHeight) {
        const interactionRange = 60;
        
        for (const chestId in this.chests) {
            const chest = this.chests[chestId];
            const chestCenterX = chest.x + chest.width / 2;
            const chestCenterY = chest.y + chest.height / 2;
            const playerCenterX = playerX + playerWidth / 2;
            const playerCenterY = playerY + playerHeight / 2;
            
            const distance = Math.sqrt(
                Math.pow(chestCenterX - playerCenterX, 2) + 
                Math.pow(chestCenterY - playerCenterY, 2)
            );
            
            if (distance <= interactionRange) {
                return chest;
            }
        }
        
        return null;
    }
};

// Inicializar e exportar
// O registerSystem('chest', this) é chamado dentro do init()
chestSystem.init();