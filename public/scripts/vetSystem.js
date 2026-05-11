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

const ALICE_SRC = 'assets/character/portrait/Alice.png';

// Botões de interação (lado esquerdo). Os ids são estáveis para o usuário
// poder "bolar" o que cada um faz mais tarde via o evento `vetActionClick`.
const ACTION_BUTTONS = [
  { id: 'talk',         icon: '💬', labelKey: 'vet.actions.one' },
  { id: 'diagnose',     icon: '🩺', labelKey: 'vet.actions.two' },
  { id: 'hospitalize',  icon: '🏥', labelKey: 'vet.actions.three' },
  { id: 'medicine',     icon: '💊', labelKey: 'vet.actions.four' },
];

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
    requestAnimationFrame(() => this.overlay.classList.add('vet-visible'));
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
    }

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

    body.append(sidebar, stage);

    wrapper.append(header, body);
    overlay.appendChild(wrapper);

    // Click no fundo (fora do wrapper) fecha.
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    }, { signal });

    // ESC fecha; demais teclas são bloqueadas (não deixam vazar pro jogo).
    const blockKeys = (e) => {
      if (!this.visible) return;
      if (e.key === 'Escape' && e.type === 'keydown') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
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
    // O botão `talk` ainda não tem view própria — só dispara o
    // CustomEvent (vetActionClick) para implementação futura.
    if (actionId === 'hospitalize') {
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

    if (viewName === 'alice') {
      this._subViewHost.replaceChildren();
      this._subViewHost.hidden = true;
      this._frame.hidden = false;
    } else if (viewName === 'hospitalize') {
      this._frame.hidden = true;
      this._subViewHost.hidden = false;
      this._currentSubViewAbort = mountHospitalizeView(this._subViewHost, { onBack }) ?? null;
    } else if (viewName === 'recovery') {
      this._frame.hidden = true;
      this._subViewHost.hidden = false;
      this._currentSubViewAbort = mountRecoveryView(this._subViewHost, { onBack }) ?? null;
    } else if (viewName === 'diagnose') {
      this._frame.hidden = true;
      this._subViewHost.hidden = false;
      this._currentSubViewAbort = mountDiagnoseView(this._subViewHost, { onBack }) ?? null;
    } else if (viewName === 'medicine') {
      this._frame.hidden = true;
      this._subViewHost.hidden = false;
      this._currentSubViewAbort = mountMedicineView(this._subViewHost, { onBack }) ?? null;
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
    pill.textContent = ready > 0
      ? t('hospital.pill.ready', { count: ready, total })
      : t('hospital.pill.recovering', { total });
  }
}

const vetPanel = new VetPanel();
registerSystem('vet', vetPanel);

export default vetPanel;
export { vetPanel };
