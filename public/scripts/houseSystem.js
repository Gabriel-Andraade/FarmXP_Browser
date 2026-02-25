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
import { getItem } from './itemUtils.js';
import { craftingSystem } from './craftingSystem.js';
import { t } from './i18n/i18n.js';
import { registerSystem, getObject, getSystem } from './gameState.js';
import { logger } from './logger.js';

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
        // fix: Using getObject instead of fallback pattern for consistency (L374)
        const currentPlayer = getObject('currentPlayer');
        if (!this.houseInteractionHitbox || !currentPlayer) {
            this.isPlayerNearDoor = false;
            return;
        }

        const playerHitbox = collisionSystem.createPlayerHitbox(
            currentPlayer.x,
            currentPlayer.y,
            currentPlayer.width,
            currentPlayer.height
        );

        const wasPlayerNear = this.isPlayerNearDoor;
        this.isPlayerNearDoor = collisionSystem.checkCollision(playerHitbox, this.houseInteractionHitbox);

        if (this.isPlayerNearDoor && !wasPlayerNear && !this.isMenuOpen) {
            this.showDoorHint();
        }

        if (!this.isPlayerNearDoor && wasPlayerNear) {
            this.hideDoorHint();
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
            x: houseWalls.x + (houseWalls.width - doorWidth) / 8 + 165,
            y: houseWalls.y + houseWalls.height - doorHeight,
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
            } else if ((e.key === 'e' || e.key === 'E') && this.isPlayerNearDoor && !this.isMenuOpen) {
                this.openHouseMenu();
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

        this.closeStorageModal();
        this.closeHouseMenu();
        this.hideDoorHint();

        logger.debug('HouseSystem destruído');
    }

    openHouseMenu() {
        if (this.isMenuOpen) return;
        this.isMenuOpen = true;
        this.hideDoorHint();
        this.createHouseMenu();
    }

    // fix: innerHTML → DOM API
    createHouseMenu() {
        this.closeHouseMenu();

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

        storageContent.append(storageHeader, tabsDiv, statsDiv, categoriesDiv, contentDiv, storageFooter);
        modal.appendChild(storageContent);

        document.body.appendChild(modal);

        this.renderStorageStats();
        this.renderStorageCategory('tools', 'withdraw');

        storageCloseBtn.addEventListener('click', () => this.closeStorageModal());
        closeFooterBtn.addEventListener('click', () => this.closeStorageModal());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeStorageModal();
        });

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

        // Se estiver no modo deposit, busca itens do inventário, senão, do storage
        const list = (mode === 'deposit')
            ? this._getInventoryStacksForStorageCategory(categoryKey)
            : (() => {
                const acc = new Map();
                for (const s of stacksRaw) {
                    const prev = acc.get(s.itemId) || 0;
                    acc.set(s.itemId, prev + (s.quantity || 0));
                }
                return Array.from(acc.entries()).map(([itemId, quantity]) => ({
                    itemId,
                    quantity,
                    sourceCategory: categoryKey // Para withdraw, a categoria é a do storage
                }));
            })();

        if (!list.length) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-storage';
            emptyDiv.textContent = t('storage.emptyCategory');
            grid.appendChild(emptyDiv);
            return;
        }

        const getKey = (itemId, sourceCat) => `${mode}:${categoryKey}:${sourceCat || 'null'}:${itemId}`;

        for (const s of list) {
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
            iconDiv.textContent = icon;
            const qtyDiv = document.createElement('div');
            qtyDiv.className = 'item-quantity';
            qtyDiv.textContent = `${qty}x`;
            slotHeader.append(iconDiv, qtyDiv);

            const nameDiv = document.createElement('div');
            nameDiv.className = 'item-name';
            nameDiv.textContent = name;

            const qtyControls = document.createElement('div');
            qtyControls.className = 'qty-controls';
            const minusBtn = document.createElement('button');
            minusBtn.className = 'qty-btn qty-minus';
            minusBtn.textContent = '-';
            const qtyValue = document.createElement('div');
            qtyValue.className = 'qty-value';
            qtyValue.textContent = selected;
            const plusBtn = document.createElement('button');
            plusBtn.className = 'qty-btn qty-plus';
            plusBtn.textContent = '+';
            qtyControls.append(minusBtn, qtyValue, plusBtn);

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

            const setQty = (v) => {
                const clamped = Math.max(1, Math.min(v, max));
                this.storageQtySelection.set(key, clamped);

                const val = slot.querySelector('.qty-value');
                if (val) val.textContent = String(clamped);

                const actionBtn = slot.querySelector('.deposit-btn, .withdraw-btn');
                if (actionBtn) actionBtn.textContent = mode === 'deposit'
                    ? t('storage.depositBtn', { qty: clamped })
                    : t('storage.withdrawBtn', { qty: clamped });
            };

            const minus = slot.querySelector('.qty-minus');
            const plus = slot.querySelector('.qty-plus');
            const action = slot.querySelector('.deposit-btn, .withdraw-btn');

            const current = this.storageQtySelection.get(key) || 1;
            setQty(current);

            if (minus) minus.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const v = (this.storageQtySelection.get(key) || 1) - 1;
                setQty(v);
            });

            if (plus) plus.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const v = (this.storageQtySelection.get(key) || 1) + 1;
                setQty(v);
            });

            if (action) action.addEventListener('click', (e) => {
                // CORREÇÃO: Evita propagação múltipla do clique
                e.preventDefault();
                e.stopImmediatePropagation();

                const amount = this.storageQtySelection.get(key) || 1;

                if (mode === 'deposit') {
                    const invCategory = sourceCat !== '' ? sourceCat : null;
                    if (invCategory) {
                        storageSystem.depositFromInventory(invCategory, itemId, amount);
                    } else {
                        storageSystem.depositFromInventory(itemId, amount);
                    }
                } else {
                    storageSystem.withdrawToInventory(categoryKey, itemId, amount);
                }

                const currentTab = document.querySelector('.storage-tab.active')?.dataset.tab || mode;
                const currentCategory = document.querySelector('.storage-category-btn.active')?.dataset.category || categoryKey;

                // Pequeno delay para garantir que o inventário atualizou antes de renderizar
                setTimeout(() => {
                    this.renderStorageStats();
                    this.renderStorageCategory(currentCategory, currentTab);
                }, 50);
            });
        });
    }

    _getInventoryStacksForStorageCategory(storageCategoryKey) {
        const inv = getSystem('inventory');
        if (!inv) return [];

        const category = storageSystem.categories?.[storageCategoryKey];
        const allowedTypes = category?.itemTypes || [];

        // Extrai tudo do inventário numa lista unificada
        const stacks = this._extractInventoryStacks(inv);

        return stacks
            .filter(s => {
                const data = getItem(s.itemId);
                if (!data) return false;
                // Filtra apenas itens que pertencem a esta categoria do armazém (ex: Tools)
                return allowedTypes.includes(data.type);
            })
            .map(s => ({
                itemId: s.itemId,
                quantity: s.quantity,
                sourceCategory: s.category // Importante: mantém a categoria original do inventário se houver
            }));
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