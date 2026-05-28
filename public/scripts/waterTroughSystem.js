/**
 * @file waterTroughSystem.js - Sistema de Cocho de Água
 * @description Interação do jogador com cochos construídos. O cocho em si
 * vive em `placedBuildings` (theWorld.js), criado pelo buildSystem — este
 * módulo só lê/escreve nesse registro para depositar água.
 *
 * Fluxo de depósito: jogador aperta E perto do cocho com um balde com água
 * (item 42) no inventário → cocho enche, balde vira balde vazio (item 16).
 *
 * @module WaterTroughSystem
 */

import { inventorySystem } from "./thePlayer/inventorySystem.js";
import { placedBuildings, animals } from "./theWorld.js";
import { registerSystem, getSystem, getDebugFlag } from "./gameState.js";
import { handleWarn } from "./errorHandler.js";
import { logger } from "./logger.js";
import { t } from "./i18n/i18n.js";

const WATER_TROUGH_CONFIG = {
  ITEM_ID_IN_HAND: 103,
  BUCKET_WATER_ID: 42,        // Balde cheio de água (resource)
  BUCKET_EMPTY_ID: 16,        // Balde vazio (tool)
  MAX_WATER_LEVEL: 100,
  WATER_PER_BUCKET: 100,      // 1 balde enche o cocho por completo
};

// Marker "+" desenhado em cima do cocho quando o mouse passa por ele.
// Mesmo tamanho/cor do marker do cercado pra consistência visual.
const MARKER_SIZE = 22;
const MARKER_RADIUS = 18;   // raio de hit-test (em coords de mundo)
const MARKER_COLOR = '#b8860b';

/**
 * Slots de "posição pra beber" — 3 hitboxes por cocho, uma por
 * compartimento. Animal precisa estar dentro de uma pra beber.
 *
 * Cada slot é { offsetX, offsetY, w, h } em RATIOS (0..1) relativos
 * à bbox do cocho. Vantagem: se mudar o tamanho do cocho, slots
 * escalam junto.
 *
 * LIVE-EDIT (3 caminhos):
 *   1. Mexe aqui + F5 (sempre funciona).
 *   2. No devtools: `__debug.waterTroughDrinkSlots.waterTroughX[0].offsetY = 0.3`
 *      reflete no próximo frame. Não persiste, copia o valor depois.
 *   3. Liga overlay com `?drinkSlots=1` na URL pra ver as caixas em azul.
 *
 * Valores iniciais: 3 colunas/linhas com pequena margem nas pontas
 * (5% de cada lado) e ~50% da altura/largura — espaço pro animal
 * ficar dentro sem grudar na parede.
 */
const DRINK_SLOTS = {
  waterTroughX: [
    { offsetX: 0.05, offsetY: 0.35, w: 0.28, h: 0.50 },
    { offsetX: 0.36, offsetY: 0.25, w: 0.28, h: 0.50 },
    { offsetX: 0.67, offsetY: 0.25, w: 0.28, h: 0.50 },
  ],
  waterTroughY: [
    { offsetX: 0.25, offsetY: 0.05, w: 0.50, h: 0.28 },
    { offsetX: 0.25, offsetY: 0.36, w: 0.50, h: 0.28 },
    { offsetX: 0.25, offsetY: 0.67, w: 0.50, h: 0.28 },
  ],
};

// Estado de hover atualizado pelo mousemove em control.js.
let _hoveredId = null;

// Ocupação de slots: Map<troughId, Array<animalId|null>> com 3 entradas.
// Garante que no máximo 3 animais bebem por cocho, 1 por compartimento.
const _slotOccupancy = new Map();

function _occupancyFor(troughId) {
  let arr = _slotOccupancy.get(troughId);
  if (!arr) {
    arr = [null, null, null];
    _slotOccupancy.set(troughId, arr);
  }
  return arr;
}

function findTrough(id) {
  if (!id || !Array.isArray(placedBuildings)) return null;
  return placedBuildings.find(b => b && b.id === id && b.originalType === 'watertrough') || null;
}

function _troughAtWorldPoint(wx, wy) {
  const troughs = (Array.isArray(placedBuildings) ? placedBuildings : [])
    .filter(b => b && b.originalType === 'watertrough');
  for (const wt of troughs) {
    if (wx >= wt.x && wx <= wt.x + wt.width &&
        wy >= wt.y && wy <= wt.y + wt.height) {
      return wt;
    }
  }
  return null;
}

function _troughCenter(wt) {
  // O "+" fica um pouco abaixo do centro geométrico — o sprite do cocho
  // tem peso visual mais embaixo (a água/borda lateral), então o centro
  // exato fica visualmente "alto demais". 65% da altura faz o "+" cair
  // na zona da água.
  return {
    cx: wt.x + (wt.width || 0) / 2,
    cy: wt.y + (wt.height || 0) * 0.65,
  };
}

// Toast simples reaproveitando o estilo do xp-toast (já injeta o CSS dele
// quando há XPNotification). Fallback: log no console.
let _trToastEl = null;
let _trToastTimer = null;
function _showTroughToast(msg) {
  if (!msg) return;
  try {
    if (!_trToastEl) {
      _trToastEl = document.createElement('div');
      _trToastEl.className = 'xp-toast';
      _trToastEl.style.background = 'rgba(50, 36, 22, 0.94)';
      _trToastEl.style.border = '2px solid #b9d4ff';
      _trToastEl.style.color = '#e9f3ff';
      document.body.appendChild(_trToastEl);
    }
    _trToastEl.textContent = msg;
    _trToastEl.classList.add('visible');
    clearTimeout(_trToastTimer);
    _trToastTimer = setTimeout(() => {
      _trToastEl?.classList.remove('visible');
    }, 1500);
  } catch (_) {
    logger.info(`[cocho] ${msg}`);
  }
}

export const waterTroughSystem = {
  // Conveniência: lista todos os cochos do mundo.
  getWaterTroughs() {
    return (Array.isArray(placedBuildings) ? placedBuildings : [])
      .filter(b => b && b.originalType === 'watertrough');
  },

  // Adiciona água diretamente (usado pelo depósito ou por debug).
  addWater(waterTroughId, amount) {
    const wt = findTrough(waterTroughId);
    if (!wt) return false;

    const prev = wt.waterLevel || 0;
    wt.waterLevel = Math.min(prev + amount, WATER_TROUGH_CONFIG.MAX_WATER_LEVEL);

    if (wt.waterLevel > prev) {
      try {
        document.dispatchEvent(new CustomEvent('waterTroughFilled', {
          detail: { waterTrough: wt, previousLevel: prev, currentLevel: wt.waterLevel },
        }));
      } catch (err) {
        handleWarn('falha ao disparar waterTroughFilled', 'waterTroughSystem:addWater', { id: waterTroughId, err });
      }
    }
    return true;
  },

  // Animal/uso: drena água do cocho. Retorna `true` se conseguiu drenar
  // pelo menos 1 unidade.
  drink(waterTroughId, amount = 5) {
    const wt = findTrough(waterTroughId);
    if (!wt || (wt.waterLevel || 0) <= 0) return false;

    const prev = wt.waterLevel;
    wt.waterLevel = Math.max(prev - amount, 0);
    return wt.waterLevel < prev;
  },

  /**
   * Reação ao E do jogador. Se o cocho está cheio, só dá feedback; senão
   * tenta depositar usando o balde com água (id 42) do inventário.
   */
  openWaterTroughMenu(waterTroughId) {
    const wt = findTrough(waterTroughId);
    if (!wt) {
      logger.warn(`[waterTroughSystem] cocho não encontrado: ${waterTroughId}`);
      return;
    }

    if ((wt.waterLevel || 0) >= WATER_TROUGH_CONFIG.MAX_WATER_LEVEL) {
      _showTroughToast(t('waterTrough.alreadyFull') || 'Cocho cheio');
      return;
    }

    this.depositBucketWater(waterTroughId);
  },

  /**
   * Consome 1 balde com água (id 42) → enche o cocho + devolve balde
   * vazio (id 16). Se não tiver balde com água, mostra aviso.
   */
  depositBucketWater(waterTroughId) {
    const wt = findTrough(waterTroughId);
    if (!wt) return false;

    const bucketQty = inventorySystem.getItemQuantity(WATER_TROUGH_CONFIG.BUCKET_WATER_ID);
    if (bucketQty <= 0) {
      _showTroughToast(t('waterTrough.needBucket') || 'Precisa de um balde com água');
      return false;
    }

    const removed = inventorySystem.removeItem(WATER_TROUGH_CONFIG.BUCKET_WATER_ID, 1);
    if (!removed) {
      _showTroughToast(t('waterTrough.needBucket') || 'Precisa de um balde com água');
      return false;
    }

    this.addWater(waterTroughId, WATER_TROUGH_CONFIG.WATER_PER_BUCKET);
    inventorySystem.addItem(WATER_TROUGH_CONFIG.BUCKET_EMPTY_ID, 1);

    _showTroughToast(t('waterTrough.filled') || 'Cocho abastecido');

    try {
      document.dispatchEvent(new CustomEvent('waterDeposited', {
        detail: { waterTrough: wt, bucketUsed: true },
      }));
    } catch (err) {
      handleWarn('falha ao disparar waterDeposited', 'waterTroughSystem:depositBucketWater', { id: waterTroughId, err });
    }
    return true;
  },

  // Atualiza qual cocho está sob o mouse. Chamado pelo mousemove em
  // control.js. Recebe world-coords (já convertidas pela câmera).
  updateHover(wx, wy) {
    const wt = _troughAtWorldPoint(wx, wy);
    _hoveredId = wt ? wt.id : null;
  },

  clearHover() {
    _hoveredId = null;
  },

  // Retorna o cocho clicado, ou null. Hit-test é a AABB inteira do
  // cocho — não só um raio em volta do "+". Diferente do cercado, onde
  // o "+" fica no chão livre (precisa de raio), aqui o "+" tá sobre o
  // próprio cocho então faz sentido o sprite todo ser clicável.
  getMarkerAt(wx, wy) {
    return _troughAtWorldPoint(wx, wy);
  },

  // Desenha o "+" sobre o cocho atualmente em hover. Chamado pelo
  // gameLoop em main.js, depois das hitboxes.
  drawHoverMarker(ctx, camera) {
    if (!_hoveredId || !ctx || !camera) return;
    const wt = findTrough(_hoveredId);
    if (!wt) { _hoveredId = null; return; }

    const { cx: wxC, cy: wyC } = _troughCenter(wt);
    const screen = camera.worldToScreen(wxC, wyC);
    const zoom = camera.zoom || 1;
    const size = MARKER_SIZE * zoom;
    const half = size / 2;
    const stroke = Math.max(2, Math.round(3 * zoom));
    const cx = Math.round(screen.x);
    const cy = Math.round(screen.y);

    ctx.save();
    ctx.lineCap = 'round';

    ctx.fillStyle = 'rgba(255, 230, 180, 0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy, half + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = MARKER_COLOR;
    ctx.lineWidth = stroke;
    ctx.beginPath();
    ctx.moveTo(cx - half, cy);
    ctx.lineTo(cx + half, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx, cy + half);
    ctx.stroke();

    ctx.restore();
  },

  // Nível atual / máximo. Útil pra UI consultar sem mexer no `waterLevel` cru.
  getWaterLevel(waterTroughId) {
    const wt = findTrough(waterTroughId);
    if (!wt) return 0;
    return wt.waterLevel || 0;
  },
  getMaxWaterLevel() {
    return WATER_TROUGH_CONFIG.MAX_WATER_LEVEL;
  },

  /**
   * Acha o cocho mais próximo do ponto (wx, wy) em coords de mundo.
   *
   * @param {number} wx
   * @param {number} wy
   * @param {object} [opts]
   * @param {string} [opts.enclosureId]   Se setado, filtra cochos que pertencem
   *                                      a esse cercado (lookup via centro do cocho).
   * @param {boolean} [opts.requireWater] Se true, filtra cochos com waterLevel > 0.
   * @returns {{ trough: object, distance: number } | null}
   */
  findNearestTrough(wx, wy, opts = {}) {
    const troughs = this.getWaterTroughs();
    if (troughs.length === 0) return null;

    // Lookup do enclosureSystem feito tardio pra evitar ciclo de import e
    // pra funcionar mesmo se o sistema ainda não tiver inicializado.
    const encSys = opts.enclosureId ? getSystem('enclosure') : null;

    let best = null;
    let bestDist2 = Infinity;

    for (const wt of troughs) {
      if (opts.requireWater && (wt.waterLevel || 0) <= 0) continue;

      if (opts.enclosureId) {
        if (!encSys?.getEnclosureAtPoint) continue;
        const { cx, cy } = _troughCenter(wt);
        const enc = encSys.getEnclosureAtPoint(cx, cy);
        if (!enc || enc.id !== opts.enclosureId) continue;
      }

      const { cx, cy } = _troughCenter(wt);
      const dx = wx - cx;
      const dy = wy - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        best = wt;
      }
    }

    return best ? { trough: best, distance: Math.sqrt(bestDist2) } : null;
  },

  /**
   * Verifica se o animal está dentro da AABB de um cocho específico.
   * Hit-test pelo CENTRO da hitbox do animal — corpo todo dentro não é
   * exigido (animal grande passa, animal pequeno também).
   *
   * @param {object} animal      Instância com `.x`, `.y`, opcional `.getHitbox()`.
   * @param {string} troughId    Id do cocho em placedBuildings.
   * @returns {boolean}
   */
  isAnimalAtTrough(animal, troughId) {
    if (!animal) return false;
    const wt = findTrough(troughId);
    if (!wt) return false;

    const hb = (typeof animal.getHitbox === 'function')
      ? animal.getHitbox()
      : { x: animal.x || 0, y: animal.y || 0, width: animal.width || 16, height: animal.height || 16 };

    const ax = (hb.x || 0) + (hb.width || 0) / 2;
    const ay = (hb.y || 0) + (hb.height || 0) / 2;

    return ax >= wt.x && ax <= wt.x + wt.width &&
           ay >= wt.y && ay <= wt.y + wt.height;
  },

  /**
   * Procura um slot livre num cocho específico. Retorna o índice (0..2)
   * ou -1 se todos ocupados. "Livre" = entrada do _slotOccupancy é null,
   * é o próprio animalId, ou cleanup oportunístico detectou um claim órfão
   * (animal sumiu, ou animal abandonou o estado de bebida sem liberar).
   */
  findFreeSlotIn(troughId, animalId) {
    const occ = _occupancyFor(troughId);
    for (let i = 0; i < occ.length; i++) {
      if (occ[i] == null || occ[i] === animalId) return i;
      // Stale check (1): dono não existe mais no mundo.
      const owner = Array.isArray(animals)
        ? animals.find(a => a && a.id === occ[i])
        : null;
      if (!owner) {
        occ[i] = null;
        return i;
      }
      // Stale check (2): dono está vivo mas saiu dos estados de bebida.
      // Não chama _exitDrinkFlow nele (poderia estar em FLEE/FOLLOW), só
      // libera o claim aqui. Comparação por string pra evitar import
      // circular com animalAI.js.
      if (owner.state !== 'seeking_water' && owner.state !== 'drinking') {
        occ[i] = null;
        return i;
      }
    }
    return -1;
  },

  /**
   * Procura cocho + slot livre pra um animal. Combina findNearestTrough
   * com filtro de slot disponível. Retorna { trough, slotIdx, slotWorld }
   * ou null.
   *
   * @param {object} animal     Precisa de .x, .y e opcional ._enclosureId
   * @param {object} [opts]
   * @param {boolean} [opts.requireWater] Default true.
   */
  findFreeSlotFor(animal, opts = {}) {
    if (!animal) return null;
    const requireWater = opts.requireWater !== false;
    const troughs = this.getWaterTroughs();
    if (troughs.length === 0) return null;

    // Detecta cercado do animal pela posição atual. Animal SEM cercado
    // (solto na fazenda) pode beber de qualquer cocho. Animal DENTRO de
    // cercado só bebe de cocho do mesmo cercado.
    const encSys = getSystem('enclosure');
    const animalEnc = encSys?.getEnclosureAtPoint?.(animal.x, animal.y) || null;

    // Ordena por distância pra preferir o mais perto.
    const candidates = [];
    for (const wt of troughs) {
      if (requireWater && (wt.waterLevel || 0) <= 0) continue;
      if (animalEnc && encSys) {
        const { cx, cy } = _troughCenter(wt);
        const troughEnc = encSys.getEnclosureAtPoint(cx, cy);
        if (!troughEnc || troughEnc.id !== animalEnc.id) continue;
      }
      const dx = animal.x - (wt.x + wt.width / 2);
      const dy = animal.y - (wt.y + wt.height / 2);
      candidates.push({ wt, d2: dx * dx + dy * dy });
    }
    candidates.sort((a, b) => a.d2 - b.d2);

    for (const { wt } of candidates) {
      const slotIdx = this.findFreeSlotIn(wt.id, animal.id);
      if (slotIdx >= 0) {
        const slots = this.getDrinkSlots(wt);
        const slot = slots[slotIdx];
        return {
          trough: wt,
          slotIdx,
          slotWorld: slot,
          drinkPos: this.getDrinkPosition(wt, slot, animal),
        };
      }
    }
    return null;
  },

  /**
   * Calcula onde o animal deve PARAR pra beber do slot. Ponto FORA da
   * hitbox de colisão do cocho, alinhado com o slot na direção
   * perpendicular ao cocho:
   *   - waterTroughX (horizontal): acima ou abaixo (escolhe o lado mais perto)
   *   - waterTroughY (vertical): esquerda ou direita
   *
   * Retorna { x, y } em coords de mundo = onde `animal.x`/`animal.y`
   * (top-left do sprite) deve chegar. `facing` é a direção pro qual o
   * animal deve olhar pra hitbox de interação encaixar no slot.
   */
  getDrinkPosition(trough, slot, animal) {
    const isHorizontal = (trough.variant || 'waterTroughX') === 'waterTroughX';
    const GAP = 2;
    const slotCx = slot.x + slot.w / 2;
    const slotCy = slot.y + slot.h / 2;

    // Usa COLLISION BOX (corpo real) pra posicionar — não o sprite todo.
    // Bull tem sprite 48 mas corpo ~14×14 com offsetY ~24. Se usássemos
    // o sprite, o animal ficaria 12+px longe do cocho (sprite encosta,
    // corpo fica longe). Com a collision box, o corpo encosta no cocho.
    const cb = animal?.collisionBox || { offsetX: 0, offsetY: 0, width: animal?.width || 32, height: animal?.height || 32 };
    const cbX = cb.offsetX || 0;
    const cbY = cb.offsetY || 0;
    const cbW = cb.width  || animal?.width  || 32;
    const cbH = cb.height || animal?.height || 32;

    if (isHorizontal) {
      const fromAbove = (animal?.y ?? 0) < slotCy;
      // Animal.x tal que centro da collision box bate no centro do slot.
      // Animal.y tal que bottom (ou top) da collision box encosta no cocho.
      return {
        x: slotCx - cbX - cbW / 2,
        y: fromAbove
            ? (trough.y - GAP - cbY - cbH)
            : (trough.y + trough.height + GAP - cbY),
        facing: fromAbove ? 'down' : 'up',
      };
    }
    const fromLeft = (animal?.x ?? 0) < slotCx;
    return {
      x: fromLeft
          ? (trough.x - GAP - cbX - cbW)
          : (trough.x + trough.width + GAP - cbX),
      y: slotCy - cbY - cbH / 2,
      facing: fromLeft ? 'right' : 'left',
    };
  },

  /**
   * Reserva o slot pro animal. Retorna true se claim foi bem-sucedido.
   * Falha se o slot já tem outro dono. Idempotente: re-claim pelo mesmo
   * animal é no-op com sucesso.
   */
  claimSlot(troughId, slotIdx, animalId) {
    if (slotIdx < 0 || slotIdx > 2) return false;
    const occ = _occupancyFor(troughId);
    if (occ[slotIdx] != null && occ[slotIdx] !== animalId) return false;
    occ[slotIdx] = animalId;
    return true;
  },

  /**
   * Libera o slot SE o dono atual for o animal especificado. Caso o
   * slot já esteja com outro (ex: cleanup orfão), não toca.
   */
  releaseSlot(troughId, slotIdx, animalId) {
    if (slotIdx < 0 || slotIdx > 2) return;
    const occ = _slotOccupancy.get(troughId);
    if (!occ) return;
    if (occ[slotIdx] === animalId) occ[slotIdx] = null;
  },

  /** Libera TODOS os slots ocupados por esse animal. Pra cleanup quando
   *  animal morre/sai do estado de drinking sem chamar release explícito. */
  releaseAllSlotsFor(animalId) {
    for (const [, occ] of _slotOccupancy) {
      for (let i = 0; i < occ.length; i++) {
        if (occ[i] === animalId) occ[i] = null;
      }
    }
  },

  /**
   * Retorna os slots de bebida do cocho em coords de mundo (já aplicado
   * o ratio sobre x/y/width/height do cocho). Cada slot:
   *   { idx, x, y, w, h }
   */
  getDrinkSlots(troughOrId) {
    const wt = (typeof troughOrId === 'string') ? findTrough(troughOrId) : troughOrId;
    if (!wt) return [];
    const variant = wt.variant || 'waterTroughX';
    const slots = DRINK_SLOTS[variant] || [];
    return slots.map((s, idx) => ({
      idx,
      x: wt.x + wt.width * s.offsetX,
      y: wt.y + wt.height * s.offsetY,
      w: wt.width * s.w,
      h: wt.height * s.h,
    }));
  },

  /**
   * Overlay de debug — desenha os 3 retângulos azuis sobre cada cocho.
   * Só ativa com `getDebugFlag('drinkSlots')` (URL: `?drinkSlots=1`).
   * Chamado pelo gameLoop em main.js junto com `drawHoverMarker`.
   */
  drawDrinkSlots(ctx, camera) {
    if (!ctx || !camera) return;
    if (!getDebugFlag('drinkSlots')) return;

    const zoom = camera.zoom || 1;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.font = `${Math.round(11 * zoom)}px monospace`;
    ctx.textBaseline = 'top';

    for (const wt of this.getWaterTroughs()) {
      const slots = this.getDrinkSlots(wt);
      const occ = _slotOccupancy.get(wt.id) || [];
      for (const s of slots) {
        const screen = camera.worldToScreen(s.x, s.y);
        const sx = Math.round(screen.x);
        const sy = Math.round(screen.y);
        const sw = Math.round(s.w * zoom);
        const sh = Math.round(s.h * zoom);

        const taken = occ[s.idx] != null;
        // Azul livre, laranja ocupado — visualiza claim sem precisar de log.
        ctx.fillStyle   = taken ? 'rgba(255, 165, 0, 0.25)' : 'rgba(100, 200, 255, 0.18)';
        ctx.strokeStyle = taken ? 'rgba(255, 165, 0, 0.95)' : 'rgba(100, 200, 255, 0.85)';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeRect(sx, sy, sw, sh);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(String(s.idx), sx + 3, sy + 2);
      }
    }
    ctx.restore();
  },

  init() {
    // Expor DRINK_SLOTS pra live-edit no devtools.
    // window.__debug.waterTroughDrinkSlots.waterTroughX[0].offsetY = 0.3
    // ↑ muda no próximo frame (drawDrinkSlots lê toda vez).
    if (typeof window !== 'undefined') {
      window.__debug = window.__debug || {};
      window.__debug.waterTroughDrinkSlots = DRINK_SLOTS;
    }
  },
};

registerSystem('waterTrough', waterTroughSystem);
waterTroughSystem.init();

export default waterTroughSystem;
