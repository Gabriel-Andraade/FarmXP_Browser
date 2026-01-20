import { items } from './item.js';
import { getItemStackLimit } from './categoryMapper.js';

/**
 * Cache de itens indexado por ID para acesso rápido
 * Evita buscas lineares no array de itens
 * @type {Map<number, Object>}
 * @private
 */
const itemCache = new Map();
items.forEach(item => itemCache.set(item.id, item));

/**
 * Retorna os dados completos de um item por seu ID
 * Usa cache para performance otimizada
 * @param {number} itemId - ID do item a ser buscado
 * @returns {Object|null} Objeto com dados do item ou null se não encontrado
 */
export function getItem(itemId) {
    return itemCache.get(itemId) || null;
}

/**
 * Verifica se um item é consumível (comida/bebida)
 * Item é consumível se possui propriedade fillUp
 * @param {number} itemId - ID do item
 * @returns {boolean} True se o item for consumível, false caso contrário
 */
export function isConsumable(itemId) {
    const item = getItem(itemId);
    return item && item.fillUp;
}

/**
 * Retorna os dados de consumo de um item (valores de fome, sede e energia)
 * @param {number} itemId - ID do item
 * @returns {Object|null} Objeto com dados de consumo ou null se não for consumível
 * @returns {string} returns.name - Nome do item
 * @returns {string} returns.icon - Ícone do item
 * @returns {number} returns.hunger - Valor de fome restaurado
 * @returns {number} returns.thirst - Valor de sede restaurado
 * @returns {number} returns.energy - Valor de energia restaurado
 */
export function getConsumptionData(itemId) {
    const item = getItem(itemId);
    if (!item || !item.fillUp) return null;
    
    return {
        name: item.name,
        icon: item.icon,
        hunger: item.fillUp.hunger || 0,
        thirst: item.fillUp.thirst || 0,
        energy: item.fillUp.energy || 0
    };
}

/**
 * Verifica se um item é uma ferramenta
 * @param {number} itemId - ID do item
 * @returns {boolean} True se o item for ferramenta, false caso contrário
 */
export function isTool(itemId) {
    const item = getItem(itemId);
    return item && item.type === 'tool';
}

/**
 * Verifica se um item é uma semente plantável
 * @param {number} itemId - ID do item
 * @returns {boolean} True se o item for semente, false caso contrário
 */
export function isSeed(itemId) {
    const item = getItem(itemId);
    return item && item.type === 'seed';
}

/**
 * Verifica se um item pode ser colocado no mundo
 * Item é placeable se possui flag placeable ou é do tipo construction
 * @param {number} itemId - ID do item
 * @returns {boolean} True se o item pode ser colocado, false caso contrário
 */
export function isPlaceable(itemId) {
    const item = getItem(itemId);
    return item && (item.placeable || item.type === 'construction');
}

/**
 * Retorna o limite de empilhamento (stack) para um item
 * Usa categoryMapper para determinar limite baseado no tipo
 * @param {number} itemId - ID do item
 * @returns {number} Limite de stack (padrão 1 se item não existir)
 */
export function getStackLimit(itemId) {
    const item = getItem(itemId);
    if (!item) return 1;
    return getItemStackLimit(item.type);
}

/**
 * Verifica se um item é um recurso coletável
 * Considera tanto tipo 'resource' quanto 'crop' como recursos
 * @param {number} itemId - ID do item
 * @returns {boolean} True se o item for recurso, false caso contrário
 */
export function isResource(itemId) {
    const item = getItem(itemId);
    return item && (item.type === 'resource' || item.type === 'crop');
}

/**
 * Verifica se um item é uma construção ou decoração
 * @param {number} itemId - ID do item
 * @returns {boolean} True se o item for construção, false caso contrário
 */
export function isConstruction(itemId) {
    const item = getItem(itemId);
    return item && item.type === 'construction';
}

/**
 * Retorna todos os itens disponíveis no jogo
 * @returns {Array<Object>} Array com todos os itens
 */
export function getAllItems() {
    return items;
}

/**
 * Busca itens por termo de pesquisa
 * Pesquisa tanto no nome quanto na descrição (case-insensitive)
 * @param {string} searchTerm - Termo a ser buscado
 * @returns {Array<Object>} Array de itens que correspondem à busca
 */
export function searchItems(searchTerm) {
    const term = (searchTerm || '').toLowerCase();
    return items.filter(item => {
        const name = (item.name || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        return name.includes(term) || desc.includes(term);
    });
}

/**
 * Retorna todos os itens de um tipo específico
 * @param {string} itemType - Tipo do item (tool, seed, food, resource, etc)
 * @returns {Array<Object>} Array de itens do tipo especificado
 */
export function getItemsByType(itemType) {
    return items.filter(item => item.type === itemType);
}

/**
 * Valida se um ID de item existe no sistema
 * @param {number} itemId - ID do item a ser validado
 * @returns {boolean} True se o ID for válido, false caso contrário
 */
export function isValidItemId(itemId) {
    return itemCache.has(itemId);
}

/**
 * Retorna o preço de venda de um item
 * Preço de venda é 50% do preço de compra
 * @param {number} itemId - ID do item
 * @returns {number} Preço de venda (0 se item não existir)
 */
export function getSellPrice(itemId) {
    const item = getItem(itemId);
    if (!item) return 0;
    return Math.floor((item.price || 0) * 0.5);
}

/**
 * Retorna o preço de compra de um item
 * @param {number} itemId - ID do item
 * @returns {number} Preço de compra (0 se item não existir)
 */
export function getBuyPrice(itemId) {
    const item = getItem(itemId);
    if (!item) return 0;
    return item.price || 0;
}