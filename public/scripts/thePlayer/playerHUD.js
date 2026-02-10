import { logger } from '../logger.js';
import { currencyManager } from "../currencyManager.js";
import { t } from '../i18n/i18n.js';
import { getSystem } from "../gameState.js";
import { CONTROLS_STORAGE_KEY, DEFAULT_KEYBINDS } from '../keybindDefaults.js';

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
        
        document.addEventListener("playerNeedsChanged", (e) => {
            const { hunger, thirst, energy } = e.detail;
            this.setHUDValue('hudPlayerHunger', `${hunger}%`);
            this.setHUDValue('hudPlayerThirst', `${thirst}%`);
            this.setHUDValue('hudPlayerEnergy', `${energy}%`);
        });

        document.addEventListener('characterSelected', (e) => {
            this.onCharacterSelected(e.detail.character);
        });

        document.addEventListener('playerReady', (e) => {
            this.onPlayerReady(e.detail.player, e.detail.character);
        });

        // 🌍 OUVINTE CRÍTICO: Recria o HUD quando o idioma muda
        document.addEventListener('languageChanged', () => {
            logger.info('[HUD] Idioma alterado, reconstruindo HUD...');
            this.createHUDStructure();
            this.updatePlayerInfo(); // Atualiza os valores dinâmicos (nome, $$, etc)
        });
    }

    createHUDStructure() {
        // 🛠️ CORREÇÃO: Remover o HUD antigo corretamente usando o ID
        const oldHUD = document.getElementById('playerPanel');
        if (oldHUD) oldHUD.remove();

        // Remove container de botões antigo (recriado junto com o HUD)
        const oldActionBtns = document.querySelector('.hud-action-buttons');
        if (oldActionBtns) oldActionBtns.remove();

        // Remove também classes antigas se houver lixo no DOM
        const oldTopBar = document.querySelector('.top-bar');
        if (oldTopBar) oldTopBar.remove();

        // HTML limpo e estruturado
        const hudHTML = `
            <div class="player-panel" id="playerPanel">
                <div class="player-portrait">
                    <img id="playerPortrait" src="assets/characters/default.png" alt="Player Portrait">
                </div>
                <div class="player-info">
                    <h3 id="hudPlayerName">${t('player.noCharacter')}</h3>
                    <div id="equipped-item" style="display:none; font-size: 14px; color: #cfc; margin-top: 4px;"></div>

                    <div class="player-info-grid">
                        <div class="player-stat"><span class="stat-label">👤 ${t('player.level')}:</span><span class="stat-value" id="hudPlayerLevel">1</span></div>
                        <div class="player-stat"><span class="stat-label">⭐ ${t('player.xp')}:</span><span class="stat-value" id="hudPlayerXP">0/100</span></div>
                        <div class="player-stat"><span class="stat-label">🍗 ${t('player.hunger')}:</span><span class="stat-value" id="hudPlayerHunger">100%</span></div>
                        <div class="player-stat"><span class="stat-label">💧 ${t('player.thirst')}:</span><span class="stat-value" id="hudPlayerThirst">100%</span></div>
                        <div class="player-stat"><span class="stat-label">⚡ ${t('player.energy')}:</span><span class="stat-value" id="hudPlayerEnergy">100%</span></div>
                        <div class="player-stat"><span class="stat-label">💰 ${t('player.money')}:</span><span class="stat-value" id="hudPlayerMoney">$0</span></div>
                    </div>
                </div>
            </div>
            <div class="hud-action-buttons">
                <button class="hud-action-btn" id="saveGameBtn" title="${t('hud.saveTooltip')}" aria-label="${t('hud.saveTooltip')}">💾</button>
                <button class="hud-action-btn" id="settingsBtn" title="${t('hud.settingsTooltip', { key: getKeyForAction('config') })}" aria-label="${t('hud.settingsTooltip', { key: getKeyForAction('config') })}">⚙️</button>
                <button class="hud-action-btn" id="inventoryBtn" title="${t('hud.inventoryTooltip', { key: getKeyForAction('inventory') })}" aria-label="${t('hud.inventoryTooltip', { key: getKeyForAction('inventory') })}">🎒</button>
                <button class="hud-action-btn" id="commerceBtn" title="${t('hud.commerceTooltip', { key: getKeyForAction('merchants') })}" aria-label="${t('hud.commerceTooltip', { key: getKeyForAction('merchants') })}">🛒</button>
                <button class="hud-action-btn" id="helpBtn" title="${t('hud.helpTooltip', { key: getKeyForAction('help') })}" aria-label="${t('hud.helpTooltip', { key: getKeyForAction('help') })}">❓</button>
            </div>
        `;

        const gameContainer = document.querySelector('.theGame');
        if (gameContainer) {
            gameContainer.insertAdjacentHTML('afterbegin', hudHTML);
        } else {
            // Fallback seguro caso .theGame não exista
            const body = document.body;
            const gameDiv = document.createElement('div');
            gameDiv.className = 'theGame';
            body.appendChild(gameDiv);
            gameDiv.insertAdjacentHTML('afterbegin', hudHTML);
        }

        // Rebindeia os listeners nos botões do HUD (necessário após recriação do HTML)
        this.bindHUDButtons();

        document.dispatchEvent(new Event("hudReady"));
    }

    bindEvents() {
        document.querySelectorAll('.modal-close').forEach(btn =>
            btn.addEventListener('click', () => this.closeModals())
        );

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) this.closeModals();
        });

        // Listener para atualização de dinheiro em tempo real (documento, roda 1x)
        document.addEventListener("moneyChanged", (e) => {
            const el = document.getElementById("hudPlayerMoney");
            if (el) el.textContent = `$${e.detail.money}`;
        });
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
        if (!window.playerSystem) return;
        const needs = window.playerSystem.getNeeds();

        if (!needs) return;

        const hunger = needs.hunger ?? this.currentPlayer.hunger ?? 100;
        const thirst = needs.thirst ?? this.currentPlayer.thirst ?? 100;
        const energy = needs.energy ?? this.currentPlayer.energy ?? 100;

        // fix: Fixed indentation on setHUDValue calls (L148-150)
        this.setHUDValue('hudPlayerHunger', `${hunger}%`);
        this.setHUDValue('hudPlayerThirst', `${thirst}%`);
        this.setHUDValue('hudPlayerEnergy', `${energy}%`);
    }

    updatePlayerInfo() {
        if (!this.currentPlayer) return;

        const needs = window.playerSystem?.getNeeds();
        const hunger = needs?.hunger ?? this.currentPlayer.hunger ?? 100;
        const thirst = needs?.thirst ?? this.currentPlayer.thirst ?? 100;
        const energy = needs?.energy ?? this.currentPlayer.energy ?? 100;

        this.setHUDValue('hudPlayerName', this.currentPlayer.name || t('player.noCharacter')); // Traduz "Sem Personagem"
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
                equippedElement.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span></span>
                        <span>${itemName}</span>
                    </div>
                `;
                equippedElement.style.display = 'block';
            } else {
                equippedElement.innerHTML = '';
                equippedElement.style.display = 'none';
            }
        }
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