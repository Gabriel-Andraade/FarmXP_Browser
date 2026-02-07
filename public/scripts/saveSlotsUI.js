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
    _ensureModal() {
        if (this.modal) return;

        this.modal = document.createElement('div');
        this.modal.id = MODAL_ID;
        this.modal.className = 'save-modal-overlay';
        this.modal.innerHTML = `
            <div class="save-modal-container">
                <div class="save-modal-header">
                    <h2 class="save-modal-title">💾 ${t('saveSlots.titleSaveLoad')}</h2>
                    <button class="save-modal-close" aria-label="${t('ui.close')}">&times;</button>
                </div>
                <div class="save-modal-body">
                    <div class="save-slots-grid"></div>
                </div>
            </div>
        `;

        // Eventos
        this.modal.querySelector('.save-modal-close').addEventListener('click', () => this.close());
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

        grid.innerHTML = slots.map((slot, index) => this._renderSlotCard(slot, index)).join('');

        // Bind eventos dos botões
        this._bindSlotEvents(grid);
    }

    /**
     * Renderiza um card de slot
     * @param {Object|null} slot - Dados do slot
     * @param {number} index - Índice do slot
     * @returns {string} HTML do card
     */
    _renderSlotCard(slot, index) {
        const isEmpty = slot === null;
        const isActive = saveSystem.activeSlot === index;

        if (isEmpty) {
            return `
                <div class="save-slot-card save-slot-empty" data-slot="${index}">
                    <div class="save-slot-header">
                        <span class="save-slot-number">${t('saveSlots.slotNumber', { number: index + 1 })}</span>
                        <span class="save-slot-badge empty">${t('saveSlots.empty')}</span>
                    </div>
                    <div class="save-slot-empty-content">
                        <div class="save-slot-empty-icon">📁</div>
                        <p>${t('saveSlots.noSaveInSlot')}</p>
                    </div>
                    <div class="save-slot-actions">
                        ${this.mode !== 'load' ? `
                            <button class="save-btn save-btn-create" data-action="create" data-slot="${index}">
                                ✨ ${t('saveSlots.createSave')}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        const meta = slot.meta;
        return `
            <div class="save-slot-card ${isActive ? 'save-slot-active' : ''}" data-slot="${index}">
                <div class="save-slot-header">
                    <span class="save-slot-name" title="${escapeHtml(meta.saveName)}">${escapeHtml(meta.saveName)}</span>
                    ${isActive ? `<span class="save-slot-badge active">${t('saveSlots.active')}</span>` : ''}
                </div>

                <div class="save-slot-meta">
                    <div class="save-meta-row">
                        <span class="save-meta-label">👤 ${t('saveSlots.character')}</span>
                        <span class="save-meta-value">${escapeHtml(meta.characterName || 'Stella')}</span>
                    </div>
                    <div class="save-meta-row">
                        <span class="save-meta-label">⏱️ ${t('saveSlots.totalTime')}</span>
                        <span class="save-meta-value">${formatPlayTime(meta.totalPlayTimeMs)}</span>
                    </div>
                    <div class="save-meta-row">
                        <span class="save-meta-label">📅 ${t('saveSlots.createdAt')}</span>
                        <span class="save-meta-value">${formatDateTime(meta.createdAt)}</span>
                    </div>
                    <div class="save-meta-row">
                        <span class="save-meta-label">💾 ${t('saveSlots.lastSave')}</span>
                        <span class="save-meta-value">${formatDateTime(meta.lastSavedAt)}</span>
                    </div>
                    <div class="save-meta-row">
                        <span class="save-meta-label">🎮 ${t('saveSlots.lastSession')}</span>
                        <span class="save-meta-value">${formatPlayTime(meta.lastSessionMs)}</span>
                    </div>
                </div>

                <div class="save-slot-actions">
                    ${this.mode !== 'save' ? `
                        <button class="save-btn save-btn-load" data-action="load" data-slot="${index}">
                            ▶️ ${t('saveSlots.play')}
                        </button>
                    ` : ''}
                    ${this.mode !== 'load' ? `
                        <button class="save-btn save-btn-save" data-action="save" data-slot="${index}">
                            💾 ${t('saveSlots.save')}
                        </button>
                    ` : ''}
                    <button class="save-btn save-btn-rename" data-action="rename" data-slot="${index}">
                        ✏️
                    </button>
                    <button class="save-btn save-btn-delete" data-action="delete" data-slot="${index}">
                        🗑️
                    </button>
                </div>
            </div>
        `;
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
    _loadSave(slotIndex) {
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

        // 4. Aplicar dados (mundo, inventário, posição, clima)
        try {
            saveSystem.applySaveData(slot);
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
