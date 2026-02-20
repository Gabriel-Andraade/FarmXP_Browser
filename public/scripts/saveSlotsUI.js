/**
 * @file saveSlotsUI.js - Interface de Save/Load do FarmingXP
 * @description Modal para gerenciar os 3 slots de save.
 * Permite salvar, carregar, renomear e deletar saves.
 * @module SaveSlotsUI
 */

import { saveSystem, formatPlayTime, formatDateTime } from './saveSystem.js';
import { logger } from './logger.js';
import { getSystem } from './gameState.js';
import { t } from './i18n/i18n.js';
import { showLoadingScreen, updateLoadingProgress, hideLoadingScreen, blockInteractions, unblockInteractions } from './loadingScreen.js';


const MODAL_ID = 'save-slots-modal';

/**
 * Escapa caracteres HTML especiais para prevenir XSS em templates
 * @param {string} str - String para escapar
 * @returns {string} String escapada
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Classe que gerencia a interface de slots de save
 */
class SaveSlotsUI {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.mode = 'menu'; // 'menu', 'save', 'load'
        this.onLoadCallback = null;

        // Escutar mudanças nos saves
        document.addEventListener('save:changed', () => {
            if (this.isOpen) {
                this.render();
            }
        });
    }

    /**
     * Cria a estrutura do modal se não existir
     */
    // fix: innerHTML → DOM API
    _ensureModal() {
        if (this.modal) return;

        this.modal = document.createElement('div');
        this.modal.id = MODAL_ID;
        this.modal.className = 'save-modal-overlay';
        const container = document.createElement('div');
        container.className = 'save-modal-container';
        const headerDiv = document.createElement('div');
        headerDiv.className = 'save-modal-header';
        const titleH2 = document.createElement('h2');
        titleH2.className = 'save-modal-title';
        titleH2.textContent = `💾 ${t('saveSlots.titleSaveLoad')}`;
        const closeBtn = document.createElement('button');
        closeBtn.className = 'save-modal-close';
        closeBtn.setAttribute('aria-label', t('ui.close'));
        closeBtn.textContent = '\u00D7';
        headerDiv.append(titleH2, closeBtn);
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'save-modal-body';
        const gridDiv = document.createElement('div');
        gridDiv.className = 'save-slots-grid';
        bodyDiv.appendChild(gridDiv);
        container.append(headerDiv, bodyDiv);
        this.modal.appendChild(container);

        // Eventos
        closeBtn.addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        document.body.appendChild(this.modal);
    }

    /**
     * Abre o modal
     * @param {string} mode - Modo de operação ('menu', 'save', 'load')
     * @param {Function} onLoadCallback - Callback ao carregar um save
     */
    open(mode = 'menu', onLoadCallback = null) {
        this._ensureModal();
        this.mode = mode;
        this.onLoadCallback = onLoadCallback;

        // Atualizar título baseado no modo
        const title = this.modal.querySelector('.save-modal-title');
        if (mode === 'save') {
            title.textContent = '💾 ' + t('saveSlots.titleSave');
        } else if (mode === 'load') {
            title.textContent = '📂 ' + t('saveSlots.titleLoad');
        } else {
            title.textContent = '💾 ' + t('saveSlots.titleSaveLoad');
        }

        this.render();
        this.modal.classList.add('active');
        this.isOpen = true;

        logger.debug('SaveSlotsUI aberto no modo:', mode);
    }

    /**
     * Fecha o modal
     */
    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
        this.isOpen = false;
        this.onLoadCallback = null;
    }

    /**
     * Renderiza os slots
     */
    render() {
        if (!this.modal) return;

        const grid = this.modal.querySelector('.save-slots-grid');
        const slots = saveSystem.listSlots();

        // fix: innerHTML → DOM API
        grid.replaceChildren();
        slots.forEach((slot, index) => {
            grid.appendChild(this._renderSlotCard(slot, index));
        });

        this._bindSlotEvents(grid);
    }

    /**
     * Renderiza um card de slot
     * @param {Object|null} slot - Dados do slot
     * @param {number} index - Índice do slot
     * @returns {HTMLElement} Elemento do card
     */
    _renderSlotCard(slot, index) {
        const isEmpty = slot === null;
        const isActive = saveSystem.activeSlot === index;

        const card = document.createElement('div');
        card.dataset.slot = index;

        if (isEmpty) {
            card.className = 'save-slot-card save-slot-empty';

            const header = document.createElement('div');
            header.className = 'save-slot-header';
            const number = document.createElement('span');
            number.className = 'save-slot-number';
            number.textContent = t('saveSlots.slotNumber', { number: index + 1 });
            const badge = document.createElement('span');
            badge.className = 'save-slot-badge empty';
            badge.textContent = t('saveSlots.empty');
            header.append(number, badge);

            const emptyContent = document.createElement('div');
            emptyContent.className = 'save-slot-empty-content';
            const emptyIcon = document.createElement('div');
            emptyIcon.className = 'save-slot-empty-icon';
            emptyIcon.textContent = '📁';
            const emptyText = document.createElement('p');
            emptyText.textContent = t('saveSlots.noSaveInSlot');
            emptyContent.append(emptyIcon, emptyText);

            const actions = document.createElement('div');
            actions.className = 'save-slot-actions';
            if (this.mode !== 'load') {
                const createBtn = document.createElement('button');
                createBtn.className = 'save-btn save-btn-create';
                createBtn.dataset.action = 'create';
                createBtn.dataset.slot = index;
                createBtn.textContent = `✨ ${t('saveSlots.createSave')}`;
                actions.appendChild(createBtn);
            }

            card.append(header, emptyContent, actions);
            return card;
        }

        card.className = `save-slot-card ${isActive ? 'save-slot-active' : ''}`;

        const meta = slot.meta;

        const header = document.createElement('div');
        header.className = 'save-slot-header';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'save-slot-name';
        nameSpan.title = meta.saveName;
        nameSpan.textContent = meta.saveName;
        header.appendChild(nameSpan);
        if (isActive) {
            const activeBadge = document.createElement('span');
            activeBadge.className = 'save-slot-badge active';
            activeBadge.textContent = t('saveSlots.active');
            header.appendChild(activeBadge);
        }

        const metaDiv = document.createElement('div');
        metaDiv.className = 'save-slot-meta';
        const metaRows = [
            { icon: '👤', label: t('saveSlots.character'), value: meta.characterName || 'Stella' },
            { icon: '⏱️', label: t('saveSlots.totalTime'), value: formatPlayTime(meta.totalPlayTimeMs) },
            { icon: '📅', label: t('saveSlots.createdAt'), value: formatDateTime(meta.createdAt) },
            { icon: '💾', label: t('saveSlots.lastSave'), value: formatDateTime(meta.lastSavedAt) },
            { icon: '🎮', label: t('saveSlots.lastSession'), value: formatPlayTime(meta.lastSessionMs) },
        ];
        for (const row of metaRows) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'save-meta-row';
            const labelSpan = document.createElement('span');
            labelSpan.className = 'save-meta-label';
            labelSpan.textContent = `${row.icon} ${row.label}`;
            const valueSpan = document.createElement('span');
            valueSpan.className = 'save-meta-value';
            valueSpan.textContent = row.value;
            rowDiv.append(labelSpan, valueSpan);
            metaDiv.appendChild(rowDiv);
        }

        const actions = document.createElement('div');
        actions.className = 'save-slot-actions';
        if (this.mode !== 'save') {
            const loadBtn = document.createElement('button');
            loadBtn.className = 'save-btn save-btn-load';
            loadBtn.dataset.action = 'load';
            loadBtn.dataset.slot = index;
            loadBtn.textContent = `▶️ ${t('saveSlots.play')}`;
            actions.appendChild(loadBtn);
        }
        if (this.mode !== 'load') {
            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-btn save-btn-save';
            saveBtn.dataset.action = 'save';
            saveBtn.dataset.slot = index;
            saveBtn.textContent = `💾 ${t('saveSlots.save')}`;
            actions.appendChild(saveBtn);
        }
        const renameBtn = document.createElement('button');
        renameBtn.className = 'save-btn save-btn-rename';
        renameBtn.dataset.action = 'rename';
        renameBtn.dataset.slot = index;
        renameBtn.textContent = '✏️';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'save-btn save-btn-delete';
        deleteBtn.dataset.action = 'delete';
        deleteBtn.dataset.slot = index;
        deleteBtn.textContent = '🗑️';
        actions.append(renameBtn, deleteBtn);

        card.append(header, metaDiv, actions);
        return card;
    }

    /**
     * Vincula eventos aos botões dos slots
     * @param {HTMLElement} grid - Container dos slots
     */
    _bindSlotEvents(grid) {
        grid.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const slotIndex = parseInt(e.currentTarget.dataset.slot, 10);
                this._handleAction(action, slotIndex);
            });
        });
    }

    /**
     * Processa uma ação em um slot
     * @param {string} action - Ação (create, load, save, rename, delete)
     * @param {number} slotIndex - Índice do slot
     */
    _handleAction(action, slotIndex) {
        switch (action) {
            case 'create':
                this._createSave(slotIndex);
                break;
            case 'load':
                this._loadSave(slotIndex);
                break;
            case 'save':
                this._overwriteSave(slotIndex);
                break;
            case 'rename':
                this._renameSave(slotIndex);
                break;
            case 'delete':
                this._deleteSave(slotIndex);
                break;
        }
    }

    /**
     * Cria um novo save
     * @param {number} slotIndex - Índice do slot
     */
    _createSave(slotIndex) {
        const defaultName = t('saveSlots.defaultName', { number: slotIndex + 1 });
        const name = prompt(t('saveSlots.saveName'), defaultName);
        if (name === null) return; // Cancelou

        const success = saveSystem.createOrOverwriteSlot(slotIndex, {
            saveName: name || defaultName
        });

        if (success) {
            saveSystem.selectActiveSlot(slotIndex);
            this._showMessage(t('saveSlots.createSuccess'), 'success');
            this.render();
        } else {
            this._showMessage(t('saveSlots.createError'), 'error');
        }
    }

    /**
     * Carrega um save.
     * Se onLoadCallback está definido (ex: startup), usa fluxo simplificado:
     *   apenas lê os dados e repassa ao callback (quem chamou cuida do resto).
     * Se não há callback (load in-game), usa fluxo completo:
     *   pause -> loading -> block -> apply -> hide -> unblock -> resume.
     * @param {number} slotIndex - Índice do slot
     */
    async _loadSave(slotIndex) {
        // ── Fluxo simplificado (startup / callback externo) ──
        if (this.onLoadCallback) {
            const slot = saveSystem.loadSlot(slotIndex);
            if (slot) {
                this.onLoadCallback(slot, slotIndex);
                this.close();
            } else {
                this._showMessage(t('saveSlots.loadError'), 'error');
            }
            return;
        }

        // ── Fluxo completo (load in-game) ──

        // 1. Pausar simulação (congela tempo, clima, player, IA)
        document.dispatchEvent(new CustomEvent('game:pause'));

        // 2. Mostrar loading e bloquear interações
        // Nota: weather.pause() é chamado internamente por applySaveData -> _applyWeatherData
        showLoadingScreen();
        updateLoadingProgress(0.2, t('saveSlots.loading'));
        blockInteractions();

        // 3. Carregar dados brutos do slot
        const slot = saveSystem.loadSlot(slotIndex);

        if (!slot) {
            this._showMessage(t('saveSlots.loadError'), 'error');
            hideLoadingScreen();
            unblockInteractions();
            document.dispatchEvent(new CustomEvent('game:resume'));
            return;
        }

        updateLoadingProgress(0.5, t('saveSlots.applying'));

        // 4. Aplicar dados (mundo, inventário, posição, clima, personagem)
        try {
            await saveSystem.applySaveData(slot);
        } catch (e) {
            logger.error('Erro ao aplicar dados do save:', e);
            this._showMessage(t('saveSlots.applyError'), 'error');
        }

        updateLoadingProgress(1, t('saveSlots.ready'));

        // 5. Pequeno delay para UI atualizar, depois liberar tudo
        setTimeout(() => {
            hideLoadingScreen();
            unblockInteractions();
            document.dispatchEvent(new CustomEvent('game:resume'));
            this._showMessage(t('saveSlots.loadSuccess'), 'success');
        }, 600);

        this.close();
    }

    /**
     * Sobrescreve um save existente
     * @param {number} slotIndex - Índice do slot
     */
    _overwriteSave(slotIndex) {
        const meta = saveSystem.getSlotMeta(slotIndex);
        const confirmed = window.confirm(t('saveSlots.confirmOverwrite', { name: meta?.saveName || 'Save' }));

        if (!confirmed) return;

        const success = saveSystem.createOrOverwriteSlot(slotIndex);
        if (success) {
            this._showMessage(t('saveSlots.overwriteSuccess'), 'success');
            this.render();
        } else {
            this._showMessage(t('saveSlots.saveError'), 'error');
        }
    }

    /**
     * Renomeia um save
     * @param {number} slotIndex - Índice do slot
     */
    _renameSave(slotIndex) {
        const meta = saveSystem.getSlotMeta(slotIndex);
        const newName = prompt(t('saveSlots.newName'), meta?.saveName || '');

        if (newName === null) return; // Cancelou
        if (!newName.trim()) {
            this._showMessage(t('saveSlots.emptyNameError'), 'error');
            return;
        }

        const success = saveSystem.renameSlot(slotIndex, newName);
        if (success) {
            this._showMessage(t('saveSlots.renameSuccess'), 'success');
            this.render();
        } else {
            this._showMessage(t('saveSlots.renameError'), 'error');
        }
    }

    /**
     * Deleta um save
     * @param {number} slotIndex - Índice do slot
     */
    _deleteSave(slotIndex) {
        const meta = saveSystem.getSlotMeta(slotIndex);
        const confirmed = window.confirm(t('saveSlots.confirmDelete', { name: meta?.saveName || 'Save' }));

        if (!confirmed) return;

        const success = saveSystem.deleteSlot(slotIndex);
        if (success) {
            this._showMessage(t('saveSlots.deleteSuccess'), 'success');
            this.render();
        } else {
            this._showMessage(t('saveSlots.deleteError'), 'error');
        }
    }

    /**
     * Exibe uma mensagem temporária
     * @param {string} text - Texto da mensagem
     * @param {string} type - Tipo (success, error)
     */
    _showMessage(text, type = 'success') {
        // Por agora, usar alert/console
        // Pode ser melhorado para toast notification
        logger.info(`[SaveUI] ${text}`);

        // Criar toast simples
        const toast = document.createElement('div');
        toast.className = `save-toast save-toast-${type}`;
        toast.textContent = text;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Singleton
export const saveSlotsUI = new SaveSlotsUI();

// Expor globalmente para debug
if (typeof window !== 'undefined') {
    window.saveSlotsUI = saveSlotsUI;
}

export default saveSlotsUI;
