/**
 * @file foodTroughPanelSimple.js - Painel modal pra cocho de ração
 * Espelhado de waterTroughPanel.js — simples, um botão só.
 */

import { getSystem } from './gameState.js';
import { inventorySystem } from './thePlayer/inventorySystem.js';
import { t } from './i18n/i18n.js';

const OVERLAY_ID = 'food-trough-panel';

let _activeTroughId = null;
let _abortController = null;

export function openFoodTroughPanel(foodTrough) {
  if (!foodTrough?.id) return;

  if (_activeTroughId && _activeTroughId !== foodTrough.id) {
    closeFoodTroughPanel();
  }
  _activeTroughId = foodTrough.id;

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
  card.className = 'ftp-card';

  // Header
  const header = document.createElement('div');
  header.className = 'ftp-header';
  const title = document.createElement('h2');
  title.className = 'ftp-title';
  title.textContent = t('foodTrough.panel.title') || 'Cocho de Ração';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'ftp-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', t('foodTrough.panel.close') || 'Fechar');
  closeBtn.addEventListener('click', () => closeFoodTroughPanel(), { signal });
  header.append(title, closeBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'ftp-body';

  // Basic food bar (brown)
  const levelWrap = document.createElement('div');
  levelWrap.className = 'ftp-level';
  const levelLabel = document.createElement('div');
  levelLabel.className = 'ftp-level-label';
  const levelName = document.createElement('span');
  levelName.className = 'ftp-level-name';
  levelName.textContent = `🌾 ${t('foodTrough.panel.levelName') || 'Nível de ração'}`;
  const levelText = document.createElement('span');
  levelText.className = 'ftp-level-text';
  levelLabel.append(levelName, levelText);
  const barOuter = document.createElement('div');
  barOuter.className = 'ftp-bar';
  const barFill = document.createElement('div');
  barFill.className = 'ftp-bar-fill';
  barOuter.appendChild(barFill);
  levelWrap.append(levelLabel, barOuter);

  // Premium ("tempero") bar (gold)
  const premiumWrap = document.createElement('div');
  premiumWrap.className = 'ftp-level';
  const premiumLabel = document.createElement('div');
  premiumLabel.className = 'ftp-level-label';
  const premiumName = document.createElement('span');
  premiumName.className = 'ftp-level-name';
  premiumName.textContent = `✨ ${t('foodTrough.panel.premiumName') || 'Tempero especial'}`;
  const premiumText = document.createElement('span');
  premiumText.className = 'ftp-level-text';
  premiumLabel.append(premiumName, premiumText);
  const premiumBarOuter = document.createElement('div');
  premiumBarOuter.className = 'ftp-bar ftp-bar-premium';
  const premiumBarFill = document.createElement('div');
  premiumBarFill.className = 'ftp-bar-fill';
  premiumBarOuter.appendChild(premiumBarFill);
  premiumWrap.append(premiumLabel, premiumBarOuter);

  // Buttons
  const actions = document.createElement('div');
  actions.className = 'ftp-actions';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'ftp-add-btn';
  addBtn.textContent = t('foodTrough.panel.addBtn') || 'Adicionar ração';
  const addPremiumBtn = document.createElement('button');
  addPremiumBtn.type = 'button';
  addPremiumBtn.className = 'ftp-add-btn ftp-add-btn-premium';
  addPremiumBtn.textContent = t('foodTrough.panel.addPremiumBtn') || 'Adicionar especial';

  // Toast
  const toast = document.createElement('div');
  toast.className = 'ftp-toast';
  function setToast(msg, state = '') {
    toast.textContent = msg || '';
    if (state) toast.dataset.state = state;
    else delete toast.dataset.state;
  }

  function render() {
    const sys = getSystem('foodTrough');
    if (!sys) return;

    // Basic bar
    const food = sys.getFoodLevel(foodTrough.id) || 0;
    const foodMax = sys.getMaxFoodLevel() || 100;
    const foodPct = Math.round((food / foodMax) * 100);
    barFill.style.setProperty('--pct', foodPct);
    levelText.textContent = `${food}/${foodMax}`;

    // Premium bar
    const prem = sys.getPremiumLevel(foodTrough.id) || 0;
    const premMax = sys.getMaxPremiumLevel() || 100;
    const premPct = Math.round((prem / premMax) * 100);
    premiumBarFill.style.setProperty('--pct', premPct);
    premiumText.textContent = `${prem}/${premMax}`;

    // Disable buttons when nothing useful can happen. Safer default: if
    // the system call is missing, assume NO feed available rather than
    // leaving the button live and letting the player trigger a no-op.
    const basicFull = food >= foodMax;
    const premFull = prem >= premMax;
    const hasBasic = sys.hasBasicFeedAvailable?.(foodTrough) ?? false;
    const hasPrem = sys.hasPremiumFeedAvailable?.(foodTrough) ?? false;
    addBtn.disabled = basicFull || !hasBasic;
    addPremiumBtn.disabled = premFull || !hasPrem;
  }

  addBtn.addEventListener('click', () => {
    const sys = getSystem('foodTrough');
    if (!sys) { setToast(t('foodTrough.systemUnavailable') || 'Sistema não disponível', 'error'); return; }
    if (sys.depositFeed(foodTrough.id)) {
      setToast(t('foodTrough.panel.fedSuccess') || 'Ração adicionada', 'success');
    } else {
      setToast(t('foodTrough.needFeed') || 'Sem ração compatível', 'error');
    }
    render();
  }, { signal });

  addPremiumBtn.addEventListener('click', () => {
    const sys = getSystem('foodTrough');
    if (!sys) { setToast(t('foodTrough.systemUnavailable') || 'Sistema não disponível', 'error'); return; }
    if (sys.depositPremium(foodTrough.id)) {
      setToast(t('foodTrough.panel.premiumSuccess') || 'Especial adicionado', 'success');
    } else {
      setToast(t('foodTrough.needPremium') || 'Sem ração especial', 'error');
    }
    render();
  }, { signal });

  actions.append(addBtn, addPremiumBtn);
  body.append(levelWrap, premiumWrap, actions, toast);
  card.append(header, body);
  overlay.appendChild(card);

  // Listeners
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeFoodTroughPanel();
  }, { signal });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFoodTroughPanel();
  }, { signal });

  // Re-render when inventory changes (player picks up feed) or after deposit.
  document.addEventListener('inventoryUpdated', render, { signal });
  document.addEventListener('foodTroughFilled', render, { signal });
  document.addEventListener('foodDeposited', render, { signal });

  document.body.appendChild(overlay);
  
  // Make visible (trigger CSS transition)
  requestAnimationFrame(() => {
    overlay.classList.add('ftp-visible');
  });
  
  render();
}

export function closeFoodTroughPanel() {
  const el = document.getElementById(OVERLAY_ID);
  if (el) el.remove();
  _activeTroughId = null;
  _abortController?.abort();
}
