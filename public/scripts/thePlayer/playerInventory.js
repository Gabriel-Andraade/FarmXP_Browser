import { inventorySystem } from './inventorySystem.js';
import { getItem, isConsumable, getConsumptionData } from '../itemUtils.js';
import { mapTypeToCategory } from '../categoryMapper.js';

export function getInventory() {
    return inventorySystem.getInventory();
}

export function addItemToInventory(category, itemId, quantity = 1) {
    return inventorySystem.addItem(category, itemId, quantity);
}

export function removeItemFromInventory(category, itemId, quantity = 1) {
    return inventorySystem.removeItem(category, itemId, quantity);
}

export function getPlayerInventory() {
    return inventorySystem.getInventory();
}

export function hasItem(category, itemId) {
    return inventorySystem.getItemQuantity(category, itemId) > 0;
}

import { logger } from '../logger.js';

export function equipItem(category, itemId) {
    const item = getItem(itemId);
    if (!item) {
        logger.error('❌ Item não encontrado:', itemId);
        return false;
    }

    // Só pode equipar ferramentas por enquanto
    if (item.type !== 'tool') {
        logger.warn('⚠️ Só é possível equipar ferramentas');
        return false;
    }
    
    // 🔥 Dispara evento global (capturado pelo playerSystem.js)
    document.dispatchEvent(new CustomEvent('equipItemRequest', { 
        detail: { item } 
    }));
    
    showInventoryMessage(` ${item.name} equipado!`);
    return true;
}

export function unequipItem() {
    document.dispatchEvent(new Event('unequipItemRequest'));
    showInventoryMessage('🔓 Item desequipado!');
    return true;
}

export function discardItem(category, itemId, quantity = 1) {
    const item = getItem(itemId);
    if (!item) {
        logger.error('❌ Item não encontrado para descartar:', itemId);
        return false;
    }
    
    // 🔥 Dispara evento antes de remover para o playerSystem poder desequipar se necessário
    document.dispatchEvent(new CustomEvent('discardItemRequest', { 
        detail: { category, itemId, quantity, item } 
    }));
    
    const success = inventorySystem.removeItem(category, itemId, quantity);
    
    if (success) {
        // 🔁 Atualiza a UI visual do inventário
        document.dispatchEvent(new CustomEvent('inventoryUpdated', {
            detail: { inventory: inventorySystem.getInventory() }
        }));
        
        showInventoryMessage(`🗑️ ${item.name} descartado!`);
    }
    
    return success;
}
function showInventoryMessage(text) {
    const msg = document.createElement("div");
    msg.className = "inventory-message";
    msg.textContent = text;

    document.body.appendChild(msg);

    // animação de entrada
    requestAnimationFrame(() => {
        msg.classList.add('visible');
    });

    // remove suave
    setTimeout(() => {
        msg.classList.remove('visible');
        setTimeout(() => msg.remove(), 300);
    }, 1300);
}
// 🆕 FUNÇÃO PARA CONSUMIR ITENS (COMIDA/BEBIDA)
export function consumeItem(category, itemId, quantity = 1) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        logger.warn(`⚠️ Quantidade inválida para consumo: ${quantity}`);
        return false;
    }

    const item = getItem(itemId);
    if (!item) {
        logger.error('❌ Item não encontrado para consumir:', itemId);
        return false;
    }

    // Verifica se é consumível
    if (!isConsumable(itemId)) {
        logger.warn('⚠️ Este item não é consumível');
        return false;
    }

    // Verifica se tem quantidade suficiente
    const currentQty = inventorySystem.getItemQuantity(category, itemId);
    if (currentQty < quantity) {
        logger.warn(`⚠️ Quantidade insuficiente: ${currentQty}/${quantity}`);
        return false;
    }

    logger.debug(`🍽️ Tentando consumir: ${item.name} (${itemId})`);

    // 🔥 Dispara evento para o playerSystem iniciar o consumo
    document.dispatchEvent(new CustomEvent('startConsumptionRequest', { 
        detail: { 
            category, 
            itemId, 
            quantity,
            item,
            fillUp: item.fillUp 
        } 
    }));
    
    return true;
}