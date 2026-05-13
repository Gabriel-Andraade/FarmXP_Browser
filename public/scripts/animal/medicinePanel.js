/**
 * @file medicinePanel.js - View "Remédios" do painel da Alice
 *
 * Loja de remédios da veterinária. Aparece no stage do vetSystem ao clicar
 * no botão de remédios (`medicine`). Mostra apenas remédios cujas doenças
 * já foram diagnosticadas em algum animal do jogador — o catálogo "se
 * desbloqueia" conforme o jogador aprende quais doenças estão em jogo.
 *
 * Mecânica:
 *  - Lista filtrada de `items` por `type === 'medicine'` e `targetDisease`
 *    presente no conjunto de doenças diagnosticadas.
 *  - Cada linha exibe ícone, nome, descrição, modo de cura (instantâneo ou
 *    gradual com N dias), doses por dia, e botão "Comprar (R$X)".
 *  - Compra: valida saldo + tenta `inventory.addItem(id, 1)`; só cobra
 *    se o item entrou no inventário (mesmo padrão do merchant).
 *
 * Não cria overlay próprio — montado via `mountMedicineView(container)`
 * pelo vetSystem.
 */

import { t } from '../i18n/i18n.js';
import { getSystem } from '../gameState.js';
import { animals } from '../theWorld.js';
import { items } from '../item.js';
import { setItemIcon } from '../itemUtils.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtPrice(v) {
  const tpl = t('vet.medicine.priceFormat');
  return (typeof tpl === 'string' && tpl !== 'vet.medicine.priceFormat')
    ? tpl.replace('{value}', String(v))
    : `R$ ${v}`;
}

/** Conjunto de IDs de doenças já diagnosticadas em qualquer animal. */
function getDiagnosedDiseases() {
  const set = new Set();
  if (!Array.isArray(animals)) return set;
  for (const a of animals) {
    const d = a?.disease;
    if (d?.diagnosed && d.id) set.add(d.id);
  }
  return set;
}

/** Remédios cujo targetDisease é uma doença atualmente diagnosticada. */
function getAvailableMedicines() {
  const diagnosed = getDiagnosedDiseases();
  if (diagnosed.size === 0) return [];
  return items.filter(it => it.type === 'medicine' && diagnosed.has(it.targetDisease));
}

// ─── View principal ─────────────────────────────────────────────────────────

/**
 * Monta a loja de remédios dentro do container fornecido.
 *
 * Retorna o AbortController dos listeners de document para o vetSystem
 * abortá-lo ao trocar de sub-view (mesmo motivo do diagnosePanel).
 *
 * @param {HTMLElement} container
 * @param {Object} [options]
 * @param {() => void} [options.onBack]
 * @returns {AbortController | null}
 */
export function mountMedicineView(container, options = {}) {
  if (!container) return null;

  const abort = new AbortController();
  const { signal } = abort;

  const render = () => {
    // Preserva scrollTop antes do replaceChildren — sem isso, qualquer
    // re-render (ex.: novo diagnóstico desbloqueia remédio) zera o
    // scroll do player no meio da navegação.
    const prevList = container.querySelector('.vet-list');
    const prevScrollTop = prevList ? prevList.scrollTop : 0;

    container.replaceChildren();

    const view = document.createElement('div');
    view.className = 'vet-subview';

    // Header com voltar
    const header = document.createElement('div');
    header.className = 'vet-subview-header';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'vet-back-btn';
    backBtn.setAttribute('aria-label', t('vet.medicine.back'));
    backBtn.textContent = '←';
    backBtn.addEventListener('click', () => {
      abort.abort();
      options.onBack?.();
    }, { signal });

    const title = document.createElement('h2');
    title.className = 'vet-subview-title';
    title.textContent = t('vet.medicine.title');

    header.append(backBtn, title);
    view.appendChild(header);

    const meds = getAvailableMedicines();
    if (meds.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vet-empty-state';
      empty.textContent = t('vet.medicine.empty');
      view.appendChild(empty);
      container.appendChild(view);
      return;
    }

    const list = document.createElement('div');
    list.className = 'vet-list';

    for (const med of meds) {
      list.appendChild(buildMedicineCard(med, view));
    }

    view.appendChild(list);
    container.appendChild(view);

    if (prevScrollTop > 0) {
      list.scrollTop = prevScrollTop;
    }
  };

  // Quando um novo diagnóstico é retirado, novos remédios podem entrar
  // na loja — re-renderiza pra refletir. Outras mudanças (compra, etc.)
  // chamam render() diretamente do click handler.
  document.addEventListener('diagnosisRetrieved', render, { signal });

  render();
  return abort;
}

/** Linha de um remédio: ícone, nome, descrição, meta + botão Comprar. */
function buildMedicineCard(med, viewRoot) {
  const card = document.createElement('div');
  card.className = 'vet-animal-entry';
  card.dataset.medicineId = String(med.id);

  // Ícone — emoji do item, em um quadradinho parecido com o thumb dos animais.
  const iconEl = document.createElement('div');
  iconEl.className = 'vet-animal-thumb vet-medicine-icon';
  iconEl.style.fontSize = '32px';
  iconEl.style.display = 'flex';
  iconEl.style.alignItems = 'center';
  iconEl.style.justifyContent = 'center';
  setItemIcon(iconEl, med.icon || '💊', med.name);

  const info = document.createElement('div');
  info.className = 'vet-animal-info';

  const name = document.createElement('div');
  name.className = 'vet-animal-name';
  name.textContent = med.name;

  const desc = document.createElement('div');
  desc.className = 'vet-animal-status';
  desc.textContent = med.description;

  // Meta: modo de cura + doses/dia. Útil pro player decidir entre o caro
  // (instantâneo) e o barato (gradual).
  const meta = document.createElement('div');
  meta.className = 'vet-animal-fee';
  const cureTpl = med.cureMode === 'instant'
    ? t('vet.medicine.cureInstant')
    : t('vet.medicine.cureGradual');
  const cureText = (typeof cureTpl === 'string' && !cureTpl.startsWith('vet.medicine'))
    ? cureTpl.replace('{days}', String(med.daysToCure ?? '?'))
    : (med.cureMode === 'instant' ? 'Cura imediata' : `Cura em ${med.daysToCure ?? '?'} dias`);
  const dosesKey = med.dosesPerDay === 2 ? 'vet.medicine.doses2' : 'vet.medicine.doses1';
  const dosesTpl = t(dosesKey);
  const dosesText = (typeof dosesTpl === 'string' && dosesTpl !== dosesKey)
    ? dosesTpl
    : (med.dosesPerDay === 2 ? '2 doses/dia' : '1 dose/dia');
  meta.textContent = `${cureText} · ${dosesText}`;

  info.append(name, desc, meta);

  const buyBtn = document.createElement('button');
  buyBtn.type = 'button';
  buyBtn.className = 'vet-action-btn small';
  const buyTpl = t('vet.medicine.buyBtn');
  buyBtn.textContent = (typeof buyTpl === 'string' && buyTpl !== 'vet.medicine.buyBtn')
    ? buyTpl.replace('{value}', String(med.price))
    : `Comprar (${fmtPrice(med.price)})`;
  buyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleBuy(med, viewRoot);
  });

  card.append(iconEl, info, buyBtn);
  return card;
}

/** Tenta comprar 1 unidade. Só cobra se o item entrou no inventário. */
function handleBuy(med, viewRoot) {
  const currency = getSystem('currency');
  const inventory = getSystem('inventory');
  if (!currency || !inventory) {
    showInlineToast(viewRoot, 'Sistema indisponível.', true);
    return;
  }

  const price = Number(med.price) || 0;
  if (currency.getMoney() < price) {
    const tpl = t('vet.medicine.noMoney');
    const msg = (typeof tpl === 'string' && tpl !== 'vet.medicine.noMoney')
      ? tpl.replace('{value}', String(price))
      : `Saldo insuficiente (${fmtPrice(price)}).`;
    showInlineToast(viewRoot, msg, true);
    return;
  }

  // Sem API de cobrança disponível: aborta para não dar remédio de graça.
  if (typeof currency.spend !== 'function') {
    showInlineToast(viewRoot, 'Falha ao processar pagamento.', true);
    return;
  }

  // Adiciona ao inventário ANTES de cobrar — se cheio, não cobra.
  const added = inventory.addItem(med.id, 1);
  if (!added) {
    const fullTpl = t('vet.medicine.inventoryFull');
    const msg = (typeof fullTpl === 'string' && fullTpl !== 'vet.medicine.inventoryFull')
      ? fullTpl
      : 'Inventário cheio.';
    showInlineToast(viewRoot, msg, true);
    return;
  }

  // spend() retorna false se saldo insuficiente ou validação falha — sem
  // rollback, o jogador levava o remédio de graça e ainda recebia o toast
  // de sucesso. Reverte o addItem se a cobrança não passou.
  const charged = currency.spend(price, 'vet:medicine');
  if (!charged) {
    inventory.removeItem?.(med.id, 1);
    showInlineToast(viewRoot, 'Falha ao processar pagamento.', true);
    return;
  }

  const okTpl = t('vet.medicine.boughtToast');
  const msg = (typeof okTpl === 'string' && okTpl !== 'vet.medicine.boughtToast')
    ? okTpl.replace('{name}', med.name).replace('{value}', String(price))
    : `Comprou: ${med.name} (${fmtPrice(price)}).`;
  showInlineToast(viewRoot, msg);
}

// ─── Toast inline (espelho dos demais sub-painéis) ──────────────────────────

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

export default mountMedicineView;
