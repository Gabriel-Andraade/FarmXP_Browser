import { logger } from '../logger.js';
import { currencyManager } from "../currencyManager.js";
import { t } from '../i18n/i18n.js';
import { getSystem } from "../gameState.js";
import { CONTROLS_STORAGE_KEY, DEFAULT_KEYBINDS } from '../keybindDefaults.js';
import { toggleHelpPanel } from '../helpPanel.js';
import { isImageIcon } from '../itemUtils.js';

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
        this.isExpanded = true;

        // Intervalo para atualizar necessidades
        this.needsUpdateInterval = null;

        this.init();
    }

    init() {
        this.createHUDStructure();
        this.bindEvents();

        // fix: stored all event handlers as named fields for proper removal in destroy()
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

        // XP / Level — store handlers para remoção correta em destroy()
        this._onXpGained = (e) => this.updateXPDisplay(e.detail);
        document.addEventListener('xpGained', this._onXpGained);

        this._onLevelUp = (e) => this.updateXPDisplay({
            level: e.detail.level,
            xp: e.detail.carryXp,
            xpToNext: e.detail.xpToNext,
        });
        document.addEventListener('levelUp', this._onLevelUp);

        this._onXpRestored = (e) => this.updateXPDisplay(e.detail);
        document.addEventListener('xpRestored', this._onXpRestored);

        // OUVINTE CRÍTICO: Recria o HUD quando o idioma muda
        this._onLanguageChanged = () => {
            logger.info('[HUD] Idioma alterado, reconstruindo HUD...');
            this.createHUDStructure();
            this.updatePlayerInfo();
        };
        document.addEventListener('languageChanged', this._onLanguageChanged);

        // Issue #166 polish A: re-renderiza o badge "Equipado: X (Q)" quando
        // o player rebindeia a tecla do toolWheel, pra hint refletir a key nova.
        this._onControlsChanged = () => {
            if (this._lastEquippedItem) this.updateEquippedItem(this._lastEquippedItem);
        };
        document.addEventListener('controlsChanged', this._onControlsChanged);
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
        equippedItem.classList.add('hidden');

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
        // Issue #166: equipped-item agora vive FORA do .player-info (que
        // só aparece no hover). Reposicionado como sibling do .player-panel
        // logo abaixo dele — feedback constante do que o player tem na mão
        // sem precisar abrir o HUD. CSS em player-panel.css faz o resto.
        playerInfo.append(nameH3, infoGrid);
        playerPanel.append(portrait, playerInfo);

        const actionButtons = document.createElement('div');
        actionButtons.className = 'hud-action-buttons';
        const buttons = [
            { id: 'saveGameBtn', tooltip: t('hud.saveTooltip'), icon: '💾' },
            { id: 'settingsBtn', tooltip: t('hud.settingsTooltip', { key: getKeyForAction('config') }), icon: '⚙️' },
            { id: 'inventoryBtn', tooltip: t('hud.inventoryTooltip', { key: getKeyForAction('inventory') }), icon: '🎒' },
            { id: 'commerceBtn', tooltip: t('hud.commerceTooltip', { key: getKeyForAction('merchants') }), icon: '🛒' },
            { id: 'questsBtn', tooltip: t('quests.hud.tooltip'), icon: '📋' },
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
        // Badge "Equipado: X" — sibling do panel, posicionado pelo CSS.
        gameContainer.appendChild(equippedItem);

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

        // Botão Quests/Missões
        document.getElementById('questsBtn')?.addEventListener('click', async () => {
            try {
                const { toggleQuestPanel } = await import('../questSystem.js');
                toggleQuestPanel();
            } catch (e) {
                logger.warn('Quest system não disponível', e);
            }
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

        const xp = getSystem('xp');
        const lvl = xp?.getLevel?.() ?? 1;
        const curXp = xp?.getXP?.() ?? 0;
        const xpMax = xp?.getXPToNext?.() ?? 100;
        this.setHUDValue('hudPlayerLevel', String(lvl));
        this.setHUDValue('hudPlayerXP', `${curXp}/${xpMax}`);
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
        // Cache de valores anteriores — pula DOM write quando valor não
        // mudou. Antes: 1000+ setHUDValue/10s no profile, custo dominado
        // por `el.textContent = ...` que força reflow. Agora: só atualiza
        // quando valor muda de verdade (~5-10/10s típico).
        if (!this._lastValues) this._lastValues = Object.create(null);
        if (this._lastValues[id] === value) return;
        this._lastValues[id] = value;
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    /**
     * Atualiza o display de XP/Level via eventos do xpSystem.
     * @param {{level?:number, xp?:number, xpToNext?:number}} detail
     */
    updateXPDisplay(detail) {
        if (!detail) return;
        const xp = getSystem('xp');
        const lvl = detail.level ?? xp?.getLevel?.() ?? 1;
        const cur = detail.xp ?? xp?.getXP?.() ?? 0;
        const max = detail.xpToNext ?? xp?.getXPToNext?.() ?? 100;
        this.setHUDValue('hudPlayerLevel', String(lvl));
        this.setHUDValue('hudPlayerXP', `${cur}/${max}`);
    }

    /**
     * Pinta o badge "Equipado: <ícone> <nome>" abaixo do portrait do HUD.
     *
     * Issue #166: o badge vive FORA do `.player-info` (que só aparece no
     * hover do panel) — feedback constante do item equipado sem precisar
     * abrir o HUD. Esconde via `.hidden` quando `item` é null.
     *
     * Ouvido pelos eventos `itemEquipped` (call com `e.detail.item`) e
     * `itemUnequipped` (call com null), registrados no bottom deste arquivo.
     *
     * @param {object|null} item - Item completo (com `icon`, `name`, `id`)
     *   ou null pra esconder o badge.
     * @returns {void}
     */
    updateEquippedItem(item) {
        // Lembra do último item pra re-render em controlsChanged
        // (rebind de Q precisa atualizar a hint key no badge).
        this._lastEquippedItem = item;

        const equippedElement = document.getElementById('equipped-item');
        if (equippedElement) {
            if (item) {
                const itemName = getItemName(item.id, item.name);
                equippedElement.replaceChildren();
                const wrapper = document.createElement('div');
                wrapper.className = 'equipped-item-wrapper';
                // Label "Equipado: " — texto literal por enquanto; i18n
                // entra na parte final da issue #166 com player.equipped.
                const labelSpan = document.createElement('span');
                labelSpan.className = 'equipped-item-label';
                labelSpan.textContent = 'Equipado: ';
                const iconSpan = document.createElement('span');
                iconSpan.className = 'equipped-item-icon';
                if (item.icon && isImageIcon(item.icon)) {
                    const img = document.createElement('img');
                    img.src = item.icon;
                    img.alt = itemName;
                    iconSpan.appendChild(img);
                } else {
                    iconSpan.textContent = item.icon || '';
                }
                const nameSpan = document.createElement('span');
                nameSpan.className = 'equipped-item-name';
                nameSpan.textContent = itemName;

                // Hint da tecla do Q-wheel pra ensinar o atalho.
                // Lê do keybind atual (respeita rebind), em cinza/pequeno.
                const hintSpan = document.createElement('span');
                hintSpan.className = 'equipped-item-hint';
                const wheelKey = getKeyForAction('toolWheel');
                hintSpan.textContent = wheelKey ? `(${wheelKey})` : '';

                wrapper.append(labelSpan, iconSpan, nameSpan, hintSpan);
                equippedElement.appendChild(wrapper);
                equippedElement.classList.remove('hidden');
            } else {
                equippedElement.replaceChildren();
                equippedElement.classList.add('hidden');
            }
        }
    }

    destroy() {
        // Para o intervalo de atualização de necessidades
        if (this.needsUpdateInterval) {
            clearInterval(this.needsUpdateInterval);
            this.needsUpdateInterval = null;
        }

        // fix: removed all document event listeners added in init() and bindEvents()
        document.removeEventListener("playerNeedsChanged", this._onPlayerNeedsChanged);
        document.removeEventListener('characterSelected', this._onCharacterSelected);
        document.removeEventListener('playerReady', this._onPlayerReady);
        document.removeEventListener('xpGained', this._onXpGained);
        document.removeEventListener('levelUp', this._onLevelUp);
        document.removeEventListener('xpRestored', this._onXpRestored);
        document.removeEventListener('languageChanged', this._onLanguageChanged);
        document.removeEventListener('controlsChanged', this._onControlsChanged);
        document.removeEventListener('click', this._onHudClick);
        document.removeEventListener('moneyChanged', this._onMoneyChanged);

        // Remove elementos do DOM
        const panel = document.getElementById('playerPanel');
        if (panel) panel.remove();
        // fix: replaced forEach with for...of to avoid implicit return value lint warning
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
            if (this.isExpanded) panel.classList.remove('hidden');
            else panel.classList.add('hidden');
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