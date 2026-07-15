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
const BACKUP_KEY = 'farmxp_saves_backup'; // #226: last-good mirror of ROOT_KEY
const ACTIVE_SLOT_KEY = 'farmxp_active_slot';
const MAX_SLOTS = 3;
// #226: signature for exported save files, so import can validate the payload.
const EXPORT_SIGNATURE = 'farmingXP-save';
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
        this._lastExitSaveAt = 0; // dedupe for the exit-save pair (#178)

        // Registrar no gameState
        registerSystem('save', this);

        // Salvar antes de fechar a página. Tanto `visibilitychange->hidden`
        // quanto `beforeunload` disparam ao fechar a aba (com ms de diferença);
        // sem dedupe isso fazia DOIS _gatherGameData() completos (exporta o
        // mundo inteiro) de uma vez (#178). Esta janela curta colapsa o par,
        // mas ainda salva normalmente num hide/close genuíno mais tarde.
            if (typeof window !== 'undefined') {
                const EXIT_SAVE_DEBOUNCE_MS = 2000;
                const saveOnExit = (reason) => {
                    if (this.activeSlot === null) return;
                    const now = Date.now();
                    if (now - this._lastExitSaveAt < EXIT_SAVE_DEBOUNCE_MS) return;
                    this._lastExitSaveAt = now;
                    this.saveActive(reason);
                };

                window.addEventListener('beforeunload', () => saveOnExit('beforeunload'));

                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'hidden') saveOnExit('visibilitychange');
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
                // #226: primary missing → try the backup mirror before giving up.
                this._cachedRoot = this._tryReadBackup() || { version: SAVE_VERSION, slots: Array(MAX_SLOTS).fill(null) };
                return this._cachedRoot;
            }
            const parsed = JSON.parse(raw);
            // #226: JSON válido mas com shape errado ({}, {"slots":"bad"}, null)
            // → tenta o backup ANTES de cair em slots vazios, pra não perder
            // saves recuperáveis.
            if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.slots)) {
                this._cachedRoot = this._tryReadBackup() || { version: SAVE_VERSION, slots: Array(MAX_SLOTS).fill(null) };
                return this._cachedRoot;
            }
            // Garantir que sempre tenha 3 slots
            while (parsed.slots.length < MAX_SLOTS) {
                parsed.slots.push(null);
            }
            this._cachedRoot = parsed;
            return this._cachedRoot;
        } catch (error) {
            logger.error('Error reading saves:', error);
            // #226: primary corrupt → recover from the backup mirror if possible.
            this._cachedRoot = this._tryReadBackup() || { version: SAVE_VERSION, slots: Array(MAX_SLOTS).fill(null) };
            return this._cachedRoot;
        }
    }

    /** #226: read the backup mirror; returns a valid root or null. */
    _tryReadBackup() {
        try {
            const raw = localStorage.getItem(BACKUP_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.slots)) return null;
            while (parsed.slots.length < MAX_SLOTS) parsed.slots.push(null);
            logger.warn('[SaveSystem] Recovered saves from backup mirror');
            return parsed;
        } catch (_) {
            return null;
        }
    }

    /**
     * Escreve os dados raiz no localStorage e atualiza cache
     * @param {Object} root - Dados raiz para salvar
     */
    _writeRoot(root) {
        try {
            const json = JSON.stringify(root);
            localStorage.setItem(ROOT_KEY, json);
            this._cachedRoot = root; // Atualizar cache
            // #226: mirror the last good root to a backup key, so a corrupted or
            // accidentally-cleared primary key can still be recovered.
            try { localStorage.setItem(BACKUP_KEY, json); } catch (_) { /* quota etc */ }
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

    // ───────────────── Export / Import (#226) ─────────────────

    /** Wrap a payload in the export envelope (signature + versions). */
    _exportEnvelope(extra) {
        return JSON.stringify({
            signature: EXPORT_SIGNATURE,
            saveVersion: SAVE_VERSION,
            dataVersion: SAVE_DATA_VERSION,
            exportedAt: new Date().toISOString(),
            ...extra,
        }, null, 2);
    }

    /** Export one slot as a JSON string, or null if the slot is empty. */
    exportSlot(slotIndex) {
        const slot = this._readRoot().slots[slotIndex];
        if (!slot) return null;
        return this._exportEnvelope({ kind: 'slot', slotIndex, slot });
    }

    /** Export every slot as a single JSON string. */
    exportAll() {
        return this._exportEnvelope({ kind: 'all', slots: this._readRoot().slots });
    }

    /** A slot payload is valid if null, or {meta, data} not from a newer build. */
    _validateSlotPayload(slot) {
        if (slot === null) return { ok: true };
        // typeof null === 'object', então sem o guard de null um payload
        // assinado tipo { meta: null, data: null } passava e crashava depois
        // em slot.data._dataVersion / slot.meta.slotIndex.
        const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
        if (!isObject(slot) || !isObject(slot.data) || !isObject(slot.meta)) {
            return { ok: false, reason: 'bad_shape' };
        }
        if ((Number(slot.data._dataVersion) || 0) > SAVE_DATA_VERSION) {
            return { ok: false, reason: 'newer_version' };
        }
        return { ok: true };
    }

    /**
     * Import a previously exported save. Validates the envelope + payload and
     * migrates older data; rejects corrupt or newer-than-supported payloads.
     * @param {string} json - the exported JSON string.
     * @param {{ targetSlot?: number }} opts - required slot for a 'slot' export.
     * @returns {{ ok: boolean, reason?: string, kind?: string, slotIndex?: number }}
     */
    importData(json, opts = {}) {
        let parsed;
        try { parsed = JSON.parse(json); }
        catch (_) { return { ok: false, reason: 'invalid_json' }; }

        if (!parsed || parsed.signature !== EXPORT_SIGNATURE) {
            return { ok: false, reason: 'not_a_save' };
        }

        // Rejeita envelopes de um build mais novo ANTES de mexer em qualquer
        // slot — um export futuro pode omitir o _dataVersion por slot, então a
        // versão do envelope é o único sinal confiável.
        const envSaveVersion = Number(parsed.saveVersion);
        const envDataVersion = Number(parsed.dataVersion);
        if (
            (Number.isFinite(envSaveVersion) && envSaveVersion > SAVE_VERSION) ||
            (Number.isFinite(envDataVersion) && envDataVersion > SAVE_DATA_VERSION)
        ) {
            return { ok: false, reason: 'newer_version' };
        }

        if (parsed.kind === 'all' && Array.isArray(parsed.slots)) {
            for (const slot of parsed.slots) {
                const v = this._validateSlotPayload(slot);
                if (!v.ok) return v;
            }
            // Persiste o retorno de migrateSaveData (loadSlot também atribui) —
            // se a migração devolver um objeto novo, descartá-lo deixaria saves
            // antigos sem migrar.
            const slots = parsed.slots.slice(0, MAX_SLOTS).map((s) => {
                if (!s) return null;
                return { ...s, data: migrateSaveData(s.data) };
            });
            while (slots.length < MAX_SLOTS) slots.push(null);
            if (!this._writeRoot({ version: SAVE_VERSION, slots })) {
                return { ok: false, reason: 'write_failed' };
            }
            this._dispatchEvent('save:changed', { action: 'import', kind: 'all' });
            return { ok: true, kind: 'all' };
        }

        if (parsed.kind === 'slot' && parsed.slot) {
            const target = opts.targetSlot;
            if (!Number.isInteger(target) || target < 0 || target >= MAX_SLOTS) {
                return { ok: false, reason: 'no_target' };
            }
            const v = this._validateSlotPayload(parsed.slot);
            if (!v.ok) return v;
            parsed.slot.data = migrateSaveData(parsed.slot.data);
            parsed.slot.meta.slotIndex = target;
            const root = this._readRoot();
            root.slots[target] = parsed.slot;
            if (!this._writeRoot(root)) {
                return { ok: false, reason: 'write_failed' };
            }
            this._dispatchEvent('save:changed', { action: 'import', kind: 'slot', slotIndex: target });
            return { ok: true, kind: 'slot', slotIndex: target };
        }

        return { ok: false, reason: 'unknown_kind' };
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

            // Plantio (#165): SEMPRE aplica — mesmo se o save não tiver dados,
            // limpa o solo/plantas/regador atuais pra não vazar entre saves.
            this._applyPlantationData(data.plantation);

            // Agora sim restaura o mapa (city snapshota a farm correta acima).
            if (data.currentMap && data.currentMap !== 'farm') {
                const mapMgr = getSystem('mapManager');
                if (mapMgr && mapMgr.restoreMap) {
                    await mapMgr.restoreMap(data.currentMap);
                }
            }

            // Aplicar baús: SEMPRE chama (mesmo sem dados) pra resetar baús que
            // possam ter vazado de outro slot/sessão antes de restaurar os deste.
            this._applyChestsData(data.chests);

            // Aplicar clima/tempo
            if (data.weather) {
                this._applyWeatherData(data.weather);
            }

            // Issue #201: restore the merchant daily-cash ledger AFTER weather so
            // the in-game day is already set (the ledger is keyed by day).
            getSystem('merchant')?.restore?.(data.merchant);

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
            plantation: this._getPlantationData(),
            // Issue #201: merchant daily-cash ledger (spent-today per merchant).
            merchant: getSystem('merchant')?.serialize?.() ?? null,
            xp: xp?.getState ? xp.getState() : null,
            currentMap: mapMgr ? mapMgr.getCurrentMapId() : 'farm'
        };
    }

    // Issue #165: tilled soil + crops + watering-can charges. Generic over all
    // crops (each system serializes its own state with relative timers).
    _getPlantationData() {
        return {
            tilled: getSystem('hoeTool')?.serialize?.() ?? [],
            crops: getSystem('crop')?.serialize?.() ?? [],
            wateringCanCharges: getSystem('wateringCan')?.serialize?.() ?? 0,
            bucketLevel: getSystem('bucket')?.serialize?.() ?? 0,
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
        const jeremy = getSystem('npcJeremy');
        const tutorials = getSystem('tutorialQuests');
        const fuel = getSystem('fuel');
        // #227 lazy-load: se um NPC (de city) ainda não foi carregado, preserva
        // o estado do último save aplicado em vez do default — senão salvar na
        // fazenda (antes de visitar o city) apagaria o progresso das quests.
        const cached = this._appliedGameFlags || {};
        const npcState = (npc, key, dflt) => (npc ? npc.getQuestState() : (cached[key] ?? dflt));
        return {
            pickup_repaired: questSys ? questSys.isQuestCompleted('fix_pickup') : false,
            battery: questSys ? questSys.getBatteryState() : null,
            fuel_percent: typeof fuel?.getFuel === 'function' ? fuel.getFuel() : null,
            bartolomeu_quest: npcState(bartolomeu, 'bartolomeu_quest', 'intro'),
            milly_quest: npcState(milly, 'milly_quest', 'idle'),
            bru_quest: npcState(bru, 'bru_quest', { dialogue: 'idle' }),
            john_quest: npcState(john, 'john_quest', { dialogue: 'idle', milkQuest: 'idle' }),
            lucas_quest: npcState(lucas, 'lucas_quest', { secretQuest: 'idle' }),
            isabela_quest: npcState(isabela, 'isabela_quest', { hasNoticed: false }),
            molly_quest: npcState(molly, 'molly_quest', { dialogue: 'idle' }),
            jeremy_quest: npcState(jeremy, 'jeremy_quest', { dialogue: 'idle', supplyQuest: 'idle' }),
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
            },
            // Timer (ms epoch) do efeito de comida especial que congela fome+sede.
            needsFreezeUntil: playerSystem?.needsFreezeUntil ?? 0
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
                name: chest.name,
                x: chest.x,
                y: chest.y,
                width: chest.width,
                height: chest.height,
                storage: chest.storage || {}
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
        if (playerSystem && typeof data.needsFreezeUntil === 'number') {
            // Timer em tempo real: se já expirou no momento do load, vira 0.
            playerSystem.needsFreezeUntil = data.needsFreezeUntil > Date.now() ? data.needsFreezeUntil : 0;
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

        // Notificar mudança de clima (mesmo evento que weather.js emite). Sem
        // isso, o audioManager não sabe que o clima trocou no load e o loop de
        // chuva/neblina do save anterior continua tocando no save novo.
        this._dispatchEvent('weatherChanged', { type: weather.weatherType });

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
     * Aplica dados do plantio (#165): solo arado, plantas, cargas do regador.
     * Cada sistema limpa o estado atual antes de restaurar, então carregar um
     * save (mesmo sem plantio) NÃO vaza plantação do save anterior.
     */
    _applyPlantationData(data) {
        const p = data || {};
        try {
            getSystem('hoeTool')?.restore?.(p.tilled ?? []);
            getSystem('crop')?.restore?.(p.crops ?? []);
            getSystem('wateringCan')?.restore?.(p.wateringCanCharges ?? 0);
            getSystem('bucket')?.restore?.(p.bucketLevel ?? 0);
            logger.info('🌱 Plantation restored');
        } catch (error) {
            logger.error('Error restoring plantation:', error);
        }
    }

    /**
     * Aplica dados dos baús
     */
    _applyChestsData(data) {
        const chestSystem = getSystem('chest');
        if (!chestSystem) return;

        // SEMPRE reseta os baús atuais primeiro (mundo + memória), mesmo que o
        // save não tenha nenhum — senão baús de outro slot/sessão vazam pra cá.
        if (typeof chestSystem.resetChests === 'function') chestSystem.resetChests();

        const chests = (data && typeof data === 'object') ? data : {};
        for (const chestData of Object.values(chests)) {
            if (typeof chestSystem.restoreChest === 'function') chestSystem.restoreChest(chestData);
        }

        logger.info(`[SaveSystem] ${Object.keys(chests).length} chests restored`);
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

    /**
     * Re-aplica os gameFlags do último save. Chamado quando os NPCs de city
     * são carregados sob demanda (#227) — no load, os NPCs ainda não existiam,
     * então o setQuestState foi ignorado; aqui empurramos o estado neles.
     */
    reapplyGameFlags() {
        if (this._appliedGameFlags) this._applyGameFlags(this._appliedGameFlags);
    }

    _applyGameFlags(flags) {
        if (!flags) return;
        // Cacheado pro _getGameFlags (fallback quando o NPC não está carregado)
        // e pro reapplyGameFlags (quando os NPCs de city carregarem depois).
        this._appliedGameFlags = flags;
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
        const jeremy = getSystem('npcJeremy');
        if (jeremy && flags.jeremy_quest) {
            jeremy.setQuestState(flags.jeremy_quest);
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