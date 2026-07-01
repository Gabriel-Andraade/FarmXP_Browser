/**
 * @file merchant.js - Sistema de comércio com mercadores NPC
 * @description Gerencia a interface de compra e venda de itens com mercadores do jogo.
 * Inclui sistema de horários de funcionamento, categorias de itens e transações.
 * @module MerchantSystem
 */

import { logger } from './logger.js';
import { currencyManager } from "./currencyManager.js";
import { WeatherSystem } from "./weather.js";
import { mapTypeToCategory } from "./categoryMapper.js";
import { getItem, getSellPrice, setItemIcon } from "./itemUtils.js";
import { t } from './i18n/i18n.js';
import { translateDOM } from './settingsUI.js';
import { registerSystem, getSystem } from "./gameState.js";
import { isValidPositiveInteger, validateTradeInput, isValidPositiveNumber } from './validation.js';

/**
 * Issue #200: per-(merchant × inventory category) sell modifier. Selling an
 * item whose category matches a merchant's profession pays this fraction MORE;
 * anything outside their specialty pays OUT_OF_SPECIALTY_PENALTY less. Keyed by
 * merchant id → inventory category → bonus fraction, so it's fully tunable.
 */
const PROFESSION_BUY_BONUS = {
    thomas: { resources: 0.40, tools: 0.40, construction: 0.40 }, // materials seller
    laila:  { food: 0.40 },                                       // cook
    rico:   { seeds: 0.40, animal_food: 0.40, tools: 0.40 },      // livestock / farming
};

// Issue #200: fraction shaved off the sell price for items outside the
// merchant's specialty (e.g. selling seeds to the cook).
const OUT_OF_SPECIALTY_PENALTY = 0.20;

// Issue #203: how many catalog items each merchant offers per in-game day.
// The offer is a seeded random subset that rotates every day.
const DAILY_OFFER_SIZE = 6;

// Issue #201: each merchant's baseline daily cash. The fund for a given day is
// this base times a seeded daily factor, so it varies day to day but is fully
// reproducible (survives reload). Tunable per merchant.
const MERCHANT_FUND_BASE = {
    thomas: 900,
    laila:  700,
    rico:   1100,
};
const DEFAULT_FUND_BASE = 800;        // fallback for a merchant without an entry
const FUND_FACTOR_MIN = 0.7;          // daily fund = base × factor in [MIN, MAX]
const FUND_FACTOR_MAX = 1.3;

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
        this.merchantOpenCheckInterval = 5;
        this._merchantCheckAcc = 0;

        // Issue #203: cache of each merchant's rotating offer for the current
        // in-game day. Recomputed deterministically when the day changes, so it
        // survives save/load without being persisted.
        this._offerDay = null;
        this._dailyOffers = new Map(); // merchantId -> Set<itemId>

        // Issue #201: today's net cash flow per merchant — what they paid the
        // player (sells) minus what the player paid them (buys). Keyed by the
        // in-game day so it resets when the day advances. This is the one piece
        // persisted (serialize/restore) so a reload can't refill a depleted
        // fund; the daily fund itself is recomputed deterministically.
        this._fundDay = null;
        this._spentToday = new Map(); // merchantId -> net paid out today (buys credit it)

        // AbortController para cleanup de event listeners
        this.abortController = new AbortController();

        // Armazenar referência do handler do botão da loja
        this.storeBtnHandler = null;

        // fix: track pending timers for cleanup in destroy()
        this._setupRetryTimer = null;
        this._reopenTimer = null;

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
            // fix: store retry timer so destroy() can cancel it
            this._setupRetryTimer = setTimeout(() => {
                this._setupRetryTimer = null;
                this.setupStoreButton();
            }, 100);
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
                professionKey: 'materialsSeller',
                descriptionKey: 'thomas',
                avatar: 'assets/character/portrait/Thomas_portrait.webp',
                specialtiesKeys: ['resources', 'tools', 'construction'],
                schedule: {
                    daysOpen: [0, 1, 2, 3, 4], // Segunda a Sexta (índices)
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
                    { id: 16, name: 'Balde', price: 30, category: 'tool', icon: '', quantity: 10 },
                    // Issue #170: Shears (0) had no acquisition path — gating the
                    // wool → fabric → chest chain. Added here so the loop closes.
                    { id: 0,  name: 'Tesoura de jardinagem', price: 20, category: 'tool', icon: '', quantity: 5 }
                ]
            },
            {
                id: 'laila',
                name: 'Lara',
                professionKey: 'cook',
                descriptionKey: 'lara',
                avatar: 'assets/character/portrait/Laila_portrait.webp',
                specialtiesKeys: ['food', 'ingredients', 'meals'],
                schedule: {
                    daysOpen: [0, 1, 2, 3, 4, 5], // Segunda a Sábado (índices)
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
                professionKey: 'livestock',
                descriptionKey: 'rico',
                avatar: 'assets/character/portrait/Rico_portrait.webp',
                specialtiesKeys: ['seeds', 'animals', 'tools'],
                schedule: {
                    daysOpen: [1, 2, 3, 4, 5, 6], // Terça a Domingo (índices)
                    openTime: 7 * 60,
                    closeTime: 19 * 60
                },
                items: [
                    // Issue #215: only seeds with a working CROPS config are sold,
                    // so every purchasable seed can actually be planted. Priced by
                    // growth cycle (fast/cheap → slow/premium). The old seeds with
                    // no crop (corn 3, wheat 4, tomato 18, potato 19, strawberry 20,
                    // flowers 21, tree 53) were removed; re-add them when their
                    // crops are implemented.
                    { id: 114, name: 'Semente de Matinho',   price: 5,  category: 'seed', icon: '', quantity: 60 }, // 2d
                    { id: 107, name: 'Grão de Feno',         price: 8,  category: 'seed', icon: '', quantity: 50 }, // 4d
                    { id: 122, name: 'Semente de Beterraba', price: 10, category: 'seed', icon: '', quantity: 50 }, // 5d
                    { id: 110, name: 'Semente de Pepino',    price: 12, category: 'seed', icon: '', quantity: 45 }, // 6d
                    { id: 124, name: 'Semente de Cenoura',   price: 12, category: 'seed', icon: '', quantity: 60 }, // 7d
                    { id: 116, name: 'Semente de Girassol',  price: 13, category: 'seed', icon: '', quantity: 40 }, // 8d
                    { id: 120, name: 'Semente de Brócolis',  price: 13, category: 'seed', icon: '', quantity: 40 }, // 8d
                    { id: 132, name: 'Semente de Couve-Flor', price: 14, category: 'seed', icon: '', quantity: 40 }, // 8d
                    { id: 128, name: 'Semente de Pimentinha', price: 16, category: 'seed', icon: '', quantity: 35 }, // 9d
                    { id: 130, name: 'Semente de Pimentão',  price: 18, category: 'seed', icon: '', quantity: 35 }, // 10d
                    { id: 118, name: 'Semente de Abóbora',   price: 22, category: 'seed', icon: '', quantity: 25 }, // 12d
                    { id: 112, name: 'Muda de Abacaxi',      price: 30, category: 'seed', icon: '', quantity: 20 }, // 15d
                    { id: 126, name: 'Semente de Uva',       price: 30, category: 'seed', icon: '', quantity: 20 }, // 20d
                    { id: 7, name: 'Ração para Galinha', price: 30, category: 'animal_food', icon: '', quantity: 20 },
                    { id: 8, name: 'Ração para Ovelha', price: 40, category: 'animal_food', icon: '', quantity: 20 },
                    { id: 29, name: 'Feno', price: 20, category: 'animal_food', icon: '', quantity: 50 },
                    { id: 30, name: 'Ração para Vaca', price: 50, category: 'animal_food', icon: '', quantity: 15 },
                    { id: 31, name: 'Petisco para Animais', price: 15, category: 'animal_food', icon: '', quantity: 25 },
                    { id: 12, name: 'Regador', price: 35, category: 'tool', icon: '', quantity: 8 },
                    { id: 15, name: 'Rastelo', price: 40, category: 'tool', icon: '', quantity: 6 },
                    // Issue #171: food troughs per species, livestock fits Rico's stock.
                    { id: 104, name: 'Cocho de Ração (Gado/Ovelha)', price: 280, category: 'construction', icon: '', quantity: 4 },
                    { id: 105, name: 'Cocho de Ração (Suínos)',      price: 260, category: 'construction', icon: '', quantity: 4 },
                    { id: 106, name: 'Cocho de Ração (Aves)',        price: 220, category: 'construction', icon: '', quantity: 4 }
                ]
            }
        ];

        // Issue #202: snapshot each item's starting stock so the daily restock
        // can refill it. Purchases decrement quantity in place (persisting
        // through the in-game day); restockDaily() resets it on dayChanged.
        for (const merchant of this.merchants) {
            for (const item of merchant.items) item.initialQuantity = item.quantity;
        }
    }

    // Issue #202/#203: on a new in-game day refill every merchant's stock back
    // to its starting amount; the rotating daily offer (#203) is recomputed
    // lazily by getDailyOffer keyed on the day, so it refreshes automatically.
    // Called once per in-game day (dayChanged).
    restockDaily() {
        for (const merchant of this.merchants) {
            for (const item of merchant.items) {
                if (typeof item.initialQuantity === 'number') item.quantity = item.initialQuantity;
            }
        }
        const commerceModal = document.getElementById('commerceModal');
        if (this.currentMerchant && commerceModal?.classList.contains('active')) {
            // The selected item may have rotated out of today's offer — drop the
            // stale selection, then full re-render so the quantity controls /
            // trade button reflect the refreshed stock and offer.
            this.clearSelections();
            this.renderCommerceModal();
        }
    }

    // configura listeners do sistema de comércio
    setupEventListeners() {
        if (this.listenersSetup) return;
        this.listenersSetup = true;

        const { signal } = this.abortController;

        // Listener para mudança de idioma - re-renderiza interfaces abertas
        document.addEventListener('languageChanged', () => {
            const merchantsListModal = document.getElementById('merchantsListModal');
            const commerceModal = document.getElementById('commerceModal');

            if (merchantsListModal && merchantsListModal.classList.contains('active')) {
                this.renderMerchantsList();
            }
            if (commerceModal && commerceModal.classList.contains('active')) {
                this.renderCommerceModal();
            }
        }, { signal });

        document.addEventListener('timeChanged', () => {
            this.checkAndCloseIfMerchantClosed();
            const merchantsListModal = document.getElementById('merchantsListModal');
            if (merchantsListModal && merchantsListModal.classList.contains('active')) {
                this.updateMerchantsListStatus();
            }
        }, { signal });

        // Issue #202: refill merchant stock once per in-game day.
        document.addEventListener('dayChanged', () => this.restockDaily(), { signal });

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
                const itemId = parseInt(hexagon.dataset.itemId, 10);
                this.selectPlayerItem(itemId);
            }
        }, { signal });

        document.addEventListener('click', (e) => {
            const merchantHexagon = e.target.closest('.mch-merchant-hexagon');
            if (merchantHexagon && merchantHexagon.dataset.itemId) {
                const itemId = parseInt(merchantHexagon.dataset.itemId, 10);
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

        document.addEventListener('click', (e) => {
            if (e.target.closest('.mch-quantity-decrease')) {
                this.decreaseQuantity();
            } else if (e.target.closest('.mch-quantity-increase')) {
                this.increaseQuantity();
            }
        }, { signal });
    }

    // aumenta a quantidade de transação
    increaseQuantity() {
        // Validar que tradeQuantity é um inteiro positivo
        if (!isValidPositiveInteger(this.tradeQuantity)) {
            logger.warn('[Merchant] Invalid tradeQuantity, resetting to 1');
            this.tradeQuantity = 1;
        }

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
        // Validar que tradeQuantity é um inteiro positivo
        if (!isValidPositiveInteger(this.tradeQuantity)) {
            logger.warn('[Merchant] Invalid tradeQuantity, resetting to 1');
            this.tradeQuantity = 1;
        }

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
            translateDOM();
        }
    }

    // fecha todos os modais do comércio
    closeAllModals() {
        document.querySelectorAll('.mch-merchant-commerce-system').forEach(modal => {
            modal.classList.remove('active');
        });
        this.hideConfirmModal();
    }

    // retorna o índice do dia atual (0=Segunda, 1=Terça, ..., 6=Domingo)
    getCurrentDayIndex() {
        return (WeatherSystem.day - 1) % 7;
    }

    // verifica se mercador está aberto
    isMerchantOpen(merchant) {
        if (!merchant.schedule) return true;
        if (!WeatherSystem) return true;

        // Check tax block (Lara/Thomas blocked if tax overdue, Rico exempt)
        const bartolomeu = getSystem('npcBartolomeu');
        if (bartolomeu && bartolomeu.isMerchantBlocked && bartolomeu.isMerchantBlocked(merchant.id)) {
            return false;
        }

        const currentDayIndex = this.getCurrentDayIndex();
        const currentTime = WeatherSystem.currentTime;

        const isOpenToday = merchant.schedule.daysOpen.includes(currentDayIndex);
        if (!isOpenToday) return false;

        const isOpenNow = currentTime >= merchant.schedule.openTime &&
                          currentTime < merchant.schedule.closeTime;

        return isOpenNow;
    }

    // obtém nome traduzido do item pelo ID
    getItemName(itemId, fallbackName = '') {
        const translatedName = t(`itemNames.${itemId}`);
        // Se a tradução retornar a própria chave, usar o fallback
        if (translatedName === `itemNames.${itemId}`) {
            return fallbackName;
        }
        return translatedName || fallbackName;
    }

    // obtém profissão traduzida do mercador
    getMerchantProfession(merchant) {
        const key = `trading.professions.${merchant.professionKey}`;
        const translated = t(key);
        // Se a tradução retornar a própria chave, usar o fallback
        return translated === key ? merchant.professionKey : translated;
    }

    // obtém descrição traduzida do mercador
    getMerchantDescription(merchant) {
        const key = `trading.descriptions.${merchant.descriptionKey}`;
        const translated = t(key);
        // Se a tradução retornar a própria chave, usar o fallback
        return translated === key ? merchant.descriptionKey : translated;
    }

    // obtém especialidades traduzidas do mercador
    getMerchantSpecialties(merchant) {
        if (!merchant.specialtiesKeys) return [];
        return merchant.specialtiesKeys.map(specialtyKey => {
            const key = `trading.specialtiesLabels.${specialtyKey}`;
            const translated = t(key);
            // Se a tradução retornar a própria chave, usar o fallback
            return translated === key ? specialtyKey : translated;
        });
    }

    // obtém status legível do mercador
    getMerchantStatus(merchant) {
        if (!merchant.schedule) return t('trading.open');
        if (!WeatherSystem) return t('trading.statusUnknown');

        // Tax block vem antes do horário: senão o card renderiza fechado
        const bartolomeu = getSystem('npcBartolomeu');
        if (bartolomeu?.isMerchantBlocked?.(merchant.id)) {
            const taxBlockedKey = 'trading.taxBlocked';
            const txt = t(taxBlockedKey);
            return txt === taxBlockedKey ? t('trading.alreadyClosed', { time: '--:--' }) : txt;
    }

        const currentDayIndex = this.getCurrentDayIndex();
        const currentDayName = WeatherSystem.getWeekday(); // nome traduzido para exibição
        const currentTime = WeatherSystem.currentTime;

        const isOpenToday = merchant.schedule.daysOpen.includes(currentDayIndex);
        if (!isOpenToday) {
            const nextOpenDay = this.getNextOpenDay(merchant);
            const nextDayStr = nextOpenDay ? t('trading.reopens', { day: nextOpenDay }) : '';
            return t('trading.closedDayOff', { day: currentDayName, nextDay: nextDayStr });
        }

        const openHours = Math.floor(merchant.schedule.openTime / 60);
        const closeHours = Math.floor(merchant.schedule.closeTime / 60);
        const openStr = `${String(openHours).padStart(2, '0')}:00`;
        const closeStr = `${String(closeHours).padStart(2, '0')}:00`;

        if (currentTime < merchant.schedule.openTime) {
            return t('trading.notOpenYet', { time: openStr });
        } else if (currentTime >= merchant.schedule.closeTime) {
            return t('trading.alreadyClosed', { time: closeStr });
        } else {
            return t('trading.openUntil', { time: closeStr });
        }
    }

    // renderiza lista de mercadores
    renderMerchantsList() {
        const grid = document.getElementById('merchantsGrid');
        if (!grid) return;

        grid.replaceChildren();
        for (const merchant of this.merchants) {
            const isOpen = this.isMerchantOpen(merchant);
            const status = this.getMerchantStatus(merchant);
            const profession = this.getMerchantProfession(merchant);
            const specialties = this.getMerchantSpecialties(merchant);

            const card = document.createElement('div');
            card.className = `mch-merchant-card ${!isOpen ? 'mch-merchant-closed' : ''}`;
            card.dataset.merchantId = merchant.id;

            const cardHeader = document.createElement('div');
            cardHeader.className = 'mch-merchant-card-header';
            const avatar = document.createElement('img');
            avatar.src = merchant.avatar;
            avatar.alt = merchant.name;
            avatar.className = 'mch-merchant-card-avatar';
            const cardInfo = document.createElement('div');
            cardInfo.className = 'mch-merchant-card-info';
            const h3 = document.createElement('h3');
            h3.textContent = merchant.name;
            const profDiv = document.createElement('div');
            profDiv.className = 'mch-merchant-card-profession';
            profDiv.textContent = profession;
            cardInfo.append(h3, profDiv);
            cardHeader.append(avatar, cardInfo);

            const details = document.createElement('div');
            details.className = 'mch-merchant-card-details';
            const specDiv = document.createElement('div');
            const specStrong = document.createElement('strong');
            specStrong.textContent = `${t('trading.specialties')}:`;
            specDiv.append(specStrong, ` ${specialties.join(', ')}`);
            const statusDiv = document.createElement('div');
            statusDiv.className = `mch-merchant-status ${isOpen ? 'open' : 'closed'}`;
            statusDiv.dataset.merchantStatus = merchant.id;
            const statusStrong = document.createElement('strong');
            statusStrong.textContent = status;
            statusDiv.appendChild(statusStrong);
            details.append(specDiv, statusDiv);

            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'mch-merchant-card-items';
            // Issue #203: preview the first items of TODAY's rotating offer, not
            // the full catalog, so the card matches what's actually for sale.
            const offer = this.getDailyOffer(merchant);
            const previewItems = merchant.items.filter(it => offer.has(it.id));
            for (const item of previewItems.slice(0, 3)) {
                const tag = document.createElement('span');
                tag.className = 'mch-merchant-item-tag';
                tag.textContent = this.getItemName(item.id, item.name);
                itemsDiv.appendChild(tag);
            }

            card.append(cardHeader, details, itemsDiv);
            grid.appendChild(card);
        }

        grid.querySelectorAll('.mch-merchant-card').forEach(card => {
            const merchantId = card.dataset.merchantId;
            const merchant = this.merchants.find(m => m.id === merchantId);
            const isOpen = this.isMerchantOpen(merchant);

            if (isOpen) {
                card.addEventListener('click', () => {
                    this.openCommerceModal(merchantId);
                });
            } else {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showMessage(t('trading.isClosed', { name: merchant.name }));
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
                const strong = document.createElement('strong');
                strong.textContent = status;
                statusEl.replaceChildren(strong);

                const card = statusEl.closest('.mch-merchant-card');
                if (card) {
                    if (isOpen) {
                        card.classList.remove('mch-merchant-closed');
                    } else {
                        card.classList.add('mch-merchant-closed');
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

        this.closeAllModals();
        const modal = document.getElementById('commerceModal');
        if (modal) {
            modal.classList.add('active');
            this.renderCommerceModal();
            translateDOM();
        }
    }

    // verifica e fecha loja se mercador fechou
    checkAndCloseIfMerchantClosed() {
        if (!this.currentMerchant) return;

        const commerceModal = document.getElementById('commerceModal');
        if (!commerceModal || !commerceModal.classList.contains('active')) return;

        if (!this.isMerchantOpen(this.currentMerchant)) {
            this.closeAllModals();
            this.showMessage(t('trading.merchantClosed', { name: this.currentMerchant.name }));
            // fix: store reopen timer so destroy() can cancel it
            this._reopenTimer = setTimeout(() => {
                this._reopenTimer = null;
                this.openMerchantsList();
            }, 500);
        }
    }

    // update chamado pelo game loop
    update(deltaTime) {
        this._merchantCheckAcc += deltaTime;
        if (this._merchantCheckAcc >= this.merchantOpenCheckInterval) {
            this.checkAndCloseIfMerchantClosed();
            this._merchantCheckAcc = 0;
        }
    }

    // encontra próximo dia de funcionamento
    getNextOpenDay(merchant) {
        if (!merchant.schedule) return null;

        const currentDayIndex = this.getCurrentDayIndex();
        const daysOfWeek = t('time.weekdays');

        for (let i = 1; i <= 7; i++) {
            const nextIndex = (currentDayIndex + i) % 7;
            if (merchant.schedule.daysOpen.includes(nextIndex)) {
                // Retorna o nome traduzido do dia
                return Array.isArray(daysOfWeek) ? daysOfWeek[nextIndex] : null;
            }
        }

        return null;
    }

    // renderiza o modal de comércio
    renderCommerceModal() {
        this.updateCommerceBalance();
        this.updateMerchantFund(); // #201
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

    // Issue #201: show how much cash the current merchant has left to spend today.
    updateMerchantFund() {
        const el = document.getElementById('merchantFund');
        if (el && this.currentMerchant) {
            el.textContent = t('trading.merchantFund', {
                amount: this.getRemainingFund(this.currentMerchant)
            });
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
        if (profession) profession.textContent = this.getMerchantProfession(this.currentMerchant);
        if (specialty) specialty.textContent = this.getMerchantSpecialties(this.currentMerchant).join(', ');
    }

    // renderiza categorias do jogador
    renderPlayerCategories() {
        const container = document.getElementById('playerCategories');
        if (!container) return;

        const categories = this.getPlayerCategories();
        container.replaceChildren();
        for (const cat of categories) {
            const btn = document.createElement('button');
            btn.className = `mch-player-category-btn ${this.currentPlayerCategory === cat ? 'active' : ''}`;
            btn.dataset.category = cat;
            btn.textContent = `${this.getCategoryIcon(cat)} ${this.getCategoryName(cat)}`;
            container.appendChild(btn);
        }
    }

    // renderiza categorias do mercador
    renderMerchantCategories() {
        const container = document.getElementById('merchantCategories');
        if (!container) return;

        const categories = this.getMerchantCategories();
        container.replaceChildren();
        for (const cat of categories) {
            const btn = document.createElement('button');
            btn.className = `mch-merchant-category-btn ${this.currentMerchantCategory === cat ? 'active' : ''}`;
            btn.dataset.category = cat;
            btn.textContent = `${this.getCategoryIcon(cat)} ${this.getCategoryName(cat)}`;
            container.appendChild(btn);
        }
    }

    // renderiza itens do jogador
    renderPlayerItems() {
        const grid = document.getElementById('playerItemsGrid');
        if (!grid) return;

        const items = this.getPlayerItems();

        grid.replaceChildren();

        if (items.length === 0) {
            const emptySlot = document.createElement('div');
            emptySlot.className = 'mch-hexagon-slot empty';
            const emptyName = document.createElement('div');
            emptyName.className = 'mch-hexagon-name';
            emptyName.textContent = t('trading.empty');
            emptySlot.appendChild(emptyName);
            grid.appendChild(emptySlot);
            return;
        }

        for (const item of items) {
            const slot = document.createElement('div');
            slot.className = `mch-hexagon-slot ${this.selectedPlayerItem === item.id ? 'mch-item-selected' : ''}`;
            slot.dataset.itemId = item.id;
            const iconDiv = document.createElement('div');
            iconDiv.className = 'mch-hexagon-icon';
            const iconSrc = item.icon || getItem(item.id)?.icon || '';
            setItemIcon(iconDiv, iconSrc, item.name);
            const nameDiv = document.createElement('div');
            nameDiv.className = 'mch-hexagon-name';
            nameDiv.textContent = this.getItemName(item.id, item.name);
            const qtyDiv = document.createElement('div');
            qtyDiv.className = 'mch-hexagon-quantity';
            qtyDiv.textContent = item.quantity;
            slot.append(iconDiv, nameDiv, qtyDiv);
            grid.appendChild(slot);
        }
    }

    // renderiza itens do mercador
    renderMerchantItems() {
        const grid = document.getElementById('merchantItemsGrid');
        if (!grid) return;

        const merchantItems = this.getMerchantItems();
        grid.replaceChildren();
        for (const item of merchantItems) {
            const hex = document.createElement('div');
            // Issue #202: sold-out items (stock hit 0) render greyed out until
            // the daily restock.
            const soldOut = (item.quantity ?? 0) <= 0;
            hex.className = `mch-merchant-hexagon${this.selectedMerchantItem === item.id ? ' mch-item-selected' : ''}${soldOut ? ' mch-out-of-stock' : ''}`;
            hex.dataset.itemId = item.id;
            const iconDiv = document.createElement('div');
            iconDiv.className = 'mch-hexagon-icon';
            const iconSrc = item.icon || getItem(item.id)?.icon || '';
            setItemIcon(iconDiv, iconSrc, item.name);
            const nameDiv = document.createElement('div');
            nameDiv.className = 'mch-hexagon-name';
            nameDiv.textContent = this.getItemName(item.id, item.name);
            const priceDiv = document.createElement('div');
            priceDiv.className = 'mch-merchant-hexagon-price';
            priceDiv.textContent = `$${item.price}`;
            hex.append(iconDiv, nameDiv, priceDiv);
            grid.appendChild(hex);
        }
    }

    // categorias do jogador
    getPlayerCategories() {
        return ['all', 'tools', 'seeds', 'food', 'animal_food', 'construction', 'resources'];
    }

    // categorias do mercador (apenas as presentes na oferta do dia)
    getMerchantCategories() {
        const categories = new Set(['all']);
        const offer = this.getDailyOffer(this.currentMerchant);
        this.currentMerchant.items.forEach(item => {
            if (offer.has(item.id)) categories.add(item.category);
        });
        return Array.from(categories);
    }

    // Issue #203: deterministic per-day PRNG seeded by (merchantId, day).
    // Math.random isn't reproducible, so we seed a mulberry32 generator — the
    // same day always yields the same shuffle, which is what makes the offer
    // survive a reload without saving it.
    _offerRandom(merchantId, day) {
        let h = (2166136261 ^ day) >>> 0;
        for (let i = 0; i < merchantId.length; i++) {
            h = Math.imul(h ^ merchantId.charCodeAt(i), 16777619);
        }
        return function () {
            h = (h + 0x6D2B79F5) | 0;
            let t = Math.imul(h ^ (h >>> 15), 1 | h);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Issue #203: today's rotating subset of a merchant's catalog — a seeded
    // random pick of up to DAILY_OFFER_SIZE non-experimental items.
    computeDailyOffer(merchant, day) {
        const pool = merchant.items.filter(mi => !getItem(mi.id)?.experimental);
        const rand = this._offerRandom(merchant.id, day);
        // Seeded Fisher–Yates, then take the first N.
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return new Set(pool.slice(0, DAILY_OFFER_SIZE).map(it => it.id));
    }

    // Issue #203: cached daily offer for a merchant, keyed on the in-game day.
    // Recomputes (deterministically) whenever the day advances.
    getDailyOffer(merchant) {
        const day = WeatherSystem?.day ?? 1;
        if (this._offerDay !== day) {
            this._offerDay = day;
            this._dailyOffers.clear();
        }
        let offer = this._dailyOffers.get(merchant.id);
        if (!offer) {
            offer = this.computeDailyOffer(merchant, day);
            this._dailyOffers.set(merchant.id, offer);
        }
        return offer;
    }

    // Issue #201: deterministic cash a merchant brings on a given day — base
    // times a seeded daily factor. Uses an RNG stream salted differently from
    // the #203 offer so the fund and the offer don't correlate.
    dailyFund(merchant, day) {
        const base = MERCHANT_FUND_BASE[merchant.id] ?? DEFAULT_FUND_BASE;
        const rand = this._offerRandom(merchant.id + ':fund', day);
        const factor = FUND_FACTOR_MIN + rand() * (FUND_FACTOR_MAX - FUND_FACTOR_MIN);
        return Math.round(base * factor);
    }

    // Issue #201: clear the spent-today ledger when the in-game day advances.
    _syncFundDay() {
        const day = WeatherSystem?.day ?? 1;
        if (this._fundDay !== day) {
            this._fundDay = day;
            this._spentToday.clear();
        }
    }

    // Issue #201: cash the merchant still has to pay the player today.
    getRemainingFund(merchant) {
        this._syncFundDay();
        const spent = this._spentToday.get(merchant.id) ?? 0;
        return Math.max(0, this.dailyFund(merchant, this._fundDay) - spent);
    }

    // Issue #201: record a payout against today's fund (selling to the merchant).
    _debitFund(merchant, amount) {
        this._syncFundDay();
        this._spentToday.set(merchant.id, (this._spentToday.get(merchant.id) ?? 0) + amount);
    }

    // Issue #201: money the player spends buying flows into the merchant's till,
    // raising today's available fund. Modelled as a negative debit so the daily
    // ledger stays a single running net (payouts minus takings).
    _creditFund(merchant, amount) {
        this._debitFund(merchant, -amount);
    }

    // Issue #201: persist only today's payout ledger — the daily fund itself is
    // recomputed deterministically from the day, so it never needs saving.
    serialize() {
        this._syncFundDay();
        return { fundDay: this._fundDay, spentToday: Object.fromEntries(this._spentToday) };
    }

    restore(data) {
        // Always reset to a clean ledger, even when the save predates #201 (no
        // merchant field, data === undefined). Early-returning would leave a
        // stale in-session ledger from a previously loaded slot, skewing the
        // remaining fund. Keep the spend only if it belongs to the restored day;
        // otherwise the next _syncFundDay() clears it (fresh fund for a new day).
        const state = (data && typeof data === 'object') ? data : {};
        this._spentToday = new Map(Object.entries(state.spentToday || {}));
        this._fundDay = state.fundDay ?? null;
    }

    // obtém itens do jogador a partir do storage selecionado
    getPlayerItems() {
        let playerItems = [];
        const inventorySystem = getSystem('inventory');
        const storageSystem = getSystem('storage');

        if (this.playerStorage === 'inventory') {
            if (inventorySystem && inventorySystem.getInventory) {
                const inventory = inventorySystem.getInventory();
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
            if (storageSystem && storageSystem.storage) {
                const storage = storageSystem.storage;
                Object.keys(storage).forEach(category => {
                    if (storage[category]) {
                        storage[category].forEach(stack => {
                            const itemData = getItem(stack.itemId);
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
        // Issue #170: hide items marked experimental — they have no loop in
        // the game (no use, no consume), so letting players buy them would
        // be misleading. When a feature unlocks them, drop the flag.
        merchantItems = merchantItems.filter(mi => !getItem(mi.id)?.experimental);
        // Issue #203: only the items in today's rotating offer are for sale.
        const offer = this.getDailyOffer(this.currentMerchant);
        merchantItems = merchantItems.filter(mi => offer.has(mi.id));
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
            indicator.textContent = this.tradeMode === 'sell' ? t('trading.selling') : t('trading.buying');
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
        const textSpan = document.createElement('span');
        textSpan.className = 'mch-trade-button-text';
        textSpan.textContent = `${this.tradeMode === 'sell' ? t('trading.sell').toUpperCase() : t('trading.buy').toUpperCase()} x${this.tradeQuantity}`;
        const priceSpan = document.createElement('span');
        priceSpan.className = 'mch-trade-button-price';
        priceSpan.textContent = `$${totalValue}`;
        tradeButton.append(textSpan, priceSpan);

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
            this.showMessage(t('trading.buyMode'));
            return;
        }

        this.selectedPlayerItem = itemId;
        this.selectedMerchantItem = null;
        this.tradeQuantity = 1;

        const item = this.getPlayerItems().find(i => i.id === itemId);
        if (item) {
            const originalItem = getItem(itemId);
            if (originalItem) {
                this.tradeValue = this.sellUnitPrice(itemId); // includes profession bonus (#200)
                this.updateTradeValue();
                this.renderTradeButton();
                this.showMessage(t('trading.selected', {
                    name: this.getItemName(item.id, item.name),
                    qty: item.quantity,
                    action: t('trading.sell'),
                    price: this.tradeValue
                }));
            }
        }

        this.renderPlayerItems();
        this.renderMerchantItems();
    }

    // seleciona item do mercador
    selectMerchantItem(itemId) {
        if (this.tradeMode === 'sell') {
            this.showMessage(t('trading.sellMode'));
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
            this.showMessage(t('trading.selected', {
                name: this.getItemName(item.id, item.name),
                qty: 1,
                action: t('trading.buy'),
                price: item.price
            }));
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

        const expectedPrice = this.calculateExpectedPrice();
        if (expectedPrice === null) {
            this.showMessage('Erro ao calcular preço', 'error');
            return;
        }
        const totalValue = expectedPrice * this.tradeQuantity;

        let itemName = '';
        if (this.tradeMode === 'sell') {
            const item = this.getPlayerItems().find(i => i.id === this.selectedPlayerItem);
            itemName = item ? this.getItemName(item.id, item.name) : 'item';
            messageEl.textContent = t('trading.confirmSell', {qty: this.tradeQuantity, name: itemName, value: totalValue});
        } else {
            const item = this.getMerchantItems().find(i => i.id === this.selectedMerchantItem);
            itemName = item ? this.getItemName(item.id, item.name) : 'item';
            messageEl.textContent = t('trading.confirmBuy', {qty: this.tradeQuantity, name: itemName, value: totalValue});
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
        // Validar tradeMode
        if (!['buy', 'sell'].includes(this.tradeMode)) {
            logger.error('[Merchant] Invalid trade mode:', this.tradeMode);
            this.showMessage('Modo de transação inválido', 'error');
            this.hideConfirmModal();
            return;
        }

        // Validar tradeQuantity
        if (!isValidPositiveInteger(this.tradeQuantity)) {
            logger.error('[Merchant] Invalid quantity:', this.tradeQuantity);
            this.showMessage('Quantidade inválida', 'error');
            this.hideConfirmModal();
            return;
        }

        this.hideConfirmModal();

        const expectedPrice = this.calculateExpectedPrice();
        if (expectedPrice === null) {
            logger.error('[Merchant] Invalid price calculation');
            this.showMessage('Erro no cálculo de preço', 'error');
            return;
        }

        const totalValue = expectedPrice * this.tradeQuantity;

        if (this.tradeMode === 'sell') {
            this.processSell(totalValue);
        } else {
            this.processBuy(totalValue);
        }
    }

    // Issue #200: sell price modifier for an item sold to the CURRENT merchant:
    // a positive bonus within the merchant's specialty, a negative penalty
    // outside it.
    professionModifier(itemId) {
        const merchantId = this.currentMerchant?.id;
        const item = getItem(itemId);
        if (!merchantId || !item) return 0;
        const category = mapTypeToCategory(item.type);
        const bonus = PROFESSION_BUY_BONUS[merchantId]?.[category];
        return bonus ?? -OUT_OF_SPECIALTY_PENALTY;
    }

    // Issue #200: unit sell price to the current merchant, including the
    // profession modifier. Single source of truth for both display and the
    // actual transaction, so they always match. Floored at 1 so the penalty
    // never drives a sale to $0.
    sellUnitPrice(itemId) {
        return Math.max(1, Math.floor(getSellPrice(itemId) * (1 + this.professionModifier(itemId))));
    }

    // Issue #202: when the player sells an item the current merchant already
    // stocks, it goes back onto the merchant's shelf. Returns true if the
    // stock changed (item not stocked → no-op).
    returnStockToMerchant(itemId, qty) {
        const stockItem = this.currentMerchant?.items?.find(i => i.id === itemId);
        if (!stockItem || !(qty > 0)) return false;
        stockItem.quantity += qty;
        return true;
    }

    calculateExpectedPrice() {
        if (this.tradeMode === 'sell') {
            if (!this.selectedPlayerItem) return null;
            const itemData = getItem(this.selectedPlayerItem);
            if (!itemData) return null;
            return this.sellUnitPrice(this.selectedPlayerItem);
        } else {
            if (!this.selectedMerchantItem) return null;
            const merchantItem = this.getMerchantItems().find(i => i.id === this.selectedMerchantItem);
            if (!merchantItem) return null;
            return merchantItem.price;
        }
    }

    // cancela transação
    cancelTrade() {
        this.hideConfirmModal();
    }

    // processa venda
    processSell(totalValue) {
        if (!this.selectedPlayerItem) return;
        const inventorySystem = getSystem('inventory');

        // Validar que o item existe no inventário do jogador
        const playerItem = this.getPlayerItems().find(i => i.id === this.selectedPlayerItem);
        if (!playerItem) {
            this.showMessage('Item não encontrado no inventário', 'error');
            return;
        }

        // Validar quantidade disponível
        const validation = validateTradeInput(this.tradeQuantity, playerItem.quantity);
        if (!validation.valid) {
            this.showMessage(validation.error, 'error');
            return;
        }

        // Validar valor da transação
        if (!isValidPositiveNumber(totalValue)) {
            logger.error('[Merchant] Invalid sell value:', totalValue);
            this.showMessage('Valor de venda inválido', 'error');
            return;
        }

        // Issue #201: the merchant pays out of a finite daily fund. Block the
        // sale (and show what's left) if it would exceed today's remaining cash.
        const remainingFund = this.getRemainingFund(this.currentMerchant);
        if (totalValue > remainingFund) {
            this.showMessage(t('trading.merchantNoFunds', { amount: remainingFund }), 'error');
            return;
        }

        if (this.playerStorage === 'inventory') {
            if (inventorySystem && inventorySystem.removeItem) {
                if (inventorySystem.removeItem(this.selectedPlayerItem, this.tradeQuantity)) {

                    // Adiciona o valor da venda ao dinheiro do jogador
                    if (typeof currencyManager.earn === 'function') {
                        currencyManager.earn(totalValue, "Venda ao Mercador");
                    } else {
                        logger.error("Erro: método earn() não encontrado no currencyManager");
                    }

                    // Issue #201: debit the merchant's daily fund by what it paid.
                    this._debitFund(this.currentMerchant, totalValue);

                    // Issue #202: selling back an item the merchant stocks returns
                    // it to their shelf (buy all apples → sell some back → they have
                    // apples again).
                    if (this.returnStockToMerchant(this.selectedPlayerItem, this.tradeQuantity)) {
                        this.renderMerchantItems();
                    }

                    this.showMessage(t('trading.saleSuccess', { value: totalValue }), 'success');
                    this.updateBalances();
                    this.updateMerchantFund(); // #201: reflect the debited fund
                    this.renderPlayerItems();
                    this.clearSelections();
                } else {
                    this.showMessage(t('trading.removeError'), 'error');
                }
            }
        } else {
            // Lógica para vender do armazém (implementar no storageSystem se necessário)
            this.showMessage(t('trading.storageNotImplemented'), 'error');
        }
    }

    // processa compra
    processBuy(totalValue) {
        if (!this.selectedMerchantItem) return;
        const inventorySystem = getSystem('inventory');

        if (currencyManager.getMoney() < totalValue) {
            this.showMessage(t('trading.notEnoughMoney'), 'error');
            return;
        }

        // Validar que o item existe no estoque do mercador
        const merchantItem = this.getMerchantItems().find(i => i.id === this.selectedMerchantItem);
        if (!merchantItem) {
            this.showMessage(t('trading.itemNotFound'), 'error');
            return;
        }

        // Validar quantidade disponível no estoque do mercador
        const validation = validateTradeInput(this.tradeQuantity, merchantItem.quantity);
        if (!validation.valid) {
            this.showMessage(validation.error, 'error');
            return;
        }

        // Validar valor da transação
        if (!isValidPositiveNumber(totalValue)) {
            logger.error('[Merchant] Invalid buy value:', totalValue);
            this.showMessage(t('trading.invalidBuyValue'), 'error');
            return;
        }

        if (this.playerStorage === 'inventory') {
            if (inventorySystem && inventorySystem.acquireItem) {
                // #NNN: a full inventory routes the purchase to the warehouse
                // instead of blocking the buy (acquireItem shows the notice).
                if (inventorySystem.acquireItem(this.selectedMerchantItem, this.tradeQuantity)) {

                    // Deduz o valor da compra do dinheiro do jogador
                    if (typeof currencyManager.spend === 'function') {
                        currencyManager.spend(totalValue, "Compra do Mercador");
                    } else {
                        logger.error("Erro: método spend() não encontrado no currencyManager");
                    }

                    // Issue #202: decrement merchant stock so the purchase actually
                    // reduces availability and persists until the daily restock.
                    merchantItem.quantity -= this.tradeQuantity;

                    // Issue #201: money the player pays goes into the merchant's
                    // till, so buying raises today's fund (and what they can pay
                    // you back when you sell).
                    this._creditFund(this.currentMerchant, totalValue);

                    this.showMessage(t('trading.purchaseSuccess', { value: totalValue }), 'success');
                    this.updateBalances();
                    this.updateMerchantFund(); // #201: reflect the credited fund
                    this.renderPlayerItems();
                    this.renderMerchantItems();
                    this.clearSelections();
                } else {
                    this.showMessage(t('trading.inventoryFull'), 'error');
                }
            }
        } else {
             this.showMessage(t('trading.storageNotImplemented'), 'error');
        }
    }

    // atualiza saldos na UI
    updateBalances() {
        this.updateCommerceBalance();
        const playerHUD = getSystem('hud');
        if (playerHUD && playerHUD.updateMoney) {
            playerHUD.updateMoney();
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
        return t(`categories.${category}`) || category;
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

        // fix: clear pending timers to prevent post-destroy callbacks
        clearTimeout(this._setupRetryTimer);
        this._setupRetryTimer = null;
        clearTimeout(this._reopenTimer);
        this._reopenTimer = null;

        // Reset listeners flag para permitir re-setup
        this.listenersSetup = false;

        // Clear handler reference
        this.storeBtnHandler = null;

        // Clear referências
        this.currentMerchant = null;
        this.selectedPlayerItem = null;
        this.selectedMerchantItem = null;

        logger.debug('MerchantSystem destruído');
    }
}

export const merchantSystem = new MerchantSystem();
registerSystem('merchant', merchantSystem);