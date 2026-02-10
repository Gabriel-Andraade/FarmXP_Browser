/**
 * @file helpPanel.js - Keyboard Shortcuts Help Panel (dynamic from remap config)
 * Prefix CSS: khp-
 *
 * - Button: #helpBtn (HUD)
 * - Overlay: #khp-help-overlay
 * - Panel:   #khp-help-panel
 *
 * Observa:
 * - "controlsChanged" (emitido pelo settingsUI) para refletir remaps em tempo real.
 * - "languageChanged" para atualizar textos via i18n.
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
let btnEl = null;

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
  // merge profundo simples com DEFAULT_KEYBINDS
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

  // inputs/textareas/select/contenteditable
  if (el.matches?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return true;

  // se o remap do settingsUI estiver escutando tecla, não abre/fecha com H
  const keybindsOverlay = document.getElementById('keybinds-overlay');
  if (keybindsOverlay?.classList?.contains('is-open')) return true;

  return false;
}

function findHudContainer() {
  const selectors = [
    '#hudButtons',
    '#hud-buttons',
    '#hudActions',
    '.hud-buttons',
    '.hud-actions',
    '#playerHUD',
    '#player-hud',
    '#hud',
    '.hud-action-buttons',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function ensureHelpButton() {
  btnEl = document.getElementById(IDS.btn);
  if (btnEl) return btnEl;

  const container = findHudContainer();
  btnEl = document.createElement('button');
  btnEl.id = IDS.btn;
  btnEl.type = 'button';
  btnEl.className = `hud-action-btn ${CLS.btn}`;
  btnEl.textContent = '❓';

  if (container) {
    container.appendChild(btnEl);
  } else {
    // fallback: não quebra; só coloca no body
    document.body.appendChild(btnEl);
    logger?.warn?.('⚠️ HUD container not found; help button appended to body.');
  }

  return btnEl;
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

  const header = document.createElement('div');
  header.className = CLS.header;

  const title = document.createElement('h2');
  title.className = CLS.title;
  title.textContent = safeT('shortcutsPanel.title', '⌨️ Atalhos de Teclado');

  const subtitle = document.createElement('p');
  subtitle.className = CLS.subtitle;
  subtitle.textContent = safeT('shortcutsPanel.subtitle', 'As teclas abaixo refletem suas configurações atuais.');

  const hint = document.createElement('p');
  hint.className = CLS.hint;

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

  rerenderAll(); // textos + teclas
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

  // section titles
  const sectionTitles = panelEl?.querySelectorAll?.(`.${CLS.sectionTitle}`) || [];
  sectionTitles.forEach((h3) => {
    // não temos o key guardado no element; re-aplica via texto atual não é confiável
    // então recalculamos percorrendo SECTIONS e batendo por ordem
  });
  // aplica por ordem (robusto o suficiente porque SECTIONS é fixo)
  const titlesArr = Array.from(sectionTitles);
  SECTIONS.forEach((sec, i) => {
    const h3 = titlesArr[i];
    if (h3) h3.textContent = safeT(sec.titleKey, sec.titleKey);
  });

  // action labels/descs
  for (const [action, refs] of rowRefs.entries()) {
    refs.labelEl.textContent = safeT(`controls.${action}.label`, action);
    refs.descEl.textContent = safeT(`controls.${action}.desc`, '');
  }

  // tooltip do botão HUD
  if (btnEl) {
    const tipTpl = safeT('hud.helpTooltip', 'Atalhos ({key})');
    const keyLabel = getHelpKeyLabel(keybinds);
    const tip = formatTemplate(tipTpl, { key: keyLabel });
    btnEl.title = tip;
    btnEl.setAttribute('aria-label', tip);
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

  // foco
  closeBtnEl?.focus?.();
}

function closeHelpPanel() {
  if (!overlayEl || !panelEl) return;
  if (!isOpen) return;

  isOpen = false;
  overlayEl.classList.remove(CLS.open);
  panelEl.classList.remove(CLS.open);
  overlayEl.setAttribute('aria-hidden', 'true');
  panelEl.setAttribute('aria-hidden', 'true');

  // restaura foco
  const toFocus = lastFocusEl && lastFocusEl.focus ? lastFocusEl : btnEl;
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

  // ESC fecha quando aberto
  if (isOpen && e.key === 'Escape') {
    e.preventDefault();
    closeHelpPanel();
    return;
  }

  // H abre/fecha (sem ctrl/alt/meta e sem input ativo)
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (isInputActive()) return;

  if (String(e.key || '').toLowerCase() === 'h') {
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
  // re-render completo pra pegar novas traduções
  rerenderAll();
}

function bindEvents() {
  // botão HUD
  btnEl?.addEventListener('click', () => toggleHelpPanel(true));

  // teclado global
  document.addEventListener('keydown', onGlobalKeydown, true);

  // remap ao vivo (settingsUI dispara este evento)
  document.addEventListener('controlsChanged', onControlsChanged);

  // i18n
  document.addEventListener('languageChanged', onLanguageChanged);
}

export function initHelpPanel() {
  if (mounted) return;

  btnEl = ensureHelpButton();
  ensurePanel();
  bindEvents();

  mounted = true;

  // expõe uma API pequena pra debug
  try {
    window.FarmXPHelpPanel = {
      open: () => toggleHelpPanel(true),
      close: () => toggleHelpPanel(false),
      toggle: () => toggleHelpPanel(),
    };
  } catch {}

  logger?.info?.('✅ HelpPanel initialized');
}

// Auto-init
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHelpPanel);
  } else {
    initHelpPanel();
  }
}
