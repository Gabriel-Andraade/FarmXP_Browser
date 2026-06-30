/**
 * @file saveSlotsUI.js - Interface de Save/Load do FarmingXP
 * @description Modal para gerenciar os 3 slots de save.
 * Permite salvar, carregar, renomear e deletar saves.
 * @module SaveSlotsUI
 */

import { saveSystem, formatPlayTime, formatDateTime } from './saveSystem.js';
import { logger } from './logger.js';
import { getSystem, registerSystem } from './gameState.js';
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
        // Cleanup fn for an open _dialog(), so destroy() can tear it down
        // (otherwise its keydown listener + overlay leak). null when none open.
        this._activeDialogCleanup = null;

        // fix: store named handler so destroy() can remove it
        this._onSaveChanged = () => {
            if (this.isOpen) {
                this.render();
            }
        };
        document.addEventListener('save:changed', this._onSaveChanged);
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

        // #226: footer with full-backup actions (export all + import).
        const footerDiv = document.createElement('div');
        footerDiv.className = 'save-modal-footer';
        const exportAllBtn = document.createElement('button');
        exportAllBtn.className = 'save-btn save-btn-export-all';
        exportAllBtn.textContent = `📦 ${t('saveSlots.exportAll')}`;
        const importBtn = document.createElement('button');
        importBtn.className = 'save-btn save-btn-import';
        importBtn.textContent = `📥 ${t('saveSlots.import')}`;
        // One hidden file input reused for every import (per-slot and global).
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.display = 'none';
        footerDiv.append(exportAllBtn, importBtn, fileInput);
        this._importFileInput = fileInput;

        container.append(headerDiv, bodyDiv, footerDiv);
        this.modal.appendChild(container);

        // Eventos
        closeBtn.addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        exportAllBtn.addEventListener('click', () => this._exportAll());
        importBtn.addEventListener('click', () => this._triggerImport(null));
        fileInput.addEventListener('change', (e) => this._onImportFile(e));

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
                // #226: import a save file straight into this empty slot.
                const importBtn = document.createElement('button');
                importBtn.className = 'save-btn save-btn-import-slot';
                importBtn.dataset.action = 'import';
                importBtn.dataset.slot = index;
                importBtn.textContent = `📥 ${t('saveSlots.import')}`;
                actions.appendChild(importBtn);
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

        // Primary actions (Play / Save) — the main thing you do with a slot.
        const primaryRow = document.createElement('div');
        primaryRow.className = 'save-actions-primary';
        if (this.mode !== 'save') {
            const loadBtn = document.createElement('button');
            loadBtn.className = 'save-btn save-btn-load';
            loadBtn.dataset.action = 'load';
            loadBtn.dataset.slot = index;
            loadBtn.textContent = `▶️ ${t('saveSlots.play')}`;
            primaryRow.appendChild(loadBtn);
        }
        if (this.mode !== 'load') {
            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-btn save-btn-save';
            saveBtn.dataset.action = 'save';
            saveBtn.dataset.slot = index;
            saveBtn.textContent = `💾 ${t('saveSlots.save')}`;
            primaryRow.appendChild(saveBtn);
        }

        // Secondary actions — labelled (icon + word) so export/import read
        // clearly instead of bare arrows.
        const secondaryRow = document.createElement('div');
        secondaryRow.className = 'save-actions-secondary';
        const secondaryButtons = [
            { action: 'rename', cls: 'save-btn-rename', icon: '✏️', label: t('saveSlots.rename') },
            { action: 'export', cls: 'save-btn-export', icon: '📤', label: t('saveSlots.export') },
            { action: 'import', cls: 'save-btn-import-slot', icon: '📥', label: t('saveSlots.import') },
            { action: 'delete', cls: 'save-btn-delete', icon: '🗑️', label: t('saveSlots.delete') },
        ];
        for (const b of secondaryButtons) {
            const btn = document.createElement('button');
            btn.className = `save-btn ${b.cls}`;
            btn.dataset.action = b.action;
            btn.dataset.slot = index;
            btn.title = b.label;
            btn.textContent = `${b.icon} ${b.label}`;
            secondaryRow.appendChild(btn);
        }

        actions.append(primaryRow, secondaryRow);
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
    async _handleAction(action, slotIndex) {
        switch (action) {
            case 'create':
                await this._createSave(slotIndex);
                break;
            case 'load':
                await this._loadSave(slotIndex);
                break;
            case 'save':
                await this._overwriteSave(slotIndex);
                break;
            case 'rename':
                await this._renameSave(slotIndex);
                break;
            case 'delete':
                await this._deleteSave(slotIndex);
                break;
            case 'export':
                this._exportSlot(slotIndex);
                break;
            case 'import':
                this._triggerImport(slotIndex);
                break;
        }
    }

    // ───────────────── Export / Import (#226) ─────────────────

    /** Download a JSON string as a file. */
    _downloadJson(filename, json) {
        try {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            logger.error('Export failed:', e);
            this._showMessage(t('saveSlots.exportError'), 'error');
        }
    }

    _exportSlot(slotIndex) {
        const json = saveSystem.exportSlot(slotIndex);
        if (!json) { this._showMessage(t('saveSlots.exportEmpty'), 'error'); return; }
        this._downloadJson(`farmingxp-slot${slotIndex + 1}.json`, json);
        this._showMessage(t('saveSlots.exportSuccess'), 'success');
    }

    _exportAll() {
        this._downloadJson('farmingxp-saves.json', saveSystem.exportAll());
        this._showMessage(t('saveSlots.exportSuccess'), 'success');
    }

    /** Open the file picker; remembers the target slot (null = global import). */
    _triggerImport(slotIndex) {
        this._pendingImportSlot = (typeof slotIndex === 'number') ? slotIndex : null;
        if (!this._importFileInput) return;
        this._importFileInput.value = '';
        this._importFileInput.click();
    }

    async _onImportFile(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        let text;
        try { text = await file.text(); }
        catch (_) { this._showMessage(t('saveSlots.importError'), 'error'); return; }
        await this._applyImport(text, this._pendingImportSlot);
    }

    async _applyImport(text, slotIndex) {
        let kind;
        try { kind = JSON.parse(text)?.kind; } catch (_) { /* importData reports the error */ }

        let res;
        if (slotIndex != null) {
            // Per-slot import accepts a single-slot file only.
            if (kind === 'all') { this._showMessage(t('saveSlots.importUseAll'), 'error'); return; }
            if (!saveSystem.isSlotEmpty(slotIndex)) {
                const ok = await this._dialog({
                    message: t('saveSlots.importOverwrite', { number: slotIndex + 1 }),
                    success: true,
                });
                if (!ok) return;
            }
            res = saveSystem.importData(text, { targetSlot: slotIndex });
        } else if (kind === 'all') {
            const ok = await this._dialog({ message: t('saveSlots.importAllConfirm'), success: true });
            if (!ok) return;
            res = saveSystem.importData(text);
        } else {
            // Single-slot file via the global button → ask which slot (1-3).
            const raw = await this._dialog({ message: t('saveSlots.importChooseSlot'), input: true, defaultValue: '1' });
            if (raw === null) return;
            const n = parseInt(raw, 10);
            if (!(n >= 1 && n <= 3)) { this._showMessage(t('saveSlots.importBadSlot'), 'error'); return; }
            res = saveSystem.importData(text, { targetSlot: n - 1 });
        }

        if (res?.ok) {
            this._showMessage(t('saveSlots.importSuccess'), 'success');
            this.render();
        } else {
            this._showMessage(`${t('saveSlots.importError')}${res?.reason ? ` (${res.reason})` : ''}`, 'error');
        }
    }

    /**
     * Cria um novo save
     * @param {number} slotIndex - Índice do slot
     */
    async _createSave(slotIndex) {
        const defaultName = t('saveSlots.defaultName', { number: slotIndex + 1 });
        const name = await this._dialog({
            message: t('saveSlots.saveName'),
            input: true,
            defaultValue: defaultName,
        });
        if (name === null) return; // Cancelou

        // Trim so whitespace-only names fall back to the default (mirrors the
        // rename flow, which already rejects blank names).
        const normalizedName = (name ?? '').trim();
        const success = saveSystem.createOrOverwriteSlot(slotIndex, {
            saveName: normalizedName || defaultName
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
    async _overwriteSave(slotIndex) {
        const meta = saveSystem.getSlotMeta(slotIndex);
        const confirmed = await this._dialog({
            message: t('saveSlots.confirmOverwrite', { name: meta?.saveName || 'Save' }),
            danger: true, // overwriting discards the previous save irreversibly
        });

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
    async _renameSave(slotIndex) {
        const meta = saveSystem.getSlotMeta(slotIndex);
        const newName = await this._dialog({
            message: t('saveSlots.newName'),
            input: true,
            defaultValue: meta?.saveName || '',
        });

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
    async _deleteSave(slotIndex) {
        const meta = saveSystem.getSlotMeta(slotIndex);
        const confirmed = await this._dialog({
            message: t('saveSlots.confirmDelete', { name: meta?.saveName || 'Save' }),
            danger: true,
        });

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
     * In-DOM dialog replacing native prompt()/confirm(), which throw
     * "not supported" inside the game's embedded webview. Returns a Promise:
     *   - input mode  → resolves to the entered string, or null if cancelled
     *   - confirm mode → resolves to true (confirmed) or false (cancelled)
     * @param {Object} opts
     * @param {string} opts.message - Prompt/confirmation text (\n renders as line break)
     * @param {boolean} [opts.input] - Show a text field (prompt mode)
     * @param {string} [opts.defaultValue] - Initial value for the text field
     * @param {boolean} [opts.danger] - Style the confirm button as destructive
     * @returns {Promise<string|null|boolean>}
     */
    _dialog({ message, input = false, defaultValue = '', danger = false, success = false }) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'save-dialog-overlay';
            overlay.setAttribute('role', 'presentation');

            // Unique id so aria-labelledby is correct even if dialogs ever overlap.
            const msgId = `save-dialog-msg-${Date.now()}`;
            const box = document.createElement('div');
            box.className = 'save-dialog';
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');
            box.setAttribute('aria-labelledby', msgId);

            const msg = document.createElement('p');
            msg.id = msgId;
            msg.className = 'save-dialog-message';
            msg.textContent = message;
            box.appendChild(msg);

            let field = null;
            if (input) {
                field = document.createElement('input');
                field.type = 'text';
                field.className = 'save-dialog-input';
                field.value = defaultValue;
                field.maxLength = 30;
                box.appendChild(field);
            }

            const actions = document.createElement('div');
            actions.className = 'save-dialog-actions';
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'save-btn save-dialog-cancel';
            cancelBtn.textContent = t('ui.cancel');
            const okBtn = document.createElement('button');
            const okVariant = danger ? ' save-dialog-danger' : (success ? ' save-dialog-success' : '');
            okBtn.className = `save-btn save-dialog-ok${okVariant}`;
            okBtn.textContent = input ? t('ui.ok') : t('ui.confirm');
            actions.append(cancelBtn, okBtn);
            box.appendChild(actions);
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            // Settle once: tear down listeners + DOM, then resolve.
            const settle = (result) => {
                document.removeEventListener('keydown', onKey);
                overlay.remove();
                this._activeDialogCleanup = null;
                resolve(result);
            };
            const confirm = () => settle(input ? field.value : true);
            const cancel = () => settle(input ? null : false);

            const onKey = (e) => {
                if (e.key === 'Enter') { e.preventDefault(); confirm(); }
                else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
            };
            document.addEventListener('keydown', onKey);
            // Let destroy() abort an open dialog (cancel-equivalent resolution).
            this._activeDialogCleanup = () => cancel();

            okBtn.addEventListener('click', confirm);
            cancelBtn.addEventListener('click', cancel);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cancel(); });

            // Focus after paint so the field/button is ready.
            requestAnimationFrame(() => {
                if (field) { field.focus(); field.select(); }
                else okBtn.focus();
            });
        });
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

    // fix: added destroy() for proper teardown of persistent listeners
    destroy() {
        // Tear down an open dialog first, else its keydown handler + overlay leak.
        if (this._activeDialogCleanup) {
            this._activeDialogCleanup();
        }

        if (this._onSaveChanged) {
            document.removeEventListener('save:changed', this._onSaveChanged);
            this._onSaveChanged = null;
        }

        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }

        this.isOpen = false;
        this.onLoadCallback = null;

        logger.debug('SaveSlotsUI destruído');
    }
}

// Singleton
export const saveSlotsUI = new SaveSlotsUI();
// fix: register as system for gameCleanup auto-discovery
registerSystem('saveSlotsUI', saveSlotsUI);

// Expor globalmente para debug
if (typeof window !== 'undefined') {
    window.saveSlotsUI = saveSlotsUI;
}

export default saveSlotsUI;
