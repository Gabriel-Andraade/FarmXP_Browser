/**
 * @file UiPanel.js - painel de ui do animal
 * Atualizado para suportar troca dinâmica de idiomas
 */


import { t } from '../i18n/i18n.js';
import { getObject, registerSystem } from '../gameState.js';

/**
 * limita um numero dentro de um intervalo
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
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

    this.layer = null;
    this.svg = null;
    this.leftPath = null;
    this.rightPath = null;
    this.oval = null;
    this.leftBtn = null;
    this.rightBtn = null;
    this.actionsMenu = null;
    this.infoMenu = null;

    this._onDocPointerDown = (e) => {
      if (!this.visible) return;
      if (e.target && e.target.closest && e.target.closest("#animal-ui-layer .aui-interactive")) return;
      this.closeAll();
    };

    this._onResize = () => this._resizeSvg();

    this.init();
  }

  init() {
    // CSS agora é externo - incluir o arquivo CSS separado no HTML

    this.layer = document.getElementById("animal-ui-layer");
    if (!this.layer) {
      this.layer = document.createElement("div");
      this.layer.id = "animal-ui-layer";
      document.body.appendChild(this.layer);
    }

    // Cria o DOM inicial
    this._createDOM();

    document.addEventListener("pointerdown", this._onDocPointerDown, true);
    window.addEventListener("resize", this._onResize);
    
    //  OUVINTE IMPORTANTE: Recria a interface quando o idioma mudar
    document.addEventListener('languageChanged', () => {
        this.rebuildInterface();
    });

    this._resizeSvg();
    this._startLoop();
  }

  //  Método para reconstruir tudo quando o idioma muda
  rebuildInterface() {
      if (this.layer) {
          this.layer.innerHTML = ''; // Limpa o antigo
          this._createDOM(); // Cria novo com idioma atual
          
          // Se estava aberto, atualiza o conteúdo do animal
          if (this.visible && this.target) {
              this.updateContent();
              // Re-aplica estado visual
              this.layer.classList.add("aui-visible");
              this.oval.classList.add("aui-active");
              this.actionsMenu.classList.toggle("aui-visible", this.showActions);
              this.infoMenu.classList.toggle("aui-visible", this.showInfo);
              this.updatePositions(true);
          }
      }
  }

  _createDOM() {
    //  Importante: t() é chamado aqui. Se o idioma mudar, precisamos chamar _createDOM de novo.
    
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

    this.actionsMenu = document.createElement("div");
    this.actionsMenu.className = "aui-menu aui-interactive";
    
    //  Tradução dinâmica aplicada aqui
    this.actionsMenu.innerHTML = `
      <h3>${t('animal.ui.interactions')}</h3>
      <div class="aui-actions">
        <div class="aui-action-btn" data-action="pet"><span class="icon">❤</span><span>${t('animal.actions.pet')}</span></div>
        <div class="aui-action-btn" data-action="guide"><span class="icon">➤</span><span>${t('animal.actions.guide')}</span></div>
        <div class="aui-action-btn" data-action="feed"><span class="icon">🍎</span><span>${t('animal.actions.feed')}</span></div>
        <div class="aui-action-btn" data-action="close"><span class="icon">❌</span><span>${t('animal.actions.close')}</span></div>
      </div>
    `;
    this.actionsMenu.querySelectorAll(".aui-action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.getAttribute("data-action");
        if (action === "close") return this.closeAll();
        this._emitAction(action);
      });
    });
    this.layer.appendChild(this.actionsMenu);

    this.infoMenu = document.createElement("div");
    this.infoMenu.className = "aui-menu aui-interactive";
    
    //  Tradução dinâmica aplicada aqui
    this.infoMenu.innerHTML = `
      <h3>${t('animal.ui.info')}</h3>
      <div class="aui-info-header">
        <div class="aui-gender-circle" data-role="gender">?</div>
        <div class="aui-name-wrap">
          <div class="aui-animal-name" data-role="name" contenteditable="true" spellcheck="false"></div>
          <div class="aui-animal-type" data-role="type"></div>
        </div>
      </div>

      <div class="aui-bars">
        <div class="aui-bar-row">
          <div class="aui-bar-label">${t('animal.stats.hunger')}</div>
          <div class="aui-bar"><div class="aui-bar-fill" data-role="bar-hunger"></div></div>
          <div class="aui-bar-val" data-role="val-hunger">0%</div>
        </div>
        <div class="aui-bar-row">
          <div class="aui-bar-label">${t('animal.stats.thirst')}</div>
          <div class="aui-bar"><div class="aui-bar-fill" data-role="bar-thirst"></div></div>
          <div class="aui-bar-val" data-role="val-thirst">0%</div>
        </div>
        <div class="aui-bar-row">
          <div class="aui-bar-label">${t('animal.stats.morale')}</div>
          <div class="aui-bar"><div class="aui-bar-fill" data-role="bar-moral"></div></div>
          <div class="aui-bar-val" data-role="val-moral">0%</div>
        </div>
      </div>
    `;

    const nameEl = this.infoMenu.querySelector('[data-role="name"]');
    nameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); nameEl.blur(); }
    });
    nameEl.addEventListener("blur", () => {
      if (!this.target) return;
      const v = (nameEl.textContent || "").trim();
      const key = auiGetAnimalKey(this.target);
      this.target.customName = v || "";
      const map = auiLoadNameMap();
      if (v) map[key] = v; else delete map[key];
      auiSaveNameMap(map);
    });

    this.layer.appendChild(this.infoMenu);
  }

  setCamera(cam) { this.camera = cam; }
  selectAnimal(animal, cam) { this.open(animal, cam); }

  open(animal, cam) {
    if (!animal) return;
    if (cam) this.setCamera(cam);
    this.target = animal;
    const key = auiGetAnimalKey(this.target);
    const map = auiLoadNameMap();
    if (map[key]) this.target.customName = map[key];
    this.visible = true;
    this.layer.classList.add("aui-visible");
    this.oval.classList.add("aui-active");

    // abre menus por padrao
    this.showActions = true;
    this.showInfo = true;
    this.actionsMenu.classList.toggle("aui-visible", this.showActions);
    this.infoMenu.classList.toggle("aui-visible", this.showInfo);

    this.updateContent();
    this.updatePositions(true);
    this.target.__uiPaused = true;
  }

  closeAll() { this.close(); }
  close() {
    if (!this.visible) return;
    if (this.target) this.target.__uiPaused = false;
    this.visible = false;
    this.target = null;
    this.layer.classList.remove("aui-visible");
    this.oval.classList.remove("aui-active");
    this.actionsMenu.classList.remove("aui-visible");
    this.infoMenu.classList.remove("aui-visible");

    this.leftPath.setAttribute("d", "");
    this.rightPath.setAttribute("d", "");
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

    // Fallback se a tradução retornar a chave ou for indefinida
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

    if (genderEl) genderEl.textContent = genderChar;
    if (nameEl && !nameEl.matches(":focus")) nameEl.textContent = name;
    if (typeEl) typeEl.textContent = displayType;

    this._setBar("hunger", hunger);
    this._setBar("thirst", thirst);
    this._setBar("moral", moral);
  }

  _toPercent(v) {
    if (typeof v !== "number") return 0;
    if (Number.isNaN(v)) return 0;
    return clamp(Math.round(v), 0, 100);
  }

  _setBar(key, value) {
    const bar = this.infoMenu.querySelector(`[data-role="bar-${key}"]`);
    const val = this.infoMenu.querySelector(`[data-role="val-${key}"]`);
    if (bar) bar.style.width = `${value}%`;
    if (val) val.textContent = `${value}%`;
  }

  _emitAction(actionId) {
    const ev = new CustomEvent("animalAction", { detail: { action: actionId, animal: this.target } });
    document.dispatchEvent(ev);
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
    const baseW = animal.frameWidth || animal.width || 64;
    const baseH = animal.frameHeight || animal.height || baseW;
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
    if (out) { this.layer.style.opacity = "0"; return; }
    this.layer.style.opacity = "1";
    const cx = rect.left + (cxInt * scaleX);
    const cy = rect.top + (cyInt * scaleY);
    let diameter = Math.max(sprWInt * scaleX, sprHInt * scaleY) * 1.12;
    diameter = clamp(diameter, 64, 220);
    this.oval.style.width = `${diameter}px`;
    this.oval.style.height = `${diameter}px`;
    this.oval.style.left = `${cx - diameter / 2}px`;
    this.oval.style.top = `${cy - diameter / 2}px`;
    const orbitRadius = diameter / 2 + 48;
    const angleLeft = (-155 * Math.PI) / 180;
    const angleRight = (-25 * Math.PI) / 180;
    const btnLx = cx + Math.cos(angleLeft) * orbitRadius;
    const btnLy = cy + Math.sin(angleLeft) * orbitRadius;
    const btnRx = cx + Math.cos(angleRight) * orbitRadius;
    const btnRy = cy + Math.sin(angleRight) * orbitRadius;
    const halfBtn = 54 / 2;
    this.leftBtn.style.left = `${btnLx - halfBtn}px`;
    this.leftBtn.style.top = `${btnLy - halfBtn}px`;
    this.rightBtn.style.left = `${btnRx - halfBtn}px`;
    this.rightBtn.style.top = `${btnRy - halfBtn}px`;
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
    this.actionsMenu.style.left = `${actX}px`;
    this.actionsMenu.style.top = `${actY}px`;
    this.infoMenu.style.left = `${infoX}px`;
    this.infoMenu.style.top = `${infoY}px`;
    this._resizeSvg();
    const actConnectX = actX + actRect.width;
    const actConnectY = actY + actRect.height / 2;
    const infoConnectX = infoX;
    const infoConnectY = infoY + infoRect.height / 2;
    this._drawConnector(this.leftPath, cx, cy, btnLx, btnLy, actConnectX, actConnectY, this.showActions);
    this._drawConnector(this.rightPath, cx, cy, btnRx, btnRy, infoConnectX, infoConnectY, this.showInfo);
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
    const tick = () => {
      if (this.visible && this.target) {
        this.updateContent();
        this.updatePositions();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

export default UiPanel;
export const animalUiPanel = new UiPanel();
registerSystem('animalUI', animalUiPanel);