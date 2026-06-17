/**
 * @file recipes.js - Definições de receitas de crafting
 * @description Contém todas as receitas de crafting disponíveis no jogo.
 * Cada receita define os materiais necessários, o resultado produzido,
 * tempo de craft, categoria e ícone visual.
 * @module Recipes
 */

/**
 * Array de receitas de crafting do jogo
 * Organizado em categorias: material, tools, construction, food, animal_food
 * @constant {Array<Object>}
 * @property {string} id - Identificador único da receita
 * @property {string} name - Nome exibido da receita
 * @property {Array<Object>} requiredItems - Itens necessários [{itemId, qty}]
 * @property {Object} result - Item produzido {itemId, qty}
 * @property {string} category - Categoria da receita
 * @property {number} craftTime - Tempo de crafting em segundos
 * @property {string} icon - Emoji/ícone da receita
 */
export const recipes = [
    // Issue #165: compact raw harvested hay into animal feed (Feno, id 29).
    {
        id: "compact_hay",
        name: "Compactar Feno",
        requiredItems: [{ itemId: 109, qty: 3 }],
        result: { itemId: 29, qty: 1 },
        category: "animal_food",
        craftTime: 2,
        icon: "",
    },
    // Issue #165: shred harvested hay into stolons/rhizomes (hay seed, id 107)
    // for replanting. 1 harvested hay → 3 seeds.
    {
        id: "shred_hay",
        name: "Despedaçar Feno (Estolões)",
        requiredItems: [{ itemId: 109, qty: 1 }],
        result: { itemId: 107, qty: 3 },
        category: "material",
        craftTime: 2,
        icon: "",
    },
    // Issue #165: compact harvested weed (matinho, 115) into animal feed,
    // same role as compacted hay (→ Feno, 29).
    {
        id: "compact_grass",
        name: "Compactar Matinho",
        requiredItems: [{ itemId: 115, qty: 3 }],
        result: { itemId: 29, qty: 1 },
        category: "animal_food",
        craftTime: 2,
        icon: "",
    },

    /* materiais básicos e processamento */
    {
        id: "wood_scrap",
        name: "Lasca de Madeira (Lenha)",
        requiredItems: [{ itemId: 9, qty: 1 }],
        result: { itemId: 57, qty: 3 },
        category: "material",
        craftTime: 1,
        icon: ""
    },
    {
        id: "wood_plank",
        name: "Tábua de Madeira",
        requiredItems: [{ itemId: 9, qty: 1 }],
        result: { itemId: 58, qty: 2 },
        category: "material",
        craftTime: 3,
        icon: ""
    },
    {
        id: "wooden_rod",
        name: "Haste de Madeira",
        requiredItems: [{ itemId: 58, qty: 1 }],
        result: { itemId: 76, qty: 2 },
        category: "material",
        craftTime: 2,
        icon: ""
    },
    {
        id: "rope",
        name: "Corda Simples",
        requiredItems: [{ itemId: 54, qty: 4 }],
        result: { itemId: 35, qty: 1 },
        category: "material",
        craftTime: 2,
        icon: ""
    },
    {
        id: "charcoal",
        name: "Carvão",
        requiredItems: [{ itemId: 57, qty: 3 }],
        result: { itemId: 56, qty: 1 },
        category: "material",
        craftTime: 5,
        icon: ""
    },
    {
        id: "iron_bar",
        name: "Barra de Ferro",
        requiredItems: [
            { itemId: 37, qty: 2 },
            { itemId: 56, qty: 1 }
        ],
        result: { itemId: 73, qty: 1 },
        category: "material",
        craftTime: 15,
        icon: ""
    },
    {
        id: "nail",
        name: "Prego",
        requiredItems: [{ itemId: 37, qty: 1 }],
        result: { itemId: 34, qty: 5 },
        category: "material",
        craftTime: 5,
        icon: ""
    },
    {
        id: "clay_brick",
        name: "Tijolo de Argila",
        requiredItems: [
            { itemId: 55, qty: 2 },
            { itemId: 57, qty: 1 }
        ],
        result: { itemId: 32, qty: 1 },
        category: "material",
        craftTime: 10,
        icon: ""
    },
    {
        id: "wool_fabric",
        name: "Tecido de Lã",
        requiredItems: [{ itemId: 62, qty: 3 }],
        result: { itemId: 49, qty: 1 },
        category: "material",
        craftTime: 15,
        icon: ""
    },

    /* Tools
       Issue #170: Wooden Rod (76) was produced via `wooden_rod` but never
       consumed — orphan output. Reused here as a tool handle. Since 1×
       Plank yields 2× Rod, swapping plank for rod is balance-neutral but
       closes the loop and reads better thematically (tool needs a handle). */
    {
        id: "axe",
        name: "Machado",
        requiredItems: [
            { itemId: 76, qty: 1 },  // Wooden Rod (handle)
            { itemId: 58, qty: 1 },  // Wooden Plank (structure)
            { itemId: 37, qty: 3 },
            { itemId: 35, qty: 1 }
        ],
        result: { itemId: 14, qty: 1 },
        category: "tools",
        craftTime: 10,
        icon: ""
    },
    {
        id: "pickaxe",
        name: "Picareta",
        requiredItems: [
            { itemId: 76, qty: 1 },  // Wooden Rod (handle)
            { itemId: 58, qty: 1 },  // Wooden Plank (structure)
            { itemId: 37, qty: 4 },
            { itemId: 35, qty: 1 }
        ],
        result: { itemId: 13, qty: 1 },
        category: "tools",
        craftTime: 10,
        icon: ""
    },
    {
        id: "hoe",
        name: "Enxada",
        requiredItems: [
            { itemId: 76, qty: 1 },  // Wooden Rod (handle)
            { itemId: 58, qty: 1 },  // Wooden Plank (structure)
            { itemId: 37, qty: 2 },
            { itemId: 35, qty: 1 }
        ],
        result: { itemId: 1, qty: 1 },
        category: "tools",
        craftTime: 10,
        icon: ""
    },
    {
        id: "scythe",
        name: "Foice",
        requiredItems: [
            { itemId: 76, qty: 1 },  // Wooden Rod (handle only — scythe has no plank body)
            { itemId: 37, qty: 2 },
            { itemId: 35, qty: 1 }
        ],
        result: { itemId: 11, qty: 1 },
        category: "tools",
        craftTime: 8,
        icon: ""
    },

    /* construção e estruturas */
    {
        id: "wooden_fence",
        name: "Cerca de Madeira",
        requiredItems: [
            { itemId: 58, qty: 4 },
            { itemId: 34, qty: 2 }
        ],
        result: { itemId: 43, qty: 1 },
        category: "construction",
        craftTime: 5,
        icon: ""
    },
    {
        id: "storage_chest",
        name: "Baú de Armazenamento",
        requiredItems: [
            { itemId: 58, qty: 8 },
            { itemId: 34, qty: 4 },
            { itemId: 35, qty: 1 },
            // Issue #170: Fabric (49) was produced via `wool_fabric` but
            // never consumed. Added here as interior lining — pure flavor,
            // doesn't change gameplay, just closes the loop.
            { itemId: 49, qty: 1 }
        ],
        result: { itemId: 69, qty: 1 },
        category: "construction",
        craftTime: 15,
        icon: ""
    },
    {
        id: "well",
        name: "Poço de Água",
        requiredItems: [
            { itemId: 10, qty: 15 },
            { itemId: 32, qty: 10 },
            { itemId: 73, qty: 2 },
            { itemId: 35, qty: 2 },
            { itemId: 16, qty: 1 }
        ],
        result: { itemId: 93, qty: 1 },
        category: "construction",
        craftTime: 30,
        icon: ""
    },
    {
        id: "water_trough",
        name: "Cocho de Água",
        requiredItems: [
            { itemId: 10, qty: 25 },
            { itemId: 32, qty: 15 },
            { itemId: 73, qty: 6 },
            // Issue #170: was Screw (75) qty: 12 — consolidated to Nail (34)
            // to avoid confusing two functionally identical fasteners. Screw
            // is marked experimental in item.js for possible future
            // differentiation (e.g. durability tier).
            { itemId: 34, qty: 12 },
            { itemId: 42, qty: 2 }
        ],
        result: { itemId: 103, qty: 1 },
        category: "construction",
        craftTime: 25,
        icon: ""
    },
    // Issue #171: food troughs. Cattle uses more wood (large trough), pork
    // uses concrete (brick + stone), bird is metal-heavy (iron bar).
    {
        id: "cattle_food_trough",
        name: "Cocho de Ração (Gado/Ovelha)",
        requiredItems: [
            { itemId: 58, qty: 10 },
            { itemId: 34, qty: 8 },
            { itemId: 73, qty: 2 }
        ],
        result: { itemId: 104, qty: 1 },
        category: "construction",
        craftTime: 18,
        icon: ""
    },
    {
        id: "pork_food_trough",
        name: "Cocho de Ração (Suínos)",
        requiredItems: [
            { itemId: 10, qty: 12 },
            { itemId: 32, qty: 8 },
            { itemId: 34, qty: 6 }
        ],
        result: { itemId: 105, qty: 1 },
        category: "construction",
        craftTime: 18,
        icon: ""
    },
    {
        id: "bird_food_trough",
        name: "Cocho de Ração (Aves)",
        requiredItems: [
            { itemId: 73, qty: 4 },
            { itemId: 58, qty: 4 },
            { itemId: 34, qty: 6 }
        ],
        result: { itemId: 106, qty: 1 },
        category: "construction",
        craftTime: 15,
        icon: ""
    },

    /* culinária */
    {
        id: "wheat_flour",
        name: "Farinha de Trigo",
        requiredItems: [{ itemId: 64, qty: 5 }],
        result: { itemId: 59, qty: 1 },
        category: "food",
        craftTime: 8,
        icon: ""
    },
    {
        id: "simple_bread",
        name: "Pão Simples",
        requiredItems: [
            { itemId: 59, qty: 3 },
            { itemId: 57, qty: 2 }
        ],
        result: { itemId: 6, qty: 1 },
        category: "food",
        craftTime: 20,
        icon: ""
    },
    {
        id: "roasted_corn",
        name: "Milho Assado",
        requiredItems: [
            { itemId: 63, qty: 1 },
            { itemId: 57, qty: 2 }
        ],
        result: { itemId: 71, qty: 1 },
        category: "food",
        craftTime: 3,
        icon: ""
    },
    {
        id: "cheese",
        name: "Queijo",
        requiredItems: [{ itemId: 61, qty: 2 }],
        result: { itemId: 23, qty: 1 },
        category: "food",
        craftTime: 10,
        icon: ""
    },
    {
        id: "boiled_egg",
        name: "Ovo Cozido",
        requiredItems: [
            { itemId: 60, qty: 1 },
            { itemId: 57, qty: 1 }
        ],
        result: { itemId: 24, qty: 1 },
        category: "food",
        craftTime: 3,
        icon: ""
    },
    {
        id: "fruit_salad",
        name: "Salada de Frutas",
        requiredItems: [
            { itemId: 5, qty: 2 },
            { itemId: 68, qty: 1 },
            { itemId: 65, qty: 1 }
        ],
        result: { itemId: 72, qty: 1 },
        category: "food",
        craftTime: 8,
        icon: ""
    },
    // Issue #165: dishes from harvested crops.
    {
        id: "country_salad",
        name: "Salada Campestre",
        requiredItems: [
            { itemId: 111, qty: 2 }, // Pepino
            { itemId: 125, qty: 1 }, // Cenoura
            { itemId: 123, qty: 1 }  // Beterraba
        ],
        result: { itemId: 134, qty: 1 },
        category: "food",
        craftTime: 6,
        icon: ""
    },
    {
        id: "pumpkin_soup",
        name: "Sopa de Abóbora",
        requiredItems: [
            { itemId: 119, qty: 1 }, // Abóbora
            { itemId: 125, qty: 2 }  // Cenoura
        ],
        result: { itemId: 135, qty: 1 },
        category: "food",
        craftTime: 10,
        icon: ""
    },
    {
        id: "tropical_salad",
        name: "Salada Tropical",
        requiredItems: [
            { itemId: 113, qty: 1 }, // Abacaxi
            { itemId: 127, qty: 2 }  // Uva
        ],
        result: { itemId: 136, qty: 1 },
        category: "food",
        craftTime: 6,
        icon: ""
    },

    /* ração e trato animal */
    {
        id: "animal_feed_basic",
        name: "Ração Básica (Feno)",
        requiredItems: [
            { itemId: 64, qty: 3 },
            { itemId: 63, qty: 2 }
        ],
        result: { itemId: 29, qty: 5 },
        category: "animal_food",
        craftTime: 5,
        icon: ""
    },
    {
        id: "animal_treat",
        name: "Petisco Animal",
        requiredItems: [
            { itemId: 64, qty: 2 },
            { itemId: 59, qty: 1 },
            { itemId: 5, qty: 1 }
        ],
        result: { itemId: 31, qty: 3 },
        category: "animal_food",
        craftTime: 8,
        icon: ""
    }
];