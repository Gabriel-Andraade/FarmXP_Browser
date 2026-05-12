/**
 * @file vetSystem.js - Painel da Veterinária (Alice)
 * Modal aberto a partir do mapa de viagem quando o jogador chega no
 * Veterinário. O personagem do jogador NÃO renderiza no mundo enquanto
 * o painel está aberto: o painel cobre a tela toda.
 *
 * Estrutura:
 *  - Lado esquerdo: 4 botões quadrados de interação (placeholders).
 *    Ao clicar, dispara um CustomEvent('vetActionClick', { actionId }) no
 *    document, para que o jogador possa "bolar" a ação depois.
 *  - Centro: Alice.png inteira, em moldura elegante combinando com a palheta.
 *
 * Uso:
 *   const vet = getSystem('vet');
 *   vet.open();
 *   vet.close();
 */

import { registerSystem, getSystem } from './gameState.js';
import { t } from './i18n/i18n.js';
import { logger } from './logger.js';
import { mountHospitalizeView } from './animal/hospitalizePanel.js';
import { mountRecoveryView } from './animal/recoveryPanel.js';
import { mountDiagnoseView } from './animal/diagnosePanel.js';
import { mountMedicineView } from './animal/medicinePanel.js';
import { animals } from './theWorld.js';

const ALICE_SRC = 'assets/character/portrait/Alice.png';

// Botões de interação (lado esquerdo). Os ids são estáveis para o usuário
// poder "bolar" o que cada um faz mais tarde via o evento `vetActionClick`.
const ACTION_BUTTONS = [
  { id: 'talk',         icon: '💬', labelKey: 'vet.actions.one' },
  { id: 'diagnose',     icon: '🩺', labelKey: 'vet.actions.two' },
  { id: 'hospitalize',  icon: '🏥', labelKey: 'vet.actions.three' },
  { id: 'medicine',     icon: '💊', labelKey: 'vet.actions.four' },
];

// ───────────────────────────────────────────────────────────────────────────
// Tracking da intro da Alice por (saveSlot, characterId).
//
// Regra: intro aparece quando o player entra num combo (save, personagem) que
// ainda não foi visto. Ou seja:
//   • Stella → Graham      → reaparece (personagem novo)
//   • Slot 0 → Slot 1      → reaparece (save novo)
//   • Mesmo slot+char na mesma sessão → não reaparece
//   • Mesmo slot+char entre sessões    → não reaparece (persistido)
//
// Duas camadas:
//   • SESSION_SEEN: Set em memória, perde no reload — pega "estou voltando
//     ao mesmo combo agora mesmo, mesmo que o save ainda não exista".
//   • localStorage:  Set persistido em JSON, sobrevive reload — pega
//     "já vi essa intro nesse slot+personagem em outra sessão".
//
// Combo no formato "<slot>:<charId>" — slot vira "fresh" quando ainda não
// existe save ativo. Quando o player salva pela primeira vez (slot vai de
// null pra N), migramos "fresh:char" → "<N>:char" nos dois conjuntos.
// ───────────────────────────────────────────────────────────────────────────
const INTRO_PERSIST_KEY = 'farmxp_vet_alice_intro_seen_v2';
const SESSION_SEEN = new Set();

function _loadPersistedSeen() {
  try {
    const raw = localStorage.getItem(INTRO_PERSIST_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

function _savePersistedSeen(set) {
  try { localStorage.setItem(INTRO_PERSIST_KEY, JSON.stringify([...set])); } catch {}
}

function _currentIntroCombo() {
  const saveSys = getSystem('save');
  const slot = saveSys?.activeSlot;
  const playerSys = getSystem('player');
  const rawId = playerSys?.activeCharacter?.id;
  const allowed = ['stella', 'ben', 'graham'];
  const charId = allowed.includes(rawId) ? rawId : 'stella';
  const slotKey = (slot === null || slot === undefined) ? 'fresh' : `slot${slot}`;
  return { combo: `${slotKey}:${charId}`, slotKey, charId };
}

function _isIntroSeen(combo) {
  if (SESSION_SEEN.has(combo)) return true;
  return _loadPersistedSeen().has(combo);
}

function _markIntroSeen(combo) {
  SESSION_SEEN.add(combo);
  // Só persiste se já tem slot real — "fresh:*" fica só na memória até
  // o player salvar; aí o migrate joga pro slot certo.
  if (!combo.startsWith('fresh:')) {
    const persisted = _loadPersistedSeen();
    persisted.add(combo);
    _savePersistedSeen(persisted);
  }
}

// Migra entradas "fresh:char" → "slot<N>:char" quando o jogo passa a ter
// um slot ativo. Sem isso, ver a intro num jogo não-salvo e depois salvar
// fazia a intro reaparecer (key muda de "fresh:stella" pra "slot0:stella").
function _migrateFreshToSlot(newSlot) {
  if (newSlot === null || newSlot === undefined) return;
  const toMigrate = [];
  for (const k of SESSION_SEEN) {
    if (k.startsWith('fresh:')) toMigrate.push(k);
  }
  if (toMigrate.length === 0) return;
  const persisted = _loadPersistedSeen();
  for (const oldKey of toMigrate) {
    SESSION_SEEN.delete(oldKey);
    const newKey = `slot${newSlot}:${oldKey.slice(6)}`;
    SESSION_SEEN.add(newKey);
    persisted.add(newKey);
  }
  _savePersistedSeen(persisted);
}

// Listeners globais (vida toda do app) — capturam saves/loads mesmo com o
// painel fechado, pra migração de "fresh" acontecer no momento certo.
document.addEventListener('save:changed', (e) => _migrateFreshToSlot(e.detail?.slotIndex));
document.addEventListener('save:loaded',  (e) => _migrateFreshToSlot(e.detail?.slotIndex));

// ───────────────────────────────────────────────────────────────────────────
// Beats de "cuidado" — Alice comenta sobre cada animal atualmente sob
// supervisão dela: internados no hospital (ferimento severo) E animais em
// tratamento (doença diagnosticada, ainda tomando remédio). Esses beats
// rodam SEMPRE que o player clica em Conversar, depois da intro/saudação.
//
// Gênero do animal define a concordância — usa o campo `gender` definido
// em SPECIES_GENDER (animalAI.js). Snapshot do hospital preserva o gender.
// ───────────────────────────────────────────────────────────────────────────
function _resolveAnimalName(assetName, customName) {
  if (customName) return customName;
  const key = `animals.${(assetName || '').toLowerCase()}`;
  const localized = t(key);
  return localized !== key ? localized : (assetName || 'animal');
}

function _gatherCareBeats() {
  const beats = [];

  // Internados (ferimento severo). Animal está fora do mundo enquanto
  // internado — usamos o snapshot do hospital pra pegar gender/asset.
  const hospital = getSystem('hospital');
  if (hospital && typeof hospital.getEntries === 'function') {
    for (const entry of hospital.getEntries()) {
      const name = _resolveAnimalName(entry.assetName, entry.customName);
      const gender = entry.animalSnapshot?.gender || 'male';
      const key = gender === 'female'
        ? 'vet.dialogue.care.injuredFemale'
        : 'vet.dialogue.care.injuredMale';
      beats.push({ text: t(key, { name }), name: 'Alice', charId: 'alice' });
    }
  }

  // Doentes em tratamento (diagnóstico feito, ainda em curso). Animais
  // sem diagnóstico não entram — player nem sabe que estão doentes ainda.
  for (const animal of animals) {
    if (!animal?.disease?.diagnosed) continue;
    const name = _resolveAnimalName(animal.assetName, animal.customName);
    const gender = animal.gender || 'male';
    const key = gender === 'female'
      ? 'vet.dialogue.care.medicineFemale'
      : 'vet.dialogue.care.medicineMale';
    beats.push({ text: t(key, { name }), name: 'Alice', charId: 'alice' });
  }

  return beats;
}

class VetPanel {
  constructor() {
    this.overlay = null;
    this.visible = false;
    this._abortController = null;
  }

  isOpen() { return this.visible; }

  open() {
    if (this.visible) return;
    this._buildDOM();
    requestAnimationFrame(() => {
      this.overlay.classList.add('vet-visible');
      // Foco no primeiro botão da sidebar pra player de teclado já
      // ter algo selecionado. Sem isso, Tab cai onde estiver no DOM
      // antes do modal — quase sempre fora dele.
      this._firstActionBtn?.focus();
    });
    this.visible = true;
    document.dispatchEvent(new CustomEvent('vetPanelOpened'));
  }

  close() {
    if (!this.visible && !this.overlay) return;
    if (this.overlay) this.overlay.classList.remove('vet-visible');

    // Aborta o sub-view atual (diagnose/medicine etc.) pra não deixar
    // listeners de document vivos depois que o painel já foi removido.
    if (this._currentSubViewAbort) {
      this._currentSubViewAbort.abort();
      this._currentSubViewAbort = null;
    }
    this._currentView = 'alice';

    setTimeout(() => {
      if (this._abortController) { this._abortController.abort(); this._abortController = null; }
      if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }, 320);

    this.visible = false;
    document.dispatchEvent(new CustomEvent('vetPanelClosed'));
  }

  _buildDOM() {
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    const overlay = document.createElement('div');
    overlay.id = 'vet-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'vet-title');

    const wrapper = document.createElement('div');
    wrapper.className = 'vet-wrapper';

    // ─── Header (título + close) ──────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'vet-header';

    const titleBox = document.createElement('div');
    titleBox.className = 'vet-title-box';

    const title = document.createElement('h1');
    title.id = 'vet-title';
    title.className = 'vet-title';
    title.textContent = t('vet.title');

    const subtitle = document.createElement('p');
    subtitle.className = 'vet-subtitle';
    subtitle.textContent = t('vet.subtitle');

    titleBox.append(title, subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'vet-close-btn';
    closeBtn.setAttribute('aria-label', t('vet.close'));
    closeBtn.title = t('vet.closeHint');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.close(), { signal });

    header.append(titleBox, closeBtn);

    // ─── Body: lado esquerdo (botões) + centro (Alice) ────────────────────
    const body = document.createElement('div');
    body.className = 'vet-body';

    const sidebar = document.createElement('div');
    sidebar.className = 'vet-sidebar';
    sidebar.setAttribute('role', 'toolbar');
    sidebar.setAttribute('aria-label', t('vet.actionsLabel'));

    const actionRefs = [];
    for (const btn of ACTION_BUTTONS) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'vet-action-btn';
      el.dataset.actionId = btn.id;
      const label = t(btn.labelKey);
      el.setAttribute('aria-label', label);
      el.title = label;

      const iconEl = document.createElement('span');
      iconEl.className = 'vet-action-icon';
      iconEl.textContent = btn.icon;

      const labelEl = document.createElement('span');
      labelEl.className = 'vet-action-label';
      labelEl.textContent = label;

      el.append(iconEl, labelEl);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleAction(btn.id);
      }, { signal });

      sidebar.appendChild(el);
      actionRefs.push({ el, labelEl, labelKey: btn.labelKey });
    }
    this._firstActionBtn = actionRefs[0]?.el || null;

    // ─── Centro: stage com Alice (default) e sub-views inline ────────────
    // O stage abriga dois "modos":
    //   • frame com retrato da Alice (default)
    //   • subView com painel de internação ou retirada
    // Trocar entre eles via _showStageView().
    const stage = document.createElement('div');
    stage.className = 'vet-stage';

    const frame = document.createElement('div');
    frame.className = 'vet-frame';

    const aliceImg = document.createElement('img');
    aliceImg.className = 'vet-alice';
    aliceImg.alt = t('vet.alt');
    aliceImg.src = ALICE_SRC;
    aliceImg.draggable = false;
    aliceImg.addEventListener('error', () => {
      logger.warn?.(`[VetPanel] Falha ao carregar imagem: ${ALICE_SRC}`);
      // Em vez de ícone quebrado, monta uma silhueta com o nome.
      aliceImg.hidden = true;
      const fb = document.createElement('div');
      fb.className = 'vet-alice-fallback';
      fb.setAttribute('aria-hidden', 'true');
      const icon = document.createElement('div');
      icon.className = 'vet-alice-fallback-icon';
      icon.textContent = '👩‍⚕️';
      const name = document.createElement('div');
      name.className = 'vet-alice-fallback-name';
      name.textContent = t('vet.alt');
      fb.append(icon, name);
      frame.appendChild(fb);
      this._aliceFallback = fb;
    });
    frame.appendChild(aliceImg);
    stage.appendChild(frame);

    // Container das sub-views — escondido por padrão, ocupa o stage inteiro.
    const subViewHost = document.createElement('div');
    subViewHost.className = 'vet-subview-host';
    subViewHost.hidden = true;
    stage.appendChild(subViewHost);

    this._stage = stage;
    this._frame = frame;
    this._subViewHost = subViewHost;
    this._currentView = 'alice';

    // Refs guardadas pra retraduzir sem rebuild quando o jogador troca
    // de idioma com o painel aberto. Reconstruir o DOM perderia o
    // estado da sub-view ativa (lista, scroll, animal selecionado).
    this._i18nRefs = {
      title, subtitle, closeBtn, sidebar,
      aliceImg, aliceFallbackName: null, // populado se a Alice falhar
      actions: actionRefs
    };

    // ─── Pill flutuante: abre a view de retirada inline ──────────────────
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'vet-recovery-pill';
    pill.dataset.role = 'recovery-pill';
    pill.hidden = true;
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      this._showStageView('recovery');
    }, { signal });
    stage.appendChild(pill);
    this._recoveryPill = pill;
    this._refreshRecoveryPill();

    // Atualiza a pill quando o estado do hospital muda.
    const refreshHandler = () => this._refreshRecoveryPill();
    document.addEventListener('hospitalUpdated', refreshHandler, { signal });
    document.addEventListener('animalAdmitted', refreshHandler, { signal });
    document.addEventListener('animalRetrieved', refreshHandler, { signal });

    // Trocou de idioma com o painel aberto: re-aplica as traduções nas
    // labels já criadas (não reconstrói o DOM pra preservar a sub-view).
    document.addEventListener('languageChanged', () => this._applyTranslations(), { signal });

    body.append(sidebar, stage);

    wrapper.append(header, body);
    overlay.appendChild(wrapper);

    // Click no fundo (fora do wrapper) fecha.
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    }, { signal });

    // ESC fecha; demais teclas são bloqueadas (não deixam vazar pro jogo).
    // Exceção: no modo dialogue, Space/Enter avançam o balão antes do bloqueio.
    const blockKeys = (e) => {
      if (!this.visible) return;
      if (e.key === 'Escape' && e.type === 'keydown') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
        return;
      }
      if (this._dialogueAdvance && e.type === 'keydown' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this._dialogueAdvance();
        return;
      }
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown',  blockKeys, { capture: true, signal });
    window.addEventListener('keyup',    blockKeys, { capture: true, signal });
    window.addEventListener('keypress', blockKeys, { capture: true, signal });

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  _handleAction(actionId) {
    document.dispatchEvent(new CustomEvent('vetActionClick', {
      detail: { actionId },
    }));

    // Cada botão troca o conteúdo do stage para a view correspondente.
    if (actionId === 'talk') {
      this._showStageView('dialogue');
    } else if (actionId === 'hospitalize') {
      this._showStageView('hospitalize');
    } else if (actionId === 'diagnose') {
      this._showStageView('diagnose');
    } else if (actionId === 'medicine') {
      this._showStageView('medicine');
    }
  }

  /**
   * Troca o conteúdo do stage entre Alice (default), internação, retirada,
   * diagnóstico e loja de remédios.
   * @param {'alice'|'hospitalize'|'recovery'|'diagnose'|'medicine'} viewName
   */
  _showStageView(viewName) {
    if (!this._stage || !this._frame || !this._subViewHost) return;
    if (viewName === this._currentView && viewName === 'alice') return;

    // Aborta listeners de document do sub-view anterior antes de trocar.
    // Sem isso, diagnosePanel/medicinePanel continuam ouvindo
    // `timeChanged` e `diagnosisRetrieved` mesmo depois da troca, e
    // re-renderizam por cima do view novo (player vê flicker que
    // volta pra tela de diagnóstico).
    if (this._currentSubViewAbort) {
      this._currentSubViewAbort.abort();
      this._currentSubViewAbort = null;
    }

    const onBack = () => this._showStageView('alice');

    // Crossfade: marca o elemento entrante com `vet-fading-in` (opacity:0),
    // remove no próximo frame para disparar a transition. Sutil mas evita
    // o "snap" de antes ao trocar de view.
    const fadeIn = (el) => {
      el.classList.add('vet-fading-in');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('vet-fading-in')));
    };

    // Classe `alice-bubble-mode` é específica do view de diálogo (Alice
    // visível + balão na lateral). Sempre remove ao trocar de view e
    // reaplica só no caso 'dialogue', pra layout dos outros sub-views
    // (que precisam ocupar todo o stage) não ser afetado.
    this._subViewHost.classList.remove('alice-bubble-mode');
    this._dialogueAdvance = null;

    if (viewName === 'alice') {
      this._subViewHost.replaceChildren();
      this._subViewHost.hidden = true;
      this._frame.hidden = false;
      fadeIn(this._frame);
    } else if (viewName === 'dialogue') {
      // Alice permanece visível à esquerda; balão ocupa o subview-host à direita.
      this._frame.hidden = false;
      this._subViewHost.hidden = false;
      this._subViewHost.classList.add('alice-bubble-mode');
      this._currentSubViewAbort = this._mountDialogue(this._subViewHost, { onBack }) ?? null;
      fadeIn(this._subViewHost);
    } else if (viewName === 'hospitalize') {
      this._frame.hidden = true;
      this._subViewHost.hidden = false;
      this._currentSubViewAbort = mountHospitalizeView(this._subViewHost, { onBack }) ?? null;
      fadeIn(this._subViewHost);
    } else if (viewName === 'recovery') {
      this._frame.hidden = true;
      this._subViewHost.hidden = false;
      this._currentSubViewAbort = mountRecoveryView(this._subViewHost, { onBack }) ?? null;
      fadeIn(this._subViewHost);
    } else if (viewName === 'diagnose') {
      this._frame.hidden = true;
      this._subViewHost.hidden = false;
      this._currentSubViewAbort = mountDiagnoseView(this._subViewHost, { onBack }) ?? null;
      fadeIn(this._subViewHost);
    } else if (viewName === 'medicine') {
      this._frame.hidden = true;
      this._subViewHost.hidden = false;
      this._currentSubViewAbort = mountMedicineView(this._subViewHost, { onBack }) ?? null;
      fadeIn(this._subViewHost);
    }

    this._currentView = viewName;
    this._refreshRecoveryPill();
  }

  /**
   * Atualiza a pill de "animais internados" no canto do palco.
   * Esconde quando não há entradas, ou quando a view ativa já é a de recovery.
   */
  _refreshRecoveryPill() {
    const pill = this._recoveryPill;
    if (!pill) return;
    if (this._currentView === 'recovery') {
      pill.hidden = true;
      return;
    }
    const hospital = getSystem('hospital');
    if (!hospital) {
      pill.hidden = true;
      return;
    }
    const entries = hospital.getEntries();
    const total = entries.length;
    if (total === 0) {
      pill.hidden = true;
      return;
    }
    const ready = entries.filter(e => (e.daysRemaining ?? 0) <= 0).length;
    pill.hidden = false;
    pill.dataset.ready = ready > 0 ? '1' : '0';
    const label = ready > 0
      ? t('hospital.pill.ready', { count: ready, total })
      : t('hospital.pill.recovering', { total });
    pill.textContent = label;
    pill.setAttribute('aria-label', label);
    pill.title = label;
  }

  /**
   * Monta o balão de fala da Alice no subview-host (modo dialogue).
   * - Mantém a Alice visível à esquerda; balão na direita com cauda apontando pra ela.
   * - Primeira vez: 5 beats de introdução (Alice ↔ Player), com a fala do player
   *   variando conforme o personagem ativo (Stella/Ben/Graham).
   * - Retornos: 1 beat curto de saudação.
   * - Avança por clique no balão ou Space/Enter (via `_dialogueAdvance`).
   * - Ao terminar, marca a intro como vista no localStorage e volta pra Alice default.
   * @returns {AbortController} para que `_showStageView` possa abortar ao trocar de view
   */
  _mountDialogue(host, { onBack }) {
    host.replaceChildren();
    const abort = new AbortController();
    const signal = abort.signal;

    // Combo atual (slot + personagem). Se ainda não foi visto, mostra a
    // intro completa de 5 beats; caso contrário, só a saudação curta.
    // Personagem é decidido pelo `playerSystem.activeCharacter.id`.
    const { combo, charId } = _currentIntroCombo();
    const charDisplayName = { stella: 'Stella', ben: 'Ben', graham: 'Graham' }[charId];
    const seenIntro = _isIntroSeen(combo);

    const beats = seenIntro
      ? [{ text: t('vet.dialogue.aliceBack'), name: 'Alice', charId: 'alice' }]
      : [
          { text: t('vet.dialogue.intro.aliceFirstGreet'), name: 'Alice', charId: 'alice' },
          { text: t(`vet.dialogue.intro.${charId}First`), name: charDisplayName, charId },
          { text: t('vet.dialogue.intro.aliceIntro'), name: 'Alice', charId: 'alice' },
          { text: t(`vet.dialogue.intro.${charId}Name`), name: charDisplayName, charId },
          { text: t('vet.dialogue.intro.aliceOutro'), name: 'Alice', charId: 'alice' },
        ];

    // Alice sempre comenta sobre animais sob seus cuidados (internados ou
    // em tratamento), independente de já ter visto a intro. Vem depois das
    // falas de saudação/intro pra a conversa fluir naturalmente.
    beats.push(..._gatherCareBeats());

    let i = 0;

    const bubble = document.createElement('div');
    bubble.className = 'alice-bubble';
    bubble.setAttribute('role', 'dialog');
    bubble.setAttribute('aria-live', 'polite');

    const tail = document.createElement('div');
    tail.className = 'alice-bubble-tail';
    tail.setAttribute('aria-hidden', 'true');

    const textEl = document.createElement('div');
    textEl.className = 'alice-bubble-text';

    const nameEl = document.createElement('div');
    nameEl.className = 'alice-bubble-name';

    const hintEl = document.createElement('div');
    hintEl.className = 'alice-bubble-hint';
    hintEl.textContent = t('vet.dialogue.hint');

    bubble.append(tail, nameEl, textEl, hintEl);
    host.appendChild(bubble);

    const render = () => {
      if (i >= beats.length) {
        // Marca como visto SEMPRE ao terminar (inclusive a saudação curta
        // do "já vi a intro" — não custa nada e mantém o set coerente).
        _markIntroSeen(combo);
        this._showStageView('alice');
        return;
      }
      const b = beats[i];
      textEl.textContent = b.text;
      nameEl.textContent = b.name;
      bubble.dataset.charId = b.charId;
    };

    const advance = () => {
      i++;
      render();
    };

    render();
    bubble.addEventListener('click', advance, { signal });

    // `blockKeys` (registrado em _buildDOM) intercepta TODAS as teclas com
    // stopImmediatePropagation. Pra Space/Enter avançar o diálogo, expomos
    // a função via `this._dialogueAdvance` — o handler global consulta isso
    // antes do stop. Limpa no abort pra não vazar referência entre views.
    this._dialogueAdvance = advance;
    signal.addEventListener('abort', () => {
      if (this._dialogueAdvance === advance) this._dialogueAdvance = null;
    }, { once: true });

    return abort;
  }

  /**
   * Re-aplica traduções nas labels já criadas após `languageChanged`.
   * Não reconstrói o DOM — preserva o estado da sub-view ativa
   * (animal selecionado, scroll, formulário de internação aberto, etc.).
   * Sub-views internas (diagnose/medicine) têm seus próprios handlers.
   */
  _applyTranslations() {
    const r = this._i18nRefs;
    if (!r) return;
    r.title.textContent = t('vet.title');
    r.subtitle.textContent = t('vet.subtitle');
    r.closeBtn.setAttribute('aria-label', t('vet.close'));
    r.closeBtn.title = t('vet.closeHint');
    r.sidebar.setAttribute('aria-label', t('vet.actionsLabel'));
    r.aliceImg.alt = t('vet.alt');
    if (this._aliceFallback) {
      const nameEl = this._aliceFallback.querySelector('.vet-alice-fallback-name');
      if (nameEl) nameEl.textContent = t('vet.alt');
    }
    for (const a of r.actions) {
      const label = t(a.labelKey);
      a.el.setAttribute('aria-label', label);
      a.el.title = label;
      a.labelEl.textContent = label;
    }
    this._refreshRecoveryPill();
  }
}

const vetPanel = new VetPanel();
registerSystem('vet', vetPanel);

export default vetPanel;
export { vetPanel };
