import { logger } from './logger.js';

/**
 * Gerenciador de telas de carregamento do jogo
 * Controla loading inicial, tela de sono e otimizações
 * Gerencia bloqueio de interações durante transições
 * @class LoadingScreenManager
 */
class LoadingScreenManager {
    /**
     * Construtor do gerenciador de telas de carregamento
     * Inicializa referências para telas e estado de progresso
     */
    constructor() {
        this.currentScreen = null;
        this.sleepScreen = null;
        this.sleepProgress = 0;
    }

    /**
     * Exibe a tela de carregamento inicial do jogo
     * Cria interface com barra de progresso, mensagens e animações
     * Previne criação duplicada verificando existência
     * @returns {HTMLElement|undefined} Elemento da tela de loading ou undefined se já existe
     */
    showInitialLoading() {
        // Evita duplicatas
        if (document.getElementById("initial-loading-screen")) return;

        const loadingScreen = document.createElement("div");
        loadingScreen.id = "initial-loading-screen";
        loadingScreen.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
            color: #fff; display: flex; flex-direction: column;
            justify-content: center; align-items: center; z-index: 10000;
            font-family: 'Courier New', monospace; user-select: none;
        `;
        
        loadingScreen.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <h1 style="color: #4ecca3; font-size: 3em; margin-bottom: 20px; text-shadow: 0 0 10px rgba(78, 204, 163, 0.5);">
                    FarmingXP
                </h1>
                <p style="color: #e0bc87; font-size: 1.2em; margin-bottom: 40px;">Preparando sua fazenda...</p>
                <div style="width: 300px; height: 20px; background: #2e1c0f; border-radius: 10px; overflow: hidden; margin: 20px auto;">
                    <div id="initial-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4ecca3, #3da58a); transition: width 0.3s;"></div>
                </div>
                <p id="initial-loading-message" style="margin: 20px 0; color: #c9a463; min-height: 1.5em;"></p>
                <div style="display: flex; justify-content: center; gap: 10px; margin-top: 40px;">
                    <div class="loading-dot" style="width: 12px; height: 12px; background: #4ecca3; border-radius: 50%; animation: loadingPulse 1.5s infinite;"></div>
                    <div class="loading-dot" style="width: 12px; height: 12px; background: #4ecca3; border-radius: 50%; animation: loadingPulse 1.5s infinite 0.2s;"></div>
                    <div class="loading-dot" style="width: 12px; height: 12px; background: #4ecca3; border-radius: 50%; animation: loadingPulse 1.5s infinite 0.4s;"></div>
                </div>
            </div>
            <style>
                @keyframes loadingPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
            </style>
        `;
        
        document.body.appendChild(loadingScreen);
        this.currentScreen = loadingScreen;
        return loadingScreen;
    }

    /**
     * Atualiza o progresso da tela de carregamento inicial
     * Modifica barra de progresso e mensagem exibida
     * @param {number} progress - Progresso de 0 a 1
     * @param {string} [message=''] - Mensagem a ser exibida
     * @returns {void}
     */
    updateInitialProgress(progress, message = "") {
        const progressBar = document.getElementById('initial-progress-bar');
        const messageEl = document.getElementById('initial-loading-message');
        if (progressBar) progressBar.style.width = `${Math.min(100, progress * 100)}%`;
        if (messageEl && message) messageEl.textContent = message;
    }

    /**
     * Remove a tela de carregamento inicial com animação de fade
     * Aplica transição suave de 0.8s antes de remover do DOM
     * @returns {void}
     */
    hideInitialLoading() {
        const loadingScreen = document.getElementById('initial-loading-screen');
        if (loadingScreen) {
            loadingScreen.style.transition = 'opacity 0.8s, transform 0.8s';
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transform = 'scale(1.1)';
            setTimeout(() => { if (loadingScreen.parentNode) loadingScreen.parentNode.removeChild(loadingScreen); }, 800);
        }
        this.currentScreen = null;
    }

    /**
     * Exibe tela de carregamento durante o sono do jogador
     * Cria interface animada com barra de progresso, timer e status de otimizações
     * Inicia automaticamente simulação de otimizações sincronizada com duração
     * @param {number} [durationSeconds=5] - Duração do sono em segundos
     * @returns {HTMLElement} Elemento da tela de sono
     */
    showSleepLoading(durationSeconds = 5) {
        if (this.sleepScreen) this.hideSleepLoading();
        
        this.sleepScreen = document.createElement("div");
        this.sleepScreen.id = "sleep-loading-screen";
        this.sleepScreen.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
            color: #fff; display: flex; flex-direction: column;
            justify-content: center; align-items: center; z-index: 9999;
            font-family: 'Courier New', monospace; opacity: 0; transition: opacity 1s;
        `;
        
        this.sleepScreen.innerHTML = `
            <div style="text-align: center; padding: 40px; background: rgba(10, 10, 26, 0.9); 
                        border-radius: 20px; border: 3px solid #4ecca3; max-width: 600px; 
                        box-shadow: 0 0 40px rgba(78, 204, 163, 0.3);">
                <div style="font-size: 5em; margin-bottom: 20px; animation: float 3s infinite ease-in-out;">💤</div>
                <h2 style="color: #4ecca3; margin-bottom: 30px; font-size: 2em;">Repouso Restaurador</h2>
                
                <div style="background: rgba(46, 28, 15, 0.5); border-radius: 15px; padding: 20px; margin: 20px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #e0bc87;">Progresso</span>
                        <span id="sleep-time-remaining" style="color: #c9a463;">${durationSeconds}s</span>
                    </div>
                    <div style="width: 100%; height: 25px; background: #2e1c0f; border-radius: 12px; overflow: hidden;">
                        <div id="sleep-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4ecca3, #3da58a, #4ecca3); background-size: 200% 100%; animation: gradientShift 2s infinite linear; transition: width 0.5s;"></div>
                    </div>
                </div>
                
                <div id="sleep-message-container" style="min-height: 60px; margin: 20px 0;">
                    <p id="sleep-main-message" style="font-size: 1.3em; color: #e0bc87; margin: 10px 0;">Adormecendo...</p>
                    <p id="sleep-detail-message" style="font-size: 1em; color: #c9a463; margin: 5px 0;">Fechando os olhos...</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 30px 0;">
                    <div class="optimization-card" style="background: rgba(78, 204, 163, 0.1); padding: 15px; border-radius: 10px; border-left: 4px solid #4ecca3;">
                        <div style="color: #4ecca3; font-weight: bold;">Cache</div>
                        <div id="cache-status" style="color: #e0bc87; font-size: 0.9em;">Aguardando...</div>
                    </div>
                    <div class="optimization-card" style="background: rgba(233, 196, 106, 0.1); padding: 15px; border-radius: 10px; border-left: 4px solid #e9c46a;">
                        <div style="color: #e9c46a; font-weight: bold;">Memória</div>
                        <div id="memory-status" style="color: #e0bc87; font-size: 0.9em;">Aguardando...</div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
                @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .optimization-card { animation: fadeIn 0.5s forwards; opacity: 0; }
                .optimization-card:nth-child(1) { animation-delay: 0.2s; } .optimization-card:nth-child(2) { animation-delay: 0.4s; }
            </style>
        `;
        
        document.body.appendChild(this.sleepScreen);
        setTimeout(() => { this.sleepScreen.style.opacity = '1'; }, 50);
        
        // Iniciar simulação de otimização sincronizada com o tempo
        this.startSleepOptimizations(durationSeconds);
        
        return this.sleepScreen;
    }

    /**
     * Atualiza o progresso e mensagens da tela de sono
     * @param {number} progress - Progresso de 0 a 1
     * @param {string} mainMessage - Mensagem principal a ser exibida
     * @param {string} detailMessage - Mensagem de detalhe a ser exibida
     * @returns {void}
     */
    updateSleepProgress(progress, mainMessage, detailMessage) {
        this.sleepProgress = progress;
        const progressBar = document.getElementById('sleep-progress-bar');
        const mainMsgEl = document.getElementById('sleep-main-message');
        const detailMsgEl = document.getElementById('sleep-detail-message');
        
        if (progressBar) progressBar.style.width = `${Math.min(100, progress * 100)}%`;
        if (mainMsgEl && mainMessage) mainMsgEl.textContent = mainMessage;
        if (detailMsgEl && detailMessage) detailMsgEl.textContent = detailMessage;
    }

    /**
     * Inicia simulação de otimizações durante o sono
     * Divide duração em etapas com mensagens progressivas
     * Atualiza interface com status de cache e memória
     * Executa otimizações reais ao final
     * @param {number} durationSeconds - Duração total em segundos
     * @returns {void}
     */
    startSleepOptimizations(durationSeconds) {
        const steps = [
            { t: 0.1, main: "Adormecendo...", detail: "O mundo fica silencioso", cache: "Aguardando", mem: "Aguardando" },
            { t: 0.3, main: "Sono Profundo", detail: "Recuperando energia...", cache: "Limpando...", mem: "Analisando..." },
            { t: 0.6, main: "Otimizando", detail: "Reorganizando pensamentos...", cache: "Liberando...", mem: "Compactando..." },
            { t: 0.9, main: "Quase lá", detail: "O sol está nascendo...", cache: "Limpo", mem: "Otimizado" },
            { t: 1.0, main: "Despertando", detail: "Bom dia!", cache: "Pronto", mem: "Pronto" }
        ];

        let currentStepIndex = 0;
        const intervalTime = (durationSeconds * 1000) / steps.length;

        const interval = setInterval(() => {
            if (currentStepIndex >= steps.length) {
                clearInterval(interval);
                this.performFinalOptimizations();
                return;
            }
            
            const s = steps[currentStepIndex];
            this.updateSleepProgress(s.t, s.main, s.detail);
            
            const cacheEl = document.getElementById('cache-status');
            const memEl = document.getElementById('memory-status');
            if (cacheEl) cacheEl.textContent = s.cache;
            if (memEl) memEl.textContent = s.mem;

            // Atualiza o timer visual
            const timerEl = document.getElementById('sleep-time-remaining');
            if(timerEl) {
                const remaining = Math.max(0, Math.ceil(durationSeconds * (1 - s.t)));
                timerEl.textContent = `${remaining}s`;
            }

            currentStepIndex++;
        }, intervalTime);
    }

    /**
     * Executa otimizações finais ao completar o sono
     * Limpa arrays de partículas de clima
     * Força garbage collection se disponível (requer Chrome flag)
     * Dispara evento de conclusão para outros sistemas
     * @returns {void}
     */
    performFinalOptimizations() {
        logger.debug("Executando Garbage Collection simulado e Limpeza de Arrays...");

        // 1. Limpar arrays de partículas e efeitos
        if (window.WeatherSystem) {
            window.WeatherSystem.rainParticles = [];
            window.WeatherSystem.snowParticles = [];
        }

        // 2. Tentar forçar GC se disponível (Chrome flag)
        if (window.gc) { window.gc(); }

        // 3. Notificar sistema
        document.dispatchEvent(new CustomEvent('sleepOptimizationsComplete'));
    }

    /**
     * Remove a tela de sono com animação de fade
     * Aplica transição suave de 0.8s antes de remover do DOM
     * @returns {void}
     */
    hideSleepLoading() {
        if (this.sleepScreen) {
            this.sleepScreen.style.opacity = '0';
            this.sleepScreen.style.transform = 'scale(1.1)';
            setTimeout(() => {
                if (this.sleepScreen && this.sleepScreen.parentNode) {
                    this.sleepScreen.parentNode.removeChild(this.sleepScreen);
                }
                this.sleepScreen = null;
            }, 800);
        }
    }

    /**
     * Bloqueia todas as interações do usuário com a página
     * Define pointer-events como none e flag global
     * @returns {void}
     */
    blockInteractions() {
        document.body.style.pointerEvents = 'none';
        window.interactionsBlocked = true;
    }

    /**
     * Desbloqueia interações do usuário com a página
     * Restaura pointer-events e limpa flag global
     * @returns {void}
     */
    unblockInteractions() {
        document.body.style.pointerEvents = 'all';
        window.interactionsBlocked = false;
    }
}

/**
 * Instância singleton do gerenciador de loading
 * @type {LoadingScreenManager}
 */
const loadingManager = new LoadingScreenManager();

/**
 * Exibe a tela de carregamento inicial
 * @function
 * @returns {HTMLElement|undefined}
 */
export const showLoadingScreen = () => loadingManager.showInitialLoading();

/**
 * Atualiza progresso do loading inicial
 * @function
 * @param {number} p - Progresso (0-1)
 * @param {string} m - Mensagem
 * @returns {void}
 */
export const updateLoadingProgress = (p, m) => loadingManager.updateInitialProgress(p, m);

/**
 * Remove tela de loading inicial
 * @function
 * @returns {void}
 */
export const hideLoadingScreen = () => loadingManager.hideInitialLoading();

/**
 * Exibe tela de sono
 * @function
 * @param {number} d - Duração em segundos
 * @returns {HTMLElement}
 */
export const showSleepLoading = (d) => loadingManager.showSleepLoading(d);

/**
 * Remove tela de sono
 * @function
 * @returns {void}
 */
export const hideSleepLoading = () => loadingManager.hideSleepLoading();

/**
 * Bloqueia interações
 * @function
 * @returns {void}
 */
export const blockInteractions = () => loadingManager.blockInteractions();

/**
 * Desbloqueia interações
 * @function
 * @returns {void}
 */
export const unblockInteractions = () => loadingManager.unblockInteractions();

export default loadingManager;