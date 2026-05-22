/**
 * @file tombSystem.js - Tumbas de animais que morreram de velhice
 *
 * Quando um animal morre (via agingSystem), sua entidade é removida do
 * mundo e uma tumba aparece na última posição dele. A tumba persiste no
 * mapa até o player clicar pra abrir o memorial — aí some.
 *
 * Estado:
 *   - `tombs[]` array com `{ id, x, y, animalName, species, daysLived, lastWords, deathDay }`
 *
 * API pública:
 *   tombSystem.spawnTomb(animal)              → cria tumba do animal
 *   tombSystem.getTombs()                     → cópia do array
 *   tombSystem.removeTomb(tombId)             → remove tumba (após memorial fechar)
 *   tombSystem.findTombAt(wx, wy)             → tumba sob ponto ou null
 *   tombSystem.draw(ctx, camera)              → renderiza todas no mundo
 *   tombSystem.serializeState() / restoreState(data)  → persistência
 *
 * Últimas palavras por espécie estão num map estático. Cada animal nasce
 * com uma frase determinística pela espécie + customName (mesmo som pra
 * todas vacas, mas player conecta com o nome).
 */

import { registerSystem } from '../gameState.js';
import { logger } from '../logger.js';
import { assets } from '../assetManager.js';
import { markWorldChanged } from '../theWorld.js';
import { t } from '../i18n/i18n.js';
import { camera } from '../thePlayer/cameraSystem.js';

// Últimas palavras por espécie. Sons stylized do animal — player conecta
// com o que aquele animal "falava". Mantém o tom carinhoso/respeitoso
// mesmo com a brincadeira. Sem i18n por enquanto — sons são universais.
const LAST_WORDS = {
  Cow:     'Mooo... muuu... mooo.',
  Bull:    'Mrrr! Muuuu...',
  Calf:    'Muuuu... mu.',
  Chicken: 'Cluck... cluck. Coco.',
  Rooster: 'Cocoricó... có...',
  Chick:   'Pio pio pio...',
  Sheep:   'Beeeee... bééé.',
  Lamb:    'Mé... mé...',
  Pig:     'Oinc! Oinc...',
  Piglet:  'Oinc oinc...',
  Turkey:  'Gobble... gobble...',
};

const TOMB_WIDTH  = 48;
const TOMB_HEIGHT = 48;

function _genId() {
  return `tomb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

class TombSystem {
  constructor() {
    this._tombs = [];
  }

  /**
   * Cria uma tumba a partir dos dados do animal recém-falecido. Caller
   * (agingSystem) é responsável por chamar objectDestroyed(animal.id)
   * separadamente — este método só registra a tumba.
   */
  spawnTomb(animal, deathDay = 0) {
    if (!animal) return null;
    const species = animal.assetName || '?';
    const tomb = {
      id: _genId(),
      x: animal.x,
      y: animal.y,
      width: TOMB_WIDTH,
      height: TOMB_HEIGHT,
      species,
      animalName: animal.customName || null,  // null = mostrar nome da raça
      daysLived: animal._daysOld || 0,
      lastWords: LAST_WORDS[species] || '...',
      deathDay,
    };
    this._tombs.push(tomb);
    // Invalida o cache de Y-sort em getSortedWorldObjects pra a tumba
    // entrar na próxima renderização sem precisar esperar evento de mundo.
    try { markWorldChanged(); } catch {}
    document.dispatchEvent(new CustomEvent('animalTombSpawned', { detail: { tomb } }));
    return tomb;
  }

  /** Cópia rasa do array (caller não pode mutar o original direto). */
  getTombs() {
    return this._tombs.slice();
  }

  /**
   * Remove a tumba — chamado pelo memorial panel ao "Despedir-se".
   * @returns {boolean} true se removeu, false se não achou.
   */
  removeTomb(tombId) {
    const idx = this._tombs.findIndex(t => t.id === tombId);
    if (idx < 0) return false;
    const [removed] = this._tombs.splice(idx, 1);
    try { markWorldChanged(); } catch {}
    document.dispatchEvent(new CustomEvent('animalTombRemoved', { detail: { tomb: removed } }));
    return true;
  }

  /**
   * Achaa tumba sob coord de mundo (x, y). AABB simples — sprite 48×48
   * a partir do top-left armazenado em `tomb.x/y`.
   */
  findTombAt(wx, wy) {
    for (const t of this._tombs) {
      if (wx >= t.x && wx < t.x + t.width && wy >= t.y && wy < t.y + t.height) {
        return t;
      }
    }
    return null;
  }

  /**
   * Renderiza UMA tumba — chamado pelo getSortedWorldObjects via callback
   * `draw` de cada entry. Vantagem: tumbas entram no Y-sort com árvores,
   * casas e animais, então sprite layering fica correto (passa por trás
   * de árvore quando o foot da tumba é maior que o foot da árvore).
   */
  drawSingle(ctx, tomb) {
    if (!tomb || !ctx) return;
    if (!camera || typeof camera.worldToScreen !== 'function') return;

    const tombImg = assets?.furniture?.animalTomb?.img;
    const zoom = camera.zoom || 1;
    const zW = (tomb.width  || 48) * zoom;
    const zH = (tomb.height || 48) * zoom;
    const sp = camera.worldToScreen(tomb.x, tomb.y);
    const dx = Math.round(sp.x);
    const dy = Math.round(sp.y);
    if (tombImg && tombImg.complete && tombImg.naturalWidth > 0) {
      ctx.drawImage(tombImg, dx, dy, zW, zH);
    } else {
      ctx.fillStyle = '#6e6e6e';
      ctx.fillRect(dx, dy, zW, zH);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(14 * zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('RIP', dx + zW / 2, dy + zH / 2 + 4 * zoom);
    }
  }

  /**
   * Renderiza todas as tumbas DE UMA VEZ (legacy / fallback). Não usado
   * mais pelo main loop — agora cada tumba é renderizada via Y-sort.
   * Mantido pra debug ou caso outro caller precise.
   */
  draw(ctx, camera) {
    if (!camera || this._tombs.length === 0) return;
    const tombImg = assets?.furniture?.animalTomb?.img;
    const zoom = camera.zoom || 1;
    const zW = TOMB_WIDTH  * zoom;
    const zH = TOMB_HEIGHT * zoom;

    ctx.save();
    for (const t of this._tombs) {
      const screenPos = camera.worldToScreen(t.x, t.y);
      // Cull off-screen
      if (screenPos.x + zW < 0 || screenPos.x > (camera.width || 9999)) continue;
      if (screenPos.y + zH < 0 || screenPos.y > (camera.height || 9999)) continue;

      const dx = Math.round(screenPos.x);
      const dy = Math.round(screenPos.y);
      if (tombImg && tombImg.complete && tombImg.naturalWidth > 0) {
        ctx.drawImage(tombImg, dx, dy, zW, zH);
      } else {
        // Fallback: retângulo cinza com "RIP" caso o asset não carregue
        ctx.fillStyle = '#6e6e6e';
        ctx.fillRect(dx, dy, zW, zH);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(14 * zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('RIP', dx + zW / 2, dy + zH / 2 + 4 * zoom);
      }
    }
    ctx.restore();
  }

  /** Serializa o array pra salvar no save. */
  serializeState() {
    return this._tombs.map(t => ({ ...t }));
  }

  /** Restaura do save. Substitui o estado completamente. */
  restoreState(data) {
    this._tombs = Array.isArray(data) ? data.map(t => ({ ...t })) : [];
  }

  /** Limpa todas — usado em map transition / reset. */
  clear() {
    this._tombs.length = 0;
  }

  /**
   * Detecta se tem tumba na posição de mundo (wx, wy) e abre memorial.
   * Retorna true se achou e abriu, false caso contrário.
   */
  handleClick(wx, wy) {
    const tomb = this.findTombAt(wx, wy);
    if (!tomb) return false;
    this.showMemorial(tomb);
    return true;
  }

  /**
   * Exibe modal de memorial do animal.
   * UI com: nome, dias vividos, últimas palavras, botão "Despedir-se".
   */
  showMemorial(tomb) {
    let modal = document.getElementById('tomb-memorial-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'tomb-memorial-modal';
      modal.className = 'tomb-memorial-modal';
      document.body.appendChild(modal);
    }

    // Helpers — escape básico pra customName (player pode digitar < ou >)
    const escapeHtml = (s) => String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Nome de exibição: customName se tiver, senão tradução da espécie.
    let nameDisplay = tomb.animalName;
    if (!nameDisplay) {
      const speciesKey = `animals.${(tomb.species || '').toLowerCase()}`;
      const translated = t(speciesKey);
      nameDisplay = (translated && translated !== speciesKey) ? translated : tomb.species;
    }

    const speciesKey = `animals.${(tomb.species || '').toLowerCase()}`;
    const speciesTranslated = t(speciesKey);
    const speciesDisplay = (speciesTranslated && speciesTranslated !== speciesKey)
      ? speciesTranslated : tomb.species;

    const title    = t('animal.tomb.title') || 'In Memoriam';
    const livedTpl = t('animal.tomb.lived') || 'Viveu {days} dia(s)';
    const livedTxt = livedTpl.replace('{days}', String(tomb.daysLived));
    const farewell = t('animal.tomb.farewell') || 'Despedir-se';

    modal.innerHTML = `
      <div class="tmm-overlay"></div>
      <div class="tmm-card">
        <div class="tmm-header">
          <h2 class="tmm-title">${escapeHtml(title)}</h2>
          <button class="tmm-close" data-tomb-id="${escapeHtml(tomb.id)}">&times;</button>
        </div>
        <div class="tmm-content">
          <div class="tmm-name">${escapeHtml(nameDisplay)}</div>
          <div class="tmm-species">${escapeHtml(speciesDisplay)}</div>
          <div class="tmm-lifespan">${escapeHtml(livedTxt)}</div>
          <div class="tmm-last-words"><em>"${escapeHtml(tomb.lastWords)}"</em></div>
        </div>
        <div class="tmm-footer">
          <button class="tmm-farewell" data-tomb-id="${escapeHtml(tomb.id)}">${escapeHtml(farewell)}</button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    modal.classList.add('open');

    // Close button
    modal.querySelector('.tmm-close')?.addEventListener('click', () => {
      modal.classList.remove('open');
      setTimeout(() => modal.style.display = 'none', 300);
    });

    // Farewell button - remove tumba
    modal.querySelector('.tmm-farewell')?.addEventListener('click', () => {
      const tombId = modal.querySelector('.tmm-farewell').dataset.tombId;
      this.removeTomb(tombId);
      modal.classList.remove('open');
      setTimeout(() => modal.style.display = 'none', 300);
    });

    // Click overlay to close
    modal.querySelector('.tmm-overlay')?.addEventListener('click', () => {
      modal.classList.remove('open');
      setTimeout(() => modal.style.display = 'none', 300);
    });
  }
}

export const tombSystem = new TombSystem();
registerSystem('animalTomb', tombSystem);

export default tombSystem;
