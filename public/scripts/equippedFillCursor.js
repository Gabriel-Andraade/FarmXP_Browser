/**
 * @file equippedFillCursor.js - Fill % label that follows the mouse cursor.
 * @description When a container tool (bucket / watering can) is equipped, show
 * its fill level at the upper-left of the cursor. Reuses fillLevel.js so the
 * value matches the inventory tooltip.
 * @module equippedFillCursor
 */

import { getSystem } from './gameState.js';
import { getItemFillLevel } from './fillLevel.js';

let _el = null;

function _ensureEl() {
  if (_el) return _el;
  _el = document.createElement('div');
  _el.id = 'equippedFillLabel';
  Object.assign(_el.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '9000',
    // Anchor the label's bottom-right at the point we set, so it sits at the
    // upper-left of the cursor.
    transform: 'translate(-100%, -100%)',
    padding: '2px 6px',
    borderRadius: '8px',
    font: 'bold 12px monospace',
    color: '#fff',
    background: 'rgba(20, 12, 6, 0.82)',
    border: '1px solid #c9a463',
    whiteSpace: 'nowrap',
    display: 'none',
  });
  document.body.appendChild(_el);
  return _el;
}

function _equippedId() {
  const eq = getSystem('player')?.getEquippedItem?.();
  if (eq == null) return null;
  return typeof eq === 'object' ? eq.id : eq;
}

function _onMove(e) {
  const id = _equippedId();
  const fill = id != null ? getItemFillLevel(id) : null;
  const el = _ensureEl();
  if (!fill) { el.style.display = 'none'; return; }
  el.textContent = `${fill.icon} ${fill.percent}%`;
  el.style.left = `${e.clientX - 6}px`;
  el.style.top = `${e.clientY - 6}px`;
  el.style.display = 'block';
}

function _hide() { if (_el) _el.style.display = 'none'; }

export function initEquippedFillCursor() {
  if (typeof document === 'undefined') return;
  document.addEventListener('mousemove', _onMove);
  document.addEventListener('mouseleave', _hide);
}

// Auto-init on import (browser only).
initEquippedFillCursor();
