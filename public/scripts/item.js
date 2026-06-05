/**
 * Banco de dados de itens do jogo
 * Contém todos os itens disponíveis incluindo ferramentas, sementes, alimentos,
 * recursos, construções e decorações
 * @constant {Array<Object>}
 *
 * Convenção de `icon`: caminho `assets/icons/*.png` quando há arte dedicada;
 * emoji unicode como fallback quando ainda não há ícone. O renderer detecta
 * o tipo via `isImageIcon` (itemUtils.js) — caminhos com `.`/`/` viram <img>,
 * o resto é texto.
 */
export const items = [

  // ==================================================================================
  // 🔨 FERRAMENTAS (TOOLS)
  // Ferramentas usadas para interagir com o mundo: colher, plantar, construir, etc.
  // ==================================================================================
  {
    id: 0,
    name: "Tesoura de jardinagem",
    icon: "assets/icons/shearsIcon.png",
    price: 20,
    description: "Perfeita para podar plantas e arbustos",
    type: "tool",
    toolType: "shears"
  },
  {
    id: 1,
    name: "Enxada",
    damage: 1,
    icon: "assets/icons/hoeIcon.png",
    price: 50,
    description: "Ferramenta para arar a terra",
    type: "tool",
    toolType: "hoe"
  },
  {
    id: 2,
    name: "Martelo",
    damage: 1,
    icon: "assets/icons/hammerIcon.png",
    price: 70,
    description: "Ferramenta para construção",
    type: "tool",
    toolType: "hammer"
  },
  {
    id: 11,
    name: "Foice",
    damage: 1,
    icon: "assets/icons/scytheIcon.png",
    price: 45,
    description: "Para colher plantações maduras",
    type: "tool",
    toolType: "scythe"
  },
  {
    id: 12,
    name: "Regador",
    icon: "assets/icons/wateringCanIcon.png",
    price: 35,
    description: "Para regar as plantas",
    type: "tool",
    toolType: "watering_can"
  },
  {
    id: 13,
    name: "Picareta",
    damage: 1,
    icon: "assets/icons/pickaxeIcon.png",
    price: 80,
    description: "Quebra pedras e minérios",
    type: "tool",
    toolType: "pickaxe"
  },
  {
    id: 14,
    name: "Machado",
    damage: 1,
    icon: "assets/icons/axeIcon.png",
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
    icon: "assets/icons/bucketIcon.png",
    price: 25,
    description: "Coleta água e leite",
    type: "tool",
    toolType: "bucket"
  },
  {
    id: 22,
    name: "Machete",
    damage: 1,
    icon: "assets/icons/macheteIcon.png",
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
    icon: "assets/icons/cornSeedIcon.png",
    price: 20,
    description: "Pode ser plantada para crescer milho",
    type: "seed"
  },
  {
    id: 4,
    name: "Semente de Trigo",
    icon: "assets/icons/wheatSeedIcon.png",
    price: 15,
    description: "Pode ser plantada para crescer trigo",
    type: "seed"
  },
  {
    id: 17,
    name: "Semente de Cenoura",
    icon: "assets/icons/carrotSeedIcon.png",
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
    icon: "assets/icons/potatoSeedIcon.png",
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
    icon: "assets/icons/flowerSeedIcon.png",
    price: 8,
    description: "Pode ser plantada para crescer flores",
    type: "seed"
  },
  {
    id: 53,
    name: "Semente de Árvore",
    icon: "assets/icons/appleSeedIcon.png",
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
    icon: "assets/icons/appleIcon.png",
    price: 10,
    description: "Fruta para consumo",
    type: "food",
    fillUp: { hunger: 15, thirst: 5, energy: 10 }
  },
  {
    id: 6,
    name: "Pão",
    icon: "assets/icons/breadIcon.png",
    price: 25,
    description: "Comida para recuperar energia",
    type: "food",
    fillUp: { hunger: 25, thirst: 0, energy: 15 }
  },
  {
    id: 23,
    name: "Queijo",
    icon: "assets/icons/cheeseIcon.png",
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
    icon: "assets/icons/applePieIcon.png",
    price: 60,
    description: "Doce caseiro delicioso",
    type: "food",
    fillUp: { hunger: 30, thirst: 0, energy: 25 }
  },
  {
    id: 26,
    name: "Sopa de Legumes",
    icon: "assets/icons/vegetableSoupIcon.png",
    price: 45,
    description: "Refeição nutritiva",
    type: "food",
    fillUp: { hunger: 35, thirst: 15, energy: 30 }
  },
  {
    id: 27,
    name: "Mel",
    icon: "assets/icons/honeyIcon.png",
    price: 40,
    description: "Doce natural das abelhas",
    type: "food",
    fillUp: { hunger: 10, thirst: 5, energy: 20 }
  },
  {
    id: 28,
    name: "Suco de Fruta",
    icon: "assets/icons/fruitJuiceIcon.png",
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
    icon: "assets/icons/fruitSaladIcon.png",
    price: 45,
    description: "Mistura refrescante de frutas",
    type: "food",
    fillUp: { hunger: 20, thirst: 20, energy: 20 }
  },
  {
    id: 41,
    name: "Garrafa com agua",
    icon: "assets/icons/waterBottleIcon.png",
    price: 10,
    description: "Água fresca para beber",
    type: "food",
    fillUp: { hunger: 0, thirst: 40, energy: 5 }
  },

  // ==================================================================================
  // 🐮 COMIDA DE ANIMAIS (ANIMAL FOOD)
  // Rações e alimentos para nutrir os animais da fazenda
  // ==================================================================================
  // `targetAnimals` lista espécies (assetName, case-sensitive) que podem
  // consumir o item. `'all'` libera pra qualquer animal. Array vazio = item
  // existe mas nenhuma espécie do farm aceita (ex: ração de gato/cachorro).
  {
    id: 7,
    name: "Ração para Galinha",
    icon: "assets/icons/chickenFeedIcon.png",
    price: 30,
    description: "Usada para alimentar galinhas",
    type: "animal_food",
    foodValue: 15,
    targetAnimals: ["Chick", "Chicken", "Rooster", "Turkey"],
    nutrition: { energy: 8, happiness: 3 }
  },
  {
    id: 8,
    name: "Ração para Ovelha",
    icon: "assets/icons/sheepFeedIcon.png",
    price: 40,
    description: "Usada para alimentar ovelhas",
    type: "animal_food",
    targetAnimals: ["Lamb", "Sheep"]
  },
  {
    id: 29,
    name: "Feno",
    icon: "assets/icons/hayIcon.png",
    price: 20,
    description: "Alimento básico para herbívoros (gado, ovelha, porco)",
    type: "animal_food",
    targetAnimals: ["Cow", "Bull", "Calf", "Sheep", "Lamb", "Piglet", "Pig"]
  },
  {
    id: 30,
    name: "Ração para Vaca",
    icon: "assets/icons/cowFeedIcon.png",
    price: 50,
    description: "Nutrientes especiais para bovinos",
    type: "animal_food",
    targetAnimals: ["Cow", "Bull", "Calf"]
  },
  {
    id: 31,
    name: "Petisco para Animais",
    icon: "🍪",
    price: 15,
    description: "Guloseima para todos os animais",
    type: "animal_food",
    targetAnimals: "all"
  },

  // ==================================================================================
  // 💊 REMÉDIOS (MEDICINES)
  // Tratamentos veterinários para as doenças dos animais. Dois tipos por doença:
  //   - cureMode "instant":  cura imediata, mais caro.
  //   - cureMode "gradual":  precisa de `daysToCure` dias de doses, mais barato.
  // `dosesPerDay` indica se o player precisa aplicar 1 ou 2 vezes ao dia.
  // `palatability` afeta a aceitação pelo animal — 'bitter' tende a fazer
  // animais relutarem, 'palatable' aceita fácil. A lógica de aplicação/dose
  // será implementada no diseaseSystem; aqui é só o catálogo.
  // ==================================================================================
  {
    id: 200,
    name: "Vermífugo Rápido",
    icon: "assets/icons/fastDewormerIcon.png",
    price: 80,
    description: "Cura verminose imediatamente. Dose única.",
    type: "medicine",
    targetDisease: "parasitosis",
    cureMode: "instant",
    dosesPerDay: 1,
    palatability: "palatable"
  },
  {
    id: 201,
    name: "Vermífugo Comum",
    icon: "assets/icons/commonDewormerIcon.png",
    price: 25,
    description: "Cura verminose em 3 dias. Sabor amargo, alguns animais relutam.",
    type: "medicine",
    targetDisease: "parasitosis",
    cureMode: "gradual",
    daysToCure: 3,
    dosesPerDay: 1,
    palatability: "bitter"
  },
  {
    id: 202,
    name: "Antibiótico Premium",
    icon: "assets/icons/premiumAntibioticIcon.png",
    price: 120,
    description: "Trata problemas respiratórios na hora. Dose única.",
    type: "medicine",
    targetDisease: "respiratory",
    cureMode: "instant",
    dosesPerDay: 1,
    palatability: "neutral"
  },
  {
    id: 203,
    name: "Xarope Caseiro",
    icon: "assets/icons/homemadeSyrupIcon.png",
    price: 30,
    description: "Alivia tosse em 4 dias. Sabor doce, animais aceitam fácil.",
    type: "medicine",
    targetDisease: "respiratory",
    cureMode: "gradual",
    daysToCure: 4,
    dosesPerDay: 2,
    palatability: "palatable"
  },
  {
    id: 204,
    name: "Antiácido Veterinário",
    icon: "assets/icons/vetAntacidIcon.png",
    price: 90,
    description: "Cura problemas digestivos imediatamente. Dose única.",
    type: "medicine",
    targetDisease: "digestive",
    cureMode: "instant",
    dosesPerDay: 1,
    palatability: "palatable"
  },
  {
    id: 205,
    name: "Probiótico em Pó",
    icon: "assets/icons/premiumAntibioticIcon.png",
    price: 35,
    description: "Restaura a flora intestinal em 2 dias. Misturado na ração.",
    type: "medicine",
    targetDisease: "digestive",
    cureMode: "gradual",
    daysToCure: 2,
    dosesPerDay: 2,
    palatability: "neutral"
  },
  {
    id: 206,
    name: "Antitérmico Forte",
    icon: "assets/icons/strongAntipyreticIcon.png",
    price: 70,
    description: "Cura febre imediatamente. Sabor amargo, vai dar trabalho aplicar.",
    type: "medicine",
    targetDisease: "fever",
    cureMode: "instant",
    dosesPerDay: 1,
    palatability: "bitter"
  },
  {
    id: 207,
    name: "Chá Medicinal",
    icon: "assets/icons/medicinalTeaIcon.png",
    price: 20,
    description: "Reduz febre em 3 dias. Aroma agradável.",
    type: "medicine",
    targetDisease: "fever",
    cureMode: "gradual",
    daysToCure: 3,
    dosesPerDay: 1,
    palatability: "palatable"
  },

  // ==================================================================================
  // 🐄 ANIMAIS (LIVESTOCK)
  // Catálogo de animais vendidos pelo Rico. Não vão para o inventário — o
  // merchant detecta `type === 'animal'` e despacha pra entrega na fazenda
  // (spawn próximo à picape). `assetName` casa com a chave em `assets.animals`
  // usada pelo `addAnimal()`. Preços escalonam: filhote barato → adulto comum
  // → raro/perigoso. Bull aparece por último porque já tem mecânica de
  // bellow ferindo vizinhos (animalAI._maybeBullBellowInjury).
  // ==================================================================================
  {
    id: 300,
    name: "Pintinho",
    icon: "🐤",
    price: 50,
    description: "Filhote de galinha. Cresce rápido e come pouco.",
    type: "animal",
    assetName: "Chick"
  },
  {
    id: 301,
    name: "Cordeiro",
    icon: "🐑",
    price: 120,
    description: "Filhote de ovelha. Boa entrada na pecuária.",
    type: "animal",
    assetName: "Lamb"
  },
  {
    id: 302,
    name: "Leitão",
    icon: "🐖",
    price: 150,
    description: "Filhote de porco. Cuidado: come MUITO.",
    type: "animal",
    assetName: "Piglet"
  },
  {
    id: 303,
    name: "Bezerro",
    icon: "🐮",
    price: 200,
    description: "Filhote bovino. Investimento de longo prazo.",
    type: "animal",
    assetName: "Calf"
  },
  {
    id: 304,
    name: "Vaca",
    icon: "🐄",
    price: 450,
    description: "Bovino adulto. Atalho pra começar a produção.",
    type: "animal",
    assetName: "Cow"
  },
  {
    id: 305,
    name: "Ovelha",
    icon: "🐏",
    price: 350,
    description: "Ovelha adulta. Resistente ao frio.",
    type: "animal",
    assetName: "Sheep"
  },
  {
    id: 306,
    name: "Peru",
    icon: "🦃",
    price: 280,
    description: "Ave grande, ótima diversificação do plantel.",
    type: "animal",
    assetName: "Turkey"
  },
  {
    id: 307,
    name: "Galo",
    icon: "🐓",
    price: 200,
    description: "Macho da galinha. Útil para casais (futuro).",
    type: "animal",
    assetName: "Rooster"
  },
  {
    id: 308,
    name: "Touro",
    icon: "🐃",
    price: 800,
    description: "Bovino macho. Cuidado: pode ferir outros animais ao redor.",
    type: "animal",
    assetName: "Bull"
  },
  {
    id: 309,
    name: "Galinha",
    icon: "🐔",
    price: 180,
    description: "Galinha adulta. Produz ovos diariamente se bem cuidada.",
    type: "animal",
    assetName: "Chicken"
  },

  // ==================================================================================
  // 🪨 RECURSOS NATURAIS
  // Materiais brutos coletados do ambiente
  // ==================================================================================
  {
    id: 9,
    name: "Madeira Bruta",
    icon: "assets/icons/rawWoodIcon.png",
    price: 15,
    description: "Tronco de árvore cortado",
    type: "resource"
  },
  {
    id: 10,
    name: "Pedra",
    icon: "assets/icons/stoneIcon.png",
    price: 20,
    description: "material de construção básico",
    type: "resource"
  },
  {
    id: 54,
    name: "Fibra Vegetal",
    icon: "assets/icons/plantFiberIcon.png",
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
    icon: "assets/icons/coalIcon.png",
    price: 10,
    description: "Combustível essencial para fornalhas",
    type: "resource"
  },
  {
    id: 57,
    name: "Lasca de Madeira",
    icon: "assets/icons/woodChipIcon.png",
    price: 2,
    description: "Restos de madeira, bom para combustível",
    type: "resource"
  },
  // ==================================================================================
  // alimentos para animais
  // ==================================================================================
  {
    id: 98,
    name: "Ração de Qualidade",
    icon: "assets/icons/premiumFeedIcon.png",
    price: 20,
    description: "Alimento balanceado para animais domésticos",
    type: "animal_food",
    targetAnimals: "all"
  },
  {
    id: 97,
    name: "milho moído e farelo de soja",
    icon: "assets/icons/groundCornSoyMealIcon.png",
    price: 26,
    description: "Ração para porcos",
    type: "animal_food",
    targetAnimals: ["Piglet", "Pig"]
  },
  {
    id: 96,
    name: "grãos para aves",
    icon: "assets/icons/poultryGrainIcon.png",
    price: 12,
    description: "Ração geral para aves",
    type: "animal_food",
    targetAnimals: ["Chick", "Chicken", "Rooster", "Turkey"]
  },
  {
    id: 101,
    name: "ração para felinos",
    icon: "assets/icons/catFeedIcon.png",
    price: 30,
    description: "Ração especializada para gatos domésticos",
    type: "animal_food",
    targetAnimals: []  // nenhuma espécie atual do farm — pra gato futuro
  },
  {
    id: 102,
    name: "ração para cachorros",
    icon: "assets/icons/dogFeedIcon.png",
    price: 30,
    description: "Ração especializada para cães domésticos",
    type: "animal_food",
    targetAnimals: []  // nenhuma espécie atual do farm — pra cachorro futuro
  },
  // ==================================================================================

  // ==================================================================================
  // 🔧 MATERIAIS PROCESSADOS
  // Recursos refinados e processados
  // ==================================================================================
  {
    id: 32,
    name: "Tijolos",
    icon: "assets/icons/brickIcon.png",
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
    icon: "assets/icons/ropeIcon.png",
    price: 12,
    description: "Para amarrações diversas",
    type: "resource"
  },
  {
    id: 36,
    name: "Vidro",
    icon: "assets/icons/glassIcon.png",
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
    icon: "assets/icons/temperedSteelIcon.png",
    price: 90,
    description: "material resistente para construção",
    type: "resource"
  },
  {
    id: 48,
    name: "Linha",
    icon: "assets/icons/threadIcon.png",
    price: 8,
    description: "Para costurar e craftar",
    type: "resource"
  },
  {
    id: 49,
    name: "Tecido",
    icon: "assets/icons/fabricIcon.png",
    price: 18,
    description: "Feito da lã das ovelhas",
    type: "resource"
  },
  {
    id: 50,
    name: "Tinta",
    icon: "assets/icons/paintBucketIcon.png",
    price: 25,
    description: "Para colorir construções",
    type: "resource"
  },
  {
    id: 51,
    name: "Cola",
    icon: "assets/icons/glueIcon.png",
    price: 12,
    description: "Para colar materiais",
    type: "resource"
  },
  {
    id: 52,
    name: "Kit de Reparos",
    icon: "assets/icons/toolboxIcon.png",
    price: 55,
    description: "Conserta ferramentas danificadas",
    type: "resource"
  },
  {
    id: 58,
    name: "Tábua de Madeira",
    icon: "assets/icons/woodPlankIcon.png",
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
    icon: "assets/icons/ironBarIcon.png",
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
    icon: "assets/icons/screwIcon.png",
    price: 3,
    description: "Para fixações mais resistentes",
    type: "resource"
  },
  {
    id: 76,
    name: "Haste de Madeira",
    icon: "assets/icons/woodStickIcon.png",
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
    icon: "assets/icons/eggIcon.png",
    price: 10,
    description: "Produto fresco das galinhas",
    type: "resource"
  },
  {
    id: 61,
    name: "Leite",
    icon: "assets/icons/milkBottleIcon.png",
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
    icon: "assets/icons/cornIcon.png",
    price: 25,
    description: "Espiga fresca colhida da fazenda",
    type: "crop"
  },
  {
    id: 64,
    name: "Trigo",
    icon: "assets/icons/wheatIcon.png",
    price: 20,
    description: "Cereal essencial para farinha e feno",
    type: "crop"
  },
  {
    id: 65,
    name: "Cenoura",
    icon: "assets/icons/carrotIcon.png",
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
    icon: "assets/icons/potatoIcon.png",
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
    icon: "assets/icons/wellIcon.png",
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
    icon: "assets/icons/woodFenceIcon.png",
    price: 8,
    description: "Para delimitar áreas",
    type: "construction",
    subType: "fence",
    variants: ["fenceX", "fenceY"],
    placeable: true
  },
  {
    id: 103,
    name: "Cocho de Água",
    icon: "💧",
    price: 350,
    description: "Fornece água fresca para animais de grande porte",
    type: "construction",
    placeable: true,
    buildWidth: 95,
    buildHeight: 30,
    variants: ["waterTroughX", "waterTroughY"],
    originalType: "watertrough"
  },
  // Issue #171: food troughs split by species. `species` is read by
  // foodTroughSystem to whitelist which animals can eat from each one.
  // Sheep/Lamb share the cattle trough (same hay diet, item 29).
  {
    id: 104,
    name: "Cocho de Ração (Gado/Ovelha)",
    icon: "🐄",
    price: 280,
    description: "Comedouro para gado, bezerro, ovelha e cordeiro",
    type: "construction",
    placeable: true,
    buildWidth: 95,
    buildHeight: 60,
    variants: ["foodTroughcattleX", "foodTroughcattleY"],
    originalType: "foodtrough",
    species: "cattle",
    targetAnimals: ["Cow", "Bull", "Calf", "Sheep", "Lamb"]
  },
  {
    id: 105,
    name: "Cocho de Ração (Suínos)",
    icon: "🐖",
    price: 260,
    description: "Comedouro para porcos e leitões",
    type: "construction",
    placeable: true,
    buildWidth: 95,
    buildHeight: 40,
    variants: ["foodTroughporkX", "foodTroughporkY"],
    originalType: "foodtrough",
    species: "pork",
    targetAnimals: ["Pig", "Piglet"]
  },
  {
    id: 106,
    name: "Cocho de Ração (Aves)",
    icon: "🐔",
    price: 220,
    description: "Comedouro para galinhas, perus e galos",
    type: "construction",
    placeable: true,
    buildWidth: 95,
    buildHeight: 35,
    variants: ["foodTroughBirdX", "foodTroughBirdY"],
    originalType: "foodtrough",
    species: "bird",
    targetAnimals: ["Chicken", "Chick", "Rooster", "Turkey"]
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
    name: "balde com água",
    icon: "assets/icons/waterBucketIcon.png",
    price: 15,
    description: "Balde cheio de água",
    type: "resource"
  },

  // ==================================================================================
  // 🔋 QUEST ITEMS
  // Itens especiais de missão
  // ==================================================================================
  {
    id: 94,
    name: "Bateria",
    icon: "🔋",
    price: 0,
    description: "Bateria para consertar a picape",
    type: "resource",
    questItem: true
  },
  {
    id: 100,
    name: "Contrato Municipal",
    icon: "assets/icons/mayorContractIcon.png",
    price: 0,
    description: "Termo de compromisso assinado com o prefeito Bartolomeu.",
    type: "resource",
    questItem: true
  },
  {
    id: 95,
    name: "Garrafa de Leite Fresco",
    icon: "assets/icons/milkBottleIcon.png",
    price: 0,
    description: "Leite fresco tirado da vaca. Entregue para John.",
    type: "resource",
    questItem: true
  },

{
  id: 9991,
  name: "Madalena",
  icon: "assets/icons/madalenaIcon.png",
  type: "resource",
  questItem: true,
  description: "Madalena está nos seus braços. Leve-a até Milly."
}
];
