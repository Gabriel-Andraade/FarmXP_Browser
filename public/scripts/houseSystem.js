/**
 * @file houseSystem.js - Sistema de interação com a casa do jogador
 * @description Gerencia todas as funcionalidades da casa do jogador incluindo:
 * - Detecção de proximidade com a porta
 * - Menu de opções da casa (dormir, crafting, armazém, customização)
 * - Interface de armazenamento com depósito/retirada de itens
 * - Integração com sistemas de clima, crafting e storage
 * @module HouseSystem
 */

import { collisionSystem } from './collisionSystem.js';
import { storageSystem } from './storageSystem.js';
import { camera, CAMERA_ZOOM } from './thePlayer/cameraSystem.js';
import { WeatherSystem } from './weather.js';
import { getItem, setItemIcon } from './itemUtils.js';
import { searchTokens, matchesSearch } from './searchMatch.js';
import { craftingSystem } from './craftingSystem.js';
import { t } from './i18n/i18n.js';
import { registerSystem, getObject, getSystem } from './gameState.js';
import { logger } from './logger.js';

/**
 * Sum stack quantities by itemId. Single source of truth for the warehouse's
 * "collapse N stacks of the same item into one total" logic.
 * @param {Array<{itemId:number, quantity:number}>} stacks
 * @returns {Map<number, number>} itemId → total quantity
 */
function sumStacksByItem(stacks) {
    const acc = new Map();
    for (const s of stacks) acc.set(s.itemId, (acc.get(s.itemId) || 0) + (s.quantity || 0));
    return acc;
}

/**
 * Sistema de interação com a casa do jogador
 * Gerencia menu da casa, armazenamento e funcionalidades domésticas
 * @class HouseSystem
 */
export class HouseSystem {
    constructor() {
        this.houseInteractionHitbox = null;
        this.isMenuOpen = false;
        this.isPlayerNearDoor = false;

        // fix: track setup retry timer and keydown handler for cleanup in destroy()
        this._setupRetryTimer = null;
        this._onKeyDown = null;

        this._injectHouseAndStorageStyles();
        this.storageQtySelection = new Map();
        this.setupHouseInteraction();
        this.setupEventListeners();
        this.setupProximityCheck();
    }

    /**
     * Verifica se os estilos CSS estão carregados
     * CSS carregado externamente via style/house.css e style/storage.css
     * @deprecated CSS agora é carregado externamente
     */
    _injectHouseAndStorageStyles() {
        // CSS movido para style/house.css e style/storage.css - incluir no index.html
        // Este método é mantido para compatibilidade, mas não injeta mais estilos
    }

    setupProximityCheck() {
        this.proximityCheckInterval = setInterval(() => {
            this.checkPlayerProximity();
        }, 100);
    }

    checkPlayerProximity() {
        const currentPlayer = getObject('currentPlayer');
        if (!this.houseInteractionHitbox || !currentPlayer) {
            this.isPlayerNearDoor = false;
            this.hideDoorHint();
            return;
        }

        const playerHitbox = collisionSystem.createPlayerHitbox(
            currentPlayer.x,
            currentPlayer.y,
            currentPlayer.width,
            currentPlayer.height
        );

        const wasNear = this.isPlayerNearDoor;
        this.isPlayerNearDoor = collisionSystem.checkCollision(playerHitbox, this.houseInteractionHitbox);

        // Sync isMenuOpen with DOM (handles external removal by HUD closeModals etc.)
        if (this.isMenuOpen) {
            const modal = document.querySelector('.hse-house-modal');
            if (!modal || !modal.classList.contains('active')) {
                this.isMenuOpen = false;
                if (modal) modal.remove();
            }
        }

        // Player walked away → close menu and hint
        if (!this.isPlayerNearDoor && wasNear) {
            this.hideDoorHint();
            if (this.isMenuOpen) this.closeHouseMenu();
        }

        // Player is near and menu is closed → show hint
        if (this.isPlayerNearDoor && !this.isMenuOpen && !document.getElementById('doorHint')) {
            this.showDoorHint();
        }
    }

    showDoorHint() {
        this.hideDoorHint();

        // fix: innerHTML → DOM API
        const hint = document.createElement('div');
        hint.className = 'door-hint active';
        const hintContent = document.createElement('div');
        hintContent.className = 'hint-content';
        const hintText = document.createElement('span');
        hintText.className = 'hint-text';
        hintText.textContent = t('help.doorHint');
        hintContent.appendChild(hintText);
        hint.appendChild(hintContent);
        hint.id = 'doorHint';
        document.body.appendChild(hint);
    }

    hideDoorHint() {
        const existingHint = document.getElementById('doorHint');
        if (existingHint) existingHint.remove();
    }

    setupHouseInteraction() {
        const houseWalls = this.findHouseWalls();

        if (!houseWalls) {
            // fix: store retry timer so destroy() can cancel it
            this._setupRetryTimer = setTimeout(() => {
                this._setupRetryTimer = null;
                this.setupHouseInteraction();
            }, 2000);
            return;
        }

        this.createDoorHitbox(houseWalls);
    }

    /**
     * Re-registers the house door interaction hitbox after a map transition
     * cleared `collisionSystem.interactionHitboxes`. Idempotent — safe to call
     * multiple times.
     */
    reregisterDoorHitbox() {
        const houseWalls = this.findHouseWalls();
        if (!houseWalls) {
            // House walls themselves not yet restored — try again shortly.
            clearTimeout(this._setupRetryTimer);
            this._setupRetryTimer = setTimeout(() => {
                this._setupRetryTimer = null;
                this.reregisterDoorHitbox();
            }, 500);
            return;
        }
        this.createDoorHitbox(houseWalls);
        logger.info('[HouseSystem] House door interaction hitbox re-registered');
    }

    findHouseWalls() {
        for (const [, hitbox] of collisionSystem.hitboxes) {
            if (hitbox.type === 'HOUSE_WALLS') return hitbox;
        }
        return null;
    }

    createDoorHitbox(houseWalls) {
        const doorWidth = 52;
        const doorHeight = 80;

        this.houseInteractionHitbox = {
            id: 'house_door_interaction',
            type: 'HOUSE_DOOR',
            x: houseWalls.x + (houseWalls.width - doorWidth) / 6 + 130,
            y: houseWalls.y + (houseWalls.height - doorHeight) / 3 + 8,
            width: doorWidth,
            height: doorHeight,
            originalType: 'house'
        };

        collisionSystem.interactionHitboxes.set(
            this.houseInteractionHitbox.id,
            this.houseInteractionHitbox
        );
    }

    setupEventListeners() {
        // fix: store named handler so destroy() can remove it
        this._onKeyDown = (e) => {
            if (e.key === 'Escape' && (this.isMenuOpen || document.querySelector('.storage-modal'))) {
                if (document.querySelector('.storage-modal')) this.closeStorageModal();
                else this.closeHouseMenu();
            } else if (!e.repeat && (e.key === 'e' || e.key === 'E') && this.isPlayerNearDoor) {
                // Toggle: open/close like inventory (ignora key-repeat senão abre/fecha ao segurar)
                if (this.isMenuOpen) {
                    this.closeHouseMenu();
                } else {
                    this.openHouseMenu();
                }
            }
        };
        document.addEventListener('keydown', this._onKeyDown);
    }

    // fix: renamed cleanup() to destroy() for gameCleanup auto-discovery,
    // and added removal of keydown listener + pending timer
    destroy() {
        if (this.proximityCheckInterval) {
            clearInterval(this.proximityCheckInterval);
            this.proximityCheckInterval = null;
        }

        clearTimeout(this._setupRetryTimer);
        this._setupRetryTimer = null;

        if (this._onKeyDown) {
            document.removeEventListener('keydown', this._onKeyDown);
            this._onKeyDown = null;
        }

        // fix: remove stale hitbox from collision system
        if (this.houseInteractionHitbox) {
            collisionSystem.interactionHitboxes.delete(this.houseInteractionHitbox.id);
            this.houseInteractionHitbox = null;
        }

        this.closeStorageModal();
        this.closeHouseMenu();
        this.hideDoorHint();

        logger.debug('HouseSystem destruído');
    }

    openHouseMenu() {
        this.isMenuOpen = true;
        this.hideDoorHint();
        this.createHouseMenu();
    }

    // fix: innerHTML → DOM API
    createHouseMenu() {
        // Remove old modal if any (without resetting isMenuOpen)
        const oldModal = document.querySelector('.hse-house-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal hse-house-modal active';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content house-modal-content';

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const h2 = document.createElement('h2');
        h2.textContent = t('house.title');
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.textContent = '\u00D7';
        modalHeader.append(h2, closeBtn);

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'hse-house-options';
        const actions = [
            { action: 'enter', text: t('house.enter') },
            { action: 'sleep', text: t('house.sleep') },
            { action: 'crafting', text: t('house.crafting') },
            { action: 'storage', text: t('house.storage') },
            { action: 'customize', text: t('house.customize') },
            { action: 'save', text: `💾 ${t('house.saveGame')}` },
            { action: 'load', text: `📂 ${t('house.loadGame')}` },
        ];

        // Show tax payment button if tax is pending
        const bartolomeu = getSystem('npcBartolomeu');
        if (bartolomeu && bartolomeu.isTaxPending && bartolomeu.isTaxPending()) {
            const taxAmount = bartolomeu.calculateTax();
            actions.push({
                action: 'payTax',
                text: `📜 ${t('npc.bartolomeu.tax.noteTitle')} — ${taxAmount} 🪙`,
            });
        }
        for (const act of actions) {
            const btn = document.createElement('button');
            btn.className = 'hse-house-option';
            btn.dataset.action = act.action;
            const span = document.createElement('span');
            span.className = 'hse-option-text';
            span.textContent = act.text;
            btn.appendChild(span);
            optionsDiv.appendChild(btn);
        }

        const footer = document.createElement('div');
        footer.className = 'hse-house-footer';
        const closeFooterBtn = document.createElement('button');
        closeFooterBtn.className = 'hse-house-close-btn';
        closeFooterBtn.textContent = t('house.close');
        footer.appendChild(closeFooterBtn);

        modalContent.append(modalHeader, optionsDiv, footer);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);

        closeBtn.addEventListener('click', () => this.closeHouseMenu());
        closeFooterBtn.addEventListener('click', () => this.closeHouseMenu());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeHouseMenu();
        });

        modal.querySelectorAll('.hse-house-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleHouseAction(action);
            });
        });
    }

    handleHouseAction(action) {
        switch (action) {
            case 'enter':
                this.enterHouse();
                break;
            case 'sleep':
                this.sleep();
                break;
            case 'crafting':
                this.openCrafting();
                break;
            case 'storage':
                this.openStorage();
                break;
            case 'customize':
                this.openCustomize();
                break;
            case 'save':
                this.openSaveMenu();
                break;
            case 'load':
                this.openLoadMenu();
                break;
            case 'payTax': {
                const bart = getSystem('npcBartolomeu');
                if (bart && bart.payTax) {
                    bart.payTax();
                    this.closeHouseMenu();
                }
                break;
            }
        }
    }

    enterHouse() {
        this.showMessage(t('house.entering'));
    }

    sleep() {
        this.closeHouseMenu();
        if (WeatherSystem && typeof WeatherSystem.sleep === 'function') {
            WeatherSystem.sleep();
        }
    }

    openCrafting() {
        this.closeHouseMenu();
        const cs = craftingSystem || getSystem('crafting');

        if (cs && typeof cs.open === 'function') {
            cs.open();
        } else {
            this.showMessage(t('house.craftingNotAvailable'));
        }
    }

    openStorage() {
        this.showStorageModal();
    }

    openCustomize() {
        this.closeHouseMenu();
        this.showMessage(t('house.customizeNotImplemented'));
    }

    async openSaveMenu() {
        this.closeHouseMenu();
        try {
            const { saveSlotsUI } = await import('./saveSlotsUI.js');
            saveSlotsUI.open('save');
        } catch (e) {
            logger.error('HouseSystem:openSaveMenu', e);
            this.showMessage(t('house.saveNotAvailable'));
        }
    }

    async openLoadMenu() {
        this.closeHouseMenu();
        try {
            const { saveSlotsUI } = await import('./saveSlotsUI.js');
            saveSlotsUI.open('load');
        } catch (e) {
            logger.error('HouseSystem:openLoadMenu', e);
            this.showMessage(t('house.saveNotAvailable'));
        }
    }

    // fix: innerHTML → DOM API
    showStorageModal() {
        this.closeHouseMenu();

        const modal = document.createElement('div');
        modal.className = 'modal storage-modal active';
        const storageContent = document.createElement('div');
        storageContent.className = 'modal-content storage-modal-content';

        const storageHeader = document.createElement('div');
        storageHeader.className = 'modal-header';
        const storageH2 = document.createElement('h2');
        storageH2.textContent = t('storage.title');
        const storageCloseBtn = document.createElement('button');
        storageCloseBtn.className = 'modal-close';
        storageCloseBtn.textContent = '\u00D7';
        storageHeader.append(storageH2, storageCloseBtn);

        const tabsDiv = document.createElement('div');
        tabsDiv.className = 'storage-tabs';
        const withdrawTab = document.createElement('button');
        withdrawTab.className = 'storage-tab active';
        withdrawTab.dataset.tab = 'withdraw';
        withdrawTab.textContent = t('storage.withdraw');
        const depositTab = document.createElement('button');
        depositTab.className = 'storage-tab';
        depositTab.dataset.tab = 'deposit';
        depositTab.textContent = t('storage.deposit');
        tabsDiv.append(withdrawTab, depositTab);

        const statsDiv = document.createElement('div');
        statsDiv.className = 'storage-stats';
        statsDiv.id = 'storageStats';

        const categoriesDiv = document.createElement('div');
        categoriesDiv.className = 'storage-categories';
        for (const [key, category] of Object.entries(storageSystem.categories)) {
            const catBtn = document.createElement('button');
            catBtn.className = 'storage-category-btn';
            catBtn.dataset.category = key;
            const iconSpan = document.createElement('span');
            iconSpan.className = 'category-icon';
            iconSpan.textContent = category.icon || '';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'category-name';
            nameSpan.textContent = category.name;
            catBtn.append(iconSpan, nameSpan);
            categoriesDiv.appendChild(catBtn);
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'storage-content';
        contentDiv.id = 'storageContent';

        const storageFooter = document.createElement('div');
        storageFooter.className = 'storage-footer';
        const closeFooterBtn = document.createElement('button');
        closeFooterBtn.className = 'storage-close-btn';
        closeFooterBtn.textContent = t('ui.close');
        storageFooter.appendChild(closeFooterBtn);

        // Search (lupa): filters the visible items by name. Lives outside
        // #storageContent so it keeps focus across grid re-renders.
        const searchDiv = document.createElement('div');
        searchDiv.className = 'storage-search';
        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.className = 'storage-search-input';
        searchInput.placeholder = `🔍 ${t('storage.search')}`;
        searchInput.value = this.storageSearch || '';
        searchInput.addEventListener('input', () => {
            this.storageSearch = searchInput.value;
            const cat = modal.querySelector('.storage-category-btn.active')?.dataset.category || 'tools';
            const tab = modal.querySelector('.storage-tab.active')?.dataset.tab || 'withdraw';
            this.renderStorageCategory(cat, tab);
        });
        searchDiv.appendChild(searchInput);

        storageContent.append(storageHeader, tabsDiv, statsDiv, categoriesDiv, searchDiv, contentDiv, storageFooter);
        modal.appendChild(storageContent);

        document.body.appendChild(modal);

        this.renderStorageStats();
        this.renderStorageCategory('tools', 'withdraw');

        storageCloseBtn.addEventListener('click', () => this.closeStorageModal());
        closeFooterBtn.addEventListener('click', () => this.closeStorageModal());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeStorageModal();
        });

        // Keep keystrokes typed into the warehouse's fields (search, quantity)
        // from leaking to the game's global key handlers (move, open inventory/
        // map, close, etc.). Those listen on document in the bubble phase, so
        // stopping propagation here (an ancestor) before it reaches document is
        // enough — covers the search box and every quantity input.
        const stopFieldKeys = (e) => {
            const tg = e.target;
            if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) {
                e.stopPropagation();
            }
        };
        modal.addEventListener('keydown', stopFieldKeys);
        modal.addEventListener('keyup', stopFieldKeys);
        modal.addEventListener('keypress', stopFieldKeys);

        modal.querySelectorAll('.storage-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.storage-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const currentCategory = modal.querySelector('.storage-category-btn.active')?.dataset.category || 'tools';
                this.renderStorageCategory(currentCategory, tab.dataset.tab);
            });
        });

        modal.querySelectorAll('.storage-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.storage-category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const currentTab = modal.querySelector('.storage-tab.active')?.dataset.tab || 'withdraw';
                this.renderStorageCategory(btn.dataset.category, currentTab);
            });
        });

        const firstCategoryBtn = modal.querySelector('.storage-category-btn');
        if (firstCategoryBtn) firstCategoryBtn.classList.add('active');
    }

    renderStorageStats() {
        const el = document.getElementById('storageStats');
        if (!el) return;

        const info = (storageSystem && typeof storageSystem.getStorageInfo === 'function')
            ? storageSystem.getStorageInfo()
            : { totalItems: 0, totalValue: 0 };

        // fix: innerHTML → DOM API
        el.replaceChildren();
        const statRow = document.createElement('div');
        statRow.className = 'stat-row';
        const stats = [
            { label: t('storage.items'), value: info.totalItems || 0 },
            { label: t('storage.value'), value: info.totalValue || 0 },
        ];
        for (const s of stats) {
            const item = document.createElement('div');
            item.className = 'stat-item';
            const label = document.createElement('div');
            label.className = 'stat-label';
            label.textContent = s.label;
            const val = document.createElement('div');
            val.className = 'stat-value';
            val.textContent = s.value;
            item.append(label, val);
            statRow.appendChild(item);
        }
        el.appendChild(statRow);
    }

    renderStorageCategory(categoryKey, mode) {
        const content = document.getElementById('storageContent');
        if (!content) return;

        const category = storageSystem.categories?.[categoryKey];
        const stacksRaw = Array.isArray(storageSystem.storage?.[categoryKey]) ? storageSystem.storage[categoryKey] : [];

        const maxStacks = category?.maxStacks ?? 0;
        const usedStacks = stacksRaw.length;
        const title = category?.name || categoryKey;

        // fix: innerHTML → DOM API
        content.replaceChildren();
        const catInfo = document.createElement('div');
        catInfo.className = 'category-info';
        const catH3 = document.createElement('h3');
        catH3.textContent = title;
        const catStats = document.createElement('div');
        catStats.className = 'category-stats';
        const stacksSpan = document.createElement('span');
        stacksSpan.textContent = `${t('storage.stacks')}: ${usedStacks}/${maxStacks}`;
        const modeSpan = document.createElement('span');
        modeSpan.textContent = `${t('storage.mode')}: ${mode === 'deposit' ? t('storage.depositMode') : t('storage.withdrawMode')}`;
        catStats.append(stacksSpan, modeSpan);
        catInfo.append(catH3, catStats);
        const grid = document.createElement('div');
        grid.className = 'storage-grid';
        grid.id = 'storageGrid';
        content.append(catInfo, grid);

        // Current category's items (used for the value + the no-search view).
        const currentList = (mode === 'deposit')
            ? this._getInventoryStacksForStorageCategory(categoryKey)
            : Array.from(sumStacksByItem(stacksRaw).entries()).map(([itemId, quantity]) => ({
                itemId,
                quantity,
                sourceCategory: categoryKey // Para withdraw, a categoria é a do storage
            }));

        // Per-category value — always reflects the current category/tab.
        const catValue = currentList.reduce((sum, s) => sum + (getItem(s.itemId)?.price || 0) * (s.quantity || 0), 0);
        const valueSpan = document.createElement('span');
        valueSpan.textContent = `${t('storage.value')}: ${catValue}`;
        catStats.appendChild(valueSpan);

        // Search (lupa): word-prefix, accent/case-insensitive. When there's a
        // query, surface matches across ALL categories (so an item sitting in
        // another category isn't hidden); otherwise show the current category.
        const tokens = searchTokens(this.storageSearch);
        let filtered;
        if (tokens.length) {
            const all = (mode === 'deposit') ? this._allInventoryStacks() : this._allStorageStacks();
            filtered = all.filter(s => matchesSearch(getItem(s.itemId)?.name || '', tokens));
            catH3.textContent = t('storage.searchResults');
        } else {
            filtered = currentList;
        }

        if (!filtered.length) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-storage';
            emptyDiv.textContent = tokens.length ? t('storage.noResults') : t('storage.emptyCategory');
            grid.appendChild(emptyDiv);
            return;
        }

        const getKey = (itemId, sourceCat) => `${mode}:${categoryKey}:${sourceCat || 'null'}:${itemId}`;

        for (const s of filtered) {
            const data = getItem(s.itemId);
            const icon = data?.icon || '';
            const name = data?.name || `item ${s.itemId}`;
            const qty = s.quantity || 0;

            const key = getKey(s.itemId, s.sourceCategory);
            const saved = this.storageQtySelection.get(key) || 1;
            const selected = Math.max(1, Math.min(saved, qty));

            const btnClass = mode === 'deposit' ? 'deposit-btn' : 'withdraw-btn';
            const btnText = mode === 'deposit' ? t('storage.depositBtn', { qty: selected }) : t('storage.withdrawBtn', { qty: selected });

            const slot = document.createElement('div');
            slot.className = 'storage-slot';
            slot.dataset.itemid = s.itemId;
            slot.dataset.sourcecat = s.sourceCategory || '';
            slot.dataset.max = qty;
            slot.dataset.key = key;

            const slotHeader = document.createElement('div');
            slotHeader.className = 'slot-header';
            const iconDiv = document.createElement('div');
            iconDiv.className = 'item-icon';
            setItemIcon(iconDiv, icon, name);
            const qtyDiv = document.createElement('div');
            qtyDiv.className = 'item-quantity';
            qtyDiv.textContent = `${qty}x`;
            slotHeader.append(iconDiv, qtyDiv);

            const nameDiv = document.createElement('div');
            nameDiv.className = 'item-name';
            nameDiv.textContent = name;

            // Batch presets (5/10/100/All) + a manual field. setQty clamps to
            // the available amount; the manual field allows typing over the max
            // and clamps on commit/action (e.g. 7 → 6).
            const qtyControls = document.createElement('div');
            qtyControls.className = 'qty-controls';
            for (const preset of ['5', '10', '100']) {
                const b = document.createElement('button');
                b.className = 'qty-btn qty-preset';
                b.dataset.preset = preset;
                b.textContent = preset;
                qtyControls.appendChild(b);
            }
            const allBtn = document.createElement('button');
            allBtn.className = 'qty-btn qty-preset qty-all';
            allBtn.dataset.preset = 'all';
            allBtn.textContent = t('storage.all');
            qtyControls.appendChild(allBtn);
            const qtyInput = document.createElement('input');
            qtyInput.type = 'number';
            qtyInput.className = 'qty-input';
            qtyInput.min = '1';
            qtyInput.max = String(qty);
            qtyInput.value = String(selected);
            qtyControls.appendChild(qtyInput);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'item-actions';
            const actionBtn = document.createElement('button');
            actionBtn.className = btnClass;
            actionBtn.textContent = btnText;
            actionsDiv.appendChild(actionBtn);

            slot.append(slotHeader, nameDiv, qtyControls, actionsDiv);
            grid.appendChild(slot);
        }

        grid.querySelectorAll('.storage-slot').forEach(slot => {
            const itemId = Number(slot.getAttribute('data-itemid'));
            const sourceCat = slot.getAttribute('data-sourcecat') || '';
            const max = Number(slot.getAttribute('data-max')) || 1;
            const key = slot.getAttribute('data-key') || '';
            
            if (!itemId || !key) return;

            const inputEl = slot.querySelector('.qty-input');

            // Set + clamp the selection, reflecting it in the field and button.
            const setQty = (v) => {
                const clamped = Math.max(1, Math.min(Math.floor(Number(v) || 1), max));
                this.storageQtySelection.set(key, clamped);
                if (inputEl) inputEl.value = String(clamped);
                const actionBtn = slot.querySelector('.deposit-btn, .withdraw-btn');
                if (actionBtn) actionBtn.textContent = mode === 'deposit'
                    ? t('storage.depositBtn', { qty: clamped })
                    : t('storage.withdrawBtn', { qty: clamped });
            };

            const action = slot.querySelector('.deposit-btn, .withdraw-btn');

            setQty(this.storageQtySelection.get(key) || 1);

            // Batch presets: 5 / 10 / 100 / All (clamped to what's available).
            slot.querySelectorAll('.qty-preset').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setQty(btn.dataset.preset === 'all' ? max : Number(btn.dataset.preset));
                });
            });

            // Manual field: allow typing freely (even over max); clamp on blur.
            if (inputEl) {
                inputEl.addEventListener('input', () => {
                    const raw = Math.max(1, Math.floor(Number(inputEl.value) || 1));
                    this.storageQtySelection.set(key, raw);
                });
                inputEl.addEventListener('change', () => setQty(inputEl.value));
            }

            if (action) action.addEventListener('click', (e) => {
                // CORREÇÃO: Evita propagação múltipla do clique
                e.preventDefault();
                e.stopImmediatePropagation();

                // Clamp on action (typed 7 with 6 available → 6, reflected back).
                const amount = Math.max(1, Math.min(Math.floor(Number(inputEl?.value) || (this.storageQtySelection.get(key) || 1)), max));
                if (inputEl) inputEl.value = String(amount);
                this.storageQtySelection.set(key, amount);

                if (mode === 'deposit') {
                    const invCategory = sourceCat !== '' ? sourceCat : null;
                    if (invCategory) {
                        storageSystem.depositFromInventory(invCategory, itemId, amount);
                    } else {
                        storageSystem.depositFromInventory(itemId, amount);
                    }
                } else {
                    // Use the item's own storage category (cross-category search
                    // can show items from categories other than the active tab).
                    const storageCat = sourceCat !== '' ? sourceCat : categoryKey;
                    storageSystem.withdrawToInventory(storageCat, itemId, amount);
                }

                const currentTab = document.querySelector('.storage-tab.active')?.dataset.tab || mode;
                const currentCategory = document.querySelector('.storage-category-btn.active')?.dataset.category || categoryKey;

                // Preserve scroll position: the re-render rebuilds the grid, which
                // otherwise jumps the list back to the top after each transfer.
                const savedScroll = document.getElementById('storageContent')?.scrollTop ?? 0;

                // Pequeno delay para garantir que o inventário atualizou antes de renderizar
                setTimeout(() => {
                    this.renderStorageStats();
                    this.renderStorageCategory(currentCategory, currentTab);
                    const sc = document.getElementById('storageContent');
                    if (sc) sc.scrollTop = savedScroll;
                }, 50);
            });
        });
    }

    // All warehouse items across every category (for cross-category search).
    _allStorageStacks() {
        const out = [];
        for (const catKey of Object.keys(storageSystem.categories || {})) {
            const stacksRaw = Array.isArray(storageSystem.storage?.[catKey]) ? storageSystem.storage[catKey] : [];
            for (const [itemId, quantity] of sumStacksByItem(stacksRaw)) out.push({ itemId, quantity, sourceCategory: catKey });
        }
        return out;
    }

    // All inventory items mapped to their storage category (cross-category search).
    _allInventoryStacks() {
        const out = [];
        for (const catKey of Object.keys(storageSystem.categories || {})) {
            out.push(...this._getInventoryStacksForStorageCategory(catKey));
        }
        return out;
    }

    _getInventoryStacksForStorageCategory(storageCategoryKey) {
        const inv = getSystem('inventory');
        if (!inv) return [];

        const category = storageSystem.categories?.[storageCategoryKey];
        const allowedTypes = category?.itemTypes || [];

        // Extrai tudo do inventário numa lista unificada
        const stacks = this._extractInventoryStacks(inv);

        // Group by itemId (sum across stacks) so one slot represents the whole
        // amount — otherwise a 99/99/2 split would cap each deposit at one stack
        // and you couldn't deposit, say, 200 at once.
        const acc = new Map();
        for (const s of stacks) {
            const data = getItem(s.itemId);
            if (!data || !allowedTypes.includes(data.type)) continue;
            const prev = acc.get(s.itemId);
            if (prev) prev.quantity += s.quantity;
            else acc.set(s.itemId, { itemId: s.itemId, quantity: s.quantity, sourceCategory: s.category });
        }
        return Array.from(acc.values());
    }

    _extractInventoryStacks(inv) {
        const out = [];

        const pushStack = (category, raw) => {
            if (!raw) return;
            const id = (typeof raw.itemId === 'number') ? raw.itemId : ((typeof raw.id === 'number') ? raw.id : null);
            const qty = Number(raw.quantity ?? raw.qty ?? 0);
            
            if (id === null || !Number.isFinite(qty) || qty <= 0) return;
            
            out.push({ category: category || '', itemId: id, quantity: qty });
        };

        // CORREÇÃO CRÍTICA: Prioridade de varredura. 
        // Se encontrarmos itens via 'categories', NÃO varremos a lista plana,
        // pois geralmente a lista plana duplica os mesmos itens.
        
        let foundInCategories = false;

        // 1. Tenta estrutura por categorias (padrão)
        if (inv.categories && typeof inv.categories === 'object') {
            for (const [cat, bucket] of Object.entries(inv.categories)) {
                const arr = Array.isArray(bucket?.items) ? bucket.items : (Array.isArray(bucket) ? bucket : null);
                if (arr && arr.length > 0) {
                    arr.forEach(s => pushStack(cat, s));
                    foundInCategories = true;
                }
            }
        }

        // 2. Se não achou nada nas categorias, tenta arrays diretos
        if (!foundInCategories) {
            const candidates = [
                inv.inventory,
                inv.items,
                inv.bag,
                inv.data
            ].filter(Boolean);

            for (const c of candidates) {
                if (Array.isArray(c)) {
                    c.forEach(s => pushStack('', s));
                } else if (typeof c === 'object') {
                    for (const [cat, arr] of Object.entries(c)) {
                        if (!Array.isArray(arr)) continue;
                        arr.forEach(s => pushStack(cat, s));
                    }
                }
            }
        }

        // Mescla itens duplicados (ex: 2 stacks de madeira viram 1 entrada visual)
        const merged = new Map();
        for (const s of out) {
            const k = `${s.category}:${s.itemId}`;
            const prev = merged.get(k);
            if (prev) prev.quantity += s.quantity;
            else merged.set(k, { ...s });
        }

        return Array.from(merged.values());
    }

    _guessInventoryCategory(itemType) {
        const map = {
            tool: 'tools',
            food: 'food',
            animal_food: 'animal_food',
            seed: 'seeds',
            construction: 'construction',
            decoration: 'construction',
            material: 'resources',
            resource: 'resources',
            crop: 'resources'
        };
        return map[itemType] || 'resources';
    }

    closeStorageModal() {
        const modal = document.querySelector('.storage-modal');
        if (modal) modal.remove();
    }

    closeHouseMenu() {
        this.isMenuOpen = false;
        const modal = document.querySelector('.hse-house-modal');
        if (modal) modal.remove();
    }

    showMessage(text) {
        if (window.showMessage) {
            window.showMessage(text);
        } else {
            const msg = document.createElement('div');
            msg.className = 'hse-system-message';
            msg.textContent = text;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 2000);
        }
    }

    drawDoorHitbox(ctx, cam) {
        if (!this.houseInteractionHitbox) return;

        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const screenPos = cam.worldToScreen(
            this.houseInteractionHitbox.x,
            this.houseInteractionHitbox.y
        );

        ctx.strokeRect(
            screenPos.x,
            screenPos.y,
            this.houseInteractionHitbox.width * CAMERA_ZOOM,
            this.houseInteractionHitbox.height * CAMERA_ZOOM
        );

        ctx.setLineDash([]);
    }
}

export const houseSystem = new HouseSystem();
// Registrar no gameState (legacy window.houseSystem tratado por installLegacyGlobals)
registerSystem('house', houseSystem);