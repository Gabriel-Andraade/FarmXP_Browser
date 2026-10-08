/**
 * @file pauseMenu.js - Esc pause menu (#261).
 *
 * Freezes the world behind a dimmed overlay and offers: continue, save,
 * settings, inventory, help, quit to the main menu, quit the game.
 *
 * ## Who owns the pause
 *
 * `game:pause` / `game:resume` are plain document events with several senders
 * (dialogues, the save modal, the Steam overlay). While this menu is open it is
 * the owner: a `game:resume` from anyone else is answered with a fresh
 * `game:pause`, so closing a panel opened *from* the menu leaves the world
 * frozen and the menu on screen. Nothing dispatches `game:resume` in reaction to
 * `game:pause`, so there is no loop.
 *
 * ## Esc
 *
 * Esc is already handled by ~16 other panels. This menu only claims the key
 * when none of them is on screen — see `OVERLAY_SELECTORS`.
 */
import { t } from './i18n/i18n.js';
import { logger } from './logger.js';
import { registerSystem, getSystem } from './gameState.js';
// #264: one owner for "is a panel open" — the pause menu used to keep its own
// list, which could not see the inventory's shadow root, so Escape reached past
// it and opened this menu on top.
import { openPanel, onScreen } from './thePlayer/input/panels.js';
import { current as currentSource } from './thePlayer/input/inputSource.js';

/** The menu's own rows, in the order the mockup shows them. */
export const ITEMS = [
    { id: 'continue', icon: '▶', i18n: 'pause.continue', fallback: 'Continuar' },
    { id: 'save', icon: '💾', i18n: 'pause.save', fallback: 'Salvar jogo' },
    { id: 'settings', icon: '⚙', i18n: 'pause.settings', fallback: 'Configurações' },
    { id: 'inventory', icon: '🎒', i18n: 'pause.inventory', fallback: 'Inventário' },
    { id: 'help', icon: '📖', i18n: 'pause.help', fallback: 'Ajuda' },
    { id: 'mainMenu', icon: '🚪', i18n: 'pause.mainMenu', fallback: 'Sair para o menu principal' },
    // Only in the desktop shell: a browser tab cannot close itself unless a
    // script opened it, so the row would be a dead button on the web.
    { id: 'quit', icon: '⏻', i18n: 'pause.quit', fallback: 'Sair do jogo', shellOnly: true },
];

/** The shell exposes `cefQuery`; the browser does not. */
const inShell = () => typeof window.cefQuery === 'function';

const safeT = (key, fallback) => {
    try {
        const value = t(key);
        return value && value !== key ? value : fallback;
    } catch {
        return fallback;
    }
};

class PauseMenu {
    constructor() {
        this.isOpen = false;
        this.root = null;
        this._items = [];
        this._focusIndex = 0;
        this._reasserting = false;
        registerSystem('pauseMenu', this);
    }

    init() {
        if (this._initialised) return;
        this._initialised = true;

        document.addEventListener('keydown', (e) => this._onKeydown(e));
        // While we hold the pause, take it back from anyone who resumes.
        document.addEventListener('game:resume', () => this._reassertPause());
        logger.info('Pause menu ready');
    }

    // ── Esc ────────────────────────────────────────────────────────────────

    _onKeydown(e) {
        if (e.key !== 'Escape') return;
        // On a controller this menu is opened by Start and closed by B, both
        // direct calls. Escape there is only ever a synthetic event the input
        // layer sends to close *another* panel — answering it meant B closed
        // the inventory and opened this menu on the same press.
        if (currentSource() === 'gamepad') return;
        // Whatever is on top owns the key — including when the menu is already
        // open. This listener is registered before any panel's, so without the
        // check one Esc closed both layers: the exit confirmation cancelled
        // *and* the menu, dropping the player into a running world.
        if (this._panelOnTop()) return;
        if (this.isOpen) {
            e.preventDefault();
            this.close();
            return;
        }
        if (!this._canOpen()) return;
        e.preventDefault();
        this.open();
    }

    /** Is one of the known panels currently covering us? */
    _panelOnTop() {
        return openPanel({ includePause: false }) !== null;
    }

    /** Only in the world, with no other panel holding the screen. */
    _canOpen() {
        if (document.getElementById('gameCanvas') === null) return false;
        // Build mode owns Escape: there it means "leave build", and opening the
        // pause menu on the same key did both at once (keyboard included).
        if (document.body?.classList.contains('building-mode')) return false;
        return !this._panelOnTop();
    }

    // ── Open / close ───────────────────────────────────────────────────────

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this._build();
        this.root.classList.add('active');
        document.dispatchEvent(new CustomEvent('game:pause'));
        this._focusIndex = 0;
        this._focusCurrent();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.root?.classList.remove('active');
        // Our own resume must not be bounced back by the guard.
        this._reasserting = true;
        document.dispatchEvent(new CustomEvent('game:resume'));
        this._reasserting = false;
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    /**
     * A panel opened from this menu (save, settings) may resume the world when
     * it closes. While the menu is up, the world stays frozen.
     */
    _reassertPause() {
        if (!this.isOpen || this._reasserting) return;
        this._reasserting = true;
        document.dispatchEvent(new CustomEvent('game:pause'));
        this._reasserting = false;
    }

    // ── DOM ────────────────────────────────────────────────────────────────

    _build() {
        if (this.root) {
            this._relabel();
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'pause-overlay';
        overlay.id = 'pauseMenu';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'pause-title');

        const panel = document.createElement('div');
        panel.className = 'pause-panel';

        // Header: icon + title + close
        const header = document.createElement('div');
        header.className = 'pause-header';
        const title = document.createElement('h2');
        title.className = 'pause-title';
        title.id = 'pause-title';
        title.textContent = safeT('pause.title', 'Pausado');
        const closeBtn = document.createElement('button');
        closeBtn.className = 'pause-close';
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', safeT('pause.continue', 'Continuar'));
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.close());
        header.append(title, closeBtn);

        // Rows
        const list = document.createElement('div');
        list.className = 'pause-items';
        this._items = [];
        for (const item of ITEMS) {
            if (item.shellOnly && !inShell()) continue;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pause-item';
            btn.dataset.action = item.id;

            const icon = document.createElement('span');
            icon.className = 'pause-item-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = item.icon;

            const label = document.createElement('span');
            label.className = 'pause-item-label';
            label.textContent = safeT(item.i18n, item.fallback);

            btn.append(icon, label);
            // `_run` is async (dynamic imports, the confirm dialog) and this is
            // a plain listener: an unhandled rejection here would leave the
            // player clicking a row that silently does nothing.
            btn.addEventListener('click', () => {
                this._run(item.id).catch((err) => logger.error('[PauseMenu] action failed:', err));
            });
            btn.addEventListener('mouseenter', () => {
                this._focusIndex = this._items.indexOf(btn);
                this._focusCurrent();
            });
            list.appendChild(btn);
            this._items.push(btn);
        }

        const footer = document.createElement('div');
        footer.className = 'pause-footer';
        footer.textContent = '— 🌱 FarmingXP —';

        panel.append(header, list, footer);
        overlay.appendChild(panel);
        // Clicking the dark area is the same as Continue.
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });
        overlay.addEventListener('keydown', (e) => this._onMenuKey(e));
        // #264: the controller moves focus directly, so the menu's own
        // highlight follows focus rather than tracking a second index that
        // would drift out of step with it.
        overlay.addEventListener('focusin', (e) => {
            const index = this._items.indexOf(e.target);
            if (index >= 0) {
                this._focusIndex = index;
                this._items.forEach((btn, i) => btn.classList.toggle('selected', i === index));
            }
        });

        document.body.appendChild(overlay);
        this.root = overlay;
    }

    /** Language can change while the menu exists. */
    _relabel() {
        this.root.querySelector('.pause-title').textContent = safeT('pause.title', 'Pausado');
        for (const btn of this._items) {
            const item = ITEMS.find((i) => i.id === btn.dataset.action);
            if (item) btn.querySelector('.pause-item-label').textContent = safeT(item.i18n, item.fallback);
        }
    }

    // ── Keyboard navigation ────────────────────────────────────────────────

    _onMenuKey(e) {
        const last = this._items.length - 1;
        if (e.key === 'Tab') {
            // Own focus cycling instead of a11y.trapFocus: the menu keeps panels
            // open on top of itself, and a11y holds a single `_previousFocus`,
            // so nesting traps would lose the return target. This handler is on
            // the menu's own element, so it only runs while focus is inside it,
            // and stands down entirely while a panel covers the menu.
            if (this._panelOnTop()) return;
            e.preventDefault();
            const step = e.shiftKey ? -1 : 1;
            this._focusIndex = (this._focusIndex + step + this._items.length) % this._items.length;
            this._focusCurrent();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this._focusIndex = this._focusIndex >= last ? 0 : this._focusIndex + 1;
            this._focusCurrent();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this._focusIndex = this._focusIndex <= 0 ? last : this._focusIndex - 1;
            this._focusCurrent();
        } else if (e.key === 'Home') {
            e.preventDefault();
            this._focusIndex = 0;
            this._focusCurrent();
        } else if (e.key === 'End') {
            e.preventDefault();
            this._focusIndex = last;
            this._focusCurrent();
        }
    }

    _focusCurrent() {
        this._items.forEach((btn, i) => btn.classList.toggle('selected', i === this._focusIndex));
        this._items[this._focusIndex]?.focus();
    }

    // ── Actions ────────────────────────────────────────────────────────────

    async _run(action) {
        switch (action) {
            case 'continue':
                this.close();
                break;
            case 'save':
                getSystem('saveSlotsUI')?.open?.('save');
                this._handOffFocus('.save-modal-overlay.active');
                break;
            case 'settings':
                document.getElementById('configModal')?.classList.add('active');
                this._handOffFocus('#configModal.active');
                break;
            case 'inventory':
                (await import('./thePlayer/inventoryUI.js')).openInventoryModal();
                this._handOffFocus('#inventoryModal.open, .inv-overlay.open');
                break;
            case 'help':
                (await import('./helpPanel.js')).toggleHelpPanel(true);
                this._handOffFocus('#khp-help-overlay.is-open');
                break;
            case 'mainMenu':
                await this._leave('mainMenu');
                break;
            case 'quit':
                await this._leave('quit');
                break;
        }
    }

    /**
     * Move focus into a panel this menu just opened.
     *
     * Without it focus stays on the menu row behind the panel, and a keyboard
     * player tabs around the menu they cannot see instead of reaching the
     * panel's controls. One frame's wait so the panel is rendered and its
     * buttons are focusable.
     */
    _handOffFocus(selector) {
        const focusIt = () => {
            const panel = document.querySelector(selector);
            if (!panel) return;
            const target = panel.querySelector(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            (target ?? panel).focus?.();
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focusIt);
        else focusIt();
    }

    /**
     * Both exits throw away the world in memory, so both ask first and offer to
     * save. `_dialog()` is the game's in-DOM prompt — the shell has no native
     * confirm(), and a browser one would look nothing like the game.
     */
    async _leave(kind) {
        const choice = await this._confirmLeave(kind);
        if (choice === 'cancel') return;

        if (choice === 'save') {
            const save = getSystem('save');
            const saved = save?.activeSlot != null && save.saveActive('quit');
            if (!saved) {
                // No active slot (or the write failed): send them to the save
                // panel instead of leaving with the progress on the floor.
                getSystem('saveSlotsUI')?.open?.('save');
                return;
            }
        }

        if (kind === 'quit') {
            this._quitApp();
        } else {
            this.close();
            getSystem('mainMenu')?.show?.();
        }
    }

    /** @returns {Promise<'save'|'discard'|'cancel'>} */
    async _confirmLeave(kind) {
        const ui = getSystem('saveSlotsUI');
        const message = kind === 'quit'
            ? safeT('pause.confirmQuit', 'Sair do jogo? Progresso não salvo será perdido.')
            : safeT('pause.confirmMainMenu', 'Voltar ao menu principal? Progresso não salvo será perdido.');

        // Reuse the save UI's dialog so the look matches the rest of the game —
        // the shell has no native confirm(), and a browser one would not either.
        if (typeof ui?._dialog !== 'function') return 'cancel';

        const answer = await ui._dialog({
            message,
            danger: true,
            okLabel: safeT('pause.exitAnyway', 'Sair assim mesmo'),
            secondary: { label: safeT('pause.saveAndExit', 'Salvar e sair'), value: 'save' },
        });
        if (answer === 'save') return 'save';
        return answer ? 'discard' : 'cancel';
    }

    /** Ask the shell to close. Nothing to do on the web — the row is hidden there. */
    _quitApp() {
        if (!inShell()) return;
        window.cefQuery({
            request: 'app:quit',
            onSuccess() {},
            onFailure(code, msg) { logger.error(`[PauseMenu] quit failed: ${code} ${msg}`); },
        });
    }
}

export const pauseMenu = new PauseMenu();
export default pauseMenu;
