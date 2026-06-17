/**
 * @file seedWheel.js - Quick seed selector overlay (hold E to open).
 *
 * Issue #165 (planting): mirrors the tool wheel (toolWheel.js) but lists the
 * player's SEEDS and, on release, sets the "active seed" — the seed the player
 * will plant on tilled soil. Reuses the `.tw-*` CSS for a consistent look.
 *
 * Opened with E (hold). E also interacts (tap); on empty ground the interact is
 * a no-op, so holding E to plant doesn't conflict in practice.
 *
 * @module SeedWheel
 */

import { getSystem, registerSystem } from '../gameState.js';
import { getItem } from '../itemUtils.js';
import { inventorySystem } from './inventorySystem.js';
import { t } from '../i18n/i18n.js';
import { logger } from '../logger.js';

const SLOT_NONE = '__none__';

const state = {
    open: false,
    entries: [],
    selectedIndex: 0,
    dom: null,
    activeSeedId: null, // the seed currently chosen to plant (null = none)
};

function _ensureDom() {
    if (state.dom) return state.dom;
    const overlay = document.createElement('div');
    overlay.className = 'tw-overlay';
    overlay.id = 'seedWheelOverlay';
    overlay.setAttribute('role', 'menu');
    overlay.setAttribute('aria-label', 'Seed selector');

    const row = document.createElement('div');
    row.className = 'tw-row';
    overlay.appendChild(row);

    const hint = document.createElement('div');
    hint.className = 'tw-hint';
    overlay.appendChild(hint);

    document.body.appendChild(overlay);
    state.dom = { overlay, row, hint };
    return state.dom;
}

/** Builds entries: index 0 = "no seed", then each seed in the inventory. */
function _refreshEntries() {
    const inv = inventorySystem.getInventory();
    const seedSlots = inv?.seeds?.items || [];

    const seeds = [];
    for (const slot of seedSlots) {
        const item = getItem(slot.id);
        if (!item || item.type !== 'seed') continue;
        seeds.push({ id: slot.id, item, quantity: slot.quantity || 1 });
    }

    state.entries = [{ id: SLOT_NONE, item: null, quantity: 0 }, ...seeds];

    const idx = state.activeSeedId != null
        ? state.entries.findIndex((e) => e.id === state.activeSeedId)
        : 0;
    state.selectedIndex = idx >= 0 ? idx : 0;
}

function _render() {
    const { row, hint } = _ensureDom();
    row.replaceChildren();

    state.entries.forEach((entry, idx) => {
        const slot = document.createElement('div');
        slot.className = 'tw-slot';
        if (idx === state.selectedIndex) slot.classList.add('tw-selected');
        if (entry.id === SLOT_NONE) slot.classList.add('tw-unequip');
        if (entry.id === state.activeSeedId && entry.id !== SLOT_NONE) slot.classList.add('tw-current');

        const iconBox = document.createElement('div');
        iconBox.className = 'tw-slot-icon';
        if (entry.id === SLOT_NONE) {
            iconBox.textContent = '✖';
        } else {
            const icon = entry.item.icon;
            if (typeof icon === 'string' && (icon.includes('/') || icon.startsWith('http'))) {
                const img = document.createElement('img');
                img.src = icon;
                img.alt = entry.item.name;
                iconBox.appendChild(img);
            } else {
                iconBox.textContent = icon || '🌱';
            }
        }

        const label = document.createElement('div');
        label.className = 'tw-slot-label';
        label.textContent = entry.id === SLOT_NONE
            ? (t('inventory.seedWheel.none') || 'Sem semente')
            : `${entry.item.name} (${entry.quantity})`;

        slot.append(iconBox, label);
        slot.addEventListener('mouseenter', () => _setSelection(idx));
        slot.addEventListener('click', () => {
            _setSelection(idx);
            closeSeedWheel(true);
        });
        row.appendChild(slot);
    });

    const sel = state.entries[state.selectedIndex];
    hint.textContent = !sel ? ''
        : sel.id === SLOT_NONE
            ? (t('inventory.seedWheel.none') || 'Sem semente')
            : sel.item.name;
}

function _setSelection(idx) {
    if (idx < 0 || idx >= state.entries.length) return;
    if (idx === state.selectedIndex) return;
    state.selectedIndex = idx;
    _render();
}

function cycleSelection(dir) {
    if (!state.open) return;
    const next = Math.max(0, Math.min(state.entries.length - 1, state.selectedIndex + dir));
    _setSelection(next);
}

function _onWheel(e) {
    if (!state.open) return;
    e.preventDefault();
    cycleSelection(e.deltaY > 0 ? 1 : -1);
}

function _showToast(text) {
    let existing = document.getElementById('seedWheelToast');
    if (existing) { existing.textContent = text; return; }
    const msg = document.createElement('div');
    msg.id = 'seedWheelToast';
    msg.className = 'inventory-message';
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => {
        msg.classList.remove('visible');
        setTimeout(() => msg.remove(), 300);
    }, 1300);
}

export function openSeedWheel() {
    if (state.open) return;
    _refreshEntries();
    if (state.entries.length <= 1) {
        logger.debug('[seedWheel] sem sementes no inventário');
        _showToast(t('inventory.seedWheel.empty') || 'Sem sementes no inventário');
        return;
    }
    state.open = true;
    _ensureDom().overlay.classList.add('tw-open');
    _render();
    window.addEventListener('wheel', _onWheel, { passive: false });
}

export function closeSeedWheel(commit = true) {
    if (!state.open) return;
    state.open = false;
    window.removeEventListener('wheel', _onWheel);
    if (state.dom?.overlay) state.dom.overlay.classList.remove('tw-open');

    if (!commit) return;
    const sel = state.entries[state.selectedIndex];
    if (!sel) return;
    state.activeSeedId = (sel.id === SLOT_NONE) ? null : sel.id;
}

export function isSeedWheelOpen() {
    return state.open;
}

/**
 * The seed currently chosen to plant, or null. Re-validates against the
 * inventory (a consumed/dropped seed clears the selection). Read by the
 * planting step.
 * @returns {Object|null} the seed item definition, or null.
 */
export function getActiveSeed() {
    if (state.activeSeedId == null) return null;
    const inv = inventorySystem.getInventory();
    const ok = (inv?.seeds?.items || []).some((s) => s.id === state.activeSeedId && (s.quantity || 0) > 0);
    if (!ok) { state.activeSeedId = null; return null; }
    return getItem(state.activeSeedId);
}

// Expose for the planting step / debug.
registerSystem('seedWheel', { getActiveSeed, isSeedWheelOpen });
