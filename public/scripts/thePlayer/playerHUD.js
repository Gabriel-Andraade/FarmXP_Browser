import { logger } from '../logger.js';
import { currencyManager } from "../currencyManager.js";

export class PlayerHUD {
    constructor() {
        this.isInventoryOpen = false;
        this.isStoreOpen = false;
        this.isConfigOpen = false;
        this.currentPlayer = null;
        this.isExpanded = false;

        // Trecho inserido: intervalo para atualizar necessidades
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
    }

    createHUDStructure() {
        // Remove HUD antigo se existir
        const oldHUD = document.querySelector('.top-bar');
        if (oldHUD) oldHUD.remove();

        const hudHTML = `
            

                <div class="player-panel" id="playerPanel">
                    <div class="player-portrait">
                        <img id="playerPortrait" src="assets/characters/default.png" alt="Player Portrait">
                    </div>
                    <div class="player-info">
                        <h3 id="hudPlayerName">Sem personagem</h3>
                        <div id="equipped-item" style="display:none; font-size: 14px; color: #cfc; margin-top: 4px;"></div>

                        <div class="player-info-grid">
                            <div class="player-stat"><span class="stat-label">👤 Level:</span><span class="stat-value" id="hudPlayerLevel">1</span></div>
                            <div class="player-stat"><span class="stat-label">⭐ XP:</span><span class="stat-value" id="hudPlayerXP">0/100</span></div>
                            <div class="player-stat"><span class="stat-label">🍗 Fome:</span><span class="stat-value" id="hudPlayerHunger">100%</span></div>
                            <div class="player-stat"><span class="stat-label">💧 Sede:</span><span class="stat-value" id="hudPlayerThirst">100%</span></div>
                            <div class="player-stat"><span class="stat-label">⚡ Energia:</span><span class="stat-value" id="hudPlayerEnergy">100%</span></div>
                            <div class="player-stat"><span class="stat-label">💰 Dinheiro:</span><span class="stat-value" id="hudPlayerMoney">$0</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Verifica se o container .theGame existe
        const gameContainer = document.querySelector('.theGame');
        if (gameContainer) {
            gameContainer.insertAdjacentHTML('afterbegin', hudHTML);
            logger.info('✅ HUD criado com sucesso!');
        } else {
            logger.error('❌ Elemento .theGame não encontrado! Criando automaticamente...');
            const body = document.body;
            const gameDiv = document.createElement('div');
            gameDiv.className = 'theGame';
            body.appendChild(gameDiv);
            gameDiv.insertAdjacentHTML('afterbegin', hudHTML);
        }

        // Dispara evento avisando que o HUD está pronto
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

        // Botão retrátil do HUD
        document.getElementById('toggleHudBtn')?.addEventListener('click', () => this.toggleHUD());

        // 🆕 LISTENER PARA ATUALIZAÇÃO DE DINHEIRO EM TEMPO REAL
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
        // Suporta duas assinaturas: onPlayerReady(player, character) ou onPlayerReady(null, player)
        const char = character || player;
        this.currentPlayer = char;
        this.startNeedsUpdateInterval();
        this.updatePlayerInfo();
    }

    // TRECHO INSERIDO: inicia intervalo que puxa necessidades do playerSystem a cada 1s
    startNeedsUpdateInterval() {
        if (this.needsUpdateInterval) clearInterval(this.needsUpdateInterval);
        this.needsUpdateInterval = setInterval(() => this.updateNeedsFromSystem(), 1000);
    }

    // TRECHO INSERIDO: atualiza valores no HUD pegando do playerSystem
    updateNeedsFromSystem() {
        if (!window.playerSystem) return;
        const needs = window.playerSystem.getNeeds();
        if (!needs) return;

        const hunger = needs.hunger || this.currentPlayer.hunger || 100;
        const thirst = needs.thirst || this.currentPlayer.thirst || 100;
        const energy = needs.energy || this.currentPlayer.energy || 100;

        // 🛠️ CORREÇÃO AQUI: Não usar o operador OR (||) pois 0 é falsy.
        // Se usar `needs.hunger || 100`, quando for 0 ele exibe 100.
        // A lógica abaixo garante que ele usa o valor do sistema, mesmo que seja 0.
        this.setHUDValue('hudPlayerHunger', `${hunger}%`);
        this.setHUDValue('hudPlayerThirst', `${thirst}%`);
        this.setHUDValue('hudPlayerEnergy', `${energy}%`);
    }

    updatePlayerInfo() {
        if (!this.currentPlayer) return;

        this.setHUDValue('hudPlayerName', this.currentPlayer.name || "Aventureiro");
        this.setHUDValue('hudPlayerLevel', this.currentPlayer.level || "1");
        this.setHUDValue('hudPlayerXP', `${this.currentPlayer.xp || 0}/${this.currentPlayer.xpMax || 100}`);
        
        // 🆕 USAR VALORES DO PLAYER SYSTEM
        const needs = window.playerSystem?.getNeeds();

        // 🛠️ CORREÇÃO PRINCIPAL AQUI (USANDO ??)
        // O operador ?? verifica se é null ou undefined. Se for 0, ele mantém o 0.
        const hunger = needs?.hunger ?? this.currentPlayer.hunger ?? 100;
        const thirst = needs?.thirst ?? this.currentPlayer.thirst ?? 100;
        const energy = needs?.energy ?? this.currentPlayer.energy ?? 100;

        this.setHUDValue('hudPlayerHunger', `${hunger}%`);
        this.setHUDValue('hudPlayerThirst', `${thirst}%`);
        this.setHUDValue('hudPlayerEnergy', `${energy}%`);
        
        this.setHUDValue('hudPlayerMoney', `$${currencyManager.getMoney()}`);

        if (this.currentPlayer.portrait) {
            document.getElementById('playerPortrait').src = this.currentPlayer.portrait;
        }
    }

    setHUDValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // 🆕 Atualiza o item equipado no HUD
    updateEquippedItem(item) {
        const equippedElement = document.getElementById('equipped-item');
        if (equippedElement) {
            if (item) {
                equippedElement.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span></span>
                        <span>${item.name}</span>
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

// 🧩 Listeners globais para equipar/desequipar
document.addEventListener('itemEquipped', (e) => {
    if (window.playerHUD && typeof window.playerHUD.updateEquippedItem === 'function') {
        window.playerHUD.updateEquippedItem(e.detail.item);
    }
});

document.addEventListener('itemUnequipped', () => {
    if (window.playerHUD && typeof window.playerHUD.updateEquippedItem === 'function') {
        window.playerHUD.updateEquippedItem(null);
    }
});