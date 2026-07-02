/**
 * @file reloadPrompt.js - "Reload to apply" banner (#227).
 * @description Some settings (graphics quality / FPS cap) apply live, but a
 * reload guarantees every system re-inits cleanly at the new level. This shows
 * a small in-DOM banner offering that reload. Reuses the update-banner styling
 * from update-prompt.css (#225).
 * @module reloadPrompt
 */

import { t } from './i18n/i18n.js';

const BANNER_ID = 'reload-prompt-banner';

/** Show the reload banner (idempotent — one at a time). */
export function showReloadPrompt() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(BANNER_ID)) return;

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'sw-update-banner';
    banner.setAttribute('role', 'status');

    const msg = document.createElement('span');
    msg.className = 'sw-update-msg';
    msg.textContent = t('settings.quality.reloadPrompt');

    const reloadBtn = document.createElement('button');
    reloadBtn.className = 'sw-update-btn sw-update-reload';
    reloadBtn.textContent = t('settings.quality.reloadNow');
    reloadBtn.addEventListener('click', () => {
        reloadBtn.disabled = true;
        window.location.reload();
    });

    const laterBtn = document.createElement('button');
    laterBtn.className = 'sw-update-btn sw-update-later';
    laterBtn.textContent = t('settings.quality.reloadLater');
    laterBtn.addEventListener('click', () => banner.remove());

    banner.append(msg, reloadBtn, laterBtn);
    document.body.appendChild(banner);
}
