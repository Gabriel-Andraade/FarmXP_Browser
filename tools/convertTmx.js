#!/usr/bin/env bun
/**
 * Converte o TMX (Tiled) para JSON consumível pelo jogo.
 * Decodifica base64+zlib das tile layers e resolve caminhos de tilesets.
 *
 * Uso: bun tools/convertTmx.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { inflateSync } from 'zlib';

const TMX_PATH = resolve('public/city_map/tiled/goose-cape-city1.0.tmx');
const OUT_PATH = resolve('public/city_map/city-of-goose-cape.json');
const CITY_DIR = dirname(TMX_PATH);

// ─── XML mini-parser (good enough for TMX) ──────────────────────────────────

function attr(tag, name) {
    const m = tag.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1] : null;
}

function allTags(xml, tagName) {
    const re = new RegExp(`<${tagName}\\b[^>]*(?:\\/>|>[\\s\\S]*?<\\/${tagName}>)`, 'g');
    return [...xml.matchAll(re)].map(m => m[0]);
}

function innerText(tag, childTag) {
    const m = tag.match(new RegExp(`<${childTag}[^>]*>([\\s\\S]*?)<\\/${childTag}>`));
    return m ? m[1].trim() : null;
}

// ─── Parse TSX ──────────────────────────────────────────────────────────────

function parseTsx(tsxPath) {
    if (!existsSync(tsxPath)) {
        console.warn(`  ⚠ TSX not found: ${tsxPath}`);
        return null;
    }
    const xml = readFileSync(tsxPath, 'utf-8');
    const tsxDir = dirname(tsxPath);
    const ts = xml.match(/<tileset[^>]*>/)?.[0];
    if (!ts) return null;

    const info = {
        name: attr(ts, 'name'),
        tilewidth: parseInt(attr(ts, 'tilewidth')) || 32,
        tileheight: parseInt(attr(ts, 'tileheight')) || 32,
        tilecount: parseInt(attr(ts, 'tilecount')) || 0,
        columns: parseInt(attr(ts, 'columns')) || 0,
        image: null,
        imagewidth: 0,
        imageheight: 0,
        tiles: [], // for collection-of-images tilesets
    };

    // Single-image tileset
    const imgTag = xml.match(/<image[^>]*\/>/g) || xml.match(/<image[^>]*>/g) || [];

    if (info.columns > 0 && imgTag.length > 0) {
        // Grid-based tileset — single image
        const src = attr(imgTag[0], 'source') || '';
        // Resolve relative to TSX file location, then get just the filename
        info.image = basename(resolve(tsxDir, src));
        info.imagewidth = parseInt(attr(imgTag[0], 'width')) || 0;
        info.imageheight = parseInt(attr(imgTag[0], 'height')) || 0;
    } else {
        // Collection-of-images tileset
        const tileTags = allTags(xml, 'tile');
        for (const tt of tileTags) {
            const tileId = parseInt(attr(tt, 'id')) || 0;
            const imgMatch = tt.match(/<image[^>]*>/);
            if (imgMatch) {
                const src = attr(imgMatch[0], 'source') || '';
                info.tiles.push({
                    id: tileId,
                    image: basename(resolve(tsxDir, src)),
                    width: parseInt(attr(imgMatch[0], 'width')) || 0,
                    height: parseInt(attr(imgMatch[0], 'height')) || 0,
                });
            }
        }
    }

    return info;
}

// ─── Parse TMX ──────────────────────────────────────────────────────────────

const tmx = readFileSync(TMX_PATH, 'utf-8');
const mapTag = tmx.match(/<map[^>]*>/)?.[0];

const mapInfo = {
    width: parseInt(attr(mapTag, 'width')),
    height: parseInt(attr(mapTag, 'height')),
    tilewidth: parseInt(attr(mapTag, 'tilewidth')),
    tileheight: parseInt(attr(mapTag, 'tileheight')),
};

console.log(`Map: ${mapInfo.width}x${mapInfo.height} tiles, ${mapInfo.tilewidth}x${mapInfo.tileheight}px each`);
console.log(`Total pixels: ${mapInfo.width * mapInfo.tilewidth}x${mapInfo.height * mapInfo.tileheight}`);

// ─── Parse tilesets ─────────────────────────────────────────────────────────

const tilesetTags = [...tmx.matchAll(/<tileset\b[^>]*\/>/g)].map(m => m[0]);
const tilesets = [];

for (const tag of tilesetTags) {
    const firstgid = parseInt(attr(tag, 'firstgid'));
    const source = attr(tag, 'source');
    const tsxPath = resolve(CITY_DIR, source);

    console.log(`\nTileset firstgid=${firstgid} source=${source}`);
    const info = parseTsx(tsxPath);

    // Images live in public/city_map/ (not tiled/)
    const IMG_DIR = resolve('public/city_map');

    if (info) {
        // Check if image exists in city_map
        if (info.image) {
            const imgPath = resolve(IMG_DIR, info.image);
            const exists = existsSync(imgPath);
            console.log(`  Image: ${info.image} (${exists ? '✓' : '✗ MISSING'})`);
        }
        for (const t of info.tiles) {
            const imgPath = resolve(IMG_DIR, t.image);
            const exists = existsSync(imgPath);
            console.log(`  Tile ${t.id}: ${t.image} (${exists ? '✓' : '✗ MISSING'})`);
        }

        tilesets.push({ firstgid, ...info });
    } else {
        tilesets.push({ firstgid, name: source, missing: true });
    }
}

// ─── Parse all layers in document order (tile layers + object groups) ────────

const layers = [];

// Match both <layer> and <objectgroup> tags in document order
const allLayerMatches = [...tmx.matchAll(/<(layer|objectgroup)\b[^>]*(?:\/>|>[\s\S]*?<\/\1>)/g)];
const seenObjectIds = new Set();
let objectGroupIndex = 0;

for (const match of allLayerMatches) {
    const tagName = match[1];
    const layerXml = match[0];

    if (tagName === 'layer') {
        // ── Tile layer ──
        const name = attr(layerXml, 'name');
        const w = parseInt(attr(layerXml, 'width'));
        const h = parseInt(attr(layerXml, 'height'));

        const dataTag = layerXml.match(/<data[^>]*>/)?.[0];
        const encoding = attr(dataTag, 'encoding');
        const compression = attr(dataTag, 'compression');

        const b64 = innerText(layerXml, 'data');
        if (!b64 || encoding !== 'base64' || compression !== 'zlib') {
            console.warn(`  ⚠ Layer "${name}" has unsupported format: ${encoding}/${compression}`);
            continue;
        }

        const buf = Buffer.from(b64, 'base64');
        const inflated = inflateSync(buf);
        const gids = new Uint32Array(inflated.buffer, inflated.byteOffset, inflated.byteLength / 4);

        console.log(`\nLayer "${name}": ${w}x${h}, ${gids.length} tiles`);
        const unique = new Set(gids);
        console.log(`  Unique GIDs: ${unique.size} (max=${Math.max(...gids)})`);

        layers.push({
            type: 'tilelayer',
            name,
            width: w,
            height: h,
            data: Array.from(gids),
        });

    } else if (tagName === 'objectgroup') {
        // ── Object group ──
        const name = attr(layerXml, 'name');
        const offsetx = parseFloat(attr(layerXml, 'offsetx')) || 0;
        const offsety = parseFloat(attr(layerXml, 'offsety')) || 0;

        const objTags = [...layerXml.matchAll(/<object\b[^>]*\/?>/g)].map(m => m[0]);
        const objects = [];

        for (const ot of objTags) {
            let rawId = parseInt(attr(ot, 'id')) || 0;

            // IDs duplicados entre camadas (bug do Tiled) — gera ID único
            if (seenObjectIds.has(rawId)) {
                const newId = rawId + objectGroupIndex * 100000;
                console.warn(`  ⚠ ID duplicado ${rawId} — remapeado para ${newId}`);
                rawId = newId;
            }
            seenObjectIds.add(rawId);

            const obj = {
                id: rawId,
                x: parseFloat(attr(ot, 'x')) || 0,
                y: parseFloat(attr(ot, 'y')) || 0,
            };
            const gid = attr(ot, 'gid');
            if (gid) obj.gid = parseInt(gid);
            const w = attr(ot, 'width');
            const h = attr(ot, 'height');
            if (w) obj.width = parseFloat(w);
            if (h) obj.height = parseFloat(h);
            const n = attr(ot, 'name');
            if (n) obj.name = n;
            objects.push(obj);
        }

        console.log(`\nObjectGroup "${name}": ${objects.length} objects (offset ${offsetx},${offsety}, layerIndex ${objectGroupIndex})`);
        layers.push({ type: 'objectgroup', name, offsetx, offsety, objectGroupIndex, objects });
        objectGroupIndex++;
    }
}

// ─── Output JSON ────────────────────────────────────────────────────────────

const output = {
    ...mapInfo,
    tilesets: tilesets.map(ts => ({
        firstgid: ts.firstgid,
        name: ts.name,
        tilewidth: ts.tilewidth,
        tileheight: ts.tileheight,
        tilecount: ts.tilecount,
        columns: ts.columns,
        image: ts.image || null,
        imagewidth: ts.imagewidth || 0,
        imageheight: ts.imageheight || 0,
        tiles: ts.tiles || [],
        missing: ts.missing || false,
    })),
    layers,
};

writeFileSync(OUT_PATH, JSON.stringify(output));
const sizeMB = (Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(1);
console.log(`\n✅ Written ${OUT_PATH} (${sizeMB} KB)`);
