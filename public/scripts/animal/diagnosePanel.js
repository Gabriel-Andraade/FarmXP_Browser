/**
 * @file diagnosePanel.js - View "Diagnosticar animal" do painel da Alice
 *
 * Inline no stage do vetSystem (substitui o retrato da Alice). Lista os
 * animais do jogador que apresentam sintomas (`?` na UI), permite iniciar
 * o diagnóstico em paralelo e exibe o tempo restante / nome da doença
 * quando o exame termina.
 *
 * Não cria overlay próprio — montado via `mountDiagnoseView(container)`
 * pelo vetSystem.
 *
 * Mecânica:
 *  - Pending (animal com `?`): botão "Iniciar diagnóstico" → chama
 *    `diseaseSystem.startDiagnosis(animal)`.
 *  - Em andamento: mostra "termina em ~X min" e o custo que será cobrado
 *    ao concluir (pré-revelado: o player vê quanto vai pagar enquanto
 *    espera, evitando surpresa).
 *  - Concluído: mostra o nome real da doença (substitui o `?`).
 */

import { t } from '../i18n/i18n.js';
import { getSystem } from '../gameState.js';
import { animals } from '../theWorld.js';
import { diseaseSystem } from './diseaseSystem.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

import { assets } from '../assetManager.js';

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

function getAnimalDisplayName(animal) {
  const key = animal?.assetName?.toLowerCase?.();
  if (key) {
    const translated = t(`animals.${key}`);
    if (translated !== `animals.${key}`) return translated;
  }
  return animal?.assetName || 'Animal';
}

function diseaseDisplayName(diseaseId) {
  const k = `animal.disease.names.${diseaseId}`;
  const translated = t(k);
  return translated !== k ? translated : diseaseId;
}

function fmtFee(fee) {
  const tpl = t('vet.diagnose.feeFormat');
  return (typeof tpl === 'string' ? tpl : 'R$ {value}').replace('{value}', String(fee));
}

// ─── View principal ─────────────────────────────────────────────────────────

/**
 * Monta a view de "diagnóstico" dentro do container fornecido.
 *
 * Retorna o AbortController dos listeners de document (timeChanged etc.)
 * pra que o vetSystem possa abortá-los ao trocar de sub-view — sem isso,
 * eles continuam disparando `render()` por cima do view atual e o player
 * vê um flicker que volta pra tela de diagnóstico.
 *
 * @param {HTMLElement} container
 * @param {Object} [options]
 * @param {() => void} [options.onBack]
 * @returns {AbortController | null}
 */
export function mountDiagnoseView(container, options = {}) {
  if (!container) return null;

  const abort = new AbortController();
  const { signal } = abort;

  const render = () => {
    // Preserva o scroll position antes do replaceChildren — sem isso,
    // o re-render forçado por `timeChanged` (cada minuto in-game pra
    // atualizar countdown) zera o scroll e o player não consegue
    // descer a lista.
    const prevList = container.querySelector('.vet-list');
    const prevScrollTop = prevList ? prevList.scrollTop : 0;

    container.replaceChildren();

    const view = document.createElement('div');
    view.className = 'vet-subview';

    // Header com botão de voltar
    const header = document.createElement('div');
    header.className = 'vet-subview-header';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'vet-back-btn';
    backBtn.setAttribute('aria-label', t('vet.diagnose.back'));
    backBtn.textContent = '←';
    backBtn.addEventListener('click', () => {
      abort.abort();
      options.onBack?.();
    }, { signal });

    const title = document.createElement('h2');
    title.className = 'vet-subview-title';
    title.textContent = t('vet.diagnose.title');

    header.append(backBtn, title);
    view.appendChild(header);

    // Filtra animais com sintomas (com ou sem diagnóstico em curso/concluído).
    // Saudáveis ficam fora — não há o que diagnosticar.
    const sickAnimals = Array.isArray(animals)
      ? animals.filter(a => diseaseSystem.has(a))
      : [];

    if (sickAnimals.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vet-empty-state';
      empty.textContent = t('vet.diagnose.empty');
      view.appendChild(empty);
      container.appendChild(view);
      return;
    }

    const list = document.createElement('div');
    list.className = 'vet-list';

    for (const animal of sickAnimals) {
      list.appendChild(buildAnimalCard(animal, view, render));
    }

    view.appendChild(list);
    container.appendChild(view);

    // Restaura scrollTop preservado (browser auto-clamp se a lista
    // encolheu, ex.: alguém foi diagnosticado e saiu da lista).
    if (prevScrollTop > 0) {
      list.scrollTop = prevScrollTop;
    }
  };

  // Re-render automático quando o estado relevante muda. timeChanged é
  // necessário pra atualizar o "termina em ~X min" enquanto o player
  // assiste e pra detectar a transição in-progress → ready. O retrieved
  // é o evento que dispara o toast com o resultado pago.
  document.addEventListener('timeChanged',        render, { signal });
  document.addEventListener('diagnosisStarted',   render, { signal });
  document.addEventListener('diagnosisRetrieved', (e) => {
    render();
    const view = container.querySelector('.vet-subview');
    if (view && e?.detail) {
      const name = getAnimalDisplayName(e.detail.animal);
      const dis = diseaseDisplayName(e.detail.diseaseId);
      const fee = e.detail.fee ?? 0;
      showInlineToast(view, `${name}: ${dis} (${fmtFee(fee)})`);
    }
  }, { signal });

  render();
  return abort;
}

/**
 * Constrói a linha de um animal — um de 4 estados:
 *  - Diagnosticado: mostra nome da doença, sem botão.
 *  - Pronto (ready): "Pronto pra retirar" + botão "Retirar (R$X)".
 *  - Em andamento: countdown + custo previsto, sem botão.
 *  - Pendente: "?" + botão "Iniciar diagnóstico".
 */
function buildAnimalCard(animal, viewRoot, rerender) {
  const card = document.createElement('div');
  card.className = 'vet-animal-entry';

  const img = document.createElement('img');
  img.className = 'vet-animal-thumb';
  img.src = getAnimalThumbnailFromAsset(animal.assetName);
  img.width = 48;
  img.height = 48;
  img.alt = '';

  const info = document.createElement('div');
  info.className = 'vet-animal-info';

  const name = document.createElement('div');
  name.className = 'vet-animal-name';
  name.textContent = getAnimalDisplayName(animal);

  const status = document.createElement('div');
  status.className = 'vet-animal-status';

  const disease = animal.disease;
  const diagnosed = !!(disease && disease.diagnosed);
  const ready = diseaseSystem.isDiagnosisReady(animal);
  const inProgress = !ready && diseaseSystem.isInDiagnosis(animal);

  let actionBtn = null;
  let extraInfoRow = null; // segunda linha opcional (fee em progress/ready)

  if (diagnosed) {
    const tplDone = t('vet.diagnose.done');
    status.textContent = (typeof tplDone === 'string' ? tplDone : 'Diagnosticado: {disease}')
      .replace('{disease}', diseaseDisplayName(disease.id));
    card.dataset.state = 'done';
  } else if (ready) {
    // Pronto — botão de retirada cobra e revela.
    const fee = diseaseSystem.getDiagnosisFee(animal) ?? 0;
    const tplReady = t('vet.diagnose.ready');
    status.textContent = (typeof tplReady === 'string' && tplReady !== 'vet.diagnose.ready')
      ? tplReady
      : 'Resultado pronto. Retirar?';
    extraInfoRow = document.createElement('div');
    extraInfoRow.className = 'vet-animal-fee';
    extraInfoRow.textContent = `${t('vet.diagnose.feeLabel')} ${fmtFee(fee)}`;
    card.dataset.state = 'ready';

    actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'vet-action-btn small';
    const tplBtn = t('vet.diagnose.retrieveBtn');
    actionBtn.textContent = (typeof tplBtn === 'string' && tplBtn !== 'vet.diagnose.retrieveBtn')
      ? tplBtn.replace('{value}', String(fee))
      : `Retirar (${fmtFee(fee)})`;
    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const result = diseaseSystem.retrieveDiagnosis(animal);
      if (result.ok) {
        // O evento `diagnosisRetrieved` dispara o toast e o render.
        return;
      }
      // Erro: mostra inline na própria view.
      const view = viewRoot;
      let msg;
      if (result.reason === 'no_money') {
        const tplNoMoney = t('vet.diagnose.noMoney');
        msg = (typeof tplNoMoney === 'string' && tplNoMoney !== 'vet.diagnose.noMoney')
          ? tplNoMoney.replace('{value}', String(result.fee ?? 0))
          : `Saldo insuficiente para retirar (${fmtFee(result.fee ?? 0)}).`;
      } else {
        msg = `Não foi possível retirar (${result.reason}).`;
      }
      showInlineToast(view, msg, true);
    });
  } else if (inProgress) {
    const remaining = diseaseSystem.getDiagnosisRemaining(animal);
    const fee = diseaseSystem.getDiagnosisFee(animal);
    const tplProg = t('vet.diagnose.inProgress');
    status.textContent = (typeof tplProg === 'string' ? tplProg : 'Em diagnóstico — ~{minutes} min restantes')
      .replace('{minutes}', String(Math.max(0, Math.ceil(remaining ?? 0))));
    extraInfoRow = document.createElement('div');
    extraInfoRow.className = 'vet-animal-fee';
    extraInfoRow.textContent = `${t('vet.diagnose.feeLabel')} ${fmtFee(fee ?? 0)}`;
    card.dataset.state = 'progress';
  } else {
    // Pendente — só "?" + botão de iniciar.
    const hint = t('vet.diagnose.pendingHint');
    status.textContent = (hint && hint !== 'vet.diagnose.pendingHint') ? hint : '?';
    card.dataset.state = 'pending';

    actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'vet-action-btn small';
    actionBtn.textContent = t('vet.diagnose.startBtn');
    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const result = diseaseSystem.startDiagnosis(animal);
      if (result) rerender();
    });
  }

  if (extraInfoRow) info.append(name, status, extraInfoRow);
  else info.append(name, status);

  card.append(img, info);
  if (actionBtn) card.append(actionBtn);

  return card;
}

// ─── Toast inline (espelho do recoveryPanel) ────────────────────────────────

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

export default mountDiagnoseView;
