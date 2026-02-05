import { logger } from '../logger.js';
import { currencyManager } from "../currencyManager.js";
import { t } from '../i18n/i18n.js';
import { getSystem } from "../gameState.js";
/**
 * Obtém nome traduzido do item pelo ID
 * @param {number} itemId - ID do item
 * @param {string} fallbackName - Nome padrão se tradução não existir
 * @returns {string} Nome traduzido
 */
function getItemName(itemId, fallbackName = '') {
  const translatedName = t(`itemNames.${itemId}`);
  if (translatedName === `itemNames.${itemId}`) {
    return fallbackName;
  }
  return translatedName || fallbackName;
}

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

        // Reatribuir listeners específicos do HUD se necessário (ex: botão de recolher)
        const toggleBtn = document.getElementById('toggleHudBtn');
        if(toggleBtn) toggleBtn.addEventListener('click', () => this.toggleHUD());

        document.dispatchEvent(new Event("hudReady"));
    }

    bindEvents() {
        document.getElementById('inventoryBtn')?.addEventListener('click', () => this.openModal('inventoryModal'));
        document.getElementById('storeBtn')?.addEventListener('click', () => this.openModal('inventoryModal'));
        document.getElementById('configBtn')?.addEventListener('click', () => this.openModal('configModal'));

        document.querySelectorAll('.modal-close').forEach(btn =>
            btn.addEventListener('click', () => this.closeModals())
        );

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) this.closeModals();
        });

        document.addEventListener("moneyChanged", (e) => {
            const el = document.getElementById("hudPlayerMoney");
            if (el) el.textContent = `$${e.detail.money}`;
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
        this.setHUDValue('hudPlayerHunger', `${needs.hunger}%`);
        this.setHUDValue('hudPlayerThirst', `${needs.thirst}%`);
        this.setHUDValue('hudPlayerEnergy', `${needs.energy}%`);
    }

    updatePlayerInfo() {
        if (!this.currentPlayer) return;

        this.setHUDValue('hudPlayerName', this.currentPlayer.name || "Aventureiro");
        this.setHUDValue('hudPlayerLevel', this.currentPlayer.level || "1");
        this.setHUDValue('hudPlayerXP', `${this.currentPlayer.xp || 0}/${this.currentPlayer.xpMax || 100}`);
        
        // fix: Defensive nullish coalescing (??) to handle 0 values safely (L161-167)

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