import { logger } from '../logger.js';
import { currencyManager } from "../currencyManager.js";
import { t } from '../i18n/i18n.js';
import { getSystem } from "../gameState.js";
import { CONTROLS_STORAGE_KEY, DEFAULT_KEYBINDS } from '../keybindDefaults.js';
import { toggleHelpPanel } from '../helpPanel.js';

/**
 * Retorna a label da tecla atual para uma ação de keybind
 * @param {string} action - Nome da ação (config, inventory, merchants)
 * @returns {string} Label da tecla (ex: 'O', 'I', 'U')
 */
function getKeyForAction(action) {
    try {
        const raw = localStorage.getItem(CONTROLS_STORAGE_KEY);
        if (raw) {
            const binds = JSON.parse(raw);
            if (binds[action]?.[0]) {
                const code = binds[action][0];
                const m = /^Key([A-Z])$/.exec(code);
                if (m) return m[1];
                return code.replace(/^Key/, '').replace(/^Digit/, '');
            }
        }
    } catch {}
    const code = DEFAULT_KEYBINDS[action]?.[0] || '';
    const m = /^Key([A-Z])$/.exec(code);
    if (m) return m[1];
    return code.replace(/^Key/, '').replace(/^Digit/, '');
}

/**
 * Obtém nome traduzido do item pelo ID
 * @param {number} itemId - ID do item
 * @param {string} fallbackName - Nome padrão se tradução não existir
 * @returns {string} Nome traduzido
 */


export class PlayerHUD {
    constructor() {
        this.isInventoryOpen = false;
        this.isStoreOpen = false;
        this.isConfigOpen = false;
        this.currentPlayer = null;
        this.isExpanded = false;

        // Intervalo para atualizar necessidades
        this.needsUpdateInterval = null;

        this.init();
    }

    init() {
        this.createHUDStructure();
        this.bindEvents();

        this._onPlayerNeedsChanged = (e) => {
            const { hunger, thirst, energy } = e.detail;
            this.setHUDValue('hudPlayerHunger', `${hunger}%`);
            this.setHUDValue('hudPlayerThirst', `${thirst}%`);
            this.setHUDValue('hudPlayerEnergy', `${energy}%`);
        };
        document.addEventListener("playerNeedsChanged", this._onPlayerNeedsChanged);

        this._onCharacterSelected = (e) => {
            this.onCharacterSelected(e.detail.character);
        };
        document.addEventListener('characterSelected', this._onCharacterSelected);

        this._onPlayerReady = (e) => {
            this.onPlayerReady(e.detail.player, e.detail.character);
        };
        document.addEventListener('playerReady', this._onPlayerReady);

        // OUVINTE CRÍTICO: Recria o HUD quando o idioma muda
        this._onLanguageChanged = () => {
            logger.info('[HUD] Idioma alterado, reconstruindo HUD...');
            this.createHUDStructure();
            this.updatePlayerInfo();
        };
        document.addEventListener('languageChanged', this._onLanguageChanged);
    }

    createHUDStructure() {
        // fix: Remover o HUD antigo corretamente usando o ID
        const oldHUD = document.getElementById('playerPanel');
        if (oldHUD) oldHUD.remove();

        // Remove container de botões antigo (recriado junto com o HUD)
       document.querySelectorAll('.hud-action-buttons').forEach((el) => { el.remove(); });

        // Remove também classes antigas se houver lixo no DOM
        const oldTopBar = document.querySelector('.top-bar');
        if (oldTopBar) oldTopBar.remove();

        // fix: insertAdjacentHTML → DOM API
        const playerPanel = document.createElement('div');
        playerPanel.className = 'player-panel';
        playerPanel.id = 'playerPanel';

        const portrait = document.createElement('div');
        portrait.className = 'player-portrait';
        const portraitImg = document.createElement('img');
        portraitImg.id = 'playerPortrait';
        portraitImg.src = 'assets/characters/default.png';
        portraitImg.alt = 'Player Portrait';
        portrait.appendChild(portraitImg);

        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        const nameH3 = document.createElement('h3');
        nameH3.id = 'hudPlayerName';
        nameH3.textContent = t('player.noCharacter');
        const equippedItem = document.createElement('div');
        equippedItem.id = 'equipped-item';
        equippedItem.style.cssText = 'display:none; font-size: 14px; color: #cfc; margin-top: 4px;';

        const infoGrid = document.createElement('div');
        infoGrid.className = 'player-info-grid';
        const stats = [
            { icon: '👤', label: t('player.level'), id: 'hudPlayerLevel', value: '1' },
            { icon: '⭐', label: t('player.xp'), id: 'hudPlayerXP', value: '0/100' },
            { icon: '🍗', label: t('player.hunger'), id: 'hudPlayerHunger', value: '100%' },
            { icon: '💧', label: t('player.thirst'), id: 'hudPlayerThirst', value: '100%' },
            { icon: '⚡', label: t('player.energy'), id: 'hudPlayerEnergy', value: '100%' },
            { icon: '💰', label: t('player.money'), id: 'hudPlayerMoney', value: '$0' },
        ];
        for (const s of stats) {
            const stat = document.createElement('div');
            stat.className = 'player-stat';
            const labelSpan = document.createElement('span');
            labelSpan.className = 'stat-label';
            labelSpan.textContent = `${s.icon} ${s.label}:`;
            const valueSpan = document.createElement('span');
            valueSpan.className = 'stat-value';
            valueSpan.id = s.id;
            valueSpan.textContent = s.value;
            stat.append(labelSpan, valueSpan);
            infoGrid.appendChild(stat);
        }
        playerInfo.append(nameH3, equippedItem, infoGrid);
        playerPanel.append(portrait, playerInfo);

        const actionButtons = document.createElement('div');
        actionButtons.className = 'hud-action-buttons';
        const buttons = [
            { id: 'saveGameBtn', tooltip: t('hud.saveTooltip'), icon: '💾' },
            { id: 'settingsBtn', tooltip: t('hud.settingsTooltip', { key: getKeyForAction('config') }), icon: '⚙️' },
            { id: 'inventoryBtn', tooltip: t('hud.inventoryTooltip', { key: getKeyForAction('inventory') }), icon: '🎒' },
            { id: 'commerceBtn', tooltip: t('hud.commerceTooltip', { key: getKeyForAction('merchants') }), icon: '🛒' },
            { id: 'helpBtn', tooltip: t('hud.helpTooltip', { key: getKeyForAction('help') }), icon: '❓' },
        ];
        for (const b of buttons) {
            const btn = document.createElement('button');
            btn.className = 'hud-action-btn';
            btn.id = b.id;
            btn.title = b.tooltip;
            btn.setAttribute('aria-label', b.tooltip);
            btn.textContent = b.icon;
            actionButtons.appendChild(btn);
        }

        let gameContainer = document.querySelector('.theGame');
        if (!gameContainer) {
            gameContainer = document.createElement('div');
            gameContainer.className = 'theGame';
            document.body.appendChild(gameContainer);
        }
        gameContainer.prepend(actionButtons);
        gameContainer.prepend(playerPanel);

        // Rebindeia os listeners nos botões do HUD (necessário após recriação do HTML)
        this.bindHUDButtons();

        document.dispatchEvent(new Event("hudReady"));
    }

    bindEvents() {
        document.querySelectorAll('.modal-close').forEach((btn) => {
            btn.addEventListener('click', () => this.closeModals());
        });

        this._onHudClick = (e) => {
            if (e.target.classList.contains('modal')) this.closeModals();
        };
        document.addEventListener('click', this._onHudClick);

        // Listener para atualização de dinheiro em tempo real (documento, roda 1x)
        this._onMoneyChanged = (e) => {
            const el = document.getElementById("hudPlayerMoney");
            if (el) el.textContent = `$${e.detail.money}`;
        };
        document.addEventListener("moneyChanged", this._onMoneyChanged);
    }

    /**
     * Bindeia listeners nos botões do HUD.
     * Chamado sempre que createHUDStructure() recria o HTML.
     */
    bindHUDButtons() {
        // Botão retrátil do HUD
        document.getElementById('toggleHudBtn')?.addEventListener('click', () => this.toggleHUD());

        // Botão Save/Load
        document.getElementById('saveGameBtn')?.addEventListener('click', async () => {
            try {
                const { saveSlotsUI } = await import('../saveSlotsUI.js');
                saveSlotsUI.open('menu');
            } catch (e) {
                logger.warn('Save system não disponível', e);
            }
        });

        // Botão Configurações (mesma lógica da tecla O)
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('configModal');
            if (!modal) return;

            const closeBtn = modal.querySelector?.('.modal-close');
            if (closeBtn && !closeBtn.__boundClose) {
                closeBtn.__boundClose = true;
                closeBtn.addEventListener('click', () => modal.classList.remove('active'));
            }

            if (modal.classList.contains('active')) modal.classList.remove('active');
            else modal.classList.add('active');
        });

        // Botão Inventário (mesma lógica da tecla I)
        document.getElementById('inventoryBtn')?.addEventListener('click', () => {
            const host = document.getElementById('inventory-ui-host');
            const modal = host?.shadowRoot?.getElementById('inventoryModal');
            if (modal?.classList.contains('open')) window.closeInventory?.();
            else window.openInventory?.();
        });

        // Botão Comércio (mesma lógica da tecla U)
        document.getElementById('commerceBtn')?.addEventListener('click', () => {
            if (typeof window.openStore === 'function') {
                window.openStore();
                return;
            }
            if (typeof window.openMerchantsList === 'function') {
                window.openMerchantsList();
                return;
            }
            if (window.merchantSystem && typeof window.merchantSystem.openMerchantsList === 'function') {
                window.merchantSystem.openMerchantsList();
                return;
            }
            const merchantsList = document.getElementById('merchantsList');
            merchantsList?.classList?.add('active');
        });

        // fix: Botão Ajuda sempre rebind após recriar HUD
        const helpBtns = document.querySelectorAll('#helpBtn');
        const helpBtn = helpBtns[helpBtns.length - 1];
        if (helpBtn && !helpBtn.__boundHelp) {
            helpBtn.__boundHelp = true;
            helpBtn.addEventListener('click', () => toggleHelpPanel());
        }
    }

    openModal(modalId) {
        this.closeModals();
        document.getElementById(modalId)?.classList.add('active');
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    }

    onCharacterSelected(character) {
        this.currentPlayer = character;
        this.updatePlayerInfo();
    }

    onPlayerReady(player, character) {
        const char = character || player;
        this.currentPlayer = char;
        this.startNeedsUpdateInterval();
        this.updatePlayerInfo();
    }

    startNeedsUpdateInterval() {
        if (this.needsUpdateInterval) clearInterval(this.needsUpdateInterval);
        this.needsUpdateInterval = setInterval(() => this.updateNeedsFromSystem(), 1000);
    }

    updateNeedsFromSystem() {
        const playerSystem = getSystem('player');
        if (!playerSystem) return;
        const needs = playerSystem.getNeeds();

        if (!needs) return;

        const hunger = needs.hunger ?? this.currentPlayer.hunger ?? 100;
        const thirst = needs.thirst ?? this.currentPlayer.thirst ?? 100;
        const energy = needs.energy ?? this.currentPlayer.energy ?? 100;

        this.setHUDValue('hudPlayerHunger', `${hunger}%`);
        this.setHUDValue('hudPlayerThirst', `${thirst}%`);
        this.setHUDValue('hudPlayerEnergy', `${energy}%`);
    }

    updatePlayerInfo() {
        if (!this.currentPlayer) return;

        const playerSystem = getSystem('player');
        const needs = playerSystem?.getNeeds();
        const hunger = needs?.hunger ?? this.currentPlayer.hunger ?? 100;
        const thirst = needs?.thirst ?? this.currentPlayer.thirst ?? 100;
        const energy = needs?.energy ?? this.currentPlayer.energy ?? 100;

        this.setHUDValue('hudPlayerName', this.currentPlayer.name || t('player.noCharacter'));
        this.setHUDValue('hudPlayerLevel', this.currentPlayer.level || "1");
        this.setHUDValue('hudPlayerXP', `${this.currentPlayer.xp || 0}/${this.currentPlayer.xpMax || 100}`);
        this.setHUDValue('hudPlayerHunger', `${hunger}%`);
        this.setHUDValue('hudPlayerThirst', `${thirst}%`);
        this.setHUDValue('hudPlayerEnergy', `${energy}%`);
        this.setHUDValue('hudPlayerMoney', `$${currencyManager.getMoney()}`);

        if (this.currentPlayer.portrait) {
            const portraitEl = document.getElementById('playerPortrait');
            if(portraitEl) portraitEl.src = this.currentPlayer.portrait;
        }
    }

    setHUDValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    updateEquippedItem(item) {
        const equippedElement = document.getElementById('equipped-item');
        if (equippedElement) {
            if (item) {
                const itemName = getItemName(item.id, item.name);
                // fix: innerHTML → DOM API
                equippedElement.replaceChildren();
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'display: flex; align-items: center; gap: 8px;';
                const iconSpan = document.createElement('span');
                iconSpan.textContent = item.icon || '';
                const nameSpan = document.createElement('span');
                nameSpan.textContent = itemName;
                wrapper.append(iconSpan, nameSpan);
                equippedElement.appendChild(wrapper);
                equippedElement.style.display = 'block';
            } else {
                equippedElement.replaceChildren();
                equippedElement.style.display = 'none';
            }
        }
    }

    destroy() {
        // Para o intervalo de atualização de necessidades
        if (this.needsUpdateInterval) {
            clearInterval(this.needsUpdateInterval);
            this.needsUpdateInterval = null;
        }

        // Remove event listeners registrados em init() e bindEvents()
        document.removeEventListener("playerNeedsChanged", this._onPlayerNeedsChanged);
        document.removeEventListener('characterSelected', this._onCharacterSelected);
        document.removeEventListener('playerReady', this._onPlayerReady);
        document.removeEventListener('languageChanged', this._onLanguageChanged);
        document.removeEventListener('click', this._onHudClick);
        document.removeEventListener('moneyChanged', this._onMoneyChanged);

        // Remove elementos do DOM
        const panel = document.getElementById('playerPanel');
        if (panel) panel.remove();
        for (const el of document.querySelectorAll('.hud-action-buttons')) {
            el.remove();
        }

        logger.debug('PlayerHUD destruído');
    }

    render() {
        this.updatePlayerInfo();
    }

    toggleHUD() {
        this.isExpanded = !this.isExpanded;
        const panel = document.getElementById('playerPanel');
        if (panel) {
            panel.style.display = this.isExpanded ? 'block' : 'none';
        }
    }
}

// Listeners globais
document.addEventListener('itemEquipped', (e) => {
    const playerHUD = getSystem('hud');
    if (playerHUD && typeof playerHUD.updateEquippedItem === 'function') {
        playerHUD.updateEquippedItem(e.detail.item);
    }
});

document.addEventListener('itemUnequipped', () => {
    const playerHUD = getSystem('hud');
    if (playerHUD && typeof playerHUD.updateEquippedItem === 'function') {
        playerHUD.updateEquippedItem(null);
    }
});