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
 * API:
 *   openEnclosureAnimalPanel(enclosure)  — monta modal pra esse cercado
 *   closeEnclosureAnimalPanel()          — força fechar (esc, etc.)
 */

import { items } from '../item.js';
import { getSystem } from '../gameState.js';
import { setItemIcon, getItem } from '../itemUtils.js';
import { t } from '../i18n/i18n.js';

const OVERLAY_ID = 'enclosure-animal-panel';

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

const MAX_SPECIES = 3;

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

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '9999',
    background: 'rgba(0, 0, 0, 0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'sans-serif',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    background: '#f3e9d2',
    border: '4px solid #8b6914',
    borderRadius: '12px',
    width: 'min(560px, 92vw)',
    maxHeight: '82vh',
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
  });

  // ─── Header ──────────────────────────────────────────────────────────
  const header = document.createElement('div');
  Object.assign(header.style, {
    background: '#b8860b', color: '#fff',
    padding: '12px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  });
  const title = document.createElement('h2');
  title.textContent = t('enclosure.panel.title');
  Object.assign(title.style, { margin: '0', fontSize: '18px' });

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '×';   // símbolo gráfico, mesmo em qualquer idioma
  closeBtn.setAttribute('aria-label', t('enclosure.panel.close'));
  Object.assign(closeBtn.style, {
    background: 'transparent', border: '0', color: '#fff',
    fontSize: '24px', cursor: 'pointer', padding: '0 4px',
  });
  closeBtn.addEventListener('click', () => closeEnclosureAnimalPanel(), { signal });

  header.append(title, closeBtn);
  panel.appendChild(header);

  // ─── Status (espécies usadas / saldo) ────────────────────────────────
  const status = document.createElement('div');
  Object.assign(status.style, {
    background: '#e6d8b3', padding: '8px 16px',
    fontSize: '13px', color: '#4a3a14',
    display: 'flex', justifyContent: 'space-between',
  });
  panel.appendChild(status);

  // ─── Lista de animais ────────────────────────────────────────────────
  const list = document.createElement('div');
  Object.assign(list.style, {
    flex: '1', overflowY: 'auto', padding: '12px',
    display: 'flex', flexDirection: 'column', gap: '8px',
  });
  panel.appendChild(list);

  // Toast inline (mensagens de erro/sucesso)
  const toast = document.createElement('div');
  Object.assign(toast.style, {
    padding: '8px 16px', fontSize: '13px',
    background: '#fff8e1', color: '#4a3a14', minHeight: '20px',
    borderTop: '1px solid #c5b487',
  });
  panel.appendChild(toast);

  function setToast(msg, isError = false) {
    toast.textContent = msg || '';
    toast.style.color = isError ? '#a02828' : '#4a3a14';
  }

  function render() {
    list.replaceChildren();

    const encSys = getSystem('enclosure');
    const species = encSys?.getEnclosureSpecies?.(enclosure.id) || {};
    const speciesCount = Object.keys(species).length;

    const currency = getSystem('currency');
    const balance = currency?.getMoney?.() ?? 0;
    status.textContent = '';
    const speciesSpan = document.createElement('span');
    speciesSpan.textContent = t('enclosure.panel.speciesCount', { count: speciesCount, max: MAX_SPECIES });
    const balSpan = document.createElement('span');
    balSpan.textContent = t('enclosure.panel.balance', { value: _fmtPrice(balance) });
    status.append(speciesSpan, balSpan);

    const catalog = _getAnimalCatalog();
    if (catalog.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = t('enclosure.panel.empty');
      empty.style.textAlign = 'center';
      empty.style.color = '#6e5a2a';
      list.appendChild(empty);
      return;
    }

    for (const animal of catalog) {
      const card = document.createElement('div');
      Object.assign(card.style, {
        display: 'flex', alignItems: 'center', gap: '10px',
        background: '#fff8e1', padding: '8px 12px',
        border: '1px solid #c5b487', borderRadius: '8px',
      });

      const icon = document.createElement('div');
      Object.assign(icon.style, {
        width: '40px', height: '40px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '28px', flexShrink: '0',
      });
      setItemIcon(icon, animal.icon || '🐾', animal.name);

      const info = document.createElement('div');
      Object.assign(info.style, { flex: '1', display: 'flex', flexDirection: 'column' });
      const animalDisplayName = _animalName(animal);
      const name = document.createElement('strong');
      name.textContent = animalDisplayName;
      name.style.color = '#3a2a06';
      const meta = document.createElement('span');
      const currentCount = species[animal.assetName] || 0;
      meta.textContent = t('enclosure.panel.cardMeta', { price: _fmtPrice(animal.price), count: currentCount });
      meta.style.fontSize = '12px';
      meta.style.color = '#6e5a2a';
      const desc = document.createElement('span');
      desc.textContent = animal.description || '';
      desc.style.fontSize = '11px';
      desc.style.color = '#8a6e2a';
      info.append(name, meta, desc);

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.textContent = t('enclosure.panel.addBtn');
      const isNewSpecies = currentCount === 0;
      const blockedBySpeciesLimit = isNewSpecies && speciesCount >= MAX_SPECIES;
      const blockedByMoney = balance < (animal.price || 0);
      const disabled = blockedBySpeciesLimit || blockedByMoney;
      Object.assign(addBtn.style, {
        background: disabled ? '#9c8a52' : '#8b6914',
        color: '#fff',
        border: '0', borderRadius: '6px',
        padding: '8px 14px', cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '13px',
      });
      addBtn.disabled = disabled;
      if (blockedBySpeciesLimit) addBtn.title = t('enclosure.panel.speciesLimitTitle', { max: MAX_SPECIES });
      else if (blockedByMoney)   addBtn.title = t('enclosure.panel.noMoneyTitle');

      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const result = encSys?.addAnimalToEnclosure?.(enclosure.id, animal);
        if (result?.ok) {
          setToast(t('enclosure.panel.toast.added', { name: animalDisplayName }));
          render(); // atualiza contadores e estado dos botões
        } else {
          setToast(_reasonMessage(result?.reason, result?.price), true);
        }
      }, { signal });

      card.append(icon, info, addBtn);
      list.appendChild(card);
    }
  }

  // Click fora do panel fecha
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

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  render();
}

export function closeEnclosureAnimalPanel() {
  _abortController?.abort();
  _abortController = null;
  _activeEnclosureId = null;
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
}

export default { openEnclosureAnimalPanel, closeEnclosureAnimalPanel };
