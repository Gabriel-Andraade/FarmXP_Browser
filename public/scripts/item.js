/**
 * Banco de dados de itens do jogo
 * Contém todos os itens disponíveis incluindo ferramentas, sementes, alimentos,
 * recursos, construções e decorações
 * @constant {Array<Object>}
 */
export const items = [

  // ==================================================================================
  // 🔨 FERRAMENTAS (TOOLS)
  // Ferramentas usadas para interagir com o mundo: colher, plantar, construir, etc.
  // ==================================================================================
  {
    id: 0,
    name: "Tesoura de jardinagem",
    icon: "✂️",
    price: 20,
    description: "Perfeita para podar plantas e arbustos",
    type: "tool",
    toolType: "shears"
  },
  {
    id: 1,
    name: "Enxada",
    damage: 1,
    icon: "🪓",
    price: 50,
    description: "Ferramenta para arar a terra",
    type: "tool",
    toolType: "hoe"
  },
  {
    id: 2,
    name: "Martelo",
    damage: 1,
    icon: "🔨",
    price: 70,
    description: "Ferramenta para construção",
    type: "tool",
    toolType: "hammer"
  },
  {
    id: 11,
    name: "Foice",
    damage: 1,
    icon: "⚔️",
    price: 45,
    description: "Para colher plantações maduras",
    type: "tool",
    toolType: "scythe"
  },
  {
    id: 12,
    name: "Regador",
    icon: "💧",
    price: 35,
    description: "Para regar as plantas",
    type: "tool",
    toolType: "watering_can"
  },
  {
    id: 13,
    name: "Picareta",
    damage: 1,
    icon: "⛏️",
    price: 80,
    description: "Quebra pedras e minérios",
    type: "tool",
    toolType: "pickaxe"
  },
  {
    id: 14,
    name: "Machado",
    damage: 1,
    icon: "🪓",
    price: 60,
    description: "Corta árvores e madeira",
    type: "tool",
    toolType: "axe"
  },
  {
    id: 15,
    name: "Rastelo",
    damage: 1,
    icon: "👨‍🌾",
    price: 40,
    description: "Prepara o solo para plantio",
    type: "tool",
    toolType: "rake"
  },
  {
    id: 16,
    name: "Balde",
    icon: "🪣",
    price: 25,
    description: "Coleta água e leite",
    type: "tool",
    toolType: "bucket"
  },
  {
    id: 22,
    name: "Machete",
    damage: 1,
    icon: "🔪",
    price: 55,
    description: "Corta vegetação densa",
    type: "tool",
    toolType: "machete"
  },

  // ==================================================================================
  // 🌱 SEMENTES (SEEDS)
  // Sementes plantáveis que crescem em plantações
  // ==================================================================================
  {
    id: 3,
    name: "Semente de Milho",
    icon: "🌽",
    price: 20,
    description: "Pode ser plantada para crescer milho",
    type: "seed"
  },
  {
    id: 4,
    name: "Semente de Trigo",
    icon: "🌾",
    price: 15,
    description: "Pode ser plantada para crescer trigo",
    type: "seed"
  },
  {
    id: 17,
    name: "Semente de Cenoura",
    icon: "🥕",
    price: 12,
    description: "Pode ser plantada para crescer cenouras",
    type: "seed"
  },
  {
    id: 18,
    name: "Semente de Tomate",
    icon: "🍅",
    price: 18,
    description: "Pode ser plantada para crescer tomates",
    type: "seed"
  },
  {
    id: 19,
    name: "Semente de Batata",
    icon: "🥔",
    price: 10,
    description: "Pode ser plantada para crescer batatas",
    type: "seed"
  },
  {
    id: 20,
    name: "Semente de Morango",
    icon: "🍓",
    price: 25,
    description: "Pode ser plantada para crescer morangos",
    type: "seed"
  },
  {
    id: 21,
    name: "Semente de Flores",
    icon: "🌻",
    price: 8,
    description: "Pode ser plantada para crescer flores",
    type: "seed"
  },
  {
    id: 53,
    name: "Semente de Árvore",
    icon: "🌳",
    price: 50,
    description: "Cresce uma árvore que dá frutos",
    type: "seed"
  },

  // ==================================================================================
  // 🍲 COMIDA E CONSUMÍVEIS (FOOD)
  // Itens consumíveis que restauram fome, sede e energia
  // ==================================================================================
  {
    id: 5,
    name: "Maçã",
    icon: "🍎",
    price: 10,
    description: "Fruta para consumo",
    type: "food",
    fillUp: { hunger: 15, thirst: 5, energy: 10 }
  },
  {
    id: 6,
    name: "Pão",
    icon: "🍞",
    price: 25,
    description: "Comida para recuperar energia",
    type: "food",
    fillUp: { hunger: 25, thirst: 0, energy: 15 }
  },
  {
    id: 23,
    name: "Queijo",
    icon: "🧀",
    price: 35,
    description: "Feito com leite fresco",
    type: "food",
    fillUp: { hunger: 20, thirst: 0, energy: 20 }
  },
  {
    id: 24,
    name: "Ovo Cozido",
    icon: "🥚",
    price: 15,
    description: "Fonte de proteína",
    type: "food",
    fillUp: { hunger: 15, thirst: 0, energy: 10 }
  },
  {
    id: 25,
    name: "Torta de Maçã",
    icon: "🥧",
    price: 60,
    description: "Doce caseiro delicioso",
    type: "food",
    fillUp: { hunger: 30, thirst: 0, energy: 25 }
  },
  {
    id: 26,
    name: "Sopa de Legumes",
    icon: "🍲",
    price: 45,
    description: "Refeição nutritiva",
    type: "food",
    fillUp: { hunger: 35, thirst: 15, energy: 30 }
  },
  {
    id: 27,
    name: "Mel",
    icon: "🍯",
    price: 40,
    description: "Doce natural das abelhas",
    type: "food",
    fillUp: { hunger: 10, thirst: 5, energy: 20 }
  },
  {
    id: 28,
    name: "Suco de Fruta",
    icon: "🧃",
    price: 30,
    description: "Bebida refrescante",
    type: "food",
    fillUp: { hunger: 2, thirst: 30, energy: 10 }
  },
  {
    id: 71,
    name: "Milho Assado",
    icon: "🌽",
    price: 30,
    description: "Milho grelhado no fogo",
    type: "food",
    fillUp: { hunger: 25, thirst: 5, energy: 15 }
  },
  {
    id: 72,
    name: "Salada de Frutas",
    icon: "🥗",
    price: 45,
    description: "Mistura refrescante de frutas",
    type: "food",
    fillUp: { hunger: 20, thirst: 20, energy: 20 }
  },
  {
    id: 41,
    name: "Garrafa com agua",
    icon: "💧",
    price: 10,
    description: "Água fresca para beber",
    type: "food",
    fillUp: { hunger: 0, thirst: 40, energy: 5 }
  },

  // ==================================================================================
  // 🐮 COMIDA DE ANIMAIS (ANIMAL FOOD)
  // Rações e alimentos para nutrir os animais da fazenda
  // ==================================================================================
  {
    id: 7,
    name: "Ração para Galinha",
    icon: "🥎",
    price: 30,
    description: "Usada para alimentar galinhas",
    type: "animal_food",
    foodValue: 15,
    targetAnimals: ["chicken"],
    nutrition: { energy: 8, happiness: 3 }
  },
  {
    id: 8,
    name: "Ração para Ovelha",
    icon: "🥗",
    price: 40,
    description: "Usada para alimentar ovelhas",
    type: "animal_food"
  },
  {
    id: 29,
    name: "Feno",
    icon: "🌾",
    price: 20,
    description: "Alimento básico para animais",
    type: "animal_food"
  },
  {
    id: 30,
    name: "Ração para Vaca",
    icon: "🍃",
    price: 50,
    description: "Nutrientes especiais para vacas",
    type: "animal_food"
  },
  {
    id: 31,
    name: "Petisco para Animais",
    icon: "🍪",
    price: 15,
    description: "Guloseima para todos os animais",
    type: "animal_food"
  },

  // ==================================================================================
  // 🪨 RECURSOS NATURAIS
  // Materiais brutos coletados do ambiente
  // ==================================================================================
  {
    id: 9,
    name: "Madeira Bruta",
    icon: "🪵",
    price: 15,
    description: "Tronco de árvore cortado",
    type: "resource"
  },
  {
    id: 10,
    name: "Pedra",
    icon: "🪨",
    price: 20,
    description: "material de construção básico",
    type: "resource"
  },
  {
    id: 54,
    name: "Fibra Vegetal",
    icon: "🌿",
    price: 2,
    description: "Obtida cortando grama, usada para cordas",
    type: "resource"
  },
  {
    id: 55,
    name: "Argila",
    icon: "🟤",
    price: 5,
    description: "Encontrada no solo, usada para tijolos",
    type: "resource"
  },
  {
    id: 56,
    name: "Carvão",
    icon: "⚫",
    price: 10,
    description: "Combustível essencial para fornalhas",
    type: "resource"
  },
  {
    id: 57,
    name: "Lasca de Madeira",
    icon: "🪵",
    price: 2,
    description: "Restos de madeira, bom para combustível",
    type: "resource"
  },

  // ==================================================================================
  // 🔧 MATERIAIS PROCESSADOS
  // Recursos refinados e processados
  // ==================================================================================
  {
    id: 32,
    name: "Tijolos",
    icon: "🧱",
    price: 30,
    description: "Para construções robustas",
    type: "resource"
  },
  {
    id: 33,
    name: "Telhas",
    icon: "🏠",
    price: 25,
    description: "Para telhados das construções",
    type: "resource"
  },
  {
    id: 34,
    name: "Prego",
    icon: "📌",
    price: 5,
    description: "Para fixar madeiras",
    type: "resource"
  },
  {
    id: 35,
    name: "Corda",
    icon: "🪢",
    price: 12,
    description: "Para amarrações diversas",
    type: "resource"
  },
  {
    id: 36,
    name: "Vidro",
    icon: "🪟",
    price: 35,
    description: "Para janelas e estufas",
    type: "resource"
  },
  {
    id: 37,
    name: "Ferro",
    icon: "⚙️",
    price: 40,
    description: "Metal para ferramentas e construções",
    type: "resource"
  },
  {
    id: 38,
    name: "Aço Temperado",
    icon: "🔩",
    price: 90,
    description: "material resistente para construção",
    type: "resource"
  },
  {
    id: 48,
    name: "Linha",
    icon: "🧵",
    price: 8,
    description: "Para costurar e craftar",
    type: "resource"
  },
  {
    id: 49,
    name: "Tecido",
    icon: "📦",
    price: 18,
    description: "Feito da lã das ovelhas",
    type: "resource"
  },
  {
    id: 50,
    name: "Tinta",
    icon: "🎨",
    price: 25,
    description: "Para colorir construções",
    type: "resource"
  },
  {
    id: 51,
    name: "Cola",
    icon: "🫙",
    price: 12,
    description: "Para colar materiais",
    type: "resource"
  },
  {
    id: 52,
    name: "Kit de Reparos",
    icon: "🛠️",
    price: 55,
    description: "Conserta ferramentas danificadas",
    type: "resource"
  },
  {
    id: 58,
    name: "Tábua de Madeira",
    icon: "📏",
    price: 8,
    description: "Madeira refinada para construção",
    type: "resource"
  },
  {
    id: 59,
    name: "Farinha de Trigo",
    icon: "🥡",
    price: 12,
    description: "Ingrediente básico para pães e bolos",
    type: "resource"
  },
  {
    id: 73,
    name: "Barra de Ferro",
    icon: "▬",
    price: 25,
    description: "Ferro refinado para construções avançadas",
    type: "resource"
  },
  {
    id: 74,
    name: "Placa de Metal",
    icon: "▭",
    price: 35,
    description: "Metal laminado para estruturas",
    type: "resource"
  },
  {
    id: 75,
    name: "Parafuso",
    icon: "🔩",
    price: 3,
    description: "Para fixações mais resistentes",
    type: "resource"
  },
  {
    id: 76,
    name: "Haste de Madeira",
    icon: "🎋",
    price: 4,
    description: "Vara de madeira para diversas utilidades",
    type: "resource"
  },

  // ==================================================================================
  // 🥛 PRODUTOS ANIMAIS
  // Recursos obtidos através dos animais da fazenda
  // ==================================================================================
  {
    id: 60,
    name: "Ovo Cru",
    icon: "🥚",
    price: 10,
    description: "Produto fresco das galinhas",
    type: "resource"
  },
  {
    id: 61,
    name: "Leite",
    icon: "🥛",
    price: 15,
    description: "Leite fresco da vaca",
    type: "resource"
  },
  {
    id: 62,
    name: "Lã",
    icon: "☁️",
    price: 20,
    description: "Tosquia de ovelha, usada para tecido",
    type: "resource"
  },

  // ==================================================================================
  // 🌾 COLHEITAS (CROPS)
  // Produtos agrícolas obtidos através do plantio
  // ==================================================================================
  {
    id: 63,
    name: "Milho",
    icon: "🌽",
    price: 25,
    description: "Espiga fresca colhida da fazenda",
    type: "crop"
  },
  {
    id: 64,
    name: "Trigo",
    icon: "🌾",
    price: 20,
    description: "Cereal essencial para farinha e feno",
    type: "crop"
  },
  {
    id: 65,
    name: "Cenoura",
    icon: "🥕",
    price: 18,
    description: "Legume crocante e saudável",
    type: "crop"
  },
  {
    id: 66,
    name: "Tomate",
    icon: "🍅",
    price: 22,
    description: "Fruto vermelho e suculento",
    type: "crop"
  },
  {
    id: 67,
    name: "Batata",
    icon: "🥔",
    price: 15,
    description: "Tubérculo versátil para culinária",
    type: "crop"
  },
  {
    id: 68,
    name: "Morango",
    icon: "🍓",
    price: 35,
    description: "Fruta doce e valiosa",
    type: "crop"
  },

  // ==================================================================================
  // 🏗️ CONSTRUÇÕES E ESTRUTURAS
  // Itens que podem ser colocados no mundo
  // ==================================================================================
  {
    id: 69,
    name: "Baú de Armazenamento",
    icon: "📦",
    price: 100,
    description: "Armazena itens",
    type: "construction",
    placeable: true,
    buildWidth: 40,
    buildHeight: 40
  },
  {
    id: 93,
    name: "poço",
    icon: "🕳️",
    price: 150,
    description: "Fornece água para a fazenda",
    type: "construction",
    placeable: true,
    buildWidth: 50,
    buildHeight: 50,
    originalType: "well"
  },
  {
    id: 43,
    name: "Cerca de Madeira",
    icon: "🌲",
    price: 8,
    description: "Para delimitar áreas",
    type: "construction",
    subType: "fence",
    variants: ["fenceX", "fenceY"],
    placeable: true
  },

  // ==================================================================================
  // 🎨 DECORAÇÕES
  // Itens decorativos para embelezar a fazenda
  // ==================================================================================
  {
    id: 44,
    name: "Vaso de Flores",
    icon: "🏺",
    price: 20,
    description: "Decoração para a fazenda",
    type: "construction"
  },
  {
    id: 45,
    name: "Lampião",
    icon: "💡",
    price: 45,
    description: "Ilumina a fazenda à noite",
    type: "construction"
  },
  {
    id: 46,
    name: "Banco de Jardim",
    icon: "🪑",
    price: 60,
    description: "Para descansar na fazenda",
    type: "construction"
  },
  {
    id: 47,
    name: "Sinalização",
    icon: "🪧",
    price: 15,
    description: "Placa decorativa",
    type: "construction"
  },

  // ==================================================================================
  // 🫙 RECIPIENTES E CONTAINERS
  // Itens para armazenar e transportar líquidos
  // ==================================================================================
  {
    id: 40,
    name: "Garrafa vazia",
    icon: "🍶",
    price: 5,
    description: "Para armazenar líquidos",
    type: "resource"
  },
  {
    id: 42,
    name: "balde com aguá",
    icon: "🪣",
    price: 15,
    description: "Balde cheio de água",
    type: "resource"
  }
];