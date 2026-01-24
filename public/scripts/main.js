/**
 * @file main.js - Arquivo principal do jogo FarmingXP
 * Sistema de inicialização por etapas com carregamento lazy e otimizações de performance
 * Gerencia game loop, sistemas críticos, animais, sleep mode e debug
 */

// =============================================================================
// IMPORTAÇÕES ESSENCIAIS (não bloqueantes)
// =============================================================================

import { initResponsiveUI } from "./responsive.js";
import { perfLog, OPTIMIZATION_CONFIG } from "./optimizationConstants.js";
import { collisionSystem } from "./collisionSystem.js";
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

/**
 * Contexto 2D do canvas (alpha desabilitado para performance)
 * @type {CanvasRenderingContext2D}
 */
let ctx;

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
    if (!canvas) return;
    
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
        const interactionModule = await import("./interactionSystem.js");
        itemSystem = interactionModule.itemSystem;
        worldUI = interactionModule.worldUI;

        const buildModule = await import("./buildSystem.js");
        BuildSystem = buildModule.BuildSystem;

        const playerSystemModule = await import("./playerSystem.js");
        playerSystem = playerSystemModule.playerSystem;

        const currencyModule = await import("./currencyManager.js");
        currencyManager = currencyModule.currencyManager;

        const merchantModule = await import("./merchantSystem.js");
        merchantSystem = merchantModule.merchantSystem;

        const inventoryModule = await import("./thePlayer/inventorySystem.js");
        inventorySystem = inventoryModule.inventorySystem;

        criticalSystemsLoaded = true;
        return true;
    } catch (e) {
        console.warn("Falha ao carregar sistemas críticos:", e);
        return false;
    }
}

/**
 * Inicializa sistemas essenciais que devem estar prontos antes do jogo começar
 * @async
 * @returns {Promise<boolean>} True se inicialização bem-sucedida, false caso contrário
 */
async function initializeCriticalSystems() {
    console.log("Inicializando sistemas críticos...");
    
    try {
        // Carregar sistemas críticos
        await loadCriticalSystems();
        
        // Inicializar sistemas se tiverem método init
        if (currencyManager && currencyManager.init) currencyManager.init();
        if (merchantSystem && merchantSystem.init) merchantSystem.init();
        if (inventorySystem && inventorySystem.init) inventorySystem.init();
        
        // 4. Animal UI Panel (oval + botões + menus)
        await import("./animal/UiPanel.js");
        console.log("animal UiPanel carregado");
        
        return true;
    } catch (error) {
        console.error("Falha ao carregar sistemas críticos:", error);
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
    console.log("InventorySystem pronto");
    return inventorySystem;
}

/**
 * Inicializa o sistema de comerciante
 * Carrega módulo sob demanda se ainda não carregado
 * @async
 * @returns {Promise<Object>} Instância do merchantSystem
 */
async function initializeMerchantSystem() {
    if (!merchantSystem) {
        const module = await import("./merchant.js");
        merchantSystem = module.merchantSystem;
    }
    console.log("MerchantSystem pronto");
    return merchantSystem;
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
    // Listener para tecla E
    document.addEventListener("keydown", (e) => {
        if (!interactionEnabled) return;
        if (sleepBlockedControls) return;
        if (window.interactionsBlocked) return;

        if (e.code === "KeyE") {
            if (window.playerInteractionSystem && window.playerInteractionSystem.tryInteract) {
                window.playerInteractionSystem.tryInteract();
            }
        }
    });
    
    // Listener para evento playerInteract (interação com objetos específicos)
    document.addEventListener("playerInteract", async (e) => {
        if (!interactionEnabled || isSleeping) return;
        
        const { objectId, originalType } = e.detail || {};
        
        // Carregamento Lazy de sistemas específicos de interação
        if (!chestSystem && originalType === "chest") {
            try {
                const module = await import("./chestSystem.js");
                chestSystem = module.chestSystem;
            } catch (error) { console.warn("Erro chestSystem:", error); return; }
        }
        
        if (!houseSystem && originalType === "house") {
            try {
                const module = await import("./houseSystem.js");
                houseSystem = module.houseSystem;
            } catch (error) { console.warn("Erro houseSystem:", error); return; }
        }
        
        if (!wellSystem && originalType === "well") {
            try {
                const module = await import("./wellSystem.js");
                wellSystem = module.wellSystem;
            } catch (error) { console.warn("Erro wellSystem:", error); return; }
        }
        
        // Executar Interação
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
 * Cria 5 animais próximos à casa do jogador para facilitar teste
 * Previne spawn duplicado através da flag animalsInitialized
 * @returns {void}
 */
function spawnGameAnimals() {
    if (animalsInitialized) return;
    
    const animalType = "Bull"; 

    if (assets.animals && assets.animals[animalType]) {
        console.log(`Spawnando Animais (${animalType})...`);
        
        for (let i = 0; i < 5; i++) {
            // Spawn próximo à posição inicial (para teste fácil)
            const x = 1800 + Math.random() * 400;
            const y = 1800 + Math.random() * 400;
            addAnimal(animalType, assets.animals[animalType], x, y);
        }
        
        animalsInitialized = true;
    } else {
        console.warn(`Não foi possível spawnar animais: Tipo '${animalType}' não encontrado nos assets.`);
    }
}

// =============================================================================
// CONFIGURAÇÃO DE EVENTOS DE SONO
// =============================================================================

/**
 * Configura listeners para eventos do sistema de sleep
 * Gerencia três eventos principais:
 * - sleepStarted: Bloqueia controles e congela lógica
 * - sleepEnded: Restaura estado e reativa controles
 * - sleepOptimizationsComplete: Log de conclusão de otimizações
 * @returns {void}
 */
function setupSleepListeners() {
    // 1. INÍCIO DO SONO
    document.addEventListener("sleepStarted", (e) => {
        console.log("SONO INICIADO: Bloqueando interações e congelando lógica");
        isSleeping = true;
        sleepBlockedControls = true;
        
        preSleepInteractionState = {
            keys: {...keys},
            interactionEnabled: interactionEnabled,
            playerMoving: currentPlayer?.isMoving || false
        };
        
        interactionEnabled = false;
        Object.keys(keys).forEach(key => { keys[key] = false; });
        
        if (currentPlayer) {
            currentPlayer.isMoving = false;
            currentPlayer.wasMoving = false;
            currentPlayer.direction = 'down';
        }
        
        canvas.style.cursor = 'wait';
    });
    
    // 2. FIM DO SONO
    document.addEventListener("sleepEnded", (e) => {
        console.log("SONO TERMINADO: Restaurando interações");
        isSleeping = false;
        
        setTimeout(() => {
            sleepBlockedControls = false;
            
            if (preSleepInteractionState) {
                interactionEnabled = preSleepInteractionState.interactionEnabled;
            } else {
                interactionEnabled = true;
            }
            
            canvas.style.cursor = 'default';
            
            if (window.theWorld && window.theWorld.markWorldChanged) {
                window.theWorld.markWorldChanged();
            }
            
            if (window.playerHUD) {
                window.playerHUD.showNotification("Bom dia! Energias renovadas.", "success", 4000);
            }
            
            preSleepInteractionState = null;
        }, 500);
    });
    
    // 3. OTIMIZAÇÕES
    document.addEventListener("sleepOptimizationsComplete", () => {
        console.log("Otimizações de sono concluídas");
        if (window.performance && window.performance.memory) {
            const mem = window.performance.memory;
            console.log(`Memória Heap: ${Math.round(mem.usedJSHeapSize / 1024 / 1024)}MB`);
        }
    });
}

// =============================================================================
// EXPOSIÇÃO DE GLOBAIS
// =============================================================================

/**
 * Expõe sistemas ao escopo global (window) para acesso de outros módulos
 * Carrega sistemas essenciais imediatamente e secundários em background
 * Habilita interação global após conclusão
 * Cria função debug para adicionar itens
 * @async
 * @returns {Promise<void>}
 */
async function exposeGlobals() {
    console.log("Expondo globais...");
    
    try {
        window.canvas = canvas;
        window.ctx = ctx;
        window.currentPlayer = currentPlayer;
        window.keys = keys;

        window.currencyManager = currencyManager;
        window.merchantSystem = merchantSystem;
        window.inventorySystem = inventorySystem;
        window.playerSystem = playerSystem;

        window.itemSystem = itemSystem;
        window.worldUI = worldUI;
        window.BuildSystem = BuildSystem;

        window.WeatherSystem = WeatherSystem;
        window.drawWeatherEffects = drawWeatherEffects;
        window.drawWeatherUI = drawWeatherUI;

        console.log("Globais expostos");
    } catch (error) { 
        console.warn("Erro ao expor globais:", error); 
    }

    interactionEnabled = true;
    console.log("Interação Global habilitada");
}

// =============================================================================
// FLUXO: SELEÇÃO DE PERSONAGEM -> LOADING -> START
// =============================================================================

/**
 * Carrega completamente o jogo após seleção do personagem
 * Executa em etapas: mundo, animais, sistemas, interface
 * @async
 * @returns {Promise<void>}
 */
async function startFullGameLoad() {
    if (gameStartInProgress || gameStarted) return;
    gameStartInProgress = true;

    simulationPaused = true;
    interactionEnabled = false;
    Object.keys(keys).forEach(k => { keys[k] = false; });

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
        updateLoadingProgress(0.80, "carregando interface...");

        try {
            const ui = await import("./thePlayer/inventoryUI.js");
            ui.initInventoryUI();
        } catch (e) {}

        try {
            const houseModule = await import("./houseSystem.js");
            houseSystem = houseModule.houseSystem;

            const weatherModule = await import("./weather.js");
            WeatherSystem = weatherModule.WeatherSystem;
            drawWeatherEffects = weatherModule.drawWeatherEffects;
            drawWeatherUI = weatherModule.drawWeatherUI;

            if (WeatherSystem && WeatherSystem.init) WeatherSystem.init();
        } catch (e) {}

        updateLoadingProgress(1, "pronto");
        hideLoadingScreen();

        gameStarted = true;
        simulationPaused = false;
        interactionEnabled = true;
        lastTime = performance.now();
    } finally {
        gameStartInProgress = false;
    }
}

// =============================================================================
// BOOTSTRAP DO JOGO
// =============================================================================

/**
 * Função principal de inicialização do jogo
 * Executa sequencialmente:
 * 1. Carregamento de sprites e assets core
 * 2. Inicialização de UI responsiva
 * 3. Criação do mundo base
 * 4. Carregamento de sistemas críticos
 * 5. Reaplicação de hitboxes (importante para configurações atualizadas)
 * 6. Exibição de seleção de personagem
 * 7. Início do game loop
 * @async
 * @returns {Promise<void>}
 */
async function initGameBootstrap() {
    console.log("Bootstrapping FarmingXP...");
    
    showLoadingScreen();
    updateLoadingProgress(0.02, "iniciando...");

    const loadingSteps = [
        { name: "Sprites do jogador", action: loadImages },
        { name: "Assets core", action: () => assets.loadCore() },
        { name: "Interface responsiva", action: initResponsiveUI },
        { name: "Mundo base", action: initializeWorld },
        { name: "Sistemas críticos", action: initializeCriticalSystems }
    ];

    // Executar sequencialmente
    for (const step of loadingSteps) {
        try {
            await step.action?.();
            console.log(`${step.name} concluído`);
            updateLoadingProgress((loadingSteps.indexOf(step) + 1) / (loadingSteps.length + 1) * 0.6, step.name);
        } catch (error) { 
            console.warn(`${step.name} falhou:`, error); 
        }
    }

    // Reaplicar hitboxes das árvores
    if (typeof collisionSystem.reapplyHitboxesForType === 'function') {
        try {
            collisionSystem.reapplyHitboxesForType("TREE");
            console.log("collisionSystem: reaplicadas hitboxes do tipo TREE");
        } catch (err) {
            console.warn("Falha ao reaplicar hitboxes TREE:", err);
        }
    } else {
        console.log("collisionSystem.reapplyHitboxesForType não disponível");
    }

    coreAssetsLoaded = true;
    criticalSystemsLoaded = true;

    hideLoadingScreen();

    // travar simulação até seleção de personagem
    simulationPaused = true;
    interactionEnabled = false;

    // Mostrar seleção de personagem
    const selection = new CharacterSelection();
    selection.show();

    setupInteractionSystem();

    // Iniciar Game Loop
    gameInitialized = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
    console.log("Game Loop iniciado!");
}

// =============================================================================
// LISTENERS GLOBAIS
// =============================================================================

/**
 * Listener para evento characterSelected
 * Disparado quando jogador seleciona um personagem
 * Inicia carregamento completo do jogo
 * @listens document#characterSelected
 */
document.addEventListener("characterSelected", () => {
    startFullGameLoad();
});

/**
 * Listener para evento playerReady
 * Disparado quando jogador é criado e está pronto
 * Configura controles e registra objetos interativos
 * @listens document#playerReady
 */
document.addEventListener("playerReady", async (e) => {
    currentPlayer = e.detail.player;
    updatePlayer = e.detail.updateFunction;
    
    setupControls(currentPlayer);
    
    try {
        if (!playerSystem) await initializePlayerSystem();
    } catch (e) {}
    
    console.log("Jogador spawnado e pronto!");
    
    if (itemSystem && window.theWorld) {
        setTimeout(() => {
            const worldObjects = window.theWorld.getSortedWorldObjects?.(currentPlayer) || [];
            itemSystem.registerInteractiveObjects(worldObjects);
        }, 100);
    }
    
    try {
        await exposeGlobals();
    } catch (e) {}
});

/**
 * Listener para DOMContentLoaded
 * Primeiro evento disparado no carregamento da página
 * Carrega CSS, cria HUD, configura sleep listeners e inicia bootstrap
 * @listens document#DOMContentLoaded
 */
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
        window.playerHUD = new PlayerHUD();
        console.log("PlayerHUD criado");
        
        setupSleepListeners();
        
        await initGameBootstrap();
    } catch (error) {
        console.error("Erro na inicialização do jogo:", error);
    }
});

// =============================================================================
// GAME LOOP PRINCIPAL
// =============================================================================

/**
 * Loop principal do jogo executado a cada frame
 * Processa três fases principais:
 * 1. UPDATE: Atualiza lógica (weather, animais, jogador)
 * 2. DRAW: Renderiza visual (fundo, objetos, efeitos)
 * 3. UI: Renderiza interface e debug
 * 
 * Durante sleep mode, renderiza apenas tela preta e efeitos de clima
 * @param {DOMHighResTimeStamp} timestamp - Timestamp atual em ms
 * @returns {void}
 */
function gameLoop(timestamp) {
    if (!gameInitialized) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Calcular Delta Time
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // TRATAMENTO DO ESTADO DE SONO
    if (isSleeping) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (WeatherSystem && WeatherSystem.update) {
            WeatherSystem.update(deltaTime);
            if (drawWeatherEffects) {
                drawWeatherEffects(ctx, currentPlayer, canvas);
            }
        }

        requestAnimationFrame(gameLoop);
        return;
    }

    // CÁLCULO DE FPS
    frameCount++;
    if (timestamp >= lastFpsUpdate + 1000) {
        fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = timestamp;
        
        if (fps < 30 && OPTIMIZATION_CONFIG.LOG_PERFORMANCE) {
            perfLog(`FPS Baixo: ${fps}`);
        }
    }

    // UPDATE LÓGICO (somente se simulação não estiver pausada)
    if (!simulationPaused) {
        try {
            if (WeatherSystem) WeatherSystem.update(deltaTime);
            if (merchantSystem) merchantSystem.update(deltaTime);
            
            updateAnimals();
            
            if (currentPlayer && updatePlayer && !sleepBlockedControls) {
                updatePlayer(deltaTime * 1000, keys);
                updatePlayerInteraction(
                    currentPlayer.x,
                    currentPlayer.y,
                    currentPlayer.width,
                    currentPlayer.height
                );
            }
        } catch (e) {
            console.warn("Erro no loop de update:", e);
        }
    }

    // UPDATE VISUAL (DRAW)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Fundo
    try {
        if (drawBackground) drawBackground(ctx);
        else {
            ctx.fillStyle = '#5a9367';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } catch (e) {}

    // 2. Objetos do Mundo
    try {
        const objects = getSortedWorldObjects?.(currentPlayer) || [];
        const objectsToDraw = worldAssetsLoaded ? objects : 
            objects.filter(obj => obj.type === 'PLAYER' || obj.type === 'FLOOR' || obj.originalType === 'chest');
        
        objectsToDraw.forEach(o => {
            if (o && o.draw) o.draw(ctx);
        });
    } catch (err) {}

    // 3. Preview de Construção
    try {
        if (BuildSystem && drawBuildPreview) drawBuildPreview(ctx);
    } catch (e) {}

    // 4. Debug Hitboxes
    if (window.DEBUG_HITBOXES && camera && allAssetsLoaded) {
        try {
            collisionSystem.drawHitboxes(ctx, camera);
            playerInteractionSystem?.drawInteractionRange?.(ctx, camera);
        } catch (e) {}
    }

    // 5. Clima e Efeitos Visuais (somente se não estiver pausado)
    if (!simulationPaused) {
        try {
            if (WeatherSystem && drawWeatherEffects) {
                drawWeatherEffects(ctx, currentPlayer, canvas);
                drawWeatherUI(ctx);
            }
        } catch (e) {}
    }

    // 6. UI do Mundo (somente se não estiver pausado)
    if (!simulationPaused) {
        try {
            if (worldUI && itemSystem && currentPlayer && !sleepBlockedControls) {
                worldUI.render(ctx, itemSystem.interactiveObjects, currentPlayer);
            }
        } catch (e) {}
    }

    // 7. HUD do Jogador
    try {
        if (window.playerHUD && currentPlayer) {
            window.playerHUD.render();
        }
    } catch (e) {}

    // 8. Loading Indicator
    if (!allAssetsLoaded) {
        drawLoadingIndicator();
    }

    requestAnimationFrame(gameLoop);
}

// =============================================================================
// INDICADOR DE CARREGAMENTO
// =============================================================================

/**
 * Desenha indicador de carregamento no canto do canvas
 * Mostra estado atual de carregamento e FPS
 * @returns {void}
 */
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
// OTIMIZAÇÕES MOBILE
// =============================================================================

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    console.log("Mobile detectado: Aplicando otimizações");
    if (ctx.imageSmoothingEnabled !== undefined) {
        ctx.imageSmoothingEnabled = false;
    }
    
    // Throttling de FPS para economizar bateria
    let lastFrameTime = 0;
    const mobileFPS = 30;
    const frameInterval = 1000 / mobileFPS;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    
    window.requestAnimationFrame = function(callback) {
        const currentTime = performance.now();
        const timeSinceLast = currentTime - lastFrameTime;
        if (timeSinceLast >= frameInterval) {
            lastFrameTime = currentTime - (timeSinceLast % frameInterval);
            originalRequestAnimationFrame(callback);
        } else {
            setTimeout(() => { window.requestAnimationFrame(callback); }, frameInterval - timeSinceLast);
        }
    };
}

// =============================================================================
// DEBUG EXPORTS
// =============================================================================

/**
 * Objeto global de debug com utilitários para desenvolvimento
 * @namespace gameDebug
 * @property {Function} getPerformance - Retorna métricas de performance
 * @property {Function} forceLoadAll - Força carregamento de todos assets
 * @property {Function} triggerSleep - Dispara evento de início de sono
 * @property {Function} wakeUp - Dispara evento de fim de sono
 * @property {Function} spawnAnimals - Spawna animais manualmente
 * @property {Function} clearAnimals - Remove todos animais do mundo
 * @property {Function} listAnimals - Lista animais atuais no console
 */
window.gameDebug = {
    getPerformance: () => ({ fps, coreAssetsLoaded, worldAssetsLoaded, isSleeping, simulationPaused }),
    forceLoadAll: async () => {
        await assets.loadAll();
        allAssetsLoaded = true;
        worldAssetsLoaded = true;
        spawnGameAnimals();
    },
    triggerSleep: () => document.dispatchEvent(new CustomEvent('sleepStarted')),
    wakeUp: () => document.dispatchEvent(new CustomEvent('sleepEnded')),
    spawnAnimals: function(count = 5, type = "Turkey") {
        if (!assets.animals || !assets.animals[type]) {
            console.error(`Tipo de animal "${type}" não encontrado. Tipos disponíveis:`, Object.keys(assets.animals || {}));
            return;
        }

        console.log(`Spawnando ${count} animais do tipo ${type}...`);
        
        const WORLD_BOUNDS = {
            minX: 100,
            maxX: 1200,
            minY: 100,
            maxY: 700
        };
        
        for (let i = 0; i < count; i++) {
            const x = WORLD_BOUNDS.minX + Math.random() * (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX);
            const y = WORLD_BOUNDS.minY + Math.random() * (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY);
            
            addAnimal(type, assets.animals[type], x, y);
        }
        
        console.log(`${count} animais do tipo ${type} spawnados!`);
        
        if (window.theWorld && window.theWorld.markWorldChanged) {
            window.theWorld.markWorldChanged();
        }
    },
    clearAnimals: function() {
        if (window.theWorld && window.theWorld.animals) {
            const count = window.theWorld.animals.length;
            window.theWorld.animals.length = 0;
            console.log(`${count} animais removidos do mundo`);
            
            if (window.theWorld.markWorldChanged) {
                window.theWorld.markWorldChanged();
            }
        }
    },
    listAnimals: function() {
        if (window.theWorld && window.theWorld.animals) {
            console.log(`Animais no mundo (${window.theWorld.animals.length}):`);
            window.theWorld.animals.forEach((animal, index) => {
                console.log(`  ${index + 1}. ${animal.assetName || 'Animal'} em (${Math.round(animal.x)}, ${Math.round(animal.y)})`);
            });
        }
    }
};

window.debugItem = async (id) => {
    if (!inventorySystem) await initializeInventorySystem();
    const itemsModule = await import("./item.js");
    const items = itemsModule.items;
    const item = items.find(i => i.id === Number(id));
    if (!item) return console.error("Item não existe:", id);
    // Use a API de addItem passando somente o ID do item e a quantidade.
    // O InventorySystem vai mapear o tipo para a categoria correta.
    inventorySystem.addItem(item.id, 1);
    console.log(`Debug: Adicionado ${item.name}`);
};

/**
 * Flag global para debug de hitboxes
 * Quando true, renderiza todas as hitboxes visualmente no jogo
 * @type {boolean}
 */
window.DEBUG_HITBOXES = false;

console.log("main.js completo carregado!");