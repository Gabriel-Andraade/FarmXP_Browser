import { logger } from '../logger.js';
import { inventorySystem } from "./inventorySystem.js";
import { getItem } from "../itemUtils.js";
import { t } from '../i18n/i18n.js';
import { INVENTORY_CATEGORIES } from '../categoryMapper.js';
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

    .hidden {
      display: none !important;
    }

    .inv-tab-icon {
      font-size: 20px;
    }

    .inv-empty-subtext {
      font-size: 14px;
      opacity: 0.5;
    }

    
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

    /* Issue #166: slot do item equipado — borda verde + glow suave. Combina
       com selected (player pode estar olhando o item equipado). */
    .inv-slot-equipped {
      border-color: #b6f5b6;
      box-shadow: 0 0 12px rgba(182, 245, 182, 0.45), inset 0 0 12px rgba(182, 245, 182, 0.15);
    }
    .inv-slot-equipped:hover {
      border-color: #b6f5b6;
      box-shadow: 0 0 18px rgba(182, 245, 182, 0.7);
    }

    .inv-slot-equipped-badge {
      position: absolute;
      top: 4px;
      left: 4px;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #5a8a5a, #3e6b3e);
      border: 1px solid #b6f5b6;
      border-radius: 50%;
      color: #f5f5e9;
      font-size: 11px;
      font-weight: bold;
      line-height: 1;
      box-shadow: 0 1px 3px rgba(0,0,0,0.5);
      pointer-events: none;
      z-index: 2;
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

    /* Issue #170: technical info section between description and actions.
       Built dynamically per item by _renderItemTechSection — each row,
       bar, and badge is hidden when its data is absent. */
    .inv-item-tech {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(20, 14, 8, 0.55);
      border: 1px solid rgba(201, 164, 99, 0.25);
      border-radius: 10px;
    }
    .inv-item-tech:empty { display: none; }

    .inv-tech-title {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #c9a463;
      margin-bottom: 4px;
    }

    .inv-tech-row {
      display: flex;
      gap: 8px;
      font-size: 13px;
      align-items: baseline;
    }

    .inv-tech-label {
      color: #c9a463;
      font-weight: 600;
      min-width: 100px;
      flex-shrink: 0;
    }

    .inv-tech-value {
      color: #f5e9d3;
    }

    /* Fill-up bars (hunger / thirst / energy) */
    .inv-tech-fillup {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 2px;
    }
    .inv-tech-fillup-header {
      margin-bottom: 2px;
    }
    .inv-tech-bar {
      display: grid;
      grid-template-columns: 80px 1fr 50px;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .inv-tech-bar-label {
      color: #c9a463;
    }
    .inv-tech-bar-track {
      position: relative;
      height: 8px;
      background: rgba(0, 0, 0, 0.45);
      border-radius: 4px;
      overflow: hidden;
    }
    .inv-tech-bar-fill {
      display: block;
      height: 100%;
      transition: width 0.18s ease-out;
    }
    .inv-tech-bar-hunger .inv-tech-bar-fill { background: linear-gradient(90deg, #d9853d, #b06623); }
    .inv-tech-bar-thirst .inv-tech-bar-fill { background: linear-gradient(90deg, #4ec0e8, #2e8db8); }
    .inv-tech-bar-energy .inv-tech-bar-fill { background: linear-gradient(90deg, #f0c440, #c9982a); }
    .inv-tech-bar-value {
      color: #b6f5b6;
      font-weight: bold;
      text-align: right;
    }

    .inv-tech-experimental {
      margin-top: 6px;
      padding: 4px 8px;
      background: rgba(180, 100, 30, 0.18);
      border: 1px dashed rgba(220, 160, 80, 0.6);
      border-radius: 6px;
      color: #f0c060;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 0.3px;
      text-align: center;
    }

    .inv-tooltip {
      position: absolute;
      pointer-events: none;
      max-width: 280px;
      padding: 10px 12px;
      background: linear-gradient(135deg, rgba(43, 26, 12, 0.97), rgba(59, 38, 18, 0.95));
      border: 1px solid #8b5a2b;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
      color: #f5e9d3;
      font-size: 12px;
      z-index: 9999;
      transition: opacity 0.12s ease-out;
    }
    .inv-tooltip-name {
      font-size: 13px;
      font-weight: bold;
      color: #f5e9d3;
      margin-bottom: 3px;
    }
    .inv-tooltip-desc {
      font-size: 11px;
      color: #cfc1a3;
      line-height: 1.35;
      margin-bottom: 6px;
    }
    .inv-tooltip-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-top: 4px;
      border-top: 1px solid rgba(201, 164, 99, 0.25);
    }
    .inv-tooltip-row {
      display: flex;
      gap: 6px;
      font-size: 11px;
    }
    .inv-tooltip-row-label {
      color: #c9a463;
      font-weight: 600;
    }
    .inv-tooltip-row-value {
      color: #f5e9d3;
    }
    .inv-tooltip-experimental {
      margin-top: 6px;
      padding: 3px 6px;
      background: rgba(180, 100, 30, 0.18);
      border: 1px dashed rgba(220, 160, 80, 0.6);
      border-radius: 4px;
      color: #f0c060;
      font-size: 10px;
      font-weight: bold;
      text-align: center;
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

    /* Variante "Desequipar" — verde-acinzentado pra sinalizar "item ativo,
       clique pra remover". Cor diferente do Equipar (laranja) e do
       Discard (vermelho) pra não confundir as ações. */
    .btn-equip.is-equipped {
      background: linear-gradient(135deg, #5a8a5a, #3e6b3e);
      border: 1px solid #b6f5b6;
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

  // Aplicar CSS ao Shadow DOM via adoptedStyleSheets
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  shadow.adoptedStyleSheets = [sheet];

  // fix: innerHTML → DOM API (estrutura via createElement)
  const overlay = document.createElement('div');
  overlay.className = 'inv-overlay';
  overlay.id = 'inventoryModal';

  const container = document.createElement('div');
  container.className = 'inv-container';

  const headerDiv = document.createElement('div');
  headerDiv.className = 'inv-header';
  const titleSpan = document.createElement('span');
  titleSpan.className = 'inv-title';
  titleSpan.textContent = `🎒 ${t('inventory.title')}`;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'inv-close';
  closeBtn.id = 'closeInvBtn';
  closeBtn.textContent = '\u00D7';
  headerDiv.append(titleSpan, closeBtn);

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'inv-body';
  const tabs = document.createElement('div');
  tabs.className = 'inv-tabs';
  tabs.id = 'invTabs';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'inv-content';
  const grid = document.createElement('div');
  grid.className = 'inv-grid';
  grid.id = 'invGrid';

  const details = document.createElement('div');
  details.className = 'inv-details';
  details.id = 'invDetails';
  details.classList.add('hidden');
  const itemInfo = document.createElement('div');
  itemInfo.className = 'inv-item-info';
  const detailName = document.createElement('span');
  detailName.className = 'inv-item-name';
  detailName.id = 'detailName';
  detailName.textContent = t('inventory.selectItem');
  const detailDesc = document.createElement('span');
  detailDesc.className = 'inv-item-desc';
  detailDesc.id = 'detailDesc';
  itemInfo.append(detailName, detailDesc);
  // Issue #170: technical info section (type, fillUp bars, toolType,
  // medicine cure mode, etc.). Populated dynamically by updateDetailsPanel
  // based on which fields exist on the selected item.
  const detailTech = document.createElement('div');
  detailTech.className = 'inv-item-tech';
  detailTech.id = 'detailTech';
  const detailActions = document.createElement('div');
  detailActions.className = 'inv-actions';
  detailActions.id = 'detailActions';
  details.append(itemInfo, detailTech, detailActions);

  contentDiv.append(grid, details);

  const tooltip = document.createElement('div');
  tooltip.className = 'inv-tooltip hidden';
  tooltip.id = 'invTooltip';
  contentDiv.appendChild(tooltip);

  bodyDiv.append(tabs, contentDiv);
  container.append(headerDiv, bodyDiv);
  overlay.appendChild(container);
  shadow.appendChild(overlay);

  return shadow;
};

// Variáveis de estado
let shadowRoot;
let inventoryAbortController;
let activeCategory = 'resources';
let selectedSlotIndex = -1;
let currentItems = [];

/**
 * Obtém nome traduzido do item pelo ID
 * @param {number} itemId - ID do item
 * @param {string} fallbackName - Nome padrão se tradução não existir
 * @returns {string} Nome traduzido
 */
function getItemName(itemId, fallbackName = '') {
  const translatedName = t(`itemNames.${itemId}`);
  if (translatedName === `itemNames.${itemId}`) {
    return fallbackName;
  }
  return translatedName || fallbackName;
}

// Mapeamento de Categorias (agora importado de categoryMapper.js)
const CATEGORY_MAP = INVENTORY_CATEGORIES;

// Cache de elementos DOM
let modalEl, contentEl, tabsEl, detailsEl;

/**
 * Inicializa o inventário (idempotente). Cria o host com Shadow DOM,
 * cacheia refs de elementos, registra listeners de eventos do jogo
 * (`inventoryUpdated`, `itemEquipped`, `itemUnequipped`, `languageChanged`),
 * e expõe `window.openInventory` / `closeInventory` pra debug.
 *
 * Sai cedo se o host já existe (chamada duplicada).
 *
 * @returns {void}
 */
export function initInventoryUI() {
  if (document.getElementById('inventory-ui-host')) return;

  // Criar AbortController para cleanup de listeners
  inventoryAbortController = new AbortController();
  const { signal } = inventoryAbortController;

  // Criar interface com Shadow DOM
  shadowRoot = createInventoryUI();

  // Bind dos elementos
  modalEl = shadowRoot.getElementById('inventoryModal');
  contentEl = shadowRoot.getElementById('invGrid');
  tabsEl = shadowRoot.getElementById('invTabs');
  detailsEl = shadowRoot.getElementById('invDetails');

  // Event Listeners com signal para cleanup automático
  shadowRoot.getElementById('closeInvBtn').addEventListener('click', closeInventoryModal, { signal });

  // Fechar ao clicar fora
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeInventoryModal();
  }, { signal });

  // Atualizar UI quando inventário muda
  document.addEventListener('inventoryUpdated', () => {
    if (modalEl.classList.contains('open')) {
      renderInventory();
    }
  }, { signal });

  // Quando estado de equipar muda externamente (ex: Q-wheel), refresca
  // o painel de detalhes pra alternar Equipar ↔ Desequipar no botão.
  const refreshDetailsOnEquipChange = () => {
    if (!modalEl.classList.contains('open')) return;
    if (selectedSlotIndex < 0 || !currentItems[selectedSlotIndex]) return;
    const fullItem = getItem(currentItems[selectedSlotIndex].id);
    if (fullItem) updateDetailsPanel(fullItem, currentItems[selectedSlotIndex].quantity);
  };
  document.addEventListener('itemEquipped',   refreshDetailsOnEquipChange, { signal });
  document.addEventListener('itemUnequipped', refreshDetailsOnEquipChange, { signal });

  // Listener para mudança de idioma - re-renderiza UI com novo idioma
  document.addEventListener('languageChanged', () => {
    if (shadowRoot && modalEl) {
      renderTabs();
      renderInventory();
    }
  }, { signal });

  // Expor globalmente
  window.openInventory = openInventoryModal;
  window.closeInventory = closeInventoryModal;
  window.destroyInventoryUI = destroyInventoryUI;

  logger.info('✅ Inventory UI (Shadow DOM) Carregada');
}

/**
 * Checa se o foco está num INPUT ou TEXTAREA — usado pra suprimir
 * atalhos globais (I, ESC etc.) enquanto o player digita em campo.
 *
 * @returns {boolean}
 */
function isInputActive() {
  const active = document.activeElement;
  return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
}

/**
 * Abre o modal do inventário. Renderiza tabs + grade, marca o modal como
 * `.open`, desabilita o input do player e foca o botão de fechar pra
 * permitir teclado-only.
 *
 * @returns {void}
 */
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

/**
 * Fecha o modal do inventário. Limpa a seleção, esconde o painel de
 * detalhes e devolve o input pro player.
 *
 * @returns {void}
 */
export function closeInventoryModal() {
  if (modalEl) {
    modalEl.classList.remove('open');
  }
  _hideTooltip();
  selectedSlotIndex = -1;
  updateDetailsPanel(null);

  // Reabilitar input do jogador
  const playerSystem = getSystem('player');
  if (playerSystem) {
    playerSystem.inputDisabled = false;
  }
}

/**
 * Pinta os botões de categoria (ferramentas, sementes, comida etc.) em
 * `tabsEl`. Click muda `activeCategory` e dispara `renderInventory`.
 *
 * @returns {void}
 */
function renderTabs() {
  if (!tabsEl) return;
  
  // fix: innerHTML → DOM API
  tabsEl.replaceChildren();
  const categories = Object.keys(inventorySystem.categories || {});

  categories.forEach(catKey => {
    const catData = CATEGORY_MAP[catKey] || { label: () => catKey, icon: '📦' };
    const btn = document.createElement('button');
    btn.className = `inv-tab-btn ${activeCategory === catKey ? 'active' : ''}`;
    const iconSpan = document.createElement('span');
    iconSpan.className = 'inv-tab-icon';
    iconSpan.textContent = catData.icon;
    btn.append(iconSpan, ` ${catData.label()}`);
    
    btn.addEventListener('click', () => {
      activeCategory = catKey;
      selectedSlotIndex = -1;
      updateDetailsPanel(null);
      renderInventory();
      // Atualizar tabs visualmente
      shadowRoot.querySelectorAll('.inv-tab-btn').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
    });
    
    tabsEl.appendChild(btn);
  });
}

/**
 * Pinta a grade de slots da categoria ativa em `contentEl`. Lê os items
 * de `inventorySystem.categories[activeCategory]` e cria um `.inv-slot`
 * por item.
 *
 * Issue #166: cada slot do item atualmente equipado (igualdade por id)
 * ganha a classe `inv-slot-equipped` + badge "E". O id equipado é lido
 * uma única vez fora do loop pra não chamar `getSystem` por slot.
 *
 * Re-renderiza automaticamente nos eventos `inventoryUpdated`,
 * `itemEquipped` e `itemUnequipped` (registrados em `initInventoryUI`).
 *
 * @returns {void}
 */
function renderInventory() {
  if (!contentEl) return;

  _hideTooltip();
  // fix: innerHTML → DOM API
  contentEl.replaceChildren();

  const categoryData = inventorySystem.categories?.[activeCategory];

  if (!categoryData?.items || categoryData.items.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'inv-empty-msg';
    const mainText = document.createElement('div');
    mainText.textContent = t('inventory.empty');
    const subText = document.createElement('div');
    subText.className = 'inv-empty-subtext';
    subText.textContent = t('inventory.emptySubtext');
    emptyMsg.append(mainText, subText);
    contentEl.appendChild(emptyMsg);
    currentItems = [];
    detailsEl.classList.add('hidden');
    return;
  }

  currentItems = categoryData.items;

  // Pega o id equipado UMA vez fora do loop pra não chamar getSystem por slot.
  // Issue #166: slot do item equipado ganha borda verde + badge "E" pra
  // feedback visual (complementa o badge "Equipado:" no HUD).
  const equippedId = getSystem('player')?.getEquippedItem()?.id;

  currentItems.forEach((slot, index) => {
    const fullItem = getItem(slot.id);
    if (!fullItem) return;

    const itemQuantity = slot.quantity || slot.qty || 1;
    const isEquipped = equippedId === slot.id;
    const slotEl = document.createElement('div');
    slotEl.className = `inv-slot ${selectedSlotIndex === index ? 'selected' : ''}${isEquipped ? ' inv-slot-equipped' : ''}`;
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

    // Badge "E" no canto pra slot do item equipado. CSS posiciona absoluto.
    if (isEquipped) {
      const eqBadge = document.createElement('span');
      eqBadge.className = 'inv-slot-equipped-badge';
      eqBadge.textContent = 'E';
      eqBadge.setAttribute('aria-label', t('inventory.actions.equip'));
      slotEl.appendChild(eqBadge);
    }

    slotEl.addEventListener('click', () => {
      const prevSelected = shadowRoot.querySelector('.inv-slot.selected');
      if (prevSelected) prevSelected.classList.remove('selected');

      slotEl.classList.add('selected');
      selectedSlotIndex = index;
      updateDetailsPanel(fullItem, itemQuantity);
    });

    slotEl.addEventListener('mouseenter', (e) => _showTooltip(fullItem, itemQuantity, e));
    slotEl.addEventListener('mousemove', _positionTooltip);
    slotEl.addEventListener('mouseleave', _hideTooltip);

    contentEl.appendChild(slotEl);
  });
  
  // Se tinha um item selecionado anteriormente, restaurar seleção
  if (selectedSlotIndex >= 0 && currentItems[selectedSlotIndex]) {
    const slotToSelect = shadowRoot.querySelector(`.inv-slot[data-index="${selectedSlotIndex}"]`);
    if (slotToSelect) {
      slotToSelect.classList.add('selected');
      const fullItem = getItem(currentItems[selectedSlotIndex].id);
      if (fullItem) {
        updateDetailsPanel(fullItem, currentItems[selectedSlotIndex].quantity);
      }
    }
  }
}

// Slim hover tooltip — name + description + a few key tech rows. Reuses
// the same i18n keys as the side panel.
function _showTooltip(item, qty, evt) {
  if (!item) return;
  const tip = shadowRoot.getElementById('invTooltip');
  if (!tip) return;

  tip.replaceChildren();

  const name = document.createElement('div');
  name.className = 'inv-tooltip-name';
  name.textContent = `${getItemName(item.id, item.name)}${qty > 1 ? ` (x${qty})` : ''}`;
  tip.appendChild(name);

  if (item.description) {
    const desc = document.createElement('div');
    desc.className = 'inv-tooltip-desc';
    desc.textContent = item.description;
    tip.appendChild(desc);
  }

  const rows = [];
  const typeLabel = t(`inventory.details.types.${item.type}`);
  if (!typeLabel.startsWith('inventory.')) rows.push([t('inventory.details.type'), typeLabel]);

  if (item.toolType) {
    const tl = t(`controls.toolTypes.${item.toolType}`);
    if (!tl.startsWith('controls.')) rows.push([t('inventory.details.toolType'), tl]);
  }
  if (item.fillUp) {
    const parts = [];
    for (const stat of ['hunger', 'thirst', 'energy']) {
      const v = Number(item.fillUp[stat]) || 0;
      if (v > 0) parts.push(`${t(`inventory.details.${stat}`)} +${v}`);
    }
    if (parts.length) rows.push([t('inventory.details.restores'), parts.join(' · ')]);
  }
  if (item.foodValue != null) rows.push([t('inventory.details.foodValue'), String(item.foodValue)]);

  if (rows.length) {
    const meta = document.createElement('div');
    meta.className = 'inv-tooltip-meta';
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'inv-tooltip-row';
      const l = document.createElement('span');
      l.className = 'inv-tooltip-row-label';
      l.textContent = `${label}:`;
      const v = document.createElement('span');
      v.className = 'inv-tooltip-row-value';
      v.textContent = value;
      row.append(l, v);
      meta.appendChild(row);
    }
    tip.appendChild(meta);
  }

  if (item.experimental) {
    const exp = document.createElement('div');
    exp.className = 'inv-tooltip-experimental';
    exp.textContent = `⚠ ${t('inventory.details.experimental')}`;
    tip.appendChild(exp);
  }

  tip.classList.remove('hidden');
  _positionTooltip(evt);
}

function _positionTooltip(evt) {
  const tip = shadowRoot.getElementById('invTooltip');
  if (!tip || tip.classList.contains('hidden')) return;
  const parent = tip.offsetParent || tip.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  tip.style.left = `${evt.clientX - rect.left + 14}px`;
  tip.style.top = `${evt.clientY - rect.top + 14}px`;
}

function _hideTooltip() {
  const tip = shadowRoot.getElementById('invTooltip');
  if (tip) tip.classList.add('hidden');
}

/**
 * Renders the "Technical info" section of the details panel based on which
 * fields exist on the selected item. Each block is gated by an `if` so an
 * item only shows the rows it actually has data for.
 *
 * Sections (in order):
 *   1. Type (always)
 *   2. Tool type (if `item.toolType`)
 *   3. Fill-up bars (if `item.fillUp` — food/water)
 *   4. Animal food details (if `type === 'animal_food'`)
 *   5. Medicine details (if `type === 'medicine'`)
 *   6. Placeable size (if `item.placeable` with buildWidth/Height)
 *   7. Experimental badge (if `item.experimental`)
 *
 * Issue #170.
 *
 * @param {HTMLElement} container - The `#detailTech` element to populate.
 * @param {object} item - The full item object (from `items.js`).
 * @returns {void}
 */
function _renderItemTechSection(container, item) {
  container.replaceChildren();
  if (!item) return;

  // Section title
  const title = document.createElement('div');
  title.className = 'inv-tech-title';
  title.textContent = t('inventory.details.sectionTitle');
  container.appendChild(title);

  const addRow = (labelKey, valueText) => {
    if (valueText === '' || valueText == null) return;
    const row = document.createElement('div');
    row.className = 'inv-tech-row';
    const label = document.createElement('span');
    label.className = 'inv-tech-label';
    label.textContent = `${t(labelKey)}:`;
    const value = document.createElement('span');
    value.className = 'inv-tech-value';
    value.textContent = valueText;
    row.append(label, value);
    container.appendChild(row);
  };

  // 1. Type — always shown
  const typeLabel = t(`inventory.details.types.${item.type}`);
  // i18n fallback: if the type key is missing, fall back to the raw type.
  addRow('inventory.details.type', typeLabel.startsWith('inventory.') ? item.type : typeLabel);

  // 2. Tool type
  if (item.toolType) {
    const toolLabel = t(`controls.toolTypes.${item.toolType}`);
    addRow('inventory.details.toolType', toolLabel.startsWith('controls.') ? item.toolType : toolLabel);
  }

  // 3. Fill-up bars (food/consumable)
  if (item.fillUp) {
    const bars = document.createElement('div');
    bars.className = 'inv-tech-fillup';
    const restoresLabel = document.createElement('div');
    restoresLabel.className = 'inv-tech-label inv-tech-fillup-header';
    restoresLabel.textContent = `${t('inventory.details.restores')}:`;
    bars.appendChild(restoresLabel);
    for (const stat of ['hunger', 'thirst', 'energy']) {
      const v = Number(item.fillUp[stat]) || 0;
      if (v <= 0) continue;
      const barWrap = document.createElement('div');
      barWrap.className = `inv-tech-bar inv-tech-bar-${stat}`;
      const barLabel = document.createElement('span');
      barLabel.className = 'inv-tech-bar-label';
      barLabel.textContent = t(`inventory.details.${stat}`);
      const barTrack = document.createElement('span');
      barTrack.className = 'inv-tech-bar-track';
      const barFill = document.createElement('span');
      barFill.className = 'inv-tech-bar-fill';
      barFill.style.width = `${Math.min(100, v)}%`;
      barTrack.appendChild(barFill);
      const barValue = document.createElement('span');
      barValue.className = 'inv-tech-bar-value';
      barValue.textContent = `+${v}`;
      barWrap.append(barLabel, barTrack, barValue);
      bars.appendChild(barWrap);
    }
    container.appendChild(bars);
  }

  // 4. Animal food
  if (item.type === 'animal_food') {
    if (item.foodValue != null) {
      addRow('inventory.details.foodValue', String(item.foodValue));
    }
    if (item.targetAnimals && item.targetAnimals !== 'all' && Array.isArray(item.targetAnimals) && item.targetAnimals.length) {
      const names = item.targetAnimals.map((asset) => {
        const key = `animals.${asset.toLowerCase()}`;
        const tr = t(key);
        return tr.startsWith('animals.') ? asset : tr;
      });
      addRow('inventory.details.acceptedBy', names.join(', '));
    } else if (item.targetAnimals === 'all') {
      addRow('inventory.details.acceptedBy', '★');
    }
  }

  // 5. Medicine
  if (item.type === 'medicine') {
    if (item.targetDisease) {
      const dk = `inventory.details.diseases.${item.targetDisease}`;
      const dt = t(dk);
      addRow('inventory.details.treats', dt.startsWith('inventory.') ? item.targetDisease : dt);
    }
    if (item.cureMode === 'instant') {
      addRow('inventory.details.cureMode', t('inventory.details.instant'));
    } else if (item.cureMode === 'gradual' && item.daysToCure) {
      addRow('inventory.details.cureMode', t('inventory.details.gradual').replace('{n}', item.daysToCure));
    }
    if (item.dosesPerDay) {
      addRow('inventory.details.dosesPerDay', String(item.dosesPerDay));
    }
    if (item.palatability) {
      const pk = `inventory.details.${item.palatability}`;
      const pt = t(pk);
      addRow('inventory.details.palatability', pt.startsWith('inventory.') ? item.palatability : pt);
    }
  }

  // 6. Placeable size
  if (item.placeable && item.buildWidth && item.buildHeight) {
    addRow('inventory.details.size', `${item.buildWidth} × ${item.buildHeight}`);
  }

  // 7. Experimental badge — show at the end
  if (item.experimental) {
    const badge = document.createElement('div');
    badge.className = 'inv-tech-experimental';
    badge.textContent = `⚠ ${t('inventory.details.experimental')}`;
    container.appendChild(badge);
  }
}

/**
 * Atualiza o painel lateral de detalhes do item selecionado (nome,
 * descrição, botões de ação).
 *
 * Issue #166: o botão de ferramenta alterna entre "Equipar" (laranja)
 * e "Desequipar" (verde) baseado em `playerSystem.getEquippedItem()`.
 * Click em Equipar dispara `equipItemRequest`; click em Desequipar
 * dispara `unequipItemRequest`. Em ambos os casos o inventário fecha.
 *
 * Issue #170: also renders the technical info section via
 * `_renderItemTechSection` based on item fields (type, fillUp, etc.).
 *
 * Se `item` for null/undefined, esconde o painel (`.hidden`) e retorna.
 *
 * @param {object|null} item - Item completo (do `items.js`) ou null pra esconder.
 * @param {number} [qty] - Quantidade pra mostrar no nome (ex: "Machado (x3)").
 * @returns {void}
 */
function updateDetailsPanel(item, qty) {
  if (!detailsEl) return;

  if (!item) {
    detailsEl.classList.add('hidden');
    return;
  }

  detailsEl.classList.remove('hidden');
  const itemName = getItemName(item.id, item.name);
  shadowRoot.getElementById('detailName').textContent = `${itemName} ${qty > 1 ? `(x${qty})` : ''}`;
  shadowRoot.getElementById('detailDesc').textContent = item.description || t('inventory.noDescription');

  // Issue #170: technical info section (dynamic per-field).
  const techDiv = shadowRoot.getElementById('detailTech');
  if (techDiv) _renderItemTechSection(techDiv, item);

  const actionsDiv = shadowRoot.getElementById('detailActions');
  // fix: innerHTML → DOM API
  actionsDiv.replaceChildren();

  // 1. EQUIPAR (Ferramentas) ou LER (Contrato)
  if (item.questItem && item.id === 100) {
    const readBtn = document.createElement('button');
    readBtn.className = 'btn-action btn-equip';
    readBtn.textContent = `📜 ${t('inventory.actions.use')}`;
    readBtn.onclick = () => showContractPanel();
    actionsDiv.appendChild(readBtn);
  } else if (item.type === 'tool') {
    // Issue #166: botão alterna entre Equipar / Desequipar conforme estado
    // atual. playerSystem.equipItem(sameItem) já tem toggle nativo, mas o
    // botão explícito dá feedback visual imediato sem o player precisar
    // adivinhar que clicar de novo desequipa.
    const equipped = getSystem('player')?.getEquippedItem();
    const isEquipped = equipped && equipped.id === item.id;

    const equipBtn = document.createElement('button');
    equipBtn.className = `btn-action btn-equip${isEquipped ? ' is-equipped' : ''}`;
    equipBtn.textContent = isEquipped
      ? `🔓 ${t('inventory.actions.unequip')}`
      : `🛠️ ${t('inventory.actions.equip')}`;
    equipBtn.addEventListener('click', () => {
      if (isEquipped) {
        document.dispatchEvent(new Event('unequipItemRequest'));
      } else {
        document.dispatchEvent(new CustomEvent('equipItemRequest', { detail: { item } }));
      }
      closeInventoryModal();
    });
    actionsDiv.appendChild(equipBtn);
  }

  // 2. CONSTRUIR (Placeables/Structures)
  if (['placeable', 'structure', 'construction'].includes(item.type)) {
    const buildBtn = document.createElement('button');
    buildBtn.className = 'btn-action btn-build';
    buildBtn.textContent = `🔨 ${t('inventory.actions.build')}`;
    buildBtn.addEventListener('click', async () => {
      logger.debug(`🔨 Iniciando construção: ${item.name}`);
      closeInventoryModal();

      // chestSystem loads lazily on first chest interaction in the world. If
      // the player crafts and tries to place one before ever interacting with
      // an existing chest, getSystem('chest') is null at placeObject() time
      // and the build bails silently. Pre-load here. wellSystem is already
      // statically imported by buildSystem.js, no pre-load needed.
      if (item.id === 69) {
        try { await import('../chestSystem.js'); } catch (e) { logger.warn('chestSystem preload failed', e); }
      }

      let BuildSystem = getSystem('build');

      if (BuildSystem) {
          try {
            if (typeof BuildSystem.initAdvancedSystem === 'function') {
              await BuildSystem.initAdvancedSystem();
            }
            if (typeof BuildSystem.startBuilding === 'function') {
              BuildSystem.startBuilding(item);
            } else {
              logger.error('❌ window.BuildSystem.startBuilding não disponível');
              alert(t('build.notAvailable'));
            }
          } catch (err) {
            logger.error('❌ Erro ao usar window.BuildSystem:', err);
            alert(t('build.buildError'));
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
               alert(t('build.notAvailableAfter'));
             }
          } else {
            logger.error('❌ BuildSystem não foi exportado corretamente do módulo');
            alert(t('build.buildError'));
          }
      } catch (error) {
          logger.error('❌ Falha crítica ao iniciar BuildSystem:', error);
          alert(t('build.buildError'));
      }
    });
    actionsDiv.appendChild(buildBtn);
  }

  // 3. CONSUMIR (Comidas)
  if (item.type === 'food' || item.type === 'consumable' || item.fillUp) {
    const useBtn = document.createElement('button');
    useBtn.className = 'btn-action btn-use';
    useBtn.textContent = `🍽️ ${t('inventory.actions.consume')}`;
    useBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('startConsumptionRequest', {
        detail: {
          category: activeCategory,
          itemId: item.id,
          quantity: 1,
          item: item,
          fillUp: item.fillUp
        }
      }));
    });
    actionsDiv.appendChild(useBtn);
  }

  // 4. DESCARTAR (não disponível para quest items)
  if (!item.questItem) {
    const dropBtn = document.createElement('button');
    dropBtn.className = 'btn-action btn-discard';
    dropBtn.textContent = `🗑️ ${t('inventory.actions.discard')}`;
    dropBtn.onclick = () => {
      if (confirm(t('inventory.confirmDiscard', { name: getItemName(item.id, item.name) }))) {
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
}

/**
 * Limpa todos os event listeners e recursos do Inventory UI
 * Remove todos os listeners registrados via AbortController
 * @returns {void}
 */
// ─── Contract Panel ────────────────────────────────────────────────────────

/**
 * Mostra o painel especial do contrato do Bartolomeu (item de quest
 * com id 100). Fecha o inventário primeiro e exibe o texto do contrato
 * em uma modal própria.
 *
 * @returns {void}
 */
function showContractPanel() {
  // Close inventory first
  closeInventoryModal();

  // closeInventoryModal re-liga o input do jogador; como o contract é modal
  // full-screen, precisamos bloquear de novo até o overlay fechar — senão
  // o jogador continua se movendo por baixo da carta.
  const playerSystem = getSystem('player');
  if (playerSystem) playerSystem.inputDisabled = true;
  const restoreInput = () => {
    if (playerSystem) playerSystem.inputDisabled = false;
  };

  // Remove existing panel if any
  const existing = document.getElementById('contract-panel-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'contract-panel-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10001;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(3px);
    opacity: 0; transition: opacity 0.3s ease;
  `;

  const paper = document.createElement('div');
  paper.style.cssText = `
    background: #faf3e0;
    border-radius: 6px;
    padding: 36px 40px;
    max-width: 520px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(180,160,120,0.3);
    position: relative;
  `;

  const title = document.createElement('h2');
  title.textContent = t('npc.bartolomeu.tax.contractTitle');
  title.style.cssText = `
    font-family: sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: #3a2a1f;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid #c7a252;
    text-align: center;
  `;

  const body = document.createElement('p');
  body.textContent = t('npc.bartolomeu.tax.contractDescription');
  body.style.cssText = `
    font-family: sans-serif;
    font-size: 1rem;
    line-height: 1.6;
    color: #4a3a2a;
    margin-bottom: 20px;
  `;

  const taxInfo = document.createElement('p');
  taxInfo.textContent = t('npc.bartolomeu.tax.noteDescription', { value: 20 });
  taxInfo.style.cssText = `
    font-family: sans-serif;
    font-size: 0.92rem;
    line-height: 1.5;
    color: #6a5a4a;
    background: rgba(0,0,0,0.05);
    padding: 10px 14px;
    border-radius: 6px;
    border-left: 3px solid #c7a252;
    margin-bottom: 24px;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = t('ui.close');
  closeBtn.style.cssText = `
    display: block;
    margin: 0 auto;
    padding: 8px 28px;
    background: #3a2a1f;
    color: #faf3e0;
    border: none;
    border-radius: 8px;
    font-family: sans-serif;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.2s;
  `;
  closeBtn.onmouseenter = () => { closeBtn.style.background = '#5a4a3f'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = '#3a2a1f'; };
  closeBtn.onclick = () => {
    overlay.style.opacity = '0';
    // Restaura o input antes de remover o nó (evita janela em que o overlay
    // já saiu mas o input continuaria bloqueado por mais 300ms).
    restoreInput();
    setTimeout(() => overlay.remove(), 300);
  };

  paper.append(title, body, taxInfo, closeBtn);
  overlay.appendChild(paper);
  document.body.appendChild(overlay);

  // Also close on overlay click (outside paper)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBtn.click();
  });

  // Fade in
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });
}

/**
 * Cleanup completo do inventário: aborta todos os listeners via
 * `AbortController`, remove o host do DOM, libera refs cacheadas e
 * deletes os globals expostos em `window`. Usado por testes / hot
 * reload pra evitar leaks entre runs.
 *
 * @returns {void}
 */
export function destroyInventoryUI() {
  // Remove todos os event listeners via AbortController
  if (inventoryAbortController) {
    inventoryAbortController.abort();
    inventoryAbortController = null;
  }

  // Re-habilitar input do jogador se o modal estava aberto
  if (modalEl && modalEl.classList.contains('open')) {
    closeInventoryModal();
  }

  // Limpar elementos DOM
  const host = document.getElementById('inventory-ui-host');
  if (host) {
    host.remove();
  }

  // Reset variáveis
  shadowRoot = null;
  modalEl = null;
  contentEl = null;
  tabsEl = null;
  detailsEl = null;
  selectedSlotIndex = -1;
  currentItems = [];

  // Limpar funções globais
  delete window.openInventory;
  delete window.closeInventory;
  delete window.destroyInventoryUI;

  logger.info('Inventory UI destruído e listeners limpos');
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
