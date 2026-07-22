/**
 * @file enclosureAnimalPanel.js - Painel modal pra adicionar animais a um cercado
 *
 * Aberto ao clicar no "+" do centro do cercado (no modo construção). Lista
 * os animais de `items.js` (type === 'animal') como cards com ícone, nome,
 * preço e botão "Adicionar". O catálogo é dinâmico — qualquer item novo
 * com `type: 'animal'` aparece sem mexer neste arquivo.
 *
 * Regras (espelho de `enclosureSystem.addAnimalToEnclosure`):
 *   - Máximo 3 espécies distintas por cercado
 *   - Quantidade ilimitada por espécie
 *   - Compra debita do currency e spawna animal numa célula do cercado
 *
 * Estilo: classes CSS em `enclosure-animal-panel.css` (não inline styles).
 * Mesma linguagem visual dos outros modais (vet, memorial, character-select):
 * gradiente marrom + borda dourada + Georgia serif + animação slideIn.
 *
 * API:
 *   openEnclosureAnimalPanel(enclosure)  — monta modal pra esse cercado
 *   closeEnclosureAnimalPanel()          — força fechar (esc, etc.)
 */

import { items } from '../item.js';
import { getSystem } from '../gameState.js';
import { setItemIcon, getItem } from '../itemUtils.js';
import { getAnimalFamily } from './enclosureSystem.js';
import { t } from '../i18n/i18n.js';

const OVERLAY_ID = 'enclosure-animal-panel';
const MAX_SPECIES = 3;

let _activeEnclosureId = null;
let _abortController = null;

/** Lista de animais do catálogo (items.js filtrado por type === 'animal'). */
function _getAnimalCatalog() {
  return items.filter(it => it.type === 'animal');
}

/** Formata preço usando o template traduzido. */
function _fmtPrice(v) {
  const tpl = t('enclosure.panel.priceFormat');
  return (typeof tpl === 'string' ? tpl : '$ {value}').replace('{value}', String(v));
}

/** Nome traduzido do animal (item.js — usa itemNames.{id} se existir). */
function _animalName(animal) {
  const k = `itemNames.${animal.id}`;
  const translated = t(k);
  return (translated && translated !== k) ? translated : animal.name;
}

/** Mensagem de erro do `addAnimalToEnclosure.reason`. Cobre todos os
 *  códigos retornados por `enclosureSystem.addAnimalToEnclosure`. */
function _reasonMessage(reason, price) {
  switch (reason) {
    case 'species_limit':       return t('enclosure.panel.toast.speciesLimit', { max: MAX_SPECIES });
    case 'no_money':            return t('enclosure.panel.toast.noMoney', { price: _fmtPrice(price ?? 0) });
    case 'no_enclosure':        return t('enclosure.panel.toast.noEnclosure');
    case 'no_asset_name':       return t('enclosure.panel.toast.noAssetName');
    case 'no_asset':            return t('enclosure.panel.toast.noAsset');
    case 'no_cells':            return t('enclosure.panel.toast.noCells');
    case 'no_world':            return t('enclosure.panel.toast.noWorld');
    case 'no_currency_system':  return t('enclosure.panel.toast.noCurrencySystem');
    case 'respawn_failed':      return t('enclosure.panel.toast.respawnFailed');
    default:                    return t('enclosure.panel.toast.generic', { reason: String(reason) });
  }
}

/**
 * Abre o painel modal pra um cercado. Idempotente — chamar de novo no
 * mesmo cercado re-renderiza, em cercado diferente troca o conteúdo.
 */
export function openEnclosureAnimalPanel(enclosure) {
  if (!enclosure?.id) return;

  // Se já tem painel aberto em outro cercado, fecha o antigo.
  if (_activeEnclosureId && _activeEnclosureId !== enclosure.id) {
    closeEnclosureAnimalPanel();
  }
  _activeEnclosureId = enclosure.id;

  // Remove instância anterior se existir.
  const old = document.getElementById(OVERLAY_ID);
  if (old) old.remove();

  _abortController?.abort();
  _abortController = new AbortController();
  const { signal } = _abortController;

  // ── Estrutura do DOM (classes em CSS, sem inline styles) ──────────────
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'eap-card';

  // Header
  const header = document.createElement('div');
  header.className = 'eap-header';
  const title = document.createElement('h2');
  title.className = 'eap-title';
  title.textContent = t('enclosure.panel.title');
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'eap-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', t('enclosure.panel.close'));
  closeBtn.addEventListener('click', () => closeEnclosureAnimalPanel(), { signal });
  header.append(title, closeBtn);

  // Status row (espécies + saldo)
  const status = document.createElement('div');
  status.className = 'eap-status';
  const speciesItem = document.createElement('span');
  speciesItem.className = 'eap-status-item';
  const balanceItem = document.createElement('span');
  balanceItem.className = 'eap-status-item';
  status.append(speciesItem, balanceItem);

  // Lista de animais (scrollable)
  const list = document.createElement('div');
  list.className = 'eap-list';

  // Toast inline (sucesso/erro)
  const toast = document.createElement('div');
  toast.className = 'eap-toast';
  toast.dataset.role = 'toast';

  function setToast(msg, state = '') {
    toast.textContent = msg || '';
    if (state) toast.dataset.state = state;
    else delete toast.dataset.state;
  }

  function render() {
    list.replaceChildren();

    const encSys = getSystem('enclosure');
    // Contagem VIVA por família (#243): reflete nascimentos/mortes e conta
    // Cow+Bull como 1 espécie. Substitui o antigo registro de compras.
    const counts = encSys?.getLiveAnimalCounts?.(enclosure.id) || { byAsset: {}, byFamily: {}, familyCount: 0 };
    const speciesCount = counts.familyCount;

    const currency = getSystem('currency');
    const balance = currency?.getMoney?.() ?? 0;

    // Status row
    speciesItem.innerHTML = '';
    const speciesLabel = document.createTextNode(
      t('enclosure.panel.speciesCount', { count: speciesCount, max: MAX_SPECIES })
    );
    speciesItem.appendChild(speciesLabel);

    balanceItem.innerHTML = '';
    const balanceLabel = document.createTextNode(
      t('enclosure.panel.balance', { value: _fmtPrice(balance) })
    );
    balanceItem.appendChild(balanceLabel);

    const catalog = _getAnimalCatalog();
    if (catalog.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'eap-empty';
      empty.textContent = t('enclosure.panel.empty');
      list.appendChild(empty);
      return;
    }

    for (const animal of catalog) {
      list.appendChild(buildAnimalItem(animal, counts, speciesCount, balance));
    }
  }

  function buildAnimalItem(animal, counts, speciesCount, balance) {
    const animalDisplayName = _animalName(animal);
    // Contagem viva desse asset; bloqueio pela FAMÍLIA (Cow+Bull = 1 espécie).
    const currentCount = counts.byAsset[animal.assetName] || 0;
    const family = getAnimalFamily(animal.assetName);
    const isNewSpecies = !(counts.byFamily[family] > 0);
    const blockedBySpeciesLimit = isNewSpecies && speciesCount >= MAX_SPECIES;
    const blockedByMoney = balance < (animal.price || 0);
    const disabled = blockedBySpeciesLimit || blockedByMoney;

    const item = document.createElement('div');
    item.className = 'eap-item';
    if (currentCount > 0) item.dataset.owned = '1';

    // Thumbnail (icon)
    const thumb = document.createElement('div');
    thumb.className = 'eap-thumb';
    setItemIcon(thumb, animal.icon || '🐾', animalDisplayName);

    // Info
    const info = document.createElement('div');
    info.className = 'eap-info';
    const nameEl = document.createElement('strong');
    nameEl.className = 'eap-name';
    nameEl.textContent = animalDisplayName;
    const metaEl = document.createElement('span');
    metaEl.className = 'eap-meta';
    metaEl.textContent = t('enclosure.panel.cardMeta', {
      price: _fmtPrice(animal.price),
      count: currentCount,
    });
    const descEl = document.createElement('span');
    descEl.className = 'eap-desc';
    descEl.textContent = animal.description || '';
    info.append(nameEl, metaEl, descEl);

    // Botão Adicionar
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'eap-add-btn';
    addBtn.textContent = t('enclosure.panel.addBtn');
    addBtn.disabled = disabled;
    if (blockedBySpeciesLimit) {
      addBtn.title = t('enclosure.panel.speciesLimitTitle', { max: MAX_SPECIES });
    } else if (blockedByMoney) {
      addBtn.title = t('enclosure.panel.noMoneyTitle');
    }

    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const encSys = getSystem('enclosure');
      const result = encSys?.addAnimalToEnclosure?.(enclosure.id, animal);
      if (result?.ok) {
        setToast(t('enclosure.panel.toast.added', { name: animalDisplayName }), 'success');
        render();
      } else {
        setToast(_reasonMessage(result?.reason, result?.price), 'error');
      }
    }, { signal: _abortController.signal });

    item.append(thumb, info, addBtn);
    return item;
  }

  // Montagem
  card.append(header, status, list, toast);
  overlay.appendChild(card);

  // Click fora do card fecha (no overlay direto, não no card)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeEnclosureAnimalPanel();
  }, { signal });

  // ESC fecha (capture true pra interceptar antes do build mode)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeEnclosureAnimalPanel();
    }
  }, { capture: true, signal });

  document.body.appendChild(overlay);

  // Trigger CSS transition (fade in + scale up)
  requestAnimationFrame(() => {
    overlay.classList.add('eap-visible');
  });

  render();
}

export function closeEnclosureAnimalPanel() {
  _abortController?.abort();
  _abortController = null;
  _activeEnclosureId = null;
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    // Remove `eap-visible` pra triggerar fade-out, depois remove do DOM
    overlay.classList.remove('eap-visible');
    setTimeout(() => overlay.remove(), 320);
  }
}

export default { openEnclosureAnimalPanel, closeEnclosureAnimalPanel };
