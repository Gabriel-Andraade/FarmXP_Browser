import { logger } from "./logger.js";
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
   * Inicializa configurações padrão
   */
  constructor() {
    this.isOpen = false;
    this.useStorage = true;
    this.useInventory = true;
    this.activeCategory = "all";

    this.handleEscapeBound = null;
  }

  /**
   * Calcula a quantidade total de um item disponível
   * Soma quantidades do inventário e armazenamento (se habilitados)
   * @param {number} itemId
   * @returns {number}
   */
  getTotalItemQuantity(itemId) {
    let total = 0;

    if (this.useInventory && window.inventorySystem) {
      total += window.inventorySystem.getItemQuantity(itemId) || 0;
    }

    if (this.useStorage && window.storageSystem) {
      total += window.storageSystem.getItemQuantity(itemId) || 0;
    }

    return total;
  }

  /**
   * Verifica se uma receita pode ser craftada
   * @param {Object} recipe
   * @returns {boolean}
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
   * @param {Object} recipe
   * @returns {Array<{itemId:number, missing:number}>}
   */
  getMissing(recipe) {
    const missing = [];
    for (const req of recipe.requiredItems) {
      const have = this.getTotalItemQuantity(req.itemId);
      if (have < req.qty) {
        missing.push({
          itemId: req.itemId,
          missing: req.qty - have,
        });
      }
    }
    return missing;
  }

  /**
   * Remove os itens necessários do inventário e armazenamento
   * @param {Object} recipe
   * @returns {void}
   */
  removeRequiredItems(recipe) {
    for (const req of recipe.requiredItems) {
      let amountToRemove = req.qty;

      if (this.useInventory && window.inventorySystem) {
        const invQty = window.inventorySystem.getItemQuantity?.(req.itemId) || 0;
        const invRemove = Math.min(invQty, amountToRemove);
        if (invRemove > 0) {
          const success = window.inventorySystem.removeItem(req.itemId, invRemove);
          if (!success) throw new Error(`Falha ao remover item ${req.itemId} do inventário`);
          amountToRemove -= invRemove;
        }
      }

      if (amountToRemove > 0 && this.useStorage && window.storageSystem) {
        const success = window.storageSystem.removeItem(req.itemId, amountToRemove);
        if (!success) throw new Error(`Falha ao remover item ${req.itemId} do armazenamento`);
      }
    }
  }

  /**
   * Executa o processo de crafting de uma receita
   * @async
   * @param {number|string} recipeId
   * @returns {Promise<void>}
   */
  async craft(recipeId) {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    if (!this.canCraft(recipe)) {
      this.showMessage("❌ Faltam materiais!", "error");
      return;
    }

    const craftBtn = document.querySelector(`.crf-btn[data-id="${recipeId}"]`);
    if (craftBtn) {
      craftBtn.disabled = true;
      craftBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Craftando...';
      craftBtn.classList.add("crf-disabled");
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      if (window.inventorySystem) {
        window.inventorySystem.addItem(recipe.result.itemId, recipe.result.qty);
      }
      this.removeRequiredItems(recipe);
    } catch (error) {
      this.showMessage("❌ Erro ao craftar!", "error");
      logger.error("Craft failed:", error);
      if (craftBtn) {
        craftBtn.disabled = false;
        craftBtn.innerHTML = '<i class="fas fa-hammer"></i> Craftar';
        craftBtn.classList.remove("crf-disabled");
      }
      return;
    }

    this.showMessage(`🔨 Craftado: ${recipe.name}!`, "success");
    this.renderRecipeList();

    if (craftBtn) {
      setTimeout(() => {
        craftBtn.disabled = false;
        craftBtn.innerHTML = '<i class="fas fa-hammer"></i> Craftar';
        craftBtn.classList.remove("crf-disabled");
      }, 1000);
    }
  }

  /**
   * Abre a interface de crafting
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
   * @returns {void}
   */
  close() {
    this.isOpen = false;

    const panel = document.querySelector(".crf-panel");
    const overlay = document.querySelector(".crf-overlay");

    if (panel) panel.remove();
    if (overlay) overlay.remove();

    if (this.handleEscapeBound) {
      document.removeEventListener("keydown", this.handleEscapeBound);
      this.handleEscapeBound = null;
    }
  }

  /**
   * Cria os elementos HTML da interface de crafting
   * @returns {void}
   */
  createCraftingUI() {
    const existingPanel = document.querySelector(".crf-panel");
    const existingOverlay = document.querySelector(".crf-overlay");

    if (existingPanel) existingPanel.remove();
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement("div");
    overlay.className = "crf-overlay";
    document.body.appendChild(overlay);

    const panel = document.createElement("div");
    panel.className = "crf-panel";

    panel.innerHTML = `
      <button class="crf-close-btn" aria-label="Fechar">&times;</button>

      <div class="crf-header">
        <h2>⚒️ Sistema de Crafting</h2>
      </div>

      <div class="crf-categories" id="crf-categories"></div>
      <div class="crf-recipes" id="crf-list"></div>
    `;

    document.body.appendChild(panel);

    panel.querySelector(".crf-close-btn").addEventListener("click", () => this.close());
    overlay.addEventListener("click", () => this.close());

    this.handleEscapeBound = this.handleEscape.bind(this);
    document.addEventListener("keydown", this.handleEscapeBound);
  }

  /**
   * Gerencia o evento de pressionar a tecla ESC
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  handleEscape(e) {
    if (e.key === "Escape" && this.isOpen) {
      this.close();
    }
  }

  /**
   * Renderiza os botões de categorias de receitas
   * @returns {void}
   */
  renderCategories() {
    const catBox = document.getElementById("crf-categories");
    if (!catBox) return;

    const uniqueCats = ["all", ...new Set(recipes.map((r) => r.category))];

    catBox.innerHTML = uniqueCats
      .map((cat) => {
        const isActive = this.activeCategory === cat;
        return `
          <button
            type="button"
            class="crf-category-btn ${isActive ? "crf-active" : ""}"
            data-cat="${cat}"
          >
            <i class="fas fa-${this.getCategoryIcon(cat)}"></i>
            ${cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        `;
      })
      .join("");

    catBox.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.activeCategory = btn.dataset.cat;
        this.renderCategories();
        this.renderRecipeList();
      });
    });
  }

  /**
   * Retorna o ícone apropriado para cada categoria
   * @param {string} category
   * @returns {string}
   */
  getCategoryIcon(category) {
    const icons = {
      tools: "hammer",
      weapons: "gun",
      food: "apple-alt",
      material: "box",
      construction: "hammer",
      animal_food: "paw",
      all: "star",
    };
    return icons[category] || "question";
  }

  /**
   * Renderiza a lista completa de receitas filtrada por categoria
   * @returns {void}
   */
  renderRecipeList() {
    const list = document.getElementById("crf-list");
    if (!list) return;

    this.renderCategories();

    const filtered =
      this.activeCategory === "all"
        ? recipes
        : recipes.filter((r) => r.category === this.activeCategory);

    list.innerHTML = "";

    filtered.forEach((recipe) => {
      const can = this.canCraft(recipe);
      const missing = this.getMissing(recipe);

      const div = document.createElement("div");
      div.className = "crf-item";

      div.innerHTML = `
        <div class="crf-info">
          <div class="crf-name">
            <i class="fas fa-${recipe.icon || "hammer"}"></i>
            ${recipe.name}
          </div>

          <div class="crf-requirements">
            ${recipe.requiredItems
              .map((req) => {
                const data = items.find((i) => i.id === req.itemId);
                const hasEnough = this.getTotalItemQuantity(req.itemId) >= req.qty;

                return `
                  <div class="crf-requirement ${hasEnough ? "crf-has-enough" : "crf-not-enough"}">
                    <span class="crf-req-icon">${data?.icon || "📦"}</span>
                    <span class="crf-req-qty">${req.qty}x</span>
                    <span class="crf-req-name">${data?.name || req.itemId}</span>
                  </div>
                `;
              })
              .join("")}
          </div>

          ${
            missing.length > 0
              ? `
                <div class="crf-missing">
                  <i class="fas fa-exclamation-triangle"></i>
                  Faltando:
                  ${missing
                    .map((m) => {
                      const data = items.find((i) => i.id === m.itemId);
                      return `${m.missing}x ${data?.name || m.itemId}`;
                    })
                    .join(", ")}
                </div>
              `
              : ""
          }
        </div>

        <button
          type="button"
          class="crf-btn ${can ? "" : "crf-disabled"}"
          data-id="${recipe.id}"
          ${can ? "" : "disabled"}
        >
          <i class="fas fa-hammer"></i>
          Craftar
        </button>
      `;

      list.appendChild(div);
    });

    list.querySelectorAll(".crf-btn:not(.crf-disabled)").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        this.craft(id);
      });
    });
  }

  /**
   * Exibe uma mensagem de feedback ao jogador
   * @param {string} text
   * @param {"success"|"error"} [type="success"]
   * @returns {void}
   */
  showMessage(text, type = "success") {
    if (window.showMessage) {
      window.showMessage(text);
      return;
    }

    const message = document.createElement("div");
    message.className = `crf-feedback ${type === "success" ? "crf-success" : "crf-error"}`;
    message.innerHTML = `
      <i class="fas fa-${type === "success" ? "check" : "exclamation-triangle"}"></i>
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
