/**
 * @file cityRenderer.js - City map renderer (Goose Cape City)
 * @description Loads the JSON converted from TMX and renders tile layers + objects.
 * Uses an offscreen canvas cache for the tile layers (performance).
 * @module CityRenderer
 */

import { camera } from '../thePlayer/cameraSystem.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../worldConstants.js';
import { logger } from '../logger.js';

// ─── State ──────────────────────────────────────────────────────────────────

let mapData = null;          // parsed JSON from TMX converter
const tilesetImages = {};    // key=tileset.name → HTMLImageElement
let assetsLoaded = false;
let assetsLoading = false;

/** Resolve callbacks waiting for module to be ready for sync access */
const readyListeners = [];
let _isReady = false;

/** offscreen canvas cache for tile layers */
let _bgCache = null;

// ─── Image loading helper ───────────────────────────────────────────────────

function loadImg(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => { resolve(null); };
        img.src = src;
    });
}

// ─── Public: load city assets ───────────────────────────────────────────────

export async function loadCityAssets() {
    if (assetsLoaded || assetsLoading) return;
    assetsLoading = true;

    try {
        // 1. Fetch the pre-converted JSON
        const resp = await fetch('city_map/city-of-goose-cape.json');
        mapData = await resp.json();
    } catch (e) {
        logger.warn('[CityRenderer] Failed to load map JSON: ' + e.message);
        assetsLoading = false;
        return;
    }

    // 2. Load all tileset images
    const imagePromises = [];

    for (const ts of mapData.tilesets) {
        if (ts.missing) continue;

        // Grid-based tileset (single image)
        if (ts.image) {
            imagePromises.push(
                loadImg(`city_map/${ts.image}`).then(img => {
                    if (img) tilesetImages[ts.name] = img;
                    else logger.warn(`[CityRenderer] Image not found: ${ts.image}`);
                })
            );
        }

        // Collection-of-images tileset (individual tile images)
        if (ts.tiles && ts.tiles.length > 0) {
            for (const tile of ts.tiles) {
                const key = `${ts.name}_tile_${tile.id}`;
                imagePromises.push(
                    loadImg(`city_map/${tile.image}`).then(img => {
                        if (img) tilesetImages[key] = img;
                        else logger.warn(`[CityRenderer] Image not found: ${tile.image}`);
                    })
                );
            }
        }
    }

    await Promise.all(imagePromises);
    assetsLoaded = true;
    assetsLoading = false;
    _bgCache = null;
    _isReady = true;

    // Notify all waiters that module is ready
    readyListeners.forEach(resolve => resolve());
    readyListeners.length = 0;

    logger.info('[CityRenderer] City assets loaded');
}

/** Wait for cityRenderer to be ready for synchronous access */
export function ensureCityRendererReady() {
    if (_isReady) return Promise.resolve();
    return new Promise(resolve => {
        readyListeners.push(resolve);
    });
}

export function areCityAssetsLoaded() {
    return assetsLoaded;
}

// ─── Tileset GID resolution ─────────────────────────────────────────────────

/**
 * Given a global tile ID (GID), find which tileset it belongs to
 * and return the info needed to draw it.
 * Returns null if the tile should be skipped.
 */
function resolveTile(gid) {
    if (gid === 0) return null;

    // Tiled uses upper bits for flip flags — mask them out
    const FLIP_H = 0x80000000;
    const FLIP_V = 0x40000000;
    const FLIP_D = 0x20000000;
    const cleanGid = gid & ~(FLIP_H | FLIP_V | FLIP_D);

    // Find the tileset (tilesets are sorted by firstgid ascending)
    let ts = null;
    for (let i = mapData.tilesets.length - 1; i >= 0; i--) {
        if (cleanGid >= mapData.tilesets[i].firstgid) {
            ts = mapData.tilesets[i];
            break;
        }
    }
    if (!ts || ts.missing) return null;

    const localId = cleanGid - ts.firstgid;

    // Grid-based tileset
    if (ts.columns > 0 && ts.image) {
        const img = tilesetImages[ts.name];
        if (!img) return null;
        const col = localId % ts.columns;
        const row = Math.floor(localId / ts.columns);
        return {
            img,
            sx: col * ts.tilewidth,
            sy: row * ts.tileheight,
            sw: ts.tilewidth,
            sh: ts.tileheight,
        };
    }

    // Collection-of-images tileset
    if (ts.tiles && ts.tiles.length > 0) {
        const tileInfo = ts.tiles.find(t => t.id === localId);
        if (!tileInfo) return null;
        const key = `${ts.name}_tile_${localId}`;
        const img = tilesetImages[key];
        if (!img) return null;
        return {
            img,
            sx: 0,
            sy: 0,
            sw: tileInfo.width,
            sh: tileInfo.height,
        };
    }

    return null;
}

// ─── Background cache (all tile layers baked into one offscreen canvas) ─────

function buildBackgroundCache() {
    if (!mapData || !assetsLoaded) return;

    const w = mapData.width * mapData.tilewidth;   // 2560
    const h = mapData.height * mapData.tileheight;  // 2560

    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');

    // Fill with base color
    offCtx.fillStyle = '#7a7a7a';
    offCtx.fillRect(0, 0, w, h);

    // Render each tile layer in order (skip object groups)
    if (!mapData.layers || !Array.isArray(mapData.layers)) return;

    for (const layer of mapData.layers) {
        if (layer.type !== 'tilelayer' || !layer.data || !Array.isArray(layer.data)) continue;

        const cols = layer.width;
        const data = layer.data;

        if (!cols || cols <= 0 || data.length === 0) continue;

        for (let i = 0; i < data.length; i++) {
            const gid = data[i];
            if (gid === 0) continue;

            const tile = resolveTile(gid);
            if (!tile) continue;

            const col = i % cols;
            const row = Math.floor(i / cols);
            const dx = col * mapData.tilewidth;
            const dy = row * mapData.tileheight;

            offCtx.drawImage(
                tile.img,
                tile.sx, tile.sy, tile.sw, tile.sh,
                dx, dy, mapData.tilewidth, mapData.tileheight
            );
        }
    }

    _bgCache = offCanvas;
    logger.info('[CityRenderer] Background cache built');
}

// ─── Public: draw city background ───────────────────────────────────────────

export function drawCityBackground(ctx) {
    if (!assetsLoaded) return;
    if (!_bgCache) buildBackgroundCache();
    if (!_bgCache) return;

    const camX = camera.x;
    const camY = camera.y;
    const camW = camera.width;
    const camH = camera.height;
    const zoom = camera.zoom;

    const sx = Math.max(0, Math.floor(camX));
    const sy = Math.max(0, Math.floor(camY));
    const sw = Math.min(_bgCache.width - sx, Math.ceil(camW));
    const sh = Math.min(_bgCache.height - sy, Math.ceil(camH));
    if (sw <= 0 || sh <= 0) return;

    const destX = (sx - camX) * zoom;
    const destY = (sy - camY) * zoom;
    ctx.drawImage(_bgCache, sx, sy, sw, sh, destX, destY, sw * zoom, sh * zoom);
}

// ─── Public: get city objects (from TMX object groups) ──────────────────────

export function getCityObjects() {
    if (!assetsLoaded || !mapData) return [];

    const objects = [];

    // Iterate over all map layers (preserving objectgroup order)
    for (const layer of mapData.layers) {
        if (layer.type !== "objectgroup") continue;

        const ox = layer.offsetx || 0;
        const oy = layer.offsety || 0;
        const layerIndex = layer.objectGroupIndex || 0;

        for (const obj of layer.objects) {
            if (!obj.gid) continue;

            const tile = resolveTile(obj.gid);
            if (!tile) continue;

            const objX = obj.x + ox;
            const objY = (obj.y + oy) - (obj.height || tile.sh);
            const objW = obj.width || tile.sw;
            const objH = obj.height || tile.sh;

            objects.push({
                id: `city_obj_${obj.id}`,
                type: 'CITY_OBJECT',
                originalType: 'city_decoration',
                x: objX,
                y: objY,
                width: objW,
                height: objH,
                layerIndex,
                draw: (ctx) => {
                    const sp = camera.worldToScreen(objX, objY);
                    const dw = objW * camera.zoom;
                    const dh = objH * camera.zoom;

                    if (sp.x + dw < 0 || sp.x > GAME_WIDTH ||
                        sp.y + dh < 0 || sp.y > GAME_HEIGHT) return;

                    ctx.drawImage(tile.img, tile.sx, tile.sy, tile.sw, tile.sh,
                        sp.x, sp.y, dw, dh);
                }
            });
        }
    }

    return objects;
}

// ─── Public: invalidate cache ───────────────────────────────────────────────

export function invalidateCityCache() {
    _bgCache = null;
}
