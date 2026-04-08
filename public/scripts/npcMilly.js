/**
 * @file npcMilly.js - NPC Milly, a moradora da cidade
 * @description
 * Milly fica na janela da casa dela na cidade.
 * De dia (07:00–20:00) mostra milly_window_00 e pode interagir.
 * De noite (20:00–07:00) mostra milly_window_01 e não pode interagir.
 * O sprite só troca de dia→noite quando a casa sai da viewport.
 *
 * Quest: encontrar a gatinha Madalena que fugiu para a fazenda.
 * A Madalena nasce em frente à casa da fazenda, com fallback seguro.
 */

import { getSystem, registerSystem } from './gameState.js';
import { i18n } from './i18n/i18n.js';
import { camera } from './thePlayer/cameraSystem.js';
import { WeatherSystem } from './weather.js';
import { markWorldChanged, getInitialPlayerPosition } from './theWorld.js';
import { WORLD_GENERATOR_CONFIG } from './generatorSeeds.js';
import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from './worldConstants.js';
import { collisionSystem } from './collisionSystem.js';
import { logger } from './logger.js';

// ─── Constants ──────────────────────────────────────────────────────────────
const SPRITE_DAY = 'assets/character/milly/milly_window_00.png';
const SPRITE_NIGHT = 'assets/character/milly/milly_window_01.png';
const DIALOGUE_PORTRAIT = 'assets/character/milly/milly.png';
const CAT_SPRITE_SRC = '/assets/animals/madalena.png';
const MORNING_HOUR = 7;
const NIGHT_HOUR = 20;

// Casa da Milly na cidade — deve casar exatamente com `houseOfMilly`
// definido em scripts/debug/cityHitboxConfig.json. Se mudar lá, mude aqui.
const MILLY_HOUSE = { x: 2276, y: 1740, width: 174, height: 178 };

const M = 'npc.milly';
const Q = 'npc.milly.q2';
const QUEST_REWARD = 200;
const MADALENA_ITEM_ID = 9991; // item temporário no inventário (resources)

// Spawn base relativo à casa da fazenda + raio aleatório.
// A cada quest a Madalena aparece em um ponto diferente dentro do raio,
// para validar que o jogo não quebra com posições variadas.
// Bias: jitter Y é só para baixo (longe das paredes da casa) e o offset
// base já empurra a gata bem à frente da entrada.
const MADALENA_SPAWN_OFFSET_X = 0;
const MADALENA_SPAWN_OFFSET_Y = 220; // distância mínima da porta (px)
const MADALENA_SPAWN_RADIUS_X = 260; // ± px no eixo X
const MADALENA_SPAWN_RADIUS_Y = 200; // px adicionais no eixo Y (sempre +)

// tamanho fixo de desenho para não depender do tamanho do PNG
const CAT_DRAW_WIDTH = 32;
const CAT_DRAW_HEIGHT = 32;
// hitbox menor, concentrada no "corpo no chão"
const CAT_HITBOX_WIDTH = 26;
const CAT_HITBOX_HEIGHT = 14;
const CAT_HITBOX_OFFSET_X = 0;
const CAT_HITBOX_OFFSET_Y = 0;

// Debug visual (disable in production — caixa vermelha de localização)
const DEBUG_MADALENA_BOX = false;
// Seta de debug apontando para a Madalena (clamp na borda quando off-screen).
// Remover esse bloco/flag não quebra a quest.
const DEBUG_MADALENA_ARROW = true;

// ─── State ──────────────────────────────────────────────────────────────────
let millyRegistered = false;
let currentSprite = 'day';
let pendingSpriteChange = null;
let interactionEnabled = true;

// Quest states: 'idle' | 'intro_done' | 'quest_active' | 'quest_declined' | 'cat_found' | 'completed'
let questState = 'idle';

// Madalena state
let catImg = null;
let catSpawned = false;
let catX = 0;
let catY = 0;
const catHitboxId = 'quest_cat_madalena';

// ─── Generic helpers ────────────────────────────────────────────────────────
function safeMarkWorldChanged() {
  if (typeof markWorldChanged === 'function') {
    markWorldChanged();
  }
}

function getActiveCharacterId() {
  const player = getSystem('player');
  return player?.activeCharacter?.id || 'stella';
}

function getPlayerName() {
  const id = getActiveCharacterId();
  const names = {
    stella: 'Stella',
    ben: 'Ben',
    graham: 'Graham',
  };
  return names[id] || 'Stella';
}

function getPlayerDialogPortrait() {
  const id = getActiveCharacterId();
  return `assets/character/${id}/dialog_${id.charAt(0).toUpperCase() + id.slice(1)}_00.png`;
}

function tChar(baseKey, charId) {
  const specific = i18n.t(`${baseKey}.${charId}`);
  if (specific === `${baseKey}.${charId}`) {
    return i18n.t(`${baseKey}.stella`);
  }
  return specific;
}

function t(key, params) {
  return i18n.t(`${M}.${key}`, params);
}

function tQ(key, params) {
  return i18n.t(`${Q}.${key}`, params);
}

function getCurrentHour() {
  if (typeof WeatherSystem?.getHour === 'function') {
    return WeatherSystem.getHour();
  }
  const currentTime = WeatherSystem?.currentTime;
  if (typeof currentTime === 'number') {
    return Math.floor(currentTime / 60);
  }
  return 12;
}

function isDaytime() {
  const hour = getCurrentHour();
  return hour >= MORNING_HOUR && hour < NIGHT_HOUR;
}

function isHouseVisible() {
  if (typeof camera?.isInViewport !== 'function') return false;
  return camera.isInViewport(MILLY_HOUSE.x, MILLY_HOUSE.y, MILLY_HOUSE.width, MILLY_HOUSE.height);
}

// ─── Milly sprite management ────────────────────────────────────────────────
function applySprite(sprite) {
  const npcSys = getSystem('npc');
  if (!npcSys?.updateSprite) return;
  currentSprite = sprite;
  pendingSpriteChange = null;
  interactionEnabled = sprite === 'day';
  npcSys.updateSprite('milly', sprite === 'day' ? SPRITE_DAY : SPRITE_NIGHT);
  safeMarkWorldChanged();
}

function updateMillyState() {
  const wantedSprite = isDaytime() ? 'day' : 'night';
  if (wantedSprite === currentSprite) {
    pendingSpriteChange = null;
    return;
  }
  if (isHouseVisible()) {
    pendingSpriteChange = wantedSprite;
    return;
  }
  applySprite(wantedSprite);
}

function checkPendingChange() {
  if (!pendingSpriteChange) return;
  if (!isHouseVisible()) {
    applySprite(pendingSpriteChange);
  }
}

// ─── Madalena helpers ───────────────────────────────────────────────────────
function loadCatSprite() {
  if (catImg) return catImg;
  catImg = new Image();
  catImg.onload = () => {
    logger.info(
      `[Milly] Madalena sprite carregado com sucesso: ${CAT_SPRITE_SRC} (${catImg.naturalWidth}x${catImg.naturalHeight})`
    );
    safeMarkWorldChanged();
  };
  catImg.onerror = () => {
    logger.error(`[Milly] Falha ao carregar sprite da Madalena: ${CAT_SPRITE_SRC}`);
  };
  catImg.src = CAT_SPRITE_SRC;
  return catImg;
}

function getCatSpriteWidth() {
  return CAT_DRAW_WIDTH;
}

function getCatSpriteHeight() {
  return CAT_DRAW_HEIGHT;
}

function getCatBounds() {
  const spriteWidth = getCatSpriteWidth();
  const spriteHeight = getCatSpriteHeight();
  // âncora nos "pés"/base da sprite
  const drawX = catX - spriteWidth / 2;
  const drawY = catY - spriteHeight;

  const hitboxX = catX - CAT_HITBOX_WIDTH / 2 + CAT_HITBOX_OFFSET_X;
  const hitboxY = catY - CAT_HITBOX_HEIGHT + CAT_HITBOX_OFFSET_Y;

  return {
    spriteWidth,
    spriteHeight,
    drawX,
    drawY,
    hitboxX,
    hitboxY,
  };
}

function removeMadalenaHitbox() {
  try {
    if (typeof collisionSystem?.removeHitbox === 'function') {
      collisionSystem.removeHitbox(catHitboxId);
    }
  } catch (error) {
    logger.warn('[Milly] Não foi possível remover a hitbox da Madalena:', error);
  }
}

function addMadalenaHitbox() {
  const { hitboxX, hitboxY } = getCatBounds();
  removeMadalenaHitbox();
  try {
    if (typeof collisionSystem?.addHitbox === 'function') {
      collisionSystem.addHitbox(
        catHitboxId,
        'QUEST_ANIMAL',
        hitboxX,
        hitboxY,
        CAT_HITBOX_WIDTH,
        CAT_HITBOX_HEIGHT,
        {
          id: catHitboxId,
          type: 'QUEST_ANIMAL',
          originalType: 'quest_animal',
          entity: 'madalena',
          name: 'Madalena',
          x: hitboxX,
          y: hitboxY,
          width: CAT_HITBOX_WIDTH,
          height: CAT_HITBOX_HEIGHT,
        }
      );
    }
  } catch (error) {
    logger.warn('[Milly] Não foi possível adicionar a hitbox da Madalena:', error);
  }
}

/**
 * Calcula uma posição segura para spawn da Madalena baseada na configuração da casa da fazenda.
 */
function getSafeFarmSpawnPosition() {
  const cfg = WORLD_GENERATOR_CONFIG?.HOUSES;
  const baseX = cfg?.SPAWN_POSITION?.x ?? 2000;
  const baseY = cfg?.SPAWN_POSITION?.y ?? 2000;
  const totalH = cfg?.HEIGHT ?? 475;

  const roofHeight = Math.round(totalH * 0.70);
  const wallsY = baseY + roofHeight;

  // mesma lógica "na frente da casa", mas baseada na casa real da fazenda
  return {
    x: baseX + 50,
    y: wallsY + 50,
  };
}

function spawnMadalena() {
  let spawnPos = getInitialPlayerPosition?.();

  const fallbackX = (WORLD_WIDTH * TILE_SIZE) / 2;
  const fallbackY = (WORLD_HEIGHT * TILE_SIZE) / 2;

  const isFallbackCenter =
    spawnPos &&
    typeof spawnPos.x === 'number' &&
    typeof spawnPos.y === 'number' &&
    spawnPos.x === fallbackX &&
    spawnPos.y === fallbackY;

  if (!spawnPos || typeof spawnPos.x !== 'number' || typeof spawnPos.y !== 'number' || isFallbackCenter) {
    spawnPos = getSafeFarmSpawnPosition();
    logger.warn(
      `[Milly] getInitialPlayerPosition() caiu no fallback do centro do mundo. Usando spawn seguro da fazenda em (${spawnPos.x}, ${spawnPos.y}).`
    );
  }

  loadCatSprite();

  // Posição base + jitter aleatório dentro do raio definido.
  // X: simétrico (esquerda ou direita). Y: só positivo (longe da casa).
  const jitterX = (Math.random() * 2 - 1) * MADALENA_SPAWN_RADIUS_X;
  const jitterY = Math.random() * MADALENA_SPAWN_RADIUS_Y;
  catX = spawnPos.x + MADALENA_SPAWN_OFFSET_X + jitterX;
  catY = spawnPos.y + MADALENA_SPAWN_OFFSET_Y + jitterY;
  catSpawned = true;

  addMadalenaHitbox();
  safeMarkWorldChanged();

  logger.info(`[Milly] Madalena spawnada em posição ajustada: (${catX}, ${catY})`);
  return true;
}

function restoreMadalena(x, y) {
  loadCatSprite();
  catX = x;
  catY = y;
  catSpawned = true;
  addMadalenaHitbox();
  safeMarkWorldChanged();
}

function despawnMadalena() {
  if (!catSpawned) return;
  catSpawned = false;
  removeMadalenaHitbox();
  safeMarkWorldChanged();
}

function updateMadalena() {
  if (!catSpawned) return;
  // PNG estático; sem movimento por enquanto.
}

function drawMadalena(ctx) {
  if (!catSpawned || !ctx) return;
  if (typeof camera?.worldToScreen !== 'function') return;

  const { spriteWidth, spriteHeight, drawX, drawY } = getCatBounds();
  const screenPos = camera.worldToScreen(drawX, drawY);

  const zoom = camera?.zoom || 1;
  const viewWidth = camera?.width ?? window.innerWidth;
  const viewHeight = camera?.height ?? window.innerHeight;

  const drawW = Math.floor(spriteWidth * zoom);
  const drawH = Math.floor(spriteHeight * zoom);
  const sx = Math.floor(screenPos.x);
  const sy = Math.floor(screenPos.y);

  if (sx + drawW < 0 || sx > viewWidth || sy + drawH < 0 || sy > viewHeight) {
    return;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // caixa vermelha de debug para localizar rapidamente a Madalena
  if (DEBUG_MADALENA_BOX) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, drawW, drawH);

    ctx.fillStyle = 'rgba(255, 0, 0, 0.18)';
    ctx.fillRect(sx, sy, drawW, drawH);
  }

  if (catImg && catImg.complete) {
    ctx.drawImage(catImg, sx, sy, drawW, drawH);
  } else if (DEBUG_MADALENA_BOX) {
    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.fillText('M', sx + 4, sy + 14);
  }

  ctx.restore();
}

function getCatWorldObjects(mapId) {
  if (mapId !== 'farm' || !catSpawned) return [];
  const { spriteWidth, spriteHeight, drawX, drawY } = getCatBounds();
  const objs = [{
    type: 'QUEST_ANIMAL',
    id: catHitboxId,
    x: drawX,
    y: drawY,
    width: spriteWidth,
    height: spriteHeight,
    draw: (ctx) => drawMadalena(ctx),
  }];

  // Objeto fantasma só para garantir que a seta seja desenhada por cima,
  // mesmo quando a Madalena está fora do viewport (não passa pelo culling).
  if (DEBUG_MADALENA_ARROW) {
    objs.push({
      type: 'DEBUG_ARROW',
      id: `${catHitboxId}_arrow`,
      x: 0,
      y: 99998,
      width: 0,
      height: 0,
      draw: (ctx) => drawMadalenaDebugArrow(ctx),
    });
  }

  return objs;
}

function onCatInteract() {
  if (questState !== 'quest_active' || !catSpawned) return;

  const dlg = getSystem('dialogue');
  if (!dlg) return;

  const inventory = getSystem('inventory');
  const charId = getActiveCharacterId();
  const playerPortrait = getPlayerDialogPortrait();

  if (inventory?.addItem) {
    const added = inventory.addItem('resources', MADALENA_ITEM_ID, 1);
    if (!added) {
      logger.warn('[Milly] Não foi possível adicionar Madalena ao inventário temporário.');
    }
  } else {
    logger.warn('[Milly] Sistema de inventário não disponível ao capturar Madalena.');
  }

  questState = 'cat_found';

  dlg.start({
    left: { name: getPlayerName(), portrait: playerPortrait },
    right: { name: 'Madalena', portrait: DIALOGUE_PORTRAIT },
    lines: [
      { side: 'right', text: tQ('foundMadalena') },
      { side: 'left', text: tChar(`${Q}.playerFoundReaction`, charId) },
      {
        side: 'right',
        text: tQ('catCaught'),
        end: true,
        action: () => {
          despawnMadalena();
        },
      },
    ],
  });
}

// ─── Dialogue builders ─────────────────────────────────────────────────────
function buildFirstDialogue() {
  const charId = getActiveCharacterId();
  const playerPortrait = getPlayerDialogPortrait();
  const lines = [];

  lines.push({ side: 'right', text: t('watching') });

  const choiceLine = {
    side: 'left',
    text: '',
    type: 'choice',
    options: [
      { text: t('choiceAsk'), next: -1 },
      { text: t('choiceIgnore'), next: -1 },
      { text: t('choiceStare'), next: -1 },
    ],
  };
  lines.push(choiceLine);

  const ignoreIdx = lines.length;
  lines.push({ side: 'left', text: '...', end: true });

  const catIdx = lines.length;
  lines.push({ side: 'right', text: t('catQuestion') });
  lines.push({ side: 'left', text: t('playerWhat') });
  lines.push({ side: 'right', text: t('catYell') });
  lines.push({ side: 'left', text: tChar(`${M}.playerReaction`, charId) });
  lines.push({ side: 'right', text: tChar(`${M}.millyReaction`, charId) });
  lines.push({ side: 'right', text: t('millyIntro') });
  lines.push({ side: 'left', text: t('playerMoved') });
  lines.push({ side: 'right', text: t('millyGilbert') });
  lines.push({ side: 'left', text: t('playerYes') });
  lines.push({ side: 'right', text: t('millySigh') });
  lines.push({
    side: 'right',
    text: t('millyFarewell'),
    end: true,
    action: () => {
      questState = 'intro_done';
    },
  });

  choiceLine.options[0].next = catIdx;
  choiceLine.options[1].next = ignoreIdx;
  choiceLine.options[2].next = catIdx;

  return {
    left: { name: getPlayerName(), portrait: playerPortrait },
    right: { name: 'Milly', portrait: DIALOGUE_PORTRAIT },
    lines,
  };
}

function buildQuestDialogue() {
  const charId = getActiveCharacterId();
  const playerPortrait = getPlayerDialogPortrait();
  const lines = [];

  lines.push({ side: 'right', text: tChar(`${Q}.gilbertMemory`, charId) });
  lines.push({ side: 'left', text: tChar(`${Q}.playerAboutGilbert`, charId) });
  lines.push({ side: 'right', text: tQ('millyNod') });
  lines.push({ side: 'right', text: tQ('catsIntro') });
  lines.push({ side: 'right', text: tQ('catsPause') });
  lines.push({ side: 'right', text: tQ('millyWorried') });
  lines.push({ side: 'right', text: tQ('millyExplain') });
  lines.push({ side: 'right', text: tQ('millyTeary') });
  lines.push({ side: 'left', text: tChar(`${Q}.playerReaction`, charId) });
  lines.push({ side: 'right', text: tQ('millyDirection') });

  const choiceLine = {
    side: 'left',
    text: '',
    type: 'choice',
    options: [
      { text: tQ('choiceAccept'), next: -1 },
      { text: tQ('choiceNotNow'), next: -1 },
    ],
  };
  lines.push(choiceLine);

  const acceptIdx = lines.length;
  lines.push({
    side: 'right',
    text: tChar(`${Q}.millyGrateful`, charId),
    end: true,
    action: () => {
      questState = 'quest_active';
      spawnMadalena();
    },
  });

  const declineIdx = lines.length;
  lines.push({
    side: 'right',
    text: tQ('millyUnderstand'),
    end: true,
    action: () => {
      questState = 'quest_declined';
    },
  });

  choiceLine.options[0].next = acceptIdx;
  choiceLine.options[1].next = declineIdx;

  return {
    left: { name: getPlayerName(), portrait: playerPortrait },
    right: { name: 'Milly', portrait: DIALOGUE_PORTRAIT },
    lines,
  };
}

function buildDeclinedDialogue() {
  const charId = getActiveCharacterId();
  const playerPortrait = getPlayerDialogPortrait();
  const lines = [];

  lines.push({ side: 'right', text: tQ('millyDirection') });

  const choiceLine = {
    side: 'left',
    text: '',
    type: 'choice',
    options: [
      { text: tQ('choiceAccept'), next: -1 },
      { text: tQ('choiceNotNow'), next: -1 },
    ],
  };
  lines.push(choiceLine);

  const acceptIdx = lines.length;
  lines.push({
    side: 'right',
    text: tChar(`${Q}.millyGrateful`, charId),
    end: true,
    action: () => {
      questState = 'quest_active';
      spawnMadalena();
    },
  });

  const declineIdx = lines.length;
  lines.push({
    side: 'right',
    text: tQ('millyUnderstand'),
    end: true,
  });

  choiceLine.options[0].next = acceptIdx;
  choiceLine.options[1].next = declineIdx;

  return {
    left: { name: getPlayerName(), portrait: playerPortrait },
    right: { name: 'Milly', portrait: DIALOGUE_PORTRAIT },
    lines,
  };
}

function buildReturnDialogue() {
  const playerPortrait = getPlayerDialogPortrait();
  return {
    left: { name: getPlayerName(), portrait: playerPortrait },
    right: { name: 'Milly', portrait: DIALOGUE_PORTRAIT },
    lines: [
      { side: 'right', text: tQ('returnGreet') },
      { side: 'left', text: tQ('returnNotYet') },
      { side: 'right', text: tQ('returnMillySad'), end: true },
    ],
  };
}

function buildDeliverDialogue() {
  const charId = getActiveCharacterId();
  const playerPortrait = getPlayerDialogPortrait();
  return {
    left: { name: getPlayerName(), portrait: playerPortrait },
    right: { name: 'Milly', portrait: DIALOGUE_PORTRAIT },
    lines: [
      { side: 'right', text: tQ('deliverGreet') },
      { side: 'right', text: tQ('millyJoy') },
      { side: 'right', text: tChar(`${Q}.millyReward`, charId) },
      { side: 'left', text: tChar(`${Q}.playerFinish`, charId) },
      {
        side: 'right',
        text: tQ('millyEnd'),
        end: true,
        action: () => {
          questState = 'completed';
          const currency = getSystem('currency');
          if (currency?.earn) {
            currency.earn(QUEST_REWARD, 'quest_milly_madalena');
          }
          const inventory = getSystem('inventory');
          if (inventory?.removeItem) {
            inventory.removeItem('resources', MADALENA_ITEM_ID, 1);
          }
        },
      },
    ],
  };
}

function buildFreeDialogue() {
  const charId = getActiveCharacterId();
  const playerPortrait = getPlayerDialogPortrait();
  const F = 'npc.milly.free';

  const left = { name: getPlayerName(), portrait: playerPortrait };
  const right = { name: 'Milly', portrait: DIALOGUE_PORTRAIT };

  // Per-character free dialogue. Lines containing actions are marked
  // `thought: true` to render in italic gray (same style as Bartolomeu).
  const lines = [];

  if (charId === 'ben') {
    lines.push({ side: 'right', text: i18n.t(`${F}.ben.l1`) });
    lines.push({ side: 'left',  text: i18n.t(`${F}.ben.l2`) });
    lines.push({ side: 'right', text: i18n.t(`${F}.ben.l3`), thought: true });
    lines.push({ side: 'left',  text: i18n.t(`${F}.ben.l4`), thought: true, end: true });
  } else if (charId === 'graham') {
    lines.push({ side: 'right', text: i18n.t(`${F}.graham.l1`) });
    lines.push({ side: 'left',  text: i18n.t(`${F}.graham.l2`) });
    lines.push({ side: 'right', text: i18n.t(`${F}.graham.l3`) });
    lines.push({ side: 'left',  text: i18n.t(`${F}.graham.l4`), thought: true, end: true });
  } else {
    // Stella (default)
    lines.push({ side: 'right', text: i18n.t(`${F}.stella.l1`) });
    lines.push({ side: 'left',  text: i18n.t(`${F}.stella.l2`) });
    lines.push({ side: 'right', text: i18n.t(`${F}.stella.l3`) });
    lines.push({ side: 'left',  text: i18n.t(`${F}.stella.l4`), thought: true, end: true });
  }

  return { left, right, lines };
}

// ─── Interaction ────────────────────────────────────────────────────────────
function onInteract() {
  if (!interactionEnabled) return;

  const dlg = getSystem('dialogue');
  if (!dlg) return;

  switch (questState) {
    case 'idle':
      dlg.start(buildFirstDialogue());
      break;
    case 'intro_done':
      dlg.start(buildQuestDialogue());
      break;
    case 'quest_declined':
      dlg.start(buildDeclinedDialogue());
      break;
    case 'quest_active':
      dlg.start(buildReturnDialogue());
      break;
    case 'cat_found':
      dlg.start(buildDeliverDialogue());
      break;
    case 'completed':
      dlg.start(buildFreeDialogue());
      break;
    default:
      break;
  }
}

// ─── Save / Load ────────────────────────────────────────────────────────────
function getQuestState() {
  return {
    quest: questState,
    catSpawned,
    catX: catSpawned ? Math.round(catX) : null,
    catY: catSpawned ? Math.round(catY) : null,
  };
}

function setQuestState(data) {
  if (!data) {
    questState = 'idle';
    despawnMadalena();
    return;
  }

  if (typeof data === 'string') {
    questState = data;
    if (questState === 'quest_active') {
      if (!catSpawned) spawnMadalena();
    } else {
      despawnMadalena();
    }
    return;
  }

  questState = data.quest || 'idle';

  if (questState === 'quest_active' && data.catSpawned && typeof data.catX === 'number' && typeof data.catY === 'number') {
    restoreMadalena(data.catX, data.catY);
    return;
  }

  if (questState === 'quest_active' && !data.catSpawned) {
    spawnMadalena();
    return;
  }

  despawnMadalena();
}

// ─── Register ───────────────────────────────────────────────────────────────
function register() {
  if (millyRegistered) return;

  const npcSys = getSystem('npc');
  if (!npcSys?.addNpc) {
    setTimeout(register, 500);
    return;
  }

  millyRegistered = true;

  npcSys.addNpc({
    id: 'milly',
    name: 'Milly',
    x: MILLY_HOUSE.x,
    y: MILLY_HOUSE.y,
    width: MILLY_HOUSE.width,
    height: MILLY_HOUSE.height,
    sprite: isDaytime() ? SPRITE_DAY : SPRITE_NIGHT,
    map: 'city',
    layerIndex: 999,
    interactRadius: 20,
    onInteract,
  });

  currentSprite = isDaytime() ? 'day' : 'night';
  interactionEnabled = currentSprite === 'day';

  setInterval(updateMillyState, 2000);
  setInterval(checkPendingChange, 500);

  logger.info('[Milly] NPC registrado na cidade.');
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Re-registers Madalena's interaction hitbox after a map transition clears the collision system.
 * Only acts if the cat is already spawned (quest_active state).
 */
function reregisterHitbox() {
  if (catSpawned) {
    addMadalenaHitbox();
    logger.info('[Milly] Hitbox da Madalena re-registrada após transição de mapa.');
  }
}

const millyAPI = {
  register,
  getQuestState,
  setQuestState,
  spawnMadalena,
  despawnMadalena,
  updateMadalena,
  getCatWorldObjects,
  onCatInteract,
  reregisterHitbox,
};

registerSystem('npcMilly', millyAPI);

register();

export default millyAPI;