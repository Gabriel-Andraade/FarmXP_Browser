/**
 * @file enclosureSystem.js - Detecção de cercados fechados a partir de cercas
 *
 * Discretiza o mundo numa grade fina, marca células cobertas por hitboxes
 * de cerca como "parede" e executa flood-fill a partir do exterior de cada
 * cerca. Regiões que NÃO escapam até a borda da bounding-box das cercas
 * são cercados fechados — recebem id, centro e células interiores.
 *
 * Funciona com qualquer formato (irregular, com curvas em ângulo reto,
 * múltiplos cercados separados) e não exige que as cercas se encaixem por
 * endpoints — basta que formem uma parede contínua na granularidade do grid.
 *
 * API pública:
 *   enclosureSystem.detect()                  → recalcula e retorna array
 *   enclosureSystem.getEnclosures()           → último resultado (sem recompute)
 *   enclosureSystem.getEnclosureAtPoint(x,y)  → cercado que contém (x,y) ou null
 *
 * Topic 2 vai chamar `detect()` quando uma cerca for colocada/destruída.
 * Topic 6 vai estender os objetos `enclosure` com `species: { ... }`.
 */

import { registerSystem, getSystem, getDebugFlag } from '../gameState.js';
import { logger } from '../logger.js';
import { assets } from '../assetManager.js';

// Granularidade do grid. 8px é fino o bastante pra que fenceY (6px de
// largura) sempre marque ao menos uma célula como parede, e grosso o
// bastante pra um cercado de 500×500 px caber em ~62×62 = ~3900 células
// (flood-fill instantâneo). Trocar mexe direto na precisão da detecção.
const CELL = 8;

// Tipos de hitbox tratados como "parede" pro flood-fill. FENCE é um
// fallback genérico — em jogo real só vemos FENCEX/FENCEY hoje, mas
// addWorldObject aceita "FENCE" também (theWorld.js:1334).
const FENCE_HITBOX_TYPES = new Set(['FENCEX', 'FENCEY', 'FENCE']);

// Margem de busca além da bounding-box das cercas. Flood-fill que toca a
// margem é considerado "escapado" (não cercado). 2 células é suficiente
// pra detectar que o exterior está aberto sem explorar o mundo inteiro.
const SEARCH_MARGIN_CELLS = 2;

// Lado do quadrado do endpoint hitbox (px). 8 deixa o indicador mais
// discreto visualmente. A tolerância de conexão é o próprio tamanho —
// qualquer sobreposição entre dois quadrados (mesmo só 1px) já marca
// ambos como conectados (azul).
const ENDPOINT_HITBOX_SIZE = 8;

// Inset vertical dos endpoints de cima da fenceX. Hoje = 0 (endpoints
// exatamente na borda y=hb.y do bbox). Reservei a constante caso seja
// preciso ajustar depois (positivo empurra os top endpoints pra baixo,
// negativo pra cima — útil se o sprite tiver padding e os endpoints
// parecerem fora do lugar visualmente).
const FENCEX_TOP_INSET = 0;

// "+" no centro do cercado — sinal de "clique pra adicionar animal".
// Cor marrom-dourada combina com a paleta agrícola e contrasta com o
// chão verde. Tamanho visual e raio de hit (em coords de mundo).
const ENCLOSURE_MARKER_SIZE   = 22;
const ENCLOSURE_MARKER_RADIUS = 18;   // hit area do click — um pouco menor que o visual
const ENCLOSURE_MARKER_COLOR  = '#b8860b';

// Limite de espécies diferentes por cercado. Quantidade dentro de cada
// espécie continua ilimitada — espelhando a decisão de design anterior.
const MAX_SPECIES_PER_ENCLOSURE = 3;

class EnclosureSystem {
  constructor() {
    this._enclosures = [];
    this._wallCells = new Set();          // Set<string "cx,cy">
    this._endpoints = [];                 // Array<{ x, y, fenceId, connected }>
    this._speciesById = new Map();        // enclosureId → { Cow:2, Bull:1, ... }
    this._abortController = null;
    this._pendingDetect = false;
    this._init();
  }

  /**
   * Ouve eventos de criação/destruição de objetos do mundo e re-detecta.
   * Coalesce múltiplas mudanças do mesmo frame (ex.: load de save com 50
   * cercas) num único detect via microtask.
   *
   * Não filtra por tipo: rebuild de wall cells é barato e detect só
   * explora a vizinhança das paredes existentes — destruir uma árvore
   * roda detect mas não acha cercado novo, custo desprezível.
   */
  _init() {
    if (typeof document === 'undefined') return;
    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const schedule = () => this._scheduleDetect();
    document.addEventListener('worldObjectAdded', schedule, { signal });
    document.addEventListener('objectDestroyed',  schedule, { signal });

    // Detect inicial deferido: rodando agora `collisionSystem` pode ainda
    // não ter as hitboxes do save restauradas. Microtask garante que
    // sistemas que adicionam cercas no mesmo tick já terminaram.
    this._scheduleDetect();
  }

  destroy() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  _scheduleDetect() {
    if (this._pendingDetect) return;
    this._pendingDetect = true;
    queueMicrotask(() => {
      this._pendingDetect = false;
      this.detect();
      // Notifica consumidores (topic 3 vai desenhar o "+", topic 5 vai
      // refrescar painel se aberto) — sem isso, eles precisariam pollar.
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('enclosuresChanged', {
          detail: { count: this._enclosures.length },
        }));
      }
    });
  }

  /**
   * Recalcula tudo. Caro o suficiente pra não rodar por frame — chamadores
   * (topic 2) devem invocar só ao colocar/destruir cerca.
   * @returns {Array<Enclosure>}
   */
  detect() {
    try {
      this._buildWallCells();
      this._enclosures = this._findEnclosures();
      this._buildEndpoints();
    } catch (e) {
      logger.warn?.('[enclosureSystem] detect() falhou', e);
      this._enclosures = [];
      this._endpoints = [];
    }
    return this._enclosures;
  }

  /** Lista de endpoints (pontos de conexão das cercas) com estado atual. */
  getEndpoints() {
    return this._endpoints;
  }

  /**
   * Renderiza os endpoints como hitboxes coloridas — vermelho quando
   * solto, azul quando conectado a outro endpoint. Só desenha se o
   * debug flag de hitboxes estiver ativo (`window.DEBUG_HITBOXES = true`).
   *
   * Chamado pelo gameLoop em `main.js` junto com `collisionSystem.drawHitboxes`.
   */
  drawEndpoints(ctx, camera) {
    // Gate de visibilidade fica no caller (main.js). Atualmente desenha
    // apenas com BuildSystem.active — feedback visual pro player saber
    // se as cercas que ele colocou estão conectando/formando cercado.
    if (!camera || this._endpoints.length === 0) return;

    const zoom = camera.zoom || 1;
    const size = ENDPOINT_HITBOX_SIZE * zoom;
    const half = ENDPOINT_HITBOX_SIZE / 2;

    ctx.save();
    ctx.lineWidth = 2;
    for (const ep of this._endpoints) {
      const screenPos = camera.worldToScreen(ep.x - half, ep.y - half);
      // 3 estados, em ordem de prioridade:
      //   verde   → cerca está totalmente conectada (A + B com ≥1 conexão cada)
      //   azul    → este endpoint sobrepõe outro, mas a cerca ainda não está total
      //   vermelho → endpoint solto (sem sobreposição)
      let fillColor, strokeColor;
      if (ep.fenceLinked) {
        fillColor   = 'rgba(40, 200, 80, 0.5)';
        strokeColor = '#28c850';
      } else if (ep.connected) {
        fillColor   = 'rgba(0, 120, 255, 0.5)';
        strokeColor = '#0078ff';
      } else {
        fillColor   = 'rgba(255, 30, 30, 0.5)';
        strokeColor = '#ff1e1e';
      }
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.fillRect(screenPos.x, screenPos.y, size, size);
      ctx.strokeRect(screenPos.x, screenPos.y, size, size);
    }
    ctx.restore();
  }

  /**
   * Renderiza um "+" marrom-dourado no centro de cada cercado detectado.
   * Visual sinaliza "clique pra adicionar animal". Caller (main.js) só
   * chama no modo construção — fora dele os "+"s ficam ocultos.
   */
  drawCenterMarkers(ctx, camera) {
    if (!camera || this._enclosures.length === 0) return;

    const zoom = camera.zoom || 1;
    const size = ENCLOSURE_MARKER_SIZE * zoom;
    const half = size / 2;
    const stroke = Math.max(2, Math.round(3 * zoom));

    ctx.save();
    ctx.lineCap = 'round';

    for (const enc of this._enclosures) {
      const screenPos = camera.worldToScreen(enc.centerX, enc.centerY);
      const cx = Math.round(screenPos.x);
      const cy = Math.round(screenPos.y);

      // Halo claro pra destacar do chão (verde da grama).
      ctx.fillStyle = 'rgba(255, 230, 180, 0.55)';
      ctx.beginPath();
      ctx.arc(cx, cy, half + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = ENCLOSURE_MARKER_COLOR;
      ctx.lineWidth = stroke;
      // Linha horizontal do "+"
      ctx.beginPath();
      ctx.moveTo(cx - half, cy);
      ctx.lineTo(cx + half, cy);
      ctx.stroke();
      // Linha vertical
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx, cy + half);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Retorna o cercado cujo "+" central foi clicado, ou null. Usa
   * distância radial (não AABB) — combina com a forma circular do halo.
   */
  getEnclosureMarkerAt(wx, wy) {
    const r2 = ENCLOSURE_MARKER_RADIUS * ENCLOSURE_MARKER_RADIUS;
    for (const enc of this._enclosures) {
      const dx = wx - enc.centerX;
      const dy = wy - enc.centerY;
      if (dx * dx + dy * dy <= r2) return enc;
    }
    return null;
  }

  /** Espécies atualmente registradas pra esse cercado (cópia rasa). */
  getEnclosureSpecies(enclosureId) {
    return { ...(this._speciesById.get(enclosureId) || {}) };
  }

  /**
   * Serializa o mapa de espécies por cercado pra o save. Os cercados em
   * si NÃO são persistidos (são recalculados a partir das cercas do save),
   * mas o contador de espécies precisa sobreviver — senão reload zera
   * "5 vacas" e o limite de 3 espécies vira incoerente.
   *
   * Formato: `{ "<encId>": { Cow: 2, Bull: 1, ... }, ... }`
   */
  serializeState() {
    const out = {};
    for (const [id, species] of this._speciesById) {
      out[id] = { ...species };
    }
    return out;
  }

  /**
   * Restaura o mapa de espécies a partir do save. Força um `detect()`
   * em seguida pra que os enclosures recém-computados peguem o species
   * persistido via `_makeEnclosure`.
   */
  restoreState(data) {
    this._speciesById.clear();
    if (!data || typeof data !== 'object') return;
    for (const id of Object.keys(data)) {
      const species = data[id];
      if (species && typeof species === 'object') {
        this._speciesById.set(id, { ...species });
      }
    }
    // Re-detect síncrono pra refletir nos enclosures já calculados.
    this.detect();
  }

  /** Quantas espécies DIFERENTES estão registradas no cercado. */
  getSpeciesCount(enclosureId) {
    const species = this._speciesById.get(enclosureId);
    return species ? Object.keys(species).length : 0;
  }

  /**
   * Acha posição segura de spawn pra um animal dentro do cercado.
   * Estratégia: sorteia células interiores na ordem de proximidade ao
   * centroid e valida cada uma com `collision.areaCollides` (ignorando
   * outras hitboxes de animais — eles têm colisão soft entre si). Primeira
   * que não bate em parede vence.
   *
   * Posição retornada = sprite top-left (formato esperado por addAnimal).
   * O cálculo posiciona a HITBOX (não o sprite) no centro da célula —
   * assim o "corpo" do animal fica dentro mesmo se o sprite extrapolar.
   *
   * Fallback (nada bate): centroid. Aceita o overlap pra cercados muito
   * apertados pra esse animal específico — preserva flexibilidade total.
   */
  _findSafeSpawnPosition(enc, assetName, assetData) {
    const spriteW = (assetData.frameWidth  || 32) * (assetData.renderScale || 1);
    const spriteH = (assetData.frameHeight || 32) * (assetData.renderScale || 1);

    // Config da hitbox: mesmos defaults que `AnimalEntity.getInitialCollisionConfig`.
    const collision = getSystem('collision');
    const cfg = collision?.getConfigForObject?.({ type: 'ANIMAL', original: { assetName } });
    const wRatio    = cfg?.widthRatio   ?? 0.5;
    const hRatio    = cfg?.heightRatio  ?? 0.4;
    const offXRatio = cfg?.offsetXRatio ?? 0.25;
    const offYRatio = cfg?.offsetYRatio ?? 0.6;

    const hbW = spriteW * wRatio;
    const hbH = spriteH * hRatio;
    // Centro da hitbox em coords relativas ao sprite top-left:
    const hbCxFromSpriteX = spriteW * offXRatio + hbW / 2;
    const hbCyFromSpriteY = spriteH * offYRatio + hbH / 2;

    // Função utilitária: dado o centro desejado da hitbox no mundo,
    // calcula o sprite top-left e valida colisão.
    const tryAt = (hbCenterX, hbCenterY) => {
      const spriteX = hbCenterX - hbCxFromSpriteX;
      const spriteY = hbCenterY - hbCyFromSpriteY;
      const hbX = spriteX + spriteW * offXRatio;
      const hbY = spriteY + spriteH * offYRatio;
      if (!collision) return { x: spriteX, y: spriteY };
      const blocked = collision.areaCollides(
        hbX, hbY, hbW, hbH,
        null,
        { ignoreTypes: ['ANIMAL'] }  // outros animais não bloqueiam (soft collide)
      );
      return blocked ? null : { x: spriteX, y: spriteY };
    };

    // Ordena células do cercado por distância ao centroid (centroid primeiro).
    const ccx = enc.centerX / CELL;
    const ccy = enc.centerY / CELL;
    const sortedCells = [];
    for (const key of enc._cellKeys) {
      const ci = key.indexOf(',');
      const cx = parseInt(key.slice(0, ci), 10);
      const cy = parseInt(key.slice(ci + 1), 10);
      const dx = cx - ccx;
      const dy = cy - ccy;
      sortedCells.push({ cx, cy, distSq: dx * dx + dy * dy });
    }
    sortedCells.sort((a, b) => a.distSq - b.distSq);

    // Tenta centroid puro primeiro (não necessariamente no grid alinhado).
    const exact = tryAt(enc.centerX, enc.centerY);
    if (exact) return exact;

    // Tenta cada célula em ordem de proximidade ao centroid.
    for (const { cx, cy } of sortedCells) {
      const hbCenterX = cx * CELL + CELL / 2;
      const hbCenterY = cy * CELL + CELL / 2;
      const ok = tryAt(hbCenterX, hbCenterY);
      if (ok) return ok;
    }

    // Fallback final: centroid puro. Hitbox pode overlap parede, mas é o
    // ponto mais "central possível" — pra cercados muito pequenos pra
    // esse animal específico, o player vê o problema e ajusta o tamanho
    // (sem nós impor mínimo arbitrário).
    return {
      x: enc.centerX - hbCxFromSpriteX,
      y: enc.centerY - hbCyFromSpriteY,
    };
  }

  /**
   * Tenta adicionar um animal ao cercado.
   * Validações: cercado existe, limite de espécies (3 distintas),
   * saldo (currency.spend). Spawna em uma célula aleatória DENTRO do
   * cercado pra garantir que o animal nasce fechado.
   *
   * @param {string} enclosureId
   * @param {Object} animalItem - entrada do items.js com `assetName` e `price`
   * @returns {{ ok: true, animal, price } | { ok: false, reason: string, price? }}
   */
  addAnimalToEnclosure(enclosureId, animalItem) {
    const enc = this._enclosures.find(e => e.id === enclosureId);
    if (!enc) return { ok: false, reason: 'no_enclosure' };
    if (!animalItem?.assetName) return { ok: false, reason: 'no_asset_name' };

    const species = this._speciesById.get(enclosureId) || {};
    const isNewSpecies = !species[animalItem.assetName];
    const speciesCount = Object.keys(species).length;
    if (isNewSpecies && speciesCount >= MAX_SPECIES_PER_ENCLOSURE) {
      return { ok: false, reason: 'species_limit' };
    }

    const price = Number(animalItem.price) || 0;
    const currency = getSystem('currency');
    if (price > 0) {
      if (!currency || typeof currency.spend !== 'function') {
        return { ok: false, reason: 'no_currency_system', price };
      }
      if (currency.getMoney() < price) return { ok: false, reason: 'no_money', price };
    }

    const assetData = assets?.animals?.[animalItem.assetName];
    if (!assetData) return { ok: false, reason: 'no_asset' };

    if (enc._cellKeys.size === 0) return { ok: false, reason: 'no_cells' };

    // Calcula posição segura de spawn (hitbox totalmente dentro do
    // cercado, ignora outros animais que colidem soft). Centroid é a
    // primeira escolha; se ocupado, tenta células progressivamente mais
    // longe. Fallback é centroid mesmo se nada bater.
    const spawn = this._findSafeSpawnPosition(enc, animalItem.assetName, assetData);

    // Cobra ANTES de spawnar — se cobrança falhar, sem custo no jogador.
    if (price > 0) {
      const charged = currency.spend(price, 'enclosure:animal');
      if (!charged) return { ok: false, reason: 'no_money', price };
    }

    const world = (typeof window !== 'undefined') ? window.theWorld : null;
    if (!world || typeof world.addAnimal !== 'function') {
      // Rollback do gasto — sem mundo, sem spawn.
      if (price > 0) currency.earn?.(price, 'enclosure:animal_refund');
      return { ok: false, reason: 'no_world' };
    }
    const animal = world.addAnimal(animalItem.assetName, assetData, spawn.x, spawn.y);
    // Valida antes de cometer o estado: se addAnimal falhou (asset
    // não pronto, erro de hitbox, etc.), faz rollback da cobrança e
    // NÃO incrementa o contador de espécies — senão player paga sem
    // animal E o limite de 3 espécies fica corrompido pra sempre.
    if (!animal) {
      if (price > 0) currency.earn?.(price, 'enclosure:animal_refund');
      return { ok: false, reason: 'respawn_failed', price };
    }

    // Atualiza species persistido + objeto enclosure ativo.
    species[animalItem.assetName] = (species[animalItem.assetName] || 0) + 1;
    this._speciesById.set(enclosureId, species);
    enc.species = { ...species };

    document.dispatchEvent(new CustomEvent('enclosureAnimalAdded', {
      detail: { enclosureId, assetName: animalItem.assetName, animal, price },
    }));

    return { ok: true, animal, price };
  }

  /**
   * Renderiza endpoints da cerca-fantasma do preview (modo build).
   * Calcula os 2 endpoints na posição/dim atual do preview, checa se
   * sobrepõem algum endpoint existente, e desenha vermelho/azul.
   *
   * Player vê em tempo real "se eu colocar aqui, vai conectar?". Mesma
   * gate de DEBUG_HITBOXES dos endpoints reais.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} camera
   * @param {Object} rect - { x, y, width, height } em coords de mundo
   * @param {string} variant - 'fenceX' | 'fenceY' (ou outro string)
   */
  drawPreviewEndpoints(ctx, camera, rect, variant) {
    // Sem gate de DEBUG: como só é chamado de dentro de `BuildSystem.drawPreview`
    // (que só roda no build mode), os endpoints da cerca-fantasma já são
    // exclusivos do modo construção.
    if (!camera || !rect) return;

    // Orientação do preview: usa variant (fenceX/fenceY) ou cai em w vs h.
    // Mesma regra do `_buildEndpoints` — fenceX tem 4 endpoints (cantos)
    // com lados A=esquerda B=direita, fenceY tem 2 (topo A, baixo B).
    const isHorizontal = variant === 'fenceX'
      || (variant !== 'fenceY' && rect.width >= rect.height);

    const previewEps = [];
    if (isHorizontal) {
      const rightX  = rect.x + rect.width;
      const topY    = rect.y + FENCEX_TOP_INSET;
      const bottomY = rect.y + rect.height;
      previewEps.push({ x: rect.x, y: topY,    side: 'A' });
      previewEps.push({ x: rightX, y: topY,    side: 'B' });
      previewEps.push({ x: rect.x, y: bottomY, side: 'A' });
      previewEps.push({ x: rightX, y: bottomY, side: 'B' });
    } else {
      const midX = rect.x + rect.width / 2;
      previewEps.push({ x: midX, y: rect.y,               side: 'A' });
      previewEps.push({ x: midX, y: rect.y + rect.height, side: 'B' });
    }

    // Checa cada endpoint do preview contra reais. Acumula hasA / hasB
    // pra decidir se a cerca-fantasma SERIA "totalmente conectada" se
    // o player colocasse ela aí.
    const T = ENDPOINT_HITBOX_SIZE;
    let hasA = false, hasB = false;
    for (const pe of previewEps) {
      pe.connected = false;
      for (const re of this._endpoints) {
        if (Math.abs(pe.x - re.x) < T && Math.abs(pe.y - re.y) < T) {
          pe.connected = true;
          if (pe.side === 'A') hasA = true;
          else hasB = true;
          break;
        }
      }
    }
    const fenceLinked = hasA && hasB;
    for (const pe of previewEps) pe.fenceLinked = fenceLinked;

    const zoom = camera.zoom || 1;
    const size = ENDPOINT_HITBOX_SIZE * zoom;
    const half = ENDPOINT_HITBOX_SIZE / 2;

    ctx.save();
    ctx.lineWidth = 2;
    // Preview usa alpha 0.35 (real é 0.5) — distingue rascunho de real.
    for (const ep of previewEps) {
      const screenPos = camera.worldToScreen(ep.x - half, ep.y - half);
      let fillColor, strokeColor;
      if (ep.fenceLinked) {
        fillColor   = 'rgba(40, 200, 80, 0.35)';
        strokeColor = '#28c850';
      } else if (ep.connected) {
        fillColor   = 'rgba(0, 120, 255, 0.35)';
        strokeColor = '#0078ff';
      } else {
        fillColor   = 'rgba(255, 30, 30, 0.35)';
        strokeColor = '#ff1e1e';
      }
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.fillRect(screenPos.x, screenPos.y, size, size);
      ctx.strokeRect(screenPos.x, screenPos.y, size, size);
    }
    ctx.restore();
  }

  /** Último resultado, sem recalcular. */
  getEnclosures() {
    return this._enclosures;
  }

  /**
   * Cercado que contém o ponto (x, y) em coordenadas de mundo, ou null.
   * Faz bounds-check rápido por cercado antes do lookup de célula.
   */
  getEnclosureAtPoint(x, y) {
    const key = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
    for (const enc of this._enclosures) {
      const b = enc.bounds;
      if (x < b.minX || x >= b.maxX) continue;
      if (y < b.minY || y >= b.maxY) continue;
      if (enc._cellKeys.has(key)) return enc;
    }
    return null;
  }

  // ─── Internals ─────────────────────────────────────────────────────────

  _buildWallCells() {
    this._wallCells.clear();
    // Mesma razão do `_buildEndpoints`: itera `placedBuildings` (sprite
    // visível) em vez de `collision.hitboxes`. Senão flood-fill usaria
    // só o trilho da fenceX (28×5) como parede, e o player poderia
    // "escapar" pela parte vazia acima do trilho.
    const buildings = (typeof window !== 'undefined' && window.theWorld)
      ? window.theWorld.placedBuildings
      : null;
    if (!Array.isArray(buildings)) return;

    for (const b of buildings) {
      if (!b) continue;
      const orig = (b.originalType || b.variant || '').toLowerCase();
      if (orig !== 'fencex' && orig !== 'fencey') continue;

      const minCX = Math.floor(b.x / CELL);
      const maxCX = Math.floor((b.x + b.width - 1) / CELL);
      const minCY = Math.floor(b.y / CELL);
      const maxCY = Math.floor((b.y + b.height - 1) / CELL);
      for (let cx = minCX; cx <= maxCX; cx++) {
        for (let cy = minCY; cy <= maxCY; cy++) {
          this._wallCells.add(`${cx},${cy}`);
        }
      }
    }
  }

  /**
   * Constrói lista de endpoints + estado de conexão por cerca.
   *
   * IMPORTANTE: itera `placedBuildings` (sprite visível) e NÃO
   * `collision.hitboxes`. O collisionSystem aplica `HITBOX_CONFIGS`
   * (constants.js:238-239) que define hitboxes físicas muito diferentes
   * do sprite (ex.: FENCEX vira um trilho 28×5 deslocado 24px pra baixo).
   * Se usasse hitboxes, os 4 endpoints da fenceX cairiam todos perto do
   * fundo do sprite — sintoma de "top endpoints descem".
   *
   * Endpoints, baseados nas dimensões da building (sprite):
   *   - fenceX (horizontal): 4 cantos. A = esquerda, B = direita
   *   - fenceY (vertical):   2 pontas. A = topo, B = baixo
   *
   * Marcações por endpoint:
   *   - `connected`: sobrepõe outro endpoint (de cerca diferente)
   *   - `fenceLinked`: cerca tem ≥1 A e ≥1 B conectados → todos os
   *     endpoints dela viram verde (visual de "locked in").
   */
  _buildEndpoints() {
    this._endpoints = [];
    const buildings = (typeof window !== 'undefined' && window.theWorld)
      ? window.theWorld.placedBuildings
      : null;
    if (!Array.isArray(buildings)) return;

    for (const b of buildings) {
      if (!b) continue;
      const orig = (b.originalType || b.variant || '').toLowerCase();
      const isFenceX = orig === 'fencex';
      const isFenceY = orig === 'fencey';
      if (!isFenceX && !isFenceY) continue;

      if (isFenceX) {
        const rightX  = b.x + b.width;
        const topY    = b.y + FENCEX_TOP_INSET;
        const bottomY = b.y + b.height;
        this._endpoints.push({ x: b.x,    y: topY,    fenceId: b.id, side: 'A', connected: false, fenceLinked: false });
        this._endpoints.push({ x: rightX, y: topY,    fenceId: b.id, side: 'B', connected: false, fenceLinked: false });
        this._endpoints.push({ x: b.x,    y: bottomY, fenceId: b.id, side: 'A', connected: false, fenceLinked: false });
        this._endpoints.push({ x: rightX, y: bottomY, fenceId: b.id, side: 'B', connected: false, fenceLinked: false });
      } else {
        const midX = b.x + b.width / 2;
        this._endpoints.push({ x: midX, y: b.y,            fenceId: b.id, side: 'A', connected: false, fenceLinked: false });
        this._endpoints.push({ x: midX, y: b.y + b.height, fenceId: b.id, side: 'B', connected: false, fenceLinked: false });
      }
    }

    // 1ª passada: detecta conexões individuais (sobreposição AABB entre
    // endpoints de cercas diferentes).
    const T = ENDPOINT_HITBOX_SIZE;
    for (let i = 0; i < this._endpoints.length; i++) {
      const a = this._endpoints[i];
      for (let j = i + 1; j < this._endpoints.length; j++) {
        const b = this._endpoints[j];
        if (a.fenceId === b.fenceId) continue;
        if (Math.abs(a.x - b.x) < T && Math.abs(a.y - b.y) < T) {
          a.connected = true;
          b.connected = true;
        }
      }
    }

    // 2ª passada: agrega por cerca → quem tem ≥1 A E ≥1 B conectados.
    const fenceStatus = new Map();
    for (const ep of this._endpoints) {
      let s = fenceStatus.get(ep.fenceId);
      if (!s) { s = { hasA: false, hasB: false }; fenceStatus.set(ep.fenceId, s); }
      if (ep.connected) {
        if (ep.side === 'A') s.hasA = true;
        else s.hasB = true;
      }
    }

    // 3ª passada: propaga "fully linked" pra todos os endpoints da cerca.
    for (const ep of this._endpoints) {
      const s = fenceStatus.get(ep.fenceId);
      ep.fenceLinked = !!(s && s.hasA && s.hasB);
    }
  }

  /**
   * Acha todos os cercados fechados.
   *
   * Algoritmo: pra cada célula adjacente a uma parede, tenta flood-fill.
   * Se o flood não toca a margem da bounding-box das paredes → é cercado.
   * Marca todas as células de cada flood (incluindo as "escapadas") como
   * visitadas globalmente, evitando re-processar a mesma região.
   */
  _findEnclosures() {
    const out = [];
    if (this._wallCells.size === 0) return out;

    // Bounding-box das paredes + margem.
    let minCX = Infinity, maxCX = -Infinity, minCY = Infinity, maxCY = -Infinity;
    for (const key of this._wallCells) {
      const ci = key.indexOf(',');
      const cx = parseInt(key.slice(0, ci), 10);
      const cy = parseInt(key.slice(ci + 1), 10);
      if (cx < minCX) minCX = cx;
      if (cx > maxCX) maxCX = cx;
      if (cy < minCY) minCY = cy;
      if (cy > maxCY) maxCY = cy;
    }
    minCX -= SEARCH_MARGIN_CELLS;
    maxCX += SEARCH_MARGIN_CELLS;
    minCY -= SEARCH_MARGIN_CELLS;
    maxCY += SEARCH_MARGIN_CELLS;

    const globalVisited = new Set();
    let encCounter = 0;

    for (const wallKey of this._wallCells) {
      const ci = wallKey.indexOf(',');
      const wcx = parseInt(wallKey.slice(0, ci), 10);
      const wcy = parseInt(wallKey.slice(ci + 1), 10);

      // Tenta os 4 vizinhos da parede como sementes de flood.
      const seeds = [
        [wcx - 1, wcy], [wcx + 1, wcy],
        [wcx, wcy - 1], [wcx, wcy + 1],
      ];
      for (const [sx, sy] of seeds) {
        const seedKey = `${sx},${sy}`;
        if (globalVisited.has(seedKey)) continue;
        if (this._wallCells.has(seedKey)) continue;

        const region = this._flood(sx, sy, globalVisited, minCX, maxCX, minCY, maxCY);
        if (!region || region.escaped) continue;

        // Fechado — vira cercado.
        const enc = this._makeEnclosure(region, ++encCounter);
        out.push(enc);
      }
    }

    return out;
  }

  /**
   * Flood-fill BFS a partir de (sx, sy). Não cruza paredes. Marca tudo
   * que visita em `globalVisited`. Se tocar a margem de busca → `escaped`.
   *
   * Retorna `{ escaped, cellKeys: Set<"cx,cy">, bMinX, bMaxX, bMinY, bMaxY, sumCX, sumCY, count }`
   */
  _flood(sx, sy, globalVisited, minCX, maxCX, minCY, maxCY) {
    const cellKeys = new Set();
    const stack = [sx, sy]; // achatado pra evitar alocação de [cx,cy] por step
    let escaped = false;
    let sumCX = 0, sumCY = 0;
    let bMinX = sx, bMaxX = sx, bMinY = sy, bMaxY = sy;

    while (stack.length > 0) {
      const cy = stack.pop();
      const cx = stack.pop();
      const key = `${cx},${cy}`;
      if (cellKeys.has(key)) continue;

      // Fora da janela de busca = exterior aberto.
      if (cx < minCX || cx > maxCX || cy < minCY || cy > maxCY) {
        escaped = true;
        continue;
      }
      if (this._wallCells.has(key)) continue;

      cellKeys.add(key);
      sumCX += cx;
      sumCY += cy;
      if (cx < bMinX) bMinX = cx;
      if (cx > bMaxX) bMaxX = cx;
      if (cy < bMinY) bMinY = cy;
      if (cy > bMaxY) bMaxY = cy;

      stack.push(cx - 1, cy);
      stack.push(cx + 1, cy);
      stack.push(cx, cy - 1);
      stack.push(cx, cy + 1);
    }

    // Marca tudo como globalmente visitado pra não re-floodar a mesma
    // região por outra parede adjacente.
    for (const k of cellKeys) globalVisited.add(k);

    if (cellKeys.size === 0) return null;
    return { escaped, cellKeys, bMinX, bMaxX, bMinY, bMaxY, sumCX, sumCY, count: cellKeys.size };
  }

  _makeEnclosure(region, idx) {
    const { cellKeys, bMinX, bMaxX, bMinY, bMaxY, sumCX, sumCY, count } = region;

    // Centro = centroid das células interiores (em coords de mundo).
    const centerX = (sumCX / count) * CELL + CELL / 2;
    const centerY = (sumCY / count) * CELL + CELL / 2;

    // Bounds em coords de mundo. maxX/maxY são exclusivos (borda + CELL),
    // pra getEnclosureAtPoint usar `<` e `>=` corretamente.
    const bounds = {
      minX: bMinX * CELL,
      minY: bMinY * CELL,
      maxX: (bMaxX + 1) * CELL,
      maxY: (bMaxY + 1) * CELL,
    };

    // ID estável por bounds: dois cercados com mesmo formato/posição mantêm
    // o mesmo id entre recálculos. Topic 6 vai usar isto pra rastrear
    // `species` por cercado mesmo com recomputes.
    const id = `enc_${bMinX}_${bMinY}_${bMaxX}_${bMaxY}`;

    return {
      id,
      centerX,
      centerY,
      bounds,
      cellCount: count,
      _cellKeys: cellKeys,  // interno, usado por getEnclosureAtPoint
      // Reidrata species persistido — cercado com mesmo bounds (id estável)
      // que reapareceu depois de quebrar+reerguer mantém os animais já
      // adicionados. Spread cria cópia rasa pra evitar mutar o map por
      // referência acidental.
      species: { ...(this._speciesById.get(id) || {}) },
    };
  }
}

export const enclosureSystem = new EnclosureSystem();
registerSystem('enclosure', enclosureSystem);

// Debug global: `enclosures()` lista cercados detectados no momento.
// Útil pra inspecionar do console enquanto testa.
if (typeof window !== 'undefined') {
  window.enclosures = () => {
    const list = enclosureSystem.detect();
    return list.map(e => ({
      id: e.id,
      center: { x: Math.round(e.centerX), y: Math.round(e.centerY) },
      bounds: e.bounds,
      cellCount: e.cellCount,
    }));
  };
}

export default enclosureSystem;
