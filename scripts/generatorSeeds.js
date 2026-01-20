import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from "./worldConstants.js";
import { collisionSystem } from "./collisionSystem.js";

/**
 * Configurações para geração procedural do mundo
 * Define parâmetros de spawn para cada tipo de objeto
 * @constant {Object}
 */
export const WORLD_GENERATOR_CONFIG = {
    TREES: {
        MAX_COUNT: 700,
        SPAWN_RATE: 0.02,
        TYPES: 3,
        MIN_DISTANCE: 6,
        CLUSTER_CHANCE: 0.3,
        WIDTH: 64,
        HEIGHT: 140
    },

    ROCKS: {
        MAX_COUNT: 300,
        SPAWN_RATE: 0.008,
        TYPES: 2,
        MIN_DISTANCE: 4,
        WIDTH: 36,
        HEIGHT: 32
    },

    THICKETS: {
        MAX_COUNT: 200,
        SPAWN_RATE: 0.006,
        TYPES: 1,
        MIN_DISTANCE: 4,
        WIDTH: 40,
        HEIGHT: 40
    },

    HOUSES: {
        COUNT: 1,
        WIDTH: 295,
        HEIGHT: 475,
        SPAWN_POSITION: { x: 2000, y: 2000 },
        PROTECTION_RADIUS: 20
    },

    GENERAL: {
        TILE_SIZE: TILE_SIZE,
        SEED: Date.now()
    }
};

/**
 * Gerador procedural de mundo
 * Responsável por criar e posicionar árvores, pedras, arbustos e construções
 * Utiliza seed para geração determinística e reproduzível
 * @class WorldGenerator
 */
export class WorldGenerator {
    /**
     * Construtor do gerador de mundo
     * Inicializa o gerador de números aleatórios e estruturas de dados
     * @param {number} [seed=WORLD_GENERATOR_CONFIG.GENERAL.SEED] - Seed para geração procedural
     */
    constructor(seed = WORLD_GENERATOR_CONFIG.GENERAL.SEED) {
        this.seed = seed;
        this.rng = this.createRNG(seed);
        this.generatedObjects = {
            trees: [],
            rocks: [],
            thickets: [],
            houses: []
        };
        this.housePosition = WORLD_GENERATOR_CONFIG.HOUSES.SPAWN_POSITION;
        this.houseProtectionRadius = WORLD_GENERATOR_CONFIG.HOUSES.PROTECTION_RADIUS;
    }

    /**
     * Cria um gerador de números pseudo-aleatórios baseado em seed
     * Utiliza algoritmo Linear Congruential Generator (LCG)
     * Garante que a mesma seed sempre produz a mesma sequência de números
     * @param {number} seed - Seed inicial para o gerador
     * @returns {Function} Função que retorna números aleatórios entre 0 e 1
     */
    createRNG(seed) {
        return function () {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    /**
     * Gera todos os objetos do mundo em ordem específica
     * Ordem de geração: casa → árvores → pedras → arbustos
     * @returns {Object} Objeto contendo arrays de todos os objetos gerados
     * @returns {Array} returns.trees - Array de árvores geradas
     * @returns {Array} returns.rocks - Array de pedras geradas
     * @returns {Array} returns.thickets - Array de arbustos gerados
     * @returns {Array} returns.houses - Array de partes da casa (telhado e paredes)
     */
    generateWorld() {
        this.generateHouse();
        this.generateTrees();
        this.generateRocks();
        this.generateThickets();
        return this.generatedObjects;
    }

    /**
     * Verifica se uma posição está muito próxima da casa
     * Considera área de proteção ao redor da casa para evitar spawns indesejados
     * @param {number} worldX - Posição X no mundo
     * @param {number} worldY - Posição Y no mundo
     * @param {number} [objectWidth=0] - Largura do objeto a ser verificado
     * @param {number} [objectHeight=0] - Altura do objeto a ser verificado
     * @returns {boolean} True se o objeto está dentro da área protegida, false caso contrário
     */
    isTooCloseToHouse(worldX, worldY, objectWidth = 0, objectHeight = 0) {
        if (this.generatedObjects.houses.length === 0) return false;

        const houseWalls = this.generatedObjects.houses.find(h => h.type === 'HOUSE_WALLS');
        if (!houseWalls) return false;

        const objectCenterX = worldX + objectWidth / 2;
        const objectCenterY = worldY + objectHeight / 2;
        const houseCenterX = houseWalls.x + houseWalls.width / 2;
        const houseCenterY = houseWalls.y + houseWalls.height / 2;

        const distanceX = Math.abs(objectCenterX - houseCenterX);
        const distanceY = Math.abs(objectCenterY - houseCenterY);

        const minDistanceX = (objectWidth + houseWalls.width) / 2 + this.houseProtectionRadius;
        const minDistanceY = (objectHeight + houseWalls.height) / 2 + this.houseProtectionRadius;

        return distanceX < minDistanceX && distanceY < minDistanceY;
    }

    /**
     * Gera a casa do jogador dividida em duas partes: telhado e paredes
     * O telhado não possui colisão, as paredes possuem colisão física
     * Registra hitboxes no sistema de colisão
     * @returns {void}
     */
    generateHouse() {
        const config = WORLD_GENERATOR_CONFIG.HOUSES;

        const timestamp = Date.now();
        const baseX = config.SPAWN_POSITION.x;
        const baseY = config.SPAWN_POSITION.y;

        const roofRatio = 0.70;
        const overlapPx = 0;
        const totalH = config.HEIGHT;

        const roofHeight = Math.round(totalH * roofRatio) + overlapPx;
        const wallHeight = totalH - (roofHeight - overlapPx);

        const houseRoof = {
            id: `house_roof_${timestamp}`,
            x: baseX,
            y: baseY,
            width: config.WIDTH,
            height: roofHeight,
            type: 'HOUSE_ROOF'
        };

        const houseWalls = {
            id: `house_walls_${timestamp}`,
            x: baseX,
            y: baseY + (roofHeight - overlapPx),
            width: config.WIDTH - 60,
            height: wallHeight,
            type: 'HOUSE_WALLS'
        };

        this.generatedObjects.houses.push(houseRoof, houseWalls);

        collisionSystem.addHitbox(
            houseRoof.id,
            'HOUSE_ROOF',
            houseRoof.x,
            houseRoof.y,
            houseRoof.width,
            houseRoof.height
        );

        collisionSystem.addHitbox(
            houseWalls.id,
            'HOUSE_WALLS',
            houseWalls.x,
            houseWalls.y,
            houseWalls.width,
            houseWalls.height
        );
    }

    /**
     * Gera árvores no mapa usando sistema de tiles
     * Implementa clustering (agrupamento) para criar formações naturais
     * Respeita distância mínima entre árvores e área de proteção da casa
     * @returns {void}
     */
    generateTrees() {
        const config = WORLD_GENERATOR_CONFIG.TREES;
        const COLS = Math.ceil(WORLD_WIDTH / TILE_SIZE);
        const ROWS = Math.ceil(WORLD_HEIGHT / TILE_SIZE);

        let count = 0;
        const occupiedTiles = new Set();

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (count >= config.MAX_COUNT) break;

                const key = `${x},${y}`;
                if (occupiedTiles.has(key)) continue;

                const worldX = x * TILE_SIZE;
                const worldY = y * TILE_SIZE;

                if (this.isTooCloseToHouse(worldX, worldY, config.WIDTH, config.HEIGHT)) continue;

                let chance = config.SPAWN_RATE;

                if (this.rng() < config.CLUSTER_CHANCE) {
                    chance += this.countAdjacentTrees(x, y, occupiedTiles) * 0.1;
                }

                if (this.rng() < chance) {
                    this.generatedObjects.trees.push(this.createTree(x, y));
                    count++;
                    this.markOccupiedTiles(x, y, config.MIN_DISTANCE, occupiedTiles);
                }
            }
        }
    }

    /**
     * Gera pedras no mapa usando sistema de tiles
     * Respeita distância mínima entre pedras e área de proteção da casa
     * @returns {void}
     */
    generateRocks() {
        const config = WORLD_GENERATOR_CONFIG.ROCKS;
        const COLS = Math.ceil(WORLD_WIDTH / TILE_SIZE);
        const ROWS = Math.ceil(WORLD_HEIGHT / TILE_SIZE);

        let count = 0;
        const occupiedTiles = new Set();

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (count >= config.MAX_COUNT) break;

                const key = `${x},${y}`;
                if (occupiedTiles.has(key)) continue;

                const worldX = x * TILE_SIZE;
                const worldY = y * TILE_SIZE;

                if (this.isTooCloseToHouse(worldX, worldY, config.WIDTH, config.HEIGHT)) continue;

                if (this.rng() < config.SPAWN_RATE) {
                    this.generatedObjects.rocks.push(this.createRock(x, y));
                    count++;
                    this.markOccupiedTiles(x, y, config.MIN_DISTANCE, occupiedTiles);
                }
            }
        }
    }

    /**
     * Gera arbustos no mapa usando sistema de tiles
     * Respeita distância mínima entre arbustos e área de proteção da casa
     * @returns {void}
     */
    generateThickets() {
        const config = WORLD_GENERATOR_CONFIG.THICKETS;
        const COLS = Math.ceil(WORLD_WIDTH / TILE_SIZE);
        const ROWS = Math.ceil(WORLD_HEIGHT / TILE_SIZE);

        let count = 0;
        const occupiedTiles = new Set();

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (count >= config.MAX_COUNT) break;

                const key = `${x},${y}`;
                if (occupiedTiles.has(key)) continue;

                const worldX = x * TILE_SIZE;
                const worldY = y * TILE_SIZE;

                if (this.isTooCloseToHouse(worldX, worldY, config.WIDTH, config.HEIGHT)) continue;

                if (this.rng() < config.SPAWN_RATE) {
                    this.generatedObjects.thickets.push(this.createThicket(x, y));
                    count++;
                    this.markOccupiedTiles(x, y, config.MIN_DISTANCE, occupiedTiles);
                }
            }
        }
    }

    /**
     * Conta quantos tiles adjacentes estão ocupados por árvores
     * Usado para implementar clustering (agrupamento natural de árvores)
     * @param {number} x - Coordenada X do tile em grid
     * @param {number} y - Coordenada Y do tile em grid
     * @param {Set<string>} occupiedTiles - Set de tiles já ocupados
     * @returns {number} Número de tiles adjacentes ocupados (0-8)
     */
    countAdjacentTrees(x, y, occupiedTiles) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                if (occupiedTiles.has(`${x + dx},${y + dy}`)) count++;
            }
        }
        return count;
    }

    /**
     * Marca tiles como ocupados em um raio ao redor de uma posição
     * Usado para manter distância mínima entre objetos
     * @param {number} x - Coordenada X central do tile em grid
     * @param {number} y - Coordenada Y central do tile em grid
     * @param {number} radius - Raio em tiles ao redor do ponto central
     * @param {Set<string>} occupiedTiles - Set de tiles a ser atualizado
     * @returns {void}
     */
    markOccupiedTiles(x, y, radius, occupiedTiles) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                occupiedTiles.add(`${x + dx},${y + dy}`);
            }
        }
    }

    /**
     * Cria um objeto de árvore com posição e variação aleatória
     * Aplica jitter (variação) à posição para aparência mais natural
     * @param {number} tileX - Coordenada X do tile em grid
     * @param {number} tileY - Coordenada Y do tile em grid
     * @returns {Object} Objeto de árvore com propriedades id, x, y, type, width, height, tileX, tileY
     */
    createTree(tileX, tileY) {
        const worldX = tileX * TILE_SIZE;
        const worldY = tileY * TILE_SIZE;

        return {
            id: `tree_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            x: worldX + (this.rng() * 8) - 4,
            y: worldY + (this.rng() * 8) - 4,
            type: Math.floor(this.rng() * WORLD_GENERATOR_CONFIG.TREES.TYPES),
            width: 64,
            height: 64,
            tileX,
            tileY
        };
    }

    /**
     * Cria um objeto de pedra com posição e variação aleatória
     * Aplica jitter (variação) à posição para aparência mais natural
     * @param {number} tileX - Coordenada X do tile em grid
     * @param {number} tileY - Coordenada Y do tile em grid
     * @returns {Object} Objeto de pedra com propriedades id, x, y, type, width, height, tileX, tileY
     */
    createRock(tileX, tileY) {
        const worldX = tileX * TILE_SIZE;
        const worldY = tileY * TILE_SIZE;

        return {
            id: `rock_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            x: worldX + (this.rng() * 6) - 3,
            y: worldY + (this.rng() * 6) - 3,
            type: Math.floor(this.rng() * WORLD_GENERATOR_CONFIG.ROCKS.TYPES),
            width: 32,
            height: 32,
            tileX,
            tileY
        };
    }

    /**
     * Cria um objeto de arbusto com posição e variação aleatória
     * Aplica jitter (variação) à posição para aparência mais natural
     * @param {number} tileX - Coordenada X do tile em grid
     * @param {number} tileY - Coordenada Y do tile em grid
     * @returns {Object} Objeto de arbusto com propriedades id, x, y, type, width, height, tileX, tileY
     */
    createThicket(tileX, tileY) {
        const worldX = tileX * TILE_SIZE;
        const worldY = tileY * TILE_SIZE;

        return {
            id: `thicket_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            x: worldX + (this.rng() * 4) - 2,
            y: worldY + (this.rng() * 4) - 2,
            type: Math.floor(this.rng() * WORLD_GENERATOR_CONFIG.THICKETS.TYPES),
            width: 44,
            height: 40,
            tileX,
            tileY
        };
    }

    /**
     * Gera um mundo usando uma seed específica
     * Método estático para geração determinística sem criar instância persistente
     * @static
     * @param {number} seed - Seed para geração procedural
     * @returns {Object} Objeto contendo todos os objetos gerados do mundo
     */
    static generateWithSeed(seed) {
        const generator = new WorldGenerator(seed);
        return generator.generateWorld();
    }

    /**
     * Gera um mundo com seed aleatória
     * Método estático para geração não-determinística
     * @static
     * @returns {Object} Objeto contendo todos os objetos gerados do mundo
     */
    static generateRandom() {
        return WorldGenerator.generateWithSeed(Date.now() * Math.random());
    }
}

// Instancia e exporta o gerador de mundo
export const worldGenerator = new WorldGenerator();