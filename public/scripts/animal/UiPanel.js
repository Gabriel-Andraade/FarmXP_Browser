/**
 * @file UiPanel.js - painel de ui do animal
 * gerencia overlay de seleção, botões orbitais, menus e conectores svg
 * atualiza conteúdo (nome, tipo, barras) e posicionamento baseado em camera/canvas
 */

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

/**
 * chave de armazenamento para nomes customizados por animal
 */
const AUI_NAME_STORAGE_KEY = "farmxp_animal_names_v1";

/**
 * carrega o mapa de nomes persistidos no localStorage
 * @returns {Record<string, string>}
 */
function auiLoadNameMap() {
  try {
    return JSON.parse(localStorage.getItem(AUI_NAME_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * salva o mapa de nomes persistidos no localStorage
 * @param {Record<string, string>} map
 */
function auiSaveNameMap(map) {
  try {
    localStorage.setItem(AUI_NAME_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * gera uma chave estavel para identificar um animal
 * tenta id/uid/uuid/guid; caso nao exista, cria uma chave por tipo e posicao arredondada
 * @param {Object} animal
 * @returns {string}
 */
function auiGetAnimalKey(animal) {
  return (
    animal?.id ||
    animal?.uid ||
    animal?.uuid ||
    animal?.guid ||
    `${animal?.assetName || animal?.type || "animal"}:${Math.round(animal?.spawnX ?? animal?.x ?? 0)}:${Math.round(animal?.spawnY ?? animal?.y ?? 0)}`
  );
}

// =========================================================
// classe do painel de ui do animal
// =========================================================

class UiPanel {
  /**
   * @param {Object} [opts]
   * @param {string} [opts.canvasId] id do canvas onde o mundo e desenhado
   */
  constructor(opts = {}) {
    this.canvasId = opts.canvasId || "gameCanvas";
    this.canvas = null;

    // referencia da camera (cameraSystem.camera)
    this.camera = null;

    // entidade do animal selecionado
    this.target = null;

    // estado de visibilidade do overlay
    this.visible = false;

    // flags de exibicao dos menus
    this.showActions = true;
    this.showInfo = true;

    // referencias de dom
    this.layer = null;
    this.svg = null;
    this.leftPath = null;
    this.rightPath = null;
    this.oval = null;
    this.leftBtn = null;
    this.rightBtn = null;
    this.actionsMenu = null;
    this.infoMenu = null;

    /**
     * fecha o painel ao clicar fora de elementos interativos
     * usa captura para reduzir conflito com handlers do jogo
     */
    this._onDocPointerDown = (e) => {
      if (!this.visible) return;
      if (e.target && e.target.closest && e.target.closest("#animal-ui-layer .aui-interactive")) return;
      this.closeAll();
    };

    /**
     * recalcula viewBox do svg ao redimensionar a janela
     */
    this._onResize = () => this._resizeSvg();

    this.init();
  }

  // =========================================================
  // inicializacao e construcao do dom
  // =========================================================

  /**
   * injeta estilos, cria camada, registra listeners e inicia loop de atualizacao
   */
  init() {
    // REMOVIDO: A injeção de CSS foi removida pois o CSS agora é externo
    // IMPORTANTE: Você deve incluir o arquivo CSS separado no HTML

    // cria ou reutiliza a camada raiz
    this.layer = document.getElementById("animal-ui-layer");
    if (!this.layer) {
      this.layer = document.createElement("div");
      this.layer.id = "animal-ui-layer";
      document.body.appendChild(this.layer);
    }

    // recria a estrutura interna para garantir estado consistente
    this.layer.innerHTML = "";
    this._createDOM();

    document.addEventListener("pointerdown", this._onDocPointerDown, true);
    window.addEventListener("resize", this._onResize);

    this._resizeSvg();
    this._startLoop();
  }

  /**
   * cria elementos de ui: svg, oval de selecao, botoes, menus e handlers
   */
  _createDOM() {
    // svg usado para desenhar conectores entre centro, botoes e menus
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

    // oval de selecao, posicionado sobre o animal
    this.oval = document.createElement("div");
    this.oval.className = "aui-selection-oval";
    this.layer.appendChild(this.oval);

    // botao esquerdo (acoes)
    this.leftBtn = document.createElement("div");
    this.leftBtn.className = "aui-btn aui-left-btn aui-interactive";
    this.leftBtn.textContent = "⚙️";
    this.leftBtn.title = "Acoes";
    this.leftBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleActions();
    });
    this.layer.appendChild(this.leftBtn);

    // botao direito (info)
    this.rightBtn = document.createElement("div");
    this.rightBtn.className = "aui-btn aui-right-btn aui-interactive";
    this.rightBtn.textContent = "📜";
    this.rightBtn.title = "Info";
    this.rightBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleInfo();
    });
    this.layer.appendChild(this.rightBtn);

    // menu de acoes
    this.actionsMenu = document.createElement("div");
    this.actionsMenu.className = "aui-menu aui-interactive";
    this.actionsMenu.innerHTML = `
      <h3>Interacoes</h3>
      <div class="aui-actions">
        <div class="aui-action-btn" data-action="pet"><span class="icon">❤</span><span>Acariciar</span></div>
        <div class="aui-action-btn" data-action="guide"><span class="icon">➤</span><span>Guiar</span></div>
        <div class="aui-action-btn" data-action="feed"><span class="icon">🍎</span><span>Alimentar</span></div>
        <div class="aui-action-btn" data-action="close"><span class="icon">❌</span><span>Fechar</span></div>
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

    // menu de informacoes
    this.infoMenu = document.createElement("div");
    this.infoMenu.className = "aui-menu aui-interactive";
    this.infoMenu.innerHTML = `
      <h3>Info</h3>
      <div class="aui-info-header">
        <div class="aui-gender-circle" data-role="gender">?</div>
        <div class="aui-name-wrap">
          <div class="aui-animal-name" data-role="name" contenteditable="true" spellcheck="false"></div>
          <div class="aui-animal-type" data-role="type"></div>
        </div>
      </div>

      <div class="aui-bars">
        <div class="aui-bar-row">
          <div class="aui-bar-label">Fome</div>
          <div class="aui-bar"><div class="aui-bar-fill" data-role="bar-hunger"></div></div>
          <div class="aui-bar-val" data-role="val-hunger">0%</div>
        </div>

        <div class="aui-bar-row">
          <div class="aui-bar-label">Sede</div>
          <div class="aui-bar"><div class="aui-bar-fill" data-role="bar-thirst"></div></div>
          <div class="aui-bar-val" data-role="val-thirst">0%</div>
        </div>

        <div class="aui-bar-row">
          <div class="aui-bar-label">Moral</div>
          <div class="aui-bar"><div class="aui-bar-fill" data-role="bar-moral"></div></div>
          <div class="aui-bar-val" data-role="val-moral">0%</div>
        </div>
      </div>
    `;

    // confirma edicao do nome ao pressionar enter, sem inserir quebra de linha
    const nameEl = this.infoMenu.querySelector('[data-role="name"]');
    nameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        nameEl.blur();
      }
    });

    /**
     * persiste o nome editado:
     * - aplica em runtime (target.customName)
     * - grava em localStorage para sobreviver ao recarregamento
     */
    nameEl.addEventListener("blur", () => {
      if (!this.target) return;

      const v = (nameEl.textContent || "").trim();
      const key = auiGetAnimalKey(this.target);

      this.target.customName = v || "";

      const map = auiLoadNameMap();
      if (v) map[key] = v;
      else delete map[key];

      auiSaveNameMap(map);
    });

    this.layer.appendChild(this.infoMenu);
  }

  // =========================================================
  // api publica para integracao com o jogo
  // =========================================================

  /**
   * define a camera usada para converter world -> screen
   * @param {Object} cam
   */
  setCamera(cam) {
    this.camera = cam;
  }

  /**
   * alias para abrir o painel a partir do sistema de controle
   * @param {Object} animal
   * @param {Object} cam
   */
  selectAnimal(animal, cam) {
    this.open(animal, cam);
  }

  /**
   * abre o painel e carrega dados do animal selecionado
   * marca o animal com __uiPaused para permitir pausa externa da ia
   * @param {Object} animal
   * @param {Object} cam
   */
  open(animal, cam) {
    if (!animal) return;
    if (cam) this.setCamera(cam);

    this.target = animal;

    // aplica nome persistido, se existir
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

  /**
   * compatibilidade para chamadas que esperam fechar "tudo"
   */
  closeAll() {
    this.close();
  }

  /**
   * fecha o painel e limpa referencias
   * remove conectores para evitar lixo visual
   */
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

  /**
   * alterna a visibilidade do menu de acoes e reposiciona conectores
   */
  toggleActions() {
    this.showActions = !this.showActions;
    this.actionsMenu.classList.toggle("aui-visible", this.showActions);
    this.updatePositions();
  }

  /**
   * alterna a visibilidade do menu de info e reposiciona conectores
   */
  toggleInfo() {
    this.showInfo = !this.showInfo;
    this.infoMenu.classList.toggle("aui-visible", this.showInfo);
    this.updatePositions();
  }

  // =========================================================
  // atualizacao de conteudo (texto e barras)
  // =========================================================

  /**
   * atualiza nome, tipo, genero e barras lendo dados do animal
   * suporta leitura em animal.stats ou diretamente no objeto animal
   */
  updateContent() {
    if (!this.target) return;

    const name = this.target.customName || this.target.name || this.target.assetName || "Animal";
    const type = this.target.assetName || this.target.type || "Desconhecido";

    // genero: tenta campos comuns e converte para um caractere de exibicao
    const genderRaw =
      this.target.gender ??
      this.target.sex ??
      (this.target.isMale === true ? "male" : this.target.isMale === false ? "female" : undefined);

    const genderChar =
      (typeof genderRaw === "string" && genderRaw.toLowerCase().startsWith("m")) ? "♂" :
      (typeof genderRaw === "string" && genderRaw.toLowerCase().startsWith("f")) ? "♀" :
      (genderRaw === true) ? "♂" :
      (genderRaw === false) ? "♀" :
      "?";

    const stats = this.target.stats || this.target;
    const hunger = this._toPercent(stats.hunger);
    const thirst = this._toPercent(stats.thirst);
    const moral = this._toPercent(stats.moral);

    const genderEl = this.infoMenu.querySelector('[data-role="gender"]');
    const nameEl = this.infoMenu.querySelector('[data-role="name"]');
    const typeEl = this.infoMenu.querySelector('[data-role="type"]');

    if (genderEl) genderEl.textContent = genderChar;
    if (nameEl && !nameEl.matches(":focus")) nameEl.textContent = name;
    if (typeEl) typeEl.textContent = type;

    this._setBar("hunger", hunger);
    this._setBar("thirst", thirst);
    this._setBar("moral", moral);
  }

  /**
   * converte um valor para percentual inteiro entre 0 e 100
   * retorna 0 quando o valor nao e numerico
   * @param {any} v
   * @returns {number}
   */
  _toPercent(v) {
    if (typeof v !== "number") return 0;
    if (Number.isNaN(v)) return 0;
    return clamp(Math.round(v), 0, 100);
  }

  /**
   * atualiza barra e label de percentual pelo data-role
   * @param {"hunger"|"thirst"|"moral"} key
   * @param {number} value
   */
  _setBar(key, value) {
    const bar = this.infoMenu.querySelector(`[data-role="bar-${key}"]`);
    const val = this.infoMenu.querySelector(`[data-role="val-${key}"]`);
    if (bar) bar.style.width = `${value}%`;
    if (val) val.textContent = `${value}%`;
  }

  /**
   * emite um evento global com a acao do menu
   * permite que outros sistemas escutem e executem logica do jogo
   * @param {string} actionId
   */
  _emitAction(actionId) {
    const ev = new CustomEvent("animalAction", {
      detail: {
        action: actionId,
        animal: this.target
      }
    });
    document.dispatchEvent(ev);
  }

  // =========================================================
  // posicionamento (camera/canvas e viewport)
  // =========================================================

  /**
   * calcula a transformacao do canvas na tela para mapear coordenadas internas -> dom px
   * lida com devicePixelRatio e canvas com resolucao interna maior que o css size
   * @returns {null|{rect: DOMRect, dpr: number, internalW: number, internalH: number, scaleX: number, scaleY: number}}
   */
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

  /**
   * estima o tamanho desenhado do animal nas coordenadas internas
   * usa frameWidth/frameHeight e aplica zoom da camera
   * @param {Object} animal
   * @returns {{w: number, h: number}}
   */
  _getAnimalDrawSizeInternal(animal) {
    const baseW = animal.frameWidth || animal.width || 64;
    const baseH = animal.frameHeight || animal.height || baseW;
    const zoom = (this.camera && typeof this.camera.zoom === "number") ? this.camera.zoom : 1;
    return { w: baseW * zoom, h: baseH * zoom };
  }

  /**
   * atualiza posicao do oval, botoes, menus e conectores
   * depende de camera.worldToScreen e do transform do canvas na tela
   * @param {boolean} [force=false]
   */
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

    // top-left interno retornado pela camera; centro e calculado pelo tamanho desenhado
    const topLeftInt = cam.worldToScreen(x, y);
    const cxInt = topLeftInt.x + sprWInt / 2;
    const cyInt = topLeftInt.y + sprHInt / 2;

    // oculta overlay quando o alvo esta muito fora do viewport interno
    const margin = Math.max(sprWInt, sprHInt);
    const out =
      cxInt < -margin || cyInt < -margin ||
      cxInt > internalW + margin || cyInt > internalH + margin;

    if (out) {
      this.layer.style.opacity = "0";
      return;
    }
    this.layer.style.opacity = "1";

    // converte centro interno para coordenada de tela, ancorado no rect do canvas
    const cx = rect.left + (cxInt * scaleX);
    const cy = rect.top + (cyInt * scaleY);

    // diametro do oval baseado no sprite, limitado por clamp
    let diameter = Math.max(sprWInt * scaleX, sprHInt * scaleY) * 1.12;
    diameter = clamp(diameter, 64, 220);

    this.oval.style.width = `${diameter}px`;
    this.oval.style.height = `${diameter}px`;
    this.oval.style.left = `${cx - diameter / 2}px`;
    this.oval.style.top = `${cy - diameter / 2}px`;

    // posiciona botoes em orbita ao redor do oval
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

    // posiciona menus ao lado dos botoes e garante que nao saiam da tela
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

    // atualiza conectores; viewBox deve cobrir a janela atual
    this._resizeSvg();

    const actConnectX = actX + actRect.width;
    const actConnectY = actY + actRect.height / 2;

    const infoConnectX = infoX;
    const infoConnectY = infoY + infoRect.height / 2;

    this._drawConnector(this.leftPath, cx, cy, btnLx, btnLy, actConnectX, actConnectY, this.showActions);
    this._drawConnector(this.rightPath, cx, cy, btnRx, btnRy, infoConnectX, infoConnectY, this.showInfo);
  }

  /**
   * desenha um conector do centro para o botao, e opcionalmente estende ate o menu
   * @param {SVGPathElement} pathEl
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {number} x3
   * @param {number} y3
   * @param {boolean} extended
   */
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

  /**
   * ajusta o viewBox do svg para cobrir toda a janela
   */
  _resizeSvg() {
    if (!this.svg) return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }

  /**
   * loop via requestAnimationFrame para manter ui sincronizada com jogo
   * atualiza conteudo e posicoes somente quando o painel estiver visivel
   */
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

// =========================================================
// instancia unica e compatibilidade global
// =========================================================

export const animalUiPanel = new UiPanel();

if (typeof window !== "undefined") {
  window.UiPanel = UiPanel;
  window.animalUiPanel = animalUiPanel;
}