export const recipes = [
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

    /* ferramentas */
    {
        id: "axe",
        name: "Machado",
        requiredItems: [
            { itemId: 58, qty: 2 },
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
            { itemId: 58, qty: 2 },
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
            { itemId: 58, qty: 2 },
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
            { itemId: 58, qty: 1 },
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
            { itemId: 35, qty: 1 }
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
