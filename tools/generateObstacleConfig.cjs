/**
 * @file tools/generateObstacleConfig.js
 * @description Lê o mapa Tiled e o cityHitboxConfig.json, e gera/atualiza a seção
 * "obstacles" com um entry por objeto (posição já calculada com o offset do tipo).
 *
 * Uso: node tools/generateObstacleConfig.js
 * (rode a partir da raiz do projeto)
 */

const fs = require('fs');
const path = require('path');

const MAP_PATH    = path.join(__dirname, '../public/city_map/city-of-goose-cape.json');
const CONFIG_PATH = path.join(__dirname, '../public/scripts/debug/cityHitboxConfig.json');

// ─── Lê arquivos ─────────────────────────────────────────────────────────────

const mapData    = JSON.parse(fs.readFileSync(MAP_PATH,    'utf8'));
const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const obstacleTypes = configData.obstacleTypes || {};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tilesets = mapData.tilesets.slice().sort((a, b) => a.firstgid - b.firstgid);
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

// ─── Extrai objetos com posições calculadas ───────────────────────────────────

const seen = new Set();
const obstacles = [];

for (const layer of mapData.layers) {
    if (layer.type !== 'objectgroup') continue;
    const ox = layer.offsetx || 0;
    const oy = layer.offsety || 0;

    for (const obj of layer.objects) {
        if (!obj.gid) continue;
        const image = getTileImage(obj.gid);
        if (!image) continue;

        const typeDef = obstacleTypes[image];
        if (!typeDef) continue; // ignora tiles sem config (arbustos, etc.)

        const rawX = Math.round(obj.x + ox);
        const rawY = Math.round((obj.y + oy) - obj.height);

        // Deduplica por posição crua (artefato do Tiled)
        const key = `${image}_${rawX}_${rawY}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const x = rawX + (typeDef.offsetX || 0);
        const y = rawY + (typeDef.offsetY || 0);

        obstacles.push({
            id:     `city_obs_${image}_${obj.id}`,
            type:   image,
            x,
            y,
            width:  typeDef.width,
            height: typeDef.height,
        });
    }
}

// ─── Preserva edições manuais existentes ─────────────────────────────────────

const existing = {};
if (Array.isArray(configData.obstacles)) {
    for (const obs of configData.obstacles) {
        existing[obs.id] = obs;
    }
}

// Mescla: mantém x,y,w,h editados manualmente; só insere novos do Tiled
const merged = obstacles.map(obs => {
    if (existing[obs.id]) {
        return existing[obs.id]; // preserva edição manual
    }
    return obs;
});

// ─── Escreve config atualizado ────────────────────────────────────────────────

configData.obstacles = merged;
fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2), 'utf8');

console.log(`✓ ${merged.length} obstáculos escritos em cityHitboxConfig.json`);

const byType = {};
for (const o of merged) {
    byType[o.type] = (byType[o.type] || 0) + 1;
}
for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${count}x ${type}`);
}
