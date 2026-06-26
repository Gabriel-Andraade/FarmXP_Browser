/**
 * @file waterTroughPanel.js - Painel modal pra interagir com o cocho de água
 *
 * Aberto ao clicar no "+" sobre o cocho. Mostra:
 *   - Nível atual de água (barra + texto)
 *   - Botão "Adicionar água" → consome 1 balde com água (id 42) e devolve
 *     balde vazio (id 16), via `waterTroughSystem.depositBucketWater`.
 *
 * Estilo: classes `wtp-*` em `water-trough-panel.css` — mesma linguagem
 * visual de `enclosure-animal-panel.css` (marrom + dourado + Georgia).
 *
 * API:
 *   openWaterTroughPanel(waterTrough)  — abre o modal pra esse cocho
 *   closeWaterTroughPanel()            — fecha (ESC, click fora, X)
 */

import { getSystem } from './gameState.js';
import { inventorySystem } from './thePlayer/inventorySystem.js';
import { t } from './i18n/i18n.js';

const OVERLAY_ID = 'water-trough-panel';
const BUCKET_WATER_ID = 42; // legacy full-bucket item (no longer used)
const BUCKET_EMPTY_ID = 16; // the bucket tool; its water lives in bucketSystem

// #NNN: the player can fill a trough when they hold a bucket (16) that has water.
function _hasWaterBucket() {
  return inventorySystem.getItemQuantity(BUCKET_EMPTY_ID) > 0
    && !!getSystem('bucket')?.hasWater?.();
}

let _activeTroughId = null;
let _abortController = null;

export function openWaterTroughPanel(waterTrough) {
  if (!waterTrough?.id) return;

  if (_activeTroughId && _activeTroughId !== waterTrough.id) {
    closeWaterTroughPanel();
  }
  _activeTroughId = waterTrough.id;

  const old = document.getElementById(OVERLAY_ID);
  if (old) old.remove();

  _abortController?.abort();
  _abortController = new AbortController();
  const { signal } = _abortController;

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'wtp-card';

  // Header
  const header = document.createElement('div');
  header.className = 'wtp-header';
  const title = document.createElement('h2');
  title.className = 'wtp-title';
  title.textContent = t('waterTrough.panel.title') || 'Cocho de Água';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'wtp-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', t('waterTrough.panel.close') || 'Fechar');
  closeBtn.addEventListener('click', () => closeWaterTroughPanel(), { signal });
  header.append(title, closeBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'wtp-body';

  // Nível atual (barra + texto)
  const levelWrap = document.createElement('div');
  levelWrap.className = 'wtp-level';
  const levelLabel = document.createElement('div');
  levelLabel.className = 'wtp-level-label';
  const levelName = document.createElement('span');
  levelName.className = 'wtp-level-name';
  levelName.textContent = `💧 ${t('waterTrough.panel.levelName') || 'Nível de água'}`;
  const levelText = document.createElement('span');
  levelText.className = 'wtp-level-text';
  levelLabel.append(levelName, levelText);
  const barOuter = document.createElement('div');
  barOuter.className = 'wtp-bar';
  const barFill = document.createElement('div');
  barFill.className = 'wtp-bar-fill';
  barOuter.appendChild(barFill);
  levelWrap.append(levelLabel, barOuter);

  // Botão "Adicionar água"
  const actions = document.createElement('div');
  actions.className = 'wtp-actions';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'wtp-add-btn';
  addBtn.textContent = t('waterTrough.panel.addBtn') || 'Adicionar água';

  // Toast inline
  const toast = document.createElement('div');
  toast.className = 'wtp-toast';
  function setToast(msg, state = '') {
    toast.textContent = msg || '';
    if (state) toast.dataset.state = state;
    else delete toast.dataset.state;
  }

  function render() {
    const sys = getSystem('waterTrough');
    const level = sys?.getWaterLevel?.(waterTrough.id) ?? 0;
    const max = sys?.getMaxWaterLevel?.() ?? 100;
    const pct = Math.max(0, Math.min(100, (level / max) * 100));

    levelText.textContent = `${Math.round(level)} / ${max}`;
    barFill.style.width = `${pct}%`;
    barOuter.dataset.full = pct >= 100 ? '1' : '0';

    const isFull = pct >= 100;
    const noBucket = !_hasWaterBucket();

    addBtn.disabled = isFull || noBucket;
    if (isFull) {
      addBtn.title = t('waterTrough.alreadyFull') || 'Cocho já está cheio';
    } else if (noBucket) {
      addBtn.title = t('waterTrough.needBucket') || 'Precisa de um balde com água';
    } else {
      addBtn.title = '';
    }
  }

  addBtn.addEventListener('click', () => {
    const sys = getSystem('waterTrough');
    if (!sys) return;
    const ok = sys.depositBucketWater(waterTrough.id);
    if (ok) {
      setToast(t('waterTrough.filled') || 'Cocho abastecido', 'success');
    } else {
      const noBucket = !_hasWaterBucket();
      setToast(
        noBucket
          ? (t('waterTrough.needBucket') || 'Precisa de um balde com água')
          : (t('waterTrough.alreadyFull') || 'Cocho já está cheio'),
        noBucket ? 'error' : 'info'
      );
    }
    render();
  }, { signal });

  actions.append(addBtn, toast);
  body.append(levelWrap, actions);

  card.append(header, body);
  overlay.appendChild(card);

  // Click fora do card fecha
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeWaterTroughPanel();
  }, { signal });

  // ESC fecha (capture pra interceptar antes de outros listeners)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeWaterTroughPanel();
    }
  }, { capture: true, signal });

  // Re-renderiza quando inventário muda ou depósito é feito
  document.addEventListener('inventoryUpdated', render, { signal });
  document.addEventListener('waterDeposited', render, { signal });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('wtp-visible'));
  render();
}

export function closeWaterTroughPanel() {
  _abortController?.abort();
  _abortController = null;
  _activeTroughId = null;
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.classList.remove('wtp-visible');
    setTimeout(() => overlay.remove(), 320);
  }
}

export default { openWaterTroughPanel, closeWaterTroughPanel };
