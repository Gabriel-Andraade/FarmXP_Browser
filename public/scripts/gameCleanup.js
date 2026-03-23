/**
 * @file gameCleanup.js - Cleanup centralizado para todos os sistemas do jogo
 * Gerencia destruição de recursos, listeners e cleanup geral quando o jogo é encerrado.
 *
 * Usa padrão de registro automático: itera sobre todos os sistemas registrados
 * em gameState e chama destroy() em cada um que o implemente, eliminando a
 * necessidade de adicionar manualmente cada novo sistema aqui.
 */

import { logger } from './logger.js';
import { getAllSystems } from './gameState.js';
import { destroyInventoryUI } from './thePlayer/inventoryUI.js';
import { destroyControls } from './thePlayer/control.js';

/**
 * Executa limpeza completa de todos os sistemas do jogo
 * Chamada quando o jogo é encerrado ou antes de recarregar
 * @returns {void}
 */
export function destroyAllSystems() {
    try {
        // fix: track partial failures so the final log reflects actual outcome
        let hadErrors = false;
        logger.info('[Cleanup] Iniciando destruição de todos os sistemas...');

        // Destrói todos os sistemas registrados em gameState que possuem destroy()
        for (const [name, system] of getAllSystems()) {
            if (system && typeof system.destroy === 'function') {
                try {
                    system.destroy();
                    logger.debug(`[Cleanup] ${name} destruído`);
                } catch (err) {
                    hadErrors = true;
                    logger.error(`[Cleanup] Erro ao destruir ${name}:`, err);
                }
            }
        }

        // fix: wrapped each standalone cleanup in its own try/catch to prevent
        // a failure in one from skipping the others
        try {
            destroyInventoryUI();
            logger.debug('[Cleanup] InventoryUI destruído');
        } catch (err) {
            hadErrors = true;
            logger.error('[Cleanup] Erro ao destruir InventoryUI:', err);
        }

        try {
            destroyControls();
            logger.debug('[Cleanup] Controls destruídos');
        } catch (err) {
            hadErrors = true;
            logger.error('[Cleanup] Erro ao destruir Controls:', err);
        }

        // CraftingSystem - Cleanup de listeners e UI
        const craftingSystem = getSystem('crafting');
        if (craftingSystem && typeof craftingSystem.destroy === 'function') {
            craftingSystem.destroy();
            logger.debug('[Cleanup] CraftingSystem destruído');
        }

        // AnimalUiPanel - Cleanup de listeners e DOM
        const animalUiPanel = getSystem('animalUI');
        if (animalUiPanel && typeof animalUiPanel.destroy === 'function') {
            animalUiPanel.destroy();
            logger.debug('[Cleanup] AnimalUiPanel destruído');
        }

        // AudioManager - Cleanup de AudioContext, tracks e SFX buffers
        const audioManager = getSystem('audio');
        if (audioManager && typeof audioManager.destroy === 'function') {
            audioManager.destroy();
            logger.debug('[Cleanup] AudioManager destruído');
        }
    } catch (error) {
        logger.error('[Cleanup] Erro durante destruição dos sistemas:', error);
    }
}

/**
 * Configura listener para cleanup automático ao descarregar a página
 * Chamado uma única vez na inicialização do jogo
 * @returns {void}
 */
export function setupAutoCleanup() {
    // Guard local: evita double cleanup quando beforeunload + unload disparam em sequência
    let cleanedUp = false;

    const runCleanupOnce = (source) => {
        if (cleanedUp) return;
        cleanedUp = true;

        try {
            destroyAllSystems();
        } catch (error) {
            logger.error(`[Cleanup] Erro em ${source}:`, error);
        }
    };

    window.addEventListener('beforeunload', (e) => {
        runCleanupOnce('beforeunload');
    }, { once: true });

    // Também capturar unload para compatibilidade com browsers antigos
    window.addEventListener('unload', () => {
        runCleanupOnce('unload');
    }, { once: true });

    logger.debug('[Cleanup] Auto-cleanup configurado');
}
