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
    // Issue #170: was missing foodValue + nutrition (compare with id 7
    // which had the full structure). Without these, feeding sheep had
    // no effect on the animal.
    foodValue: 12,
    targetAnimals: ["Lamb", "Sheep"],
    nutrition: { energy: 5, happiness: 3 }
  },
  {
    id: 29,
    name: "Feno",
    icon: "assets/icons/hayIcon.webp",
    price: 20,
    description: "Alimento básico para herbívoros (gado, ovelha, porco)",
    type: "animal_food",
    targetAnimals: ["Cow", "Bull", "Calf", "Sheep", "Lamb", "Piglet", "Pig"]
  },
  {
    // Issue #165: hay seed — plant on tilled soil to grow hay (harvest → Feno, id 29).
    // TODO: dedicated seed icon (reusing hayIcon.png as placeholder for the test).
    id: 107,
    name: "Grão de Feno",
    icon: "assets/icons/hayIcon.webp",
    price: 8,
    description: "Plante em solo arado para cultivar Feno",
    type: "seed"
  },
  {
    // Issue #165: raw harvested hay (goes to Resources). Must be compacted via
    // crafting → Feno (29) before it can feed animals.
    // TODO: dedicated icon (placeholder hayIcon).
    id: 109,
    name: "Feno Colhido",
    icon: "assets/icons/hayIcon.webp",
    price: 8,
    description: "Feno cru — compacte na bancada para virar ração",
    type: "crop"
  },
  // Issue #165: planting batch 1 — cucumber, pineapple, weed, sunflower.
  // Each crop = a seed (plant on tilled soil) + a harvested crop item
  // (resource). Emoji icons are placeholders until dedicated icons exist.
  {
    id: 110,
    name: "Semente de Pepino",
    icon: "🥒",
    price: 8,
    description: "Plante em solo arado para cultivar pepino",
    type: "seed"
  },
  {
    id: 111,
    name: "Pepino",
    icon: "assets/icons/cucumberIcon.webp",
    price: 7,
    description: "Pepino colhido — refrescante",
    type: "food",
    fillUp: { hunger: 12, thirst: 10, energy: 6 }
  },
  {
    id: 112,
    name: "Muda de Abacaxi",
    icon: "🍍",
    price: 10,
    description: "Plante em solo arado para cultivar abacaxi",
    type: "seed"
  },
  {
    id: 113,
    name: "Abacaxi",
    icon: "assets/icons/pineappleIcon.webp",
    price: 28,
    description: "Abacaxi colhido — doce e suculento",
    type: "food",
    fillUp: { hunger: 18, thirst: 12, energy: 10 }
  },
  {
    id: 114,
    name: "Semente de Matinho",
    icon: "🌿",
    price: 4,
    description: "Plante em solo arado para cultivar matinho",
    type: "seed"
  },
  {
    id: 115,
    name: "Matinho",
    icon: "🌿",
    price: 5,
    description: "Matinho colhido — compacte na bancada para virar ração",
    type: "crop"
  },
  {
    id: 116,
    name: "Semente de Girassol",
    icon: "🌻",
    price: 8,
    description: "Plante em solo arado para cultivar girassol",
    type: "seed"
  },
  {
    id: 117,
    name: "Girassol",
    icon: "🌻",
    price: 14,
    description: "Girassol colhido — sementes para petiscar",
    type: "food",
    fillUp: { hunger: 6, thirst: 0, energy: 10 }
  },
  // Issue #165: planting batch 2 — pumpkin, broccoli, beet, carrot.
  {
    id: 118,
    name: "Semente de Abóbora",
    icon: "🎃",
    price: 9,
    description: "Plante em solo arado para cultivar abóbora",
    type: "seed"
  },
  {
    id: 119,
    name: "Abóbora",
    icon: "assets/icons/pumpkinIcon.webp",
    price: 21,
    description: "Abóbora colhida — substanciosa",
    type: "food",
    fillUp: { hunger: 22, thirst: 4, energy: 14 }
  },
  {
    id: 120,
    name: "Semente de Brócolis",
    icon: "🥦",
    price: 7,
    description: "Plante em solo arado para cultivar brócolis",
    type: "seed"
  },
  {
    id: 121,
    name: "Brócolis",
    icon: "assets/icons/broccoliIcon.webp",
    price: 12,
    description: "Brócolis colhido — nutritivo",
    type: "food",
    fillUp: { hunger: 16, thirst: 3, energy: 12 }
  },
  {
    id: 122,
    name: "Semente de Beterraba",
    icon: "🟤",
    price: 6,
    description: "Plante em solo arado para cultivar beterraba",
    type: "seed"
  },
  {
    id: 123,
    name: "Beterraba",
    icon: "assets/icons/beetIcon.webp",
    price: 10,
    description: "Beterraba colhida",
    type: "food",
    fillUp: { hunger: 14, thirst: 4, energy: 8 }
  },
  {
    id: 124,
    name: "Semente de Cenoura",
    icon: "🥕",
    price: 6,
    description: "Plante em solo arado para cultivar cenoura",
    type: "seed"
  },
  {
    id: 125,
    name: "Cenoura",
    icon: "assets/icons/carrotIcon.webp",
    price: 12,
    description: "Cenoura colhida",
    type: "food",
    fillUp: { hunger: 12, thirst: 3, energy: 10 }
  },
  // Issue #165: planting batch 3 — grape, chili, bell pepper, cauliflower.
  {
    id: 126,
    name: "Semente de Uva",
    icon: "🍇",
    price: 10,
    description: "Plante em solo arado para cultivar uva",
    type: "seed"
  },
  {
    id: 127,
    name: "Uva",
    icon: "assets/icons/grapeIcon.webp",
    price: 13,
    description: "Uva colhida — refrescante",
    type: "food",
    fillUp: { hunger: 10, thirst: 10, energy: 8 }
  },
  {
    id: 128,
    name: "Semente de Pimentinha",
    icon: "🌶️",
    price: 7,
    description: "Plante em solo arado para cultivar pimentinha",
    type: "seed"
  },
  {
    id: 129,
    name: "Pimentinha",
    icon: "assets/icons/chiliIcon.webp",
    price: 6,
    description: "Pimentinha colhida — picante",
    type: "food",
    fillUp: { hunger: 4, thirst: 0, energy: 6 }
  },
  {
    id: 130,
    name: "Semente de Pimentão",
    icon: "🫑",
    price: 8,
    description: "Plante em solo arado para cultivar pimentão",
    type: "seed"
  },
  {
    id: 131,
    name: "Pimentão",
    icon: "assets/icons/bellPepperIcon.webp",
    price: 14,
    description: "Pimentão colhido",
    type: "food",
    fillUp: { hunger: 14, thirst: 4, energy: 8 }
  },
  {
    id: 132,
    name: "Semente de Couve-Flor",
    icon: "🥬",
    price: 7,
    description: "Plante em solo arado para cultivar couve-flor",
    type: "seed"
  },
  {
    id: 133,
    name: "Couve-Flor",
    icon: "assets/icons/cauliflowerIcon.webp",
    price: 14,
    description: "Couve-flor colhida — nutritiva",
    type: "food",
    fillUp: { hunger: 15, thirst: 3, energy: 10 }
  },
  // Issue #165: cooked dishes made from harvested crops (crafting).
  {
    id: 134,
    name: "Salada Campestre",
    icon: "🥗",
    price: 28,
    description: "Pepino, cenoura e beterraba — refeição leve e completa",
    type: "food",
    fillUp: { hunger: 32, thirst: 12, energy: 22 }
  },
  {
    id: 135,
    name: "Sopa de Abóbora",
    icon: "🍲",
    price: 32,
    description: "Abóbora com cenoura — quente e reconfortante",
    type: "food",
    fillUp: { hunger: 38, thirst: 18, energy: 26 }
  },
  {
    id: 136,
    name: "Salada Tropical",
    icon: "🍹",
    price: 30,
    description: "Abacaxi com uva — doce e refrescante",
    type: "food",
    fillUp: { hunger: 24, thirst: 26, energy: 18 }
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
  // Issue #170: ids 101/102 reserved for cat/dog feed once those species exist.

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
    type: "resource",
    // Issue #170: no recipe to produce nor consume. Marked experimental —
    // reserved for a future custom house-roof feature.
    experimental: true
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
    type: "resource",
    // Issue #170: no recipe to produce nor consume. Reserved for a future
    // greenhouse feature (planting #2) or custom house windows.
    experimental: true
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
    type: "resource",
    // Issue #170: no recipe to produce nor consume. Reserved for future
    // tier-2 tools or advanced structures.
    experimental: true
  },
  {
    id: 48,
    name: "Linha",
    icon: "assets/icons/threadIcon.png",
    price: 8,
    description: "Para costurar e craftar",
    type: "resource",
    // Issue #170: no recipe to produce nor consume. Reserved for future
    // clothing or refined-fabric recipes.
    experimental: true
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
    type: "resource",
    // Issue #170: no recipe to produce nor consume. Reserved for a future
    // building color-customization feature.
    experimental: true
  },
  {
    id: 51,
    name: "Cola",
    icon: "assets/icons/glueIcon.png",
    price: 12,
    description: "Para colar materiais",
    type: "resource",
    // Issue #170: no recipe to produce nor consume. Reserved.
    experimental: true
  },
  {
    id: 52,
    name: "Kit de Reparos",
    icon: "assets/icons/toolboxIcon.png",
    price: 55,
    description: "Conserta ferramentas danificadas",
    type: "resource",
    // Issue #170: blocked by the tool-durability feature which doesn't
    // exist yet. Marked experimental until the spec lands.
    experimental: true
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
    type: "resource",
    // Issue #170: no recipe to produce nor consume. Reserved for future
    // industrial-tier structures.
    experimental: true
  },
  {
    id: 75,
    name: "Parafuso",
    icon: "assets/icons/screwIcon.png",
    price: 3,
    description: "Para fixações mais resistentes",
    type: "resource",
    // Issue #170: consolidated with Nail (34). Screw was pulled from the
    // water-trough recipe to avoid confusing two functionally identical
    // fasteners. Kept experimental — if a future feature adds a durability
    // tier or industrial structures, Screw becomes the premium fastener.
    // Dormant for now.
    experimental: true
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
    description: "Cereal essencial para farinha e Feno",
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
