/**
 * @file helpPanel.js - Keyboard Shortcuts Help Panel (dynamic from remap config)
 * Prefix CSS: khp-
 *
 * - Button: #helpBtn (HUD)  -> criado/recriado pelo PlayerHUD
 * - Overlay: #khp-help-overlay
 * - Panel:   #khp-help-panel
 *
 * Observa:
 * - "controlsChanged" (emitido pelo settingsUI) para refletir remaps em tempo real.
 * - "languageChanged" para atualizar textos via i18n.
 * - "hudReady" (emitido pelo PlayerHUD) para re-sincronizar tooltips após recriar o HUD.
 */

import { t } from './i18n/i18n.js';
import { logger } from './logger.js';
import { CONTROLS_STORAGE_KEY, DEFAULT_KEYBINDS } from './keybindDefaults.js';

const PREFIX = 'khp';

const IDS = {
  btn: 'helpBtn',
  overlay: `${PREFIX}-help-overlay`,
  panel: `${PREFIX}-help-panel`,
};

const CLS = {
  btn: `${PREFIX}-btn`,
  overlay: `${PREFIX}-overlay`,
  panel: `${PREFIX}-panel`,
  header: `${PREFIX}-header`,
  title: `${PREFIX}-title`,
  subtitle: `${PREFIX}-subtitle`,
  hint: `${PREFIX}-hint`,
  close: `${PREFIX}-close`,
  body: `${PREFIX}-body`,
  section: `${PREFIX}-section`,
  sectionTitle: `${PREFIX}-sectionTitle`,
  row: `${PREFIX}-row`,
  rowText: `${PREFIX}-rowText`,
  rowLabel: `${PREFIX}-rowLabel`,
  rowDesc: `${PREFIX}-rowDesc`,
  keys: `${PREFIX}-keys`,
  kbd: `${PREFIX}-kbd`,
  sep: `${PREFIX}-sep`,
  open: 'is-open',
};

const HELP_ACTION = 'help';
const HELP_FALLBACK_CODE = 'KeyH';

// Meta de seções/ações (mostra o que vem do config/remap)
const SECTIONS = [
  {
    titleKey: 'shortcutsPanel.sections.movement',
    actions: ['moveUp', 'moveDown', 'moveLeft', 'moveRight'],
  },
  {
    titleKey: 'shortcutsPanel.sections.actions',
    actions: ['interact'],
  },
  {
    titleKey: 'shortcutsPanel.sections.menus',
    actions: ['inventory', 'merchants', 'config', HELP_ACTION],
  },
];

let mounted = false;
let isOpen = false;
let lastFocusEl = null;

// refs para re-render rápido
const rowRefs = new Map(); // action -> { labelEl, descEl, keysEl }
let overlayEl = null;
let panelEl = null;
let closeBtnEl = null;
let eventsBound = false;

function getHelpBtn() {
  return document.getElementById(IDS.btn);
}

function safeT(key, fallback) {
  try {
    const out = t(key);
    if (!out || out === key) return fallback;
    return out;
  } catch {
    return fallback;
  }
}

function sanitizeKeybinds(raw) {
  const merged = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS || {}));
  if (!raw || typeof raw !== 'object') return merged;

  for (const action of Object.keys(merged)) {
    if (Array.isArray(raw[action]) && raw[action].length) {
      merged[action] = raw[action]
        .slice(0, 2)
        .map(String)
        .filter(Boolean);
    }
  }
  return merged;
}

function loadKeybinds() {
  // 1) window (se settingsUI já publicou)
  try {
    const w = window;
    const fromWindow =
      w?.FarmXPConfig?.keybinds ||
      w?.gameConfig?.keybinds ||
      w?.config?.keybinds ||
      w?.settings?.keybinds;

    if (fromWindow && typeof fromWindow === 'object') return sanitizeKeybinds(fromWindow);
  } catch {}

  // 2) localStorage (chave oficial do remap)
  try {
    const raw = localStorage.getItem(CONTROLS_STORAGE_KEY);
    if (raw) return sanitizeKeybinds(JSON.parse(raw));
  } catch {}

  // 3) fallback default
  return sanitizeKeybinds(null);
}

function formatTemplate(str, vars) {
  let out = String(str ?? '');
  for (const [k, v] of Object.entries(vars || {})) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

function codeToLabel(code) {
  if (!code) return '?';

  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';

  if (code === 'Space' || code === ' ') return 'Space';

  const mKey = /^Key([A-Z])$/.exec(code);
  if (mKey) return mKey[1];

  const mDigit = /^Digit(\d)$/.exec(code);
  if (mDigit) return mDigit[1];

  const mNum = /^Numpad(\d)$/.exec(code);
  if (mNum) return `Num${mNum[1]}`;

  if (code === 'Enter') return 'Enter';
  if (code === 'Escape') return 'Esc';
  if (code === 'Backspace') return '⌫';
  if (code === 'Tab') return 'Tab';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';

  return String(code).replace(/^Key/, '').replace(/^Digit/, '');
}

function getCodesForAction(action, keybinds) {
  if (action === HELP_ACTION) {
    const fromCfg = Array.isArray(keybinds?.[HELP_ACTION]) ? keybinds[HELP_ACTION] : null;
    return (fromCfg && fromCfg.length) ? fromCfg : [HELP_FALLBACK_CODE];
  }

  const arr = keybinds?.[action];
  if (Array.isArray(arr) && arr.length) return arr;
  return [];
}

function isInputActive() {
  const el = document.activeElement;
  if (!el) return false;

  if (el.matches?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return true;

  // se o remap do settingsUI estiver escutando tecla, não abre/fecha com H
  const keybindsOverlay = document.getElementById('keybinds-overlay');
  if (keybindsOverlay?.classList?.contains('is-open')) return true;

  return false;
}

function getFocusableEls(container) {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  const nodes = Array.from(container.querySelectorAll(selectors.join(',')));
  return nodes.filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return el.getClientRects().length > 0;
  });
}

function trapFocusTab(e) {
  if (!isOpen || e.key !== 'Tab') return false;
  if (!panelEl) return false;

  const focusables = getFocusableEls(panelEl);

  // sem focáveis: mantém foco no painel
  if (!focusables.length) {
    e.preventDefault();
    panelEl.focus?.();
    return true;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  const isInPanel = active && panelEl.contains(active);

  // se o foco escapou por qualquer motivo, puxa de volta
  if (!isInPanel) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus?.();
    return true;
  }

  // loop
  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus?.();
    return true;
  }
  if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus?.();
    return true;
  }

  return false;
}

function ensurePanel() {
  overlayEl = document.getElementById(IDS.overlay);
  panelEl = document.getElementById(IDS.panel);

  if (overlayEl && panelEl) return;

  overlayEl = document.createElement('div');
  overlayEl.id = IDS.overlay;
  overlayEl.className = CLS.overlay;
  overlayEl.setAttribute('aria-hidden', 'true');

  panelEl = document.createElement('div');
  panelEl.id = IDS.panel;
  panelEl.className = CLS.panel;
  panelEl.setAttribute('role', 'dialog');
  panelEl.setAttribute('aria-modal', 'true');
  panelEl.setAttribute('aria-hidden', 'true');
  panelEl.tabIndex = -1;

  const header = document.createElement('div');
  header.className = CLS.header;

  const title = document.createElement('h2');
  title.className = CLS.title;
  title.id = `${PREFIX}-help-title`;
  title.textContent = safeT('shortcutsPanel.title', '⌨️ Atalhos de Teclado');

  const subtitle = document.createElement('p');
  subtitle.className = CLS.subtitle;
  subtitle.id = `${PREFIX}-help-subtitle`;
  subtitle.textContent = safeT('shortcutsPanel.subtitle', 'As teclas abaixo refletem suas configurações atuais.');

  const hint = document.createElement('p');
  hint.className = CLS.hint;
  hint.id = `${PREFIX}-help-hint`;

  panelEl.setAttribute('aria-labelledby', title.id);
  panelEl.setAttribute('aria-describedby', `${subtitle.id} ${hint.id}`);

  closeBtnEl = document.createElement('button');
  closeBtnEl.type = 'button';
  closeBtnEl.className = CLS.close;
  closeBtnEl.textContent = '×';
  closeBtnEl.setAttribute('aria-label', safeT('ui.close', 'Fechar'));

  header.appendChild(title);
  header.appendChild(subtitle);
  header.appendChild(hint);
  header.appendChild(closeBtnEl);

  const body = document.createElement('div');
  body.className = CLS.body;

  panelEl.appendChild(header);
  panelEl.appendChild(body);
  overlayEl.appendChild(panelEl);
  document.body.appendChild(overlayEl);

  // click fora fecha
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeHelpPanel();
  });

  closeBtnEl.addEventListener('click', closeHelpPanel);

  buildSections(body);
  rerenderAll();
}

function buildSections(bodyEl) {
  rowRefs.clear();

  for (const sectionMeta of SECTIONS) {
    const section = document.createElement('section');
    section.className = CLS.section;

    const h3 = document.createElement('h3');
    h3.className = CLS.sectionTitle;
    h3.textContent = safeT(sectionMeta.titleKey, sectionMeta.titleKey);
    section.appendChild(h3);

    for (const action of sectionMeta.actions) {
      const row = document.createElement('div');
      row.className = CLS.row;
      row.dataset.action = action;

      const text = document.createElement('div');
      text.className = CLS.rowText;

      const label = document.createElement('div');
      label.className = CLS.rowLabel;
      label.textContent = safeT(`controls.${action}.label`, action);

      const desc = document.createElement('div');
      desc.className = CLS.rowDesc;
      desc.textContent = safeT(`controls.${action}.desc`, '');

      text.appendChild(label);
      text.appendChild(desc);

      const keys = document.createElement('div');
      keys.className = CLS.keys;

      row.appendChild(text);
      row.appendChild(keys);
      section.appendChild(row);

      rowRefs.set(action, { labelEl: label, descEl: desc, keysEl: keys });
    }

    bodyEl.appendChild(section);
  }
}

function setKeysInto(keysEl, codes) {
  keysEl.innerHTML = '';

  if (!codes || !codes.length) {
    const span = document.createElement('span');
    span.textContent = safeT('shortcutsPanel.unbound', 'Não configurado');
    keysEl.appendChild(span);
    return;
  }

  const labels = codes.filter(Boolean).map(codeToLabel);
  labels.forEach((lab, idx) => {
    const kbd = document.createElement('kbd');
    kbd.className = CLS.kbd;
    kbd.textContent = lab;
    keysEl.appendChild(kbd);

    if (idx < labels.length - 1) {
      const sep = document.createElement('span');
      sep.className = CLS.sep;
      sep.textContent = '/';
      keysEl.appendChild(sep);
    }
  });
}

function getHelpKeyLabel(keybinds) {
  const codes = getCodesForAction(HELP_ACTION, keybinds);
  return (codes && codes.length) ? codeToLabel(codes[0]) : 'H';
}

function rerenderTexts(keybinds) {
  // header
  const titleEl = panelEl?.querySelector?.(`.${CLS.title}`);
  if (titleEl) titleEl.textContent = safeT('shortcutsPanel.title', '⌨️ Atalhos de Teclado');

  const subtitleEl = panelEl?.querySelector?.(`.${CLS.subtitle}`);
  if (subtitleEl) subtitleEl.textContent = safeT('shortcutsPanel.subtitle', 'As teclas abaixo refletem suas configurações atuais.');

  const hintEl = panelEl?.querySelector?.(`.${CLS.hint}`);
  if (hintEl) {
    const hintTpl = safeT('shortcutsPanel.hintToggle', 'Pressione {key} para abrir/fechar.');
    hintEl.textContent = formatTemplate(hintTpl, { key: getHelpKeyLabel(keybinds) });
  }

  // close aria
  if (closeBtnEl) closeBtnEl.setAttribute('aria-label', safeT('ui.close', 'Fechar'));

  // section titles — apply by index (safe because SECTIONS is fixed)
  const titlesArr = Array.from(panelEl?.querySelectorAll?.(`.${CLS.sectionTitle}`) || []);
  SECTIONS.forEach((sec, i) => {
    const h3 = titlesArr[i];
    if (h3) h3.textContent = safeT(sec.titleKey, sec.titleKey);
  });

  // action labels/descs
  for (const [action, refs] of rowRefs.entries()) {
    refs.labelEl.textContent = safeT(`controls.${action}.label`, action);
    refs.descEl.textContent = safeT(`controls.${action}.desc`, '');
  }

  // tooltip do botão HUD (RE-QUERY: HUD recria o DOM no languageChanged)
  const currentHelpBtn = getHelpBtn();
  if (currentHelpBtn) {
    const tipTpl = safeT('hud.helpTooltip', 'Atalhos ({key})');
    const keyLabel = getHelpKeyLabel(keybinds);
    const tip = formatTemplate(tipTpl, { key: keyLabel });

    currentHelpBtn.title = tip;
    currentHelpBtn.setAttribute('aria-label', tip);

    // garante a classe do prefixo (caso o HUD recrie sem ela)
    if (!currentHelpBtn.classList.contains(CLS.btn)) currentHelpBtn.classList.add(CLS.btn);
  }
}

function rerenderKeys(keybinds) {
  for (const [action, refs] of rowRefs.entries()) {
    const codes = getCodesForAction(action, keybinds);
    setKeysInto(refs.keysEl, codes);
  }
}

function rerenderAll() {
  const keybinds = loadKeybinds();
  rerenderTexts(keybinds);
  rerenderKeys(keybinds);
}

function openHelpPanel() {
  if (!overlayEl || !panelEl) return;
  if (isOpen) return;

  lastFocusEl = document.activeElement;

  isOpen = true;
  overlayEl.classList.add(CLS.open);
  panelEl.classList.add(CLS.open);
  overlayEl.setAttribute('aria-hidden', 'false');
  panelEl.setAttribute('aria-hidden', 'false');

  const focusables = getFocusableEls(panelEl);
  const toFocus = (closeBtnEl && typeof closeBtnEl.focus === 'function')
    ? closeBtnEl
    : (focusables[0] || panelEl);

  // garante que o foco entra no diálogo
  queueMicrotask(() => toFocus?.focus?.());
}

function closeHelpPanel() {
  if (!overlayEl || !panelEl) return;
  if (!isOpen) return;

  isOpen = false;
  overlayEl.classList.remove(CLS.open);
  panelEl.classList.remove(CLS.open);
  overlayEl.setAttribute('aria-hidden', 'true');
  panelEl.setAttribute('aria-hidden', 'true');

  // restaura foco (RE-QUERY do botão atual)
  const currentHelpBtn = getHelpBtn();
  const canFocusLast = lastFocusEl && typeof lastFocusEl.focus === 'function' && document.contains(lastFocusEl);
  const toFocus = canFocusLast ? lastFocusEl : currentHelpBtn;
  toFocus?.focus?.();
  lastFocusEl = null;
}

export function toggleHelpPanel(force) {
  if (!mounted) initHelpPanel();

  if (typeof force === 'boolean') {
    force ? openHelpPanel() : closeHelpPanel();
    return;
  }
  isOpen ? closeHelpPanel() : openHelpPanel();
}

function onGlobalKeydown(e) {
  if (e.defaultPrevented) return;

  // focus-trap (quando aberto e aria-modal=true)
  if (trapFocusTab(e)) return;

  // ESC fecha quando aberto
  if (isOpen && e.key === 'Escape') {
    e.preventDefault();
    closeHelpPanel();
    return;
  }

  // atalho do Help (sem ctrl/alt/meta e sem input ativo)
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (isInputActive()) return;

  const helpCodes = getCodesForAction(HELP_ACTION, loadKeybinds());
  const pressedCode = String(e.code || '');
  if (helpCodes.includes(pressedCode)) {
    e.preventDefault();
    toggleHelpPanel();
  }
}

function onControlsChanged(e) {
  const next = sanitizeKeybinds(e?.detail?.keybinds);
  rerenderTexts(next);
  rerenderKeys(next);
}

function onLanguageChanged() {
  // HUD pode ser recriado: rerenderAll já re-query o #helpBtn
  rerenderAll();
}

function onHudReady() {
  // HUD recriado: atualiza tooltip/aria do novo #helpBtn
  rerenderAll();
}

function onDocumentClick(e) {
  const btn = e?.target?.closest?.(`#${IDS.btn}`);
  if (!btn) return;
  e.preventDefault();
  toggleHelpPanel();
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  document.addEventListener('keydown', onGlobalKeydown, true);
  document.addEventListener('click', onDocumentClick, true);
  document.addEventListener('controlsChanged', onControlsChanged);
  document.addEventListener('languageChanged', onLanguageChanged);
  document.addEventListener('hudReady', onHudReady);
}

export function initHelpPanel() {
  if (mounted) return;

  ensurePanel();
  bindEvents();

  mounted = true;

  try {
    window.FarmXPHelpPanel = {
      open: () => toggleHelpPanel(true),
      close: () => toggleHelpPanel(false),
      toggle: () => toggleHelpPanel(),
    };
  } catch {}

  logger?.info?.('✅ HelpPanel initialized');
}

// Lazy event wiring (não cria DOM até o primeiro uso)
bindEvents();
// Sincroniza tooltip/aria do botão caso o HUD já exista
queueMicrotask(() => rerenderAll());
