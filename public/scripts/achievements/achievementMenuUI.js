/**
 * @file achievementMenuUI.js - Achievement viewer for the main menu
 * @description Renders the achievement grid with category filters inside the MainMenu.
 * Clicking an unlocked achievement shows its gallery reward.
 * @module AchievementMenuUI
 */

import { t } from '../i18n/i18n.js';
import { getSystem } from '../gameState.js';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from './achievementDefinitions.js';

let currentFilter = 'all';

/**
 * Render the achievements panel into the given container.
 * @param {HTMLElement} container - The menu area element to render into
 */
export function renderAchievementsMenu(container) {
  currentFilter = 'all';

  const panel = document.createElement('div');
  panel.className = 'mm-ach-panel';

  // ── Summary ──
  const summary = document.createElement('div');
  summary.className = 'mm-ach-summary';
  const { stats, progressMap } = _getAchievementData();
  summary.textContent = `${stats.unlocked} / ${stats.total}`;
  panel.appendChild(summary);

  // ── Category filters ──
  const filters = document.createElement('div');
  filters.className = 'mm-ach-categories';

  for (const cat of ACHIEVEMENT_CATEGORIES) {
    const btn = document.createElement('button');
    btn.className = 'mm-ach-cat-btn';
    if (cat === 'all') btn.classList.add('active');
    btn.textContent = t(`achievements.category.${cat}`);
    btn.dataset.cat = cat;
    btn.addEventListener('click', () => {
      currentFilter = cat;
      filters.querySelectorAll('.mm-ach-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _renderGrid(grid, progressMap);
    });
    filters.appendChild(btn);
  }
  panel.appendChild(filters);

  // ── Achievement grid ──
  const grid = document.createElement('div');
  grid.className = 'mm-ach-grid';
  _renderGrid(grid, progressMap);
  panel.appendChild(grid);

  container.appendChild(panel);
}

/**
 * Get achievement data from tracker (in-game) or localStorage (pre-game).
 */
function _getAchievementData() {
  const tracker = getSystem('achievements');

  if (tracker) {
    const all = tracker.getAll();
    const unlocked = all.filter(a => a.progress.unlocked).length;
    const progressMap = {};
    for (const a of all) progressMap[a.id] = a.progress;
    return {
      stats: { total: all.length, unlocked },
      progressMap,
    };
  }

  // Fallback: try reading from localStorage save data
  const savedProgress = _readProgressFromSave();
  let unlocked = 0;
  if (savedProgress) {
    for (const v of Object.values(savedProgress)) {
      if (v.unlocked) unlocked++;
    }
  }

  return {
    stats: { total: ACHIEVEMENTS.length, unlocked },
    progressMap: savedProgress || {},
  };
}

/**
 * Read achievement progress from localStorage save data (when tracker isn't loaded).
 */
function _readProgressFromSave() {
  try {
    const root = JSON.parse(localStorage.getItem('farmxp_saves_v1'));
    if (!root || !root.slots) return null;

    const activeIdx = localStorage.getItem('farmxp_active_slot');
    const idx = activeIdx !== null ? parseInt(activeIdx, 10) : -1;

    // Try active slot first, then find any slot with data
    const candidates = idx >= 0 ? [root.slots[idx], ...root.slots] : root.slots;
    for (const slot of candidates) {
      if (slot?.data?.achievements) {
        return slot.data.achievements;
      }
    }
  } catch (_) { /* ignore */ }
  return null;
}

function _renderGrid(grid, progressMap) {
  grid.innerHTML = '';

  const achievements = currentFilter === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter(a => a.category === currentFilter);

  for (const def of achievements) {
    const prog = progressMap[def.id] || { current: 0, unlocked: false, unlockedAt: null };
    grid.appendChild(_createCard({ ...def, progress: prog }));
  }
}

function _createCard(ach) {
  const prog = ach.progress || { current: 0, unlocked: false };
  const isUnlocked = prog.unlocked;
  const isHidden = ach.hidden && !isUnlocked;

  const card = document.createElement('div');
  card.className = 'mm-ach-card';
  if (isUnlocked) card.classList.add('unlocked');
  if (!isUnlocked) card.classList.add('locked');

  // Icon
  const icon = document.createElement('div');
  icon.className = 'mm-ach-icon';
  icon.textContent = isHidden ? '\u2753' : ach.icon;
  card.appendChild(icon);

  // Info
  const info = document.createElement('div');
  info.className = 'mm-ach-info';

  const title = document.createElement('div');
  title.className = 'mm-ach-title';
  title.textContent = isHidden ? t('achievements.hidden') : t(`${ach.i18nKey}.title`);

  const desc = document.createElement('div');
  desc.className = 'mm-ach-desc';
  desc.textContent = isHidden ? '...' : t(`${ach.i18nKey}.description`);

  info.append(title, desc);

  // Progress bar (for cumulative/threshold)
  if (!isUnlocked && ach.target > 1 && !isHidden) {
    const barWrap = document.createElement('div');
    barWrap.className = 'mm-ach-bar-wrap';

    const bar = document.createElement('div');
    bar.className = 'mm-ach-bar';
    const pct = Math.min(100, Math.round((prog.current / ach.target) * 100));
    bar.style.width = `${pct}%`;

    const barLabel = document.createElement('span');
    barLabel.className = 'mm-ach-bar-label';
    barLabel.textContent = `${prog.current} / ${ach.target}`;

    barWrap.append(bar, barLabel);
    info.appendChild(barWrap);
  }

  card.appendChild(info);

  // Status icon
  const status = document.createElement('div');
  status.className = 'mm-ach-status';
  status.textContent = isUnlocked ? '\u2713' : '\uD83D\uDD12';
  card.appendChild(status);

  // Click handler for unlocked achievements → show gallery reward
  if (isUnlocked) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      _showGalleryRewardPopup(ach);
    });
  }

  return card;
}

/**
 * Show a popup with the achievement's gallery reward image (placeholder for now).
 */
function _showGalleryRewardPopup(ach) {
  // Remove existing popup
  const existing = document.querySelector('.mm-ach-reward-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'mm-ach-reward-overlay';

  const popup = document.createElement('div');
  popup.className = 'mm-ach-reward-popup';

  // Title
  const title = document.createElement('div');
  title.className = 'mm-ach-reward-title';
  title.textContent = t(`${ach.i18nKey}.title`);

  // Icon
  const iconEl = document.createElement('div');
  iconEl.className = 'mm-ach-reward-icon';
  iconEl.textContent = ach.icon;

  // Image placeholder
  const imgArea = document.createElement('div');
  imgArea.className = 'mm-ach-reward-img';
  imgArea.textContent = t('gallery.imageNotCreated');

  // Gallery hint
  const hint = document.createElement('div');
  hint.className = 'mm-ach-reward-hint';
  hint.textContent = t('gallery.rewardSentToGallery');

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'mm-ach-reward-close';
  closeBtn.textContent = '\u2715';
  closeBtn.addEventListener('click', () => overlay.remove());

  popup.append(closeBtn, iconEl, title, imgArea, hint);
  overlay.appendChild(popup);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}
