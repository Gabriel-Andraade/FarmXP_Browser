/**
 * @file gameCleanup.js - Cleanup centralizado para todos os sistemas do jogo
 * Gerencia destruição de recursos, listeners e cleanup geral quando o jogo é encerrado
 */

import { logger } from './logger.js';

/**
 * Executa limpeza completa de todos os sistemas do jogo
 * Chamada quando o jogo é encerrado ou antes de recarregar
 * @returns {void}
 */
export function destroyAllSystems() {
    try {
        logger.info('[Cleanup] Iniciando destruição de todos os sistemas...');

        // PlayerSystem - Cleanup de listeners e intervals
        if (window.playerSystem && typeof window.playerSystem.destroy === 'function') {
            window.playerSystem.destroy();
            logger.debug('[Cleanup] PlayerSystem destruído');
        }

        // InventorySystem - Cleanup de listeners
        if (window.inventorySystem && typeof window.inventorySystem.destroy === 'function') {
            window.inventorySystem.destroy();
            logger.debug('[Cleanup] InventorySystem destruído');
        }

        // ItemSystem - Cleanup de listeners e mapa de objetos
        if (window.itemSystem && typeof window.itemSystem.destroy === 'function') {
            window.itemSystem.destroy();
            logger.debug('[Cleanup] ItemSystem destruído');
        }

        // InventoryUI - Cleanup de DOM e listeners
        if (window.destroyInventoryUI && typeof window.destroyInventoryUI === 'function') {
            window.destroyInventoryUI();
            logger.debug('[Cleanup] InventoryUI destruído');
        }

        // WorldUI - Cleanup de listeners e elementos
        if (window.worldUI && typeof window.worldUI.destroy === 'function') {
            window.worldUI.destroy();
            logger.debug('[Cleanup] WorldUI destruído');
        }

        // MerchantSystem - Cleanup de listeners
        if (window.merchantSystem && typeof window.merchantSystem.destroy === 'function') {
            window.merchantSystem.destroy();
            logger.debug('[Cleanup] MerchantSystem destruído');
        }

        // Controls - Cleanup de listeners globais
        if (window.destroyControls && typeof window.destroyControls === 'function') {
            window.destroyControls();
            logger.debug('[Cleanup] Controls destruídos');
        }

        // HouseSystem - Cleanup se existir
        if (window.houseSystem && typeof window.houseSystem.destroy === 'function') {
            window.houseSystem.destroy();
            logger.debug('[Cleanup] HouseSystem destruído');
        }

        // ChestSystem - Cleanup se existir
        if (window.chestSystem && typeof window.chestSystem.destroy === 'function') {
            window.chestSystem.destroy();
            logger.debug('[Cleanup] ChestSystem destruído');
        }

        // WellSystem - Cleanup se existir
        if (window.wellSystem && typeof window.wellSystem.destroy === 'function') {
            window.wellSystem.destroy();
            logger.debug('[Cleanup] WellSystem destruído');
        }

        // WeatherSystem - Cleanup se existir
        if (window.weatherSystem && typeof window.weatherSystem.destroy === 'function') {
            window.weatherSystem.destroy();
            logger.debug('[Cleanup] WeatherSystem destruído');
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
    window.addEventListener('beforeunload', (e) => {
        try {
            destroyAllSystems();
        } catch (error) {
            logger.error('[Cleanup] Erro em beforeunload:', error);
        }
    });

    // Também capturar unload para compatibilidade com browsers antigos
    window.addEventListener('unload', () => {
        try {
            destroyAllSystems();
        } catch (error) {
            logger.error('[Cleanup] Erro em unload:', error);
        }
    });

    logger.debug('[Cleanup] Auto-cleanup configurado');
}
