/**
 * @file UiPanel.js - painel de ui do animal
 * Atualizado para suportar troca dinâmica de idiomas
 */

import { t } from '../i18n/i18n.js';

const STYLES = `
/* ================= CONTAINER GERAL ================= */
#animal-ui-layer {
  position: fixed;
  inset: 0;
  z-index: 2500;
  pointer-events: none;
  display: none;
  font-family: "Segoe UI", Tahoma, sans-serif;
}
#animal-ui-layer.visible { display: block; }
#animal-ui-layer .aui-interactive { pointer-events: auto; }

/* ================= CIRCULO CENTRAL (SELECAO) ================= */
.selection-oval {
  position: absolute;
  border: 3px solid #ffd700;
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.4), inset 0 0 10px rgba(255, 215, 0, 0.1);
  background: rgba(43, 26, 12, 0.15);
  z-index: 5;
  pointer-events: none;
  opacity: 0;
  transform-origin: center;
  transition: width 0.08s linear, height 0.08s linear, top 0.08s linear, left 0.08s linear;
}
.selection-oval.active {
  opacity: 1;
  animation: oval-pulse 2s infinite;
}
@keyframes oval-pulse {
  0% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); border-color: #ffd700; }
  50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); border-color: #fff8dc; }
  100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); border-color: #ffd700; }
}

/* ================= BOTOES ORBITAIS ================= */
.aui-btn {
  position: absolute;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 2px solid #fff8dc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  user-select: none;
  z-index: 20;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
  box-shadow: 0 6px 12px rgba(0,0,0,0.6);
  color: #fff;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}
.aui-btn:hover {
  transform: scale(1.15);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  z-index: 25;
}
.aui-btn:active { transform: scale(0.95); }
.aui-btn.left-btn {
  background: linear-gradient(135deg, #2e8b57 0%, #1a4d33 100%);
  border-color: #98fb98;
}
.aui-btn.right-btn {
  background: linear-gradient(135deg, #daa520 0%, #b8860b 100%);
  border-color: #ffd700;
}

/* ================= PAINEIS DE MENU ================= */
.aui-menu {
  position: absolute;
  background: rgba(35, 25, 15, 0.96);
  border: 2px solid #b8860b;
  border-radius: 10px;
  padding: 12px;
  color: #f0e6d2;
  min-width: 220px;
  max-width: 320px;
  z-index: 15;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.18s, transform 0.18s;
  pointer-events: none;
  font-size: 14px;
  backdrop-filter: blur(4px);
}
.aui-menu.visible {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}
.aui-menu h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #ffd700;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(184, 134, 11, 0.4);
  padding-bottom: 6px;
  text-align: center;
  font-weight: 700;
  letter-spacing: 1px;
}
.aui-action-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: linear-gradient(to right, rgba(255,255,255,0.05), transparent);
  border: 1px solid #5c4033;
  color: #e6e6e6;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.18s;
}
.aui-action-btn:hover {
  background: rgba(255, 215, 0, 0.1);
  border-color: #ffd700;
  color: #fff;
  transform: translateX(4px);
  box-shadow: -2px 2px 5px rgba(0,0,0,0.3);
}
.aui-action-btn span.icon { font-size: 18px; }

/* ================= LINHAS SVG ================= */
.aui-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  overflow: visible;
}
.aui-line-path {
  fill: none;
  stroke: #b8860b;
  stroke-width: 2.5;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.8));
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.9;
}

/* ================= INFO HEADER + BARRAS ================= */
.aui-info-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(184, 134, 11, 0.35);
}
.aui-gender-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6aa84f 0%, #274e13 100%);
  border: 2px solid rgba(255, 215, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
}
.aui-name-wrap { flex: 1; min-width: 0; }
.aui-animal-name {
  font-weight: 800;
  font-size: 15px;
  color: #fff;
  outline: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.aui-animal-type {
  font-size: 12px;
  color: #d6c7ab;
  opacity: 0.95;
  margin-top: 1px;
}

.aui-bars { display: flex; flex-direction: column; gap: 10px; }
.aui-bar-row { display: flex; align-items: center; gap: 10px; }
.aui-bar-label { width: 56px; font-weight: 700; color: #deb887; font-size: 13px; }
.aui-bar {
  flex: 1;
  height: 9px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(0,0,0,0.25);
}
.aui-bar-fill {
  height: 100%;
  width: 50%;
  border-radius: 6px;
  background: linear-gradient(90deg, #ffd700, #2e8b57);
}
.aui-bar-val {
  width: 46px;
  text-align: right;
  color: #fff;
  font-variant-numeric: tabular-nums;
}
`;

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

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
    if (!document.getElementById("aui-styles-injected")) {
      const styleEl = document.createElement("style");
      styleEl.id = "aui-styles-injected";
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }

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
    
    // 🌍 OUVINTE IMPORTANTE: Recria a interface quando o idioma mudar
    document.addEventListener('languageChanged', () => {
        this.rebuildInterface();
    });

    this._resizeSvg();
    this._startLoop();
  }

  // 🆕 Método para reconstruir tudo quando o idioma muda
  rebuildInterface() {
      if (this.layer) {
          this.layer.innerHTML = ''; // Limpa o antigo
          this._createDOM(); // Cria novo com idioma atual
          
          // Se estava aberto, atualiza o conteúdo do animal
          if (this.visible && this.target) {
              this.updateContent();
              // Re-aplica estado visual
              this.layer.classList.add("visible");
              this.oval.classList.add("active");
              this.actionsMenu.classList.toggle("visible", this.showActions);
              this.infoMenu.classList.toggle("visible", this.showInfo);
              this.updatePositions(true);
          }
      }
  }

  _createDOM() {
    // ⚠️ Importante: t() é chamado aqui. Se o idioma mudar, precisamos chamar _createDOM de novo.
    
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
    this.oval.className = "selection-oval";
    this.layer.appendChild(this.oval);

    this.leftBtn = document.createElement("div");
    this.leftBtn.className = "aui-btn left-btn aui-interactive";
    this.leftBtn.textContent = "⚙️";
    this.leftBtn.title = t('animal.ui.actions');
    this.leftBtn.addEventListener("click", (e) => { e.stopPropagation(); this.toggleActions(); });
    this.layer.appendChild(this.leftBtn);

    this.rightBtn = document.createElement("div");
    this.rightBtn.className = "aui-btn right-btn aui-interactive";
    this.rightBtn.textContent = "📜";
    this.rightBtn.title = t('animal.ui.info');
    this.rightBtn.addEventListener("click", (e) => { e.stopPropagation(); this.toggleInfo(); });
    this.layer.appendChild(this.rightBtn);

    this.actionsMenu = document.createElement("div");
    this.actionsMenu.className = "aui-menu aui-interactive";
    
    // 🌍 Tradução dinâmica aplicada aqui
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
    
    // 🌍 Tradução dinâmica aplicada aqui
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
    this.layer.classList.add("visible");
    this.oval.classList.add("active");
    this.showActions = true;
    this.showInfo = true;
    this.actionsMenu.classList.toggle("visible", this.showActions);
    this.infoMenu.classList.toggle("visible", this.showInfo);
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
    this.layer.classList.remove("visible");
    this.oval.classList.remove("active");
    this.actionsMenu.classList.remove("visible");
    this.infoMenu.classList.remove("visible");
    this.leftPath.setAttribute("d", "");
    this.rightPath.setAttribute("d", "");
  }

  toggleActions() {
    this.showActions = !this.showActions;
    this.actionsMenu.classList.toggle("visible", this.showActions);
    this.updatePositions();
  }

  toggleInfo() {
    this.showInfo = !this.showInfo;
    this.infoMenu.classList.toggle("visible", this.showInfo);
    this.updatePositions();
  }

  updateContent() {
    if (!this.target) return;
    const name = this.target.customName || this.target.name || this.target.assetName || "Animal";
    const type = this.target.assetName ? t(`animals.${this.target.assetName.toLowerCase()}`) : this.target.type || t('animal.type.unknown');
    
    // Fallback se a tradução retornar a chave ou for indefinida
    const displayType = type.includes('animals.') ? this.target.assetName : type;

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
    const cam = this.camera || window.camera;
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
if (typeof window !== "undefined") {
  window.UiPanel = UiPanel;
  window.animalUiPanel = animalUiPanel;
}