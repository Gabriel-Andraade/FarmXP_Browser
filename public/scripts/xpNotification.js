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

let cssInjected = false;

function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const css = `
    .xp-toast {
      position: fixed;
      left: 50%;
      top: 14%;
      transform: translateX(-50%) translateY(-12px);
      background: rgba(28, 36, 60, 0.92);
      border: 2px solid #6fb4ff;
      border-radius: 10px;
      padding: 8px 16px;
      color: #cde6ff;
      font-family: 'Roboto', sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      z-index: 15000;
      pointer-events: none;
      box-shadow: 0 6px 20px rgba(0,0,0,0.5), 0 0 14px rgba(111,180,255,0.35);
      opacity: 0;
      transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease;
    }
    .xp-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .xp-levelup {
      position: fixed;
      left: 50%;
      top: 30%;
      transform: translate(-50%, -50%) scale(0.8);
      background: linear-gradient(135deg, rgba(70, 44, 18, 0.96), rgba(120, 82, 28, 0.96));
      border: 3px solid #f5c86b;
      border-radius: 16px;
      padding: 22px 36px;
      min-width: 240px;
      text-align: center;
      color: #fff;
      font-family: 'Playfair Display', 'Georgia', serif;
      z-index: 15001;
      pointer-events: none;
      box-shadow: 0 14px 40px rgba(0,0,0,0.7), 0 0 32px rgba(245,200,107,0.5);
      opacity: 0;
      transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms cubic-bezier(.18,.89,.32,1.28);
    }
    .xp-levelup.visible {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    .xp-levelup-star { font-size: 2.5rem; line-height: 1; }
    .xp-levelup-title {
      font-size: 1.8rem;
      font-weight: 700;
      margin-top: 6px;
      color: #f5c86b;
      text-shadow: 0 2px 6px rgba(0,0,0,0.6);
    }
    .xp-levelup-sub {
      font-size: 0.95rem;
      font-weight: 400;
      color: #f5e9d3;
      margin-top: 4px;
      font-family: 'Roboto', sans-serif;
      letter-spacing: 0.4px;
    }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
}

// ─── Queue de XP toasts (coalesce quando vem rápido em sequência) ───────────────

let xpToastEl = null;
let xpToastHideTimer = null;
let xpAccumulated = 0;

function showXPToast(amount) {
    injectCSS();
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
    injectCSS();

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
