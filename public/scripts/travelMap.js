/**
 * @file travelMap.js - Mapa de viagem (picape)
 * Modal exibido ao interagir com a picape (na fazenda) ou com o portal verde
 * (na cidade). Mostra os locais conectados e anima o jogador pelas estradas
 * antes de delegar a transição real para o mapManager.
 *
 * Recursos:
 *  - Animação do marcador seguindo as estradas em ângulo reto.
 *  - Pausa em postos de gasolina com prompt "abastecer?" e slider de refuel.
 *  - Consumo de combustível proporcional à distância (apenas em destinos
 *    traversíveis: farm ↔ city). Locais em desenvolvimento/bloqueados não
 *    consomem combustível.
 *
 * Uso:
 *   const tm = getSystem('travelMap');
 *   tm.open({ currentLocationId: 'farm', onTravel: async (id) => {...} });
 */

import { registerSystem, getSystem } from './gameState.js';
import { t, i18n } from './i18n/i18n.js';
import { logger } from './logger.js';

// Definições dos locais (coordenadas em % do quadro, igual ao protótipo).
const LOCATIONS = {
  city:           { id: 'city',           icon: '🏘️', x: 40, y: 75, connectedTo: ['farm', 'vet', 'blocked'], blocked: false, traversable: true },
  farm:           { id: 'farm',           icon: '🌾', x: 15, y: 55, connectedTo: ['city', 'slaughterhouse'], blocked: false, traversable: true },
  slaughterhouse: { id: 'slaughterhouse', icon: '🥩', x: 35, y: 20, connectedTo: ['farm'],                   blocked: false, traversable: false },
  vet:            { id: 'vet',            icon: '🏥', x: 50, y: 35, connectedTo: ['city'],                   blocked: false, traversable: false, panelId: 'vet' },
  blocked:        { id: 'blocked',        icon: '🔒', x: 75, y: 75, connectedTo: ['city'],                   blocked: true,  traversable: false },
};

// Postos de gasolina decorativos. Posicionados AO LADO das estradasw
// (nunca em cima delas), seguindo o esboço de referência.
const GAS_STATIONS = [
  { x: 24, y: 16 }, // 0 — acima do trecho horizontal farm→slaughterhouse
  { x: 36, y: 60 }, // 1 — ao lado do junction farm/city
  { x: 55, y: 70 }, // 2 — acima do trecho city→blocked
];

// Caminhos das estradas — todas com cantos retos (90°), sem curvas Bézier.
const ROAD_PATHS = [
  'M 120 275 V 100 H 280',          // farm → slaughterhouse (sobe, depois direita)
  'M 120 275 H 320 V 375',          // farm → junction → city (direita, depois desce)
  'M 320 275 V 175 H 400',          // junction → vet (sobe, depois direita)
  'M 320 375 H 600',                // city → blocked (reta horizontal)
];

// Rotas: pontos percorridos pelo marcador para cada par de locais conectados.
// Pontos com `gasIdx` definido fazem o marcador pausar para o posto N (prompt
// de abastecimento). Coordenadas em % do quadro.
const EDGE_ROUTES = {
  'farm->slaughterhouse': [
    { x: 15, y: 20 },
    { x: 24, y: 20, gasIdx: 0 },
    { x: 35, y: 20 },
  ],
  'slaughterhouse->farm': [
    { x: 24, y: 20, gasIdx: 0 },
    { x: 15, y: 20 },
    { x: 15, y: 55 },
  ],
  'farm->city': [
    { x: 40, y: 55 },
    { x: 40, y: 60, gasIdx: 1 },
    { x: 40, y: 75 },
  ],
  'city->farm': [
    { x: 40, y: 60, gasIdx: 1 },
    { x: 40, y: 55 },
    { x: 15, y: 55 },
  ],
  'city->vet': [
    { x: 40, y: 60, gasIdx: 1 },
    { x: 40, y: 35 },
    { x: 50, y: 35 },
  ],
  'vet->city': [
    { x: 40, y: 35 },
    { x: 40, y: 60, gasIdx: 1 },
    { x: 40, y: 75 },
  ],
  'city->blocked': [
    { x: 55, y: 75, gasIdx: 2 },
    { x: 75, y: 75 },
  ],
  'blocked->city': [
    { x: 55, y: 75, gasIdx: 2 },
    { x: 40, y: 75 },
  ],
};

// Custo de combustível (% do tanque) por trecho. Apenas para destinos
// traversíveis (farm ↔ city). Os demais ainda não consomem combustível.
const EDGE_FUEL_COST = {
  'farm->city': 9.00,
  'city->farm': 9.00,
  'city->vet': 4.50,
  'vet->city': 4.50,
  'farm->slaughterhouse': 3.00,
  'slaughterhouse->farm': 3.00,
  'farm->vet': 4.50, // rota implícita via city
  'vet->farm': 4.50, // rota implícita via city
};

// Tempo do jogo (em minutos) pulado ao concluir cada trecho. O modal de
// viagem dura poucos segundos reais, então sem esse "pulo" o relógio do
// jogo praticamente não anda durante a viagem. Os valores espelham as
// distâncias do mapa (proporcionais ao consumo de combustível).
const EDGE_TIME_COST = {
  'farm->city': 20,
  'city->farm': 20,
  'city->vet': 25,
  'vet->city': 25,
  'farm->slaughterhouse': 8,
  'slaughterhouse->farm': 8,
  'city->blocked': 15,
  'blocked->city': 15,
};

const STEP_MS = 290;

// ─── Helpers de formatação (locale-aware) ───────────────────────────────────

// Mapeia idioma do jogo → (locale BCP47, moeda ISO 4217). Idioma não suportado
// cai no padrão pt-BR/BRL.
const LOCALE_MAP = {
  'pt-BR': { locale: 'pt-BR', currency: 'BRL' },
  'en':    { locale: 'en-US', currency: 'USD' },
  'es':    { locale: 'es-ES', currency: 'EUR' },
};

function getLocaleConfig() {
  const lang = i18n?.getCurrentLanguage?.() || 'pt-BR';
  return LOCALE_MAP[lang] || LOCALE_MAP['pt-BR'];
}

function fmtPercent(p) {
  const v = Math.max(0, Math.min(100, Number(p) || 0));
  const { locale } = getLocaleConfig();
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v) + '%';
}

function fmtMoney(amount) {
  const v = Math.max(0, Number(amount) || 0);
  const { locale, currency } = getLocaleConfig();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtLiters(percentOfTank) {
  const fuel = getSystem('fuel');
  const liters = fuel ? fuel.litersFromPercent(percentOfTank) : (50 * (percentOfTank / 100));
  const { locale } = getLocaleConfig();
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(liters) + ' L';
}

class TravelMap {
  constructor() {
    this.overlay = null;
    this.popupOverlay = null;
    this.refuelModal = null;
    this.cards = {};
    this.playerMarker = null;
    this.titleEl = null;
    this.legendEl = null;
    this.fuelPillEl = null;

    this.currentLocationId = null;
    this.isMoving = false;
    this.onTravel = null;
    this.visible = false;
    this._stepTimer = null;
    this._popupTimer = null;
    this._abortController = null;
    this._fuelListener = null;
  }

  /**
   * Abre o mapa centralizado em um local.
   * @param {Object} [opts]
   * @param {string} [opts.currentLocationId]
   * @param {Function} [opts.onTravel]
   * @param {boolean} [opts.instant=false] - quando true, ignora a animação
   *   de fade-in. Útil ao reabrir o mapa logo após fechar uma sub-vista
   *   (ex.: vet panel) — sem isso o mapa do mundo subjacente "pisca"
   *   entre os dois overlays durante o cross-fade.
   */
  open({ currentLocationId, onTravel, instant = false } = {}) {
    if (!LOCATIONS[currentLocationId]) {
      logger.warn?.(`[TravelMap] currentLocationId inválido: ${currentLocationId}`);
      return;
    }
    if (this.visible) return;

    this.currentLocationId = currentLocationId;
    this.onTravel = typeof onTravel === 'function' ? onTravel : null;
    this.isMoving = false;

    this._buildDOM();
    this._updateCurrentHighlight(currentLocationId, true);
    this._refreshFuelPill();

    // Posiciona o marcador do jogador no local atual.
    const cur = LOCATIONS[currentLocationId];
    this.playerMarker.style.left = cur.x + '%';
    this.playerMarker.style.top  = cur.y + '%';
    this.playerMarker.style.transition = '';

    if (instant) {
      // Pula a transição: força opacity 1 sem animação, depois restaura
      // o transition default no próximo frame (pra fechamento manter fade).
      this.overlay.style.transition = 'none';
      this.overlay.classList.add('tmap-visible');
      requestAnimationFrame(() => {
        if (this.overlay) this.overlay.style.transition = '';
      });
    } else {
      requestAnimationFrame(() => {
        this.overlay.classList.add('tmap-visible');
      });
    }
    this.visible = true;

    // Mantém a pílula de combustível atualizada se o saldo mudar fora do mapa.
    this._fuelListener = () => this._refreshFuelPill();
    document.addEventListener('fuelChanged', this._fuelListener);
  }

  /** Fecha o mapa e limpa eventos/timers. */
  close() {
    if (!this.visible && !this.overlay) return;

    if (this._stepTimer) { clearTimeout(this._stepTimer); this._stepTimer = null; }
    if (this._popupTimer) { clearTimeout(this._popupTimer); this._popupTimer = null; }

    if (this.overlay) this.overlay.classList.remove('tmap-visible');
    if (this.popupOverlay) this.popupOverlay.classList.remove('tmap-popup-active');
    if (this.refuelModal) this.refuelModal.classList.remove('tmap-refuel-active');

    if (this._fuelListener) {
      document.removeEventListener('fuelChanged', this._fuelListener);
      this._fuelListener = null;
    }

    // Aguarda transição de saída e remove DOM.
    setTimeout(() => {
      if (this._abortController) { this._abortController.abort(); this._abortController = null; }
      if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
      if (this.popupOverlay && this.popupOverlay.parentNode) this.popupOverlay.parentNode.removeChild(this.popupOverlay);
      if (this.refuelModal && this.refuelModal.parentNode) this.refuelModal.parentNode.removeChild(this.refuelModal);
      this.overlay = null;
      this.popupOverlay = null;
      this.refuelModal = null;
      this.cards = {};
      this.playerMarker = null;
      this.titleEl = null;
      this.legendEl = null;
      this.fuelPillEl = null;
    }, 320);

    this.visible = false;
    this.isMoving = false;
    this.onTravel = null;
  }

  isOpen() { return this.visible; }

  _buildDOM() {
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    // ---- Overlay principal ----
    const overlay = document.createElement('div');
    overlay.id = 'travel-map-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'travel-map-title');

    const wrapper = document.createElement('div');
    wrapper.className = 'tmap-wrapper';

    const inner = document.createElement('div');
    inner.className = 'tmap-inner';

    // Topo: pílula de combustível à esquerda, título centrado, fechar à direita.
    const topBar = document.createElement('div');
    topBar.className = 'tmap-top-bar';

    const fuelPill = document.createElement('div');
    fuelPill.className = 'tmap-fuel-pill';
    fuelPill.setAttribute('aria-live', 'polite');
    this.fuelPillEl = fuelPill;

    const title = document.createElement('h1');
    title.id = 'travel-map-title';
    title.className = 'tmap-title';
    title.textContent = t('quests.travelMap.title');
    this.titleEl = title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tmap-close-btn';
    closeBtn.setAttribute('aria-label', t('quests.travelMap.close'));
    closeBtn.title = t('quests.travelMap.closeHint');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.close(), { signal });

    topBar.append(fuelPill, title, closeBtn);

    // ---- Área do mapa ----
    const area = document.createElement('div');
    area.className = 'tmap-area';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('tmap-roads');
    svg.setAttribute('viewBox', '0 0 800 500');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    for (const d of ROAD_PATHS) {
      for (const cls of ['tmap-road-base', 'tmap-road-edge', 'tmap-road-detail']) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', cls);
        svg.appendChild(path);
      }
    }
    area.appendChild(svg);

    // Cards dos locais
    for (const id of Object.keys(LOCATIONS)) {
      const loc = LOCATIONS[id];
      const card = document.createElement('div');
      card.className = 'tmap-card' + (loc.blocked ? ' tmap-blocked' : '');
      card.dataset.location = id;
      card.style.left = loc.x + '%';
      card.style.top  = loc.y + '%';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      this._setCardLabels(card, id);

      const icon = document.createElement('span');
      icon.className = 'tmap-icon';
      icon.textContent = loc.icon;
      const name = document.createElement('span');
      name.className = 'tmap-name';
      name.dataset.role = 'name';
      const desc = document.createElement('span');
      desc.className = 'tmap-desc';
      desc.dataset.role = 'desc';
      this._fillCardText(name, desc, id);

      card.append(icon, name, desc);

      const onActivate = (e) => {
        e.stopPropagation();
        this._handleLocationClick(id);
      };
      card.addEventListener('click', onActivate, { signal });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._handleLocationClick(id);
        }
      }, { signal });

      area.appendChild(card);
      this.cards[id] = card;
    }

    // Postos de gasolina (decorativos)
    for (const gs of GAS_STATIONS) {
      const el = document.createElement('div');
      el.className = 'tmap-gas';
      el.style.left = gs.x + '%';
      el.style.top  = gs.y + '%';
      el.setAttribute('aria-hidden', 'true');
      area.appendChild(el);
    }

    // Marcador do jogador — ícone do personagem ativo (stella/ben/graham)
    // dentro de um frame dourado com pulso de escala.
    const marker = document.createElement('div');
    marker.className = 'tmap-player';
    marker.setAttribute('aria-hidden', 'true');
    const playerImg = document.createElement('img');
    playerImg.className = 'tmap-player-icon';
    playerImg.alt = '';
    playerImg.src = this._getPlayerIconSrc();
    playerImg.draggable = false;
    marker.appendChild(playerImg);
    area.appendChild(marker);
    this.playerMarker = marker;

    // ---- Legenda ----
    const legend = document.createElement('div');
    legend.className = 'tmap-legend';
    this.legendEl = legend;
    this._fillLegend(legend);

    inner.append(topBar, area);
    wrapper.append(inner, legend);
    overlay.appendChild(wrapper);

    // Fecha ao clicar no fundo (fora do wrapper).
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    }, { signal });

    // Bloqueia teclas globais do jogo (WASD, E, etc.) enquanto o mapa está aberto.
    // Aceita ESC para fechar.
    const blockKeys = (e) => {
      if (!this.visible) return;
      if (e.key === 'Escape' && e.type === 'keydown') {
        e.preventDefault();
        this.close();
        e.stopImmediatePropagation();
        return;
      }
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', blockKeys, { capture: true, signal });
    window.addEventListener('keyup',   blockKeys, { capture: true, signal });
    window.addEventListener('keypress', blockKeys, { capture: true, signal });

    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Popup de feedback (separado, sempre acima do mapa)
    this._buildPopupDOM(signal);
  }

  _buildPopupDOM(signal) {
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'tmap-popup-overlay';
    popupOverlay.setAttribute('role', 'alertdialog');
    popupOverlay.setAttribute('aria-modal', 'true');

    const dialog = document.createElement('div');
    dialog.className = 'tmap-popup-dialog';

    const icon = document.createElement('span');
    icon.className = 'tmap-popup-icon';
    icon.dataset.role = 'icon';
    icon.textContent = '📍';

    const msg = document.createElement('p');
    msg.className = 'tmap-popup-msg';
    msg.dataset.role = 'msg';

    const buttons = document.createElement('div');
    buttons.className = 'tmap-popup-buttons';
    buttons.dataset.role = 'buttons';

    dialog.append(icon, msg, buttons);
    popupOverlay.appendChild(dialog);

    // Click no fundo só fecha se o popup estiver "dismissible".
    popupOverlay.addEventListener('click', (e) => {
      if (e.target !== popupOverlay) return;
      if (popupOverlay.dataset.dismissible === 'true') this._hidePopup();
    }, { signal });

    document.body.appendChild(popupOverlay);
    this.popupOverlay = popupOverlay;
  }

  _setCardLabels(card, id) {
    const loc = LOCATIONS[id];
    const name = t(`quests.travelMap.locations.${id}.name`);
    const suffix = loc.blocked
      ? t('quests.travelMap.ariaBlocked')
      : t('quests.travelMap.ariaTravel');
    card.setAttribute('aria-label', `${name} — ${suffix}`);
    card.title = name;
  }

  _fillCardText(nameEl, descEl, id) {
    nameEl.textContent = t(`quests.travelMap.locations.${id}.name`);
    descEl.textContent = t(`quests.travelMap.locations.${id}.desc`);
  }

  _fillLegend(legend) {
    legend.replaceChildren();
    const legendItems = [
      { dot: 'tmap-dot-gold', text: t('quests.travelMap.legend.player') },
      { prefix: '🏘️',         text: t('quests.travelMap.legend.current') },
      { prefix: '🌾🥩🏥',      text: t('quests.travelMap.legend.destinations') },
      { dot: 'tmap-dot-cyan', text: t('quests.travelMap.legend.gas') },
      { dot: 'tmap-dot-red',  text: t('quests.travelMap.legend.blocked') },
    ];
    for (const item of legendItems) {
      const span = document.createElement('span');
      if (item.dot) {
        const dot = document.createElement('span');
        dot.className = `tmap-dot ${item.dot}`;
        span.appendChild(dot);
        span.append(' ' + item.text);
      } else {
        span.textContent = `${item.prefix} ${item.text}`;
      }
      legend.appendChild(span);
    }
  }

  /** Retorna o caminho do ícone do personagem ativo. Fallback: stella. */
  _getPlayerIconSrc() {
    const playerSys = getSystem('player');
    const id = playerSys?.activeCharacter?.id;
    const allowed = ['stella', 'ben', 'graham'];
    const safeId = allowed.includes(id) ? id : 'stella';
    return `assets/icons/${safeId}Icon.png`;
  }

  _refreshFuelPill() {
    if (!this.fuelPillEl) return;
    const fuel = getSystem('fuel');
    const v = fuel ? fuel.getFuel() : 100;
    this.fuelPillEl.replaceChildren();
    const icon = document.createElement('span');
    icon.className = 'tmap-fuel-pill-icon';
    icon.textContent = '⛽';
    const value = document.createElement('span');
    value.className = 'tmap-fuel-pill-value';
    value.textContent = fmtPercent(v);
    this.fuelPillEl.append(icon, value);
    this.fuelPillEl.classList.toggle('tmap-fuel-pill-low', v < 15);
  }

  _updateCurrentHighlight(newLocId, initial = false) {
    if (!initial) {
      const oldCard = this.cards[this.currentLocationId];
      if (oldCard) {
        oldCard.classList.remove('tmap-current');
        const oldBadge = oldCard.querySelector('.tmap-current-badge');
        if (oldBadge) oldBadge.remove();
      }
    }
    const newCard = this.cards[newLocId];
    if (newCard && !LOCATIONS[newLocId].blocked) {
      newCard.classList.add('tmap-current');
      if (!newCard.querySelector('.tmap-current-badge')) {
        const badge = document.createElement('span');
        badge.className = 'tmap-current-badge';
        badge.textContent = t('quests.travelMap.currentBadge');
        newCard.appendChild(badge);
      }
    }
    this.currentLocationId = newLocId;
  }

  _findPath(fromId, toId) {
    if (fromId === toId) return [fromId];
    const queue = [[fromId]];
    const visited = new Set([fromId]);
    while (queue.length) {
      const path = queue.shift();
      const nodeId = path[path.length - 1];
      if (nodeId === toId) return path;
      const node = LOCATIONS[nodeId];
      if (!node) continue;
      for (const neighbor of node.connectedTo) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return null;
  }

  /** Soma o custo de combustível ao longo de uma sequência de IDs de locais. */
  _calcRouteFuelCost(pathIds) {
    let total = 0;
    for (let i = 1; i < pathIds.length; i++) {
      const key = `${pathIds[i - 1]}->${pathIds[i]}`;
      total += EDGE_FUEL_COST[key] || 0;
    }
    return total;
  }

  /** Soma o tempo (minutos do jogo) que será pulado ao percorrer a rota. */
  _calcRouteTimeCost(pathIds) {
    let total = 0;
    for (let i = 1; i < pathIds.length; i++) {
      const key = `${pathIds[i - 1]}->${pathIds[i]}`;
      total += EDGE_TIME_COST[key] || 0;
    }
    return total;
  }

  /** True se a rota tem ao menos um posto de gasolina pelo caminho. */
  _routeHasGasStation(pathIds) {
    for (let i = 1; i < pathIds.length; i++) {
      const route = EDGE_ROUTES[`${pathIds[i - 1]}->${pathIds[i]}`];
      if (route && route.some((p) => typeof p.gasIdx === 'number')) return true;
    }
    return false;
  }

  _moveThroughPoints(points, callback) {
    if (!points.length) { callback?.(); return; }
    this.isMoving = true;
    this.playerMarker.style.transition = `left ${STEP_MS - 10}ms linear, top ${STEP_MS - 10}ms linear`;

    let i = 0;
    const nextStep = () => {
      if (!this.playerMarker) {
        this.isMoving = false;
        return;
      }
      if (i >= points.length) {
        this.playerMarker.style.transition = '';
        this.isMoving = false;
        this._stepTimer = null;
        callback?.();
        return;
      }
      const pt = points[i];
      this.playerMarker.style.left = pt.x + '%';
      this.playerMarker.style.top  = pt.y + '%';
      i++;
      this._stepTimer = setTimeout(() => {
        this._stepTimer = null;
        if (typeof pt.gasIdx === 'number') {
          // Pausa para o posto de gasolina; retoma quando o usuário responder.
          this._showGasPrompt(pt.gasIdx, nextStep);
        } else {
          nextStep();
        }
      }, STEP_MS);
    };
    nextStep();
  }

  _handleLocationClick(targetLocId) {
    if (this.isMoving) {
      this._showInfoPopup('⏳', t('quests.travelMap.popup.moving'));
      return;
    }
    const target = LOCATIONS[targetLocId];
    if (!target) return;

    const targetName = t(`quests.travelMap.locations.${targetLocId}.name`);

    if (targetLocId === this.currentLocationId) {
      this._showInfoPopup('📍', t('quests.travelMap.popup.alreadyHere').replace('{name}', targetName));
      return;
    }
    if (target.blocked) {
      this._showInfoPopup('🔒', t('quests.travelMap.popup.locked'));
      return;
    }

    const pathIds = this._findPath(this.currentLocationId, targetLocId);
    if (!pathIds || pathIds.length < 2) {
      this._showInfoPopup('⚠️', t('quests.travelMap.popup.noPath').replace('{name}', targetName));
      return;
    }

    // Pré-check de combustível: só bloqueia quando o destino consome combustível,
    // o tanque é insuficiente E não há posto na rota para abastecer no caminho.
    const fuelCost = this._calcRouteFuelCost(pathIds);
    if (fuelCost > 0) {
      const fuel = getSystem('fuel');
      const current = fuel ? fuel.getFuel() : 100;
      if (current + 1e-6 < fuelCost && !this._routeHasGasStation(pathIds)) {
        this._showInfoPopup('⛽', t('quests.travelMap.popup.insufficientFuel')
          .replace('{name}', targetName)
          .replace('{current}', fmtPercent(current))
          .replace('{needed}', fmtPercent(fuelCost)));
        return;
      }
    }

    // Constrói a sequência completa de pontos a percorrer.
    const points = [];
    points.push({ x: LOCATIONS[this.currentLocationId].x, y: LOCATIONS[this.currentLocationId].y });

    let prev = this.currentLocationId;
    for (let idx = 1; idx < pathIds.length; idx++) {
      const nextId = pathIds[idx];
      const route = EDGE_ROUTES[`${prev}->${nextId}`];
      if (route) {
        for (const wp of route) points.push({ ...wp });
      } else {
        points.push({ x: LOCATIONS[nextId].x, y: LOCATIONS[nextId].y });
      }
      prev = nextId;
    }

this._moveThroughPoints(points, () => {
  const consumeRouteFuel = () => {
    if (fuelCost <= 0) {
      this._refreshFuelPill();
      return true;
    }

    const fuel = getSystem('fuel');
    if (!fuel) {
      this._refreshFuelPill();
      return true;
    }

    const ok = fuel.consumePercent(fuelCost);
    if (!ok) {
      this._showInfoPopup('⛽', t('quests.travelMap.popup.insufficientFuel')
        .replace('{name}', targetName)
        .replace('{current}', fmtPercent(fuel.getFuel()))
        .replace('{needed}', fmtPercent(fuelCost)));
      this._refreshFuelPill();
      return false;
    }

    this._refreshFuelPill();
    return true;
  };

  // Aplica o "pulo" de tempo correspondente à rota. Sem isso o relógio
  // do jogo não progride durante a viagem (o modal só leva uns segundos
  // reais), e ações como ir à veterinária pareceriam instantâneas.
  const applyRouteTimeSkip = () => {
    const minutes = this._calcRouteTimeCost(pathIds);
    if (minutes <= 0) return;
    const weather = getSystem('weather');
    if (weather && typeof weather.skipMinutes === 'function') {
      weather.skipMinutes(minutes);
    }
  };

  // Locais navegáveis pelo mundo do jogo: consome combustível e delega
  // a transição real ao callback.
  if (target.traversable && this.onTravel) {
    if (!consumeRouteFuel()) return;
    applyRouteTimeSkip();

    this._updateCurrentHighlight(targetLocId);

    const cb = this.onTravel;
    this.close();
    Promise.resolve()
      .then(() => cb(targetLocId))
      .catch((err) => logger.error?.('[TravelMap] onTravel falhou', err));
    return;
  }

  // Locais com painel próprio, como a veterinária: também consomem combustível,
  // mesmo sem trocar para um mapa caminhável.
 if (target.panelId) {
  const panelSys = getSystem(target.panelId);
  if (panelSys?.open) {
    if (!consumeRouteFuel()) return;
    applyRouteTimeSkip();

    // Guarda o callback antes do close(), porque close() limpa this.onTravel.
    const savedOnTravel = this.onTravel;

    // Ex: target.panelId = 'vet' → evento esperado: 'vetPanelClosed'
    const panelClosedEvent = `${target.panelId}PanelClosed`;

    const reopenTravelMapFromPanel = () => {
      // Reabre IMEDIATAMENTE em modo instant (sem fade-in), por cima do
      // overlay do painel ainda fazendo fade-out. Antes era `setTimeout
      // 340ms` esperando o fade do painel terminar — durante esses ms
      // o mapa do mundo (cidade/fazenda) aparecia entre os dois
      // overlays. Como ambos usam z-index 10500 e o travel map é
      // adicionado depois (DOM-order), ele cobre o painel sumindo e
      // o mundo nunca é visto.
      this.open({
        currentLocationId: targetLocId,
        onTravel: savedOnTravel,
        instant: true,
      });
    };

    document.addEventListener(panelClosedEvent, reopenTravelMapFromPanel, { once: true });

    this._updateCurrentHighlight(targetLocId);
    this.close();
    panelSys.open();
    return;
  }
}

  // Locais ainda em desenvolvimento: feedback "em breve". NÃO atualiza
  // o current location — viagem não aconteceu; só devolve o marker.
  const current = LOCATIONS[this.currentLocationId];
  if (this.playerMarker && current) {
    this.playerMarker.style.left = `${current.x}%`;
    this.playerMarker.style.top = `${current.y}%`;
  }
  this._showInfoPopup(target.icon || '🚧',
    t('quests.travelMap.popup.inDev').replace('{name}', targetName));
});
  }

  // ─── Popup genérico ──────────────────────────────────────────────────────

  _showPopup({ icon = '📍', message = '', buttons = null, dismissible = true } = {}) {
    if (!this.popupOverlay) return;
    const iconEl = this.popupOverlay.querySelector('[data-role="icon"]');
    const msgEl  = this.popupOverlay.querySelector('[data-role="msg"]');
    const btnsEl = this.popupOverlay.querySelector('[data-role="buttons"]');
    if (iconEl) iconEl.textContent = icon || '📍';
    if (msgEl)  msgEl.textContent = message || '';

    btnsEl.replaceChildren();
    const list = buttons && buttons.length
      ? buttons
      : [{ label: t('quests.travelMap.popup.ok'), variant: 'primary',
           onClick: () => this._hidePopup() }];

    for (const btn of list) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'tmap-popup-btn' + (btn.variant === 'secondary' ? ' tmap-popup-btn-secondary' : '');
      el.textContent = btn.label;
      el.addEventListener('click', () => {
        if (typeof btn.onClick === 'function') btn.onClick();
      });
      btnsEl.appendChild(el);
    }

    this.popupOverlay.dataset.dismissible = dismissible ? 'true' : 'false';
    this.popupOverlay.classList.add('tmap-popup-active');
  }

  _showInfoPopup(icon, message) {
    this._showPopup({ icon, message });
  }

  _hidePopup() {
    if (this.popupOverlay) this.popupOverlay.classList.remove('tmap-popup-active');
  }

  // ─── Combustível: prompt e modal de refuel ───────────────────────────────

  _showGasPrompt(gasIdx, onResume) {
    const fuel = getSystem('fuel');
    if (!fuel) { onResume?.(); return; }
    const current = fuel.getFuel();

    if (current >= 99.99) {
      // Tanque cheio — aviso curto e segue.
      this._showPopup({
        icon: '⛽',
        message: t('quests.travelMap.refuel.tankFull').replace('{percent}', fmtPercent(current)),
        dismissible: false,
        buttons: [{
          label: t('quests.travelMap.popup.ok'),
          onClick: () => { this._hidePopup(); onResume?.(); },
        }],
      });
      return;
    }

    this._showPopup({
      icon: '⛽',
      message: t('quests.travelMap.refuel.ask').replace('{percent}', fmtPercent(current)),
      dismissible: false,
      buttons: [
        {
          label: t('quests.travelMap.popup.no'),
          variant: 'secondary',
          onClick: () => { this._hidePopup(); onResume?.(); },
        },
        {
          label: t('quests.travelMap.popup.yes'),
          variant: 'primary',
          onClick: () => { this._hidePopup(); this._showRefuelModal(gasIdx, onResume); },
        },
      ],
    });
  }

  _showRefuelModal(gasIdx, onResume) {
    const fuel = getSystem('fuel');
    const currency = getSystem('currency');
    if (!fuel) { onResume?.(); return; }

    const currentPercent = fuel.getFuel();
    const tankLiters = fuel.getTankLiters();
    const pricePerLiter = fuel.getPricePerLiter();
    const balance = currency ? currency.getMoney() : 0;

    const maxByTank = fuel.getMaxRefillPercent();
    const costPerPercent = (tankLiters / 100) * pricePerLiter; // R$ por 1% do tanque
    const maxByMoney = costPerPercent > 0 ? (balance / costPerPercent) : 0;
    const maxRefill = Math.max(0, Math.min(maxByTank, maxByMoney));

    if (maxRefill < 0.01) {
      this._showPopup({
        icon: '💸',
        message: t('quests.travelMap.refuel.notEnoughMoney'),
        dismissible: false,
        buttons: [{
          label: t('quests.travelMap.popup.ok'),
          onClick: () => { this._hidePopup(); onResume?.(); },
        }],
      });
      return;
    }

    // Constrói o modal do slider.
    if (this.refuelModal) {
      this.refuelModal.remove();
      this.refuelModal = null;
    }

    const modal = document.createElement('div');
    modal.className = 'tmap-refuel-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const dialog = document.createElement('div');
    dialog.className = 'tmap-refuel-dialog';

    const title = document.createElement('h2');
    title.className = 'tmap-refuel-title';
    title.textContent = t('quests.travelMap.refuel.title');

    // Linha de stats (tanque atual / após / saldo)
    const stats = document.createElement('div');
    stats.className = 'tmap-refuel-stats';
    const buildStat = (label, value, role) => {
      const wrap = document.createElement('div');
      wrap.className = 'tmap-stat';
      const l = document.createElement('span');
      l.className = 'tmap-stat-label';
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'tmap-stat-value';
      if (role) v.dataset.role = role;
      v.textContent = value;
      wrap.append(l, v);
      return wrap;
    };
    stats.append(
      buildStat(t('quests.travelMap.refuel.currentTank'), fmtPercent(currentPercent)),
      buildStat(t('quests.travelMap.refuel.afterRefuel'), fmtPercent(currentPercent), 'after'),
      buildStat(t('quests.travelMap.refuel.balance'), fmtMoney(balance), 'balance'),
    );

    // Slider
    const sliderTitle = document.createElement('p');
    sliderTitle.className = 'tmap-refuel-instr';
    sliderTitle.textContent = t('quests.travelMap.refuel.sliderInstruction');

    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'tmap-refuel-slider-wrap';

    const slider = document.createElement('div');
    slider.className = 'tmap-refuel-slider';

    const track = document.createElement('div');
    track.className = 'tmap-refuel-track';
    const fill = document.createElement('div');
    fill.className = 'tmap-refuel-fill';
    track.appendChild(fill);

    const handle = document.createElement('div');
    handle.className = 'tmap-refuel-handle';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', String(maxRefill.toFixed(2)));
    handle.setAttribute('aria-valuenow', '0');

    slider.append(track, handle);
    sliderWrap.appendChild(slider);

    // Resumo dinâmico (+X% · X,XX L · R$ Y)
    const summary = document.createElement('div');
    summary.className = 'tmap-refuel-summary';
    const amountSpan = document.createElement('span');
    amountSpan.className = 'tmap-refuel-amount';
    amountSpan.dataset.role = 'amount';
    const litersSpan = document.createElement('span');
    litersSpan.className = 'tmap-refuel-liters';
    litersSpan.dataset.role = 'liters';
    const costSpan = document.createElement('span');
    costSpan.className = 'tmap-refuel-cost';
    costSpan.dataset.role = 'cost';
    summary.append(amountSpan, litersSpan, costSpan);

    const priceLine = document.createElement('p');
    priceLine.className = 'tmap-refuel-price';
    priceLine.textContent = t('quests.travelMap.refuel.pricePerLiter')
      .replace('{price}', fmtMoney(pricePerLiter));

    // Botões
    const btnRow = document.createElement('div');
    btnRow.className = 'tmap-refuel-buttons';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'tmap-refuel-btn tmap-refuel-cancel';
    cancelBtn.textContent = t('quests.travelMap.refuel.cancel');
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'tmap-refuel-btn tmap-refuel-confirm';
    confirmBtn.textContent = t('quests.travelMap.refuel.confirm');
    btnRow.append(cancelBtn, confirmBtn);

    dialog.append(title, stats, sliderTitle, sliderWrap, summary, priceLine, btnRow);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    this.refuelModal = modal;

    // ── Estado e atualização ─────────────────────────────────────────────
    let amount = 0;

    const afterEl = stats.querySelector('[data-role="after"]');
    const balanceEl = stats.querySelector('[data-role="balance"]');

    const updateUI = () => {
      const ratio = maxRefill > 0 ? Math.max(0, Math.min(1, amount / maxRefill)) : 0;
      fill.style.width = `${ratio * 100}%`;
      handle.style.left = `${ratio * 100}%`;
      const cost = amount * costPerPercent;
      amountSpan.textContent = `+${fmtPercent(amount)}`;
      litersSpan.textContent = `· ${fmtLiters(amount)}`;
      costSpan.textContent = `· ${fmtMoney(cost)}`;
      if (afterEl) afterEl.textContent = fmtPercent(currentPercent + amount);
      if (balanceEl) balanceEl.textContent = fmtMoney(Math.max(0, balance - cost));
      handle.setAttribute('aria-valuenow', amount.toFixed(2));
      confirmBtn.disabled = amount < 0.01;
      confirmBtn.classList.toggle('tmap-refuel-btn-disabled', amount < 0.01);
    };

    const setAmountFromClientX = (clientX) => {
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      amount = Math.round(maxRefill * ratio * 100) / 100;
      updateUI();
    };

    // Drag (pointer events)
    let dragging = false;
    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      handle.setPointerCapture?.(e.pointerId);
      setAmountFromClientX(e.clientX);
      e.preventDefault();
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      setAmountFromClientX(e.clientX);
    };
    const onPointerUp = (e) => {
      if (!dragging) return;
      dragging = false;
      handle.releasePointerCapture?.(e.pointerId);
    };
    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);

    // Click no track também ajusta o valor.
    track.addEventListener('pointerdown', (e) => {
      if (e.target === handle) return;
      setAmountFromClientX(e.clientX);
    });

    // Teclado: setas e PageUp/Down
    handle.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 1 : 0.1;
      let delta = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = step;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -step;
      else if (e.key === 'Home') { amount = 0; updateUI(); e.preventDefault(); return; }
      else if (e.key === 'End')  { amount = maxRefill; updateUI(); e.preventDefault(); return; }
      else return;
      amount = Math.max(0, Math.min(maxRefill, Math.round((amount + delta) * 100) / 100));
      updateUI();
      e.preventDefault();
    });

    // Botões
    const closeModal = () => {
      modal.classList.remove('tmap-refuel-active');
      setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
        if (this.refuelModal === modal) this.refuelModal = null;
      }, 240);
    };

    cancelBtn.addEventListener('click', () => {
      closeModal();
      onResume?.();
    });

    confirmBtn.addEventListener('click', () => {
      if (amount < 0.01) return;
      const cost = Math.round(amount * costPerPercent * 100) / 100;
      const ok = currency ? currency.spend(cost, 'fuel_refill') : false;
      if (!ok) {
        // Saldo mudou entre abrir o modal e confirmar — recusa silenciosa.
        this._showInfoPopup('💸', t('quests.travelMap.refuel.notEnoughMoney'));
        closeModal();
        onResume?.();
        return;
      }
      fuel.addPercent(amount);
      this._refreshFuelPill();
      this._showInfoPopup('⛽', t('quests.travelMap.refuel.success')
        .replace('{amount}', fmtPercent(amount))
        .replace('{percent}', fmtPercent(fuel.getFuel())));
      closeModal();
      onResume?.();
    });

    // Inicialização
    updateUI();
    requestAnimationFrame(() => modal.classList.add('tmap-refuel-active'));
    handle.focus({ preventScroll: true });
  }
}

const travelMap = new TravelMap();
registerSystem('travelMap', travelMap);

export default travelMap;
export { travelMap };
