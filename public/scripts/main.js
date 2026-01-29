/**
 * @file main.js - Arquivo principal do jogo FarmingXP
 * Sistema de inicialização por etapas com carregamento lazy e otimizações de performance
 * Gerencia game loop, sistemas críticos, animais, sleep mode e debug
 */

// =============================================================================
// IMPORTAÇÕES ESSENCIAIS (não bloqueantes)
// =============================================================================
import { logger } from "./logger.js";
import { handleError, handleWarn } from "./errorHandler.js";
import { initResponsiveUI } from "./responsive.js";
import { perfLog, OPTIMIZATION_CONFIG } from "./optimizationConstants.js";
import { collisionSystem } from "./collisionSystem.js";
import { registerSystem, setObject, getObject, installLegacyGlobals, initDebugFlagsFromUrl, exposeDebug } from "./gameState.js";
import { getSortedWorldObjects, GAME_WIDTH, GAME_HEIGHT, drawBackground, initializeWorld, drawBuildPreview, addAnimal, updateAnimals} from "./theWorld.js";
import { CharacterSelection } from "./thePlayer/characterSelection.js";
import { assets } from "./assetManager.js";
import { loadImages } from "./thePlayer/frames.js";
import { keys, setupControls, playerInteractionSystem, updatePlayerInteraction } from "./thePlayer/control.js";
import { setViewportSize, camera } from "./thePlayer/cameraSystem.js";
import { cssManager } from "./cssManager.js";
import { showLoadingScreen, updateLoadingProgress, hideLoadingScreen } from "./loadingScreen.js";
import { PlayerHUD } from "./thePlayer/playerHUD.js";

// =============================================================================
// VARIÁVEIS DE SISTEMAS LAZY LOADING
// Sistemas carregados sob demanda para otimizar tempo de inicialização
// =============================================================================

let currencyManager, merchantSystem, inventorySystem, playerSystem;
let itemSystem, worldUI, houseSystem, chestSystem, BuildSystem, wellSystem;
let WeatherSystem, drawWeatherEffects, drawWeatherUI;

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
  logger.info("Mobile detectado: Aplicando otimizações");

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
  logger.info("Inicializando sistemas críticos...");

  try {
    const ok = await loadCriticalSystems();
    if (!ok) return false;

    if (currencyManager?.init) currencyManager.init();
    if (merchantSystem?.init) merchantSystem.init();
    if (inventorySystem?.init) inventorySystem.init();

    await import("./animal/UiPanel.js");
    logger.debug("animal UiPanel carregado");

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
    if (window.interactionsBlocked) return;

    if (e.code === "KeyE") {
      window.playerInteractionSystem?.tryInteract?.();
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

    switch (originalType) {
      case "chest":
        chestSystem?.openChest?.(objectId);
        break;
      case "house":
        houseSystem?.openHouseMenu?.();
        break;
      case "well":
        wellSystem?.openWellMenu?.();
        break;
    }
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

  const animalType = "Bull";

  if (assets.animals && assets.animals[animalType]) {
    logger.debug(`Spawnando Animais (${animalType})...`);

    for (let i = 0; i < 5; i++) {
      const x = 1800 + Math.random() * 400;
      const y = 1800 + Math.random() * 400;
      addAnimal(animalType, assets.animals[animalType], x, y);
    }

    animalsInitialized = true;
  } else {
    handleWarn(`não foi possível spawnar animais: tipo '${animalType}' não encontrado`, "main:spawnGameAnimals");
  }
}

// =============================================================================
// CONFIGURAÇÃO DE EVENTOS DE SONO
// =============================================================================

function setupSleepListeners() {
  document.addEventListener("sleepStarted", () => {
    logger.info("SONO INICIADO: Bloqueando interações e congelando lógica");
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

    canvas.style.cursor = "wait";
  });

  document.addEventListener("sleepEnded", () => {
    logger.info("SONO TERMINADO: Restaurando interações");
    isSleeping = false;

    setTimeout(() => {
      sleepBlockedControls = false;

      if (preSleepInteractionState) {
        interactionEnabled = preSleepInteractionState.interactionEnabled;
      } else {
        interactionEnabled = true;
      }

      canvas.style.cursor = "default";

      window.theWorld?.markWorldChanged?.();

      if (window.playerHUD) {
        window.playerHUD.showNotification("Bom dia! Energias renovadas.", "success", 4000);
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
    console.log("Registrando sistemas no gameState...");

    try {
        // Registrar objetos do jogo
        setObject('canvas', canvas);
        setObject('ctx', ctx);
        setObject('currentPlayer', currentPlayer);
        setObject('keys', keys);

        // Registrar sistemas principais
        if (currencyManager) registerSystem('currency', currencyManager);
        if (merchantSystem) registerSystem('merchant', merchantSystem);
        if (inventorySystem) registerSystem('inventory', inventorySystem);
        if (playerSystem) registerSystem('player', playerSystem);

        // Registrar sistemas de interação
        if (itemSystem) registerSystem('item', itemSystem);
        if (worldUI) registerSystem('worldUI', worldUI);
        if (BuildSystem) registerSystem('build', BuildSystem);

        // Registrar sistema de clima
        if (WeatherSystem) registerSystem('weather', WeatherSystem);

        // Funções de clima ainda precisam ser expostas globalmente para compatibilidade
        window.drawWeatherEffects = drawWeatherEffects;
        window.drawWeatherUI = drawWeatherUI;

        // Instalar bridge de compatibilidade para window.* acessos legados
        installLegacyGlobals();

        // Inicializar flags de debug via URL
        initDebugFlagsFromUrl();

        // Expor debug se flag estiver habilitada
        exposeDebug();

        console.log("Sistemas registrados no gameState");
    } catch (error) {
        console.warn("Erro ao registrar sistemas:", error);
    }

    interactionEnabled = true;
    console.log("Interação Global habilitada");
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

    spawnGameAnimals();
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
      drawWeatherUI = weatherModule.drawWeatherUI;

      if (WeatherSystem && WeatherSystem.init) WeatherSystem.init();
    } catch (e) {
      handleWarn("falha ao carregar sistemas opcionais (house/weather)", "main:startFullGameLoad:optionalSystems", e);
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
// BOOTSTRAP DO JOGO
// =============================================================================

async function initGameBootstrap() {
  logger.info("Bootstrapping FarmingXP...");

  showLoadingScreen();
  updateLoadingProgress(0.02, "iniciando...");

  const loadingSteps = [
    { name: "Sprites do jogador", action: loadImages },
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

  const selection = new CharacterSelection();
  selection.show();

  setupInteractionSystem();

  gameInitialized = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  logger.info("Game Loop iniciado!");
}

// =============================================================================
// LISTENERS GLOBAIS
// =============================================================================

document.addEventListener("characterSelected", () => {
  startFullGameLoad();
});

document.addEventListener("playerReady", async (e) => {
  currentPlayer = e.detail.player;
  updatePlayer = e.detail.updateFunction;

  setupControls(currentPlayer);

  try {
    if (!playerSystem) await initializePlayerSystem();
  } catch (err) {
    handleWarn("falha ao inicializar player system", "main:playerReady:playerSystem", err);
  }

  logger.info("Jogador spawnado e pronto!");

  if (itemSystem && window.theWorld) {
    setTimeout(() => {
      const worldObjects = window.theWorld.getSortedWorldObjects?.(currentPlayer) || [];
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    try {
        console.log("Carregando estilos CSS...");
        await cssManager.loadAll();
        console.log("Todos os estilos CSS carregados");

        console.log("Criando PlayerHUD...");
        const hud = new PlayerHUD();
        registerSystem('hud', hud);
        console.log("PlayerHUD criado e registrado");
        
        setupSleepListeners();
        
        await initGameBootstrap();
    } catch (error) {
        console.error("Erro na inicialização do jogo:", error);
    }
});

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

    if (fps < 30 && OPTIMIZATION_CONFIG.LOG_PERFORMANCE) {
      perfLog(`FPS Baixo: ${fps}`);
    }
  }

  if (!simulationPaused) {
    try {
      if (WeatherSystem) WeatherSystem.update(deltaTime);
      if (merchantSystem) merchantSystem.update(deltaTime);

      updateAnimals();

      if (currentPlayer && updatePlayer && !sleepBlockedControls) {
        updatePlayer(deltaTime * 1000, keys);
        updatePlayerInteraction(currentPlayer.x, currentPlayer.y, currentPlayer.width, currentPlayer.height);
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
  } catch (err) {
    handleWarn("falha ao desenhar objetos do mundo", "main:gameLoop:drawObjects", err);
  }

  try {
    if (BuildSystem && drawBuildPreview) drawBuildPreview(ctx);
  } catch (e) {
    handleWarn("falha ao desenhar preview de construcao", "main:gameLoop:buildPreview", e);
  }

  if (window.DEBUG_HITBOXES && camera && allAssetsLoaded) {
    try {
      collisionSystem.drawHitboxes(ctx, camera);
      playerInteractionSystem?.drawInteractionRange?.(ctx, camera);
    } catch (e) {
      handleWarn("falha no debug de hitboxes", "main:gameLoop:debugHitboxes", e);
    }
  }

  if (!simulationPaused) {
    try {
      if (WeatherSystem && drawWeatherEffects) {
        drawWeatherEffects(ctx, currentPlayer, canvas);
        drawWeatherUI?.(ctx);
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

  try {
    if (window.playerHUD && currentPlayer) {
      window.playerHUD.render();
    }
  } catch (e) {
    handleWarn("falha ao renderizar player hud", "main:gameLoop:playerHUD", e);
  }

  if (!allAssetsLoaded) drawLoadingIndicator();

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

window.gameDebug = {
  getPerformance: () => ({ fps, coreAssetsLoaded, worldAssetsLoaded, isSleeping, simulationPaused }),
  forceLoadAll: async () => {
    await assets.loadAll();
    allAssetsLoaded = true;
    worldAssetsLoaded = true;
    spawnGameAnimals();
  },
  triggerSleep: () => document.dispatchEvent(new CustomEvent("sleepStarted")),
  wakeUp: () => document.dispatchEvent(new CustomEvent("sleepEnded")),
  spawnAnimals: function (count = 5, type = "Turkey") {
    if (!assets.animals || !assets.animals[type]) {
      logger.error(`Tipo de animal "${type}" não encontrado. Tipos disponíveis:`, Object.keys(assets.animals || {}));
      return;
    }

    logger.debug(`Spawnando ${count} animais do tipo ${type}...`);

    const WORLD_BOUNDS = { minX: 100, maxX: 1200, minY: 100, maxY: 700 };

    for (let i = 0; i < count; i++) {
      const x = WORLD_BOUNDS.minX + Math.random() * (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX);
      const y = WORLD_BOUNDS.minY + Math.random() * (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY);
      addAnimal(type, assets.animals[type], x, y);
    }

    logger.debug(`${count} animais do tipo ${type} spawnados!`);
    window.theWorld?.markWorldChanged?.();
  },
  clearAnimals: function () {
    if (window.theWorld && window.theWorld.animals) {
      const count = window.theWorld.animals.length;
      window.theWorld.animals.length = 0;
      logger.debug(`${count} animais removidos do mundo`);
      window.theWorld.markWorldChanged?.();
    }
  },
  listAnimals: function () {
    if (window.theWorld && window.theWorld.animals) {
      logger.debug(`Animais no mundo (${window.theWorld.animals.length}):`);
      let index = 0;
      for (const animal of window.theWorld.animals) {
        logger.debug(`  ${index + 1}. ${animal.assetName || "Animal"} em (${Math.round(animal.x)}, ${Math.round(animal.y)})`);
        index++;
      }
    }
  },
};

window.debugItem = async (id) => {
  if (!inventorySystem) await initializeInventorySystem();
  const itemsModule = await import("./item.js");
  const items = itemsModule.items;
  const item = items.find((i) => i.id === Number(id));
  if (!item) return logger.error("Item não existe:", id);
  inventorySystem.addItem(item.id, 1);
  logger.debug(`Debug: Adicionado ${item.name}`);
};

// DEBUG_HITBOXES agora é gerenciado via gameState.js (use ?hitboxes=1 na URL)

logger.info("main.js completo carregado!");
