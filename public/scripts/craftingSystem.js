import { logger } from "./logger.js";
import { recipes } from "./recipes.js";
import { getItem } from "./itemUtils.js";
import { items } from "./item.js";
import { t } from './i18n/i18n.js';
import { registerSystem, getSystem } from "./gameState.js";

/**
 * Retorna o nome traduzido de uma receita, com fallback para o nome original
 */
function getRecipeName(recipe) {
  const key = `recipeNames.${recipe.id}`;
  const translated = t(key);
  return translated !== key ? translated : recipe.name;
}

/**
 * Retorna o nome traduzido de um item pelo ID, com fallback
 */
function getTranslatedItemName(itemId, fallback = '') {
  const key = `itemNames.${itemId}`;
  const translated = t(key);
  return translated !== key ? translated : fallback;
}

/**
 * Retorna o nome traduzido de uma categoria, com fallback capitalizado
 */
function getCategoryLabel(cat) {
  const key = `categories.${cat}`;
  const translated = t(key);
  return translated !== key ? translated : cat.charAt(0).toUpperCase() + cat.slice(1);
}

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

    const inventory = getSystem('inventory');
    if (this.useInventory && inventory) {
      total += inventory.getItemQuantity(itemId) || 0;
    }

    const storage = getSystem('storage');
    if (this.useStorage && storage) {
      total += storage.getItemQuantity(itemId) || 0;
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
    const inventory = this.useInventory ? getSystem('inventory') : null;
    const storage = this.useStorage ? getSystem('storage') : null;

    for (const req of recipe.requiredItems) {
      let amountToRemove = req.qty;

      if (inventory) {
        const invQty = inventory.getItemQuantity?.(req.itemId) || 0;
        const invRemove = Math.min(invQty, amountToRemove);

        if (invRemove > 0) {
          const success = inventory.removeItem(req.itemId, invRemove);
          if (!success) throw new Error(`Falha ao remover item ${req.itemId} do inventário`);
          amountToRemove -= invRemove;
        }
      }

      if (amountToRemove > 0 && storage) {
        const success = storage.removeItem(req.itemId, amountToRemove);
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
    // dataset vem como string: manter robusto
    const recipe = recipes.find((r) => String(r.id) === String(recipeId));
    if (!recipe) return;

    if (!this.canCraft(recipe)) {
      this.showMessage(`❌ ${t('crafting.notEnoughMaterials')}`, "error");
      return;
    }


    const craftBtn = document.querySelector(`.crf-btn[data-id="${recipeId}"]`);
    if (craftBtn) {
      craftBtn.disabled = true;
       // fix: innerHTML → DOM API
       craftBtn.replaceChildren();
       const spinner = document.createElement('i');
       spinner.className = 'fas fa-spinner fa-spin';
       craftBtn.append(spinner, ` ${t('crafting.crafting')}`);
      craftBtn.classList.add("crf-disabled");
    }


    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      this.removeRequiredItems(recipe);

      if (getSystem('inventory')) {
        getSystem('inventory').addItem(recipe.result.itemId, recipe.result.qty);
      }
    } catch (error) {
      this.showMessage(`❌ ${t('crafting.craftError')}`, "error");
      logger.error("Craft failed:", error);

      if (craftBtn) {
        craftBtn.disabled = false;
        // fix: innerHTML → DOM API
        craftBtn.replaceChildren();
        const hammerIcon = document.createElement('i');
        hammerIcon.className = 'fas fa-hammer';
        craftBtn.append(hammerIcon, ` ${t('crafting.craft')}`);
        craftBtn.classList.remove("crf-disabled");
      }
      return;
    }

    this.showMessage(`🔨 ${t('crafting.crafted', { name: getRecipeName(recipe)})}`, "success");
    this.renderRecipeList();

    if (craftBtn) {
      setTimeout(() => {
        craftBtn.disabled = false;
        // fix: innerHTML → DOM API
        craftBtn.replaceChildren();
        const hammerIcon = document.createElement('i');
        hammerIcon.className = 'fas fa-hammer';
        craftBtn.append(hammerIcon, ` ${t('crafting.craft')}`);
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
  // fix: innerHTML → DOM API
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

    const closeBtn = document.createElement('button');
    closeBtn.className = 'crf-close-btn';
    closeBtn.setAttribute('aria-label', t('ui.close'));
    closeBtn.textContent = '\u00D7';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'crf-header';
    const h2 = document.createElement('h2');
    h2.textContent = `⚒️ ${t('crafting.title')}`;
    headerDiv.appendChild(h2);

    const categoriesDiv = document.createElement('div');
    categoriesDiv.className = 'crf-categories';
    categoriesDiv.id = 'crf-categories';

    const recipesDiv = document.createElement('div');
    recipesDiv.className = 'crf-recipes';
    recipesDiv.id = 'crf-list';

    panel.append(closeBtn, headerDiv, categoriesDiv, recipesDiv);

    document.body.appendChild(panel);

    closeBtn.addEventListener("click", () => this.close());
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
   * Renderiza os botões de categorias de receitas
   * @returns {void}
   */
  renderCategories() {
    const catBox = document.getElementById("crf-categories");
    if (!catBox) return;

    const uniqueCats = ["all", ...new Set(recipes.map((r) => r.category))];

    // fix: innerHTML → DOM API
    catBox.replaceChildren();
    for (const cat of uniqueCats) {
      const isActive = this.activeCategory === cat;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `crf-category-btn ${isActive ? 'crf-active' : ''}`;
      btn.dataset.cat = cat;
      const icon = document.createElement('i');
      icon.className = `fas fa-${this.getCategoryIcon(cat)}`;
      btn.append(icon, ` ${getCategoryLabel(cat)}`);
      btn.addEventListener('click', () => {
        this.activeCategory = cat;
        this.renderRecipeList();
      });
      catBox.appendChild(btn);
    }
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

    // fix: innerHTML → DOM API
    list.replaceChildren();

    filtered.forEach((recipe) => {
      const can = this.canCraft(recipe);
      const missing = this.getMissing(recipe);

      const div = document.createElement("div");
      div.className = "crf-item";

      const infoDiv = document.createElement("div");
      infoDiv.className = "crf-info";

      const nameDiv = document.createElement("div");
      nameDiv.className = "crf-name";
      const nameIcon = document.createElement("i");
      nameIcon.className = `fas fa-${recipe.icon || "hammer"}`;
      nameDiv.append(nameIcon, ` ${getRecipeName(recipe)}`);

      const reqDiv = document.createElement("div");
      reqDiv.className = "crf-requirements";
      for (const req of recipe.requiredItems) {
        const data = getItem(req.itemId);
        const hasEnough = this.getTotalItemQuantity(req.itemId) >= req.qty;
        const reqEl = document.createElement("div");
        reqEl.className = `crf-requirement ${hasEnough ? "crf-has-enough" : "crf-not-enough"}`;
        const iconSpan = document.createElement("span");
        iconSpan.className = "crf-req-icon";
        iconSpan.textContent = data?.icon || "📦";
        const qtySpan = document.createElement("span");
        qtySpan.className = "crf-req-qty";
        qtySpan.textContent = `${req.qty}x`;
        const nameSpan = document.createElement("span");
        nameSpan.className = "crf-req-name";
        nameSpan.textContent = getTranslatedItemName(req.itemId, data?.name || String(req.itemId));
        reqEl.append(iconSpan, qtySpan, nameSpan);
        reqDiv.appendChild(reqEl);
      }

      infoDiv.append(nameDiv, reqDiv);

      if (missing.length > 0) {
        const missingDiv = document.createElement("div");
        missingDiv.className = "crf-missing";
        const warnIcon = document.createElement("i");
        warnIcon.className = "fas fa-exclamation-triangle";
        const missingText = missing.map((m) => {
          const data = getItem(m.itemId);
          return `${m.missing}x ${getTranslatedItemName(m.itemId, data?.name || String(m.itemId))}`;
        }).join(", ");
        missingDiv.append(warnIcon, ` ${t('crafting.missing')}: ${missingText}`);
        infoDiv.appendChild(missingDiv);
      }

      const craftBtn = document.createElement("button");
      craftBtn.type = "button";
      craftBtn.className = `crf-btn ${can ? "" : "crf-disabled"}`;
      craftBtn.dataset.id = recipe.id;
      if (!can) craftBtn.disabled = true;
      const hammerIcon = document.createElement("i");
      hammerIcon.className = "fas fa-hammer";
      craftBtn.append(hammerIcon, ` ${t('crafting.craft')}`);

      if (can) {
        craftBtn.addEventListener("click", () => this.craft(recipe.id));
      }

      div.append(infoDiv, craftBtn);
      list.appendChild(div);
    });
  }

  /**
   * Cleanup do sistema de crafting
   * Remove listeners e fecha UI se aberta
   * @returns {void}
   */
  destroy() {
    this.close();
    logger.debug('CraftingSystem destruído');
  }

  /**
   * Exibe uma mensagem de feedback ao jogador
   * @param {string} text
   * @param {"success"|"error"} [type="success"]
   * @returns {void}
   */
  showMessage(text, type = "success") {
    const hud = getSystem('hud');
    if (hud?.showMessage) {
      hud.showMessage(text);
      return;
    }

    // fix: innerHTML → DOM API
    const message = document.createElement("div");
    message.className = `crf-feedback ${type === "success" ? "crf-success" : "crf-error"}`;
    const msgIcon = document.createElement('i');
    msgIcon.className = `fas fa-${type === "success" ? "check" : "exclamation-triangle"}`;
    message.append(msgIcon, ` ${text}`);

    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 3000);
  }
}

// Instancia e exporta o sistema de crafting
export const craftingSystem = new CraftingSystem();
registerSystem('crafting', craftingSystem);
