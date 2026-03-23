/**
 * @file galleryUI.js - Gallery viewer for the main menu
 * @description Renders the gallery panel with tabs: Unlocked Images, Characters, Photos, Notes, Screenshots.
 * Achievement reward images are shown as placeholders until real art is created.
 * @module GalleryUI
 */

import { t } from '../i18n/i18n.js';
import { getSystem } from '../gameState.js';
import { ACHIEVEMENTS } from '../achievements/achievementDefinitions.js';

const GALLERY_TABS = ['unlockedImages', 'characters', 'photos', 'notes', 'screenshots'];

let currentTab = 'unlockedImages';

/**
 * Render the gallery panel into the given container.
 * @param {HTMLElement} container - The menu area element to render into
 */
export function renderGalleryMenu(container) {
  currentTab = 'unlockedImages';

  const panel = document.createElement('div');
  panel.className = 'gal-panel';

  // ── Tab bar ──
  const tabBar = document.createElement('div');
  tabBar.className = 'gal-tabs';

  for (const tab of GALLERY_TABS) {
    const btn = document.createElement('button');
    btn.className = 'gal-tab-btn';
    if (tab === currentTab) btn.classList.add('active');
    btn.textContent = t(`gallery.tabs.${tab}`);
    btn.dataset.tab = tab;
    btn.addEventListener('click', () => {
      currentTab = tab;
      tabBar.querySelectorAll('.gal-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _renderContent(contentArea);
    });
    tabBar.appendChild(btn);
  }
  panel.appendChild(tabBar);

  // ── Content area ──
  const contentArea = document.createElement('div');
  contentArea.className = 'gal-content';
  _renderContent(contentArea);
  panel.appendChild(contentArea);

  container.appendChild(panel);
}

function _renderContent(area) {
  area.innerHTML = '';

  switch (currentTab) {
    case 'unlockedImages':
      _renderUnlockedImages(area);
      break;
    case 'characters':
      _renderCharacters(area);
      break;
    case 'photos':
      _renderEmptyTab(area, t('gallery.photosEmpty'));
      break;
    case 'notes':
      _renderEmptyTab(area, t('gallery.notesEmpty'));
      break;
    case 'screenshots':
      _renderEmptyTab(area, t('gallery.screenshotsEmpty'));
      break;
  }
}

// ─────────────── UNLOCKED IMAGES TAB ───────────────

function _renderUnlockedImages(area) {
  const progressMap = _getProgressMap();
  const unlocked = ACHIEVEMENTS.filter(a => progressMap[a.id]?.unlocked);

  if (unlocked.length === 0) {
    _renderEmptyTab(area, t('gallery.noUnlockedImages'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'gal-img-grid';

  for (const ach of unlocked) {
    const card = document.createElement('div');
    card.className = 'gal-img-card';

    // Icon badge
    const badge = document.createElement('div');
    badge.className = 'gal-img-badge';
    badge.textContent = ach.icon;

    // Placeholder image area
    const imgArea = document.createElement('div');
    imgArea.className = 'gal-img-placeholder';
    imgArea.textContent = t('gallery.imageNotCreated');

    // Achievement title
    const label = document.createElement('div');
    label.className = 'gal-img-label';
    label.textContent = t(`${ach.i18nKey}.title`);

    card.append(badge, imgArea, label);

    // Click to expand
    card.addEventListener('click', () => _showImageOverlay(ach));

    grid.appendChild(card);
  }

  area.appendChild(grid);
}

function _showImageOverlay(ach) {
  const existing = document.querySelector('.gal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'gal-overlay';

  const popup = document.createElement('div');
  popup.className = 'gal-overlay-popup';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'gal-overlay-close';
  closeBtn.textContent = '\u2715';
  closeBtn.addEventListener('click', () => overlay.remove());

  const icon = document.createElement('div');
  icon.className = 'gal-overlay-icon';
  icon.textContent = ach.icon;

  const title = document.createElement('div');
  title.className = 'gal-overlay-title';
  title.textContent = t(`${ach.i18nKey}.title`);

  const desc = document.createElement('div');
  desc.className = 'gal-overlay-desc';
  desc.textContent = t(`${ach.i18nKey}.description`);

  const imgArea = document.createElement('div');
  imgArea.className = 'gal-overlay-img';
  imgArea.textContent = t('gallery.imageNotCreated');

  popup.append(closeBtn, icon, title, desc, imgArea);
  overlay.appendChild(popup);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

// ─────────────── CHARACTERS TAB ───────────────

function _renderCharacters(area) {
  const characters = [
    { id: 'stella', color: '#e8a0bf' },
    { id: 'ben',    color: '#7ec8e3' },
    { id: 'graham', color: '#a8d8a8' },
  ];

  const grid = document.createElement('div');
  grid.className = 'gal-char-grid';

  for (const char of characters) {
    const card = document.createElement('div');
    card.className = 'gal-char-card';

    // Portrait
    const portrait = document.createElement('div');
    portrait.className = 'gal-char-portrait';
    const img = document.createElement('img');
    img.src = `./assets/character/portrait/${char.id.charAt(0).toUpperCase() + char.id.slice(1)}_portrait.webp`;
    img.alt = char.id;
    img.className = 'gal-char-img';
    img.onerror = () => {
      img.style.display = 'none';
      portrait.textContent = char.id.charAt(0).toUpperCase();
      portrait.style.fontSize = '2rem';
      portrait.style.display = 'flex';
      portrait.style.alignItems = 'center';
      portrait.style.justifyContent = 'center';
    };
    portrait.appendChild(img);

    // Name
    const name = document.createElement('div');
    name.className = 'gal-char-name';
    name.textContent = char.id.charAt(0).toUpperCase() + char.id.slice(1);

    // Description
    const desc = document.createElement('div');
    desc.className = 'gal-char-desc';
    desc.textContent = t(`characterSelection.descriptions.${char.id}`) || '';

    card.append(portrait, name, desc);
    grid.appendChild(card);
  }

  area.appendChild(grid);
}

// ─────────────── EMPTY TAB ───────────────

function _renderEmptyTab(area, message) {
  const empty = document.createElement('div');
  empty.className = 'gal-empty';
  empty.textContent = message;
  area.appendChild(empty);
}

// ─────────────── DATA HELPERS ───────────────

function _getProgressMap() {
  const tracker = getSystem('achievements');
  if (tracker) {
    const map = {};
    for (const a of tracker.getAll()) {
      map[a.id] = a.progress;
    }
    return map;
  }

  // Fallback: read from save
  try {
    const root = JSON.parse(localStorage.getItem('farmxp_saves_v1'));
    if (!root || !root.slots) return {};

    const activeIdx = localStorage.getItem('farmxp_active_slot');
    const idx = activeIdx !== null ? parseInt(activeIdx, 10) : -1;
    const candidates = idx >= 0 ? [root.slots[idx], ...root.slots] : root.slots;
    for (const slot of candidates) {
      if (slot?.data?.achievements) return slot.data.achievements;
    }
  } catch (_) { /* ignore */ }

  return {};
}
