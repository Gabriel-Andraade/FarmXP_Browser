import { playerSystem } from './thePlayer/playerSystem.js';
import { inventorySystem } from './thePlayer/inventorySystem.js';
import { objectDestroyed, markWorldChanged } from './theWorld.js';
import { collisionSystem } from './collisionSystem.js';
import { camera } from './thePlayer/cameraSystem.js';
import { items } from './item.js';

/**
 * Sistema de gerenciamento de itens e interações com objetos do mundo
 * Responsável por processar cliques, danos, destruição e coleta de recursos
 * Gerencia cooldowns de ataque e verifica ferramentas apropriadas
 * @class ItemSystem
 */
export class ItemSystem {
    /**
     * Construtor do sistema de itens
     * Inicializa mapa de objetos interativos e configura sistema de cooldown
     */
    constructor() {
        this.interactiveObjects = new Map();
        this.lastDamageTime = 0;
        this.DAMAGE_COOLDOWN = 300; // ms

        this.setupInteractions();
        this.setupEventListeners();
    }

    /**
     * Configura os event listeners de clique e interação
     * Escuta eventos 'gameClick' (clique do mouse) e 'playerInteract' (tecla de interação)
     * Valida se o objeto está no alcance antes de processar interação
     * @returns {void}
     */
    setupInteractions() {
        document.addEventListener('gameClick', (e) => {
            const { screenX, screenY } = e.detail || {};
            if (screenX == null || screenY == null) return;

            const objectData = collisionSystem.getObjectAtMouse(screenX, screenY, camera);
            if (!objectData) return;

            const hitbox = collisionSystem.getInteractionObject(objectData.objectId);
            if (!hitbox) return;

            if (!collisionSystem.checkPlayerInteraction(hitbox)) return;

            this.handleInteraction(objectData.object || objectData.objectId);
        });

        document.addEventListener('playerInteract', (e) => {
            const d = e.detail || {};
            if (!d.object && !d.objectId && !d.id) return;
            this.handleInteraction(d.object || d.objectId || d.id);
        });
    }

    /**
     * Registra listeners para eventos de mundo
     * Escuta carregamento do mundo, adição de objetos, respawns e destruições
     * Mantém sincronização entre objetos do mundo e objetos interativos
     * @returns {void}
     */
    setupEventListeners() {
        document.addEventListener('worldLoaded', (e) => {
            const objs = e?.detail?.objects;
            if (Array.isArray(objs)) this.registerInteractiveObjects(objs);
        });

        document.addEventListener('worldObjectAdded', (e) => {
            const obj = e.detail?.object;
            if (obj) this.registerInteractiveObject(obj);
        });

        document.addEventListener('objectRespawned', (e) => {
            const obj = e.detail?.object;
            if (obj) this.registerInteractiveObject(obj);
        });

        document.addEventListener('objectDestroyed', (e) => {
            const id = e.detail?.id || e.detail?.objectId;
            if (id) this.interactiveObjects.delete(id);
        });
    }

    /**
     * Processa interação do jogador com um objeto
     * Verifica cooldown, ferramenta equipada e tipo de objeto
     * Protege estruturas utilitárias de dano sem ferramenta apropriada
     * Calcula dano baseado na ferramenta e aplica ao objeto
     * @param {string|Object} objectIdOrObj - ID do objeto ou objeto completo
     * @returns {void}
     */
    handleInteraction(objectIdOrObj) {
        const id = typeof objectIdOrObj === 'string'
            ? objectIdOrObj
            : (objectIdOrObj?.id || objectIdOrObj?.objectId);

        if (!id) return;

        let obj = this.interactiveObjects.get(id);

        if (!obj && typeof objectIdOrObj === 'object') {
            this.registerInteractiveObject(objectIdOrObj);
            obj = this.interactiveObjects.get(id);
        }

        if (!obj || obj.destroyed) return;

        if (Date.now() - this.lastDamageTime < this.DAMAGE_COOLDOWN) return;

        const equippedTool = playerSystem.getEquippedItem?.() || playerSystem.equippedTool || null;
        const targetType = (obj.type || '').toLowerCase();

        // proteção de estruturas: se for utilitário e não estiver com ferramenta de dano, retorna
        const utilityTypes = ['well', 'chest', 'house', 'construction', 'fence'];
        const isUtility = utilityTypes.includes(targetType);

        const isDamagingTool =
            equippedTool &&
            equippedTool.type === 'tool' &&
            (equippedTool.damage > 0 || equippedTool.toolType === 'hammer');

        if (isUtility && !isDamagingTool) {
            return;
        }

        // determina dano e se a ferramenta é a correta
        let damage = 1;
        let isCorrectTool = false;

        if (equippedTool) {
            if (targetType === 'tree' && equippedTool.toolType === 'axe') {
                damage = equippedTool.damage || 2;
                isCorrectTool = true;
            } else if (targetType === 'rock' && equippedTool.toolType === 'pickaxe') {
                damage = equippedTool.damage || 2;
                isCorrectTool = true;
            } else if (targetType === 'thicket' && equippedTool.toolType === 'machete') {
                damage = equippedTool.damage || 1;
                isCorrectTool = true;
            }
        }

        const requiredTool = this.getRequiredTool(targetType);
        if (requiredTool && !isCorrectTool) {
            this.showActionMessage(`Você precisa de um(a) ${requiredTool}!`);
            playerSystem.showEmote?.('question');
            return;
        }

        this.lastDamageTime = Date.now();
        document.dispatchEvent(new CustomEvent('playerAttack'));

        this.applyDamage(id, damage);
    }

    /**
     * Retorna o nome da ferramenta necessária para interagir com um tipo de objeto
     * @param {string} type - Tipo do objeto (tree, rock, thicket, etc)
     * @returns {string|null} Nome da ferramenta em português ou null se não requer ferramenta
     */
    getRequiredTool(type) {
        switch (type) {
            case 'tree': return 'machado';
            case 'rock': return 'picareta';
            case 'thicket': return 'facão';
            default: return null;
        }
    }

    /**
     * Aplica dano a um objeto interativo
     * Reduz a vida do objeto e dispara evento de dano
     * Destrói o objeto se a vida chegar a zero ou menos
     * @param {string} id - ID do objeto a receber dano
     * @param {number} dmg - Quantidade de dano a ser aplicada
     * @returns {void}
     */
    applyDamage(id, dmg) {
        const obj = this.interactiveObjects.get(id);
        if (!obj || obj.destroyed) return;

        obj.health -= dmg;

        document.dispatchEvent(new CustomEvent('objectDamaged', {
            detail: { id, x: obj.x, y: obj.y, dmg }
        }));

        if (obj.health <= 0) {
            this.destroyObject(obj);
        }
    }

    /**
     * Destrói um objeto interativo
     * Coleta drops, remove hitboxes, dispara evento de destruição e marca mundo como alterado
     * @param {Object} obj - Objeto a ser destruído
     * @param {string} obj.id - ID do objeto
     * @param {string} obj.type - Tipo do objeto
     * @param {number} obj.x - Posição X
     * @param {number} obj.y - Posição Y
     * @param {number} obj.width - Largura
     * @param {number} obj.height - Altura
     * @returns {void}
     */
    destroyObject(obj) {
        if (!obj || obj.destroyed) return;
        obj.destroyed = true;

        this.collectDrops(obj);

        try { collisionSystem.removeHitbox(obj.id); } catch {}

        objectDestroyed({
            id: obj.id,
            type: (obj.type || '').toUpperCase(),
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height
        });

        this.interactiveObjects.delete(obj.id);
        markWorldChanged();
    }

    /**
     * Coleta os drops de um objeto destruído
     * Processa chance de drop, quantidade aleatória e adiciona itens ao inventário
     * Exibe mensagem de coleta ao jogador
     * @param {Object} obj - Objeto destruído
     * @param {Array<Object>} [obj.drops] - Array de possíveis drops
     * @param {number} obj.drops[].id - ID do item a ser dropado
     * @param {number} [obj.drops[].chance=1] - Chance de drop (0-1)
     * @param {number} [obj.drops[].minQty=1] - Quantidade mínima
     * @param {number} [obj.drops[].maxQty=minQty] - Quantidade máxima
     * @returns {void}
     */
    collectDrops(obj) {
        if (!obj.drops) return;

        const collected = [];

        for (const drop of obj.drops) {
            if (Math.random() > (drop.chance ?? 1)) continue;

            const min = drop.minQty ?? 1;
            const max = drop.maxQty ?? min;
            const qty = Math.floor(Math.random() * (max - min + 1)) + min;

            const itemData = this.getItemData(drop.id);
            if (!itemData) continue;

            // Adiciona o drop ao inventário usando apenas o ID e a quantidade.
            // O InventorySystem utiliza mapTypeToCategory() para classificar automaticamente.
            inventorySystem.addItem(drop.id, qty);
            collected.push({ id: drop.id, quantity: qty });
        }

        if (collected.length) {
            this.showCollectionMessage(collected, obj.type);
        }
    }

    /**
     * Busca dados de um item por ID
     * @param {number} id - ID do item
     * @returns {Object|undefined} Dados do item ou undefined se não encontrado
     */
    getItemData(id) {
        return items.find(i => i.id === id);
    }

    /**
     * Retorna HP padrão baseado no tipo de objeto
     * Valores padrão quando o objeto não especifica HP
     * @param {string} type - Tipo do objeto
     * @returns {number} HP padrão do tipo
     */
    getHpFromAssetManager(type) {
        if (type === 'tree') return 6;
        if (type === 'rock') return 3;
        if (['well', 'chest', 'construction'].includes(type)) return 10;
        return 1;
    }

    /**
     * Retorna drops padrão baseado no tipo de objeto
     * Valores padrão quando o objeto não especifica drops
     * @param {string} type - Tipo do objeto
     * @returns {Array<Object>} Array de drops padrão
     */
    getDropsFromAssetManager(type) {
        if (type === 'tree') return [{ id: 9, minQty: 2, maxQty: 5 }];
        if (type === 'rock') return [{ id: 10, minQty: 1, maxQty: 3 }];
        return [];
    }

    /**
     * Exibe mensagem de coleta de itens ao jogador
     * Formata lista de itens coletados com quantidades
     * @param {Array<Object>} itemsList - Lista de itens coletados
     * @param {number} itemsList[].id - ID do item
     * @param {number} itemsList[].quantity - Quantidade coletada
     * @param {string} type - Tipo do objeto destruído
     * @returns {void}
     */
    showCollectionMessage(itemsList, type) {
        const msg = itemsList
            .map(i => `${i.quantity}x ${this.getItemData(i.id)?.name || 'Item'}`)
            .join(', ');
        const readableType = (type || '').toString().toLowerCase();
        this.showActionMessage(`${readableType} coletado: ${msg}`);
    }

    /**
     * Exibe uma mensagem de ação ao jogador
     * Usa playerHUD se disponível, caso contrário usa showMessage global
     * @param {string} text - Texto da mensagem
     * @returns {void}
     */
    showActionMessage(text) {
        if (window.playerHUD?.showMessage) {
            window.playerHUD.showMessage(text);
        } else if (window.showMessage) {
            window.showMessage(text);
        }
    }

    /**
     * Registra um objeto como interativo no sistema
     * Inicializa propriedades de vida, dano e drops se não especificadas
     * Previne registro duplicado
     * @param {Object} obj - Objeto a ser registrado
     * @param {string} obj.id - ID único do objeto
     * @param {string} [obj.type] - Tipo do objeto
     * @param {number} [obj.x=0] - Posição X
     * @param {number} [obj.y=0] - Posição Y
     * @param {number} [obj.width=32] - Largura
     * @param {number} [obj.height=32] - Altura
     * @param {number} [obj.hp] - HP inicial
     * @param {Array} [obj.drops] - Drops do objeto
     * @returns {void}
     */
    registerInteractiveObject(obj) {
        if (!obj) return;

        const id = obj.id || obj.objectId;
        if (!id || this.interactiveObjects.has(id)) return;

        const type = (obj.type || obj.originalType || '').toLowerCase();
        const hp = obj.hp || obj.health || this.getHpFromAssetManager(type);

        this.interactiveObjects.set(id, {
            id,
            type,
            x: obj.x ?? 0,
            y: obj.y ?? 0,
            width: obj.width ?? 32,
            height: obj.height ?? 32,
            destroyed: false,
            health: hp,
            maxHealth: obj.maxHealth || hp,
            drops: obj.drops || this.getDropsFromAssetManager(type)
        });
    }

    /**
     * Registra múltiplos objetos como interativos
     * Itera sobre o array e registra cada objeto individualmente
     * @param {Array<Object>} list - Lista de objetos a serem registrados
     * @returns {void}
     */
    registerInteractiveObjects(list) {
        if (!Array.isArray(list)) return;
        list.forEach(o => this.registerInteractiveObject(o));
    }
}

// Instancia e exporta o sistema de itens
export const itemSystem = new ItemSystem();
window.itemSystem = itemSystem;

/**
 * Registra objetos do mundo quando o DOM estiver pronto
 * Tenta múltiplas vezes até que objetos sejam carregados com sucesso
 * @listens document#DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.theWorld) {
            const registerWorldObjects = () => {
                if (window.currentPlayer) {
                    const objects = window.theWorld.getSortedWorldObjects?.(window.currentPlayer) || [];
                    itemSystem.registerInteractiveObjects(objects);

                    if (itemSystem.interactiveObjects.size === 0) {
                        setTimeout(registerWorldObjects, 500);
                    }
                }
            };
            registerWorldObjects();
        }
    }, 1000);
});

/**
 * Registra objetos quando o jogador estiver pronto
 * Garante que objetos sejam registrados após inicialização completa do jogador
 * @listens document#playerReady
 */
document.addEventListener('playerReady', () => {
    setTimeout(() => {
        if (window.theWorld && window.currentPlayer) {
            const objects = window.theWorld.getSortedWorldObjects?.(window.currentPlayer) || [];
            itemSystem.registerInteractiveObjects(objects);
        }
    }, 500);
});
