/**
 * @file merchant.js - Sistema de comércio com mercadores NPC
 * @description Gerencia a interface de compra e venda de itens com mercadores do jogo.
 * Inclui sistema de horários de funcionamento, categorias de itens e transações.
 * @module MerchantSystem
 */

import { logger } from './logger.js';
import { currencyManager } from "./currencyManager.js";
import { items } from "./item.js";
import { WeatherSystem } from "./weather.js";
import { mapTypeToCategory } from "./categoryMapper.js";
import { getItem, getSellPrice } from "./itemUtils.js";

/**
 * Sistema de comércio com mercadores NPC
 * Gerencia lista de mercadores, inventários, transações de compra/venda e UI
 * @class MerchantSystem
 */
class MerchantSystem {
    constructor() {
        this.merchants = [];
        this.currentMerchant = null;
        this.tradeMode = 'sell';
        this.selectedPlayerItem = null;
        this.selectedMerchantItem = null;
        this.playerStorage = 'inventory';
        this.currentPlayerCategory = 'all';
        this.currentMerchantCategory = 'all';
        this.tradeValue = 0;
        this.tradeQuantity = 1;
        this.listenersSetup = false;
        this.lastMerchantOpenCheck = 0;
        this.merchantOpenCheckInterval = 5;

        // AbortController para cleanup de event listeners
        this.abortController = new AbortController();

        // Armazenar referência do handler do botão da loja
        this.storeBtnHandler = null;

        this.initialize();
    }

    // inicializa o sistema
    initialize() {
        this.loadMerchants();
        this.setupEventListeners();
        this.updateBalances();
        this.setupCommerceSystem();
    }

    // configura botão da loja
    setupCommerceSystem() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupStoreButton();
            });
        } else {
            this.setupStoreButton();
        }
    }

    // configura o botão que abre a lista de mercadores
    setupStoreButton() {
        const storeBtn = document.getElementById('storeBtn');

        if (!storeBtn) {
            setTimeout(() => this.setupStoreButton(), 100);
            return;
        }

        // Remove listener anterior se existir
        if (this.storeBtnHandler) {
            storeBtn.removeEventListener('click', this.storeBtnHandler);
        }

        // Criar e armazenar novo handler
        this.storeBtnHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openMerchantsList();
        };

        // Adicionar listener com signal para cleanup automático
        storeBtn.addEventListener('click', this.storeBtnHandler, {
            signal: this.abortController.signal
        });

        window.openStore = () => {
            this.openMerchantsList();
        };
    }

    // carrega lista de mercadores e itens
    loadMerchants() {
        this.merchants = [
            {
                id: 'thomas',
                name: 'Thomas',
                profession: 'Vendedor de Materiais',
                description: 'Dono da loja de materiais de construção.',
                avatar: 'assets/character/portrait/Thomas_portrait.webp',
                specialties: ['Recursos', 'Ferramentas', 'Construção'],
                schedule: {
                    daysOpen: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
                    openTime: 8 * 60,
                    closeTime: 18 * 60
                },
                items: [
                    { id: 9, name: 'Madeira Bruta', price: 15, category: 'resource', icon: '', quantity: 50 },
                    { id: 10, name: 'Pedra', price: 20, category: 'resource', icon: '', quantity: 30 },
                    { id: 37, name: 'Ferro', price: 40, category: 'resource', icon: '', quantity: 15 },
                    { id: 36, name: 'Vidro', price: 35, category: 'resource', icon: '', quantity: 10 },
                    { id: 32, name: 'Tijolos', price: 30, category: 'resource', icon: '', quantity: 20 },
                    { id: 33, name: 'Telhas', price: 25, category: 'resource', icon: '', quantity: 15 },
                    { id: 34, name: 'Prego', price: 5, category: 'resource', icon: '', quantity: 100 },
                    { id: 35, name: 'Corda', price: 12, category: 'resource', icon: '', quantity: 25 },
                    { id: 13, name: 'Picareta', price: 80, category: 'tool', icon: '', quantity: 5 },
                    { id: 14, name: 'Machado', price: 60, category: 'tool', icon: '', quantity: 5 },
                    { id: 22, name: 'Machete', price: 55, category: 'tool', icon: '', quantity: 5 },
                    { id: 16, name: 'Balde', price: 30, category: 'tool', icon: '', quantity: 10 }
                ]
            },
            {
                id: 'laila',
                name: 'Lara',
                profession: 'Cozinheira',
                description: 'Vende refeições e ingredientes.',
                avatar: 'assets/character/portrait/Laila_portrait.webp',
                specialties: ['Comida', 'Ingredientes', 'Refeições'],
                schedule: {
                    daysOpen: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
                    openTime: 6 * 60,
                    closeTime: 20 * 60
                },
                items: [
                    { id: 5, name: 'Maçã', price: 10, category: 'food', icon: '', quantity: 30 },
                    { id: 6, name: 'Pão', price: 25, category: 'food', icon: '', quantity: 15 },
                    { id: 23, name: 'Queijo', price: 35, category: 'food', icon: '', quantity: 12 },
                    { id: 24, name: 'Ovo Cozido', price: 15, category: 'food', icon: '', quantity: 20 },
                    { id: 25, name: 'Torta de Maçã', price: 60, category: 'food', icon: '', quantity: 8 },
                    { id: 26, name: 'Sopa de Legumes', price: 45, category: 'food', icon: '', quantity: 10 },
                    { id: 27, name: 'Mel', price: 40, category: 'food', icon: '', quantity: 5 },
                    { id: 28, name: 'Suco de Fruta', price: 30, category: 'food', icon: '', quantity: 15 },
                    { id: 40, name: 'Garrafa vazia', price: 5, category: 'resource', icon: '', quantity: 20 }
                ]
            },
            {
                id: 'rico',
                name: 'Rico',
                profession: 'Pecuária',
                description: 'Vende sementes, ração e animais.',
                avatar: 'assets/character/portrait/Rico_portrait.webp',
                specialties: ['Sementes', 'Animais', 'Ferramentas'],
                schedule: {
                    daysOpen: ['Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
                    openTime: 7 * 60,
                    closeTime: 19 * 60
                },
                items: [
                    { id: 3, name: 'Semente de Milho', price: 20, category: 'seed', icon: '', quantity: 40 },
                    { id: 4, name: 'Semente de Trigo', price: 15, category: 'seed', icon: '', quantity: 50 },
                    { id: 17, name: 'Semente de Cenoura', price: 12, category: 'seed', icon: '', quantity: 60 },
                    { id: 18, name: 'Semente de Tomate', price: 18, category: 'seed', icon: '', quantity: 40 },
                    { id: 19, name: 'Semente de Batata', price: 10, category: 'seed', icon: '', quantity: 70 },
                    { id: 20, name: 'Semente de Morango', price: 25, category: 'seed', icon: '', quantity: 30 },
                    { id: 21, name: 'Semente de Flores', price: 8, category: 'seed', icon: '', quantity: 100 },
                    { id: 53, name: 'Semente de Árvore', price: 50, category: 'seed', icon: '', quantity: 20 },
                    { id: 7, name: 'Ração para Galinha', price: 30, category: 'animal_food', icon: '', quantity: 20 },
                    { id: 8, name: 'Ração para Ovelha', price: 40, category: 'animal_food', icon: '', quantity: 20 },
                    { id: 29, name: 'Feno', price: 20, category: 'animal_food', icon: '', quantity: 50 },
                    { id: 30, name: 'Ração para Vaca', price: 50, category: 'animal_food', icon: '', quantity: 15 },
                    { id: 31, name: 'Petisco para Animais', price: 15, category: 'animal_food', icon: '', quantity: 25 },
                    { id: 12, name: 'Regador', price: 35, category: 'tool', icon: '', quantity: 8 },
                    { id: 15, name: 'Rastelo', price: 40, category: 'tool', icon: '', quantity: 6 }
                ]
            }
        ];
    }

    // configura listeners do sistema de comércio
    setupEventListeners() {
        if (this.listenersSetup) return;
        this.listenersSetup = true;

        const { signal } = this.abortController;

        document.addEventListener('timeChanged', () => {
            this.checkAndCloseIfMerchantClosed();
            const merchantsListModal = document.getElementById('merchantsListModal');
            if (merchantsListModal && merchantsListModal.classList.contains('active')) {
                this.updateMerchantsListStatus();
            }
        }, { signal });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') ||
                e.target.classList.contains('mch-close-button')) {
                this.closeAllModals();
            }
        }, { signal });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mch-back-button')) {
                this.backToMerchantsList();
            }
        }, { signal });

        document.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.mch-storage-toggle-btn');
            if (toggleBtn) {
                this.setPlayerStorage(toggleBtn.dataset.storage);
            }
        }, { signal });

        document.addEventListener('click', (e) => {
            const catBtn = e.target.closest('.mch-player-category-btn');
            if (catBtn) {
                this.setPlayerCategory(catBtn.dataset.category);
            }
        }, { signal });

        document.addEventListener('click', (e) => {
            const catBtn = e.target.closest('.mch-merchant-category-btn');
            if (catBtn) {
                this.setMerchantCategory(catBtn.dataset.category);
            }
        }, { signal });

        document.addEventListener('click', (e) => {
            const arrow = e.target.closest('.mch-trade-arrow');
            if (arrow) {
                if (arrow.classList.contains('mch-sell-arrow')) {
                    this.setTradeMode('sell');
                } else if (arrow.classList.contains('mch-buy-arrow')) {
                    this.setTradeMode('buy');
                }
            }
        }, { signal });

        document.addEventListener('click', (e) => {
            const hexagon = e.target.closest('.mch-hexagon-slot');
            if (hexagon && hexagon.dataset.itemId) {
                const itemId = parseInt(hexagon.dataset.itemId);
                this.selectPlayerItem(itemId);
            }
        }, { signal });

        document.addEventListener('click', (e) => {
            const merchantHexagon = e.target.closest('.mch-merchant-hexagon');
            if (merchantHexagon && merchantHexagon.dataset.itemId) {
                const itemId = parseInt(merchantHexagon.dataset.itemId);
                this.selectMerchantItem(itemId);
            }
        }, { signal });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mch-confirm-yes')) {
                this.confirmTrade();
            } else if (e.target.classList.contains('mch-confirm-no')) {
                this.cancelTrade();
            }
        }, { signal });
    }

    // aumenta a quantidade de transação
    increaseQuantity() {
        const maxQuantity = this.getMaxQuantity();
        if (this.tradeQuantity < maxQuantity) {
            this.tradeQuantity++;
            this.updateTradeValue();
            this.renderTradeButton();
            this.updateQuantityControls();
        }
    }

    // diminui a quantidade de transação
    decreaseQuantity() {
        if (this.tradeQuantity > 1) {
            this.tradeQuantity--;
            this.updateTradeValue();
            this.renderTradeButton();
            this.updateQuantityControls();
        }
    }

    // obtém quantidade máxima permitida
    getMaxQuantity() {
        if (this.tradeMode === 'sell') {
            const item = this.getPlayerItems().find(i => i.id === this.selectedPlayerItem);
            return item ? item.quantity : 1;
        } else {
            const item = this.getMerchantItems().find(i => i.id === this.selectedMerchantItem);
            return item ? Math.min(item.quantity, 99) : 99;
        }
    }

    // atualiza controles de quantidade
    updateQuantityControls() {
        const quantityDisplay = document.getElementById('tradeQuantityDisplay');
        const decreaseBtn = document.getElementById('quantityDecreaseBtn');
        const increaseBtn = document.getElementById('quantityIncreaseBtn');

        if (quantityDisplay) {
            quantityDisplay.textContent = this.tradeQuantity;
        }

        if (decreaseBtn) {
            decreaseBtn.disabled = this.tradeQuantity <= 1;
        }

        if (increaseBtn) {
            const maxQuantity = this.getMaxQuantity();
            increaseBtn.disabled = this.tradeQuantity >= maxQuantity;
        }
    }

    // abre lista de mercadores
    openMerchantsList() {
        const modal = document.getElementById('merchantsListModal');
        if (modal) {
            modal.classList.add('active');
            this.renderMerchantsList();
        }
    }

    // fecha todos os modais do comércio
    closeAllModals() {
        document.querySelectorAll('.mch-merchant-commerce-system').forEach(modal => {
            modal.classList.remove('active');
        });
        this.hideConfirmModal();
    }

    // verifica se mercador está aberto
    isMerchantOpen(merchant) {
        if (!merchant.schedule) return true;
        if (!WeatherSystem) return true;

        const currentDay = WeatherSystem.getWeekday();
        const currentTime = WeatherSystem.currentTime;

        const isOpenToday = merchant.schedule.daysOpen.includes(currentDay);
        if (!isOpenToday) return false;

        const isOpenNow = currentTime >= merchant.schedule.openTime &&
                          currentTime < merchant.schedule.closeTime;

        return isOpenNow;
    }

    // obtém status legível do mercador
    getMerchantStatus(merchant) {
        if (!merchant.schedule) return 'Aberto';
        if (!WeatherSystem) return 'Status desconhecido';

        const currentDay = WeatherSystem.getWeekday();
        const currentTime = WeatherSystem.currentTime;
        const hours = Math.floor(currentTime / 60);
        const minutes = Math.floor(currentTime % 60);
        const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        const isOpenToday = merchant.schedule.daysOpen.includes(currentDay);
        if (!isOpenToday) {
            const nextOpenDay = this.getNextOpenDay(merchant);
            return `Fechado (${currentDay} é folga${nextOpenDay ? `, reabre ${nextOpenDay}` : ''})`;
        }

        const openHours = Math.floor(merchant.schedule.openTime / 60);
        const closeHours = Math.floor(merchant.schedule.closeTime / 60);
        const openStr = `${String(openHours).padStart(2, '0')}:00`;
        const closeStr = `${String(closeHours).padStart(2, '0')}:00`;

        if (currentTime < merchant.schedule.openTime) {
            return `Ainda não abriu (Abre às ${openStr})`;
        } else if (currentTime >= merchant.schedule.closeTime) {
            return `Já fechou (Fechou às ${closeStr})`;
        } else {
            return `Aberto • Fecha às ${closeStr}`;
        }
    }

    // renderiza lista de mercadores
    renderMerchantsList() {
        const grid = document.getElementById('merchantsGrid');
        if (!grid) return;

        grid.innerHTML = this.merchants.map(merchant => {
            const isOpen = this.isMerchantOpen(merchant);
            const status = this.getMerchantStatus(merchant);

            return `
                <div class="mch-merchant-card ${!isOpen ? 'mch-merchant-closed' : ''}" data-merchant-id="${merchant.id}">
                    <div class="mch-merchant-card-header">
                        <img src="${merchant.avatar}" alt="${merchant.name}" class="mch-merchant-card-avatar">
                        <div class="mch-merchant-card-info">
                            <h3>${merchant.name}</h3>
                            <div class="mch-merchant-card-profession">${merchant.profession}</div>
                        </div>
                    </div>
                    <div class="mch-merchant-card-details">
                        <div><strong>Especialidades:</strong> ${merchant.specialties.join(', ')}</div>
                        <div class="mch-merchant-status ${isOpen ? 'open' : 'closed'}" data-merchant-status="${merchant.id}">
                            <strong>${status}</strong>
                        </div>
                    </div>
                    <div class="mch-merchant-card-items">
                        ${merchant.items.slice(0, 3).map(item => `
                            <span class="mch-merchant-item-tag">${item.name}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.mch-merchant-card').forEach(card => {
            const merchantId = card.dataset.merchantId;
            const merchant = this.merchants.find(m => m.id === merchantId);
            const isOpen = this.isMerchantOpen(merchant);

            if (isOpen) {
                card.addEventListener('click', () => {
                    this.openCommerceModal(merchantId);
                });
                card.style.cursor = 'pointer';
            } else {
                card.style.cursor = 'not-allowed';
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showMessage(`${merchant.name} está fechado`);
                });
            }
        });
    }

    // atualiza status dos mercadores sem re-render completo
    updateMerchantsListStatus() {
        this.merchants.forEach(merchant => {
            const statusEl = document.querySelector(`[data-merchant-status="${merchant.id}"]`);
            if (statusEl) {
                const status = this.getMerchantStatus(merchant);
                const isOpen = this.isMerchantOpen(merchant);

                statusEl.className = `mch-merchant-status ${isOpen ? 'open' : 'closed'}`;
                statusEl.innerHTML = `<strong>${status}</strong>`;

                const card = statusEl.closest('.mch-merchant-card');
                if (card) {
                    if (isOpen) {
                        card.classList.remove('mch-merchant-closed');
                        card.style.cursor = 'pointer';
                    } else {
                        card.classList.add('mch-merchant-closed');
                        card.style.cursor = 'not-allowed';
                    }
                }
            }
        });
    }

    // abre modal de comércio para o mercador selecionado
    openCommerceModal(merchantId) {
        const merchant = this.merchants.find(m => m.id === merchantId);
        if (!merchant) return;

        if (!this.isMerchantOpen(merchant)) {
            const status = this.getMerchantStatus(merchant);
            this.showMessage(`${merchant.name} está ${status.toLowerCase()}`);
            return;
        }

        this.currentMerchant = merchant;
        this.lastMerchantOpenCheck = Date.now();

        this.closeAllModals();
        const modal = document.getElementById('commerceModal');
        if (modal) {
            modal.classList.add('active');
            this.renderCommerceModal();
        }
    }

    // verifica e fecha loja se mercador fechou
    checkAndCloseIfMerchantClosed() {
        if (!this.currentMerchant) return;

        const commerceModal = document.getElementById('commerceModal');
        if (!commerceModal || !commerceModal.classList.contains('active')) return;

        if (!this.isMerchantOpen(this.currentMerchant)) {
            this.closeAllModals();
            this.showMessage(`${this.currentMerchant.name} fechou. Volte durante o horário de funcionamento.`);
            setTimeout(() => {
                this.openMerchantsList();
            }, 500);
        }
    }

    // update chamado pelo game loop
    update(deltaTime) {
        const currentTime = Date.now();
        if (currentTime - this.lastMerchantOpenCheck >= this.merchantOpenCheckInterval * 1000) {
            this.checkAndCloseIfMerchantClosed();
            this.lastMerchantOpenCheck = currentTime;
        }
    }

    // encontra próximo dia de funcionamento
    getNextOpenDay(merchant) {
        if (!merchant.schedule) return null;

        const currentDay = WeatherSystem.getWeekday();
        const daysOfWeek = WeatherSystem.daysOfWeek;
        const currentIndex = daysOfWeek.indexOf(currentDay);

        for (let i = 1; i <= 7; i++) {
            const nextIndex = (currentIndex + i) % 7;
            const nextDay = daysOfWeek[nextIndex];
            if (merchant.schedule.daysOpen.includes(nextDay)) {
                return nextDay;
            }
        }

        return null;
    }

    // renderiza o modal de comércio
    renderCommerceModal() {
        this.updateCommerceBalance();
        this.renderMerchantInfo();
        this.renderPlayerCategories();
        this.renderMerchantCategories();
        this.renderPlayerItems();
        this.renderMerchantItems();
        this.updateActionIndicator();
        this.updateTradeValue();
        this.renderTradeButton();
    }

    // atualiza saldo exibido
    updateCommerceBalance() {
        const balanceElement = document.getElementById('commerceBalance');
        if (balanceElement) {
            balanceElement.textContent = currencyManager.getMoney();
        }
    }

    // preenche dados do mercador no modal
    renderMerchantInfo() {
        const avatar = document.getElementById('merchantAvatar');
        const name = document.getElementById('merchantName');
        const profession = document.getElementById('merchantProfession');
        const specialty = document.getElementById('merchantSpecialty');

        if (avatar) avatar.src = this.currentMerchant.avatar;
        if (name) name.textContent = this.currentMerchant.name;
        if (profession) profession.textContent = this.currentMerchant.profession;
        if (specialty) specialty.textContent = this.currentMerchant.specialties.join(', ');
    }

    // renderiza categorias do jogador
    renderPlayerCategories() {
        const container = document.getElementById('playerCategories');
        if (!container) return;

        const categories = this.getPlayerCategories();
        container.innerHTML = categories.map(cat => `
            <button class="mch-player-category-btn ${this.currentPlayerCategory === cat ? 'active' : ''}" 
                    data-category="${cat}">
                ${this.getCategoryIcon(cat)} ${this.getCategoryName(cat)}
            </button>
        `).join('');
    }

    // renderiza categorias do mercador
    renderMerchantCategories() {
        const container = document.getElementById('merchantCategories');
        if (!container) return;

        const categories = this.getMerchantCategories();
        container.innerHTML = categories.map(cat => `
            <button class="mch-merchant-category-btn ${this.currentMerchantCategory === cat ? 'active' : ''}" 
                    data-category="${cat}">
                ${this.getCategoryIcon(cat)} ${this.getCategoryName(cat)}
            </button>
        `).join('');
    }

    // renderiza itens do jogador
    renderPlayerItems() {
        const grid = document.getElementById('playerItemsGrid');
        if (!grid) return;

        const items = this.getPlayerItems();

        if (items.length === 0) {
            grid.innerHTML = `
                <div class="mch-hexagon-slot empty">
                    <div class="mch-hexagon-name">Vazio</div>
                </div>
            `;
            return;
        }

        grid.innerHTML = items.map(item => `
            <div class="mch-hexagon-slot ${this.selectedPlayerItem === item.id ? 'mch-item-selected' : ''}" 
                 data-item-id="${item.id}">
                <div class="mch-hexagon-name">${item.name}</div>
                <div class="mch-hexagon-quantity">${item.quantity}</div>
            </div>
        `).join('');
    }

    // renderiza itens do mercador
    renderMerchantItems() {
        const grid = document.getElementById('merchantItemsGrid');
        if (!grid) return;

        const items = this.getMerchantItems();
        grid.innerHTML = items.map(item => `
            <div class="mch-merchant-hexagon ${this.selectedMerchantItem === item.id ? 'mch-item-selected' : ''}" 
                 data-item-id="${item.id}">
                <div class="mch-hexagon-name">${item.name}</div>
                <div class="mch-merchant-hexagon-price">$${item.price}</div>
            </div>
        `).join('');
    }

    // categorias do jogador
    getPlayerCategories() {
        return ['all', 'tools', 'seeds', 'food', 'animal_food', 'construction', 'resources'];
    }

    // categorias do mercador
    getMerchantCategories() {
        const categories = new Set(['all']);
        this.currentMerchant.items.forEach(item => {
            categories.add(item.category);
        });
        return Array.from(categories);
    }

    // obtém itens do jogador a partir do storage selecionado
    getPlayerItems() {
        let playerItems = [];

        if (this.playerStorage === 'inventory') {
            if (window.inventorySystem && window.inventorySystem.getInventory) {
                const inventory = window.inventorySystem.getInventory();
                Object.values(inventory).forEach(category => {
                    if (category && category.items) {
                        playerItems = playerItems.concat(category.items.map(item => ({
                            id: item.id,
                            name: item.name,
                            icon: item.icon,
                            quantity: item.quantity,
                            type: item.type
                        })));
                    }
                });
            }
        } else {
            if (window.storageSystem && window.storageSystem.storage) {
                const storage = window.storageSystem.storage;
                Object.keys(storage).forEach(category => {
                    if (storage[category]) {
                        storage[category].forEach(stack => {
                            const itemData = items.find(item => item.id === stack.itemId);
                            if (itemData) {
                                playerItems.push({
                                    id: stack.itemId,
                                    name: itemData.name,
                                    icon: itemData.icon,
                                    quantity: stack.quantity,
                                    type: itemData.type
                                });
                            }
                        });
                    }
                });
            }
        }

        if (this.currentPlayerCategory !== 'all') {
            playerItems = playerItems.filter(item => this.mapItemTypeToCategory(item.type) === this.currentPlayerCategory);
        }

        return playerItems;
    }

    // obtém itens do mercador filtrados por categoria
    getMerchantItems() {
        let merchantItems = this.currentMerchant.items;
        if (this.currentMerchantCategory !== 'all') {
            merchantItems = merchantItems.filter(item => item.category === this.currentMerchantCategory);
        }
        return merchantItems;
    }

    // define storage do jogador
    setPlayerStorage(storage) {
        this.playerStorage = storage;

        document.querySelectorAll('.mch-storage-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.mch-storage-toggle-btn[data-storage="${storage}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        this.renderPlayerItems();
        this.clearSelections();
    }

    // define categoria do jogador
    setPlayerCategory(category) {
        this.currentPlayerCategory = category;
        this.renderPlayerCategories();
        this.renderPlayerItems();
        this.clearSelections();
    }

    // define categoria do mercador
    setMerchantCategory(category) {
        this.currentMerchantCategory = category;
        this.renderMerchantCategories();
        this.renderMerchantItems();
        this.clearSelections();
    }

    // define modo de comércio
    setTradeMode(mode) {
        this.tradeMode = mode;
        this.updateActionIndicator();
        this.clearSelections();
        this.updateTradeValue();
        this.renderTradeButton();
    }

    // atualiza indicador de ação
    updateActionIndicator() {
        const indicator = document.getElementById('actionIndicator');
        if (indicator) {
            indicator.textContent = this.tradeMode === 'sell' ? 'Vendendo' : 'Comprando';
        }
    }

    // atualiza valor da transação
    updateTradeValue() {
        const tradeValueEl = document.getElementById('tradeValue');
        if (tradeValueEl) {
            const totalValue = this.tradeValue * this.tradeQuantity;
            tradeValueEl.textContent = `$${totalValue}`;
        }
        this.updateQuantityControls();
    }

    // renderiza botão de trade
    renderTradeButton() {
        const actionPanel = document.querySelector('.mch-action-panel');
        if (!actionPanel) return;

        const existingBtn = actionPanel.querySelector('.mch-trade-button');
        if (existingBtn) existingBtn.remove();

        const totalValue = this.tradeValue * this.tradeQuantity;
        const tradeButton = document.createElement('button');

        tradeButton.className = `mch-trade-button ${this.tradeMode}`;
        tradeButton.id = 'tradeButton';
        tradeButton.innerHTML = `
            <span class="mch-trade-button-text">
                ${this.tradeMode === 'sell' ? 'VENDER' : 'COMPRAR'} x${this.tradeQuantity}
            </span>
            <span class="mch-trade-button-price">$${totalValue}</span>
        `;

        const hasSelection = (this.tradeMode === 'sell' && this.selectedPlayerItem) ||
                             (this.tradeMode === 'buy' && this.selectedMerchantItem);
        tradeButton.disabled = !hasSelection || this.tradeValue === 0;

        if (!tradeButton.disabled) {
            tradeButton.addEventListener('click', () => this.showConfirmModal());
        }

        actionPanel.appendChild(tradeButton);
    }

    // seleciona item do jogador
    selectPlayerItem(itemId) {
        if (this.tradeMode === 'buy') {
            this.showMessage('Modo de compra ativo. Selecione um item do mercador.');
            return;
        }

        this.selectedPlayerItem = itemId;
        this.selectedMerchantItem = null;
        this.tradeQuantity = 1;

        const item = this.getPlayerItems().find(i => i.id === itemId);
        if (item) {
            const originalItem = items.find(i => i.id === itemId);
            if (originalItem) {
                this.tradeValue = Math.floor(originalItem.price * 0.5);
                this.updateTradeValue();
                this.renderTradeButton();
                this.showMessage(`Selecionado: ${item.name} (${item.quantity}x) - Venda: $${this.tradeValue} cada`);
            }
        }

        this.renderPlayerItems();
        this.renderMerchantItems();
    }

    // seleciona item do mercador
    selectMerchantItem(itemId) {
        if (this.tradeMode === 'sell') {
            this.showMessage('Modo de venda ativo. Selecione um item do seu inventário.');
            return;
        }

        this.selectedMerchantItem = itemId;
        this.selectedPlayerItem = null;
        this.tradeQuantity = 1;

        const item = this.getMerchantItems().find(i => i.id === itemId);
        if (item) {
            this.tradeValue = item.price;
            this.updateTradeValue();
            this.renderTradeButton();
            this.showMessage(`Selecionado: ${item.name} - Compra: $${item.price} cada`);
        }

        this.renderPlayerItems();
        this.renderMerchantItems();
    }

    // limpa seleções
    clearSelections() {
        this.selectedPlayerItem = null;
        this.selectedMerchantItem = null;
        this.tradeValue = 0;
        this.tradeQuantity = 1;
        this.renderPlayerItems();
        this.renderMerchantItems();
        this.renderTradeButton();
        this.updateTradeValue();
    }

    // mostra modal de confirmação
    showConfirmModal() {
        const modal = document.getElementById('tradeConfirmModal');
        const messageEl = document.getElementById('confirmMessage');
        const totalValue = this.tradeValue * this.tradeQuantity;

        let itemName = '';
        if (this.tradeMode === 'sell') {
            const item = this.getPlayerItems().find(i => i.id === this.selectedPlayerItem);
            itemName = item ? item.name : 'item';
            messageEl.textContent = `Vender ${this.tradeQuantity}x ${itemName} por $${totalValue}?`;
        } else {
            const item = this.getMerchantItems().find(i => i.id === this.selectedMerchantItem);
            itemName = item ? item.name : 'item';
            messageEl.textContent = `Comprar ${this.tradeQuantity}x ${itemName} por $${totalValue}?`;
        }

        if (modal) modal.classList.add('active');
    }

    // esconde modal de confirmação
    hideConfirmModal() {
        const modal = document.getElementById('tradeConfirmModal');
        if (modal) modal.classList.remove('active');
    }

    // confirma transação
    confirmTrade() {
        this.hideConfirmModal();
        const totalValue = this.tradeValue * this.tradeQuantity;

        if (this.tradeMode === 'sell') {
            this.processSell(totalValue);
        } else {
            this.processBuy(totalValue);
        }
    }

    // cancela transação
    cancelTrade() {
        this.hideConfirmModal();
    }

    // processa venda
    processSell(totalValue) {
        if (!this.selectedPlayerItem) return;

        if (this.playerStorage === 'inventory') {
            if (window.inventorySystem && window.inventorySystem.removeItem) {
                if (window.inventorySystem.removeItem(this.selectedPlayerItem, this.tradeQuantity)) {

                    // FIX: Usar 'earn' conforme definido em currencyManager.js
                    if (typeof currencyManager.earn === 'function') {
                        currencyManager.earn(totalValue, "Venda ao Mercador");
                    } else {
                        logger.error("Erro: método earn() não encontrado no currencyManager");
                    }
                    
                    this.showMessage(`Venda realizada! +$${totalValue}`, 'success');
                    this.updateBalances();
                    this.renderPlayerItems();
                    this.clearSelections();
                } else {
                    this.showMessage('Erro ao remover item do inventário.', 'error');
                }
            }
        } else {
            // Lógica para vender do armazém (implementar no storageSystem se necessário)
            this.showMessage('Venda direta do armazém não implementada.', 'error');
        }
    }

    // processa compra
    processBuy(totalValue) {
        if (!this.selectedMerchantItem) return;

        if (currencyManager.getMoney() < totalValue) {
            this.showMessage('Dinheiro insuficiente!', 'error');
            return;
        }

        if (this.playerStorage === 'inventory') {
            if (window.inventorySystem && window.inventorySystem.addItem) {
                // Tentar adicionar ao inventário (usando apenas ID e quantidade para mapeamento automático)
                if (window.inventorySystem.addItem(this.selectedMerchantItem, this.tradeQuantity)) {

                    // FIX: Usar 'spend' conforme definido em currencyManager.js
                    if (typeof currencyManager.spend === 'function') {
                        currencyManager.spend(totalValue, "Compra do Mercador");
                    } else {
                        logger.error("Erro: método spend() não encontrado no currencyManager");
                    }

                    this.showMessage(`Compra realizada! -$${totalValue}`, 'success');
                    this.updateBalances();
                    this.renderPlayerItems(); 
                    this.clearSelections();
                } else {
                    this.showMessage('Inventário cheio ou erro ao adicionar item.', 'error');
                }
            }
        } else {
             this.showMessage('Compra direta para o armazém não implementada.', 'error');
        }
    }

    // atualiza saldos na UI
    updateBalances() {
        this.updateCommerceBalance();
        if (window.playerHUD && window.playerHUD.updateMoney) {
            window.playerHUD.updateMoney();
        }
    }

    // volta para lista de mercadores
    backToMerchantsList() {
        const commerceModal = document.getElementById('commerceModal');
        if (commerceModal) commerceModal.classList.remove('active');
        this.openMerchantsList();
        this.currentMerchant = null;
    }

    // mapeia tipo de item para categoria visual
    mapItemTypeToCategory(type) {
        return mapTypeToCategory(type);
    }

    // obtém ícone da categoria
    getCategoryIcon(category) {
        const icons = {
            'all': '📋',
            'tools': '🛠️',
            'seeds': '🌱',
            'food': '🍎',
            'animal_food': '🌾',
            'construction': '🧱',
            'resources': '🪵'
        };
        return icons[category] || '📦';
    }

    // obtém nome legível da categoria
    getCategoryName(category) {
        const names = {
            'all': 'Todos',
            'tools': 'Ferramentas',
            'seeds': 'Sementes',
            'food': 'Comida',
            'animal_food': 'Ração',
            'construction': 'Construção',
            'resources': 'Recursos'
        };
        return names[category] || category;
    }

    // exibe mensagem temporária
    showMessage(text, type = 'info') {
        const msg = document.createElement('div');
        msg.className = `mch-toast-message ${type}`;
        msg.textContent = text;
        document.body.appendChild(msg);

        setTimeout(() => {
            msg.classList.add('show');
        }, 10);

        setTimeout(() => {
            msg.classList.remove('show');
            setTimeout(() => msg.remove(), 300);
        }, 3000);
    }

    /**
     * Limpa todos os event listeners e recursos do sistema
     * Remove todos os listeners registrados via AbortController
     * @returns {void}
     */
    destroy() {
        // Remove todos os event listeners
        this.abortController.abort();
        
        // Reset AbortController para permitir re-inicialização
        this.abortController = new AbortController();

        // Remove listener manual do botão da loja
        const storeBtn = document.getElementById('storeBtn');
        if (storeBtn && this.storeBtnHandler) {
            storeBtn.removeEventListener('click', this.storeBtnHandler);
            this.storeBtnHandler = null;
        }

        // Reset listeners flag para permitir re-setup
        this.listenersSetup = false;
        
        // Clear referências
        this.currentMerchant = null;
        this.selectedPlayerItem = null;
        this.selectedMerchantItem = null;
    }
}

export const merchantSystem = new MerchantSystem();
window.merchantSystem = merchantSystem;

// =============================================================================
// FUNÇÕES GLOBAIS PARA COMPATIBILIDADE COM HTML (onclick)
// Estas funções conectam os botões do index.html com a classe MerchantSystem
// =============================================================================

window.increaseQuantity = function() {
    merchantSystem.increaseQuantity();
};

window.decreaseQuantity = function() {
    merchantSystem.decreaseQuantity();
};

window.setTradeMode = function(mode) {
    merchantSystem.setTradeMode(mode);
};

window.confirmTrade = function() {
    merchantSystem.confirmTrade();
};

window.cancelTrade = function() {
    merchantSystem.cancelTrade();
};

window.closeCommerceSystem = function() {
    merchantSystem.closeAllModals();
};

window.backToMerchantsList = function() {
    merchantSystem.backToMerchantsList();
};