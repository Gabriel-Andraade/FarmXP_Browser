/**
 * @file saveSystem.js - Sistema de Save/Load do FarmingXP
 * @description Gerencia persistência do jogo com 3 slots usando localStorage.
 * Cada slot armazena metadados (nome, personagem, tempo jogado, datas) e dados do jogo.
 * @module SaveSystem
 */

import { registerSystem, getSystem, getObject } from './gameState.js';
import { logger } from './logger.js';
import { exportWorldState, importWorldState } from './theWorld.js';

const ROOT_KEY = 'farmxp_saves_v1';
const ACTIVE_SLOT_KEY = 'farmxp_active_slot';
const MAX_SLOTS = 3;
const SAVE_VERSION = 1;
const AUTO_SAVE_INTERVAL_MS = 60000;

/**
 * Formata milissegundos para HH:MM:SS
 * @param {number} ms - Tempo em milissegundos
 * @returns {string} Tempo formatado
 */
export function formatPlayTime(ms) {
    if (!ms || ms < 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Formata timestamp para dd/mm/aaaa hh:mm
 * @param {number} timestamp - Timestamp em milissegundos
 * @returns {string} Data formatada
 */
export function formatDateTime(timestamp) {
    if (!timestamp) return '--/--/---- --:--';
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Classe principal do sistema de save
 * Gerencia 3 slots de save com metadados e dados do jogo
 */
class SaveSystem {
    constructor() {
        this.activeSlot = null;
        this.sessionStartAt = null;
        this.sessionMs = 0;
        this.autoSaveInterval = null;
        this.isDirty = false;
        this._cachedRoot = null; // Cache para otimização

        // Registrar no gameState
        registerSystem('save', this);

        // Salvar antes de fechar a página
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                if (this.activeSlot !== null) {
                    this.saveActive('beforeunload');
                }
            });

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && this.activeSlot !== null) {
                    this.saveActive('visibilitychange');
                }
            });
        }

        logger.info('💾 SaveSystem inicializado');
    }

    /**
     * Lê os dados raiz do localStorage (com cache)
     * @returns {Object} Dados raiz com version e slots
     */
    _readRoot() {
        // Retornar cache se disponível
        if (this._cachedRoot !== null) {
            return this._cachedRoot;
        }

        try {
            const raw = localStorage.getItem(ROOT_KEY);
            if (!raw) {
                this._cachedRoot = { version: SAVE_VERSION, slots: Array(MAX_SLOTS).fill(null) };
                return this._cachedRoot;
            }
            const parsed = JSON.parse(raw);
            if (!parsed.slots || !Array.isArray(parsed.slots)) {
                parsed.slots = Array(MAX_SLOTS).fill(null);
            }
            // Garantir que sempre tenha 3 slots
            while (parsed.slots.length < MAX_SLOTS) {
                parsed.slots.push(null);
            }
            this._cachedRoot = parsed;
            return this._cachedRoot;
        } catch (error) {
            logger.error('Erro ao ler saves:', error);
            this._cachedRoot = { version: SAVE_VERSION, slots: Array(MAX_SLOTS).fill(null) };
            return this._cachedRoot;
        }
    }

    /**
     * Escreve os dados raiz no localStorage e atualiza cache
     * @param {Object} root - Dados raiz para salvar
     */
    _writeRoot(root) {
        try {
            localStorage.setItem(ROOT_KEY, JSON.stringify(root));
            this._cachedRoot = root; // Atualizar cache
            return true;
        } catch (error) {
            logger.error('Erro ao escrever saves:', error);
            return false;
        }
    }

    /**
     * Limpa o cache (usar quando precisar forçar recarregamento)
     */
    _clearCache() {
        this._cachedRoot = null;
    }

    /**
     * Lista todos os slots com seus metadados
     * @returns {Array} Array de slots (null para vazios, objeto para preenchidos)
     */
    listSlots() {
        return this._readRoot().slots;
    }

    /**
     * Verifica se um slot está vazio (otimizado usando cache)
     * @param {number} slotIndex - Índice do slot (0-2)
     * @returns {boolean} True se vazio
     */
    isSlotEmpty(slotIndex) {
        const slots = this._readRoot().slots;
        return slots[slotIndex] === null;
    }

    /**
     * Obtém os metadados de um slot específico (otimizado usando cache)
     * @param {number} slotIndex - Índice do slot (0-2)
     * @returns {Object|null} Metadados do slot ou null se vazio
     */
    getSlotMeta(slotIndex) {
        const slots = this._readRoot().slots;
        return slots[slotIndex]?.meta || null;
    }

    /**
     * Seleciona um slot como ativo e inicia contagem de sessão
     * @param {number} slotIndex - Índice do slot (0-2)
     */
    selectActiveSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= MAX_SLOTS) {
            logger.error('Índice de slot inválido:', slotIndex);
            return;
        }

        this.activeSlot = slotIndex;
        try {
            localStorage.setItem(ACTIVE_SLOT_KEY, String(slotIndex));
        } catch (error) {
            logger.error('Erro ao salvar slot ativo:', error);
        }
        this.sessionStartAt = Date.now();
        this.sessionMs = 0;

        // Atualizar lastPlayedAt
        const root = this._readRoot();
        if (root.slots[slotIndex]?.meta) {
            root.slots[slotIndex].meta.lastPlayedAt = Date.now();
            this._writeRoot(root);
        }

        logger.info(`Slot ${slotIndex} selecionado como ativo`);
    }

    /**
     * Atualiza o tempo de sessão (chamar no game loop)
     * @param {number} deltaMs - Delta time em milissegundos
     */
    tick(deltaMs) {
        if (this.activeSlot === null) return;
        this.sessionMs += deltaMs;
    }

    /**
     * Marca o jogo como tendo mudanças não salvas
     */
    markDirty() {
        this.isDirty = true;
    }

    /**
     * Cria ou sobrescreve um slot com os dados atuais do jogo
     * @param {number} slotIndex - Índice do slot (0-2)
     * @param {Object} options - Opções (saveName, characterId, characterName, reason)
     * @returns {boolean} True se salvou com sucesso
     */
    createOrOverwriteSlot(slotIndex, options = {}) {
        if (slotIndex < 0 || slotIndex >= MAX_SLOTS) {
            logger.error('Índice de slot inválido:', slotIndex);
            return false;
        }

        try {
            const root = this._readRoot();
            const now = Date.now();
            const isNew = root.slots[slotIndex] === null;

            // Obter informações do personagem atual
            const playerSystem = getSystem('player');
            const characterId = options.characterId || playerSystem?.activeCharacter?.id || 'stella';
            const characterName = options.characterName || playerSystem?.activeCharacter?.name || 'Stella';

            // Criar ou atualizar slot
            if (isNew) {
                root.slots[slotIndex] = {
                    meta: {
                        slotIndex,
                        saveName: options.saveName || `Save ${slotIndex + 1}`,
                        characterId,
                        characterName,
                        createdAt: now,
                        lastSavedAt: now,
                        lastPlayedAt: now,
                        totalPlayTimeMs: 0,
                        lastSessionMs: 0,
                        lastSaveReason: options.reason || 'manual'
                    },
                    data: {}
                };
            }

            const slot = root.slots[slotIndex];

            // Atualizar metadados
            slot.meta.lastSavedAt = now;
            slot.meta.lastSessionMs = this.sessionMs;
            slot.meta.totalPlayTimeMs = (slot.meta.totalPlayTimeMs || 0) + this.sessionMs;
            slot.meta.lastSaveReason = options.reason || slot.meta.lastSaveReason || 'manual';

            if (options.saveName) {
                slot.meta.saveName = options.saveName;
            }

            // Resetar contagem de sessão
            this.sessionMs = 0;
            this.sessionStartAt = now;

            // Coletar dados do jogo
            slot.data = this._gatherGameData();

            const written = this._writeRoot(root);
            if (!written) return false;
            this.isDirty = false;

            logger.info(`💾 Save ${slotIndex} salvo com sucesso (razão: ${slot.meta.lastSaveReason})`);
            this._dispatchEvent('save:changed', { slotIndex, action: 'save', reason: slot.meta.lastSaveReason });

            return true;
        } catch (error) {
            logger.error('Erro ao salvar:', error);
            return false;
        }
    }

    /**
     * Salva no slot ativo atual
     * @param {string} reason - Motivo do save (manual, auto, beforeunload, etc)
     * @returns {boolean} True se salvou com sucesso
     */
    saveActive(reason = 'manual') {
        if (this.activeSlot === null) {
            logger.warn('Nenhum slot ativo para salvar');
            return false;
        }

        const result = this.createOrOverwriteSlot(this.activeSlot, { reason });
        if (result) {
            logger.debug(`Save automático (${reason})`);
        }
        return result;
    }

    /**
     * Carrega os dados de um slot
     * @param {number} slotIndex - Índice do slot (0-2)
     * @returns {Object|null} Dados do slot ou null se vazio/erro
     */
    loadSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= MAX_SLOTS) {
            logger.error('Índice de slot inválido:', slotIndex);
            return null;
        }

        try {
            const root = this._readRoot();
            const slot = root.slots[slotIndex];

            if (!slot) {
                logger.warn(`Slot ${slotIndex} está vazio`);
                return null;
            }

            // Selecionar como ativo
            this.selectActiveSlot(slotIndex);

            logger.info(`📂 Slot ${slotIndex} carregado`);
            this._dispatchEvent('save:loaded', { slotIndex, data: slot });

            return slot;
        } catch (error) {
            logger.error('Erro ao carregar slot:', error);
            return null;
        }
    }

    /**
     * Aplica os dados carregados aos sistemas do jogo
     * @param {Object} saveData - Dados do save (slot completo com meta e data)
     */
    applySaveData(saveData) {
        if (!saveData || !saveData.data) {
            logger.warn('Dados de save inválidos');
            return;
        }

        const data = saveData.data;

        // Aplicar dados do jogador
        if (data.player) {
            this._applyPlayerData(data.player);
        }

        // Aplicar inventário
        if (data.inventory) {
            this._applyInventoryData(data.inventory);
        }

        // Aplicar dinheiro
        if (data.currency) {
            this._applyCurrencyData(data.currency);
        }

        // Aplicar clima/tempo
        if (data.weather) {
            this._applyWeatherData(data.weather);
        }

        // Aplicar mundo (buildings, wells)
        if (data.world) {
            this._applyWorldData(data.world);
        }

        // Aplicar baús
        if (data.chests) {
            this._applyChestsData(data.chests);
        }

        logger.info('✅ Dados do save aplicados');
        this._dispatchEvent('save:applied', { saveData });
    }

    /**
     * Renomeia um slot
     * @param {number} slotIndex - Índice do slot (0-2)
     * @param {string} newName - Novo nome do save
     * @returns {boolean} True se renomeou com sucesso
     */
    renameSlot(slotIndex, newName) {
        if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return false;
        if (!newName || typeof newName !== 'string') return false;

        const root = this._readRoot();
        if (!root.slots[slotIndex]?.meta) return false;

        root.slots[slotIndex].meta.saveName = newName.trim().substring(0, 30);
        if (!this._writeRoot(root)) return false;

        logger.info(`Slot ${slotIndex} renomeado para "${newName}"`);
        this._dispatchEvent('save:changed', { slotIndex, action: 'rename' });

        return true;
    }

    /**
     * Deleta um slot
     * @param {number} slotIndex - Índice do slot (0-2)
     * @returns {boolean} True se deletou com sucesso
     */
    deleteSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return false;

        const root = this._readRoot();
        root.slots[slotIndex] = null;
        if (!this._writeRoot(root)) return false;

        // Se era o slot ativo, desativar
        if (this.activeSlot === slotIndex) {
            this.activeSlot = null;
            localStorage.removeItem(ACTIVE_SLOT_KEY);
        }

        logger.info(`🗑️ Slot ${slotIndex} deletado`);
        this._dispatchEvent('save:changed', { slotIndex, action: 'delete' });

        return true;
    }

    /**
     * Verifica se existe algum save
     * @returns {boolean} True se existe pelo menos um save
     */
    hasAnySave() {
        const slots = this.listSlots();
        return slots.some(slot => slot !== null);
    }

    /**
     * Reseta o tempo/clima para valores iniciais de um novo jogo
     */
    resetWeatherForNewGame() {
        const weather = getSystem('weather') || window.WeatherSystem;
        if (!weather) return;

        // Usar o método reset() do WeatherSystem se disponível
        if (typeof weather.reset === 'function') {
            weather.reset();
        } else {
            // Fallback manual com aviso de acoplamento
            logger.warn('WeatherSystem.reset() não disponível - usando fallback acoplado');
            
            // Fallback manual
            weather.currentTime = 6 * 60;
            weather.day = 1;
            weather.month = 1;
            weather.year = 1;
            weather.season = 'Primavera';
            weather.weatherType = 'clear';
            weather.weatherTimer = 0;
            weather.nextWeatherChange = 60 * 2;
            weather.rainParticles = [];
            weather.fogLayers = [];
            weather.snowParticles = [];
            weather.lightningFlashes = [];
            if (typeof weather.updateAmbientLight === 'function') {
                weather.updateAmbientLight();
            }
        }

        // Disparar evento para atualizar UI
        document.dispatchEvent(new CustomEvent('timeChanged', {
            detail: { 
                day: weather.day, 
                time: weather.currentTime, 
                weekday: typeof weather.getWeekday === 'function' ? weather.getWeekday() : null 
            }
        }));

        logger.info('⏰ Tempo do jogo resetado para novo jogo');
    }

    /**
     * Inicia o auto-save
     * @param {number} intervalMs - Intervalo em milissegundos
     */
    startAutoSave(intervalMs = AUTO_SAVE_INTERVAL_MS) {
        this.stopAutoSave();
        this.autoSaveInterval = setInterval(() => {
            if (this.activeSlot !== null && this.isDirty) {
                this.saveActive('auto');
            }
        }, intervalMs);
        logger.info(`⏰ Auto-save ativado (a cada ${intervalMs / 1000}s)`);
    }

    /**
     * Para o auto-save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    /**
     * Coleta todos os dados do jogo para salvar
     * @returns {Object} Dados serializados do jogo
     */
    _gatherGameData() {
        return {
            player: this._getPlayerData(),
            inventory: this._getInventoryData(),
            currency: this._getCurrencyData(),
            weather: this._getWeatherData(),
            world: this._getWorldData(),
            chests: this._getChestsData()
        };
    }

    /**
     * Obtém dados do jogador para salvar
     */
    _getPlayerData() {
        const player = getObject('currentPlayer');
        const playerSystem = getSystem('player');

        return {
            x: player?.x ?? 400,
            y: player?.y ?? 300,
            direction: player?.direction ?? 'down',
            characterId: playerSystem?.activeCharacter?.id ?? 'stella',
            needs: {
                hunger: playerSystem?.needs?.hunger ?? 100,
                thirst: playerSystem?.needs?.thirst ?? 100,
                energy: playerSystem?.needs?.energy ?? 100
            }
        };
    }

    /**
     * Obtém dados do inventário para salvar
     */
    _getInventoryData() {
        const inventory = getSystem('inventory') || window.inventorySystem;
        if (!inventory) return { categories: {}, equipped: null };

        const categories = {};
        for (const [catName, catData] of Object.entries(inventory.categories || {})) {
            categories[catName] = (catData.items || []).map(item => ({
                id: item.id,
                quantity: item.quantity
            }));
        }

        return {
            categories,
            equipped: inventory.equipped || null
        };
    }

    /**
     * Obtém dados de moeda para salvar
     */
    _getCurrencyData() {
        const currency = getSystem('currency') || window.currencyManager;
        return {
            money: currency?.currentMoney ?? 1000
        };
    }

    /**
     * Obtém dados de clima/tempo para salvar
     */
    _getWeatherData() {
        const weather = getSystem('weather') || window.WeatherSystem;
        if (!weather) return null;

        return {
            currentTime: weather.currentTime ?? 360,
            day: weather.day ?? 1,
            month: weather.month ?? 1,
            year: weather.year ?? 1,
            season: weather.season ?? 'Primavera',
            weatherType: weather.weatherType ?? 'clear',
            weatherTimer: weather.weatherTimer ?? 0,
            nextWeatherChange: weather.nextWeatherChange ?? 120,
            ambientDarkness: weather.ambientDarkness ?? 0
        };
    }

    /**
     * Obtém dados do mundo para salvar
     * Inclui árvores, pedras, arbustos, construções, poços e animais
     */
    _getWorldData() {
        try {
            return exportWorldState();
        } catch (error) {
            logger.error('Erro ao exportar estado do mundo:', error);
            return {
                trees: [],
                rocks: [],
                thickets: [],
                houses: [],
                placedBuildings: [],
                placedWells: [],
                animals: []
            };
        }
    }

    /**
     * Obtém dados dos baús para salvar
     */
    _getChestsData() {
        const chestSystem = getSystem('chest');
        if (!chestSystem) return {};

        const chestsData = {};
        for (const [chestId, chest] of Object.entries(chestSystem.chests || {})) {
            chestsData[chestId] = {
                id: chest.id,
                x: chest.x,
                y: chest.y,
                contents: chest.contents || {}
            };
        }

        return chestsData;
    }

    /**
     * Aplica dados do jogador
     */
    _applyPlayerData(data) {
        const player = getObject('currentPlayer');
        const playerSystem = getSystem('player');

        if (player) {
            player.x = data.x ?? player.x;
            player.y = data.y ?? player.y;
            player.direction = data.direction ?? player.direction;
        }

        if (playerSystem && data.needs) {
            if (playerSystem.needs) {
                playerSystem.needs.hunger = data.needs.hunger ?? 100;
                playerSystem.needs.thirst = data.needs.thirst ?? 100;
                playerSystem.needs.energy = data.needs.energy ?? 100;
            }
        }
    }

    /**
     * Aplica dados do inventário
     */
    _applyInventoryData(data) {
        const inventory = getSystem('inventory') || window.inventorySystem;
        if (!inventory || !data.categories) return;

        // Limpar inventário atual
        for (const catName of Object.keys(inventory.categories)) {
            inventory.categories[catName].items = [];
        }

        // Restaurar itens
        const failedItems = [];
        for (const [catName, items] of Object.entries(data.categories)) {
            if (inventory.categories[catName]) {
                for (const savedItem of items) {
                    const added = inventory.addItem(savedItem.id, savedItem.quantity);
                    if (!added) {
                        failedItems.push({ id: savedItem.id, quantity: savedItem.quantity, category: catName });
                    }
                }
            }
        }

        if (failedItems.length > 0) {
            logger.warn('[SaveSystem] Falha ao restaurar itens:', failedItems);
        }

        // Restaurar equipados apenas se o item existir no inventário
        if (data.equipped) {
            // Only restore equipped if the item was successfully added
            const equippedId = data.equipped?.id ?? data.equipped;
            const isInInventory = Object.values(inventory.categories).some(cat =>
                cat.items?.some(item => item.id === equippedId && item.quantity > 0)
            );
            if (isInInventory) {
                inventory.equipped = data.equipped;
            } else {
                logger.warn('[SaveSystem] Equipped item not found in restored inventory, skipping');
                inventory.equipped = null; // Limpar equipado inválido
            }
        }

        inventory.scheduleUIUpdate();
    }

    /**
     * Aplica dados de moeda
     */
    _applyCurrencyData(data) {
        const currency = getSystem('currency') || window.currencyManager;
        if (currency && data.money !== undefined) {
            currency.currentMoney = data.money;
            if (typeof currency._notifyChange === 'function') {
                currency._notifyChange();
            }
        }
    }

    /**
     * Aplica dados de clima/tempo
     */
    _applyWeatherData(data) {
        const weather = getSystem('weather') || window.WeatherSystem;
        if (!weather || !data) return;

        // Pausar o sistema enquanto aplica os dados
        if (typeof weather.pause === 'function') weather.pause();

        // Restaurar valores de tempo/data
        weather.currentTime = data.currentTime ?? 360;
        weather.day = data.day ?? 1;
        weather.month = data.month ?? 1;
        weather.year = data.year ?? 1;
        weather.season = data.season ?? 'Primavera';

        // Restaurar estado do clima
        weather.weatherTimer = data.weatherTimer ?? 0;
        weather.nextWeatherChange = data.nextWeatherChange ?? 120;
        weather.ambientDarkness = data.ambientDarkness ?? 0;

        // Resetar estados de sleep
        weather.isSleeping = false;
        weather.sleepTransitionProgress = 0;
        weather.sleepPhase = null;
        weather.sleepTimerAcc = 0;

        // Limpar partículas existentes
        weather.rainParticles = [];
        weather.fogLayers = [];
        weather.snowParticles = [];
        weather.lightningFlashes = [];

        // Definir tipo de clima e regenerar partículas (com verificações de segurança)
        weather.weatherType = data.weatherType ?? 'clear';

        if (weather.weatherType === 'rain' || weather.weatherType === 'storm') {
            if (typeof weather.generateRainParticles === 'function') weather.generateRainParticles();
        } else if (weather.weatherType === 'fog') {
            if (typeof weather.generateFogLayers === 'function') weather.generateFogLayers();
        } else if (weather.weatherType === 'blizzard') {
            if (typeof weather.generateSnowParticles === 'function') weather.generateSnowParticles();
        }

        // Atualizar iluminação ambiente baseado no horário
        if (typeof weather.updateAmbientLight === 'function') weather.updateAmbientLight();

        // Disparar eventos para atualizar UI
        document.dispatchEvent(new CustomEvent('timeChanged', {
            detail: { 
                day: weather.day, 
                time: weather.currentTime, 
                weekday: typeof weather.getWeekday === 'function' ? weather.getWeekday() : null 
            }
        }));

        // Resumir o sistema
        if (typeof weather.resume === 'function') weather.resume();

        logger.info(`⛅ Clima restaurado: ${weather.weatherType}, Dia ${weather.day}, ${typeof weather.getTimeString === 'function' ? weather.getTimeString() : ''}`);
    }

    /**
     * Aplica dados do mundo
     * Restaura árvores, pedras, arbustos, construções, poços e animais
     */
    _applyWorldData(data) {
        if (!data) return;

        try {
            importWorldState(data);
            logger.info('🌍 Estado do mundo restaurado');
        } catch (error) {
            logger.error('Erro ao restaurar estado do mundo:', error);
        }
    }

    /**
     * Aplica dados dos baús
     */
    _applyChestsData(data) {
        const chestSystem = getSystem('chest');
        if (!chestSystem || !data) return;

        // Restaurar baús
        for (const [chestId, chestData] of Object.entries(data)) {
            // Verificar se o baú já existe no sistema
            if (!chestSystem.chests[chestId]) {
                // Criar o baú no sistema se não existir
                // Usar o método addChest se disponível, caso contrário criar manualmente
                if (typeof chestSystem.addChest === 'function') {
                    chestSystem.addChest(chestId, {
                        id: chestId,
                        x: chestData.x,
                        y: chestData.y,
                        contents: {}
                    });
                } else {
                    // Fallback: criar manualmente
                    chestSystem.chests[chestId] = {
                        id: chestId,
                        x: chestData.x,
                        y: chestData.y,
                        contents: {}
                    };
                }
                logger.debug(`[SaveSystem] Baú ${chestId} criado durante restauração`);
            }
            
            // Restaurar os conteúdos
            chestSystem.chests[chestId].contents = chestData.contents || {};
        }
        
        logger.info(`[SaveSystem] ${Object.keys(data).length} baús restaurados`);
    }

    /**
     * Dispara um evento customizado
     * @param {string} type - Tipo do evento
     * @param {Object} detail - Detalhes do evento
     */
    _dispatchEvent(type, detail = {}) {
        document.dispatchEvent(new CustomEvent(type, { detail }));
    }
}

// Singleton
export const saveSystem = new SaveSystem();
export default saveSystem;