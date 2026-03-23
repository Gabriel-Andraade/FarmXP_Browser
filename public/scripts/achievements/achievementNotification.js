/**
 * @file achievementNotification.js - In-game achievement unlock popup
 * @description Shows a slide-in notification when an achievement is unlocked.
 * Queues multiple notifications if they fire simultaneously.
 * Also shows a gallery reward hint after the main notification.
 * @module AchievementNotification
 */

import { t } from '../i18n/i18n.js';

const DISPLAY_DURATION = 4000;
const FADE_DURATION = 400;
const GALLERY_DELAY = 600; // delay before gallery notification appears

/** @type {Array<{id: string, definition: Object}>} */
const queue = [];
let isShowing = false;

/** Initialize the notification listener */
export function initAchievementNotifications() {
  document.addEventListener('achievement:unlocked', (e) => {
    const { achievementId, definition } = e.detail || {};
    if (!definition) return;
    queue.push({ id: achievementId, definition });
    if (!isShowing) _showNext();
  });
}

function _showNext() {
  if (queue.length === 0) {
    isShowing = false;
    return;
  }

  isShowing = true;
  const { definition } = queue.shift();
  _createPopup(definition);
}

function _createPopup(def) {
  const popup = document.createElement('div');
  popup.className = 'ach-notification';

  const icon = document.createElement('span');
  icon.className = 'ach-notification-icon';
  icon.textContent = def.icon;

  const content = document.createElement('div');
  content.className = 'ach-notification-content';

  const label = document.createElement('div');
  label.className = 'ach-notification-label';
  label.textContent = t('achievements.unlocked');

  const title = document.createElement('div');
  title.className = 'ach-notification-title';
  title.textContent = t(`${def.i18nKey}.title`);

  content.append(label, title);
  popup.append(icon, content);
  document.body.appendChild(popup);

  // Auto-dismiss
  setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transform = 'translateX(120%)';
    setTimeout(() => {
      if (popup.parentNode) popup.remove();

      // Show gallery reward notification after main notification fades
      setTimeout(() => _showGalleryHint(def), GALLERY_DELAY);
    }, FADE_DURATION);
  }, DISPLAY_DURATION);
}

/**
 * Show a small secondary notification about the gallery reward.
 */
function _showGalleryHint(def) {
  const popup = document.createElement('div');
  popup.className = 'ach-notification ach-gallery-hint';

  const icon = document.createElement('span');
  icon.className = 'ach-notification-icon';
  icon.textContent = '\uD83D\uDDBC\uFE0F'; // framed picture emoji

  const content = document.createElement('div');
  content.className = 'ach-notification-content';

  const label = document.createElement('div');
  label.className = 'ach-notification-label';
  label.textContent = t('gallery.title');

  const title = document.createElement('div');
  title.className = 'ach-notification-title';
  title.style.fontSize = '0.9rem';
  title.textContent = t('gallery.newReward');

  content.append(label, title);
  popup.append(icon, content);
  document.body.appendChild(popup);

  // Shorter display for secondary notification
  setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transform = 'translateX(120%)';
    setTimeout(() => {
      if (popup.parentNode) popup.remove();
      _showNext(); // continue queue after gallery hint
    }, FADE_DURATION);
  }, 3000);
}
