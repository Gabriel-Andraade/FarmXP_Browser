// scripts/categoryMapper.js
// =============================================================================
// 🗂️ MAPEAMENTO CENTRALIZADO DE CATEGORIAS
// =============================================================================
// Centraliza todo o mapeamento de tipos de item → categorias do inventário
// Garante consistência em todo o sistema

export const CATEGORY_MAP = {
    // Mapeamento TIPO do item → CATEGORIA do inventário
    tool: 'tools',
    seed: 'seeds', 
    food: 'food',
    animal_food: 'animal_food',
    construction: 'construction',
    resource: 'resources',
    crop: 'resources',
    placeable: 'construction',
    structure: 'construction',
    decoration: 'construction',
    material: 'resources',
    consumable: 'food',
    
    // Fallback padrão
    default: 'resources'
};

// Configuração de cada categoria
export const INVENTORY_CATEGORIES = {
    tools: { 
        label: 'Ferramentas', 
        icon: '⚒️', 
        limit: 10, 
        stackLimit: 1,  // Ferramentas não stackam
        color: '#FF6B6B'
    },
    seeds: { 
        label: 'Sementes', 
        icon: '🌱', 
        limit: 10, 
        stackLimit: 99,
        color: '#51CF66'
    },
    construction: { 
        label: 'Construção', 
        icon: '🏗️', 
        limit: 15, 
        stackLimit: 99,
        color: '#FFA94D'
    },
    animal_food: { 
        label: 'Comida de Animais', 
        icon: '🐔', 
        limit: 10, 
        stackLimit: 99,
        color: '#B197FC'
    },
    food: { 
        label: 'Comidas', 
        icon: '🍎', 
        limit: 15, 
        stackLimit: 99,
        color: '#FF922B'
    },
    resources: { 
        label: 'Recursos', 
        icon: '🪵', 
        limit: 20, 
        stackLimit: 99,
        color: '#748FFC'
    }
};

/**
 * Mapeia o tipo de um item para a categoria do inventário
 * @param {string} itemType - O tipo do item (tool, seed, food, etc.)
 * @returns {string} A categoria correspondente
 */
export function mapTypeToCategory(itemType) {
    return CATEGORY_MAP[itemType] || CATEGORY_MAP.default;
}

/**
 * Obtém a configuração de uma categoria
 * @param {string} category - A categoria (tools, seeds, etc.)
 * @returns {object} Configuração da categoria
 */
export function getCategoryConfig(category) {
    return INVENTORY_CATEGORIES[category] || INVENTORY_CATEGORIES.resources;
}

/**
 * Lista todas as categorias disponíveis
 * @returns {array} Array de nomes de categorias
 */
export function getAllCategories() {
    return Object.keys(INVENTORY_CATEGORIES);
}

/**
 * Obtém o limite de slots para uma categoria
 * @param {string} category - A categoria
 * @returns {number} Número máximo de slots
 */
export function getCategorySlotLimit(category) {
    return getCategoryConfig(category).limit;
}

/**
 * Obtém o limite de stack para um item
 * @param {string} itemType - O tipo do item
 * @returns {number} Quantidade máxima por stack
 */
export function getItemStackLimit(itemType) {
    const category = mapTypeToCategory(itemType);
    return getCategoryConfig(category).stackLimit;
}
