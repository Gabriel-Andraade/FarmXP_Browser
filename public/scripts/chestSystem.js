import { logger } from './logger.js';
import { storageSystem } from './storageSystem.js';
import { inventorySystem } from './thePlayer/inventorySystem.js';
import { camera, CAMERA_ZOOM } from './thePlayer/cameraSystem.js';
import { TILE_SIZE } from './worldConstants.js';
import { registerSystem, getObject } from './gameState.js';
import { t } from './i18n/i18n.js';
import { setItemIcon } from './itemUtils.js';
import { searchTokens, matchesSearch } from './searchMatch.js';

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
    // UI state (paridade com o warehouse): categoria ativa do baú, buscas por
    // painel e a quantidade selecionada por item (chave `chest:<id>` / `inv:<id>`).
    activeChestCategory: 'tools',
    chestSearch: '',
    invSearch: '',
    qtySelection: new Map(),
    
    /**
     * Inicializa o sistema de baús
     * Injeta estilos CSS e carrega baús salvos do localStorage
     * @returns {Object} Retorna a própria instância do chestSystem para encadeamento
     */
    init() {
        this.injectStyles();
        // Baús são persistidos POR SLOT via saveSystem (getChestsData/applyChestsData),
        // não numa chave global — senão vazam entre saves/personagens (bug #181-like).
        registerSystem('chest', this);
        logger.info('📦 Sistema de baús inicializado');
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
        const chestId = chestData.id || `chest_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        
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

        // Estado da UI zerado a cada abertura (categoria ativa, buscas, seleção).
        this.activeChestCategory = this.categories[0];
        this.chestSearch = '';
        this.invSearch = '';
        this.qtySelection.clear();

        // Criar overlay
        const overlay = document.createElement('div');
        overlay.className = 'cht-overlay';
        overlay.id = 'cht-overlay';
        document.body.appendChild(overlay);
        
        // Criar painel principal
        const panel = document.createElement('div');
        panel.className = 'cht-panel';
        panel.id = 'cht-panel';
        
        const chtHeader = document.createElement('div');
        chtHeader.className = 'cht-header';
        const chtH2 = document.createElement('h2');
        const chtIcon = document.createElement('span');
        chtIcon.textContent = '📦';
        chtH2.append(chtIcon, ` ${t('chest.title')} - ${chest.name}`);
        const chtCloseBtn = document.createElement('button');
        chtCloseBtn.className = 'cht-close-btn';
        chtCloseBtn.textContent = '\u00D7';
        chtHeader.append(chtH2, chtCloseBtn);

        const chtContent = document.createElement('div');
        chtContent.className = 'cht-content';

        const leftSide = document.createElement('div');
        leftSide.className = 'cht-side';
        const leftTitle = document.createElement('div');
        leftTitle.className = 'cht-side-title';
        leftTitle.textContent = `📦 ${t('chest.storage')}`;
        const chestSearch = this._makeSearchInput('cht-search-chest', t('chest.searchChestAria'), (v) => {
            this.chestSearch = v;
            this.renderChestItems(chest.id);
        });
        const categoriesDiv = document.createElement('div');
        categoriesDiv.className = 'cht-categories';
        categoriesDiv.id = 'cht-categories';
        const slotsDiv = document.createElement('div');
        slotsDiv.className = 'cht-slots';
        slotsDiv.id = 'cht-slots';
        leftSide.append(leftTitle, chestSearch, categoriesDiv, slotsDiv);

        const rightSide = document.createElement('div');
        rightSide.className = 'cht-side';
        const rightTitle = document.createElement('div');
        rightTitle.className = 'cht-side-title';
        rightTitle.textContent = `🎒 ${t('chest.inventory')}`;
        const invSearch = this._makeSearchInput('cht-search-inv', t('chest.searchInvAria'), (v) => {
            this.invSearch = v;
            this.renderPlayerInventory(chest.id);
        });
        const playerInv = document.createElement('div');
        playerInv.className = 'cht-player-inventory';
        playerInv.id = 'cht-player-inventory';
        rightSide.append(rightTitle, invSearch, playerInv);

        chtContent.append(leftSide, rightSide);

        const chtControls = document.createElement('div');
        chtControls.className = 'cht-controls';

        const takeAllBtn = document.createElement('button');
        takeAllBtn.className = 'cht-btn take-all';
        const takeAllIcon = document.createElement('span');
        takeAllIcon.textContent = '⬇️';
        takeAllBtn.append(takeAllIcon, ` ${t('chest.takeAll')}`);

        const storeAllBtn = document.createElement('button');
        storeAllBtn.className = 'cht-btn store-all';
        const storeAllIcon = document.createElement('span');
        storeAllIcon.textContent = '⬆️';
        storeAllBtn.append(storeAllIcon, ` ${t('chest.storeAll')}`);

        const organizeBtn = document.createElement('button');
        organizeBtn.className = 'cht-btn';
        const organizeIcon = document.createElement('span');
        organizeIcon.textContent = '🔧';
        organizeBtn.append(organizeIcon, ` ${t('chest.organize')}`);

        chtControls.append(takeAllBtn, storeAllBtn, organizeBtn);

        panel.append(chtHeader, chtContent, chtControls);

        document.body.appendChild(panel);

        // Adicionar event listeners
        chtCloseBtn.addEventListener('click', () => this.closeChestUI());
        overlay.addEventListener('click', () => this.closeChestUI());

        // Impede que teclas digitadas nos campos (busca, quantidade) vazem pros
        // handlers globais do jogo (mover, abrir menus, fechar). Eles escutam no
        // document na fase de bubbling, então parar aqui (ancestral) basta.
        const stopFieldKeys = (e) => {
            const tg = e.target;
            if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) e.stopPropagation();
        };
        panel.addEventListener('keydown', stopFieldKeys);
        panel.addEventListener('keyup', stopFieldKeys);
        panel.addEventListener('keypress', stopFieldKeys);

        takeAllBtn.addEventListener('click', () => this.takeAllItems(chest.id));
        storeAllBtn.addEventListener('click', () => this.storeAllItems(chest.id));
        organizeBtn.addEventListener('click', () => this.organizeChest(chest.id));
        
        // Renderizar conteúdo
        this.renderChestCategories(chest.id);
        this.renderChestItems(chest.id);
        this.renderPlayerInventory(chest.id);
        
        // Fechar com ESC
        this._boundKeyPress = this.handleKeyPress.bind(this);
        document.addEventListener('keydown', this._boundKeyPress);
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
        
        if (this._boundKeyPress) {
            document.removeEventListener('keydown', this._boundKeyPress);
            this._boundKeyPress = null;
        }

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
        
        container.replaceChildren();
        this.categories.forEach(category => {
            const used = chest.storage[category]?.items?.length || 0;
            const max = chest.storage[category]?.limit || this.slotsPerCategory;
            const btn = document.createElement('button');
            btn.className = 'cht-category-btn';
            btn.dataset.category = category;
            if (category === this.activeChestCategory) btn.classList.add('active');
            // Readout por categoria: ícone + nome localizado + slots usados/máx.
            btn.textContent = `${this.getCategoryIcon(category)} ${this._categoryName(category)} (${used}/${max})`;
            btn.addEventListener('click', () => {
                this.activeChestCategory = category;
                container.querySelectorAll('.cht-category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderChestItems(chestId);
            });
            container.appendChild(btn);
        });
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

        container.replaceChildren();

        // Com busca ativa, varre TODAS as categorias (item guardado noutra
        // categoria não fica escondido); senão, mostra só a categoria ativa.
        const tokens = searchTokens(this.chestSearch);
        const searching = tokens.length > 0;
        const cats = searching ? this.categories : [this.activeChestCategory];

        const rows = [];
        for (const category of cats) {
            const items = chest.storage[category]?.items || [];
            for (const item of items) {
                if (searching && !matchesSearch(item.name || '', tokens)) continue;
                rows.push({ item, category });
            }
        }

        if (!rows.length) {
            const emptyMsg = document.createElement('div');
            emptyMsg.classList.add('cht-empty-state');
            emptyMsg.textContent = searching ? `🔍 ${t('chest.noResults')}` : `📦 ${t('chest.empty')}`;
            container.appendChild(emptyMsg);
            return;
        }

        for (const { item, category } of rows) {
            const max = item.quantity || 0;
            const key = `chest:${category}:${item.id}`;
            const slot = document.createElement('div');
            slot.className = 'cht-slot';
            slot.dataset.itemId = item.id;
            slot.dataset.category = category;

            const iconDiv = document.createElement('div');
            iconDiv.className = 'cht-item-icon';
            setItemIcon(iconDiv, item.icon || '📦', item.name);
            const nameDiv = document.createElement('div');
            nameDiv.className = 'cht-item-name';
            nameDiv.textContent = item.name;
            const qtyDiv = document.createElement('div');
            qtyDiv.className = 'cht-item-quantity';
            qtyDiv.textContent = `${max}x`;
            slot.append(iconDiv, nameDiv, qtyDiv);

            const controls = this._makeQtyControls(key, max, 'take', item.name, (amount) => {
                this.takeItemFromChest(chestId, item.id, category, amount);
            });
            slot.appendChild(controls);
            container.appendChild(slot);
        }
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
        
        if (!inventorySystem) {
            const unavailable = document.createElement('div');
            unavailable.className = 'cht-unavailable';
            unavailable.textContent = t('ui.inventoryNotAvailable');
            container.replaceChildren(unavailable);
            return;
        }

        const inventory = inventorySystem.getInventory();
        container.replaceChildren();

        const tokens = searchTokens(this.invSearch);
        const searching = tokens.length > 0;

        const rows = [];
        Object.entries(inventory).forEach(([category, data]) => {
            (data.items || []).forEach(item => {
                if (searching && !matchesSearch(item.name || '', tokens)) return;
                rows.push({ item, category });
            });
        });

        if (!rows.length) {
            const emptyMsg = document.createElement('div');
            emptyMsg.classList.add('cht-empty-state');
            emptyMsg.textContent = searching ? `🔍 ${t('chest.noResults')}` : `🎒 ${t('inventory.empty')}`;
            container.appendChild(emptyMsg);
            return;
        }

        for (const { item, category } of rows) {
            const max = item.quantity || 0;
            const key = `inv:${item.id}`;
            const itemEl = document.createElement('div');
            itemEl.className = 'cht-inventory-item';
            itemEl.dataset.itemId = item.id;
            itemEl.dataset.category = category;

            const iconDiv = document.createElement('div');
            iconDiv.className = 'cht-item-icon';
            setItemIcon(iconDiv, item.icon || '🎒', item.name);
            const nameDiv = document.createElement('div');
            nameDiv.className = 'cht-item-name';
            nameDiv.textContent = item.name;
            const qtyDiv = document.createElement('div');
            qtyDiv.className = 'cht-item-quantity';
            qtyDiv.textContent = `${max}x`;
            itemEl.append(iconDiv, nameDiv, qtyDiv);

            const controls = this._makeQtyControls(key, max, 'store', item.name, (amount) => {
                this.storeItemInChest(chestId, item.id, category, amount);
            });
            itemEl.appendChild(controls);
            container.appendChild(itemEl);
        }
    },

    /**
     * Cria um input de busca (lupa) padrão para os painéis do baú.
     * @param {string} id - id do elemento input
     * @param {(value:string)=>void} onInput - callback com o valor digitado
     * @returns {HTMLElement} wrapper contendo o input
     */
    _makeSearchInput(id, ariaLabel, onInput) {
        const wrap = document.createElement('div');
        wrap.className = 'cht-search';
        const input = document.createElement('input');
        input.type = 'search';
        input.id = id;
        input.className = 'cht-search-input';
        input.placeholder = `🔍 ${t('chest.search')}`;
        input.setAttribute('aria-label', ariaLabel);
        input.addEventListener('input', () => onInput(input.value));
        wrap.appendChild(input);
        return wrap;
    },

    /**
     * Monta os controles de quantidade em lote (presets 5/10/100/All + campo
     * manual + botão de ação), espelhando o warehouse. `max` limita a seleção;
     * o campo aceita digitar acima do máximo e é fixado (clamp) na ação.
     * @param {string} key - chave da seleção persistida em qtySelection
     * @param {number} max - quantidade máxima disponível
     * @param {'take'|'store'} action - rótulo/tradução do botão de ação
     * @param {(amount:number)=>void} onAction - executa a transferência
     * @returns {HTMLElement} wrapper com controles + botão
     */
    _makeQtyControls(key, max, action, itemName, onAction) {
        const wrap = document.createElement('div');
        wrap.className = 'cht-qty-controls';
        // Agrupa os controles sob o nome do item (contexto p/ leitor de tela).
        wrap.setAttribute('role', 'group');
        wrap.setAttribute('aria-label', itemName);

        const saved = this.qtySelection.get(key) || 1;
        const selected = Math.max(1, Math.min(saved, Math.max(1, max)));

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'cht-qty-input';
        input.min = '1';
        input.max = String(max);
        input.value = String(selected);
        input.setAttribute('aria-label', t('chest.qtyAria', { name: itemName }));

        const actionBtn = document.createElement('button');
        actionBtn.className = `cht-qty-action ${action === 'take' ? 'take' : 'store'}`;
        const btnKey = action === 'take' ? 'chest.takeBtn' : 'chest.storeBtn';
        const ariaKey = action === 'take' ? 'chest.takeAria' : 'chest.storeAria';
        const setBtnText = (q) => {
            actionBtn.textContent = t(btnKey, { qty: q });
            // aria nomeia o item (o texto visível só traz a quantidade).
            actionBtn.setAttribute('aria-label', t(ariaKey, { qty: q, name: itemName }));
        };

        // Fixa (clamp) a seleção e reflete no campo + botão.
        const setQty = (v) => {
            const clamped = Math.max(1, Math.min(Math.floor(Number(v) || 1), Math.max(1, max)));
            this.qtySelection.set(key, clamped);
            input.value = String(clamped);
            setBtnText(clamped);
        };

        const presets = document.createElement('div');
        presets.className = 'cht-qty-presets';
        for (const p of ['5', '10', '100']) {
            const b = document.createElement('button');
            b.className = 'cht-qty-btn';
            b.textContent = p;
            b.setAttribute('aria-label', t('chest.presetAria', { qty: p, name: itemName }));
            b.addEventListener('click', (e) => { e.stopPropagation(); setQty(Number(p)); });
            presets.appendChild(b);
        }
        const allBtn = document.createElement('button');
        allBtn.className = 'cht-qty-btn cht-qty-all';
        allBtn.textContent = t('chest.all');
        allBtn.setAttribute('aria-label', t('chest.allAria', { name: itemName }));
        allBtn.addEventListener('click', (e) => { e.stopPropagation(); setQty(max); });
        presets.appendChild(allBtn);

        // Campo manual: digita livre (mesmo acima do máx); fixa no change.
        input.addEventListener('input', () => {
            this.qtySelection.set(key, Math.max(1, Math.floor(Number(input.value) || 1)));
        });
        input.addEventListener('change', () => setQty(input.value));

        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const amount = Math.max(1, Math.min(
                Math.floor(Number(input.value) || (this.qtySelection.get(key) || 1)),
                Math.max(1, max),
            ));
            this.qtySelection.set(key, amount);
            onAction(amount);
        });

        setBtnText(selected);

        const actions = document.createElement('div');
        actions.className = 'cht-qty-row';
        actions.append(input, actionBtn);

        wrap.append(presets, actions);
        return wrap;
    },
    
    /**
     * Armazena um item do inventário do jogador no baú
     * Remove o item do inventário e adiciona ao baú na categoria apropriada
     * @param {string} chestId - ID do baú
     * @param {number} itemId - ID do item a ser armazenado
     * @param {string} fromCategory - Categoria de origem do item no inventário
     * @returns {void}
     */
    storeItemInChest(chestId, itemId, fromCategory, amount = 1) {
        const chest = this.chests[chestId];
        if (!chest || !inventorySystem) return;

        const itemData = inventorySystem.findItemData(itemId);
        if (!itemData) return;

        const toCategory = this.autoMapCategory(itemData.type || fromCategory);
        const catData = chest.storage[toCategory];
        if (!catData) return;
        const limit = catData.limit || this.slotsPerCategory;

        // Quer mover o mínimo entre o pedido e o que o player realmente tem.
        const invHas = inventorySystem.getItemQuantity(itemId);
        const want = Math.max(1, Math.min(Math.floor(amount) || 1, invHas));

        let moved = 0;
        while (moved < want) {
            const existing = catData.items.find(i => i.id === itemId);
            // Item novo sem slot livre → categoria cheia (para o loop).
            if (!existing && catData.items.length >= limit) {
                if (moved === 0) {
                    this.showMessage(`❌ ${t('chest.categoryFull', { category: this._categoryName(toCategory) })}`, 'error');
                    return;
                }
                break;
            }
            if (!inventorySystem.removeItem(itemId, 1)) break;
            if (existing) existing.quantity++;
            else catData.items.push({ ...itemData, quantity: 1 });
            moved++;
        }
        if (moved === 0) return;

        this.showMessage(`✅ ${t('chest.storedQty', { qty: moved, name: itemData.name })}`, 'success');
        this.qtySelection.delete(`inv:${itemId}`);
        this.renderChestItems(chestId);
        this.renderPlayerInventory(chestId);
        this.renderChestCategories(chestId);
        this.saveChests();
    },
    
    /**
     * Remove um item do baú e adiciona ao inventário do jogador
     * Decrementa a quantidade ou remove completamente se for o último
     * @param {string} chestId - ID do baú
     * @param {number} itemId - ID do item a ser retirado
     * @param {string} fromCategory - Categoria do item no baú
     * @returns {void}
     */
    takeItemFromChest(chestId, itemId, fromCategory, amount = 1) {
        const chest = this.chests[chestId];
        if (!chest) return;

        const categoryData = chest.storage[fromCategory];
        if (!categoryData) return;

        const itemIndex = categoryData.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;

        const item = categoryData.items[itemIndex];
        const want = Math.max(1, Math.min(Math.floor(amount) || 1, item.quantity || 0));

        let moved = 0;
        // Transfere unidade a unidade; para se o inventário do player encher.
        while (moved < want && item.quantity > 0) {
            if (!inventorySystem?.addItem(itemId, 1)) break;
            item.quantity--;
            moved++;
        }
        if (moved === 0) return;
        if (item.quantity <= 0) categoryData.items.splice(itemIndex, 1);

        this.showMessage(`✅ ${t('chest.tookQty', { qty: moved, name: item.name })}`, 'success');
        this.qtySelection.delete(`chest:${fromCategory}:${itemId}`);
        this.renderChestItems(chestId);
        this.renderPlayerInventory(chestId);
        this.renderChestCategories(chestId);
        this.saveChests();
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
                    if (inventorySystem?.addItem(item.id, 1)) {
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
        if (!chest || !inventorySystem) return;
        
        let storedCount = 0;
        const inventory = inventorySystem.getInventory();
        
        Object.entries(inventory).forEach(([category, data]) => {
            const itemsToStore = [...data.items];
            itemsToStore.forEach(item => {
                const targetCategory = this.autoMapCategory(item.type || category);

                while (item.quantity > 0) {
                    // Verificar se há espaço
                    if (chest.storage[targetCategory].items.length >= this.slotsPerCategory) {
                        break;
                    }

                    if (inventorySystem.removeItem(item.id, 1)) {
                        const existingItem = chest.storage[targetCategory].items.find(i => i.id === item.id);
                        if (existingItem) {
                            existingItem.quantity++;
                        } else {
                            chest.storage[targetCategory].items.push({
                                ...inventorySystem.findItemData(item.id),
                                quantity: 1
                            });
                        }
                        item.quantity--;
                        storedCount++;
                    } else {
                        break;
                    }
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
     * Nome localizado da categoria do baú (fallback: a própria chave).
     * @param {string} category - chave da categoria
     * @returns {string} nome traduzido
     */
    _categoryName(category) {
        const name = t(`chest.categories.${category}`);
        return (name && name !== `chest.categories.${category}`) ? name : category;
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
        
        document.body.appendChild(msg);
        
        setTimeout(() => {
            if (msg.parentNode) msg.remove();
        }, 3000);
    },
    
    /**
     * No-op. Baús são persistidos POR SLOT pelo saveSystem (getChestsData na
     * hora de salvar). A antiga chave global `farmingXP_chests` vazava entre
     * saves/personagens (#181-like), então foi removida. Mantido pra compat com
     * os vários callers internos que sinalizavam "estado mudou".
     * @returns {void}
     */
    saveChests() { /* persistência agora é por slot (saveSystem) */ },

    /**
     * No-op. Ver {@link chestSystem.saveChests}. O carregamento acontece por
     * slot via `saveSystem._applyChestsData` → `restoreChest`.
     * @returns {void}
     */
    loadChests() { /* carregamento agora é por slot (saveSystem) */ },

    /**
     * Remove TODOS os baús do mundo e da memória. Chamado ao carregar um save ou
     * iniciar um novo jogo, pra não vazar baús de um slot/sessão pra outro.
     * @returns {void}
     */
    resetChests() {
        const theWorld = getObject('world');
        const removeWorldObject = window.removeWorldObject || theWorld?.objectDestroyed;
        for (const chestId of Object.keys(this.chests)) {
            if (removeWorldObject) removeWorldObject(chestId);
        }
        this.chests = {};
        // Se a UI de um baú que sumiu estava aberta, fecha.
        if (this.currentChest) this.closeChestUI();
    },

    /**
     * Recria um baú a partir dos dados de um save (usado por saveSystem no load).
     * Preserva id/posição/dimensões e restaura o `storage` (itens por categoria).
     * @param {Object} chestData - dados serializados do baú
     * @returns {void}
     */
    restoreChest(chestData) {
        if (!chestData || !chestData.id) return;

        const chest = {
            id: chestData.id,
            name: chestData.name || 'Baú',
            x: chestData.x,
            y: chestData.y,
            width: chestData.width || 31,
            height: chestData.height || 31,
            icon: '📦',
            type: 'chest',
            originalType: 'chest',
            interactable: true,
            storageId: chestData.id,
            storage: {}
        };

        // Inicializa as categorias e restaura os itens salvos (se houver).
        this.categories.forEach(category => {
            const saved = chestData.storage?.[category];
            chest.storage[category] = {
                items: Array.isArray(saved?.items) ? saved.items : [],
                limit: this.slotsPerCategory
            };
        });

        this.chests[chest.id] = chest;
        this.addChestToWorld(chest);
    },

    /**
     * Remove um baú do jogo
     * Deleta o baú do mundo visual e do sistema de armazenamento
     * @param {string} chestId - ID do baú a ser removido
     * @returns {void}
     */
    removeChest(chestId) {
        if (this.chests[chestId]) {
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
     * Destroys the chest system, closing any open UI.
     * fix: added destroy() for gameCleanup auto-discovery
     * @returns {void}
     */
    destroy() {
        this.closeChestUI();
        logger.debug('ChestSystem destruído');
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