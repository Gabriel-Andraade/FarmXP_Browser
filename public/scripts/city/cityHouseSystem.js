/**
 * @file cityHouseSystem.js - City house interaction system
 * @description Manages collision hitboxes and interactions with houses in Goose Cape city.
 * Loads hitbox definitions from the JSON config and supports hot-reload (F2 + Ctrl+S).
 * @module CityHouseSystem
 */

import { collisionSystem } from '../collisionSystem.js';
import { getObject, registerSystem } from '../gameState.js';
import { camera } from '../thePlayer/cameraSystem.js';
import { logger } from '../logger.js';

const HITBOX_CONFIG_URL = 'scripts/debug/cityHitboxConfig.json';
const HOT_RELOAD_INTERVAL = 1500; // ms

/**
 * City house interaction manager.
 * Detects player proximity and manages interaction hints.
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

        // Load initial config
        this._loadConfig();

        logger.debug('[CityHouseSystem] Initialized');
    }

    /**
     * Load hitbox config from JSON
     */
    async _loadConfig() {
        try {
            const resp = await fetch(HITBOX_CONFIG_URL + '?t=' + Date.now());
            const text = await resp.text();

            // Skip if unchanged
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

            // Load parkFurniture if present
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

            // Re-register hitboxes if already initialized
            if (this.isInitialized) {
                this._reRegisterHitboxes();
            }

            logger.info('[CityHouseSystem] Config loaded:', this.houses.length, 'houses,', this.parkFurniture.length, 'park furniture');
        } catch (e) {
            logger.warn('[CityHouseSystem] Failed to load config:', e.message);
        }
    }

    /**
     * Re-register all hitboxes (used on hot-reload)
     */
    _reRegisterHitboxes() {
        // Remove old ones
        for (const houseId of this.houseHitboxes.keys()) {
            collisionSystem.removeHitbox(houseId);
        }
        this.houseHitboxes.clear();

        // Register the new houses
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

        // Register park furniture
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

        logger.debug('[CityHouseSystem] Hitboxes re-registered:', this.houseHitboxes.size);
    }

    /**
     * Start hot-reload polling of the JSON config
     */
    startHotReload() {
        if (this._hotReloadTimer) return;
        this._hotReloadTimer = setInterval(() => this._loadConfig(), HOT_RELOAD_INTERVAL);
        this._debugDraw = true;
        logger.info('[CityHouseSystem] Hot-reload enabled (polling every', HOT_RELOAD_INTERVAL, 'ms)');
    }

    /**
     * Stop hot-reload
     */
    stopHotReload() {
        if (this._hotReloadTimer) {
            clearInterval(this._hotReloadTimer);
            this._hotReloadTimer = null;
        }
        this._debugDraw = false;
    }

    /**
     * Register house hitboxes in the collision system
     */
    registerHouseHitboxes() {
        if (this.isInitialized) return;

        for (const house of this.houses) {
            if (house.x === 0 && house.y === 0 && house.width === 0 && house.height === 0) {
                logger.warn(`[CityHouseSystem] House ${house.id} has no coordinates defined yet`);
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

            logger.debug(`[CityHouseSystem] Hitbox registered: ${house.id} (${house.name})`);
        }

        this.isInitialized = true;
        this.setupProximityCheck();
        this.startHotReload();
        logger.info('[CityHouseSystem] House hitboxes registered and hot-reload active');
    }

    /**
     * Draw red hitboxes on the canvas (visual debug).
     * Called by the game loop when F2 is active.
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

            // Semi-transparent red rectangle
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(sp.x, sp.y, w, h);

            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.strokeRect(sp.x, sp.y, w, h);

            // Label with name and id
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

        logger.debug(`[CityHouseSystem] Hint shown: ${house.name}`);
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

        logger.debug('[CityHouseSystem] House hitboxes removed');
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
            logger.warn(`[CityHouseSystem] House ${houseId} not found`);
            return;
        }

        house.x = x;
        house.y = y;
        house.width = width;
        house.height = height;

        if (this.houseHitboxes.has(houseId)) {
            collisionSystem.removeHitbox(houseId);
            collisionSystem.addHitbox(houseId, 'CITY_HOUSE', x, y, width, height);
            logger.debug(`[CityHouseSystem] Hitbox updated: ${houseId}`);
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

            logger.debug(`[CityHouseSystem] New house added: ${newHouse.id} (${newHouse.name})`);
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

        logger.debug(`[CityHouseSystem] House removed: ${houseId}`);
    }

    getHouseInteractable() {
        return this.currentNearbyHouse;
    }

    cleanup() {
        this.clearHouseHitboxes();
    }
}

// Single exported instance
export const cityHouseSystem = new CityHouseSystem();

// Register in gameState
registerSystem('cityHouse', cityHouseSystem);

export default cityHouseSystem;
