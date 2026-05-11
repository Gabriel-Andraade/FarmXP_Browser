/**
 * @file hospitalizePanel.js - View "Internar animal" do painel da Alice
 *
 * Renderiza inline no stage do vetSystem (substitui o retrato da Alice
 * enquanto ativa). Lista os animais com ferimento GRAVE e permite admitir
 * cada um com confirmação de dias e custo previsto.
 *
 * Não cria overlay próprio — é montada via `mountHospitalizeView(container)`
 * pelo vetSystem, que cuida da volta para a Alice.
 */

import { t } from '../i18n/i18n.js';
import { animals } from '../theWorld.js';
import { hospitalSystem, HOSPITAL_PRICE_PER_DAY } from './hospitalSystem.js';

// ─── Helpers de renderização ─────────────────────────────────────────────

function getAnimalThumbnail(animal) {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');

  if (animal.img && typeof animal.frameWidth === 'number' && animal.frameWidth > 0) {
    const sy = (animal.directionRows?.down ?? 0) * animal.frameHeight;
    ctx.drawImage(
      animal.img,
      0, sy, animal.frameWidth, animal.frameHeight,
      0, 0, 48, 48
    );
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

function getAnimalDisplayName(animal) {
  if (animal.customName) return animal.customName;
  const key = animal.assetName?.toLowerCase?.();
  if (key) {
    const translated = t(`animals.${key}`);
    if (translated !== `animals.${key}`) return translated;
  }
  return animal.assetName || animal.type || 'Animal';
}

function formatInjury(animal) {
  const sev = t(`animal.injury.severity.${animal.injury.severity}`);
  const reg = t(`animal.injury.region.${animal.injury.region}`);
  const tpl = t('animal.injury.format');
  return (typeof tpl === 'string' ? tpl : '{severity} {region}')
    .replace('{severity}', sev)
    .replace('{region}', reg);
}

// ─── Confirmação inline ──────────────────────────────────────────────────

function buildConfirmDialog(animal, onConfirm, onCancel) {
  // Dias propostos vêm do hospitalSystem com cache por ferimento — abrir/
  // fechar o diálogo (ou o vet inteiro) não re-sorteia e o jogador não
  // consegue manipular pra cair em dias mais baixos.
  const days = hospitalSystem.proposeDaysFor(animal);
  const cost = days * HOSPITAL_PRICE_PER_DAY;

  const overlay = document.createElement('div');
  overlay.className = 'vet-confirm-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'vet-dialog';

  const msg = document.createElement('p');
  msg.textContent = t('hospital.confirm_message', {
    animal: getAnimalDisplayName(animal),
    days,
    cost,
  });

  const btnRow = document.createElement('div');
  btnRow.className = 'vet-dialog-buttons';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'vet-action-btn secondary';
  cancelBtn.textContent = t('hospital.cancel_btn');
  cancelBtn.addEventListener('click', () => {
    overlay.remove();
    onCancel?.();
  });

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'vet-action-btn';
  confirmBtn.textContent = t('hospital.confirm_btn');
  confirmBtn.addEventListener('click', () => {
    overlay.remove();
    onConfirm(days, cost);
  });

  btnRow.append(cancelBtn, confirmBtn);
  dialog.append(msg, btnRow);
  overlay.appendChild(dialog);

  // Click fora cancela.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onCancel?.();
    }
  });

  return overlay;
}

// ─── View principal (inline no stage) ────────────────────────────────────

/**
 * Monta a view de internação dentro do container fornecido (substituindo
 * o conteúdo prévio).
 *
 * @param {HTMLElement} container - elemento onde a view é renderizada.
 * @param {Object} [options]
 * @param {() => void} [options.onBack] - callback do botão "voltar".
 */
export function mountHospitalizeView(container, options = {}) {
  if (!container) return;

  const render = () => {
    container.replaceChildren();

    const view = document.createElement('div');
    view.className = 'vet-subview';

    // Header com botão voltar e título.
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
    title.textContent = t('hospital.admit_title');

    header.append(backBtn, title);
    view.appendChild(header);

    // Conteúdo: lista ou estado vazio.
    const severeAnimals = animals.filter(
      (a) => a.injury && a.injury.severity === 'severe'
    );

    if (severeAnimals.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vet-empty-state';
      empty.textContent = t('hospital.no_severe_animals');
      view.appendChild(empty);
      container.appendChild(view);
      return;
    }

    const list = document.createElement('div');
    list.className = 'vet-list';

    for (const animal of severeAnimals) {
      const card = document.createElement('div');
      card.className = 'vet-animal-entry';

      const img = document.createElement('img');
      img.className = 'vet-animal-thumb';
      img.src = getAnimalThumbnail(animal);
      img.width = 48;
      img.height = 48;
      img.alt = '';

      const info = document.createElement('div');
      info.className = 'vet-animal-info';

      const name = document.createElement('div');
      name.className = 'vet-animal-name';
      name.textContent = getAnimalDisplayName(animal);

      const injury = document.createElement('div');
      injury.className = 'vet-animal-injury';
      injury.textContent = formatInjury(animal);

      info.append(name, injury);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vet-action-btn small';
      btn.textContent = t('hospital.admit_btn');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dialog = buildConfirmDialog(
          animal,
          (days /*, cost */) => {
            const entry = hospitalSystem.admit(animal, days);
            if (entry) {
              render(); // re-render lista (animal já saiu de animals[])
            }
          },
          /* onCancel */ () => {}
        );
        // Append no próprio container do stage para ficar contido visualmente.
        container.appendChild(dialog);
      });

      card.append(img, info, btn);
      list.appendChild(card);
    }

    view.appendChild(list);
    container.appendChild(view);
  };

  render();
}
