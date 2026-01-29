import { logger } from '../logger.js';
import { inventorySystem } from "./inventorySystem.js";
import { items } from "../item.js";
import { getSystem } from "../gameState.js";

// ---------- CSS ISOLADO COM SHADOW DOM ----------
const createInventoryUI = () => {
  // Criar host container
  const host = document.createElement('div');
  host.id = 'inventory-ui-host';
  document.body.appendChild(host);
  
  // Criar Shadow DOM para isolar completamente o CSS
  const shadow = host.attachShadow({ mode: 'open' });
  
  // CSS isolado - não será afetado pelo style.css global
  const css = `
    /* CSS ISOLADO DO INVENTÁRIO */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Roboto:wght@300,400,500,700&display=swap');

    :host {
      --bg: #17160A;
      --panel-deep: #27180E;
      --panel: #3C2414;
      --header: #B9782F;
      --accent: #E6C293;
      --beige: #F3DCC0;
      --slot-dash: rgba(255,255,255,0.06);
      --glass: rgba(255,255,255,0.03);
      --radius-lg: 14px;
      --radius-md: 10px;
      --shadow-soft: 0 10px 30px rgba(0,0,0,0.45);
    }

    /* Modal Overlay */
    .inv-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .inv-overlay.open {
      display: flex !important;
      opacity: 1 !important;
      animation: fadeIn 0.3s ease forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Main Container */
    .inv-container {
      width: 90vw;
      max-width: 1000px;
      height: 85vh;
      max-height: 800px;
      background: var(--bg);
      border: 3px solid var(--header);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-soft), 0 0 40px rgba(185, 120, 47, 0.3);
      position: relative;
      overflow: hidden;
      color: var(--beige);
      font-family: 'Roboto', sans-serif;
      transform: scale(0.95);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .inv-overlay.open .inv-container {
      transform: scale(1);
    }

    /* Header */
    .inv-header {
      height: 70px;
      background: linear-gradient(135deg, var(--panel-deep), #3a2412);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 25px;
      border-bottom: 3px solid var(--header);
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      position: relative;
      z-index: 2;
    }

    .inv-title {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: var(--header);
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 700;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }

    .inv-close {
      background: none;
      border: none;
      color: var(--accent);
      font-size: 36px;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .inv-close:hover {
      color: #fff;
      background: rgba(185, 120, 47, 0.2);
      transform: rotate(90deg);
    }

    /* Layout Interno */
    .inv-body {
      display: flex;
      flex: 1;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(39, 24, 14, 0.95), rgba(60, 36, 20, 0.9));
    }

    /* Sidebar (Tabs) */
    .inv-tabs {
      width: 220px;
      background: rgba(20, 12, 5, 0.95);
      display: flex;
      flex-direction: column;
      padding: 20px 0;
      gap: 5px;
      border-right: 2px solid rgba(185, 120, 47, 0.3);
      backdrop-filter: blur(5px);
    }

    .inv-tab-btn {
      background: transparent;
      border: none;
      border-left: 4px solid transparent;
      color: #aaa;
      padding: 16px 20px;
      text-align: left;
      cursor: pointer;
      font-size: 15px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 15px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .inv-tab-btn:hover {
      background: rgba(255,255,255,0.05);
      color: var(--beige);
      border-left-color: var(--header);
      padding-left: 25px;
    }

    .inv-tab-btn.active {
      background: linear-gradient(90deg, rgba(185, 120, 47, 0.3), transparent);
      color: var(--header);
      border-left-color: var(--header);
      font-weight: bold;
      text-shadow: 0 0 10px rgba(185, 120, 47, 0.5);
    }

    .inv-tab-btn.active::before {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      height: 100%;
      width: 3px;
      background: var(--header);
      box-shadow: 0 0 10px var(--header);
    }

    /* Content Area */
    .inv-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 25px;
      background: linear-gradient(135deg, rgba(28, 17, 9, 0.95), rgba(42, 25, 14, 0.9));
      position: relative;
    }

    .inv-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" opacity="0.03"><rect width="100" height="100" fill="none" stroke="%23B9782F" stroke-width="1"/></svg>');
      pointer-events: none;
    }

    /* Grid de Slots */
    .inv-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 15px;
      padding: 10px;
      overflow-y: auto;
      flex: 1;
    }

    .inv-slot {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, rgba(30, 18, 10, 0.9), rgba(45, 27, 15, 0.9));
      border: 2px solid #5a3a25;
      border-radius: 12px;
      position: relative;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }

    .inv-slot:hover {
      border-color: var(--accent);
      background: linear-gradient(135deg, rgba(185, 120, 47, 0.3), rgba(60, 36, 20, 0.9));
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 8px 20px rgba(185, 120, 47, 0.4);
    }

    .inv-slot.selected {
      border-color: var(--header);
      box-shadow: 0 0 20px rgba(185, 120, 47, 0.8), inset 0 0 20px rgba(185, 120, 47, 0.2);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 20px rgba(185, 120, 47, 0.8), inset 0 0 20px rgba(185, 120, 47, 0.2); }
      50% { box-shadow: 0 0 25px rgba(185, 120, 47, 1), inset 0 0 25px rgba(185, 120, 47, 0.3); }
      100% { box-shadow: 0 0 20px rgba(185, 120, 47, 0.8), inset 0 0 20px rgba(185, 120, 47, 0.2); }
    }

    .inv-slot img, .inv-slot .icon-char {
      width: 50px;
      height: 50px;
      object-fit: contain;
      font-size: 40px;
      filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.7));
    }

    .inv-slot-qty {
      position: absolute;
      bottom: 5px;
      right: 5px;
      font-size: 12px;
      font-weight: bold;
      color: #fff;
      background: rgba(0,0,0,0.7);
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 20px;
      text-align: center;
      text-shadow: 1px 1px 2px #000;
      border: 1px solid rgba(255,255,255,0.2);
    }

    /* Painel de Detalhes */
    .inv-details {
      min-height: 120px;
      background: linear-gradient(135deg, rgba(20, 12, 5, 0.95), rgba(35, 21, 11, 0.9));
      border-top: 2px solid var(--header);
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: var(--radius-md);
      margin-top: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 -5px 20px rgba(0,0,0,0.3);
    }

    .inv-item-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .inv-item-name {
      font-size: 22px;
      font-weight: bold;
      color: var(--accent);
      text-shadow: 1px 1px 3px rgba(0,0,0,0.7);
    }

    .inv-item-desc {
      font-size: 14px;
      color: #ccc;
      line-height: 1.4;
      max-width: 500px;
      opacity: 0.9;
    }

    .inv-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Botões de Ação */
    .btn-action {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 120px;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .btn-action::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }

    .btn-action:hover::before {
      left: 100%;
    }

    .btn-action:hover {
      transform: translateY(-3px);
      filter: brightness(1.2);
      box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    }

    .btn-action:active {
      transform: translateY(-1px);
    }

    .btn-use { 
      background: linear-gradient(135deg, #27ae60, #219150); 
      color: white; 
      border: 1px solid #2ecc71;
    }

    .btn-equip { 
      background: linear-gradient(135deg, #e67e22, #d35400); 
      color: white; 
      border: 1px solid #f39c12;
    }

    .btn-discard { 
      background: linear-gradient(135deg, #e74c3c, #c0392b); 
      color: white; 
      border: 1px solid #e74c3c;
    }

    .btn-build { 
      background: linear-gradient(135deg, #3498db, #2980b9); 
      color: white; 
      border: 1px solid #3498db;
    }

    /* Mensagem de Vazio */
    .inv-empty-msg {
      color: rgba(255,255,255,0.3);
      text-align: center;
      font-size: 18px;
      font-style: italic;
      width: 100%;
      padding: 60px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .inv-empty-msg::before {
      content: '📦';
      font-size: 48px;
      opacity: 0.5;
    }

    /* Scrollbars */
    .inv-grid::-webkit-scrollbar {
      width: 10px;
    }

    .inv-grid::-webkit-scrollbar-track {
      background: rgba(20, 12, 5, 0.5);
      border-radius: 5px;
    }

    .inv-grid::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, var(--header), var(--accent));
      border-radius: 5px;
      border: 2px solid rgba(20, 12, 5, 0.5);
    }

    .inv-grid::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(135deg, var(--accent), #fff);
    }

    /* Responsividade */
    @media (max-width: 768px) {
      .inv-container {
        width: 95vw;
        height: 90vh;
      }
      
      .inv-body {
        flex-direction: column;
      }
      
      .inv-tabs {
        width: 100%;
        flex-direction: row;
        overflow-x: auto;
        padding: 10px;
        border-right: none;
        border-bottom: 2px solid rgba(185, 120, 47, 0.3);
      }
      
      .inv-tab-btn {
        padding: 10px 15px;
        border-left: none;
        border-bottom: 3px solid transparent;
      }
      
      .inv-tab-btn.active {
        border-left: none;
        border-bottom-color: var(--header);
      }
      
      .inv-tab-btn.active::before {
        display: none;
      }
      
      .inv-slot {
        width: 70px;
        height: 70px;
      }
      
      .inv-actions {
        flex-direction: column;
        width: 100%;
      }
      
      .btn-action {
        width: 100%;
        min-width: unset;
      }
    }
  `;

  // Aplicar CSS ao Shadow DOM
  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  // Estrutura HTML
  shadow.innerHTML += `
    <div class="inv-overlay" id="inventoryModal">
      <div class="inv-container">
        <div class="inv-header">
          <span class="inv-title">🎒 Inventário</span>
          <button class="inv-close" id="closeInvBtn">&times;</button>
        </div>
        <div class="inv-body">
          <div class="inv-tabs" id="invTabs"></div>
          <div class="inv-content">
            <div class="inv-grid" id="invGrid"></div>
            <div class="inv-details" id="invDetails" style="display: none;">
              <div class="inv-item-info">
                <span class="inv-item-name" id="detailName">Selecione um item</span>
                <span class="inv-item-desc" id="detailDesc"></span>
              </div>
              <div class="inv-actions" id="detailActions"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return shadow;
};

// Variáveis de estado
let shadowRoot;
let activeCategory = 'resources';
let selectedSlotIndex = -1;
let currentItems = [];

// Mapeamento de Categorias
const CATEGORY_MAP = {
  resources: { label: 'Recursos', icon: '🪵' },
  tools: { label: 'Ferramentas', icon: '⚒️' },
  seeds: { label: 'Sementes', icon: '🌱' },
  construction: { label: 'Construção', icon: '🏗️' },
  animal_food: { label: 'Comida de Animais', icon: '🐔' },
  food: { label: 'Comidas', icon: '🍎' }
};

// Cache de elementos DOM
let modalEl, contentEl, tabsEl, detailsEl;

export function initInventoryUI() {
  if (document.getElementById('inventory-ui-host')) return;
  
  // Criar interface com Shadow DOM
  shadowRoot = createInventoryUI();
  
  // Bind dos elementos
  modalEl = shadowRoot.getElementById('inventoryModal');
  contentEl = shadowRoot.getElementById('invGrid');
  tabsEl = shadowRoot.getElementById('invTabs');
  detailsEl = shadowRoot.getElementById('invDetails');
  
  // Event Listeners
  shadowRoot.getElementById('closeInvBtn').addEventListener('click', closeInventoryModal);
  
  // Fechar ao clicar fora
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeInventoryModal();
  });
  
  // Atualizar UI quando inventário muda
  document.addEventListener('inventoryUpdated', () => {
    if (modalEl.classList.contains('open')) {
      renderInventory();
    }
  });
  
  // Expor globalmente
  window.openInventory = openInventoryModal;
  window.closeInventory = closeInventoryModal;

  logger.info('✅ Inventory UI (Shadow DOM) Carregada');
}

function isInputActive() {
  const active = document.activeElement;
  return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
}

export function openInventoryModal() {
  if (!shadowRoot) initInventoryUI();

  renderTabs();
  renderInventory();
  modalEl.classList.add('open');

  // Desabilitar input do jogador
  const playerSystem = getSystem('player');
  if (playerSystem) {
    playerSystem.inputDisabled = true;
  }

  // Focar no modal
  setTimeout(() => {
    shadowRoot.getElementById('closeInvBtn')?.focus();
  }, 100);
}

export function closeInventoryModal() {
  if (modalEl) {
    modalEl.classList.remove('open');
  }
  selectedSlotIndex = -1;
  updateDetailsPanel(null);

  // Reabilitar input do jogador
  const playerSystem = getSystem('player');
  if (playerSystem) {
    playerSystem.inputDisabled = false;
  }
}

function renderTabs() {
  if (!tabsEl) return;
  
  tabsEl.innerHTML = '';
  const categories = Object.keys(inventorySystem.categories || {});

  categories.forEach(catKey => {
    const catData = CATEGORY_MAP[catKey] || { label: catKey, icon: '📦' };
    const btn = document.createElement('button');
    btn.className = `inv-tab-btn ${activeCategory === catKey ? 'active' : ''}`;
    btn.innerHTML = `<span style="font-size: 20px;">${catData.icon}</span> ${catData.label}`;
    
    btn.onclick = () => {
      activeCategory = catKey;
      selectedSlotIndex = -1;
      updateDetailsPanel(null);
      renderInventory();
      // Atualizar tabs visualmente
      shadowRoot.querySelectorAll('.inv-tab-btn').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
    };
    
    tabsEl.appendChild(btn);
  });
}

function renderInventory() {
  if (!contentEl) return;
  
  contentEl.innerHTML = '';
  
  const categoryData = inventorySystem.categories?.[activeCategory];
  
  if (!categoryData?.items || categoryData.items.length === 0) {
    contentEl.innerHTML = `
      <div class="inv-empty-msg">
        <div>Nada por aqui...</div>
        <div style="font-size: 14px; opacity: 0.5;">Esta categoria está vazia</div>
      </div>
    `;
    currentItems = [];
    detailsEl.style.display = 'none';
    return;
  }

  currentItems = categoryData.items;

  currentItems.forEach((slot, index) => {
    const fullItem = items.find(i => i.id === slot.id);
    if (!fullItem) return;

    const itemQuantity = slot.quantity || slot.qty || 1;
    const slotEl = document.createElement('div');
    slotEl.className = `inv-slot ${selectedSlotIndex === index ? 'selected' : ''}`;
    slotEl.setAttribute('data-index', index);
    
    // Ícone
    if (fullItem.icon) {
      if (fullItem.icon.includes('.') || fullItem.icon.startsWith('http')) {
        const img = document.createElement('img');
        img.src = fullItem.icon;
        img.alt = fullItem.name;
        slotEl.appendChild(img);
      } else {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon-char';
        iconSpan.textContent = fullItem.icon;
        slotEl.appendChild(iconSpan);
      }
    } else {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon-char';
      iconSpan.textContent = '❓';
      slotEl.appendChild(iconSpan);
    }

    // Quantidade
    if (itemQuantity > 1) {
      const qtySpan = document.createElement('span');
      qtySpan.className = 'inv-slot-qty';
      qtySpan.textContent = itemQuantity;
      slotEl.appendChild(qtySpan);
    }

    // Click handler
    slotEl.onclick = () => {
      const prevSelected = shadowRoot.querySelector('.inv-slot.selected');
      if (prevSelected) prevSelected.classList.remove('selected');
      
      slotEl.classList.add('selected');
      selectedSlotIndex = index;
      updateDetailsPanel(fullItem, itemQuantity);
    };

    contentEl.appendChild(slotEl);
  });
  
  // Se tinha um item selecionado anteriormente, restaurar seleção
  if (selectedSlotIndex >= 0 && currentItems[selectedSlotIndex]) {
    const slotToSelect = shadowRoot.querySelector(`.inv-slot[data-index="${selectedSlotIndex}"]`);
    if (slotToSelect) {
      slotToSelect.classList.add('selected');
      const fullItem = items.find(i => i.id === currentItems[selectedSlotIndex].id);
      if (fullItem) {
        updateDetailsPanel(fullItem, currentItems[selectedSlotIndex].quantity);
      }
    }
  }
}

function updateDetailsPanel(item, qty) {
  if (!detailsEl) return;
  
  if (!item) {
    detailsEl.style.display = 'none';
    return;
  }

  detailsEl.style.display = 'flex';
  shadowRoot.getElementById('detailName').textContent = `${item.name} ${qty > 1 ? `(x${qty})` : ''}`;
  shadowRoot.getElementById('detailDesc').textContent = item.description || "Sem descrição disponível.";
  
  const actionsDiv = shadowRoot.getElementById('detailActions');
  actionsDiv.innerHTML = '';

  // 1. EQUIPAR (Ferramentas)
  if (item.type === 'tool') {
    const equipBtn = document.createElement('button');
    equipBtn.className = 'btn-action btn-equip';
    equipBtn.innerHTML = '🛠️ Equipar';
    equipBtn.onclick = () => {
      document.dispatchEvent(new CustomEvent('equipItemRequest', { detail: { item } }));
      closeInventoryModal();
    };
    actionsDiv.appendChild(equipBtn);
  }

  // 2. CONSTRUIR (Placeables/Structures)
  if (['placeable', 'structure', 'construction'].includes(item.type)) {
    const buildBtn = document.createElement('button');
    buildBtn.className = 'btn-action btn-build';
    buildBtn.innerHTML = '🔨 Construir';
    buildBtn.onclick = async () => {
      logger.debug(`🔨 Iniciando construção: ${item.name}`);
      closeInventoryModal();

      // Usar getSystem primeiro, fallback para window
      let BuildSystem = getSystem('build') || window.BuildSystem;

      if (BuildSystem) {
          try {
            if (typeof BuildSystem.initAdvancedSystem === 'function') {
              await BuildSystem.initAdvancedSystem();
            }
            if (typeof BuildSystem.startBuilding === 'function') {
              BuildSystem.startBuilding(item);
            } else {
              console.error('❌ BuildSystem.startBuilding não disponível');
              alert('Função de construção não disponível.');
            }
          } catch (err) {
            console.error('❌ Erro ao usar BuildSystem:', err);
            alert('Erro ao entrar no modo de construção. Verifique o console.');
          }
          return;
      }

      // Fallback: Tentar importar se não existir
      try {
          const buildModule = await import("../buildSystem.js");
          BuildSystem = buildModule.BuildSystem;

          if (BuildSystem) {
             if (typeof BuildSystem.initAdvancedSystem === 'function') {
               await BuildSystem.initAdvancedSystem();
             }
             if (typeof BuildSystem.startBuilding === 'function') {
               BuildSystem.startBuilding(item);
             } else {
               logger.error('❌ BuildSystem carregado mas startBuilding ausente');
               alert('Função de construção não disponível após carregamento.');
             }
          } else {
            logger.error('❌ BuildSystem não foi exportado corretamente do módulo');
            alert('Erro ao entrar no modo de construção. Verifique o console.');
          }
      } catch (error) {
          logger.error('❌ Falha crítica ao iniciar BuildSystem:', error);
          alert('Erro ao entrar no modo de construção. Verifique o console.');
      }
    };
    actionsDiv.appendChild(buildBtn);
  }

  // 3. CONSUMIR (Comidas)
  if (item.type === 'food' || item.type === 'consumable' || item.fillUp) {
    const useBtn = document.createElement('button');
    useBtn.className = 'btn-action btn-use';
    useBtn.innerHTML = '🍽️ Consumir';
    useBtn.onclick = () => {
      document.dispatchEvent(new CustomEvent('startConsumptionRequest', { 
        detail: { 
          category: activeCategory,
          itemId: item.id,
          quantity: 1,
          item: item,
          fillUp: item.fillUp 
        } 
      }));
    };
    actionsDiv.appendChild(useBtn);
  }

  // 4. DESCARTAR (Sempre disponível)
  const dropBtn = document.createElement('button');
  dropBtn.className = 'btn-action btn-discard';
  dropBtn.innerHTML = '🗑️ Descartar';
  dropBtn.onclick = () => {
    if (confirm(`Deseja descartar ${item.name}?`)) {
      const success = inventorySystem.removeItem(activeCategory, item.id, 1);
      if (success) {
        if (!inventorySystem.getItemQuantity(activeCategory, item.id)) {
          selectedSlotIndex = -1;
          updateDetailsPanel(null);
        }
        renderInventory();
      }
    }
  };
  actionsDiv.appendChild(dropBtn);
}

// Exportar funções de debug
window.debugInventory = () => {
  logger.debug('🔧 Debug Inventory UI:');
  logger.debug('- Shadow Root:', shadowRoot ? 'OK' : 'NULL');
  logger.debug('- Modal:', modalEl ? 'OK' : 'NULL');
  logger.debug('- Active Category:', activeCategory);
  logger.debug('- Items in category:', currentItems?.length || 0);

  if (modalEl) {
    modalEl.classList.toggle('open');
    logger.debug('Modal toggled:', modalEl.classList.contains('open'));
  }
};

// Auto-inicialização quando importado
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initInventoryUI();
  }, 1000);
}
