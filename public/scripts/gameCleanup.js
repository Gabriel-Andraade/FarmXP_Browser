/**
 * @file gameCleanup.js - Cleanup centralizado para todos os sistemas do jogo
 * Gerencia destruição de recursos, listeners e cleanup geral quando o jogo é encerrado
 */

import { logger } from './logger.js';
import { getSystem } from './gameState.js';
import { destroyInventoryUI } from './thePlayer/inventoryUI.js';
import { destroyControls } from './thePlayer/control.js';

/**
 * Executa limpeza completa de todos os sistemas do jogo
 * Chamada quando o jogo é encerrado ou antes de recarregar
 * @returns {void}
 */
export function destroyAllSystems() {
    try {
        logger.info('[Cleanup] Iniciando destruição de todos os sistemas...');

        // PlayerSystem - Cleanup de listeners e intervals
        const playerSystem = getSystem('player');
        if (playerSystem && typeof playerSystem.destroy === 'function') {
            playerSystem.destroy();
            logger.debug('[Cleanup] PlayerSystem destruído');
        }

        // InventorySystem - Cleanup de listeners
        const inventorySystem = getSystem('inventory');
        if (inventorySystem && typeof inventorySystem.destroy === 'function') {
            inventorySystem.destroy();
            logger.debug('[Cleanup] InventorySystem destruído');
        }

        // ItemSystem - Cleanup de listeners e mapa de objetos
        const itemSystem = getSystem('item');
        if (itemSystem && typeof itemSystem.destroy === 'function') {
            itemSystem.destroy();
            logger.debug('[Cleanup] ItemSystem destruído');
        }

        // InventoryUI - Cleanup de DOM e listeners (static import => sempre função)
        destroyInventoryUI();
        logger.debug('[Cleanup] InventoryUI destruído');

        // WorldUI - Cleanup de listeners e elementos
        const worldUI = getSystem('worldUI');
        if (worldUI && typeof worldUI.destroy === 'function') {
            worldUI.destroy();
            logger.debug('[Cleanup] WorldUI destruído');
        }

        // MerchantSystem - Cleanup de listeners
        const merchantSystem = getSystem('merchant');
        if (merchantSystem && typeof merchantSystem.destroy === 'function') {
            merchantSystem.destroy();
            logger.debug('[Cleanup] MerchantSystem destruído');
        }

        // Controls - Cleanup de listeners globais (static import => sempre função)
        destroyControls();
        logger.debug('[Cleanup] Controls destruídos');

        // HouseSystem - Cleanup se existir
        const houseSystem = getSystem('house');
        if (houseSystem && typeof houseSystem.destroy === 'function') {
            houseSystem.destroy();
            logger.debug('[Cleanup] HouseSystem destruído');
        }

        // ChestSystem - Cleanup se existir
        const chestSystem = getSystem('chest');
        if (chestSystem && typeof chestSystem.destroy === 'function') {
            chestSystem.destroy();
            logger.debug('[Cleanup] ChestSystem destruído');
        }

        // WellSystem - Cleanup se existir
        const wellSystem = getSystem('well');
        if (wellSystem && typeof wellSystem.destroy === 'function') {
            wellSystem.destroy();
            logger.debug('[Cleanup] WellSystem destruído');
        }

        // WeatherSystem - Cleanup se existir
        const weatherSystem = getSystem('weather');
        if (weatherSystem && typeof weatherSystem.destroy === 'function') {
            weatherSystem.destroy();
            logger.debug('[Cleanup] WeatherSystem destruído');
        }

        // AudioManager - Cleanup de AudioContext, tracks e SFX buffers
        const audioManager = getSystem('audio');
        if (audioManager && typeof audioManager.destroy === 'function') {
            audioManager.destroy();
            logger.debug('[Cleanup] AudioManager destruído');
        }

        logger.info('[Cleanup] Todos os sistemas foram destruídos com sucesso');
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
