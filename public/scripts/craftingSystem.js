import { logger } from './logger.js';
import { recipes } from "./recipes.js";
import { items } from "./item.js";

/**
 * Sistema de crafting do jogo
 * Gerencia a criação de itens através da combinação de materiais
 * Integra-se com sistemas de inventário e armazenamento para obter recursos
 * @class CraftingSystem
 */
export class CraftingSystem {
    /**
     * Construtor do sistema de crafting
     * Inicializa configurações padrão e injeta estilos CSS
     */
    constructor() {
        this.isOpen = false;
        this.useStorage = true;
        this.useInventory = true;
        this.activeCategory = "all";
        this.injectStyles();
    }

    /**
     * Injeta os estilos CSS necessários para a interface de crafting
     * Cria uma tag <style> no documento se ainda não existir
     * Previne injeção duplicada verificando a existência do elemento
     * @returns {void}
     */
    injectStyles() {
        if (document.getElementById('crafting-styles')) return;

        const styles = `
            <style id="crafting-styles">
            .crafting-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 9998;
            }

            .crafting-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 800px;
                max-width: 90vw;
                height: 600px;
                max-height: 80vh;
                background: #2d1b0e;
                border: 3px solid #8b5a2b;
                border-radius: 15px;
                z-index: 9999;
                color: white;
                padding: 20px;
                display: flex;
                flex-direction: column;
                box-shadow: 0 0 30px rgba(0,0,0,0.8);
            }

            .crafting-header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #8b5a2b;
            }

            .crafting-header h2 {
                color: #ffdfa7;
                margin: 0;
                font-size: 24px;
            }

            .crafting-close-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                background: #8b5a2b;
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .crafting-close-btn:hover {
                background: #ff9e4a;
            }

            .crafting-categories {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
                justify-content: center;
            }

            .craft-category-btn {
                padding: 8px 16px;
                background: #5a3a1c;
                border: 1px solid #8b5a2b;
                border-radius: 20px;
                color: white;
                cursor: pointer;
                transition: all 0.2s;
            }

            .craft-category-btn.active,
            .craft-category-btn:hover {
                background: #8b5a2b;
                transform: translateY(-2px);
            }

            .crafting-recipes {
                flex: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 15px;
                padding-right: 10px;
            }

            .crafting-recipes::-webkit-scrollbar {
                width: 8px;
            }

            .crafting-recipes::-webkit-scrollbar-track {
                background: #5a3a1c;
                border-radius: 4px;
            }

            .crafting-recipes::-webkit-scrollbar-thumb {
                background: #8b5a2b;
                border-radius: 4px;
            }

            .crafting-item {
                background: rgba(139, 90, 43, 0.2);
                border: 2px solid #5a3a1c;
                border-radius: 10px;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s;
            }

            .crafting-item:hover {
                border-color: #ff9e4a;
                transform: translateY(-2px);
            }

            .crafting-info {
                flex: 1;
            }

            .crafting-name {
                font-size: 18px;
                font-weight: bold;
                color: #ffdfa7;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .crafting-requirements {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .requirement {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 4px 8px;
                background: #5a3a1c;
                border-radius: 6px;
                font-size: 14px;
            }

            .requirement.has-enough {
                background: #4a7a35;
            }

            .requirement.not-enough {
                background: #7a3535;
            }

            .craft-btn {
                padding: 10px 20px;
                background: #8b5a2b;
                border: none;
                border-radius: 8px;
                color: white;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .craft-btn:hover:not(.disabled) {
                background: #ff9e4a;
                transform: translateY(-2px);
            }

            .craft-btn.disabled {
                background: #555;
                cursor: not-allowed;
                opacity: 0.6;
            }

            .crafting-feedback {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: #2d1b0e;
                border: 2px solid #8b5a2b;
                border-radius: 10px;
                color: #ffdfa7;
                z-index: 10000;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
            }

            .crafting-feedback.success {
                border-color: #90c978;
                color: #90c978;
            }

            .crafting-feedback.error {
                border-color: #c97878;
                color: #c97878;
            }

            .craft-missing {
                margin-top: 10px;
                padding: 8px;
                background: rgba(201, 120, 120, 0.3);
                border-radius: 6px;
                font-size: 14px;
                color: #c97878;
            }

            @media (max-width: 768px) {
                .crafting-panel {
                    width: 95vw;
                    height: 90vh;
                }
                
                .crafting-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 15px;
                }
                
                .craft-category-btn {
                    align-self: flex-end;
                }
            }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    /**
     * Calcula a quantidade total de um item disponível
     * Soma quantidades do inventário e armazenamento (se habilitados)
     * @param {number} itemId - ID do item a ser contabilizado
     * @returns {number} Quantidade total disponível
     */
    getTotalItemQuantity(itemId) {
        let total = 0;

        if (this.useInventory) {
            total += window.inventorySystem.getItemQuantity(itemId) || 0;
        }

        if (this.useStorage && window.storageSystem) {
            total += window.storageSystem.getItemQuantity(itemId) || 0;
        }

        return total;
    }

    /**
     * Verifica se uma receita pode ser craftada
     * Compara os requisitos com os recursos disponíveis
     * @param {Object} recipe - Objeto da receita
     * @param {Array<Object>} recipe.requiredItems - Array de itens necessários
     * @param {number} recipe.requiredItems[].itemId - ID do item necessário
     * @param {number} recipe.requiredItems[].qty - Quantidade necessária
     * @returns {boolean} True se todos os materiais estão disponíveis, false caso contrário
     */
    canCraft(recipe) {
        for (const req of recipe.requiredItems) {
            const total = this.getTotalItemQuantity(req.itemId);
            if (total < req.qty) return false;
        }
        return true;
    }

    /**
     * Identifica quais materiais estão faltando para craftar uma receita
     * @param {Object} recipe - Objeto da receita
     * @param {Array<Object>} recipe.requiredItems - Array de itens necessários
     * @returns {Array<Object>} Array de objetos com itemId e quantidade faltante
     */
    getMissing(recipe) {
        const missing = [];
        for (const req of recipe.requiredItems) {
            const have = this.getTotalItemQuantity(req.itemId);
            if (have < req.qty) {
                missing.push({
                    itemId: req.itemId,
                    missing: req.qty - have
                });
            }
        }
        return missing;
    }

    /**
     * Remove os itens necessários do inventário e armazenamento
     * Prioriza remoção do inventário, depois do armazenamento
     * @param {Object} recipe - Objeto da receita
     * @param {Array<Object>} recipe.requiredItems - Array de itens a serem removidos
     * @returns {void}
     */
    removeRequiredItems(recipe) {
        for (const req of recipe.requiredItems) {
            let amountToRemove = req.qty;
            if (this.useInventory) {
                const removed = window.inventorySystem.removeItem(req.itemId, amountToRemove);
                amountToRemove -= removed;
            }
            if (amountToRemove > 0 && this.useStorage && window.storageSystem) {
                window.storageSystem.removeItem(req.itemId, amountToRemove);
            }
        }
    }

    /**
     * Executa o processo de crafting de uma receita
     * Verifica materiais, remove recursos, adiciona resultado ao inventário
     * Inclui animação de loading e feedback visual
     * @async
     * @param {number} recipeId - ID da receita a ser craftada
     * @returns {Promise<void>}
     */
    async craft(recipeId) {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        if (!this.canCraft(recipe)) {
            this.showMessage("❌ Faltam materiais!", "error");
            return;
        }

        const craftBtn = document.querySelector(`.craft-btn[data-id="${recipeId}"]`);
        if (craftBtn) {
            craftBtn.disabled = true;
            craftBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Craftando...';
            craftBtn.classList.add("disabled");
        }

        this.removeRequiredItems(recipe);

        await new Promise(resolve => setTimeout(resolve, 800));

        window.inventorySystem.addItem(recipe.result.itemId, recipe.result.qty);

        this.showMessage(`🔨 Craftado: ${recipe.name}!`, "success");

        this.renderRecipeList();

        if (craftBtn) {
            setTimeout(() => {
                craftBtn.disabled = false;
                craftBtn.innerHTML = '<i class="fas fa-hammer"></i> Craftar';
                craftBtn.classList.remove("disabled");
            }, 1000);
        }
    }

    /**
     * Abre a interface de crafting
     * Previne abertura duplicada e renderiza a UI completa
     * @returns {void}
     */
    open() {
        logger.debug("🎯 CraftingSystem.open() - INICIADO");
        if (this.isOpen) {
            logger.debug("⚠️ Crafting já está aberto");
            return;
        }

        this.isOpen = true;
        logger.debug("🖼️ Criando UI do crafting...");

        this.createCraftingUI();
        this.renderRecipeList();

        logger.info("✅ Crafting aberto com sucesso");
    }

    /**
     * Fecha a interface de crafting
     * Remove elementos do DOM e limpa event listeners
     * @returns {void}
     */
    close() {
        this.isOpen = false;
        const panel = document.querySelector(".crafting-panel");
        const overlay = document.querySelector(".crafting-overlay");
        if (panel) panel.remove();
        if (overlay) overlay.remove();
        
        document.removeEventListener("keydown", this.handleEscapeBound);
    }

    /**
     * Cria os elementos HTML da interface de crafting
     * Gera overlay, painel principal e configura event listeners
     * Remove UI existente antes de criar nova
     * @returns {void}
     */
    createCraftingUI() {
        const existingPanel = document.querySelector(".crafting-panel");
        const existingOverlay = document.querySelector(".crafting-overlay");
        
        if (existingPanel) existingPanel.remove();
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement("div");
        overlay.className = "crafting-overlay";
        document.body.appendChild(overlay);

        const panel = document.createElement("div");
        panel.className = "crafting-panel";

        panel.innerHTML = `
            <button class="crafting-close-btn">&times;</button>
            
            <div class="crafting-header">
                <h2>⚒️ Sistema de Crafting</h2>
            </div>

            <div class="crafting-categories" id="craft-categories"></div>

            <div class="crafting-recipes" id="craft-list"></div>
        `;

        document.body.appendChild(panel);

        panel.querySelector(".crafting-close-btn").addEventListener("click", () => this.close());
        overlay.addEventListener("click", () => this.close());
        
        this.handleEscapeBound = this.handleEscape.bind(this);
        document.addEventListener("keydown", this.handleEscapeBound);
    }

    /**
     * Gerencia o evento de pressionar a tecla ESC
     * Fecha a interface de crafting se estiver aberta
     * @param {KeyboardEvent} e - Evento de teclado
     * @returns {void}
     */
    handleEscape(e) {
        if (e.key === "Escape" && this.isOpen) {
            this.close();
        }
    }

    /**
     * Renderiza os botões de categorias de receitas
     * Cria botões para "all" e para cada categoria única encontrada nas receitas
     * Configura event listeners para filtrar receitas por categoria
     * @returns {void}
     */
    renderCategories() {
        const catBox = document.getElementById("craft-categories");
        if (!catBox) return;

        const uniqueCats = ["all", ...new Set(recipes.map(r => r.category))];

        catBox.innerHTML = uniqueCats
            .map(
                cat => `
            <button class="craft-category-btn ${this.activeCategory === cat ? "active" : ""}" 
                data-cat="${cat}">
                <i class="fas fa-${this.getCategoryIcon(cat)}"></i>
                ${cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>`
            )
            .join("");

        catBox.querySelectorAll("button").forEach(btn => {
            btn.addEventListener("click", () => {
                this.activeCategory = btn.dataset.cat;
                this.renderCategories();
                this.renderRecipeList();
            });
        });
    }

    /**
     * Retorna o ícone apropriado para cada categoria
     * @param {string} category - Nome da categoria
     * @returns {string} Nome do ícone FontAwesome (sem o prefixo 'fa-')
     */
    getCategoryIcon(category) {
        const icons = {
            'tools': 'hammer',
            'weapons': 'gun',
            'food': 'apple-alt',
            'material': 'box',
            'construction': 'hammer',
            'all': 'star'
        };
        return icons[category] || 'question';
    }

    /**
     * Renderiza a lista completa de receitas filtrada por categoria
     * Cria elementos HTML para cada receita com requisitos, status e botão de craft
     * Atualiza o estado visual baseado na disponibilidade de materiais
     * @returns {void}
     */
    renderRecipeList() {
        const list = document.getElementById("craft-list");
        if (!list) return;

        this.renderCategories();

        const filtered = this.activeCategory === "all"
            ? recipes
            : recipes.filter(r => r.category === this.activeCategory);

        list.innerHTML = "";

        filtered.forEach(recipe => {
            const can = this.canCraft(recipe);
            const missing = this.getMissing(recipe);

            const div = document.createElement("div");
            div.className = "crafting-item";

            div.innerHTML = `
                <div class="crafting-info">
                    <div class="crafting-name">
                        <i class="fas fa-${recipe.icon || 'hammer'}"></i>
                        ${recipe.name}
                    </div>

                    <div class="crafting-requirements">
                        ${recipe.requiredItems.map(req => {
                            const data = items.find(i => i.id === req.itemId);
                            const hasEnough = this.getTotalItemQuantity(req.itemId) >= req.qty;
                            return `
                                <div class="requirement ${hasEnough ? 'has-enough' : 'not-enough'}">
                                    <span class="req-icon">${data?.icon || '📦'}</span>
                                    <span class="req-qty">${req.qty}x</span>
                                    <span class="req-name">${data?.name || req.itemId}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    ${missing.length > 0 ? `
                        <div class="craft-missing">
                            <i class="fas fa-exclamation-triangle"></i>
                            Faltando:  
                            ${missing.map(m => {
                                const data = items.find(i => i.id === m.itemId);
                                return `${m.missing}x ${data?.name}`;
                            }).join(", ")}
                        </div>
                    ` : ""}
                </div>

                <button 
                    class="craft-btn ${can ? "" : "disabled"}"
                    data-id="${recipe.id}"
                    ${can ? "" : "disabled"}
                >
                    <i class="fas fa-hammer"></i>
                    Craftar
                </button>
            `;

            list.appendChild(div);
        });

        list.querySelectorAll(".craft-btn:not(.disabled)").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                this.craft(id);
            });
        });
    }

    /**
     * Exibe uma mensagem de feedback ao jogador
     * Usa window.showMessage se disponível, caso contrário cria elemento próprio
     * Mensagem desaparece automaticamente após 3 segundos
     * @param {string} text - Texto da mensagem
     * @param {string} [type='success'] - Tipo da mensagem (success ou error)
     * @returns {void}
     */
    showMessage(text, type = "success") {
        if (window.showMessage) {
            window.showMessage(text);
            return;
        }

        const message = document.createElement("div");
        message.className = `crafting-feedback ${type}`;
        message.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i>
            ${text}
        `;
        
        document.body.appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 3000);
    }
}

// Instancia e exporta o sistema de crafting
export const craftingSystem = new CraftingSystem();
window.craftingSystem = craftingSystem;