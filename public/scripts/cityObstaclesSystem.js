/**
 * @file cityObstaclesSystem.js - Hitboxes de obstáculos estáticos da cidade
 * @description Lê posições do JSON do mapa Tiled automaticamente e aplica dimensões
 * definidas em cityHitboxConfig.json (seção "obstacleTypes").
 *
 * Cada tipo tem um único entry no config — alterar offsetX/offsetY/width/height
 * atualiza TODOS os objetos daquele tipo ao vivo (hot-reload, igual às casas).
 *
 * @module CityObstaclesSystem
 */

import { collisionSystem } from './collisionSystem.js';
import { registerSystem } from './gameState.js';
import { camera } from './thePlayer/cameraSystem.js';
import { logger } from './logger.js';

const HITBOX_CONFIG_URL = 'scripts/debug/cityHitboxConfig.json';
const MAP_URL = 'city_map/city-of-goose-cape.json';
const HOT_RELOAD_INTERVAL = 1500;

export class CityObstaclesSystem {
    constructor() {
        /** @type {Record<string, {offsetX:number, offsetY:number, width:number, height:number}>} */
        this._obstacleTypes = {};

        /** Street light glow settings from config */
        this._lightSettings = {};

        /** Objetos extraídos do mapa Tiled — carregado uma vez, posições são fixas */
        this._mapObjects = null;

        /** id → { id, image, x, y, width, height } */
        this._hitboxes = new Map();

        this.isInitialized = false;
        this._hotReloadTimer = null;
        this._lastConfigText = null;
        this._debugDraw = false;

        logger.debug('[CityObstaclesSystem] Inicializado');
    }

    // ─── Map loading ──────────────────────────────────────────────────────────

    async _loadMapObjects() {
        if (this._mapObjects !== null) return;

        try {
            const resp = await fetch(MAP_URL + '?t=' + Date.now());
            const data = await resp.json();
            this._mapObjects = this._extractMapObjects(data);
            logger.info('[CityObstaclesSystem] Objetos do mapa carregados:', this._mapObjects.length);
        } catch (e) {
            logger.warn('[CityObstaclesSystem] Falha ao carregar mapa:', e.message);
            this._mapObjects = [];
        }
    }

    /**
     * Extrai objetos de todas as objectgroups, deduplica por posição.
     * @returns {Array<{mapId:number, image:string, x:number, y:number}>}
     */
    _extractMapObjects(data) {
        const tilesets = data.tilesets.slice().sort((a, b) => a.firstgid - b.firstgid);
        const FLIP_MASK = 0xE0000000;

        function getTileImage(gid) {
            const cleanGid = gid & ~FLIP_MASK;
            let ts = null;
            for (let i = tilesets.length - 1; i >= 0; i--) {
                if (cleanGid >= tilesets[i].firstgid) { ts = tilesets[i]; break; }
            }
            if (!ts || !ts.tiles) return null;
            const localId = cleanGid - ts.firstgid;
            const tileInfo = ts.tiles.find(t => t.id === localId);
            if (!tileInfo) return null;
            return tileInfo.image.split('/').pop().replace(/\.[^.]+$/, '');
        }

        const seen = new Set();
        const objects = [];

        for (const layer of data.layers) {
            if (layer.type !== 'objectgroup') continue;
            const ox = layer.offsetx || 0;
            const oy = layer.offsety || 0;

            for (const obj of layer.objects) {
                if (!obj.gid) continue;
                const image = getTileImage(obj.gid);
                if (!image) continue;

                const x = Math.round(obj.x + ox);
                const y = Math.round((obj.y + oy) - obj.height);

                // Deduplica objetos na mesma posição (artefato do Tiled)
                const key = `${image}_${x}_${y}`;
                if (seen.has(key)) continue;
                seen.add(key);

                objects.push({ mapId: obj.id, image, x, y });
            }
        }

        return objects;
    }

    // ─── Config loading ───────────────────────────────────────────────────────

    async _loadConfig() {
        try {
            const resp = await fetch(HITBOX_CONFIG_URL + '?t=' + Date.now());
            const text = await resp.text();
            if (text === this._lastConfigText) return;
            this._lastConfigText = text;

            const data = JSON.parse(text);
            if (!data.obstacleTypes || typeof data.obstacleTypes !== 'object') return;

            this._obstacleTypes = data.obstacleTypes;
            if (data.streetLightSettings) this._lightSettings = data.streetLightSettings;

            if (this.isInitialized) {
                this._reRegisterHitboxes();
            }

            logger.info('[CityObstaclesSystem] Config carregado:', Object.keys(this._obstacleTypes).length, 'tipos');
        } catch (e) {
            logger.warn('[CityObstaclesSystem] Falha ao carregar config:', e.message);
        }
    }

    // ─── Hitbox management ────────────────────────────────────────────────────

    _reRegisterHitboxes() {
        for (const id of this._hitboxes.keys()) {
            collisionSystem.removeHitbox(id);
        }
        this._hitboxes.clear();
        this._buildHitboxes();
        logger.debug('[CityObstaclesSystem] Hitboxes re-registradas:', this._hitboxes.size);
    }

    _buildHitboxes() {
        if (!this._mapObjects) return;

        for (const obj of this._mapObjects) {
            const typeDef = this._obstacleTypes[obj.image];
            if (!typeDef) continue; // sem config = sem hitbox (arbustos decorativos, etc.)

            const hx = obj.x + (typeDef.offsetX || 0);
            const hy = obj.y + (typeDef.offsetY || 0);

            const id = `city_obs_${obj.image}_${obj.mapId}`;
            collisionSystem.addHitbox(id, 'CITY_OBSTACLE', hx, hy, typeDef.width, typeDef.height);
            this._hitboxes.set(id, { id, image: obj.image, x: hx, y: hy, width: typeDef.width, height: typeDef.height });
        }
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    async registerObstacles() {
        if (this.isInitialized) return;

        await this._loadMapObjects();
        await this._loadConfig();

        this._buildHitboxes();
        this.isInitialized = true;
        this.startHotReload();

        logger.info('[CityObstaclesSystem] Obstáculos registrados:', this._hitboxes.size);
    }

    clearObstacles() {
        this.stopHotReload();

        for (const id of this._hitboxes.keys()) {
            collisionSystem.removeHitbox(id);
        }
        this._hitboxes.clear();
        this.isInitialized = false;
        this._lastConfigText = null;

        logger.debug('[CityObstaclesSystem] Hitboxes limpas');
    }

    startHotReload() {
        if (this._hotReloadTimer) return;
        this._hotReloadTimer = setInterval(() => this._loadConfig(), HOT_RELOAD_INTERVAL);
        this._debugDraw = true;
        logger.info('[CityObstaclesSystem] Hot-reload ativado');
    }

    stopHotReload() {
        if (this._hotReloadTimer) {
            clearInterval(this._hotReloadTimer);
            this._hotReloadTimer = null;
        }
        this._debugDraw = false;
    }

    /**
     * Desenha hitboxes em azul no canvas (debug visual — ativo com F2).
     * @param {CanvasRenderingContext2D} ctx
     */
    drawDebugHitboxes(ctx) {
        if (!this._debugDraw || !camera) return;

        ctx.save();
        ctx.lineWidth = 2;

        for (const hb of this._hitboxes.values()) {
            const sp = camera.worldToScreen(hb.x, hb.y);
            const w = hb.width * camera.zoom;
            const h = hb.height * camera.zoom;

            ctx.fillStyle = 'rgba(0, 150, 255, 0.2)';
            ctx.fillRect(sp.x, sp.y, w, h);

            ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)';
            ctx.strokeRect(sp.x, sp.y, w, h);

            ctx.fillStyle = '#00aaff';
            ctx.font = '11px monospace';
            ctx.fillText(hb.image, sp.x + 2, sp.y - 14);
            ctx.fillStyle = '#aaddff';
            ctx.font = '9px monospace';
            ctx.fillText(`(${hb.x},${hb.y} ${hb.width}x${hb.height})`, sp.x + 2, sp.y - 3);
        }

        ctx.restore();
    }

    /** Retorna configurações de glow das luzes (lido do config JSON) */
    getLightSettings() {
        return this._lightSettings;
    }

    /**
     * Retorna posições de luz dos postes (world coords) para o sistema de iluminação.
     * Usa lightOffsetX/Y do config, com fallback para o centro do hitbox.
     * @returns {Array<{x: number, y: number, radius: number}>}
     */
    getLightPositions() {
        if (!this._mapObjects) return [];

        const lights = [];
        const postTypes = ['postLeft', 'postRight', 'postUp'];

        for (const obj of this._mapObjects) {
            if (!postTypes.includes(obj.image)) continue;
            const typeDef = this._obstacleTypes[obj.image];
            if (!typeDef) continue;

            const lx = obj.x + (typeDef.lightOffsetX ?? typeDef.offsetX ?? 0);
            const ly = obj.y + (typeDef.lightOffsetY ?? typeDef.offsetY ?? 0);
            const radius = typeDef.lightRadius ?? 150;

            lights.push({ x: lx, y: ly, radius });
        }

        return lights;
    }

    cleanup() {
        this.clearObstacles();
    }
}

export const cityObstaclesSystem = new CityObstaclesSystem();
registerSystem('cityObstacles', cityObstaclesSystem);
export default cityObstaclesSystem;
