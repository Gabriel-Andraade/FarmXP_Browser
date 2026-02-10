import { logger } from './logger.js';
import { getSystem, setGameFlag } from './gameState.js';
import { t } from './i18n/i18n.js';

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
     * CSS carregado externamente via style/loading.css
     */
    showInitialLoading() {
        // Evita duplicatas
        if (document.getElementById("ldg-initial-screen")) return;

        const loadingScreen = document.createElement("div");
        loadingScreen.id = "ldg-initial-screen";

        loadingScreen.innerHTML = `
            <div class="ldg-content">
                <h1>FarmingXP</h1>
                <p class="ldg-subtitle">${t('loading.preparingFarm')}</p>
                <div class="ldg-progress-container">
                    <div id="ldg-initial-progress-bar"></div>
                </div>
                <p id="ldg-initial-message"></p>
                <div class="ldg-dots">
                    <div class="ldg-dot"></div>
                    <div class="ldg-dot"></div>
                    <div class="ldg-dot"></div>
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
        const progressBar = document.getElementById('ldg-initial-progress-bar');
        const messageEl = document.getElementById('ldg-initial-message');
        if (progressBar) progressBar.style.width = `${Math.min(100, progress * 100)}%`;
        if (messageEl && message) messageEl.textContent = message;
    }

    /**
     * Remove a tela de carregamento inicial com animação de fade
     * Aplica transição suave de 0.8s antes de remover do DOM
     * @returns {void}
     */
    hideInitialLoading() {
        const loadingScreen = document.getElementById('ldg-initial-screen');
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
     * CSS carregado externamente via style/loading.css
     */
    showSleepLoading(durationSeconds = 5) {
        if (this.sleepScreen) this.hideSleepLoading();

        this.sleepScreen = document.createElement("div");
        this.sleepScreen.id = "ldg-sleep-screen";

        this.sleepScreen.innerHTML = `
            <div class="ldg-sleep-content">
                <div class="ldg-sleep-emoji">💤</div>
                <h2 class="ldg-sleep-title">${t('sleep.title')}</h2>

                <div class="ldg-sleep-progress-container">
                    <div class="ldg-sleep-progress-header">
                        <span>${t('sleep.progress')}</span>
                        <span id="ldg-sleep-time-remaining">${durationSeconds}s</span>
                    </div>
                    <div class="ldg-sleep-progress-bar">
                        <div id="ldg-sleep-progress-bar"></div>
                    </div>
                </div>

                <div class="ldg-sleep-message-container">
                    <p id="ldg-sleep-main-message">${t('sleep.fallingAsleep')}</p>
                    <p id="ldg-sleep-detail-message">${t('sleep.closingEyes')}</p>
                </div>

                <div class="ldg-sleep-optimizations">
                    <div class="ldg-optimization-card">
                        <div class="ldg-card-title">${t('sleep.cache')}</div>
                        <div id="cache-status" class="ldg-card-status">${t('sleep.waiting')}</div>
                    </div>
                    <div class="ldg-optimization-card">
                        <div class="ldg-card-title">${t('sleep.memory')}</div>
                        <div id="memory-status" class="ldg-card-status">${t('sleep.waiting')}</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.sleepScreen);
        const screen = this.sleepScreen;
        setTimeout(() => {
          if (screen) screen.classList.add('visible');
        }, 50);

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
        const progressBar = document.getElementById('ldg-sleep-progress-bar');
        const mainMsgEl = document.getElementById('ldg-sleep-main-message');
        const detailMsgEl = document.getElementById('ldg-sleep-detail-message');

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
            { t: 0.1, main: t('sleep.fallingAsleep'), detail: t('sleep.worldQuiet'), cache: t('sleep.waiting'), mem: t('sleep.waiting') },
            { t: 0.3, main: t('sleep.deepSleep'), detail: t('sleep.recoveringEnergy'), cache: t('sleep.cleaning'), mem: t('sleep.analyzing') },
            { t: 0.6, main: t('sleep.optimizing'), detail: t('sleep.reorganizing'), cache: t('sleep.freeing'), mem: t('sleep.compacting') },
            { t: 0.9, main: t('sleep.almostThere'), detail: t('sleep.sunRising'), cache: t('sleep.clean'), mem: t('sleep.optimized') },
            { t: 1.0, main: t('sleep.awakening'), detail: t('sleep.goodMorning'), cache: t('sleep.ready'), mem: t('sleep.ready') }
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
            const timerEl = document.getElementById('ldg-sleep-time-remaining');
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
        const weather = getSystem('weather');
        if (weather) {
            weather.rainParticles = [];
            weather.snowParticles = [];
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
            const screen = this.sleepScreen;
            screen.classList.remove('visible');
            this.sleepScreen = null;
            setTimeout(() => {
                 if (screen.parentNode) {
                    screen.parentNode.removeChild(screen);
                }
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
        setGameFlag('interactionsBlocked', true);
    }

    /**
     * Desbloqueia interações do usuário com a página
     * Restaura pointer-events e limpa flag global
     * @returns {void}
     */
    unblockInteractions() {
        document.body.style.pointerEvents = 'all';
        setGameFlag('interactionsBlocked', false);
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
