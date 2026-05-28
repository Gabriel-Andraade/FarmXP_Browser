/**
 * @file main.js - Arquivo principal do jogo FarmingXP
 * Sistema de inicialização por etapas com carregamento lazy e otimizações de performance
 * Gerencia game loop, sistemas críticos, animais, sleep mode e debug
 */

// =============================================================================
// IMPORTAÇÕES ESSENCIAIS (não bloqueantes)
// =============================================================================
import { handleError, handleWarn } from "./errorHandler.js";
import { logger } from "./logger.js";
import { safeDispatch } from "./safeDispatch.js";
import { initResponsiveUI } from "./responsive.js";
import { perfLog, OPTIMIZATION_CONFIG } from "./optimizationConstants.js";
import { collisionSystem } from "./collisionSystem.js";
import { registerSystem, setObject, getObject, getSystem, checkGameFlag, getDebugFlag, installLegacyGlobals, initDebugFlagsFromUrl, exposeDebug } from "./gameState.js";
import { getSortedWorldObjects, GAME_WIDTH, GAME_HEIGHT, drawBackground, initializeWorld, drawBuildPreview, addAnimal, updateAnimals} from "./theWorld.js";
import { CharacterSelection } from "./thePlayer/characterSelection.js";
import { MainMenu } from "./mainMenu/mainMenu.js";
import { assets } from "./assetManager.js";
// loadImages is now called dynamically inside playerSystem.loadCharacterModule
import { keys, setupControls, playerInteractionSystem, updatePlayerInteraction } from "./thePlayer/control.js";
import { setViewportSize, camera } from "./thePlayer/cameraSystem.js";
import { showLoadingScreen, updateLoadingProgress, hideLoadingScreen } from "./loadingScreen.js";
import { PlayerHUD } from "./thePlayer/playerHUD.js";
import { i18n, t } from "./i18n/i18n.js";
import { a11y } from './accessibility.js';
import { setupAutoCleanup } from "./gameCleanup.js";
import { initMinimap, updateMinimap } from "./minimap/minimapIntegration.js";

// =============================================================================
// VARIÁVEIS DE SISTEMAS LAZY LOADING
// Sistemas carregados sob demanda para otimizar tempo de inicialização
// =============================================================================

let currencyManager, merchantSystem, inventorySystem, playerSystem;
let itemSystem, worldUI, houseSystem, chestSystem, BuildSystem, wellSystem, waterTroughSystem;
let WeatherSystem, drawWeatherEffects;
let saveRef;

// =============================================================================
// VARIÁVEIS GLOBAIS DO JOGO
// =============================================================================

/**
 * Canvas principal do jogo
 * @type {HTMLCanvasElement}
 */
let canvas;
let ctx;

/**
 * Contexto 2D do canvas (alpha desabilitado para performance)
 * @type {CanvasRenderingContext2D}
 */

/**
 * Detecta se o usuário está em dispositivo mobile.
 * Esse valor é calculado no load do módulo e usado depois no DOMContentLoaded.
 * @type {boolean}
 */
const IS_MOBILE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

/**
 * Aplica otimizações específicas para mobile.
 * Deve ser chamado somente depois do canvas e ctx existirem (ex.: dentro do DOMContentLoaded).
 * @returns {void}
 */
function applyMobileOptimizations() {
  logger.debug("Mobile detectado: Aplicando otimizações");

  // reduz custo de render em alguns dispositivos
  if (ctx && ctx.imageSmoothingEnabled !== undefined) {
    ctx.imageSmoothingEnabled = false;
  }

  // limita FPS no mobile substituindo requestAnimationFrame
  // Preserva o contrato da API (retorna ID e suporta cancelamento)
  let lastFrameTime = 0;
  const mobileFPS = 30;
  const frameInterval = 1000 / mobileFPS;

  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  
  // Mapa para rastrear callbacks e timeouts: ID -> { type: 'raf'|'timeout', id: innerId }
  const rafMap = new Map();
  let rafSeq = 1;

  window.requestAnimationFrame = function (callback) {
    const id = rafSeq++;
    const currentTime = performance.now();
    const timeSinceLast = currentTime - lastFrameTime;

    if (timeSinceLast >= frameInterval) {
      lastFrameTime = currentTime - (timeSinceLast % frameInterval);
      
      const innerId = originalRequestAnimationFrame((ts) => {
        rafMap.delete(id);
        callback(ts);
      });
      rafMap.set(id, { type: "raf", id: innerId });
      return id;
    }

    const timeoutId = setTimeout(() => {
      const innerId = originalRequestAnimationFrame((ts) => {
        rafMap.delete(id);
        callback(ts);
      });
      rafMap.set(id, { type: "raf", id: innerId });
    }, frameInterval - timeSinceLast);

    rafMap.set(id, { type: "timeout", id: timeoutId });
    return id;
  };

  window.cancelAnimationFrame = function (id) {
    const entry = rafMap.get(id);
    if (!entry) return;
    
    if (entry.type === "timeout") {
      clearTimeout(entry.id);
    } else {
      originalCancelAnimationFrame(entry.id);
    }
    rafMap.delete(id);
  };
}


/**
 * Largura interna do jogo em pixels
 * @constant {number}
 */
const INTERNAL_WIDTH = GAME_WIDTH || 1280;

/**
 * Altura interna do jogo em pixels
 * @constant {number}
 */
const INTERNAL_HEIGHT = GAME_HEIGHT || 720;

/**
 * Largura máxima de exibição do canvas
 * @constant {number}
 */
const CANVAS_MAX_DISPLAY_WIDTH = 1600;

// Cache de assets carregados
let coreAssetsLoaded = false;
let worldAssetsLoaded = false;
let allAssetsLoaded = false;
let animalsInitialized = false;

// Estado do Jogo
let currentPlayer = null;
let updatePlayer = null;
let gameInitialized = false;
let lastTime = 0;
let fps = 0;
let frameCount = 0;
let lastFpsUpdate = 0;
let criticalSystemsLoaded = false;
let interactionEnabled = false;
let minimapUpdateDisabled = false;

// Estado de simulação (travamento do jogo)
let simulationPaused = true;
let gameStartInProgress = false;
let gameStarted = false;

// Variáveis do Sistema de Sono
let isSleeping = false;
let sleepBlockedControls = false;
let preSleepInteractionState = null;

// =============================================================================
// RESIZE CANVAS
// =============================================================================

/**
 * Ajusta o canvas para o tamanho da tela mantendo aspect ratio
 * Considera device pixel ratio para telas de alta resolução
 * Atualiza viewport da câmera para sincronização
 * @returns {void}
 */
function resizeCanvasToDisplaySize() {
  if (!canvas || !ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(INTERNAL_WIDTH * dpr);
  canvas.height = Math.round(INTERNAL_HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const container = canvas.parentElement || document.body;
  const displayWidth = Math.min(container.clientWidth, CANVAS_MAX_DISPLAY_WIDTH);
  const displayHeight = Math.round(displayWidth * (INTERNAL_HEIGHT / INTERNAL_WIDTH));

  canvas.style.width = displayWidth + "px";
  canvas.style.height = displayHeight + "px";

  setViewportSize(INTERNAL_WIDTH, INTERNAL_HEIGHT);
}

// =============================================================================
// INICIALIZAÇÃO DE SISTEMAS CRÍTICOS
// =============================================================================

/**
 * Carrega sistemas essenciais que devem estar prontos antes do jogo começar
 * @async
 * @returns {Promise<boolean>} True se inicialização bem-sucedida, false caso contrário
 */
async function loadCriticalSystems() {
  try {
    // esses arquivos existem no seu repo: itemSystem.js e worldUI.js
    const itemModule = await import("./itemSystem.js");
    itemSystem = itemModule.itemSystem || itemModule.default || itemModule;

    const worldUIModule = await import("./worldUI.js");
    worldUI = worldUIModule.worldUI || worldUIModule.default || worldUIModule;

    const buildModule = await import("./buildSystem.js");
    BuildSystem = buildModule.BuildSystem;

    // caminho correto pro playerSystem é dentro de thePlayer/
    const playerSystemModule = await import("./thePlayer/playerSystem.js");
    playerSystem = playerSystemModule.playerSystem;

    const currencyModule = await import("./currencyManager.js");
    currencyManager = currencyModule.currencyManager;

    // no seu repo é merchant.js (não merchantSystem.js)
    const merchantModule = await import("./merchant.js");
    merchantSystem = merchantModule.merchantSystem || merchantModule.default || merchantModule;

    const inventoryModule = await import("./thePlayer/inventorySystem.js");
    inventorySystem = inventoryModule.inventorySystem;

    criticalSystemsLoaded = true;
    return true;
  } catch (e) {
    handleError(e, "main:loadCriticalSystems", "falha ao carregar sistemas críticos");
    return false;
  }
}

/**
 * Inicializa sistemas essenciais que devem estar prontos antes do jogo começar
 * @async
 * @returns {Promise<boolean>} True se inicialização bem-sucedida, false caso contrário
 */
async function initializeCriticalSystems() {
  logger.debug("Inicializando sistemas críticos...");

  try {
    const ok = await loadCriticalSystems();
    if (!ok) return false;

    if (currencyManager?.init) currencyManager.init();
    if (merchantSystem?.init) merchantSystem.init();
    if (inventorySystem?.init) inventorySystem.init();

    await import("./animal/UiPanel.js");
    logger.debug("animal UiPanel carregado");

    await import("./animal/injurySystem.js");
    logger.debug("animal injurySystem carregado");

    await import("./animal/diseaseSystem.js");
    logger.debug("animal diseaseSystem carregado");

    await import("./animal/hospitalSystem.js");
    logger.debug("animal hospitalSystem carregado");

    await import("./animal/enclosureSystem.js");
    logger.debug("animal enclosureSystem carregado");

    await import("./animal/productionSystem.js");
    logger.debug("animal productionSystem carregado");

    await import("./animal/agingSystem.js");
    logger.debug("animal agingSystem carregado");

    await import("./animal/tombSystem.js");
    logger.debug("animal tombSystem carregado");

    // Cocho de água — eager load pra que hover+marker funcione antes
    // do player apertar E (lazy load só serve pro fluxo E).
    const wtModule = await import("./waterTroughSystem.js");
    waterTroughSystem = wtModule.waterTroughSystem;
    logger.debug("waterTroughSystem carregado");

    return true;
  } catch (error) {
    handleError(error, "main:initializeCriticalSystems", "falha ao inicializar sistemas críticos");
    return false;
  }
}

// =============================================================================
// FUNÇÕES AUXILIARES DE INICIALIZAÇÃO DE SISTEMAS
// =============================================================================

/**
 * Inicializa o sistema de inventário
 * Carrega módulo sob demanda se ainda não carregado
 * @async
 * @returns {Promise<Object>} Instância do inventorySystem
 */
async function initializeInventorySystem() {
  if (!inventorySystem) {
    const module = await import("./thePlayer/inventorySystem.js");
    inventorySystem = module.inventorySystem;
  }
  logger.debug("InventorySystem pronto");
  return inventorySystem;
}

/**
 * Inicializa o sistema do jogador
 * Carrega módulo sob demanda se ainda não carregado
 * @async
 * @returns {Promise<Object>} Instância do playerSystem
 */
async function initializePlayerSystem() {
  if (!playerSystem) {
    const module = await import("./thePlayer/playerSystem.js");
    playerSystem = module.playerSystem;
  }
  return playerSystem;
}

// =============================================================================
// SISTEMA DE INTERAÇÃO
// =============================================================================

/**
 * Configura o sistema de interação com objetos do mundo
 * Carrega sistemas específicos (chest, house, well) sob demanda
 * Escuta evento 'playerInteract' e direciona para o handler apropriado
 * @returns {void}
 */
function setupInteractionSystem() {
  document.addEventListener("keydown", (e) => {
    if (!interactionEnabled) return;
    if (sleepBlockedControls) return;
    if (checkGameFlag('interactionsBlocked')) return;

    if (e.code === "KeyE") {
      playerInteractionSystem?.handleInteraction?.();
    }
  });

  document.addEventListener("playerInteract", async (e) => {
    if (!interactionEnabled || isSleeping) return;

    const { objectId, originalType } = e.detail || {};

    if (!chestSystem && originalType === "chest") {
      try {
        const module = await import("./chestSystem.js");
        chestSystem = module.chestSystem;
      } catch (error) {
        handleWarn("erro ao carregar chestSystem", "main:playerInteract:chest", error);
        return;
      }
    }

    if (!houseSystem && originalType === "house") {
      try {
        const module = await import("./houseSystem.js");
        houseSystem = module.houseSystem;
      } catch (error) {
        handleWarn("erro ao carregar houseSystem", "main:playerInteract:house", error);
        return;
      }
    }

    if (!wellSystem && originalType === "well") {
      try {
        const module = await import("./wellSystem.js");
        wellSystem = module.wellSystem;
      } catch (error) {
        handleWarn("erro ao carregar wellSystem", "main:playerInteract:well", error);
        return;
      }
    }

    if (!waterTroughSystem && originalType === "watertrough") {
      try {
        const module = await import("./waterTroughSystem.js");
        waterTroughSystem = module.waterTroughSystem;
      } catch (error) {
        handleWarn("erro ao carregar waterTroughSystem", "main:playerInteract:watertrough", error);
        return;
      }
    }

    switch (originalType) {
      case "chest":
        chestSystem?.openChest?.(objectId);
        break;
      case "house":
        // Toggle handled by houseSystem's own E key listener
        break;
      case "well":
        wellSystem?.openWellMenu?.();
        break;
      case "watertrough":
        waterTroughSystem?.openWaterTroughMenu?.(objectId);
        break;
      case "npc": {
        const npcSys = getSystem('npc');
        if (npcSys) npcSys.tryInteract();
        break;
      }
      case "quest_animal": {
        const milly = getSystem('npcMilly');
        if (milly && typeof milly.onCatInteract === 'function') {
          milly.onCatInteract();
        }
        break;
      }
    }
  });

  // ─── Animal interaction handler (pet / feed / guide / applyMedicine) ───
  document.addEventListener("animalAction", (e) => {
    const { action, animal, itemId } = e.detail || {};
    if (!animal || typeof animal.pet !== 'function') return;

    let result;
    switch (action) {
      case 'pet':
        result = animal.pet();
        break;
      case 'feed':
        // `itemId` opcional — se omitido, animal.feed() escolhe o primeiro
        // animal_food do inventário (legacy). Se presente, usa esse item
        // específico (do sub-menu "Ração") com check de compatibilidade.
        result = animal.feed(itemId);
        break;
      case 'guide':
        result = animal.guide();
        break;
      case 'collect': {
        // Coleta de produção (milk/wool/egg) via botão "Coletar" do UiPanel.
        // Delega TODO check pro productionSystem.collect — ele valida
        // sleeping/ferramenta/inventário e seta o FX flutuante no animal.
        // Aqui só converto o reason em message i18n pro feedback bubble.
        const prodSys = getSystem('animalProduction');
        if (!prodSys?.collect) {
          result = { success: false, message: 'no_production_system' };
          break;
        }
        const playerSys = getSystem('player');
        const r = prodSys.collect(animal, { equippedItem: playerSys?.equippedItem });
        if (r?.ok) {
          result = { success: true, message: 'collected' };
        } else {
          // Mapeia reason → mensagem do feedback bubble
          const reasonMap = {
            sleeping:        'sleeping',
            needs_tool:      'needs_tool',
            inventory_full:  'inventory_full',
            not_ready:       'not_ready',
            no_inventory:    'no_inventory',
          };
          result = { success: false, message: reasonMap[r?.reason] || 'not_ready' };
        }
        break;
      }
      case 'applyMedicine': {
        // Decrementa o item do inventário ANTES de aplicar — se falhar a
        // remoção, não aplica (animal não consome o que não foi pago).
        const inv = getSystem('inventory');
        if (!inv || typeof inv.removeItem !== 'function') {
          result = { success: false, message: 'no_inventory' };
          break;
        }
        const removed = inv.removeItem(itemId, 1);
        if (!removed) {
          result = { success: false, message: 'no_food' }; // reusa msg de "sem item no inventário"
          break;
        }
        if (typeof animal.applyMedicine !== 'function') {
          inv.addItem?.(itemId, 1);
          result = { success: false, message: 'invalid_medicine_target' };
          break;
        }
        try {
          result = animal.applyMedicine(itemId) ?? { success: false, message: 'medicine_failed' };
        } catch (error) {
          inv.addItem?.(itemId, 1);
          throw error;
        }
        // Se o animal não pôde receber (suspeito/dormindo), devolve o item.
        if (!result.success) {
          inv.addItem?.(itemId, 1);
        }
        break;
      }
      default:
        return;
    }

    // Dispatch result for UI feedback / achievements
    document.dispatchEvent(new CustomEvent('animalActionResult', {
      detail: { action, animal, ...result }
    }));
  });
}

// =============================================================================
// SISTEMA DE SPAWN DE ANIMAIS
// =============================================================================

/**
 * Spawna animais iniciais no mundo do jogo
 * @returns {void}
 */
function spawnGameAnimals() {
  if (animalsInitialized) return;

  const animalTypes = ["Bull", "Calf", "Chick", "Chicken", "Cow", "Lamb", "Piglet", "Rooster", "Sheep", "Turkey"];
  const baseX = 1800;
  const baseY = 1850;
  const spacing = 110;
  const cols = 4;

  for (let i = 0; i < animalTypes.length; i++) {
    const animalType = animalTypes[i];
    if (assets.animals && assets.animals[animalType]) {
      logger.debug(`Spawnando Animal (${animalType})...`);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = baseX + col * spacing;
      const y = baseY + row * spacing;
      addAnimal(animalType, assets.animals[animalType], x, y);
    } else {
      handleWarn(`não foi possível spawnar animal: tipo '${animalType}' não encontrado`, "main:spawnGameAnimals");
    }
  }

  animalsInitialized = true;
}

// =============================================================================
// CONFIGURAÇÃO DE EVENTOS DE SONO
// =============================================================================

function setupSleepListeners() {
  document.addEventListener("sleepStarted", () => {
    logger.debug("SONO INICIADO: Bloqueando interações e congelando lógica");
    isSleeping = true;
    sleepBlockedControls = true;

    preSleepInteractionState = {
      keys: { ...keys },
      interactionEnabled: interactionEnabled,
      playerMoving: currentPlayer?.isMoving || false,
    };

    interactionEnabled = false;
    for (const key of Object.keys(keys)) {
      keys[key] = false;
    }

    if (currentPlayer) {
      currentPlayer.isMoving = false;
      currentPlayer.wasMoving = false;
      currentPlayer.direction = "down";
    }

    canvas.classList.add("cursor-wait");
  });

  document.addEventListener("sleepEnded", () => {
    logger.debug("SONO TERMINADO: Restaurando interações");
    isSleeping = false;

    setTimeout(() => {
      sleepBlockedControls = false;

      if (preSleepInteractionState) {
        interactionEnabled = preSleepInteractionState.interactionEnabled;
      } else {
        interactionEnabled = true;
      }

      canvas.classList.remove("cursor-wait");

      getObject('world')?.markWorldChanged?.();

      const hud = getSystem('hud');
      if (hud) {
        hud.showNotification(t('time.goodMorning'), "success", 4000);
      }

      preSleepInteractionState = null;
    }, 500);
  });

  document.addEventListener("sleepOptimizationsComplete", () => {
    logger.debug("Otimizações de sono concluídas");
    if (window.performance && window.performance.memory) {
      const mem = window.performance.memory;
      logger.debug(`Memória Heap: ${Math.round(mem.usedJSHeapSize / 1024 / 1024)}MB`);
    }
  });
}

// =============================================================================
// EVENTOS DE PAUSE/RESUME PARA SAVE/LOAD
// =============================================================================

function setupGamePauseListeners() {
  document.addEventListener("game:pause", () => {
    logger.debug("GAME PAUSE: Congelando simulação para load");
    simulationPaused = true;
    interactionEnabled = false;

    for (const key of Object.keys(keys)) {
      keys[key] = false;
    }

    if (currentPlayer) {
      currentPlayer.isMoving = false;
      currentPlayer.wasMoving = false;
    }
  });

  document.addEventListener("game:resume", () => {
    logger.debug("GAME RESUME: Retomando simulação");
    simulationPaused = false;
    interactionEnabled = true;
  });
}

// =============================================================================
// EXPOSIÇÃO DE GLOBAIS
// =============================================================================

/**
 * Expõe sistemas ao escopo global (window) para acesso de outros módulos
 * Usa gameState para registro centralizado e instala bridge de compatibilidade
 * Habilita interação global após conclusão
 * @async
 * @returns {Promise<void>}
 */
async function exposeGlobals() {
    logger.debug("Registrando sistemas no gameState...");

    try {
        // Registrar objetos do jogo
        setObject('canvas', canvas);
        setObject('ctx', ctx);
        setObject('currentPlayer', currentPlayer);
        setObject('keys', keys);

        // Registrar sistemas que não se auto-registram
        if (playerSystem) registerSystem('player', playerSystem);
        if (worldUI) registerSystem('worldUI', worldUI);
        if (BuildSystem) registerSystem('build', BuildSystem);

        // Instalar bridge de compatibilidade para window.* acessos legados
        installLegacyGlobals();

        // Inicializar flags de debug via URL
        initDebugFlagsFromUrl();

        // Expor debug se flag estiver habilitada (incluindo gameDebug)
        exposeDebug({
          gameDebug: {
            getPerformance: () => ({ fps, coreAssetsLoaded, worldAssetsLoaded, isSleeping, simulationPaused }),
            forceLoadAll: async () => {
              await assets.loadAll();
              allAssetsLoaded = true;
              worldAssetsLoaded = true;
              spawnGameAnimals();
            },
            triggerSleep: () => safeDispatch(document, new CustomEvent("sleepStarted")),
            wakeUp: () => safeDispatch(document, new CustomEvent("sleepEnded")),
            spawnAnimals: function (count = 5, type = "Turkey") {
              if (!assets.animals || !assets.animals[type]) {
                logger.error(`Tipo de animal "${type}" não encontrado. Tipos disponíveis:`, Object.keys(assets.animals || {}));
                return;
              }

              logger.debug(`Spawnando ${count} animais do tipo ${type}...`);

              const WORLD_BOUNDS = { minX: 100, maxX: 1200, minY: 100, maxY: 700 };
              const world = getObject('world');

              for (let i = 0; i < count; i++) {
                const x = WORLD_BOUNDS.minX + Math.random() * (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX);
                const y = WORLD_BOUNDS.minY + Math.random() * (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY);
                addAnimal(type, assets.animals[type], x, y);
              }

              logger.debug(`${count} animais do tipo ${type} spawnados!`);
              world?.markWorldChanged?.();
            },
            clearAnimals: function () {
              const world = getObject('world');
              if (world && world.animals) {
                const count = world.animals.length;
                world.animals.length = 0;
                logger.debug(`${count} animais removidos do mundo`);
                world.markWorldChanged?.();
              }
            },
            listAnimals: function () {
              const world = getObject('world');
              if (world && world.animals) {
                logger.debug(`Animais no mundo (${world.animals.length}):`);
                let index = 0;
                for (const animal of world.animals) {
                  logger.debug(`  ${index + 1}. ${animal.assetName || "Animal"} em (${Math.round(animal.x)}, ${Math.round(animal.y)})`);
                  index++;
                }
              }
            },
            debugItem: async (id) => {
              if (!inventorySystem) await initializeInventorySystem();
              const { getItem } = await import("./itemUtils.js");
              const item = getItem(Number(id));
              if (!item) return logger.error("Item não existe:", id);
              inventorySystem.addItem(item.id, 1);
              logger.debug(`Debug: Adicionado ${item.name}`);
            },
          },
        });

        // Debug global: window.addItem(id, qty=1) — adiciona item ao
        // inventário direto do devtools. Categoria é resolvida pelo
        // type do item (mapeamento centralizado).
        if (typeof window !== 'undefined') {
            window.addItem = async function (id, qty = 1) {
                if (id == null) { logger.warn('addItem: id é obrigatório'); return false; }
                if (!inventorySystem) await initializeInventorySystem();
                const { getItem } = await import('./itemUtils.js');
                const item = getItem(Number(id));
                if (!item) { logger.error(`addItem: item ${id} não existe`); return false; }
                const ok = inventorySystem.addItem(item.id, Number(qty) || 1);
                logger.info(`[addItem] ${ok ? '✓' : '✗'} ${item.name} x${qty} (id=${item.id})`);
                return ok;
            };

            // ─── Debug do sistema de bebida ─────────────────────────────
            // diagnoseDrink(): mostra ESTADO + MOTIVO de cada animal e cada
            // cocho. Útil quando "animais não estão bebendo e não sei por quê".
            window.diagnoseDrink = function () {
                const wtSys = getSystem('waterTrough');
                const world = getObject('world');
                if (!wtSys || !world) {
                    console.warn('Sistema não pronto: waterTrough ou world ausente.');
                    return;
                }
                const troughs = wtSys.getWaterTroughs();
                const animals = world.animals || [];
                console.group('🥤 Diagnóstico de Bebida');
                console.log(`Cochos: ${troughs.length}  Animais: ${animals.length}`);
                troughs.forEach((t, i) => {
                    console.log(`  Cocho ${i}: id=${t.id} variant=${t.variant} water=${t.waterLevel ?? 0}/100 pos=(${Math.round(t.x)},${Math.round(t.y)})`);
                });
                animals.forEach(a => {
                    let reason;
                    if (a._mood === 'sleeping') reason = 'dormindo';
                    else if ((a.stats.thirst || 0) >= a._drinkThreshold) reason = `sem sede (${Math.round(a.stats.thirst)} >= threshold ${a._drinkThreshold})`;
                    else if (a._claimedTrough) reason = `já reservou slot ${a._claimedSlot} do cocho ${a._claimedTrough}`;
                    else if (performance.now() < a._drinkCooldownUntil) reason = `cooldown ${Math.ceil((a._drinkCooldownUntil - performance.now())/1000)}s`;
                    else {
                        const found = wtSys.findFreeSlotFor(a);
                        reason = found
                          ? `PRONTO — iria pro slot ${found.slotIdx} do cocho ${found.trough.id}`
                          : 'NENHUM cocho com água + slot livre no cercado';
                    }
                    console.log(`  ${a.assetName} #${a.id}: state=${a.state} thirst=${Math.round(a.stats.thirst)} threshold=${a._drinkThreshold} → ${reason}`);
                });
                console.groupEnd();
            };

            // forceDrink(): seta thirst baixo + zera cooldown — anima testa
            // o fluxo agora em vez de esperar 5min de decay natural.
            window.forceDrink = function () {
                const world = getObject('world');
                const animals = world?.animals || [];
                animals.forEach(a => { a.stats.thirst = 3; a._drinkCooldownUntil = 0; });
                console.log(`✓ ${animals.length} animais com thirst=3, cooldown zerado`);
            };

            // fillAllTroughs(): enche todos os cochos sem precisar do balde.
            window.fillAllTroughs = function () {
                const wtSys = getSystem('waterTrough');
                const troughs = wtSys?.getWaterTroughs?.() || [];
                troughs.forEach(t => { t.waterLevel = 100; });
                console.log(`✓ ${troughs.length} cochos enchidos até 100`);
            };
        }

        logger.debug("Sistemas registrados no gameState");
    } catch (error) {
        logger.warn("Erro ao registrar sistemas:", error);
    }

    interactionEnabled = true;
    logger.debug("Interação Global habilitada");
}

// =============================================================================
// FLUXO: SELEÇÃO DE PERSONAGEM -> LOADING -> START
// =============================================================================

async function startFullGameLoad() {
  if (gameStartInProgress || gameStarted) return;
  gameStartInProgress = true;

  simulationPaused = true;
  interactionEnabled = false;
  for (const k of Object.keys(keys)) {
    keys[k] = false;
  }

  showLoadingScreen();
  updateLoadingProgress(0.05, "carregando mundo...");

  try {
    await assets.loadWorld();
    worldAssetsLoaded = true;
    updateLoadingProgress(0.35, "carregando animais...");

    await assets.loadAnimals();
    allAssetsLoaded = true;
    updateLoadingProgress(0.55, "preparando mundo...");

    if (!getObject('pendingSaveData')) {
      spawnGameAnimals();
    }

    // XP System — load before questSystem so quest rewards can grant XP.
    try {
      await import('./xpSystem.js');
      await import('./xpNotification.js');
    } catch (e) {
      handleWarn("falha ao carregar xpSystem", "main:startFullGameLoad:xpSystem", e);
    }

    // Quest Registry — catálogo central de quests. Carrega ANTES do questSystem
    // e dos NPCs, que chamam questRegistry.complete(id) ao finalizar quests.
    try {
      await import('./quests/questRegistry.js');
    } catch (e) {
      handleWarn("falha ao carregar questRegistry", "main:startFullGameLoad:questRegistry", e);
    }

    // Quest System — load early so pickup hitbox is registered before first frame
    try {
      await import('./questSystem.js');
    } catch (e) {
      handleWarn("falha ao carregar questSystem", "main:startFullGameLoad:questSystem", e);
    }

    // Dialogue & NPC Systems
    try {
      await import('./dialogueSystem.js');
      await import('./npcs/npcSystem.js');
      await import('./npcs/npcBartolomeu.js');
      await import('./npcs/npcMilly.js');
      await import('./npcs/npcJuan.js');
      await import('./npcs/npcBru.js');
      await import('./npcs/npcCouple.js');
      await import('./npcs/npcJeremy.js');
      await import('./npcs/family/npcJohn.js');
      await import('./npcs/family/npcLucas.js');
      await import('./npcs/family/npcIsabela.js');
      await import('./npcs/family/npcMolly.js');
    } catch (e) {
      handleWarn("falha ao carregar NPC/dialogue systems", "main:startFullGameLoad:npc", e);
    }

    updateLoadingProgress(0.65, "carregando sistemas...");

    await exposeGlobals();
    updateLoadingProgress(0.8, "carregando interface...");

    try {
      const ui = await import("./thePlayer/inventoryUI.js");
      ui.initInventoryUI();
    } catch (e) {
      handleWarn("falha ao carregar inventory ui", "main:startFullGameLoad:inventoryUI", e);
    }

    try {
      const houseModule = await import("./houseSystem.js");
      houseSystem = houseModule.houseSystem;

      const weatherModule = await import("./weather.js");
      WeatherSystem = weatherModule.WeatherSystem;
      drawWeatherEffects = weatherModule.drawWeatherEffects;


      if (WeatherSystem && WeatherSystem.init) WeatherSystem.init();

      // Registrar WeatherSystem no gameState APÓS import e init
      // (exposeGlobals() foi chamado antes, quando WeatherSystem ainda era undefined)
      if (WeatherSystem) {
        registerSystem('weather', WeatherSystem);
      }
    } catch (e) {
      handleWarn("falha ao carregar sistemas opcionais (house/weather)", "main:startFullGameLoad:optionalSystems", e);
    }

    // Sistema de combustível da picape (precisa estar registrado antes do
    // travelMap, do save e da leitura/restauração de gameFlags).
    try {
      await import('./fuelSystem.js');
    } catch (e) {
      handleWarn("falha ao carregar fuelSystem", "main:startFullGameLoad:fuelSystem", e);
    }

    // Travel Map UI — carrega antes do mapManager para que getSystem('travelMap')
    // já esteja registrado quando triggerPortalTransition for chamado.
    try {
      await import('./travelMap.js');
    } catch (e) {
      handleWarn("falha ao carregar travelMap", "main:startFullGameLoad:travelMap", e);
    }

    // Painel da Veterinária (Alice). É aberto pelo travelMap quando o
    // jogador chega no destino "vet".
    try {
      await import('./vetSystem.js');
    } catch (e) {
      handleWarn("falha ao carregar vetSystem", "main:startFullGameLoad:vetSystem", e);
    }

    // Map Manager (farm ↔ city transitions)
    try {
      await import('./mapManager.js');
      setupPortalKeyListener();
      setupCityHouseKeyListener();
    } catch (e) {
      handleWarn("falha ao carregar mapManager", "main:startFullGameLoad:mapManager", e);
    }

    try {
      const audioModule = await import('./audioManager.js');
      audioModule.audioManager.init();
    } catch (e) {
      handleWarn("falha ao carregar audioManager", "main:startFullGameLoad:audio", e);
    }

    try {
      const saveModule = await import('./saveSystem.js');
      saveRef = saveModule.saveSystem;
      await import('./saveSlotsUI.js');
      if (saveRef) {
        // Configurar listeners para chamar markDirty() em mudanças de estado importantes
        setupStateChangeListenersForSave();
        saveRef.startAutoSave();
      }
    } catch (e) {
      handleWarn("falha ao carregar save system", "main:startFullGameLoad:saveSystem", e);
    }

    try {
      await initMinimap();
    } catch (e) {
      handleWarn("falha ao inicializar minimap", "main:startFullGameLoad:minimap", e);
    }

    // Achievement system (must load BEFORE applySaveData so progress can be restored)
    try {
      const { AchievementTracker } = await import('./achievements/achievementTracker.js');
      const { initAchievementNotifications } = await import('./achievements/achievementNotification.js');
      new AchievementTracker();
      initAchievementNotifications();
    } catch (e) {
      handleWarn("falha ao carregar achievement system", "main:startFullGameLoad:achievements", e);
    }

    // Fonte única de verdade para "há save pendente?" — evita que o bloco de
    // auto-slot e o de restore leiam lugares diferentes e divergirem.
    const pendingSave = getObject('pendingSaveData') ?? window._pendingSaveData ?? null;

    // Auto-select a save slot for new games so auto-save and beforeunload work
    if (saveRef && saveRef.activeSlot === null && !pendingSave) {
      // Find first empty slot; if none, skip auto-creation so we don't silently
      // overwrite an existing save. The player will pick a slot via the menu.
      let targetSlot = -1;
      for (let i = 0; i < 3; i++) {
        if (!saveRef.getSlotMeta(i)) { targetSlot = i; break; }
      }
      if (targetSlot >= 0) {
        saveRef.createOrOverwriteSlot(targetSlot, { saveName: `Save ${targetSlot + 1}` });
        saveRef.selectActiveSlot(targetSlot);
        logger.info(`💾 Auto-created save slot ${targetSlot} for new game`);
      } else {
        logger.warn('💾 All 3 save slots occupied; auto-save disabled until player picks a slot');
      }
    }

    // Aplicar save pendente do startup (usuário clicou "Carregar Jogo" na tela inicial)
    // Feito ANTES de esconder o loading, para que o jogador não veja o mundo default piscar
    if (pendingSave && saveRef) {
      try {
        updateLoadingProgress(0.95, "restaurando save...");
        await saveRef.applySaveData(pendingSave);
        logger.info('📂 Save aplicado do startup');
      } catch (e) {
        handleWarn("falha ao aplicar save pendente", "main:startFullGameLoad:pendingSave", e);
      }
      setObject('pendingSaveData', null);
    }

    updateLoadingProgress(1, "pronto");
    hideLoadingScreen();

    gameStarted = true;
    simulationPaused = false;
    interactionEnabled = true;
    lastTime = performance.now();
  } catch (error) {
    handleError(error, "main:startFullGameLoad", "erro ao carregar o jogo");
    
    // Recuperação de falha: Remove UI de loading e libera controles para tentar novamente
    hideLoadingScreen();
    updateLoadingProgress(0, "falha");
    simulationPaused = false;
    interactionEnabled = true;
    gameStarted = false;
  } finally {
    gameStartInProgress = false;
  }
}

// =============================================================================
// PORTAL (MAP TRANSITION) KEY LISTENER
// =============================================================================

let _portalListenerAdded = false;
function setupPortalKeyListener() {
  if (_portalListenerAdded) return;
  _portalListenerAdded = true;

  document.addEventListener('keydown', async (e) => {
    if (e.key !== 'e' && e.key !== 'E') return;
    if (simulationPaused || isSleeping) return;

    // NPCs are already handled by npcSystem's capture-phase listener
    // (stopImmediatePropagation runs before this listener when an NPC is near).

    const mapMgr = getSystem('mapManager');
    if (!mapMgr || mapMgr.isMapTransitioning()) return;

    const player = currentPlayer;
    if (!player) return;

    const near = mapMgr.checkPortalInteraction(player.x, player.y, player.width, player.height);
    if (near) {
      e.stopImmediatePropagation();
      await mapMgr.triggerPortalTransition();
    }
  });
}

let _cityHouseListenerAdded = false;
function setupCityHouseKeyListener() {
  if (_cityHouseListenerAdded) return;
  _cityHouseListenerAdded = true;

  document.addEventListener('keydown', async (e) => {
    if (e.key !== 'e' && e.key !== 'E') return;
    if (simulationPaused || isSleeping) return;

    const cityHouseSys = getSystem('cityHouse');
    if (!cityHouseSys) return;

    const house = cityHouseSys.getHouseInteractable();
    if (house) {
      e.stopImmediatePropagation();
      // TODO: Implementar ação ao interagir com casa
      const hud = getSystem('hud');
      hud?.showNotification?.(`Entrando em: ${house.name}`, 'info', 2000);
    }
  });
}

// =============================================================================
// CONFIGURAÇÃO DE LISTENERS PARA AUTO-SAVE
// =============================================================================

/**
 * Configura listeners para chamar markDirty() quando o estado do jogo mudar
 * Isso resolve o problema do auto-save ser "dead code"
 * @returns {void}
 */
function setupStateChangeListenersForSave() {
  if (!saveRef) return;

  // 1. Mudanças no mundo (animais spawnados, construções, etc.)
  //    Agora usando evento customizado 'worldChanged' que deve ser disparado
  //    pela função markWorldChanged em theWorld.js
  document.addEventListener('worldChanged', () => {
    saveRef.markDirty();
  });

  // 2. Mudanças no inventário
  document.addEventListener('inventoryChanged', () => {
    saveRef.markDirty();
  });

  // 3. Mudanças na moeda
  document.addEventListener('currencyChanged', () => {
    saveRef.markDirty();
  });

  // 4. Player spawnado/atualizado
  document.addEventListener('playerReady', () => {
    saveRef.markDirty();
  });

  // 5. Adicionar animais via debug ou sistemas
  //    Agora usando evento customizado 'animalAdded' que deve ser disparado
  //    pela função addAnimal em theWorld.js
  document.addEventListener('animalAdded', () => {
    saveRef.markDirty();
  });

  // 6. Eventos de sono (mudam o tempo do jogo)
  document.addEventListener('sleepEnded', () => {
    saveRef.markDirty();
  });

  logger.debug("Listeners de auto-save configurados");
}

// =============================================================================
// BOOTSTRAP DO JOGO
// =============================================================================

async function initGameBootstrap() {
  logger.debug("Bootstrapping FarmingXP...");

  showLoadingScreen();
  updateLoadingProgress(0.02, t('messages.loading'));

  const loadingSteps = [
    { name: "Assets core", action: () => assets.loadCore() },
    { name: "Interface responsiva", action: initResponsiveUI },
    { name: "Mundo base", action: initializeWorld },
    { name: "Sistemas críticos", action: initializeCriticalSystems },
  ];

  for (const [idx, step] of loadingSteps.entries()) {
    try {
      const result = await step.action?.();
      if (result === false) {
        handleWarn(
          `${step.name} retornou false (falha crítica)`,
          `main:bootstrap:${step.name}`,
          new Error(`${step.name} falhou`)
        );
        return;
      }
      logger.debug(`${step.name} concluído`);
      updateLoadingProgress(
        ((idx + 1) / (loadingSteps.length + 1)) * 0.6,
        step.name
      );
    } catch (error) {
      handleWarn(`${step.name} falhou`, `main:bootstrap:${step.name}`, error);
      return;
    }
  }

  if (typeof collisionSystem.reapplyHitboxesForType === "function") {
    try {
      collisionSystem.reapplyHitboxesForType("TREE");
      logger.debug("collisionSystem: reaplicadas hitboxes do tipo TREE");
    } catch (err) {
      handleWarn("falha ao reaplicar hitboxes TREE", "main:bootstrap:hitboxes", err);
    }
  } else {
    logger.debug("collisionSystem.reapplyHitboxesForType não disponível");
  }

  coreAssetsLoaded = true;
  criticalSystemsLoaded = true;

  hideLoadingScreen();

  simulationPaused = true;
  interactionEnabled = false;

  // Show Main Menu (replaces direct CharacterSelection show)
  const mainMenu = new MainMenu();
  mainMenu.show();

  setupInteractionSystem();

  gameInitialized = true;
  setupAutoCleanup(); // Configurar cleanup automático ao encerrar o jogo
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  logger.debug("Game Loop iniciado!");
}

// =============================================================================
// LISTENERS GLOBAIS
// =============================================================================

document.addEventListener("characterSelected", () => {
  startFullGameLoad();
});

// Main Menu → New Game → show CharacterSelection
document.addEventListener("mainMenu:newGame", () => {
  // Reseta XP/Level para não herdar progresso de uma sessão anterior.
  const xp = getSystem('xp');
  if (xp?.reset) xp.reset();
  // Reseta exploração do minimap pelo mesmo motivo.
  const minimap = getSystem('minimap');
  if (minimap?.resetExploration) minimap.resetExploration();
  const selection = new CharacterSelection();
  selection.show();
});

// Main Menu → Load Game (save already set in window._pendingSaveData)
document.addEventListener("mainMenu:loadGame", (e) => {
  const slot = e.detail?.saveData;
  const charId = slot?.data?.player?.characterId || 'stella';

  // Set active character from save data and trigger game load
  if (playerSystem) {
    const character = { id: charId, name: charId.charAt(0).toUpperCase() + charId.slice(1) };
    playerSystem.setActiveCharacter(character);
  }

  document.dispatchEvent(new CustomEvent('characterSelected', {
    detail: { character: { id: charId } },
  }));
});

document.addEventListener("playerReady", async (e) => {
  currentPlayer = e.detail.player;
  updatePlayer = e.detail.updateFunction;

  setupControls(currentPlayer);
  setupDebugCoordinatesDisplay();

  try {
    if (!playerSystem) await initializePlayerSystem();
  } catch (err) {
    handleWarn("falha ao inicializar player system", "main:playerReady:playerSystem", err);
  }

  logger.debug("Jogador spawnado e pronto!");

  if (itemSystem && getObject('world')) {
    setTimeout(() => {
      const worldObjects = getObject('world')?.getSortedWorldObjects?.(currentPlayer) || [];
      itemSystem.registerInteractiveObjects?.(worldObjects);
    }, 100);
  }

  try {
    await exposeGlobals();
  } catch (e) {
    handleWarn("falha ao expor globais no playerReady", "main:playerReady:exposeGlobals", e);
  }
});
document.addEventListener("DOMContentLoaded", async () => {
  // Criar canvas se não existir
  canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "gameCanvas";
    document.body.appendChild(canvas);
  }

  // Configurar canvas
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(INTERNAL_WIDTH * dpr);
  canvas.height = Math.round(INTERNAL_HEIGHT * dpr);
  ctx = canvas.getContext("2d", { alpha: false });

  // Verifica se o contexto 2D está disponível no navegador
  if (!ctx) {
    handleError(new Error("2D context indisponível"), "main:DOMContentLoaded");
    return;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Aplica otimizações específicas para dispositivos móveis
  if (IS_MOBILE) {
    applyMobileOptimizations();
  }

  // 1) i18n primeiro (pra settings já nascer traduzido)
  try {
    logger.debug("Inicializando sistema de idiomas...");
    await i18n.init();
    logger.debug("Sistema i18n inicializado");
  } catch (error) {
    logger.error("Erro na inicialização do i18n:", error);
  }

  // 2) a11y depois (pra settings ler configs salvas + aplicar classes/filtros)
  try {
    a11y.init();
    logger.debug("AccessibilityManager inicializado");
  } catch (error) {
    logger.error("Erro na inicialização do AccessibilityManager:", error);
  }

  // 3) settings UI depois do i18n + a11y (ordem correta)
  try {
    await import("./settingsUI.js");
    logger.debug("settingsUI carregado (após i18n + a11y)");
  } catch (error) {
    handleWarn("falha ao carregar settingsUI", "main:DOMContentLoaded:settingsUI", error);
  }

  try {
    logger.debug("Criando PlayerHUD...");
    const hud = new PlayerHUD();
    registerSystem("hud", hud);
    logger.debug("PlayerHUD criado e registrado");
  } catch (error) {
    logger.error("Erro ao criar PlayerHUD:", error);
  }

  try {
    await import("./helpPanel.js");
    logger.debug("helpPanel carregado");
  } catch (error) {
    handleWarn("falha ao carregar helpPanel", "main:DOMContentLoaded:helpPanel", error);
  }

  setupSleepListeners();
  setupGamePauseListeners();

  try {
    await initGameBootstrap();
  } catch (error) {
    logger.error("Erro na inicialização do jogo:", error);
  }
});


// =============================================================================
// DEBUG HELPER - Mostra coordenadas do mundo em tempo real
// =============================================================================

let debugCoordinates = { screenX: 0, screenY: 0, worldX: 0, worldY: 0 };
let showCoordinatePanel = false;
let debugCoordinatesDisplayInitialized = false;

function setupDebugCoordinatesDisplay() {
  if (!canvas) return;
  // playerReady dispara em cada save-reload/character-swap — sem esse guard,
  // mousemove/keydown ficariam acumulando e F2 alternaria múltiplas vezes.
  if (debugCoordinatesDisplayInitialized) return;
  debugCoordinatesDisplayInitialized = true;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (camera) {
      const worldPos = camera.screenToWorld(screenX, screenY);
      debugCoordinates = {
        screenX: Math.round(screenX),
        screenY: Math.round(screenY),
        worldX: Math.round(worldPos.x),
        worldY: Math.round(worldPos.y)
      };
    }
  });

  // F2 toggle do painel de coordenadas
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
      e.preventDefault();
      showCoordinatePanel = !showCoordinatePanel;
      logger.debug(`[DEBUG] Painel de coordenadas: ${showCoordinatePanel ? 'ON' : 'OFF'}`);

      // Ativa/desativa hot-reload das hitboxes da cidade
      const cityHouseSys = getSystem('cityHouse');
      if (cityHouseSys) {
        if (showCoordinatePanel) {
          cityHouseSys._debugDraw = true;
          cityHouseSys.startHotReload();
        } else {
          cityHouseSys._debugDraw = false;
          cityHouseSys.stopHotReload();
        }
      }

      const cityObsSys = getSystem('cityObstacles');
      if (cityObsSys) {
        cityObsSys._debugDraw = showCoordinatePanel;
      }

      // Ativa/desativa hot-reload dos NPCs (edita JS, salva, vê ao vivo)
      const npcSys = getSystem('npc');
      if (npcSys) {
        if (showCoordinatePanel) {
          npcSys.startNpcHotReload();
        } else {
          npcSys.stopNpcHotReload();
        }
      }
    }
  });

  logger.debug('[DEBUG] Coordenadas do mundo ativadas. Pressione F2 para exibir o painel.');
}

function drawDebugCoordinates(ctx) {
  if (!showCoordinatePanel && !getDebugFlag('hitboxes')) return;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(10, 10, 280, 90);

  ctx.fillStyle = '#00FF00';
  ctx.font = '13px monospace';
  ctx.fillText(`Screen: (${debugCoordinates.screenX}, ${debugCoordinates.screenY})`, 20, 32);
  ctx.fillText(`World:  (${debugCoordinates.worldX}, ${debugCoordinates.worldY})`, 20, 52);
  ctx.fillText(`Zoom: ${camera?.zoom.toFixed(2) || 1}`, 20, 72);

  // Crosshair no cursor (mundo)
  if (camera) {
    const sp = camera.worldToScreen(debugCoordinates.worldX, debugCoordinates.worldY);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sp.x - 12, sp.y);
    ctx.lineTo(sp.x + 12, sp.y);
    ctx.moveTo(sp.x, sp.y - 12);
    ctx.lineTo(sp.x, sp.y + 12);
    ctx.stroke();
  }

  ctx.restore();
}

// =============================================================================
// GAME LOOP PRINCIPAL
// =============================================================================

function gameLoop(timestamp) {
  if (!gameInitialized) {
    requestAnimationFrame(gameLoop);
    return;
  }

  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (isSleeping) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (WeatherSystem && WeatherSystem.update) {
      WeatherSystem.update(deltaTime);
      if (drawWeatherEffects) drawWeatherEffects(ctx, currentPlayer, canvas);
    }

    requestAnimationFrame(gameLoop);
    return;
  }

  frameCount++;
  if (timestamp >= lastFpsUpdate + 1000) {
    fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = timestamp;

    if (fps < 30) perfLog(`FPS Baixo: ${fps}`);
  }

  if (!simulationPaused) {
    try {
      if (WeatherSystem) WeatherSystem.update(deltaTime);
      if (merchantSystem) merchantSystem.update(deltaTime);
      if (saveRef) { saveRef.tick(deltaTime * 1000); }

      updateAnimals();

      if (currentPlayer && updatePlayer && !sleepBlockedControls) {
        updatePlayer(deltaTime * 1000, keys);
        updatePlayerInteraction(currentPlayer.x, currentPlayer.y, currentPlayer.width, currentPlayer.height);

        const audioSys = getSystem('audio');
        if (audioSys && audioSys.setListenerPosition) {
          const dir = currentPlayer.direction || 'right';
          const rad = dir === 'right' ? 0
            : dir === 'down' ? Math.PI * 0.5
            : dir === 'left' ? Math.PI
            : -Math.PI * 0.5; // up
          audioSys.setListenerPosition(currentPlayer.x, currentPlayer.y, rad);
        }
      }
    } catch (e) {
      handleError(e, "main:gameLoop:logicUpdate", "erro no loop de update");
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  try {
    if (drawBackground) drawBackground(ctx);
    else {
      ctx.fillStyle = "#5a9367";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } catch (e) {
    handleWarn("falha ao desenhar background", "main:gameLoop:drawBackground", e);
  }

  try {
    const objects = getSortedWorldObjects?.(currentPlayer) || [];
    const objectsToDraw = worldAssetsLoaded
      ? objects
      : objects.filter((obj) => obj.type === "PLAYER" || obj.type === "FLOOR" || obj.originalType === "chest");

    for (const o of objectsToDraw) {
      try {
        if (o && o.draw) o.draw(ctx);
      } catch (err) {
        handleWarn("falha ao desenhar objeto individual", "main:gameLoop:drawObject", { id: o?.id, err });
      }
    }

    // Tumbas agora são renderizadas via getSortedWorldObjects (Y-sort)
    // junto com árvores/animais/casas — sprite layering correto.
    // Sem chamada standalone aqui.
  } catch (err) {
    handleWarn("falha ao desenhar objetos do mundo", "main:gameLoop:drawObjects", err);
  }

  try {
    if (BuildSystem && drawBuildPreview) drawBuildPreview(ctx);

    // Endpoints das cercas (vermelho/azul/verde) + "+" no centro dos
    // cercados detectados. Feedback visual de conexão e ação durante o
    // modo construção. Fora dele, invisíveis pra não poluir o jogo
    // normal. Não depende de DEBUG_HITBOXES.
    if (BuildSystem?.active && camera) {
      const encSys = getSystem('enclosure');
      encSys?.drawEndpoints?.(ctx, camera);
      encSys?.drawCenterMarkers?.(ctx, camera);
    }

    // Marker "+" do cocho no hover — independente do build mode.
    // Drink slots: overlay debug ativado com `?drinkSlots=1` na URL.
    if (camera) {
      const wtSys = getSystem('waterTrough');
      wtSys?.drawHoverMarker?.(ctx, camera);
      wtSys?.drawDrinkSlots?.(ctx, camera);
    }
  } catch (e) {
    handleWarn("falha ao desenhar preview de construcao", "main:gameLoop:buildPreview", e);
  }

  if (getDebugFlag('hitboxes') && camera && allAssetsLoaded) {
    try {
      collisionSystem.drawHitboxes(ctx, camera);
      playerInteractionSystem?.drawInteractionRange?.(ctx, camera);
    } catch (e) {
      handleWarn("falha no debug de hitboxes", "main:gameLoop:debugHitboxes", e);
    }
  }

  // Painel de coordenadas (F2) — independente do debug de hitboxes
  drawDebugCoordinates(ctx);

  // Debug hitboxes da cidade (F2): casas em vermelho, obstáculos em azul
  if (showCoordinatePanel) {
    const cityHouseSys = getSystem('cityHouse');
    if (cityHouseSys) cityHouseSys.drawDebugHitboxes(ctx);

    const cityObsSys = getSystem('cityObstacles');
    if (cityObsSys) cityObsSys.drawDebugHitboxes(ctx);
  }

  if (!simulationPaused) {
    try {
      if (WeatherSystem && drawWeatherEffects) {
        drawWeatherEffects(ctx, currentPlayer, canvas);
      }
    } catch (e) {
      handleWarn("falha ao desenhar clima", "main:gameLoop:weather", e);
    }
  }

  if (!simulationPaused) {
    try {
      if (worldUI && itemSystem && currentPlayer && !sleepBlockedControls) {
        worldUI.render?.(ctx, itemSystem.interactiveObjects, currentPlayer);
      }
    } catch (e) {
      handleWarn("falha ao desenhar world ui", "main:gameLoop:worldUI", e);
    }
  }

  // PlayerHUD.render() removido do game loop — o HUD é event-driven
  // (playerNeedsChanged, moneyChanged, playerReady, languageChanged, needsUpdateInterval)

  if (!allAssetsLoaded) drawLoadingIndicator();

  if (!minimapUpdateDisabled) {
    try {
      updateMinimap(currentPlayer);
    } catch (e) {
      minimapUpdateDisabled = true;
      handleWarn("falha ao atualizar minimap; desativando updates até reinicialização", "main:gameLoop:minimap", e);
    }
  }

  requestAnimationFrame(gameLoop);
}

// =============================================================================
// INDICADOR DE CARREGAMENTO
// =============================================================================

function drawLoadingIndicator() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(10, 10, 250, 60);
  ctx.fillStyle = "#fff";
  ctx.font = "14px Arial";
  ctx.fillText("Carregando...", 20, 35);
  ctx.fillText(`FPS: ${fps}`, 20, 55);
  ctx.restore();
}


// =============================================================================
// DEBUG EXPORTS
// =============================================================================


// DEBUG_HITBOXES agora é gerenciado via gameState.js (use ?hitboxes=1 na URL)

logger.debug("main.js completo carregado!");