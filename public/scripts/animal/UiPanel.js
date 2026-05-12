/**
 * @file UiPanel.js - animal ui panel
 * Shows stats (hunger, thirst, moral), mood, and actions (pet, guide, feed).
 * Updated to support dynamic language switching and mood system.
 */

import { t } from '../i18n/i18n.js';
import { getObject, getSystem, registerSystem } from '../gameState.js';
import { safeDispatch } from '../safeDispatch.js';
import { setItemIcon } from '../itemUtils.js';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const AUI_NAME_STORAGE_KEY = "farmxp_animal_names_v1";

function auiLoadNameMap() {
  try { return JSON.parse(localStorage.getItem(AUI_NAME_STORAGE_KEY) || "{}"); } catch { return {}; }
}

function auiSaveNameMap(map) {
  try { localStorage.setItem(AUI_NAME_STORAGE_KEY, JSON.stringify(map)); } catch {}
}

function auiGetAnimalKey(animal) {
  return (animal?.id || animal?.uid || animal?.uuid || animal?.guid || `${animal?.assetName || animal?.type}:${Math.round(animal?.x)}:${Math.round(animal?.y)}`);
}

class UiPanel {
  constructor(opts = {}) {
    this.canvasId = opts.canvasId || "gameCanvas";
    this.canvas = null;
    this.camera = null;
    this.target = null;
    this.visible = false;
    this.showActions = true;
    this.showInfo = true;

    // Sub-menu de "Alimentar" → escolha entre Ração / Remédios. Quando
    // em modo 'medicine', exibe a lista de remédios do inventário.
    this.subActionsMenu = null;
    this.showSubActions = false;
    this.subActionsMode = null; // 'choice' | 'medicine'

    this.layer = null;
    this.svg = null;
    this.leftPath = null;
    this.rightPath = null;
    this.oval = null;
    this.leftBtn = null;
    this.rightBtn = null;
    this.actionsMenu = null;
    this.infoMenu = null;
    this._feedbackEl = null;

    this._abortController = new AbortController();

    this.init();
  }

  init() {
    this.layer = document.getElementById("animal-ui-layer");
    if (!this.layer) {
      this.layer = document.createElement("div");
      this.layer.id = "animal-ui-layer";
      document.body.appendChild(this.layer);
    }

    this._createDOM();

    const signal = this._abortController.signal;
    // Painel só fecha via o botão ❌ (ação 'close' no menu de ações). Antes
    // tinha um listener global de pointerdown que fechava ao clicar fora —
    // foi removido porque conflitava com a troca direta de animal: clicar
    // num segundo animal causava close-then-open na mesma click frame e
    // criava uma janela em que o segundo clique parecia "ignorado".
    window.addEventListener("resize", () => this._resizeSvg(), { signal });
    document.addEventListener('languageChanged', () => this.rebuildInterface(), { signal });

    document.addEventListener('animalActionResult', (e) => {
      if (!this.visible || !this.target) return;
      const { action, success, message, animal, reaction } = e.detail || {};
      // Ignora resultados de ações em outros animais — evita que o
      // feedback de A apareça quando o painel já está em B.
      if (animal && animal !== this.target) return;
      this._showFeedback(action, success, message);
      this.updateContent();
      // Quando o animal recusa (reject) o remédio ele entra em FLEE,
      // mas o movimento fica congelado enquanto o painel está aberto
      // (`__uiPaused`). Fecha o painel após o feedback ser exibido pra
      // liberar a "afastada" — o player vê a bolha "Detestou o remédio!"
      // e o animal saindo de perto em seguida.
      if (action === 'applyMedicine' && reaction === 'reject') {
        setTimeout(() => this.closeAll(), 1200);
      }
    }, { signal });

    this._resizeSvg();
  }

  rebuildInterface() {
    if (this.layer) {
      this.layer.replaceChildren();
      this._createDOM();
      if (this.visible && this.target) {
        this.updateContent();
        this.layer.classList.add("aui-visible");
        this.oval.classList.add("aui-active");
        this.actionsMenu.classList.toggle("aui-visible", this.showActions);
        this.infoMenu.classList.toggle("aui-visible", this.showInfo);
        this.updatePositions(true);
      }
    }
  }

  _createDOM() {
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.classList.add("aui-lines");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");
    this.svg.setAttribute("preserveAspectRatio", "none");

    this.leftPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.leftPath.classList.add("aui-line-path");
    this.svg.appendChild(this.leftPath);

    this.rightPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.rightPath.classList.add("aui-line-path");
    this.svg.appendChild(this.rightPath);

    this.layer.appendChild(this.svg);

    this.oval = document.createElement("div");
    this.oval.className = "aui-selection-oval";
    this.layer.appendChild(this.oval);

    this.leftBtn = document.createElement("div");
    this.leftBtn.className = "aui-btn aui-left-btn aui-interactive";
    this.leftBtn.textContent = "⚙️";
    this.leftBtn.title = t('animal.ui.actions');
    this.leftBtn.addEventListener("click", (e) => { e.stopPropagation(); this.toggleActions(); });
    this.layer.appendChild(this.leftBtn);

    this.rightBtn = document.createElement("div");
    this.rightBtn.className = "aui-btn aui-right-btn aui-interactive";
    this.rightBtn.textContent = "📜";
    this.rightBtn.title = t('animal.ui.info');
    this.rightBtn.addEventListener("click", (e) => { e.stopPropagation(); this.toggleInfo(); });
    this.layer.appendChild(this.rightBtn);

    // Actions menu
    this.actionsMenu = document.createElement("div");
    this.actionsMenu.className = "aui-menu";

    const actionsTitle = document.createElement('h3');
    actionsTitle.textContent = t('animal.ui.interactions');
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'aui-actions';

    const actionItems = [
      { action: 'pet', icon: '❤', label: t('animal.actions.pet') },
      { action: 'guide', icon: '➤', label: t('animal.actions.guide') },
      { action: 'feed', icon: '🍎', label: t('animal.actions.feed') },
      { action: 'close', icon: '❌', label: t('animal.actions.close') },
    ];
    for (const item of actionItems) {
      const btn = document.createElement('div');
      btn.className = 'aui-action-btn aui-interactive';
      btn.dataset.action = item.action;
      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon';
      iconSpan.textContent = item.icon;
      const labelSpan = document.createElement('span');
      labelSpan.className = 'aui-action-label';
      labelSpan.textContent = item.label;
      btn.append(iconSpan, labelSpan);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (item.action === "close") return this.closeAll();
        // O botão "Alimentar" agora abre um sub-menu com a escolha entre
        // ração (fluxo antigo) e remédios (lista do inventário). Demais
        // ações continuam sendo emitidas direto.
        if (item.action === "feed") return this._openSubActions('choice');
        this._emitAction(item.action);
      });
      actionsContainer.appendChild(btn);
    }
    this.actionsMenu.append(actionsTitle, actionsContainer);
    this.layer.appendChild(this.actionsMenu);

    // Sub-menu (à esquerda do actionsMenu, alinhado com o botão de feed).
    // Conteúdo populado dinamicamente em `_renderSubActions()`.
    this.subActionsMenu = document.createElement('div');
    this.subActionsMenu.className = 'aui-menu aui-subactions';
    this.layer.appendChild(this.subActionsMenu);

    // Info menu
    this.infoMenu = document.createElement("div");
    this.infoMenu.className = "aui-menu";

    const infoTitle = document.createElement('h3');
    infoTitle.textContent = t('animal.ui.info');

    const infoHeader = document.createElement('div');
    infoHeader.className = 'aui-info-header';
    const genderCircle = document.createElement('div');
    genderCircle.className = 'aui-gender-circle';
    genderCircle.dataset.role = 'gender';
    genderCircle.textContent = '?';
    const nameWrap = document.createElement('div');
    nameWrap.className = 'aui-name-wrap';
    const animalName = document.createElement('div');
    animalName.className = 'aui-animal-name aui-interactive';
    animalName.dataset.role = 'name';
    animalName.contentEditable = 'true';
    animalName.spellcheck = false;
    const animalType = document.createElement('div');
    animalType.className = 'aui-animal-type';
    animalType.dataset.role = 'type';
    nameWrap.append(animalName, animalType);
    infoHeader.append(genderCircle, nameWrap);

    // Mood indicator
    const moodRow = document.createElement('div');
    moodRow.className = 'aui-mood-row';
    const moodLabel = document.createElement('span');
    moodLabel.className = 'aui-mood-label';
    moodLabel.textContent = t('animal.stats.mood') || 'Mood';
    const moodValue = document.createElement('span');
    moodValue.className = 'aui-mood-value';
    moodValue.dataset.role = 'mood';
    moodRow.append(moodLabel, moodValue);

    // Injury indicator
    const injuryRow = document.createElement('div');
    injuryRow.className = 'aui-injury-row';
    const injuryLabel = document.createElement('span');
    injuryLabel.className = 'aui-injury-label';
    injuryLabel.textContent = t('animal.injury.label');
    const injuryValue = document.createElement('span');
    injuryValue.className = 'aui-injury-value';
    injuryValue.dataset.role = 'injury';
    injuryRow.append(injuryLabel, injuryValue);

    // Treatment progress (gradual). Aparece só quando há `disease.treatment`.
    const treatmentRow = document.createElement('div');
    treatmentRow.className = 'aui-treatment-row';
    treatmentRow.dataset.role = 'treatmentRow';
    treatmentRow.style.display = 'none'; // escondido por padrão
    const treatmentLabel = document.createElement('span');
    treatmentLabel.className = 'aui-treatment-label';
    treatmentLabel.textContent = t('animal.treatment.label');
    const treatmentValue = document.createElement('span');
    treatmentValue.className = 'aui-treatment-value';
    treatmentValue.dataset.role = 'treatment';
    treatmentRow.append(treatmentLabel, treatmentValue);

    // Stats bars
    const barsContainer = document.createElement('div');
    barsContainer.className = 'aui-bars';
    const barStats = [
      { label: t('animal.stats.hunger'), role: 'hunger' },
      { label: t('animal.stats.thirst'), role: 'thirst' },
      { label: t('animal.stats.morale'), role: 'moral' },
    ];
    for (const stat of barStats) {
      const row = document.createElement('div');
      row.className = 'aui-bar-row';
      const label = document.createElement('div');
      label.className = 'aui-bar-label';
      label.textContent = stat.label;
      const bar = document.createElement('div');
      bar.className = 'aui-bar';
      const fill = document.createElement('div');
      fill.className = 'aui-bar-fill';
      fill.dataset.role = `bar-${stat.role}`;
      bar.appendChild(fill);
      const val = document.createElement('div');
      val.className = 'aui-bar-val';
      val.dataset.role = `val-${stat.role}`;
      val.textContent = '0%';
      row.append(label, bar, val);
      barsContainer.appendChild(row);
    }

    this.infoMenu.append(infoTitle, infoHeader, moodRow, injuryRow, treatmentRow, barsContainer);

    const nameEl = this.infoMenu.querySelector('[data-role="name"]');

    // Bloqueia teclas globais (WASD, I, etc.) enquanto o campo está em foco.
    // Captura em fase de capture no window para interceptar antes dos sistemas do jogo.
    // Importante: Enter/Escape precisam de preventDefault AQUI, pois o
    // stopImmediatePropagation abaixo impede o listener do próprio nameEl
    // de rodar — sem o preventDefault, o Enter insere um &nbsp; no
    // contenteditable (que .trim() não remove).
    const blockKeysWhileEditing = (e) => {
      if (document.activeElement === nameEl) {
        if (e.key === "Escape" || e.key === "Enter") {
          e.preventDefault();
          if (e.type === "keydown") nameEl.blur();
        }
        e.stopImmediatePropagation();
      }
    };
    const sig = this._abortController?.signal;
    window.addEventListener("keydown", blockKeysWhileEditing, { capture: true, signal: sig });
    window.addEventListener("keyup", blockKeysWhileEditing, { capture: true, signal: sig });
    window.addEventListener("keypress", blockKeysWhileEditing, { capture: true, signal: sig });

    nameEl.addEventListener("blur", () => {
      if (!this.target) return;
      // Remove espaços invisíveis (&nbsp; U+00A0, zero-width) e colapsa whitespace
      // antes do trim — o contenteditable pode deixar resíduos mesmo após o fix acima.
      const raw = nameEl.textContent || "";
      const v = raw.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ").replace(/\s+/g, " ").trim();
      nameEl.textContent = v;

      const key = auiGetAnimalKey(this.target);
      // Valor atual antes da edição. Focar/desfocar o campo sem digitar NÃO
      // pode disparar animalNamed (tutorialQuests ouve e completa o objetivo)
      // nem sobrescrever customName com a label default pré-preenchida.
      const prev = this.target.customName || auiLoadNameMap()[key] || "";
      if (v === prev) return;

      this.target.customName = v || "";
      const map = auiLoadNameMap();
      if (v) map[key] = v; else delete map[key];
      auiSaveNameMap(map);

      // Dispatch event for quest system
      if (v) {
        document.dispatchEvent(new CustomEvent('animalNamed', {
          detail: { animal: this.target, name: v }
        }));
      }
    });

    this.layer.appendChild(this.infoMenu);

    // Feedback bubble
    this._feedbackEl = document.createElement('div');
    this._feedbackEl.className = 'aui-feedback';
    this.layer.appendChild(this._feedbackEl);
  }

  setCamera(cam) { this.camera = cam; }
  selectAnimal(animal, cam) {
    this.open(animal, cam);
  }

  open(animal, cam) {
    if (!animal) return;
    if (cam) this.setCamera(cam);
    
    // Limpar estado anterior de um animal diferente
    if (this.target && this.target !== animal) {
      this.target.__uiPaused = false;
      // Resetar o loop anterior para evitar múltiplos requestAnimationFrame em paralelo
      this._loopRunning = false;
      
      // Resetar completamente os campos da UI anterior
      const nameEl = this.infoMenu.querySelector('[data-role="name"]');
      const genderEl = this.infoMenu.querySelector('[data-role="gender"]');
      const typeEl = this.infoMenu.querySelector('[data-role="type"]');
      const moodEl = this.infoMenu.querySelector('[data-role="mood"]');
      
      if (nameEl) {
        nameEl.blur();
        nameEl.textContent = '';
      }
      if (genderEl) {
        genderEl.textContent = '?';
        genderEl.dataset.gender = 'unknown';
      }
      if (typeEl) typeEl.textContent = '';
      if (moodEl) moodEl.textContent = '';

      const injuryEl = this.infoMenu.querySelector('[data-role="injury"]');
      if (injuryEl) {
        injuryEl.textContent = '';
        injuryEl.dataset.severity = '';
      }

      // Esconde qualquer bolha de feedback do animal anterior — sem isso, o
      // updatePositions reposiciona a bolha pendente sobre o novo animal e
      // fica parecendo que a mensagem "max_pets" (etc.) é dele.
      if (this._feedbackTimer) {
        clearTimeout(this._feedbackTimer);
        this._feedbackTimer = null;
      }
      if (this._feedbackEl) {
        this._feedbackEl.classList.remove('aui-feedback-show');
        this._feedbackEl.textContent = '';
      }
      
      // Resetar as barras de stats
      this._setBar("hunger", 0);
      this._setBar("thirst", 0);
      this._setBar("moral", 0);
    }
    
    this.target = animal;
    const key = auiGetAnimalKey(this.target);
    const map = auiLoadNameMap();
    if (map[key]) this.target.customName = map[key];
    this.visible = true;
    this.layer.classList.add("aui-visible");
    this.oval.classList.add("aui-active");
    this.oval.style.pointerEvents = 'none';

    this.showActions = true;
    this.showInfo = true;
    this.actionsMenu.classList.toggle("aui-visible", this.showActions);
    this.infoMenu.classList.toggle("aui-visible", this.showInfo);

    this.updateContent();
    this.updatePositions(true);
    if (this.target) this.target.__uiPaused = true;
    this._startLoop();
  }

  closeAll() { this.close(); }
  close() {
    if (!this.visible) return;
    if (this.target) this.target.__uiPaused = false;
    this.visible = false;
    this.target = null;
    this._loopRunning = false;
    this.layer.classList.remove("aui-visible");
    this.oval.classList.remove("aui-active");
    this.oval.style.pointerEvents = '';
    this.actionsMenu.classList.remove("aui-visible");
    this.infoMenu.classList.remove("aui-visible");
    this._closeSubActions();

    this.leftPath.setAttribute("d", "");
    this.rightPath.setAttribute("d", "");

    if (this._feedbackTimer) {
      clearTimeout(this._feedbackTimer);
      this._feedbackTimer = null;
    }
    // Limpa também a bolha visível — sem isso o texto fica preso no DOM
    // e reaparece sobre o próximo animal selecionado (o updatePositions
    // reposiciona o elemento, então a mensagem antiga "viaja" pra ele).
    if (this._feedbackEl) {
      this._feedbackEl.classList.remove('aui-feedback-show');
      this._feedbackEl.textContent = '';
    }
  }

  destroy() {
    this.close();
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    this._loopRunning = false;
    if (this._feedbackTimer) {
      clearTimeout(this._feedbackTimer);
      this._feedbackTimer = null;
    }
    if (this.layer && this.layer.parentNode) {
      this.layer.parentNode.removeChild(this.layer);
    }
    this.layer = this.svg = this.leftPath = this.rightPath = null;
    this.oval = this.leftBtn = this.rightBtn = null;
    this.actionsMenu = this.infoMenu = this.subActionsMenu = null;
    this._feedbackEl = null;
    this.canvas = this.camera = null;
  }

  toggleActions() {
    this.showActions = !this.showActions;
    this.actionsMenu.classList.toggle("aui-visible", this.showActions);
    this.updatePositions();
  }

  toggleInfo() {
    this.showInfo = !this.showInfo;
    this.infoMenu.classList.toggle("aui-visible", this.showInfo);
    this.updatePositions();
  }

  updateContent() {
    if (!this.target) return;
    const name = this.target.customName || this.target.name || this.target.assetName || "Animal";
    const type = this.target.assetName ? t(`animals.${this.target.assetName.toLowerCase()}`) : this.target.type || t('animal.type.unknown');

    const typeStr = (typeof type === "string") ? type : "";
    const displayType = typeStr.includes('animals.') ? (this.target.assetName || typeStr) : typeStr;

    const genderRaw = this.target.gender ?? this.target.sex ?? (this.target.isMale === true ? "male" : this.target.isMale === false ? "female" : undefined);
    const genderChar = (typeof genderRaw === "string" && genderRaw.toLowerCase().startsWith("m")) ? "♂" : (typeof genderRaw === "string" && genderRaw.toLowerCase().startsWith("f")) ? "♀" : (genderRaw === true) ? "♂" : (genderRaw === false) ? "♀" : "?";

    const stats = this.target.stats || this.target;
    const hunger = this._toPercent(stats.hunger);
    const thirst = this._toPercent(stats.thirst);
    const moral = this._toPercent(stats.moral);

    const genderEl = this.infoMenu.querySelector('[data-role="gender"]');
    const nameEl = this.infoMenu.querySelector('[data-role="name"]');
    const typeEl = this.infoMenu.querySelector('[data-role="type"]');
    const moodEl = this.infoMenu.querySelector('[data-role="mood"]');

    if (genderEl) {
      genderEl.textContent = genderChar;
      genderEl.dataset.gender = genderChar === '♂' ? 'male' : genderChar === '♀' ? 'female' : 'unknown';
    }
    if (nameEl && !nameEl.matches(":focus")) nameEl.textContent = name;
    if (typeEl) typeEl.textContent = displayType;

    // Mood display
    if (moodEl) {
      const mood = this.target.mood || this.target._mood || 'calm';
      const moodKey = `animal.mood.${mood}`;
      const moodText = t(moodKey);
      const emoji = this.target.moodEmoji || '';
      moodEl.textContent = (moodText !== moodKey ? moodText : mood) + (emoji ? ` ${emoji}` : '');
    }

    // Injury + disease display.
    // - Sem nada → "Saudável".
    // - Só ferimento → "Arranhão na cabeça".
    // - Doença NÃO diagnosticada → "?" (sistema sabe, jogador não).
    // - Doença diagnosticada na vet → nome real ("Verminose").
    // - Combinações coexistem com " | " entre os pedaços, ex.:
    //   "Arranhão na cabeça | ?" ou "Arranhão na cabeça | Verminose".
    const injuryEl = this.infoMenu.querySelector('[data-role="injury"]');
    if (injuryEl) {
      const inj = this.target.injury;
      const diseaseSys = getSystem('animalDisease');
      const disease = this.target.disease;
      const hasUndiagnosedDisease = diseaseSys?.isUndiagnosedSick?.(this.target) ?? false;
      const hasDiagnosedDisease = !!(disease && disease.diagnosed);

      let injuryText = '';
      if (inj) {
        const sev = t(`animal.injury.severity.${inj.severity}`);
        const reg = t(`animal.injury.region.${inj.region}`);
        const tpl = t('animal.injury.format');
        injuryText = (typeof tpl === 'string' ? tpl : '{severity} {region}')
          .replace('{severity}', sev)
          .replace('{region}', reg);
      }

      let diseaseText = '';
      if (hasDiagnosedDisease) {
        const nameKey = `animal.disease.names.${disease.id}`;
        const translated = t(nameKey);
        diseaseText = (translated !== nameKey) ? translated : disease.id;
      } else if (hasUndiagnosedDisease) {
        diseaseText = '?';
      }

      const parts = [];
      if (injuryText) parts.push(injuryText);
      if (diseaseText) parts.push(diseaseText);

      if (parts.length === 0) {
        injuryEl.textContent = t('animal.injury.none');
        injuryEl.dataset.severity = 'none';
      } else {
        injuryEl.textContent = parts.join(' | ');
        if (inj) injuryEl.dataset.severity = inj.severity;
        else if (hasDiagnosedDisease) injuryEl.dataset.severity = 'diagnosed';
        else injuryEl.dataset.severity = 'unknown';
      }
    }

    // Treatment progress (apenas tratamento gradual em andamento). A linha
    // some quando não há tratamento ativo. O texto mostra remédio, dias
    // completados e doses do dia atual — referência rápida pro player
    // saber se ainda precisa dosar hoje.
    const treatmentRow = this.infoMenu.querySelector('[data-role="treatmentRow"]');
    const treatmentEl = this.infoMenu.querySelector('[data-role="treatment"]');
    if (treatmentRow && treatmentEl) {
      const ds = getSystem('animalDisease');
      const progress = ds?.getTreatmentProgress?.(this.target);
      if (progress) {
        treatmentRow.style.display = '';
        const tpl = t('animal.treatment.format');
        const text = (typeof tpl === 'string' && tpl !== 'animal.treatment.format')
          ? tpl
              .replace('{icon}', progress.medicineIcon)
              .replace('{name}', progress.medicineName)
              .replace('{days}', String(progress.daysCompleted))
              .replace('{requiredDays}', String(progress.requiredDays))
              .replace('{dosesToday}', String(progress.dosesToday))
              .replace('{requiredDoses}', String(progress.requiredDoses))
          : `${progress.medicineIcon} ${progress.medicineName} · ${progress.daysCompleted}/${progress.requiredDays} dias · ${progress.dosesToday}/${progress.requiredDoses} doses hoje`;
        treatmentEl.textContent = text;
      } else {
        treatmentRow.style.display = 'none';
        treatmentEl.textContent = '';
      }
    }

    this._setBar("hunger", hunger);
    this._setBar("thirst", thirst);
    this._setBar("moral", moral);

    // Disable action buttons based on mood
    this._updateActionStates();
  }

  _updateActionStates() {
    if (!this.target || !this.actionsMenu) return;
    const mood = this.target.mood || this.target._mood || 'calm';
    const isSleeping = mood === 'sleeping';
    const isFollowing = this.target.following || false;

    const btns = this.actionsMenu.querySelectorAll('.aui-action-btn');
    btns.forEach(btn => {
      const action = btn.dataset.action;
      if (action === 'close') return;

      // Toggle guide/unguide label
      if (action === 'guide') {
        const iconSpan = btn.querySelector('.icon');
        const labelSpan = btn.querySelector('.aui-action-label');
        if (isFollowing) {
          if (iconSpan) iconSpan.textContent = '✋';
          if (labelSpan) labelSpan.textContent = t('animal.actions.unguide');
        } else {
          if (iconSpan) iconSpan.textContent = '➤';
          if (labelSpan) labelSpan.textContent = t('animal.actions.guide');
        }
      }

      if (isSleeping) {
        btn.style.opacity = '0.4';
        btn.style.pointerEvents = 'none';
      } else {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });
  }

  _showFeedback(action, success, message) {
    if (!this._feedbackEl) return;

    const msgKey = `animal.feedback.${message}`;
    let text = t(msgKey);
    if (text === msgKey) {
      // Fallback display
      text = success ? '✓' : '✗';
    }

    this._feedbackEl.textContent = text;
    this._feedbackEl.classList.remove('aui-feedback-show');
    // Force reflow
    void this._feedbackEl.offsetWidth;
    this._feedbackEl.classList.add('aui-feedback-show');

    clearTimeout(this._feedbackTimer);
    this._feedbackTimer = setTimeout(() => {
      this._feedbackTimer = null;
      if (this._feedbackEl) this._feedbackEl.classList.remove('aui-feedback-show');
    }, 2000);
  }

  _toPercent(v) {
    if (typeof v !== "number") return 0;
    if (Number.isNaN(v)) return 0;
    return clamp(Math.round(v), 0, 100);
  }

  _setBar(key, value) {
    const bar = this.infoMenu.querySelector(`[data-role="bar-${key}"]`);
    const val = this.infoMenu.querySelector(`[data-role="val-${key}"]`);
    if (bar) bar.style.setProperty('--bar-fill-width', `${value}%`);
    if (val) val.textContent = `${value}%`;
  }

  _emitAction(actionId, extra = {}) {
    const ev = new CustomEvent("animalAction", {
      detail: { action: actionId, animal: this.target, ...extra }
    });
    safeDispatch(document, ev);
  }

  // ─── Sub-menu (Alimentar → Ração | Remédios) ────────────────────────────

  _openSubActions(mode) {
    if (!this.subActionsMenu) return;
    this.subActionsMode = mode;
    this.showSubActions = true;
    this._renderSubActions();
    // Posiciona ANTES de tornar visível pra evitar flash de transição
    // a partir de (0,0) durante os ~180ms de fade-in.
    this.updatePositions();
    this.subActionsMenu.classList.add('aui-visible');
  }

  _closeSubActions() {
    if (!this.subActionsMenu) return;
    this.showSubActions = false;
    this.subActionsMode = null;
    this.subActionsMenu.classList.remove('aui-visible');
    this.subActionsMenu.replaceChildren();
  }

  _renderSubActions() {
    if (!this.subActionsMenu) return;
    this.subActionsMenu.replaceChildren();

    const titleEl = document.createElement('h3');
    if (this.subActionsMode === 'medicine') {
      const tpl = t('animal.feedSub.medicinesTitle');
      titleEl.textContent = (typeof tpl === 'string' && tpl !== 'animal.feedSub.medicinesTitle')
        ? tpl : 'Remédios';
    } else {
      const tpl = t('animal.feedSub.title');
      titleEl.textContent = (typeof tpl === 'string' && tpl !== 'animal.feedSub.title')
        ? tpl : 'Alimentar';
    }
    this.subActionsMenu.appendChild(titleEl);

    const list = document.createElement('div');
    list.className = 'aui-actions';

    if (this.subActionsMode === 'choice') {
      const racaoLabel = t('animal.feedSub.feed');
      const remediosLabel = t('animal.feedSub.medicine');
      list.appendChild(this._buildSubBtn('🌾',
        (racaoLabel !== 'animal.feedSub.feed') ? racaoLabel : 'Ração',
        () => {
          this._closeSubActions();
          this._emitAction('feed');
        }));
      list.appendChild(this._buildSubBtn('💊',
        (remediosLabel !== 'animal.feedSub.medicine') ? remediosLabel : 'Remédios',
        () => this._openSubActions('medicine')));
    } else if (this.subActionsMode === 'medicine') {
      const meds = this._collectMedicinesFromInventory();
      if (meds.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'aui-feedSub-empty';
        const tpl = t('animal.feedSub.empty');
        empty.textContent = (typeof tpl === 'string' && tpl !== 'animal.feedSub.empty')
          ? tpl : 'Nenhum remédio no inventário.';
        list.appendChild(empty);
      } else {
        for (const med of meds) {
          const label = `${med.name} ×${med.quantity}`;
          list.appendChild(this._buildSubBtn(med.icon || '💊', label, () => {
            this._closeSubActions();
            this._emitAction('applyMedicine', { itemId: med.id });
          }));
        }
      }
      // Botão de voltar para a tela de escolha (Ração/Remédios).
      const backLabel = t('animal.feedSub.back');
      list.appendChild(this._buildSubBtn('↩',
        (backLabel !== 'animal.feedSub.back') ? backLabel : 'Voltar',
        () => this._openSubActions('choice')));
    }

    this.subActionsMenu.appendChild(list);
  }

  _buildSubBtn(icon, label, onClick) {
    const btn = document.createElement('div');
    btn.className = 'aui-action-btn aui-interactive';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    setItemIcon(iconSpan, icon, label);
    const labelSpan = document.createElement('span');
    labelSpan.className = 'aui-action-label';
    labelSpan.textContent = label;
    btn.append(iconSpan, labelSpan);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  /**
   * Varre o inventário e retorna apenas itens de tipo 'medicine'. Cobre
   * tanto a forma `inv.categories` (acesso direto) quanto `inv.getInventory()`.
   * Os itens já trazem icon/name/quantity gravados pelo addItem.
   */
  _collectMedicinesFromInventory() {
    const inv = getSystem('inventory');
    if (!inv) return [];
    const cats = inv.categories || (typeof inv.getInventory === 'function' ? inv.getInventory() : null);
    if (!cats) return [];
    const meds = [];
    for (const cat of Object.values(cats)) {
      if (!cat?.items) continue;
      for (const it of cat.items) {
        if (it.type === 'medicine' && it.quantity > 0) meds.push(it);
      }
    }
    return meds;
  }

  _getCanvasTransform() {
    this.canvas = this.canvas || document.getElementById(this.canvasId);
    if (!this.canvas) return null;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const internalW = this.canvas.width / dpr;
    const internalH = this.canvas.height / dpr;
    if (!internalW || !internalH) return null;
    const scaleX = rect.width / internalW;
    const scaleY = rect.height / internalH;
    return { rect, dpr, internalW, internalH, scaleX, scaleY };
  }

  _getAnimalDrawSizeInternal(animal) {
    const baseW = animal.width || animal.frameWidth || 64;
    const baseH = animal.height || animal.frameHeight || baseW;
    const zoom = (this.camera && typeof this.camera.zoom === "number") ? this.camera.zoom : 1;
    return { w: baseW * zoom, h: baseH * zoom };
  }

  updatePositions(force = false) {
    if (!this.visible || !this.target) return;
    const cam = this.camera || getObject('camera');
    if (!cam || typeof cam.worldToScreen !== "function") return;
    const tr = this._getCanvasTransform();
    if (!tr) return;
    const { rect, internalW, internalH, scaleX, scaleY } = tr;
    const x = (typeof this.target.x === "number") ? this.target.x : 0;
    const y = (typeof this.target.y === "number") ? this.target.y : 0;
    const { w: sprWInt, h: sprHInt } = this._getAnimalDrawSizeInternal(this.target);
    const topLeftInt = cam.worldToScreen(x, y);
    const cxInt = topLeftInt.x + sprWInt / 2;
    const cyInt = topLeftInt.y + sprHInt / 2;
    const margin = Math.max(sprWInt, sprHInt);
    const out = cxInt < -margin || cyInt < -margin || cxInt > internalW + margin || cyInt > internalH + margin;
    if (out) { this.layer.classList.add("aui-offscreen"); return; }
    this.layer.classList.remove("aui-offscreen");
    const cx = rect.left + (cxInt * scaleX);
    const cy = rect.top + (cyInt * scaleY);
    let diameter = Math.max(sprWInt * scaleX, sprHInt * scaleY) * 1.12;
    diameter = clamp(diameter, 64, 220);
    this.oval.style.setProperty('--oval-width', `${diameter}px`);
    this.oval.style.setProperty('--oval-height', `${diameter}px`);
    this.oval.style.setProperty('--oval-left', `${cx - diameter / 2}px`);
    this.oval.style.setProperty('--oval-top', `${cy - diameter / 2}px`);
    const orbitRadius = diameter / 2 + 48;
    const angleLeft = (-155 * Math.PI) / 180;
    const angleRight = (-25 * Math.PI) / 180;
    const btnLx = cx + Math.cos(angleLeft) * orbitRadius;
    const btnLy = cy + Math.sin(angleLeft) * orbitRadius;
    const btnRx = cx + Math.cos(angleRight) * orbitRadius;
    const btnRy = cy + Math.sin(angleRight) * orbitRadius;
    const halfBtn = 54 / 2;
    this.leftBtn.style.setProperty('--btn-left', `${btnLx - halfBtn}px`);
    this.leftBtn.style.setProperty('--btn-top', `${btnLy - halfBtn}px`);
    this.rightBtn.style.setProperty('--btn-left', `${btnRx - halfBtn}px`);
    this.rightBtn.style.setProperty('--btn-top', `${btnRy - halfBtn}px`);
    const pad = 12;
    const actRect = this.actionsMenu.getBoundingClientRect();
    const infoRect = this.infoMenu.getBoundingClientRect();
    let actX = btnLx - actRect.width - 32;
    let actY = btnLy - actRect.height / 2;
    actX = clamp(actX, pad, window.innerWidth - pad - actRect.width);
    actY = clamp(actY, pad, window.innerHeight - pad - actRect.height);
    let infoX = btnRx + 32;
    let infoY = btnRy - infoRect.height / 2;
    infoX = clamp(infoX, pad, window.innerWidth - pad - infoRect.width);
    infoY = clamp(infoY, pad, window.innerHeight - pad - infoRect.height);
    this.actionsMenu.style.setProperty('--menu-left', `${actX}px`);
    this.actionsMenu.style.setProperty('--menu-top', `${actY}px`);
    this.infoMenu.style.setProperty('--menu-left', `${infoX}px`);
    this.infoMenu.style.setProperty('--menu-top', `${infoY}px`);

    // Sub-menu (Ração/Remédios): à esquerda do actionsMenu, alinhado
    // verticalmente ao botão de feed quando ele já está renderizado.
    if (this.subActionsMenu && this.showSubActions) {
      const subRect = this.subActionsMenu.getBoundingClientRect();
      const feedBtn = this.actionsMenu.querySelector('[data-action="feed"]');
      let subX = actX - subRect.width - 12;
      let subY = actY + (actRect.height - subRect.height) / 2;
      if (feedBtn) {
        const feedRect = feedBtn.getBoundingClientRect();
        subY = (feedRect.top + feedRect.height / 2) - subRect.height / 2;
      }
      subX = clamp(subX, pad, window.innerWidth - pad - subRect.width);
      subY = clamp(subY, pad, window.innerHeight - pad - subRect.height);
      this.subActionsMenu.style.setProperty('--menu-left', `${subX}px`);
      this.subActionsMenu.style.setProperty('--menu-top', `${subY}px`);
    }
    this._resizeSvg();
    const actConnectX = actX + actRect.width;
    const actConnectY = actY + actRect.height / 2;
    const infoConnectX = infoX;
    const infoConnectY = infoY + infoRect.height / 2;
    this._drawConnector(this.leftPath, cx, cy, btnLx, btnLy, actConnectX, actConnectY, this.showActions);
    this._drawConnector(this.rightPath, cx, cy, btnRx, btnRy, infoConnectX, infoConnectY, this.showInfo);

    // Position feedback near oval
    if (this._feedbackEl) {
      this._feedbackEl.style.left = `${cx}px`;
      this._feedbackEl.style.top = `${cy - diameter / 2 - 30}px`;
    }
  }

  _drawConnector(pathEl, x1, y1, x2, y2, x3, y3, extended) {
    if (!pathEl) return;
    if (!extended) {
      pathEl.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
      return;
    }
    const midX = (x2 + x3) / 2;
    const midY = (y2 + y3) / 2;
    pathEl.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2} Q ${midX} ${midY} ${x3} ${y3}`);
  }

  _resizeSvg() {
    if (!this.svg) return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }


  _startLoop() {
    if (this._loopRunning) return;
    this._loopRunning = true;
    
    const tick = () => {
      // Se o painel foi fechado ou o animal foi trocado, parar o loop
      if (!this.visible || !this.target) {
        this._loopRunning = false;
        return;
      }
      
      this.updateContent();
      this.updatePositions();
      requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
  }
}

export default UiPanel;
export const animalUiPanel = new UiPanel();
registerSystem('animalUI', animalUiPanel);