/**
 * @file settingsUI.js - Settings UI Management
 * @description Handles the settings interface including language selection + keybind remap
 */

import { i18n, t } from './i18n/i18n.js';
import { logger } from './logger.js';
import { a11y } from './accessibility.js';
import { CONTROLS_STORAGE_KEY, DEFAULT_KEYBINDS } from './keybindDefaults.js';

/* ─────────────────────────────────────────────
 * Keybinds (Remap)
 * ───────────────────────────────────────────── */

const ACTION_META = [
  { action: 'moveUp', fallbackLabel: 'Mover para cima', fallbackDesc: 'Andar para cima' },
  { action: 'moveDown', fallbackLabel: 'Mover para baixo', fallbackDesc: 'Andar para baixo' },
  { action: 'moveLeft', fallbackLabel: 'Mover para esquerda', fallbackDesc: 'Andar para esquerda' },
  { action: 'moveRight', fallbackLabel: 'Mover para direita', fallbackDesc: 'Andar para direita' },
  { action: 'interact', fallbackLabel: 'Interagir', fallbackDesc: 'Interação / usar' },
  { action: 'jump', fallbackLabel: 'Pular', fallbackDesc: 'Pulo' },
  { action: 'inventory', fallbackLabel: 'Inventário', fallbackDesc: 'Abrir/fechar inventário' },
  { action: 'merchants', fallbackLabel: 'Mercadores', fallbackDesc: 'Abrir/fechar mercadores' },
  { action: 'config', fallbackLabel: 'Configurações', fallbackDesc: 'Abrir/fechar configurações' },
];

let keybindsState = loadKeybinds();
let keybindsUIReady = false;

// estado do “escutando tecla”
let listening = null; // { action, slot }
let keyCaptureAbort = null;

// evita warning "aria-hidden com foco dentro" (restaura foco ao fechar)
let lastFocusEl = null;

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
  const merged = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
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
  try {
    const raw = localStorage.getItem(CONTROLS_STORAGE_KEY);
    if (!raw) return sanitizeKeybinds(null);
    return sanitizeKeybinds(JSON.parse(raw));
  } catch {
    return sanitizeKeybinds(null);
  }
}

function persistKeybinds(next) {
  try {
    localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function dispatchControlsChanged(next) {
  try {
    document.dispatchEvent(new CustomEvent('controlsChanged', { detail: { keybinds: next } }));
  } catch {}
}

function publishToWindow(next) {
  try {
    window.FarmXPConfig = window.FarmXPConfig || {};
    window.FarmXPConfig.keybinds = next;
  } catch {}
}

export function getKeybinds() {
  return sanitizeKeybinds(keybindsState);
}

export function setKeybinds(next) {
  keybindsState = sanitizeKeybinds(next);
  persistKeybinds(keybindsState);
  publishToWindow(keybindsState);
  dispatchControlsChanged(keybindsState);
  rerenderKeybindsList();
}

export function resetKeybinds() {
  setKeybinds(DEFAULT_KEYBINDS);
}

function codeToLabel(code) {
  if (!code) return '?';

  // setas
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';

  // espaço
  if (code === 'Space' || code === ' ') return 'Space';

  // letras
  const mKey = /^Key([A-Z])$/.exec(code);
  if (mKey) return mKey[1];

  // números em cima
  const mDigit = /^Digit(\d)$/.exec(code);
  if (mDigit) return mDigit[1];

  // numpad
  const mNum = /^Numpad(\d)$/.exec(code);
  if (mNum) return `Num${mNum[1]}`;

  // teclas comuns
  if (code === 'Enter') return 'Enter';
  if (code === 'Escape') return 'Esc';
  if (code === 'Backspace') return '⌫';
  if (code === 'Tab') return 'Tab';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';

  // fallback “bonitinho”
  return String(code).replace(/^Key/, '').replace(/^Digit/, '');
}

function isProbablyVisible(el) {
  if (!el || !el.isConnected) return false;
  // getClientRects pega fixed/absolute também
  try {
    return el.getClientRects().length > 0;
  } catch {
    return false;
  }
}

/* ─────────────────────────────────────────────
 * UI mounting
 * ───────────────────────────────────────────── */
function ensureKeybindsMenuOption() {
  const configModal = document.getElementById('configModal');
  if (!configModal) return;

  const configContent =
    document.getElementById('config-content') ||
    configModal.querySelector('#config-content') ||
    configModal;

  // evita duplicar
  if (document.getElementById('open-keybinds-btn')) return;

  // tenta achar uma seção “geral”; se não existir, cria seção Controles
  let controlsSection = configContent.querySelector?.('#controls-section');
  if (!controlsSection && configContent) {
    controlsSection = document.createElement('div');
    controlsSection.className = 'config-section';
    controlsSection.id = 'controls-section';

    const h3 = document.createElement('h3');
    h3.setAttribute('data-i18n', 'settings.controls.title');
    h3.textContent = safeT('settings.controls.title', 'Controles');

    controlsSection.appendChild(h3);
    configContent.appendChild(controlsSection);
  }

  const option = document.createElement('div');
  option.className = 'config-option config-option--keybinds';

  const left = document.createElement('div');

  const label = document.createElement('div');
  label.className = 'config-label';
  label.setAttribute('data-i18n', 'settings.controls.remap');
  label.textContent = safeT('settings.controls.remap', 'Remapear teclas');

  const hint = document.createElement('div');
  hint.className = 'config-hint';
  hint.setAttribute('data-i18n', 'settings.controls.remapHint');
  hint.textContent = safeT(
    'settings.controls.remapHint',
    'Personalize as teclas do teclado (WASD, setas, atalhos).'
  );

  left.appendChild(label);
  left.appendChild(hint);

  const btn = document.createElement('button');
  btn.id = 'open-keybinds-btn';
  btn.className = 'config-button';
  btn.type = 'button';
  btn.setAttribute('data-i18n', 'settings.controls.openRemap');
  btn.textContent = safeT('settings.controls.openRemap', 'Abrir');

  btn.addEventListener('click', () => openKeybindsModal());

  option.appendChild(left);
  option.appendChild(btn);

  controlsSection.appendChild(option);

  // aplica tradução se já estiver ativo
  try { translateDOM(); } catch {}
}

function ensureKeybindsModal() {
  if (document.getElementById('keybinds-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'keybinds-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-hidden', 'true');

  // IMPORTANT: quando escondido, usa inert pra impedir foco/teclado
  overlay.setAttribute('inert', '');

  // fecha clicando fora
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) closeKeybindsModal();
  });

  const modal = document.createElement('div');
  modal.id = 'keybinds-modal';
  modal.setAttribute('role', 'document');
  modal.tabIndex = -1;

  const header = document.createElement('div');
  header.className = 'keybinds-header';

  const titleWrap = document.createElement('div');

  const title = document.createElement('div');
  title.className = 'keybinds-title';
  title.setAttribute('data-i18n', 'settings.controls.remapTitle');
  title.textContent = safeT('settings.controls.remapTitle', 'Remapear teclas');

  const subtitle = document.createElement('div');
  subtitle.className = 'keybinds-subtitle';
  subtitle.id = 'keybinds-subtitle';
  subtitle.setAttribute('data-i18n', 'settings.controls.remapSubtitle');
  subtitle.textContent = safeT(
    'settings.controls.remapSubtitle',
    'Clique em uma tecla para trocar. ESC cancela.'
  );

  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'config-button config-button--secondary';
  closeBtn.type = 'button';
  closeBtn.setAttribute('data-i18n', 'ui.close');
  closeBtn.textContent = safeT('ui.close', 'Fechar');
  closeBtn.addEventListener('click', () => closeKeybindsModal());

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'keybinds-body';

  const list = document.createElement('div');
  list.id = 'keybinds-list';
  body.appendChild(list);

  const footer = document.createElement('div');
  footer.className = 'keybinds-footer';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'config-button config-button--secondary';
  resetBtn.type = 'button';
  resetBtn.setAttribute('data-i18n', 'settings.controls.reset');
  resetBtn.textContent = safeT('settings.controls.reset', 'Padrão');
  resetBtn.addEventListener('click', () => {
    resetKeybinds();
    setSubtitleHint(null);
  });

  const doneBtn = document.createElement('button');
  doneBtn.className = 'config-button';
  doneBtn.type = 'button';
  doneBtn.setAttribute('data-i18n', 'ui.done');
  doneBtn.textContent = safeT('ui.done', 'Concluir');
  doneBtn.addEventListener('click', () => closeKeybindsModal());

  footer.appendChild(resetBtn);
  footer.appendChild(doneBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ESC fecha modal de remap
  document.addEventListener('keydown', (e) => {
    const isOpen = overlay.classList.contains('is-open');
    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      // se estava “escutando”, cancela primeiro
      if (listening) {
        stopListening(true);
      } else {
        closeKeybindsModal();
      }
    }
  }, { capture: true });

  keybindsUIReady = true;
  rerenderKeybindsList();
  try { translateDOM(); } catch {}
}

function setSubtitleHint(text) {
  const el = document.getElementById('keybinds-subtitle');
  if (!el) return;
  if (!text) {
    el.textContent = safeT('settings.controls.remapSubtitle', 'Clique em uma tecla para trocar. ESC cancela.');
    return;
  }
  el.textContent = text;
}

function rerenderKeybindsList() {
  const list = document.getElementById('keybinds-list');
  if (!list) return;

  list.innerHTML = '';

  for (const meta of ACTION_META) {
    const row = document.createElement('div');
    row.className = 'keybind-row';

    const left = document.createElement('div');

    const actionLabel = document.createElement('div');
    actionLabel.className = 'keybind-action';
    actionLabel.setAttribute('data-i18n', `controls.${meta.action}.label`);
    actionLabel.textContent = safeT(`controls.${meta.action}.label`, meta.fallbackLabel);

    const desc = document.createElement('div');
    desc.className = 'keybind-desc';
    desc.setAttribute('data-i18n', `controls.${meta.action}.desc`);
    desc.textContent = safeT(`controls.${meta.action}.desc`, meta.fallbackDesc);

    left.appendChild(actionLabel);
    left.appendChild(desc);

    const right = document.createElement('div');
    right.className = 'keybind-keys';

    const binds = keybindsState?.[meta.action] || [];
    const slots = meta.action.startsWith('move') ? 2 : 1;

    for (let slot = 0; slot < slots; slot++) {
      const code = binds[slot] || null;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ui-keycap ui-keycap--small';
      btn.dataset.action = meta.action;
      btn.dataset.slot = String(slot);
      btn.textContent = code ? codeToLabel(code) : '—';

      // “escutando”
      if (listening && listening.action === meta.action && listening.slot === slot) {
        btn.classList.add('ui-keycap--listening');
        btn.textContent = '...';
      }

      btn.addEventListener('click', () => {
        startListening(meta.action, slot);
      });

      right.appendChild(btn);

      if (slot === 0 && slots === 2) {
        const sep = document.createElement('span');
        sep.className = 'keybind-sep';
        sep.textContent = '/';
        right.appendChild(sep);
      }
    }

    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  }

  try { translateDOM(); } catch {}
}

function openKeybindsModal() {
  ensureKeybindsModal();

  const overlay = document.getElementById('keybinds-overlay');
  const modal = document.getElementById('keybinds-modal');
  if (!overlay || !modal) return;

  // guarda o foco antes de abrir
  lastFocusEl = document.activeElement;

  // reabilita interação/foco do overlay
  overlay.removeAttribute('inert');

  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');

  // foca modal e trava foco
  try { modal.focus(); } catch {}
  try { a11y.trapFocus(modal); } catch {}

  // publica estado atual (para o control.js conseguir puxar via window se quiser)
  publishToWindow(keybindsState);
}

function closeKeybindsModal() {
  const overlay = document.getElementById('keybinds-overlay');
  const modal = document.getElementById('keybinds-modal');
  if (!overlay) return;

  stopListening(true);

  // 1) solta o focus trap primeiro
  try { a11y.releaseFocus(modal); } catch {}

  // 2) tira o foco de dentro ANTES de aplicar aria-hidden/inert
  try {
    const fallback = document.getElementById('open-keybinds-btn');

    const target =
      (lastFocusEl && isProbablyVisible(lastFocusEl)) ? lastFocusEl :
      (fallback && isProbablyVisible(fallback)) ? fallback :
      null;

    target?.focus?.();
  } catch {}

  // 3) agora sim esconde e bloqueia foco/teclado
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('inert', '');
}

function startListening(action, slot) {
  ensureKeybindsModal();

  // regra: não deixa limpar slot 0 (evita cair no DEFAULT via sanitize do control.js)
  // slot 1 pode ficar vazio? a gente não deixa vazio também; então “Backspace/Delete” vai remover slot 1 (se existir)
  listening = { action, slot };
  setSubtitleHint(safeT('settings.controls.pressKey', 'Pressione uma tecla… (ESC cancela, Backspace apaga o secundário)'));
  rerenderKeybindsList();

  if (keyCaptureAbort) {
    try { keyCaptureAbort.abort(); } catch {}
  }
  keyCaptureAbort = new AbortController();

  const onKeyDown = (e) => {
    const overlay = document.getElementById('keybinds-overlay');
    if (!overlay?.classList.contains('is-open')) return;
    if (!listening) return;

    // impede jogo / config modal reagir enquanto remapeia
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const key = e.key;
    const code = e.code || e.key;

    if (key === 'Escape') {
      stopListening(true);
      return;
    }

    // apagar apenas o secundário (slot 1)
    if ((key === 'Backspace' || key === 'Delete') && listening.slot === 1) {
      const next = JSON.parse(JSON.stringify(keybindsState));
      const arr = Array.isArray(next[listening.action]) ? next[listening.action].slice(0, 2) : [];
      arr[1] = null;

      // compacta removendo falsy no final
      const compact = arr.filter(Boolean);
      // mantém slot 0 sempre
      if (!compact.length) {
        compact.push(DEFAULT_KEYBINDS[listening.action]?.[0]);
      }

      next[listening.action] = compact;
      setKeybinds(next);
      stopListening(false);
      return;
    }

    // ignora teclas “só modificador”
    if (
      code === 'ShiftLeft' || code === 'ShiftRight' ||
      code === 'ControlLeft' || code === 'ControlRight' ||
      code === 'AltLeft' || code === 'AltRight' ||
      code === 'MetaLeft' || code === 'MetaRight'
    ) {
      return;
    }

    // aplica bind
    applyBind(listening.action, listening.slot, code);
    stopListening(false);
  };

  document.addEventListener('keydown', onKeyDown, { capture: true, signal: keyCaptureAbort.signal });
}

function stopListening(restoreSubtitle) {
  listening = null;
  if (keyCaptureAbort) {
    try { keyCaptureAbort.abort(); } catch {}
    keyCaptureAbort = null;
  }
  if (restoreSubtitle) setSubtitleHint(null);
  rerenderKeybindsList();
}

function applyBind(action, slot, code) {
  const next = JSON.parse(JSON.stringify(keybindsState));

  // garante array
  let arr = Array.isArray(next[action]) ? next[action].slice(0, 2) : [];
  const maxSlots = action.startsWith('move') ? 2 : 1;

  // normaliza tamanho
  while (arr.length < maxSlots) arr.push(null);

  // remove esse code de outras ações (evita conflito)
  for (const k of Object.keys(next)) {
    if (!Array.isArray(next[k])) continue;
    next[k] = next[k].filter((c) => c !== code);
    // garante que não zere (pra não voltar no default pelo sanitize do control.js)
    if (!next[k].length) {
      next[k] = [DEFAULT_KEYBINDS[k]?.[0]];
    }
  }

  // aplica no slot
  arr[slot] = code;

  // compacta (mas mantém slot 0 sempre)
  const compact = arr.filter(Boolean);
  if (!compact.length) compact.push(DEFAULT_KEYBINDS[action]?.[0]);

  // limita quantidade por tipo
  next[action] = compact.slice(0, maxSlots);

  setKeybinds(next);
}

/* ─────────────────────────────────────────────
 * Initialize settings UI
 * ───────────────────────────────────────────── */

/**
 * Initialize settings UI components and language selector
 * Sets up event listeners for language changes and updates DOM translations
 */
export function initSettingsUI() {
  const languageSelect = document.getElementById('languageSelect');

  if (!languageSelect) {
    // antes retornava e bloqueava o resto; agora só avisa e continua
    logger.warn('⚠️ Language selector not found in DOM');
  } else {
    // Set current language in selector
    languageSelect.value = i18n.getCurrentLanguage();

    // Handle language change
    languageSelect.addEventListener('change', async (e) => {
      const newLang = e.target.value;
      logger.info(`🌍 Changing language to: ${newLang}`);

      const success = i18n.setLanguage(newLang);

      if (!success) {
        logger.error(`❌ Failed to load language: ${newLang}`);
        alert(t('messages.languageChangeFailed'));
        // Revert to current language
        languageSelect.value = i18n.getCurrentLanguage();
      } else {
        logger.info(`✅ Language changed successfully to: ${newLang}`);
        document.documentElement.lang = newLang;
        translateDOM();
      }
    });

    // Update DOM on language change (from other sources)
    document.addEventListener('languageChanged', (e) => {
      const { language } = e.detail;
      languageSelect.value = language;
      document.documentElement.lang = language;
      translateDOM();
    });
  }

  initAccessibilityUI();
  initConfigModalFocusTrap();

  // monta a opção + modal de remap
  ensureKeybindsMenuOption();
  ensureKeybindsModal();
  publishToWindow(keybindsState);

  logger.info('✅ Settings UI initialized');
}

/**
 * Bind accessibility settings controls to the AccessibilityManager
 */
function initAccessibilityUI() {
  const highContrast = document.getElementById('a11yHighContrast');
  const reducedMotion = document.getElementById('a11yReducedMotion');
  const textSize = document.getElementById('a11yTextSize');
  const screenReader = document.getElementById('a11yScreenReader');

  if (highContrast) {
    highContrast.checked = !!a11y.getSetting('highContrast');
    highContrast.addEventListener('change', () => {
      a11y.setSetting('highContrast', highContrast.checked);
    });
  }

  if (reducedMotion) {
    reducedMotion.checked = !!a11y.getSetting('reducedMotion');
    reducedMotion.addEventListener('change', () => {
      a11y.setSetting('reducedMotion', reducedMotion.checked);
    });
  }

  if (textSize) {
    textSize.value = a11y.getSetting('textSize') || 'normal';
    textSize.addEventListener('change', () => {
      a11y.setSetting('textSize', textSize.value);
    });
  }

  if (screenReader) {
    screenReader.checked = !!a11y.getSetting('screenReaderAnnouncements');
    screenReader.addEventListener('change', () => {
      a11y.setSetting('screenReaderAnnouncements', screenReader.checked);
    });
  }

  const colorVision = document.getElementById('a11yColorVision');
  if (colorVision) {
    colorVision.value = a11y.getSetting('colorVisionMode') || 'off';
    colorVision.addEventListener('change', () => {
      a11y.setSetting('colorVisionMode', colorVision.value);
    });
  }
}

/**
 * Observe configModal class changes to trap/release focus
 */
function initConfigModalFocusTrap() {
  const configModal = document.getElementById('configModal');
  if (!configModal) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'class') {
        if (configModal.classList.contains('active')) {
          a11y.trapFocus(configModal);
          // quando abrir o config, garante que a opção existe
          ensureKeybindsMenuOption();
        } else {
          a11y.releaseFocus(configModal);
          // se o config fechar, fecha o remap também
          closeKeybindsModal();
        }
      }
    }
  });

  observer.observe(configModal, { attributes: true, attributeFilter: ['class'] });

  // ESC to close config modal
  configModal.addEventListener('keydown', (e) => {
    // se o remap estiver aberto, ele próprio captura ESC
    if (e.key === 'Escape' && configModal.classList.contains('active')) {
      const overlay = document.getElementById('keybinds-overlay');
      if (overlay?.classList.contains('is-open')) return;
      configModal.classList.remove('active');
    }
  });
}

/**
 * Translate all DOM elements with data-i18n attributes to current language
 */
export function translateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');

    // Preserve emoji if present
    const emoji = el.textContent.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+/u)?.[0] || '';
    const translation = t(key);

    if (emoji) {
      el.textContent = `${emoji} ${translation}`;
    } else {
      el.textContent = translation;
    }
  });
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsUI);
  } else {
    initSettingsUI();
  }
}

export default {
  initSettingsUI,
  translateDOM,
  getKeybinds,
  setKeybinds,
  resetKeybinds,
};
