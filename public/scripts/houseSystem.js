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
import { items } from './item.js';
import { craftingSystem } from './craftingSystem.js';
import { registerSystem, getObject, getSystem } from './gameState.js';

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

        this._injectHouseAndStorageStyles();
        this.storageQtySelection = new Map();
        this.setupHouseInteraction();
        this.setupEventListeners();
        this.setupProximityCheck();
    }

    _injectHouseAndStorageStyles() {
        this._ensureStyleTag(
            'hse-house-style-fallback',
            `
.hse-house-modal .modal-content{
    background: linear-gradient(180deg, #8b5a2b, #6b4513);
    border-radius: 16px;
    width: 320px;
    max-width: 90%;
    border: 3px solid #c9a463;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
}
.hse-house-options{
    display:flex;
    flex-direction:column;
    gap:8px;
    padding:20px;
}
.hse-house-option{
    background: linear-gradient(90deg, #c9a463, #e0bc87);
    color:#2e1c0f;
    border:none;
    border-radius:10px;
    padding:12px 15px;
    cursor:pointer;
    transition:all .3s ease;
    font-weight:bold;
    display:flex;
    align-items:center;
    gap:12px;
    text-align:left;
}
.hse-house-option:hover{
    background: linear-gradient(90deg, #e0bc87, #f5e9d3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.hse-option-text{flex:1;font-size:14px;}
.hse-house-footer{
    padding:15px 20px;
    border-top:2px solid #c9a463;
    text-align:center;
}
.hse-house-close-btn{
    background: rgba(201, 164, 99, 0.8);
    color:#2e1c0f;
    border:none;
    border-radius:6px;
    padding:8px 20px;
    cursor:pointer;
    transition:all .3s ease;
    font-weight:bold;
}
.hse-house-close-btn:hover{
    background:#e0bc87;
    transform:scale(1.05);
}
`
        );

        this._ensureStyleTag(
            'hse-storage-style-fallback',
            `
.storage-modal .modal-content{
    background: linear-gradient(180deg, #8b5a2b, #6b4513);
    border-radius:16px;
    width:90%;
    max-width:900px;
    height:80vh;
    border:3px solid #c9a463;
    box-shadow:0 8px 30px rgba(0,0,0,0.5);
    display:flex;
    flex-direction:column;
    overflow:hidden;
}
.storage-tabs{
    display:flex;
    border-bottom:2px solid #c9a463;
    background: rgba(46, 28, 15, 0.9);
}
.storage-tab{
    flex:1;
    background: rgba(90, 58, 31, 0.8);
    border:none;
    border-right:1px solid #c9a463;
    color:#f5e9d3;
    padding:12px;
    cursor:pointer;
    transition:all .3s ease;
    font-weight:bold;
    font-size:14px;
}
.storage-tab:last-child{border-right:none;}
.storage-tab:hover{background: rgba(201, 164, 99, 0.6);color:#2e1c0f;}
.storage-tab.active{
    background:#c9a463;
    color:#2e1c0f;
    box-shadow: inset 0 -3px 0 #2e1c0f;
}
.storage-stats{
    background: rgba(46, 28, 15, 0.9);
    padding: 15px 20px;
    border-bottom:2px solid #c9a463;
}
.stat-row{
    display:flex;
    justify-content:space-around;
    gap:20px;
    flex-wrap:wrap;
}
.stat-item{
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:5px;
    background: rgba(201, 164, 99, 0.2);
    padding:8px 12px;
    border-radius:8px;
    border:1px solid rgba(201, 164, 99, 0.3);
}
.stat-label{
    color:#c9a463;
    font-size:12px;
    font-weight:bold;
    text-transform:uppercase;
    letter-spacing:.5px;
}
.stat-value{
    color:#f5e9d3;
    font-weight:bold;
    font-size:16px;
    text-shadow:1px 1px 2px rgba(0,0,0,0.5);
}
.storage-categories{
    display:flex;
    gap:10px;
    padding:15px 20px;
    border-bottom:2px solid #c9a463;
    overflow-x:auto;
    background: rgba(46, 28, 15, 0.8);
}
.storage-category-btn{
    background: rgba(90, 58, 31, 0.8);
    border:2px solid #8b5a2b;
    border-radius:20px;
    padding:8px 15px;
    color:#f5e9d3;
    cursor:pointer;
    transition:all .3s ease;
    white-space:nowrap;
    display:flex;
    align-items:center;
    gap:8px;
    font-size:13px;
}
.storage-category-btn:hover{
    border-color:#c9a463;
    transform:translateY(-2px);
    box-shadow:0 4px 8px rgba(0,0,0,0.3);
}
.storage-category-btn.active{
    background:#c9a463;
    color:#2e1c0f;
    border-color:#c9a463;
}
.storage-content{
    flex:1;
    padding:20px;
    overflow-y:auto;
    background:
        radial-gradient(circle at 20% 80%, rgba(139, 90, 43, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(201, 164, 99, 0.1) 0%, transparent 50%),
        linear-gradient(135deg, rgba(46, 28, 15, 0.4) 0%, rgba(90, 58, 31, 0.2) 100%);
}
.category-info{
    background: rgba(46, 28, 15, 0.9);
    border-radius:12px;
    padding:15px;
    margin-bottom:20px;
    border:2px solid #c9a463;
    box-shadow:0 4px 12px rgba(0,0,0,0.3);
}
.category-info h3{
    color:#f5e9d3;
    margin-bottom:10px;
    font-size:18px;
    text-align:center;
}
.category-stats{
    display:flex;
    justify-content:space-between;
    color:#c9a463;
    font-size:13px;
    font-weight:bold;
    background: rgba(201, 164, 99, 0.1);
    padding:8px 12px;
    border-radius:6px;
    border:1px solid rgba(201, 164, 99, 0.2);
}
.storage-grid{
    display:grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap:15px;
    padding:5px;
}
.storage-slot{
    background: linear-gradient(135deg, rgba(46, 28, 15, 0.9) 0%, rgba(90, 58, 31, 0.8) 100%);
    border:2px solid #8b5a2b;
    border-radius:12px;
    padding:15px;
}
.slot-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:12px;
    padding-bottom:8px;
    border-bottom:1px solid rgba(201, 164, 99, 0.3);
}
.item-icon{font-size:28px;}
.item-quantity{
    background: linear-gradient(135deg, #c9a463, #e0bc87);
    color:#2e1c0f;
    padding:4px 10px;
    border-radius:12px;
    font-size:12px;
    font-weight:bold;
}
.item-name{
    color:#f5e9d3;
    font-weight:bold;
    margin-bottom:12px;
    text-align:center;
    font-size:14px;
    min-height:22px;
    display:flex;
    align-items:center;
    justify-content:center;
}
.item-actions{
    display:flex;
    flex-direction:column;
    gap:6px;
}
.withdraw-btn,.deposit-btn{
    border:none;
    border-radius:6px;
    padding:8px 10px;
    cursor:pointer;
    transition:all .3s ease;
    font-size:11px;
    font-weight:bold;
    text-transform:uppercase;
    letter-spacing:.5px;
}
.withdraw-btn{
    background: linear-gradient(135deg, #4ecca3, #3da58a);
    color:#2e1c0f;
}
.deposit-btn{
    background: linear-gradient(135deg, #c9a463, #e0bc87);
    color:#2e1c0f;
}
.storage-footer{
    padding:15px 20px;
    border-top:2px solid #c9a463;
    text-align:center;
    background: rgba(46, 28, 15, 0.9);
}
.storage-close-btn{
    background: linear-gradient(135deg, #c9a463, #e0bc87);
    color:#2e1c0f;
    border:none;
    border-radius:8px;
    padding:10px 25px;
    cursor:pointer;
    transition:all .3s ease;
    font-weight:bold;
    font-size:14px;
}
.storage-close-btn:hover{
    background: linear-gradient(135deg, #e0bc87, #f5e9d3);
    transform: translateY(-2px);
}
.empty-storage{
    grid-column: 1 / -1;
    text-align:center;
    color:#8b5a2b;
    font-style:italic;
    padding:60px 40px;
    background: rgba(46, 28, 15, 0.4);
    border-radius:12px;
    border:2px dashed #8b5a2b;
}
.qty-controls{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  margin-bottom:8px;
}
.qty-btn{
  width:28px;
  height:28px;
  border:none;
  border-radius:6px;
  cursor:pointer;
  font-weight:bold;
  background: rgba(201, 164, 99, 0.85);
  color:#2e1c0f;
}
.qty-btn:active{ transform: scale(0.97); }
.qty-value{
  min-width:34px;
  text-align:center;
  font-weight:bold;
  color:#f5e9d3;
}
`
        );
    }

    _ensureStyleTag(id, cssText) {
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = cssText;
        document.head.appendChild(style);
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

        const hint = document.createElement('div');
        hint.className = 'door-hint active';
        hint.innerHTML = `
            <div class="hint-content">
                <span class="hint-text">Pressione <strong>E</strong> para acessar a casa</span>
            </div>
        `;
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
            setTimeout(() => this.setupHouseInteraction(), 2000);
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
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && (this.isMenuOpen || document.querySelector('.storage-modal'))) {
                if (document.querySelector('.storage-modal')) this.closeStorageModal();
                else this.closeHouseMenu();
            } else if ((e.key === 'e' || e.key === 'E') && this.isPlayerNearDoor && !this.isMenuOpen) {
                this.openHouseMenu();
            }
        });
    }

    cleanup() {
        if (this.proximityCheckInterval) clearInterval(this.proximityCheckInterval);
        this.hideDoorHint();
    }

    openHouseMenu() {
        if (this.isMenuOpen) return;
        this.isMenuOpen = true;
        this.hideDoorHint();
        this.createHouseMenu();
    }

    createHouseMenu() {
        this.closeHouseMenu();

        const modal = document.createElement('div');
        modal.className = 'modal hse-house-modal active';
        modal.innerHTML = `
            <div class="modal-content house-modal-content">
                <div class="modal-header">
                    <h2>Minha Casa</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="hse-house-options">
                    <button class="hse-house-option" data-action="enter">
                        <span class="hse-option-text">Entrar em Casa</span>
                    </button>
                    <button class="hse-house-option" data-action="sleep">
                        <span class="hse-option-text">Dormir</span>
                    </button>
                    <button class="hse-house-option" data-action="crafting">
                        <span class="hse-option-text">Crafting</span>
                    </button>
                    <button class="hse-house-option" data-action="storage">
                        <span class="hse-option-text">Armazém</span>
                    </button>
                    <button class="hse-house-option" data-action="customize">
                        <span class="hse-option-text">Customizar</span>
                    </button>
                </div>
                <div class="hse-house-footer">
                    <button class="hse-house-close-btn">Fechar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => this.closeHouseMenu());
        modal.querySelector('.hse-house-close-btn').addEventListener('click', () => this.closeHouseMenu());
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
        }
    }

    enterHouse() {
        this.showMessage('Entrando na casa...');
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
            this.showMessage('Sistema de crafting não disponível');
        }
    }

    openStorage() {
        this.showStorageModal();
    }

    openCustomize() {
        this.closeHouseMenu();
        this.showMessage('customização ainda não implementada');
    }

    showStorageModal() {
        this.closeHouseMenu();

        const modal = document.createElement('div');
        modal.className = 'modal storage-modal active';
        modal.innerHTML = `
            <div class="modal-content storage-modal-content">
                <div class="modal-header">
                    <h2>Storage</h2>
                    <button class="modal-close">&times;</button>
                </div>

                <div class="storage-tabs">
                    <button class="storage-tab active" data-tab="withdraw">Retirar Itens</button>
                    <button class="storage-tab" data-tab="deposit">Depositar Itens</button>
                </div>

                <div class="storage-stats" id="storageStats"></div>

                <div class="storage-categories">
                    ${Object.entries(storageSystem.categories).map(([key, category]) => `
                        <button class="storage-category-btn" data-category="${key}">
                            <span class="category-icon">${category.icon || ''}</span>
                            <span class="category-name">${category.name}</span>
                        </button>
                    `).join('')}
                </div>

                <div class="storage-content" id="storageContent"></div>

                <div class="storage-footer">
                    <button class="storage-close-btn">Fechar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        this.renderStorageStats();
        this.renderStorageCategory('tools', 'withdraw');

        modal.querySelector('.modal-close').addEventListener('click', () => this.closeStorageModal());
        modal.querySelector('.storage-close-btn').addEventListener('click', () => this.closeStorageModal());

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

        el.innerHTML = `
            <div class="stat-row">
                <div class="stat-item">
                    <div class="stat-label">itens</div>
                    <div class="stat-value">${info.totalItems || 0}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">valor</div>
                    <div class="stat-value">${info.totalValue || 0}</div>
                </div>
            </div>
        `;
    }

    renderStorageCategory(categoryKey, mode) {
        const content = document.getElementById('storageContent');
        if (!content) return;

        const category = storageSystem.categories?.[categoryKey];
        const stacksRaw = Array.isArray(storageSystem.storage?.[categoryKey]) ? storageSystem.storage[categoryKey] : [];

        const maxStacks = category?.maxStacks ?? 0;
        const usedStacks = stacksRaw.length;
        const title = category?.name || categoryKey;

        content.innerHTML = `
            <div class="category-info">
              <h3>${title}</h3>
              <div class="category-stats">
                <span>stacks: ${usedStacks}/${maxStacks}</span>
                <span>modo: ${mode === 'deposit' ? 'depositar' : 'retirar'}</span>
              </div>
            </div>
            <div class="storage-grid" id="storageGrid"></div>
        `;

        const grid = content.querySelector('#storageGrid');
        if (!grid) return;

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
            grid.innerHTML = `<div class="empty-storage">sem itens nesta categoria</div>`;
            return;
        }

        const getKey = (itemId, sourceCat) => `${mode}:${categoryKey}:${sourceCat || 'null'}:${itemId}`;

        grid.innerHTML = list.map((s) => {
            const data = items.find(i => i.id === s.itemId);
            const icon = data?.icon || '';
            const name = data?.name || `item ${s.itemId}`;
            const qty = s.quantity || 0;

            const key = getKey(s.itemId, s.sourceCategory);
            const saved = this.storageQtySelection.get(key) || 1;
            const selected = Math.max(1, Math.min(saved, qty));

            const btnClass = mode === 'deposit' ? 'deposit-btn' : 'withdraw-btn';
            const btnText = mode === 'deposit' ? `depositar (${selected})` : `retirar (${selected})`;

            return `
              <div class="storage-slot" 
                   data-itemid="${s.itemId}" 
                   data-sourcecat="${s.sourceCategory || ''}" 
                   data-max="${qty}" 
                   data-key="${key}">
                <div class="slot-header">
                  <div class="item-icon">${icon}</div>
                  <div class="item-quantity">${qty}x</div>
                </div>

                <div class="item-name">${name}</div>

                <div class="qty-controls">
                  <button class="qty-btn qty-minus">-</button>
                  <div class="qty-value">${selected}</div>
                  <button class="qty-btn qty-plus">+</button>
                </div>

                <div class="item-actions">
                  <button class="${btnClass}">${btnText}</button>
                </div>
              </div>
            `;
        }).join('');

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
                    ? `depositar (${clamped})`
                    : `retirar (${clamped})`;
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
                const data = items.find(i => i.id === s.itemId);
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
            msg.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 10000;
            `;
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