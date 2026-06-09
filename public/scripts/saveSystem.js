/**
 * @file saveSystem.js - Sistema de Save/Load do FarmingXP
 * @description Gerencia persistência do jogo com 3 slots usando localStorage.
 * Cada slot armazena metadados (nome, personagem, tempo jogado, datas) e dados do jogo.
 * @module SaveSystem
 */

import { registerSystem, getSystem, getObject } from './gameState.js';
import { logger } from './logger.js';
import { safeDispatch } from './safeDispatch.js';
import { exportWorldState, importWorldState } from './theWorld.js';

const ROOT_KEY = 'farmxp_saves_v1';
const ACTIVE_SLOT_KEY = 'farmxp_active_slot';
const MAX_SLOTS = 3;
const SAVE_VERSION = 1;
const AUTO_SAVE_INTERVAL_MS = 60000;

// ─── Data version & migrations ─────────────────────────────────────────────
// SAVE_DATA_VERSION tracks the game data schema. Every time we add new fields,
// rename IDs, remove systems, etc., bump this number and add a migration.
// Migrations run sequentially: save v1 → v2 → v3 → ... → current.
//
// HOW TO ADD A MIGRATION:
//   1. Bump SAVE_DATA_VERSION
//   2. Add an entry to MIGRATIONS with the new version as key
//   3. The function receives the save's `data` object and mutates it in place
//   4. For item/entity ID remaps, use the helper `remapIds()`

const SAVE_DATA_VERSION = 5;

/**
 * Migration functions keyed by target version.
 * Each receives the save `data` object and mutates it.
 */
const MIGRATIONS = {
    // v1 → v2: Add NPC quest states for Bru/Juan, ensure animals array exists
    2: (data) => {
        // Ensure gameFlags exists
        if (!data.gameFlags) data.gameFlags = {};

        // Add Bru dialogue state
        if (!data.gameFlags.bru_quest) {
            data.gameFlags.bru_quest = { dialogue: 'idle' };
        }

        // Ensure world has animals array
        if (data.world && !data.world.animals) {
            data.world.animals = [];
        }

        logger.info('[Migration v2] Added bru_quest, ensured animals array');
    },

    // v2 → v3: Add John family dialogue state
    3: (data) => {
        if (!data.gameFlags) data.gameFlags = {};

        if (!data.gameFlags.john_quest) {
            data.gameFlags.john_quest = { dialogue: 'idle' };
        }

        logger.info('[Migration v3] Added john_quest');
    },

    // v3 → v4: Add John milk quest + Lucas secret quest states
    4: (data) => {
        if (!data.gameFlags) data.gameFlags = {};

        if (!data.gameFlags.john_quest) {
            data.gameFlags.john_quest = { dialogue: 'idle', milkQuest: 'idle' };
        } else if (!data.gameFlags.john_quest.milkQuest) {
            data.gameFlags.john_quest.milkQuest = 'idle';
        }

        if (!data.gameFlags.lucas_quest) {
            data.gameFlags.lucas_quest = { secretQuest: 'idle' };
        }

        logger.info('[Migration v4] Added john milk quest + lucas secret quest');
    },

    // v4 → v5: Add Molly dialogue state
    5: (data) => {
        if (!data.gameFlags) data.gameFlags = {};

        if (!data.gameFlags.molly_quest) {
            data.gameFlags.molly_quest = { dialogue: 'idle' };
        }

        logger.info('[Migration v5] Added molly_quest');
    },
};

/**
 * Runs all pending migrations on a save's data object.
 * Mutates `data` in place and returns it.
 *
 * @param {Object} data - The save's `.data` object
 * @returns {Object} The migrated data
 */
function migrateSaveData(data) {
    if (!data) return data;

    const fromVersion = data._dataVersion || 1;
    if (fromVersion >= SAVE_DATA_VERSION) return data;

    logger.info(`[SaveSystem] Migrating save from data v${fromVersion} → v${SAVE_DATA_VERSION}`);

    for (let v = fromVersion + 1; v <= SAVE_DATA_VERSION; v++) {
        if (MIGRATIONS[v]) {
            try {
                MIGRATIONS[v](data);
                logger.info(`[SaveSystem] Migration v${v} applied`);
            } catch (err) {
                logger.error(`[SaveSystem] Migration v${v} failed:`, err);
            }
        }
    }

    data._dataVersion = SAVE_DATA_VERSION;
    return data;
}

/**
 * Remaps entity IDs across the entire save data.
 * Useful when items, buildings, or animals change their numeric ID between versions.
 *
 * @param {Object} data - The save's `.data` object
 * @param {Object} maps - Remap tables keyed by category
 * @param {Object} [maps.items]     - { oldId: newId, ... } for inventory items
 * @param {Object} [maps.buildings] - { oldType: newType, ... } for placed buildings
 * @param {Object} [maps.animals]   - { oldType: newType, ... } for animals
 */
function remapIds(data, maps) {
    if (!maps || !data) return;

    // Remap inventory item IDs
    if (maps.items && data.inventory?.categories) {
        const itemMap = maps.items;
        for (const cat of Object.values(data.inventory.categories)) {
            if (!Array.isArray(cat)) continue;
            for (const item of cat) {
                if (itemMap[item.id] !== undefined) {
                    logger.info(`[Remap] Item ${item.id} → ${itemMap[item.id]}`);
                    item.id = itemMap[item.id];
                }
            }
        }
        // Remap equipped item
        if (data.inventory.equipped) {
            const eqId = data.inventory.equipped?.id ?? data.inventory.equipped;
            if (itemMap[eqId] !== undefined) {
                if (typeof data.inventory.equipped === 'object') {
                    data.inventory.equipped.id = itemMap[eqId];
                } else {
                    data.inventory.equipped = itemMap[eqId];
                }
            }
        }
    }

    // Remap building types in world
    if (maps.buildings && data.world?.placedBuildings) {
        const bldMap = maps.buildings;
        for (const b of data.world.placedBuildings) {
            if (bldMap[b.type] !== undefined) {
                logger.info(`[Remap] Building ${b.type} → ${bldMap[b.type]}`);
                b.type = bldMap[b.type];
            }
        }
    }

    // Remap animal types in world
    if (maps.animals && data.world?.animals) {
        const aniMap = maps.animals;
        for (const a of data.world.animals) {
            if (aniMap[a.type] !== undefined) {
                logger.info(`[Remap] Animal ${a.type} → ${aniMap[a.type]}`);
                a.type = aniMap[a.type];
            }
        }
    }
}

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

             window.addEventListener('storage', (e) => {
                if (e.key === ROOT_KEY || e.key === null) {
                    this._cachedRoot = null;
                    logger.info('[SaveSystem] Cache invalidated due to cross-tab change');
                }
            });
        }

        logger.info('💾 SaveSystem initialized');
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
            logger.error('Error reading saves:', error);
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
            logger.error('Error writing saves:', error);
            this._cachedRoot = null;
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
        return [...this._readRoot().slots];
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
            logger.error('Invalid slot index:', slotIndex);
            return;
        }

        this.activeSlot = slotIndex;
        try {
            localStorage.setItem(ACTIVE_SLOT_KEY, String(slotIndex));
        } catch (error) {
            logger.error('Error saving active slot:', error);
        }
        this.sessionStartAt = Date.now();
        this.sessionMs = 0;

        // Atualizar lastPlayedAt
        const root = this._readRoot();
        if (root.slots[slotIndex]?.meta) {
            root.slots[slotIndex].meta.lastPlayedAt = Date.now();
            this._writeRoot(root);
        }

        logger.info(`Slot ${slotIndex} selected as active`);
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
            logger.error('Invalid slot index:', slotIndex);
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

            logger.info(`💾 Save ${slotIndex} saved successfully (reason: ${slot.meta.lastSaveReason})`);
            this._dispatchEvent('save:changed', { slotIndex, action: 'save', reason: slot.meta.lastSaveReason });

            return true;
        } catch (error) {
            logger.error('Error saving:', error);
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
            logger.warn('No active slot to save');
            return false;
        }

        const result = this.createOrOverwriteSlot(this.activeSlot, { reason });
        if (result) {
            logger.debug(`Auto-save (${reason})`);
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
            logger.error('Invalid slot index:', slotIndex);
            return null;
        }

        try {
            const root = this._readRoot();
            const slot = root.slots[slotIndex];

            if (!slot) {
                logger.warn(`Slot ${slotIndex} is empty`);
                return null;
            }

            // Run migrations on old saves
            if (slot.data) {
                const beforeVersion = slot.data._dataVersion || 1;
                slot.data = migrateSaveData(slot.data);
                // Persist only when a migration actually bumped the data version.
                // Otherwise loadSlot() rewrote localStorage on every load even
                // though nothing changed (#183).
                if ((slot.data._dataVersion || 1) !== beforeVersion) {
                    this._writeRoot(root);
                }
            }

            // Selecionar como ativo
            this.selectActiveSlot(slotIndex);

            logger.info(`📂 Slot ${slotIndex} loaded`);
            this._dispatchEvent('save:loaded', { slotIndex, data: slot });

            return slot;
        } catch (error) {
            logger.error('Error loading slot:', error);
            return null;
        }
    }

    /**
     * Aplica os dados carregados aos sistemas do jogo
     * @param {Object} saveData - Dados do save (slot completo com meta e data)
     */
    async applySaveData(saveData) {
        if (!saveData || !saveData.data) {
            logger.warn('Invalid save data');
            return;
        }

        // Ensure migrations are applied (defensive — loadSlot already does this)
        saveData.data = migrateSaveData(saveData.data);

        const data = saveData.data;

        // Silenciar o tracker de conquistas durante toda a restauração
        // para que eventos disparados pelos passos seguintes
        // (worldObjectAdded, moneyChanged, inventoryUpdated, etc.)
        // não incrementem/re-disparem conquistas indevidamente.
        const tracker = getSystem('achievements');
        if (tracker) tracker.mute();

        try {
            // Restaurar conquistas — merge com global (conquistas persistem entre saves)
            if (tracker) {
                tracker.mergeWithGlobal(data.achievements || null);
            }

            // Aplicar dados do jogador (async - pode trocar de personagem)
            if (data.player) {
                await this._applyPlayerData(data.player);
            }

            // Aplicar inventário
            if (data.inventory) {
                this._applyInventoryData(data.inventory);
            }

            // Aplicar dinheiro
            if (data.currency) {
                this._applyCurrencyData(data.currency);
            }

            // Aplicar mundo (buildings, wells) ANTES do restoreMap: o map manager
            // snapshota o live-theWorld em savedFarmState ao entrar em city; se
            // restoreMap rodasse antes, snapshot seria tirado do mundo ainda vazio
            // e o save de city perderia a farm ao voltar.
            if (data.world) {
                this._applyWorldData(data.world);
            }

            // Agora sim restaura o mapa (city snapshota a farm correta acima).
            if (data.currentMap && data.currentMap !== 'farm') {
                const mapMgr = getSystem('mapManager');
                if (mapMgr && mapMgr.restoreMap) {
                    await mapMgr.restoreMap(data.currentMap);
                }
            }

            // Aplicar baús
            if (data.chests) {
                this._applyChestsData(data.chests);
            }

            // Aplicar clima/tempo
            if (data.weather) {
                this._applyWeatherData(data.weather);
            }

            // Aplicar flags do jogo (pickup_repaired, etc.)
            if (data.gameFlags) {
                this._applyGameFlags(data.gameFlags);
            }

            // Aplicar XP/Level (emite `xpRestored` → HUD reage).
            if (data.xp) {
                const xp = getSystem('xp');
                if (xp?.setState) xp.setState(data.xp);
            } else {
                // Save antigo sem XP: reseta pro padrão pra não herdar do slot anterior.
                const xp = getSystem('xp');
                if (xp?.reset) xp.reset();
            }

            // Aplicar exploração do minimap (agora vive no top-level do save)
            const minimapData = data.minimap ?? data.gameFlags?.minimap ?? null;
            const minimap = getSystem('minimap');
            if (minimapData?.exploration) {
                if (minimap && minimap.importExploration) {
                    await minimap.importExploration(minimapData.exploration);
                }
            } else if (minimap && minimap.resetExploration) {
                // Save sem exploração: reseta pro padrão pra não herdar do slot anterior.
                await minimap.resetExploration();
            }
        } finally {
            // Tem que correr mesmo em erro — se não, conquistas ficam mudas até o fim da sessão.
            if (tracker) tracker.unmute();
        }

        logger.info('✅ Save data applied');
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

        logger.info(`Slot ${slotIndex} renamed to "${newName}"`);
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
            try {
                localStorage.removeItem(ACTIVE_SLOT_KEY);
            } catch (error) {
                logger.error('Error removing active slot:', error);
            }
        }

        logger.info(`🗑️ Slot ${slotIndex} deleted`);
        this._dispatchEvent('save:changed', { slotIndex, action: 'delete' });

        // Se todos os slots estão vazios, limpa conquistas globais
        const allEmpty = root.slots.every(s => s === null);
        if (allEmpty) {
            const tracker = getSystem('achievements');
            if (tracker && tracker.clearGlobal) tracker.clearGlobal();
            logger.info('All saves deleted — global achievements cleared');
        }

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
        const weather = getSystem('weather');
        if (!weather) return;

        // Usar o método reset() do WeatherSystem se disponível
        if (typeof weather.reset === 'function') {
            weather.reset();
        } else {
            // Fallback manual com aviso de acoplamento
            logger.warn('WeatherSystem.reset() not available - using coupled fallback');
            
            // Fallback manual
            weather.currentTime = 6 * 60;
            weather.day = 1;
            weather.month = 1;
            weather.year = 1;
            weather.seasonKey = 'spring';
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
        this._dispatchEvent('timeChanged', {
            day: weather.day,
            time: weather.currentTime,
            weekday: typeof weather.getWeekday === 'function' ? weather.getWeekday() : null
        });

        logger.info('⏰ Game time reset for new game');
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
        logger.info(`⏰ Auto-save enabled (every ${intervalMs / 1000}s)`);
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
        const mapMgr = getSystem('mapManager');
        const xp = getSystem('xp');
        // Quando o jogador está na city, theWorld já foi limpo pelo mapManager;
        // a farm vive só em `savedFarmState`. Sem esse fallback o save perde
        // toda a farm (árvores/animais/construções).
        const inCity = mapMgr?.getCurrentMapId?.() === 'city';
        const savedFarm = inCity && mapMgr?.getSavedFarmState ? mapMgr.getSavedFarmState() : null;
        // Hospital vive fora do snapshotFarmState — se salvar na city sem
        // mergear aqui, animais internados somem ao carregar o save.
        // Quando o sistema NÃO está disponível, preservamos o snapshot
        // anterior (de savedFarm) em vez de sobrescrever com { entries: [] }
        // — caso contrário, salvar na city sem o sistema carregado zerava
        // animais internados que estavam no save anterior.
        const hospitalSys = getSystem('hospital');
        const hospitalState = typeof hospitalSys?.serializeState === 'function'
            ? hospitalSys.serializeState()
            : (savedFarm?.hospital ?? null);
        const worldState = savedFarm
            ? {
                ...savedFarm,
                ...(hospitalState !== null ? { hospital: hospitalState } : {})
              }
            : this._getWorldData();
        return {
            _dataVersion: SAVE_DATA_VERSION,
            player: this._getPlayerData(),
            inventory: this._getInventoryData(),
            currency: this._getCurrencyData(),
            weather: this._getWeatherData(),
            world: worldState,
            chests: this._getChestsData(),
            achievements: this._getAchievementsData(),
            gameFlags: this._getGameFlags(),
            minimap: this._getMinimapData(),
            xp: xp?.getState ? xp.getState() : null,
            currentMap: mapMgr ? mapMgr.getCurrentMapId() : 'farm'
        };
    }

    _getGameFlags() {
        const questSys = getSystem('quests');
        const bartolomeu = getSystem('npcBartolomeu');
        const milly = getSystem('npcMilly');
        const bru = getSystem('npcBru');
        const john = getSystem('npcJohn');
        const lucas = getSystem('npcLucas');
        const isabela = getSystem('npcIsabela');
        const molly = getSystem('npcMolly');
        const tutorials = getSystem('tutorialQuests');
        const fuel = getSystem('fuel');
        return {
            pickup_repaired: questSys ? questSys.isQuestCompleted('fix_pickup') : false,
            battery: questSys ? questSys.getBatteryState() : null,
            fuel_percent: typeof fuel?.getFuel === 'function' ? fuel.getFuel() : null,
            bartolomeu_quest: bartolomeu ? bartolomeu.getQuestState() : 'intro',
            milly_quest: milly ? milly.getQuestState() : 'idle',
            bru_quest: bru ? bru.getQuestState() : { dialogue: 'idle' },
            john_quest: john ? john.getQuestState() : { dialogue: 'idle', milkQuest: 'idle' },
            lucas_quest: lucas ? lucas.getQuestState() : { secretQuest: 'idle' },
            isabela_quest: isabela ? isabela.getQuestState() : { hasNoticed: false },
            molly_quest: molly ? molly.getQuestState() : { dialogue: 'idle' },
            tutorial_quests: tutorials ? tutorials.getQuestState() : null,
        };
    }

    _getAchievementsData() {
        const tracker = getSystem('achievements');
        if (!tracker) return null;
        return tracker.getProgress();
    }

    /**
     * Obtém dados de exploração do minimap para salvar
     */
    _getMinimapData() {
        const minimap = getSystem('minimap');
        if (!minimap || !minimap.exportExploration) return null;
        return { exploration: minimap.exportExploration() };
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
            facingDirection: player?.facingDirection ?? 'down',
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
        const inventory = getSystem('inventory');
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
        const currency = getSystem('currency');
        return {
            money: currency?.currentMoney ?? 1000
        };
    }

    /**
     * Obtém dados de clima/tempo para salvar
     */
    _getWeatherData() {
        const weather = getSystem('weather');
        if (!weather) return null;

        return {
            currentTime: weather.currentTime ?? 360,
            day: weather.day ?? 1,
            month: weather.month ?? 1,
            year: weather.year ?? 1,
            seasonKey: weather.seasonKey ?? 'spring',
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
            logger.error('Error exporting world state:', error);
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
     * Aplica dados do jogador (pode trocar de personagem se necessario)
     */
    async _applyPlayerData(data) {
        const playerSystem = getSystem('player');

        // Trocar personagem se o save tem um characterId diferente do atual
        if (data.characterId && playerSystem) {
            const currentCharId = playerSystem.activeCharacter?.id;
            if (data.characterId !== currentCharId) {
                playerSystem.activeCharacter = { id: data.characterId };
                await playerSystem.loadCharacterModule(data.characterId);
            }
        }

        // Usar playerSystem.currentPlayer diretamente (setado de forma sincrona
        // dentro de loadCharacterModule, antes que o async exposeGlobals atualize gameState)
        const player = playerSystem?.currentPlayer || getObject('currentPlayer');

        if (player) {
            player.x = data.x ?? player.x;
            player.y = data.y ?? player.y;
            player.facingDirection = data.facingDirection ?? data.direction ?? player.facingDirection;
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
        const inventory = getSystem('inventory');
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
                      } else {
                        logger.warn(`[SaveSystem] Category "${catName}" not found in inventory, ${items.length} items skipped`);
                      }
        }

        if (failedItems.length > 0) {
            logger.warn('[SaveSystem] Failed to restore items:', failedItems);
        }

        // Restore equipped state (may be null if nothing was equipped)
        if (data.hasOwnProperty('equipped')) {
            if (data.equipped) {
                const equippedId = data.equipped?.id ?? data.equipped;
                const isInInventory = Object.values(inventory.categories).some(cat =>
                    cat.items?.some(item => item.id === equippedId && item.quantity > 0)
                );
                if (isInInventory) {
                    inventory.equipped = data.equipped;
                } else {
                    logger.warn('[SaveSystem] Equipped item not found in restored inventory, skipping');
                    inventory.equipped = null;
                }
            } else {
                inventory.equipped = null;
            }
        }

        inventory.scheduleUIUpdate();
    }

    /**
     * Aplica dados de moeda
     */
    _applyCurrencyData(data) {
        const currency = getSystem('currency');
         if (currency && typeof data.money === 'number' && data.money >= 0) {
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
        const weather = getSystem('weather');
        if (!weather || !data) return;

        // Pausar o sistema enquanto aplica os dados
        if (typeof weather.pause === 'function') weather.pause();

        // Restaurar valores de tempo/data
        weather.currentTime = data.currentTime ?? 360;
        weather.day = data.day ?? 1;
        weather.month = data.month ?? 1;
        weather.year = data.year ?? 1;
        weather.seasonKey = data.seasonKey ?? 'spring';

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
        this._dispatchEvent('timeChanged', {
            day: weather.day,
            time: weather.currentTime,
            weekday: typeof weather.getWeekday === 'function' ? weather.getWeekday() : null
        });

        // Resumir o sistema
        if (typeof weather.resume === 'function') weather.resume();

        logger.info(`⛅ Weather restored: ${weather.weatherType}, Day ${weather.day}, ${typeof weather.getTimeString === 'function' ? weather.getTimeString() : ''}`);
    }

    /**
     * Aplica dados do mundo
     * Restaura árvores, pedras, arbustos, construções, poços e animais
     */
    _applyWorldData(data) {
        if (!data) return;

        try {
            importWorldState(data);
            logger.info('🌍 World state restored');
        } catch (error) {
            logger.error('Error restoring world state:', error);
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
                logger.debug(`[SaveSystem] Chest ${chestId} created during restoration`);
            }
            
            // Restaurar os conteúdos
            chestSystem.chests[chestId].contents = chestData.contents || {};
        }
        
        logger.info(`[SaveSystem] ${Object.keys(data).length} chests restored`);
    }

    /**
     * Aplica dados de conquistas
     */
    _applyAchievementsData(data) {
        const tracker = getSystem('achievements');
        if (!tracker || !data) return;
        tracker.loadProgress(data);
        logger.info('[SaveSystem] Achievements progress restored');
    }

    _applyGameFlags(flags) {
        if (!flags) return;
        const questSys = getSystem('quests');
        if (questSys) {
            if (flags.pickup_repaired) {
                questSys.setQuestStatus('fix_pickup', 'completed');
            }
            if (flags.battery) {
                questSys.setBatteryState(flags.battery);
            }
        }
        const fuel = getSystem('fuel');
        if (typeof fuel?.setFuel === 'function') {
            // Distingue 3 casos pra não recriar o bug de "tanque cheio
            // fabricado" quando o save explicitamente serializou null:
            //   - campo ausente  → save legado, aplica default 100
            //   - número         → usa o valor serializado
            //   - presente=null  → reset do próprio sistema (DEFAULT_FUEL)
            if (typeof flags.fuel_percent === 'number') {
                fuel.setFuel(flags.fuel_percent);
            } else if (!Object.prototype.hasOwnProperty.call(flags, 'fuel_percent')) {
                fuel.setFuel(100);
            } else {
                fuel.reset?.();
            }
        }
        const bartolomeu = getSystem('npcBartolomeu');
        if (bartolomeu && flags.bartolomeu_quest) {
            bartolomeu.setQuestState(flags.bartolomeu_quest);
        }
        const milly = getSystem('npcMilly');
        if (milly && flags.milly_quest) {
            milly.setQuestState(flags.milly_quest);
        }
        const bru = getSystem('npcBru');
        if (bru && flags.bru_quest) {
            bru.setQuestState(flags.bru_quest);
        }
        const john = getSystem('npcJohn');
        if (john && flags.john_quest) {
            john.setQuestState(flags.john_quest);
        }
        const lucas = getSystem('npcLucas');
        if (lucas && flags.lucas_quest) {
            lucas.setQuestState(flags.lucas_quest);
        }
        const isabela = getSystem('npcIsabela');
        if (isabela && flags.isabela_quest) {
            isabela.setQuestState(flags.isabela_quest);
        }
        const molly = getSystem('npcMolly');
        if (molly && flags.molly_quest) {
            molly.setQuestState(flags.molly_quest);
        }
        const tutorials = getSystem('tutorialQuests');
        if (tutorials && flags.tutorial_quests) {
            tutorials.setQuestState(flags.tutorial_quests);
        }
        logger.info('[SaveSystem] Game flags restored');
    }

    /**
     * Dispara um evento customizado
     * @param {string} type - Tipo do evento
     * @param {Object} detail - Detalhes do evento
     */
    _dispatchEvent(type, detail = {}) {
        safeDispatch(document, new CustomEvent(type, { detail }));
    }
}

// Singleton
export const saveSystem = new SaveSystem();
export default saveSystem;