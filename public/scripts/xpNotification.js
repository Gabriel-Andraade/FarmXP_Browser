/**
 * @file xpNotification.js - Toasts de XP e level-up.
 * @description Escuta `xpGained` e `levelUp` e mostra popups curtos.
 *   - Toast de XP: linha discreta no canto (ex: "+50 XP").
 *   - Toast de Level-Up: popup maior, som/efeito visual.
 * Ambos auto-descartam e enfileiram se vários disparam juntos.
 * @module XPNotification
 */

import { t } from './i18n/i18n.js';

const XP_DISPLAY_MS = 1800;
const LEVEL_DISPLAY_MS = 3200;
const FADE_MS = 350;



// ─── Queue de XP toasts (coalesce quando vem rápido em sequência) ───────────────

let xpToastEl = null;
let xpToastHideTimer = null;
let xpAccumulated = 0;

function showXPToast(amount) {
    xpAccumulated += amount;

    if (!xpToastEl) {
        xpToastEl = document.createElement('div');
        xpToastEl.className = 'xp-toast';
        document.body.appendChild(xpToastEl);
    }
    xpToastEl.textContent = t('player.xpGain', { amount: xpAccumulated });
    // Force reflow for CSS transition
    void xpToastEl.offsetWidth;
    xpToastEl.classList.add('visible');

    if (xpToastHideTimer) clearTimeout(xpToastHideTimer);
    xpToastHideTimer = setTimeout(() => {
        if (!xpToastEl) return;
        xpToastEl.classList.remove('visible');
        setTimeout(() => {
            if (xpToastEl?.parentNode) xpToastEl.parentNode.removeChild(xpToastEl);
            xpToastEl = null;
            xpAccumulated = 0;
        }, FADE_MS);
    }, XP_DISPLAY_MS);
}

// ─── Level-up popup ─────────────────────────────────────────────────────────────

/** @type {Array<number>} fila de níveis a anunciar em sequência */
const levelUpQueue = [];
let showingLevelUp = false;

function enqueueLevelUp(level) {
    levelUpQueue.push(level);
    if (!showingLevelUp) _showNextLevelUp();
}

function _showNextLevelUp() {
    const level = levelUpQueue.shift();
    if (level == null) {
        showingLevelUp = false;
        return;
    }
    showingLevelUp = true;

    const el = document.createElement('div');
    el.className = 'xp-levelup';
    el.innerHTML = `
      <div class="xp-levelup-star">⭐</div>
      <div class="xp-levelup-title">${escapeHtml(t('player.levelUp', { level }))}</div>
      <div class="xp-levelup-sub">${escapeHtml(t('player.levelUpSub'))}</div>
    `;
    document.body.appendChild(el);
    void el.offsetWidth;
    el.classList.add('visible');

    setTimeout(() => {
        el.classList.remove('visible');
        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
            _showNextLevelUp();
        }, FADE_MS);
    }, LEVEL_DISPLAY_MS);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ─── Public init ────────────────────────────────────────────────────────────────

export function initXPNotifications() {
    document.addEventListener('xpGained', (e) => {
        const amount = e.detail?.amount || 0;
        if (amount > 0) showXPToast(amount);
    });
    document.addEventListener('levelUp', (e) => {
        const lvl = e.detail?.level;
        if (typeof lvl === 'number') enqueueLevelUp(lvl);
    });
}

// Auto-init quando o módulo for importado.
initXPNotifications();

export default { initXPNotifications };
