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
    /**
     * Exibe a tela de carregamento inicial do jogo
     * CSS carregado externamente via style/loading.css
     */
    showInitialLoading() {
        // Evita duplicatas
        if (document.getElementById("initial-loading-screen")) return;

        const loadingScreen = document.createElement("div");
        loadingScreen.id = "initial-loading-screen";

        loadingScreen.innerHTML = `
            <div class="loading-content">
                <h1>FarmingXP</h1>
                <p class="loading-subtitle">Preparando sua fazenda...</p>
                <div class="loading-progress-container">
                    <div id="initial-progress-bar"></div>
                </div>
                <p id="initial-loading-message"></p>
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
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
    /**
     * Exibe tela de carregamento durante o sono do jogador
     * CSS carregado externamente via style/loading.css
     */
    showSleepLoading(durationSeconds = 5) {
        if (this.sleepScreen) this.hideSleepLoading();

        this.sleepScreen = document.createElement("div");
        this.sleepScreen.id = "sleep-loading-screen";

        this.sleepScreen.innerHTML = `
            <div class="sleep-content">
                <div class="sleep-emoji">💤</div>
                <h2 class="sleep-title">Repouso Restaurador</h2>

                <div class="sleep-progress-container">
                    <div class="sleep-progress-header">
                        <span>Progresso</span>
                        <span id="sleep-time-remaining">${durationSeconds}s</span>
                    </div>
                    <div class="sleep-progress-bar">
                        <div id="sleep-progress-bar"></div>
                    </div>
                </div>

                <div class="sleep-message-container">
                    <p id="sleep-main-message">Adormecendo...</p>
                    <p id="sleep-detail-message">Fechando os olhos...</p>
                </div>

                <div class="sleep-optimizations">
                    <div class="optimization-card">
                        <div class="card-title">Cache</div>
                        <div id="cache-status" class="card-status">Aguardando...</div>
                    </div>
                    <div class="optimization-card">
                        <div class="card-title">Memória</div>
                        <div id="memory-status" class="card-status">Aguardando...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.sleepScreen);
        setTimeout(() => { this.sleepScreen.classList.add('visible'); }, 50);

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
            this.sleepScreen.classList.remove('visible');
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