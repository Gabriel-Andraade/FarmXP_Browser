/**
 * @file assetManager.js - Gerenciador de assets do jogo
 * @description Sistema centralizado de carregamento e gerenciamento de assets.
 * Implementa carregamento assíncrono por prioridade, chunks para performance,
 * detecção de mobile, fallback com placeholders e cache de imagens.
 * @module AssetManager
 */

import { WORLD_GENERATOR_CONFIG } from "./generatorSeeds.js";

/**
 * Configurações de performance para carregamento de assets
 * Ajustado automaticamente para dispositivos móveis
 * @constant {Object}
 * @property {boolean} ENABLE_RUNTIME_RESIZE - Habilita redimensionamento em runtime
 * @property {Array<string>} PRIORITY_ORDER - Ordem de prioridade de carregamento
 * @property {number} MAX_CONCURRENT_LOADS - Máximo de carregamentos simultâneos
 * @property {number} MOBILE_MAX_LOAD - Limite para dispositivos móveis
 * @property {number} LOAD_CHUNK_SIZE - Tamanho do chunk de carregamento
 */
const PERFORMANCE_CONFIG = {
    ENABLE_RUNTIME_RESIZE: false,
    PRIORITY_ORDER: ['CORE', 'WORLD', 'ANIMALS', 'UI', 'PORTRAITS'],
    MAX_CONCURRENT_LOADS: 4,
    MOBILE_MAX_LOAD: 6,
    LOAD_CHUNK_SIZE: 3
};

/* detectar mobile e ajustar config */
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent);

if (isMobile) {
    PERFORMANCE_CONFIG.MAX_CONCURRENT_LOADS = 2;
    PERFORMANCE_CONFIG.LOAD_CHUNK_SIZE = 2;
}

/**
 * Carrega assets essenciais (core) necessários para iniciar o jogo
 * Inclui floor e cercas básicas
 * @async
 * @returns {Promise<boolean>} True quando carregamento completar
 */
async function loadCoreAssets() {
    const coreAssets = [
        assets.nature.floor[0],
        assets.furniture.fences?.fenceX,
        assets.furniture.fences?.fenceY
    ].filter(Boolean);

    await loadAssetList(coreAssets, "CORE");
    return true;
}

/**
 * Carrega assets do ambiente do mundo
 * Inclui árvores, pedras, arbustos, casa, baú e poço
 * @async
 * @returns {Promise<boolean>} True quando carregamento completar
 */
async function loadWorldAssets() {
    const worldAssets = [
        ...assets.nature.trees,
        ...assets.nature.rocks,
        ...assets.nature.thickets,
        ...assets.buildings.house,
        assets.furniture.chest,
        assets.furniture.well
    ];

    await loadAssetList(worldAssets, "WORLD");
    return true;
}

/* carrega assets de animais */
async function loadAnimalAssets() {
    const animalAssets = Object.values(assets.animals);
    await loadAssetList(animalAssets, "ANIMALS");
    return true;
}

/* carrega portrait sob demanda */
async function loadPortraitAsset(characterName) {
    const portrait = assets.charactersPortrait[characterName];
    if (!portrait) return null;

    if (portrait.img && portrait.img.complete) return portrait.img;

    try {
        const img = await loadSingleImage(portrait.src);
        portrait.img = img;
        portrait.width = 128;
        portrait.height = 128;
        return img;
    } catch (error) {
        return null;
    }
}

/* carrega uma lista de assets em chunks */
async function loadAssetList(assetList, category = "UNKNOWN") {
    if (!assetList || assetList.length === 0) {
        return [];
    }

    const validAssets = assetList.filter(asset => asset && asset.src);
    const chunkSize = PERFORMANCE_CONFIG.LOAD_CHUNK_SIZE;
    const chunks = [];

    for (let i = 0; i < validAssets.length; i += chunkSize) {
        chunks.push(validAssets.slice(i, i + chunkSize));
    }

    const loadedAssets = [];

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];

        const chunkPromises = chunk.map(async (asset) => {
            if (asset.img && asset.img.complete) return asset;

            try {
                const img = await loadSingleImage(asset.src);
                asset.img = img;
                setAssetDimensions(asset, category);
                return asset;
            } catch (error) {
                return null;
            }
        });

        const chunkResults = await Promise.all(chunkPromises);
        loadedAssets.push(...chunkResults.filter(Boolean));

        if (chunkIndex < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    return loadedAssets;
}

/* carrega uma imagem individual com fallback */
async function loadSingleImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            if (img.decode) {
                img.decode().then(() => resolve(img)).catch(() => resolve(img));
            } else {
                resolve(img);
            }
        };

        img.onerror = () => {
            const placeholder = createPlaceholderImage();
            resolve(placeholder);
        };

        img.src = src;
    });
}

/* cria imagem placeholder */
function createPlaceholderImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#999999';
    ctx.strokeRect(0, 0, 32, 32);

    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

/* aplica dimensões baseadas no tipo */
function setAssetDimensions(asset, category) {
    const DIMENSIONS = {
        'TREES': { width: WORLD_GENERATOR_CONFIG.TREES.WIDTH, height: WORLD_GENERATOR_CONFIG.TREES.HEIGHT },
        'ROCKS': { width: WORLD_GENERATOR_CONFIG.ROCKS.WIDTH, height: WORLD_GENERATOR_CONFIG.ROCKS.HEIGHT },
        'THICKETS': { width: WORLD_GENERATOR_CONFIG.THICKETS.WIDTH, height: WORLD_GENERATOR_CONFIG.THICKETS.HEIGHT },
        'FLOOR': { width: 16, height: 16 },
        'FENCEX': { width: 32, height: 32 },
        'FENCEY': { width: 32, height: 64 },
        'CHEST': { width: 31, height: 31 },
        'WELL': { width: 75, height: 95 },
        'HOUSE': { width: 178, height: 178 },
        'PORTRAIT': { width: 128, height: 128 }
    };

    let type = 'UNKNOWN';

    if (asset.src.includes('Tree')) type = 'TREES';
    else if (asset.src.includes('Rock')) type = 'ROCKS';
    else if (asset.src.includes('Thicket')) type = 'THICKETS';
    else if (asset.src.includes('grass')) type = 'FLOOR';
    else if (asset.src.includes('fenceX')) type = 'FENCEX';
    else if (asset.src.includes('fenceY')) type = 'FENCEY';
    else if (asset.src.includes('chest')) type = 'CHEST';
    else if (asset.src.includes('well')) type = 'WELL';
    else if (asset.src.includes('House')) type = 'HOUSE';
    else if (asset.src.includes('portrait')) type = 'PORTRAIT';
    else if (category === 'ANIMALS') type = 'ANIMAL';

    if (DIMENSIONS[type]) {
        asset.width = DIMENSIONS[type].width;
        asset.height = DIMENSIONS[type].height;
    } else {
        if (asset.img && asset.img.naturalWidth) {
            asset.width = asset.img.naturalWidth;
            asset.height = asset.img.naturalHeight;
        }
    }
}

/* definição dos assets */
export const assets = {
    furniture: {
        fences: {
            fenceX: {
                src: "assets/furnitureInGeneral/fence/fenceX.png",
                width: 32,
                height: 32,
                img: null
            },
            fenceY: {
                src: "assets/furnitureInGeneral/fence/fenceY.png",
                width: 32,
                height: 64,
                img: null
            }
        },
        chest: {
            src: "assets/furnitureInGeneral/chest.png",
            width: 31,
            height: 31,
            img: null
        },
        well: {
            src: "assets/furnitureInGeneral/well.png",
            width: 75,
            height: 95,
            img: null
        }
    },

    animals: {
        Bull: {
            src: "assets/animals/Bull.png",
            displayName: "Bull",
            frameWidth: 64,
            frameHeight: 64,
            cols: 6,
            rows: 6,
            framesPerRow: [6, 6, 6, 4, 4, 4],
            directionRows: { down: 0, up: 1, right: 3, left: 2 }
        },
        Calf: {
            src: "assets/animals/Calf.png",
            displayName: "Calf",
            frameWidth: 64,
            frameHeight: 64,
            cols: 6,
            rows: 6,
            framesPerRow: [6, 6, 6, 4, 4, 4],
            directionRows: { down: 0, up: 1, right: 3, left: 2 }
        },
        Chick: {
            src: "assets/animals/Chick.png",
            displayName: "Chick",
            frameWidth: 16,
            frameHeight: 16,
            cols: 6,
            rows: 6,
            framesPerRow: [6, 6, 6, 4, 4, 4],
            directionRows: { down: 0, up: 1, right: 3, left: 2 }
        }
    },

    nature: {
        trees: [
            {
                src: "assets/allTree/Tree1.png",
                width: WORLD_GENERATOR_CONFIG.TREES.WIDTH,
                height: WORLD_GENERATOR_CONFIG.TREES.HEIGHT,
                img: null,
                hp: 6,
                type: "tree",
                name: "Árvore Jovem"
            },
            {
                src: "assets/allTree/Tree2.png",
                width: WORLD_GENERATOR_CONFIG.TREES.WIDTH,
                height: WORLD_GENERATOR_CONFIG.TREES.HEIGHT,
                img: null,
                hp: 6,
                type: "tree",
                name: "Árvore Média"
            },
            {
                src: "assets/allTree/Tree3.png",
                width: WORLD_GENERATOR_CONFIG.TREES.WIDTH,
                height: WORLD_GENERATOR_CONFIG.TREES.HEIGHT,
                img: null,
                hp: 6,
                type: "tree",
                name: "Árvore Antiga"
            }
        ],

        rocks: [
            {
                src: "assets/allRocks/Rock1.png",
                width: WORLD_GENERATOR_CONFIG.ROCKS.WIDTH,
                height: WORLD_GENERATOR_CONFIG.ROCKS.HEIGHT,
                img: null,
                hp: 4,
                type: "rock",
                name: "Pedra média"
            },
            {
                src: "assets/allRocks/Rock2.png",
                width: WORLD_GENERATOR_CONFIG.ROCKS.WIDTH,
                height: WORLD_GENERATOR_CONFIG.ROCKS.HEIGHT,
                img: null,
                hp: 2,
                type: "rock",
                name: "Pedra antiga"
            }
        ],

        thickets: [
            {
                src: "assets/allThicket/Thicket1.png",
                width: WORLD_GENERATOR_CONFIG.THICKETS.WIDTH,
                height: WORLD_GENERATOR_CONFIG.THICKETS.HEIGHT,
                img: null,
                hp: 1
            }
        ],

        floor: [
            {
                src: "assets/background/grassMid.png",
                width: 16,
                height: 16,
                img: null
            }
        ]
    },

    buildings: {
        house: [
            {
                src: "assets/buildings/House1.png",
                width: 178,
                height: 178,
                img: null
            }
        ]
    },

    charactersPortrait: {
        stella: { src: "assets/character/portrait/Stella_portrait.webp", width: 128, height: 128, img: null },
        ben: { src: "assets/character/portrait/ben_portrait.webp", width: 128, height: 128, img: null },
        Graham: { src: "assets/character/portrait/Graham_portrait.webp", width: 128, height: 128, img: null },
        Rico: { src: "assets/character/portrait/Rico_portrait.webp", width: 128, height: 128, img: null },
        Laila: { src: "assets/character/portrait/Laila_portrait.webp", width: 128, height: 128, img: null },
        Thomas: { src: "assets/character/portrait/Thomas_portrait.webp", width: 128, height: 128, img: null }
    },

    /* métodos de carregamento */
    async loadCore() {
        const startTime = performance.now();
        await loadCoreAssets();
        const loadTime = performance.now() - startTime;
        document.dispatchEvent(new CustomEvent('assetsLoaded', {
            detail: { stage: 'CORE', time: loadTime }
        }));
        return true;
    },

    async loadWorld() {
        const startTime = performance.now();
        await loadWorldAssets();
        const loadTime = performance.now() - startTime;
        document.dispatchEvent(new CustomEvent('assetsLoaded', {
            detail: { stage: 'WORLD', time: loadTime }
        }));
        return true;
    },

    async loadAnimals() {
        const startTime = performance.now();
        await loadAnimalAssets();
        const loadTime = performance.now() - startTime;
        document.dispatchEvent(new CustomEvent('assetsLoaded', {
            detail: { stage: 'ANIMALS', time: loadTime }
        }));
        return true;
    },

    async loadPortrait(characterName) {
        if (!characterName) return null;
        return await loadPortraitAsset(characterName);
    },

    async loadAll() {
        const startTime = performance.now();
        await this.loadCore();
        await this.loadWorld();
        await this.loadAnimals();
        const totalTime = performance.now() - startTime;
        return true;
    },

    isAssetReady(assetPath) {
        let targetAsset = null;
        const categories = [this.nature, this.buildings, this.furniture, this.animals];

        for (const category of categories) {
            if (Array.isArray(category)) {
                targetAsset = category.find(a => a.src === assetPath);
            } else if (typeof category === 'object') {
                const findInObject = (obj) => {
                    for (const key in obj) {
                        if (obj[key] && obj[key].src === assetPath) {
                            return obj[key];
                        }
                        if (typeof obj[key] === 'object') {
                            const found = findInObject(obj[key]);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                targetAsset = findInObject(category);
            }
            if (targetAsset) break;
        }

        return targetAsset && targetAsset.img && targetAsset.img.complete;
    },

    getDimensionsForType(type) {
        const upper = type.toUpperCase();
        const DIMENSIONS = {
            "TREE": { width: WORLD_GENERATOR_CONFIG.TREES.WIDTH, height: WORLD_GENERATOR_CONFIG.TREES.HEIGHT },
            "ROCK": { width: WORLD_GENERATOR_CONFIG.ROCKS.WIDTH, height: WORLD_GENERATOR_CONFIG.ROCKS.HEIGHT },
            "THICKET": { width: WORLD_GENERATOR_CONFIG.THICKETS.WIDTH, height: WORLD_GENERATOR_CONFIG.THICKETS.HEIGHT },
            "FLOOR": { width: 16, height: 16 },
            "FENCE": { width: 32, height: 32 },
            "CHEST": { width: 31, height: 31 },
            "WELL": { width: 75, height: 95 },
            "HOUSE": { width: 178, height: 178 }
        };

        return DIMENSIONS[upper] || { width: 32, height: 32 };
    }
};

/* expõe para debug */
window.assetManager = assets;
window.PERFORMANCE_CONFIG = PERFORMANCE_CONFIG;
