/**
 * @file toolWheel.js - Quick tool selector overlay (hold Q to open).
 *
 * Issue #166: feedback constante + acessibilidade pra trocar ferramenta.
 * Player segura Q, vê todas as ferramentas do inventário em uma linha,
 * usa scroll do mouse OU cursor pra escolher, solta Q pra equipar.
 * Primeiro slot é sempre [X] (desequipar).
 *
 * O wheel NÃO renderiza nada se o inventário não tem ferramentas. O
 * playerSystem.equipItem(item) já tem semântica de toggle, mas usamos
 * unequipItemRequest direto pro slot X pra ficar explícito.
 */

import { getSystem } from '../gameState.js';
import { getItem } from '../itemUtils.js';
import { inventorySystem } from './inventorySystem.js';
import { t } from '../i18n/i18n.js';
import { logger } from '../logger.js';

const SLOT_UNEQUIP = '__unequip__';

const state = {
  open: false,
  // Lista de "entries" a renderizar: primeiro elemento é sempre o slot
  // de unequip (id = SLOT_UNEQUIP), depois cada ferramenta do inventário.
  entries: [],
  selectedIndex: 0,
  dom: null,
};

/**
 * Cria o DOM do overlay uma vez (lazy). Reusa em aberturas subsequentes.
 *
 * O CSS associado vive em `public/style/tool-wheel.css` — não injeta
 * inline aqui pois o CSP `style-src 'self'` do server bloqueia `<style>`
 * programático.
 *
 * @returns {{overlay: HTMLDivElement, row: HTMLDivElement, hint: HTMLDivElement}}
 *   Refs cacheadas pra serem reutilizadas em `_render` e em `openToolWheel`.
 */
function _ensureDom() {
  if (state.dom) return state.dom;

  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.id = 'toolWheelOverlay';
  overlay.setAttribute('role', 'menu');
  overlay.setAttribute('aria-label', 'Tool selector');

  const row = document.createElement('div');
  row.className = 'tw-row';
  overlay.appendChild(row);

  const hint = document.createElement('div');
  hint.className = 'tw-hint';
  overlay.appendChild(hint);

  document.body.appendChild(overlay);

  state.dom = { overlay, row, hint };
  return state.dom;
}

/**
 * Lê o inventário e monta `state.entries` com:
 *   - índice 0: slot de "desequipar" (id = `SLOT_UNEQUIP`)
 *   - índices 1+: cada ferramenta válida da categoria `tools` (filtra
 *     itens sem registro em `items.js` ou com `type !== 'tool'`).
 *
 * Também posiciona `state.selectedIndex` no item atualmente equipado
 * (se houver) — assim release-sem-mover não muda nada.
 *
 * @returns {void}
 */
function _refreshEntries() {
  const inv = inventorySystem.getInventory();
  const toolSlots = inv?.tools?.items || [];

  // Resolve cada slot → { id, item, quantity }. Filtra inválidos.
  const tools = [];
  for (const slot of toolSlots) {
    const item = getItem(slot.id);
    if (!item || item.type !== 'tool') continue;
    tools.push({ id: slot.id, item, quantity: slot.quantity || slot.qty || 1 });
  }

  // Primeiro slot sempre é "desequipar"
  state.entries = [
    { id: SLOT_UNEQUIP, item: null, quantity: 0 },
    ...tools,
  ];

  // Default: posiciona seleção no item equipado atual (se houver),
  // senão no slot X. Assim release-sem-mexer = no-op visual.
  const equipped = getSystem('player')?.getEquippedItem();
  if (equipped) {
    const idx = state.entries.findIndex((e) => e.id === equipped.id);
    state.selectedIndex = idx >= 0 ? idx : 0;
  } else {
    state.selectedIndex = 0;
  }
}

/**
 * Pinta todos os slots no DOM baseado em `state.entries` e
 * `state.selectedIndex`. Chama após qualquer mudança em entries
 * (re-fetch do inventário) ou em selectedIndex (scroll, hover, click).
 *
 * Cada slot ouve `mouseenter` (atualiza seleção) e `click` (seleciona
 * + commit imediato fechando o wheel).
 *
 * @returns {void}
 */
function _render() {
  const { row, hint } = _ensureDom();
  row.replaceChildren();

  state.entries.forEach((entry, idx) => {
    const slot = document.createElement('div');
    slot.className = 'tw-slot';
    if (idx === state.selectedIndex) slot.classList.add('tw-selected');
    if (entry.id === SLOT_UNEQUIP) slot.classList.add('tw-unequip');

    const iconBox = document.createElement('div');
    iconBox.className = 'tw-slot-icon';

    if (entry.id === SLOT_UNEQUIP) {
      iconBox.textContent = '✖';
    } else {
      const icon = entry.item.icon;
      if (typeof icon === 'string' && (icon.includes('/') || icon.startsWith('http'))) {
        const img = document.createElement('img');
        img.src = icon;
        img.alt = entry.item.name;
        iconBox.appendChild(img);
      } else {
        iconBox.textContent = icon || '🔧';
      }
    }

    const label = document.createElement('div');
    label.className = 'tw-slot-label';
    label.textContent = entry.id === SLOT_UNEQUIP
      ? t('inventory.actions.unequip')
      : entry.item.name;

    slot.append(iconBox, label);
    slot.addEventListener('mouseenter', () => _setSelection(idx));
    slot.addEventListener('click', () => {
      _setSelection(idx);
      closeToolWheel(true);
    });
    row.appendChild(slot);
  });

  // Hint embaixo: mostra nome do item selecionado em destaque
  const sel = state.entries[state.selectedIndex];
  if (sel) {
    hint.textContent = sel.id === SLOT_UNEQUIP
      ? t('inventory.actions.unequip')
      : sel.item.name;
  } else {
    hint.textContent = '';
  }
}

/**
 * Atualiza a seleção pra `idx` e re-renderiza. No-op se índice é
 * inválido ou é o mesmo já selecionado (evita re-paint desnecessário).
 *
 * @param {number} idx - Índice em `state.entries`.
 * @returns {void}
 */
function _setSelection(idx) {
  if (idx < 0 || idx >= state.entries.length) return;
  if (idx === state.selectedIndex) return;
  state.selectedIndex = idx;
  _render();
}

/**
 * Move a seleção em uma direção. Clamp nas pontas (sem wrap-around) pra
 * dar feedback tátil de "fim da lista" — usuário sabe que chegou no
 * limite porque o scroll para.
 *
 * @param {number} dir - +1 pra direita / próximo, -1 pra esquerda / anterior.
 * @returns {void}
 */
function cycleSelection(dir) {
  if (!state.open) return;
  const next = Math.max(0, Math.min(state.entries.length - 1, state.selectedIndex + dir));
  _setSelection(next);
}

/**
 * Handler do evento `wheel` da window — converte scroll vertical em
 * navegação horizontal pelo wheel. `preventDefault` evita scroll da
 * página enquanto o wheel está aberto.
 *
 * @param {WheelEvent} e
 * @returns {void}
 */
function _onWheel(e) {
  if (!state.open) return;
  e.preventDefault();
  cycleSelection(e.deltaY > 0 ? 1 : -1);
}

/**
 * Abre o wheel. Re-lê o inventário a cada abertura pra refletir compras/
 * descartes recentes. Se o inventário não tem NENHUMA ferramenta, nem
 * exibe o overlay (entries só teria o slot X, não faz sentido).
 *
 * Registra o listener de `wheel` na window pra capturar scroll só
 * enquanto o overlay está aberto.
 *
 * @returns {void}
 */
export function openToolWheel() {
  if (state.open) return;
  _refreshEntries();
  // Se a única entry é o slot X (sem ferramentas), não vale a pena abrir.
  if (state.entries.length <= 1) {
    logger.debug('[toolWheel] sem ferramentas no inventário, ignorando Q');
    return;
  }
  state.open = true;
  const { overlay } = _ensureDom();
  overlay.classList.add('tw-open');
  _render();
  window.addEventListener('wheel', _onWheel, { passive: false });
}

/**
 * Fecha o wheel.
 *
 * Se `commit=true` (release normal de Q ou click): dispara o evento de
 * equip/unequip baseado no slot selecionado.
 *   - slot X → `unequipItemRequest`
 *   - item já equipado → no-op (evita toggle indesejado do playerSystem)
 *   - novo item → `equipItemRequest` com o item no `detail`
 *
 * Se `commit=false` (cancelado por blur, outra UI etc): só esconde
 * sem disparar nenhum evento.
 *
 * @param {boolean} [commit=true]
 * @returns {void}
 */
export function closeToolWheel(commit = true) {
  if (!state.open) return;
  state.open = false;
  window.removeEventListener('wheel', _onWheel);
  if (state.dom?.overlay) state.dom.overlay.classList.remove('tw-open');

  if (!commit) return;
  const sel = state.entries[state.selectedIndex];
  if (!sel) return;

  if (sel.id === SLOT_UNEQUIP) {
    document.dispatchEvent(new Event('unequipItemRequest'));
  } else {
    // Não dispara equip se o item já está equipado (evita o toggle nativo
    // do playerSystem.equipItem que desequiparia indesejadamente).
    const equipped = getSystem('player')?.getEquippedItem();
    if (equipped && equipped.id === sel.id) return;
    document.dispatchEvent(new CustomEvent('equipItemRequest', { detail: { item: sel.item } }));
  }
}

/**
 * Indica se o wheel está visível no momento. Outros sistemas (control.js,
 * builds, modais futuros) podem checar antes de roubar foco ou disparar
 * ações conflitantes.
 *
 * @returns {boolean}
 */
export function isToolWheelOpen() {
  return state.open;
}
