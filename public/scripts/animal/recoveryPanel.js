/**
 * @file recoveryPanel.js - View "Animais internados" do painel da Alice
 *
 * Inline no stage do vetSystem (substitui o retrato da Alice). Lista as
 * entradas ativas do hospitalSystem com dias restantes ou botão de retirada
 * (cobrando o custo total). Não cria overlay próprio — montada via
 * `mountRecoveryView(container)` pelo vetSystem.
 */

import { t } from '../i18n/i18n.js';
import { hospitalSystem } from './hospitalSystem.js';
import { assets } from '../assetManager.js';

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Miniatura 48×48 a partir do asset (animal já não está em cena). */
function getAnimalThumbnailFromAsset(assetName) {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');

  const data = assets.animals?.[assetName];
  if (data?.img) {
    const img = data.img;
    const fw = data.frameWidth || (img.width / (data.cols || 4));
    const fh = data.frameHeight || (img.height / (data.rows || 4));
    const sy = (data.directionRows?.down ?? 0) * fh;
    ctx.drawImage(img, 0, sy, fw, fh, 0, 0, 48, 48);
  } else {
    ctx.fillStyle = '#b0a090';
    ctx.fillRect(0, 0, 48, 48);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 24, 24);
  }

  return canvas.toDataURL();
}

function getEntryDisplayName(entry) {
  if (entry.customName) return entry.customName;
  const key = entry.assetName?.toLowerCase?.();
  if (key) {
    const translated = t(`animals.${key}`);
    if (translated !== `animals.${key}`) return translated;
  }
  return entry.assetName || 'Animal';
}

function formatInjury(entry) {
  const sev = t(`animal.injury.severity.${entry.severity}`);
  const reg = t(`animal.injury.region.${entry.region}`);
  const tpl = t('animal.injury.format');
  return (typeof tpl === 'string' ? tpl : '{severity} {region}')
    .replace('{severity}', sev)
    .replace('{region}', reg);
}

function pickupFailedMessage(reason) {
  const key = `hospital.pickup_failed.${reason || 'generic'}`;
  let msg = t(key);
  if (msg === key) msg = t('hospital.pickup_failed.generic');
  return msg;
}

// ─── View principal ──────────────────────────────────────────────────────

/**
 * Monta a view de "animais internados" dentro do container fornecido.
 *
 * @param {HTMLElement} container
 * @param {Object} [options]
 * @param {() => void} [options.onBack]
 */
export function mountRecoveryView(container, options = {}) {
  if (!container) return;

  const render = () => {
    container.replaceChildren();

    const view = document.createElement('div');
    view.className = 'vet-subview';

    // Header
    const header = document.createElement('div');
    header.className = 'vet-subview-header';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'vet-back-btn';
    backBtn.setAttribute('aria-label', t('hospital.back_btn'));
    backBtn.textContent = '←';
    backBtn.addEventListener('click', () => options.onBack?.());

    const title = document.createElement('h2');
    title.className = 'vet-subview-title';
    title.textContent = t('hospital.recovery_title');

    header.append(backBtn, title);
    view.appendChild(header);

    // Conteúdo
    const entries = hospitalSystem.getEntries();

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vet-empty-state';
      empty.textContent = t('hospital.no_recovery_animals');
      view.appendChild(empty);
      container.appendChild(view);
      return;
    }

    const list = document.createElement('div');
    list.className = 'vet-list';

    for (const entry of entries) {
      const card = document.createElement('div');
      card.className = 'vet-animal-entry';
      const remaining = entry.daysRemaining ?? 0;
      card.dataset.ready = remaining <= 0 ? '1' : '0';

      const img = document.createElement('img');
      img.className = 'vet-animal-thumb';
      img.src = getAnimalThumbnailFromAsset(entry.assetName);
      img.width = 48;
      img.height = 48;
      img.alt = '';

      const info = document.createElement('div');
      info.className = 'vet-animal-info';

      const name = document.createElement('div');
      name.className = 'vet-animal-name';
      name.textContent = getEntryDisplayName(entry);

      const injury = document.createElement('div');
      injury.className = 'vet-animal-injury';
      injury.textContent = formatInjury(entry);

      const status = document.createElement('div');
      status.className = 'vet-animal-status';
      status.textContent = remaining > 0
        ? t('hospital.remaining_days', { days: remaining })
        : t('hospital.ready_for_pickup');

      info.append(name, injury, status);

      const cost = hospitalSystem.totalCostFor(entry);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vet-action-btn small';
      btn.dataset.entryId = entry.id;

      if (remaining > 0) {
        btn.textContent = t('hospital.treatment_progress', { days: remaining });
        btn.disabled = true;
      } else {
        btn.textContent = t('hospital.pickup_btn', { cost });
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const result = hospitalSystem.retrieve(entry.id);
          if (result.ok) {
            // Render PRIMEIRO (substitui o `view`) e só depois mostra o
            // toast no nó recém-renderizado, senão ele some na hora.
            const message = t('hospital.pickup_success', {
              name: getEntryDisplayName(entry),
              cost: result.cost,
            });
            render();
            showInlineToast(container.querySelector('.vet-subview') || container, message);
          } else {
            showInlineToast(view, pickupFailedMessage(result.reason), true);
          }
        });
      }

      card.append(img, info, btn);
      list.appendChild(card);
    }

    view.appendChild(list);
    container.appendChild(view);
  };

  render();
}

function showInlineToast(parent, text, isError = false) {
  const existing = parent.querySelector('.vet-inline-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'vet-inline-toast';
  if (isError) toast.dataset.error = '1';
  toast.textContent = text;
  parent.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
}
