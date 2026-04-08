/**
 * @file cityHouseSystem.js - Sistema de interação com casas da cidade
 * @description Gerencia hitboxes de colisão e interações com as casas na cidade de Goose Cape.
 * Carrega definições de hitbox do JSON config e suporta hot-reload (F2 + Ctrl+S).
 * @module CityHouseSystem
 */

import { collisionSystem } from './collisionSystem.js';
import { getObject, registerSystem } from './gameState.js';
import { camera } from './thePlayer/cameraSystem.js';
import { logger } from './logger.js';

const HITBOX_CONFIG_URL = 'scripts/debug/cityHitboxConfig.json';
const HOT_RELOAD_INTERVAL = 1500; // ms

/**
 * Sistema de gerenciamento de interação com casas da cidade
 * Detecta proximidade do jogador e gerencia hints de interação
 * @class CityHouseSystem
 */
export class CityHouseSystem {
    constructor() {
        this.houses = [];
        this.parkFurniture = [];
        this.houseHitboxes = new Map();
        this.isInitialized = false;
        this.proximityCheckInterval = null;
        this.currentNearbyHouse = null;
        this.hintElement = null;
        this._hotReloadTimer = null;
        this._lastConfigText = null;
        this._debugDraw = false;

        // Carrega config inicial
        this._loadConfig();

        logger.debug('[CityHouseSystem] Inicializado');
    }

    /**
     * Carrega hitbox config do JSON
     */
    async _loadConfig() {
        try {
            const resp = await fetch(HITBOX_CONFIG_URL + '?t=' + Date.now());
            const text = await resp.text();

            // Só atualiza se mudou
            if (text === this._lastConfigText) return;
            this._lastConfigText = text;

            const data = JSON.parse(text);
            if (!data.houses || !Array.isArray(data.houses)) return;

            // Rebuild houses array
            const oldNearState = {};
            for (const h of this.houses) {
                oldNearState[h.id] = h.isPlayerNear || false;
            }

            this.houses = data.houses.map(h => ({
                id: h.id,
                name: h.name,
                owner: h.owner,
                houseType: h.houseType,
                description: h.description,
                x: h.x,
                y: h.y,
                width: h.width,
                height: h.height,
                isPlayerNear: oldNearState[h.id] || false
            }));

            // Carrega parkFurniture se existir
            if (data.parkFurniture && Array.isArray(data.parkFurniture)) {
                this.parkFurniture = data.parkFurniture.map(f => ({
                    id: f.id,
                    name: f.name,
                    x: f.x,
                    y: f.y,
                    width: f.width,
                    height: f.height
                }));
            }

            // Re-register hitboxes se já estava inicializado
            if (this.isInitialized) {
                this._reRegisterHitboxes();
            }

            logger.info('[CityHouseSystem] Config carregado:', this.houses.length, 'casas,', this.parkFurniture.length, 'móveis de parque');
        } catch (e) {
            logger.warn('[CityHouseSystem] Falha ao carregar config:', e.message);
        }
    }

    /**
     * Re-registra todas as hitboxes (usado no hot-reload)
     */
    _reRegisterHitboxes() {
        // Remove as antigas
        for (const houseId of this.houseHitboxes.keys()) {
            collisionSystem.removeHitbox(houseId);
        }
        this.houseHitboxes.clear();

        // Registra as novas houses
        for (const house of this.houses) {
            if (house.x === 0 && house.y === 0 && house.width === 0 && house.height === 0) continue;

            const hitbox = {
                id: house.id,
                type: 'CITY_HOUSE',
                x: house.x,
                y: house.y,
                width: house.width,
                height: house.height,
                originalType: 'city_house',
                owner: house.owner,
                name: house.name,
                description: house.description,
                houseType: house.houseType
            };

            collisionSystem.addHitbox(hitbox.id, hitbox.type, hitbox.x, hitbox.y, hitbox.width, hitbox.height);
            this.houseHitboxes.set(house.id, hitbox);
        }

        // Registra park furniture
        for (const furniture of this.parkFurniture) {
            if (furniture.x === 0 && furniture.y === 0 && furniture.width === 0 && furniture.height === 0) continue;

            const hitbox = {
                id: furniture.id,
                type: 'PARK_FURNITURE',
                x: furniture.x,
                y: furniture.y,
                width: furniture.width,
                height: furniture.height,
                originalType: 'park_furniture',
                name: furniture.name
            };

            collisionSystem.addHitbox(hitbox.id, hitbox.type, hitbox.x, hitbox.y, hitbox.width, hitbox.height);
            this.houseHitboxes.set(furniture.id, hitbox);
        }

        logger.debug('[CityHouseSystem] Hitboxes re-registradas:', this.houseHitboxes.size);
    }

    /**
     * Inicia hot-reload polling do JSON config
     */
    startHotReload() {
        if (this._hotReloadTimer) return;
        this._hotReloadTimer = setInterval(() => this._loadConfig(), HOT_RELOAD_INTERVAL);
        this._debugDraw = true;
        logger.info('[CityHouseSystem] Hot-reload ativado (polling a cada', HOT_RELOAD_INTERVAL, 'ms)');
    }

    /**
     * Para hot-reload
     */
    stopHotReload() {
        if (this._hotReloadTimer) {
            clearInterval(this._hotReloadTimer);
            this._hotReloadTimer = null;
        }
        this._debugDraw = false;
    }

    /**
     * Registra as hitboxes das casas no collision system
     */
    registerHouseHitboxes() {
        if (this.isInitialized) return;

        for (const house of this.houses) {
            if (house.x === 0 && house.y === 0 && house.width === 0 && house.height === 0) {
                logger.warn(`[CityHouseSystem] Casa ${house.id} sem coordenadas definidas ainda`);
                continue;
            }

            const hitbox = {
                id: house.id,
                type: 'CITY_HOUSE',
                x: house.x,
                y: house.y,
                width: house.width,
                height: house.height,
                originalType: 'city_house',
                owner: house.owner,
                name: house.name,
                description: house.description,
                houseType: house.houseType
            };

            collisionSystem.addHitbox(hitbox.id, hitbox.type, hitbox.x, hitbox.y, hitbox.width, hitbox.height);
            this.houseHitboxes.set(house.id, hitbox);

            logger.debug(`[CityHouseSystem] Hitbox registrada: ${house.id} (${house.name})`);
        }

        this.isInitialized = true;
        this.setupProximityCheck();
        this.startHotReload();
        logger.info('[CityHouseSystem] Hitboxes das casas registradas e hot-reload ativo');
    }

    /**
     * Desenha hitboxes vermelhas no canvas (debug visual)
     * Chamado pelo game loop quando F2 está ativo
     */
    drawDebugHitboxes(ctx) {
        if (!this._debugDraw || !camera) return;

        ctx.save();
        ctx.lineWidth = 2;

        for (const house of this.houses) {
            if (house.width === 0 && house.height === 0) continue;

            const sp = camera.worldToScreen(house.x, house.y);
            const w = house.width * camera.zoom;
            const h = house.height * camera.zoom;

            // Retangulo vermelho semi-transparente
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(sp.x, sp.y, w, h);

            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.strokeRect(sp.x, sp.y, w, h);

            // Label com nome e ID
            ctx.fillStyle = '#FF0000';
            ctx.font = '11px monospace';
            ctx.fillText(`${house.name}`, sp.x + 2, sp.y - 14);
            ctx.fillStyle = '#FFAAAA';
            ctx.font = '9px monospace';
            ctx.fillText(`${house.id} (${house.x},${house.y} ${house.width}x${house.height})`, sp.x + 2, sp.y - 3);
        }

        ctx.restore();
    }

    setupProximityCheck() {
        if (this.proximityCheckInterval) clearInterval(this.proximityCheckInterval);

        this.proximityCheckInterval = setInterval(() => {
            this.checkPlayerProximity();
        }, 100);
    }

    checkPlayerProximity() {
        const currentPlayer = getObject('currentPlayer');
        if (!currentPlayer || !this.isInitialized) {
            if (this.currentNearbyHouse) {
                this.hideHouseHint();
                this.currentNearbyHouse = null;
            }
            return;
        }

        const playerHitbox = collisionSystem.createPlayerHitbox(
            currentPlayer.x,
            currentPlayer.y,
            currentPlayer.width,
            currentPlayer.height
        );

        let foundNearby = null;

        for (const [houseId, hitbox] of this.houseHitboxes) {
            const house = this.getHouseById(houseId);
            if (!house) continue;

            const isNear = collisionSystem.checkCollision(playerHitbox, hitbox);

            if (isNear && !house.isPlayerNear) {
                house.isPlayerNear = true;
                foundNearby = house;
            } else if (!isNear && house.isPlayerNear) {
                house.isPlayerNear = false;
            }

            if (house.isPlayerNear) {
                foundNearby = house;
            }
        }

        if (foundNearby && (!this.currentNearbyHouse || foundNearby.id !== this.currentNearbyHouse.id)) {
            this.currentNearbyHouse = foundNearby;
            this.showHouseHint(foundNearby);
        } else if (!foundNearby && this.currentNearbyHouse) {
            this.currentNearbyHouse = null;
            this.hideHouseHint();
        }
    }

    showHouseHint(house) {
        this.hideHouseHint();

        const hint = document.createElement('div');
        hint.className = 'door-hint active';
        hint.id = `hint-${house.id}`;

        const content = document.createElement('div');
        content.className = 'hint-content';

        const text = document.createElement('span');
        text.className = 'hint-text';
        text.textContent = `Pressione E — ${house.name}`;

        content.appendChild(text);
        hint.appendChild(content);
        document.body.appendChild(hint);

        this.hintElement = hint;

        logger.debug(`[CityHouseSystem] Hint mostrado: ${house.name}`);
    }

    hideHouseHint() {
        if (this.hintElement) {
            this.hintElement.remove();
            this.hintElement = null;
        }
    }

    clearHouseHitboxes() {
        if (this.proximityCheckInterval) {
            clearInterval(this.proximityCheckInterval);
            this.proximityCheckInterval = null;
        }

        this.stopHotReload();
        this.hideHouseHint();

        for (const houseId of this.houseHitboxes.keys()) {
            collisionSystem.removeHitbox(houseId);
        }

        this.houseHitboxes.clear();
        this.currentNearbyHouse = null;
        this.isInitialized = false;

        for (const house of this.houses) {
            house.isPlayerNear = false;
        }

        logger.debug('[CityHouseSystem] Hitboxes das casas removidas');
    }

    getNearbyHouse() {
        return this.currentNearbyHouse;
    }

    getHouseById(houseId) {
        return this.houses.find(h => h.id === houseId) || null;
    }

    getAllHouses() {
        return [...this.houses];
    }

    updateHouseCoordinates(houseId, x, y, width, height) {
        const house = this.getHouseById(houseId);
        if (!house) {
            logger.warn(`[CityHouseSystem] Casa ${houseId} não encontrada`);
            return;
        }

        house.x = x;
        house.y = y;
        house.width = width;
        house.height = height;

        if (this.houseHitboxes.has(houseId)) {
            collisionSystem.removeHitbox(houseId);
            collisionSystem.addHitbox(houseId, 'CITY_HOUSE', x, y, width, height);
            logger.debug(`[CityHouseSystem] Hitbox atualizada: ${houseId}`);
        }
    }

    addHouse(houseConfig) {
        const newHouse = {
            ...houseConfig,
            isPlayerNear: false
        };
        this.houses.push(newHouse);

        if (this.isInitialized) {
            const hitbox = {
                id: newHouse.id,
                type: 'CITY_HOUSE',
                x: newHouse.x,
                y: newHouse.y,
                width: newHouse.width,
                height: newHouse.height,
                originalType: 'city_house',
                owner: newHouse.owner,
                name: newHouse.name,
                description: newHouse.description,
                houseType: newHouse.houseType
            };

            collisionSystem.addHitbox(hitbox.id, hitbox.type, hitbox.x, hitbox.y, hitbox.width, hitbox.height);
            this.houseHitboxes.set(newHouse.id, hitbox);

            logger.debug(`[CityHouseSystem] Nova casa adicionada: ${newHouse.id} (${newHouse.name})`);
        }
    }

    removeHouse(houseId) {
        const house = this.getHouseById(houseId);
        if (!house) return;

        const idx = this.houses.indexOf(house);
        if (idx >= 0) this.houses.splice(idx, 1);

        if (this.houseHitboxes.has(houseId)) {
            collisionSystem.removeHitbox(houseId);
            this.houseHitboxes.delete(houseId);
        }

        if (this.currentNearbyHouse?.id === houseId) {
            this.hideHouseHint();
            this.currentNearbyHouse = null;
        }

        logger.debug(`[CityHouseSystem] Casa removida: ${houseId}`);
    }

    getHouseInteractable() {
        return this.currentNearbyHouse;
    }

    cleanup() {
        this.clearHouseHitboxes();
    }
}

// Exportar instância única
export const cityHouseSystem = new CityHouseSystem();

// Registrar no gameState
registerSystem('cityHouse', cityHouseSystem);

export default cityHouseSystem;
