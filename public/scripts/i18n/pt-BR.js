/**
 * Portuguese (Brazilian) Translations Dictionary
 * @file pt-BR.js
 * @description Complete Portuguese (Brazilian) translation object for FarmingXP game
 * Contains all UI strings, messages, and game content in Portuguese (Brazil)
 * Used by i18n system for language localization
 * @module translations/pt-BR
 * @exports {Object} Translation dictionary with nested keys
 * @example
 * import ptBR from './pt-BR.js';
 * const menuPlayText = ptBR.menu.play; // 'Jogar'
 * const hungerLabel = ptBR.player.hunger; // 'Fome'
 */
export default {
  // Achievements
  achievements: {
    title: 'Conquistas',
    unlocked: 'Conquista Desbloqueada!',
    locked: 'Bloqueada',
    hidden: '???',
    progress: '{current}/{target}',
    category: {
      all: 'Todas',
      farming: 'Fazenda',
      animals: 'Animais',
      economy: 'Economia',
      exploration: 'Exploração',
      survival: 'Sobrevivência',
    },
    firstSteps:    { title: 'Primeiros Passos',     description: 'Comece sua aventura na fazenda' },
    nightOwl:      { title: 'Coruja Noturna',        description: 'Fique acordado até as 22h' },
    firstTree:     { title: 'Madeira!',              description: 'Derrube sua primeira árvore' },
    lumberjack:    { title: 'Lenhador',              description: 'Derrube 50 árvores' },
    stoneBreaker:  { title: 'Quebra-Pedras',         description: 'Quebre 25 pedras' },
    firstBuild:    { title: 'Construtor',            description: 'Construa sua primeira estrutura' },
    firstPlant:       { title: 'Mão na Terra',        description: 'Plante sua primeira semente' },
    greenThumb:       { title: 'Dedo Verde',          description: 'Plante 50 sementes' },
    dedicatedPlanter: { title: 'Semeador Dedicado',   description: 'Plante 250 sementes' },
    firstHarvest:     { title: 'Primeira Colheita',   description: 'Colha sua primeira plantação' },
    bountifulHarvest: { title: 'Colheita Farta',      description: 'Colha 100 plantações' },
    harvestMaster:    { title: 'Mestre da Colheita',  description: 'Colha 500 plantações' },
    animalFriend:  { title: 'Amigo dos Animais',     description: 'Acaricie um animal pela primeira vez' },
    rancher:       { title: 'Fazendeiro',            description: 'Alimente animais 20 vezes' },
    firstCoin:     { title: 'Primeira Moeda',        description: 'Ganhe dinheiro pela primeira vez' },
    wealthyFarmer: { title: 'Fazendeiro Rico',       description: 'Tenha $5.000 de uma vez' },
    bigSpender:    { title: 'Gastão',                description: 'Gaste um total de $10.000' },
    hoarder:       { title: 'Acumulador',            description: 'Possua 50 itens únicos' },
    earlyBird:     { title: 'Madrugador',            description: 'Complete sua primeira noite de sono' },
    closeCall:     { title: 'Por um Fio',            description: 'Deixe uma necessidade chegar ao nível crítico' },
    survivor7:     { title: 'Sobrevivente',          description: 'Sobreviva 7 dias na fazenda' },
    // ── 40 conquistas adicionais ──
    treeHugger:       { title: 'Abraça-Árvore',        description: 'Derrube 100 árvores' },
    deforestation:    { title: 'Desmatamento',         description: 'Derrube 250 árvores' },
    rockSolid:        { title: 'Rocha Sólida',         description: 'Quebre 100 pedras' },
    quarryMaster:     { title: 'Mestre Pedreiro',      description: 'Quebre 250 pedras' },
    masterBuilder:    { title: 'Mestre Construtor',    description: 'Construa 25 estruturas' },
    fenceEnthusiast:  { title: 'Entusiasta de Cercas', description: 'Coloque 50 cercas' },
    wellDigger:       { title: 'Cavador de Poço',      description: 'Coloque seu primeiro poço' },
    firstHit:         { title: 'Primeiro Golpe',       description: 'Ataque um objeto pela primeira vez' },
    persistentHitter: { title: 'Implacável',           description: 'Ataque objetos 500 vezes' },
    thicketClearer:   { title: 'Limpador de Mato',     description: 'Limpe 10 arbustos' },
    petLover:         { title: 'Amante de Pets',       description: 'Acaricie animais 50 vezes' },
    animalWhisperer:  { title: 'Encantador de Animais', description: 'Acaricie animais 100 vezes' },
    firstShear:       { title: 'Primeira Tosquia',     description: 'Tosqueie um animal pela primeira vez' },
    firstCollect:     { title: 'Caçador de Ovos',      description: 'Colete um produto animal pela primeira vez' },
    feedingFrenzy:    { title: 'Frenesi Alimentar',    description: 'Alimente animais 100 vezes' },
    dedicatedCaretaker: { title: 'Cuidador Dedicado',  description: 'Interaja com animais 200 vezes' },
    pennyPincher:     { title: 'Pão-Duro',             description: 'Tenha $1.000 de uma vez' },
    tycoon:           { title: 'Magnata',              description: 'Tenha $25.000 de uma vez' },
    millionaire:      { title: 'Milionário',           description: 'Tenha $100.000 de uma vez' },
    firstPurchase:    { title: 'Primeira Compra',      description: 'Compre algo pela primeira vez' },
    generousSpender:  { title: 'Gastador Generoso',    description: 'Gaste um total de $50.000' },
    itemCollector10:  { title: 'Colecionador',         description: 'Possua 10 itens únicos' },
    itemCollector25:  { title: 'Entusiasta',           description: 'Possua 25 itens únicos' },
    discardKing:      { title: 'Faxina Geral',         description: 'Descarte 20 itens' },
    midnightWanderer: { title: 'Andarilho da Meia-Noite', description: 'Fique acordado até a meia-noite' },
    marathonRunner:   { title: 'Maratonista',          description: 'Ande 10.000 passos' },
    speedWalker:      { title: 'Caminhante Veloz',     description: 'Ande 50.000 passos' },
    worldTraveler:    { title: 'Viajante do Mundo',    description: 'Ande 200.000 passos' },
    weekOne:          { title: 'Uma Semana',           description: 'Alcance o dia 7' },
    monthOne:         { title: 'Um Mês',               description: 'Alcance o dia 30' },
    stormChaser:      { title: 'Caçador de Tempestades', description: 'Presencie uma tempestade' },
    fogWalker:        { title: 'Caminhante na Névoa',  description: 'Presencie um dia de névoa' },
    gourmet:          { title: 'Gourmet',              description: 'Consuma 50 itens' },
    foodie:           { title: 'Guloso',               description: 'Consuma 100 itens' },
    firstMeal:        { title: 'Primeira Refeição',    description: 'Coma ou beba algo pela primeira vez' },
    survivor30:       { title: 'Sobrevivente Mensal',  description: 'Sobreviva 30 dias na fazenda' },
    veteranFarmer:    { title: 'Fazendeiro Veterano',  description: 'Sobreviva 100 dias na fazenda' },
    ironWill:         { title: 'Vontade de Ferro',     description: 'Tenha as três necessidades em nível crítico' },
    toolMaster:       { title: 'Mestre das Ferramentas', description: 'Equipe ferramentas 10 vezes' },
    blizzardSurvivor: { title: 'Sobrevivente da Nevasca', description: 'Presencie uma nevasca' },
  },

  // Main Menu (legacy keys)
  menu: {
    play: 'Jogar',
    continue: 'Continuar',
    newGame: 'Novo Jogo',
    settings: 'Configurações',
    quit: 'Sair',
  },

  // Gallery
  gallery: {
    title: 'Galeria',
    newReward: 'Nova imagem enviada para a Galeria!',
    imageNotCreated: 'Imagem ainda n\u00e3o criada!',
    rewardSentToGallery: 'Esta recompensa foi enviada para sua Galeria!',
    noUnlockedImages: 'Nenhuma imagem desbloqueada ainda. Complete conquistas para ganhar recompensas!',
    photosEmpty: 'Nenhuma foto ainda.',
    notesEmpty: 'Nenhuma nota ainda.',
    screenshotsEmpty: 'Nenhuma captura de tela ainda.',
    tabs: {
      unlockedImages: 'Imagens Desbloqueadas',
      characters: 'Personagens',
      photos: 'Fotos',
      notes: 'Notas',
      screenshots: 'Capturas de Tela',
    },
  },

  // Main Menu Screen
  mainMenu: {
    subtitle: 'menu principal',
    play: 'Jogar',
    settings: 'Configurações',
    gallery: 'Galeria',
    achievements: 'Conquistas',
    credits: 'Créditos',
    feedback: 'Feedback',
    quit: 'Sair',
    newGame: 'Novo Jogo',
    loadGame: 'Carregar Jogo',
    back: 'Voltar',
    comingSoon: 'Em breve',
    galleryComingSoon: 'Sistema de galeria em breve!',
    achievementsComingSoon: 'Sistema de conquistas em breve!',
    feedbackComingSoon: 'Sistema de feedback em breve!',
    creditsText: 'FarmingXP \u2014 Feito por Gabriel Andrade :D\n\nAgradecimentos especiais a todos os apoiadores e jogadores incríveis que tornam este projeto possível!',
    quitMessage: 'Obrigado por jogar FarmingXP!',
  },

  // Categories (used across multiple systems)
  categories: {
    all: 'Todos',
    tools: 'Ferramentas',
    seeds: 'Sementes',
    construction: 'Construção',
    animal_food: 'Ração',
    food: 'Comida',
    resources: 'Recursos',
    animals: 'Animais',
    resource: 'Recurso',
    material: 'Materiais',
    // Issue #170: singular aliases that match `item.type` values directly,
    // used by callers that look up `categories.${item.type}` (craftingSystem,
    // merchant). Without these the console warns about missing translations.
    tool: 'Ferramenta',
    seed: 'Semente',
    crop: 'Colheita',
    medicine: 'Remédio',
    animal: 'Animal',
  },

  // Inventory System
  inventory: {
    title: 'Inventário',
    empty: 'Nada por aqui...',
    emptySubtext: 'Esta categoria está vazia',
    full: 'Inventário cheio!',
    noDescription: 'Sem descrição disponível.',
    categories: {
      tools: 'Ferramentas',
      seeds: 'Sementes',
      construction: 'Construção',
      animal_food: 'Ração',
      food: 'Comida',
      resources: 'Recursos',
      all: 'Todos'
    },
    actions: {
      equip: 'Equipar',
      unequip: 'Desequipar',
      consume: 'Consumir',
      discard: 'Descartar',
      build: 'Construir',
      use: 'Usar'
    },
    toolWheel: {
      empty: 'Nenhuma ferramenta no inventário'
    },
    seedWheel: {
      none: 'Sem semente',
      empty: 'Sem sementes no inventário'
    },
    wateringCanFull: 'Cheio de água',
    details: {
      sectionTitle: 'Informações técnicas',
      type: 'Tipo',
      toolType: 'Ferramenta',
      restores: 'Restaura',
      hunger: 'Fome',
      thirst: 'Sede',
      energy: 'Energia',
      acceptedBy: 'Aceito por',
      foodValue: 'Valor nutritivo',
      treats: 'Trata',
      cureMode: 'Cura',
      instant: 'Imediata',
      gradual: '{n} dias',
      dosesPerDay: 'Doses por dia',
      palatability: 'Sabor',
      palatable: 'Agradável',
      neutral: 'Neutro',
      bitter: 'Amargo',
      size: 'Tamanho',
      placeable: 'Construível',
      experimental: 'Em desenvolvimento',
      types: {
        tool: 'Ferramenta',
        seed: 'Semente',
        food: 'Comida',
        animal_food: 'Ração',
        medicine: 'Remédio',
        animal: 'Animal',
        resource: 'Recurso',
        crop: 'Colheita',
        construction: 'Construção'
      },
      diseases: {
        parasitosis: 'Verminose',
        respiratory: 'Respiratória',
        digestive: 'Digestiva',
        fever: 'Febre'
      }
    },
    confirmDiscard: 'Descartar {name}?',
    selectItem: 'Selecione um item'
  },

  // Player HUD
  player: {
    noCharacter: 'Sem personagem',
    level: 'Nível',
    xp: 'XP',
    hunger: 'Fome',
    thirst: 'Sede',
    energy: 'Energia',
    money: 'Dinheiro',
    health: 'Saúde',
    xpGain: '+{amount} XP',
    levelUp: 'Nível {level}!',
    levelUpSub: 'Você subiu de nível!',
  },

  // Trading/Merchant System
  trading: {
    title: 'Comércio',
    merchantsTitle: 'Mercadores da Região',
    buy: 'Comprar',
    sell: 'Vender',
    buying: 'Comprando',
    selling: 'Vendendo',
    quantity: 'Quantidade',
    price: 'Preço',
    total: 'Total',
    close: 'Fechar',
    backToMerchants: 'Voltar aos Mercadores',
    notEnoughMoney: 'Dinheiro insuficiente!',
    inventoryFull: 'Inventário cheio ou erro ao adicionar item.',
    purchaseSuccess: 'Compra realizada! -{value}',
    saleSuccess: 'Venda realizada! +{value}',
    merchantFund: 'Caixa: ${amount}',
    merchantNoFunds: 'O mercador só tem ${amount} hoje.',
    confirm: 'Confirmar',
    open: 'Aberto',
    closed: 'Fechado',
    opensAt: 'Abre às {time}',
    closesAt: 'Fecha às {time}',
    statusUnknown: 'Status desconhecido',
    closedDayOff: 'Fechado ({day} é folga{nextDay})',
    reopens: ', reabre {day}',
    notOpenYet: 'Ainda não abriu (Abre às {time})',
    alreadyClosed: 'Já fechou (Fechou às {time})',
    openUntil: 'Aberto - Fecha às {time}',
    isClosed: '{name} está fechado',
    merchantClosed: '{name} fechou. Volte durante o horário de funcionamento.',
    specialties: 'Especialidades',
    empty: 'Vazio',
    buyMode: 'Modo de compra ativo. Selecione um item do mercador.',
    sellMode: 'Modo de venda ativo. Selecione um item do seu inventário.',
    selected: 'Selecionado: {name} ({qty}x) - {action}: {price} cada',
    confirmSell: 'Vender {qty}x {name} por {value}?',
    confirmBuy: 'Comprar {qty}x {name} por {value}?',
    removeError: 'Erro ao remover item do inventário.',
    storageNotImplemented: 'Venda/Compra direta do armazém não implementada.',
    itemNotFound: 'Item não encontrado no mercador.',
    invalidBuyValue: 'Valor de compra inválido.',
    professions: {
      materialsSeller: 'Vendedor de Materiais',
      cook: 'Cozinheira',
      livestock: 'Pecuária'
    },
    descriptions: {
      thomas: 'Dono da loja de materiais de construção.',
      lara: 'Vende refeições e ingredientes.',
      rico: 'Vende sementes, ração e animais.'
    },
    specialtiesLabels: {
      resources: 'Recursos',
      tools: 'Ferramentas',
      construction: 'Construção',
      food: 'Comida',
      ingredients: 'Ingredientes',
      meals: 'Refeições',
      seeds: 'Sementes',
      animals: 'Animais'
    }
  },

  // Time and Calendar
  time: {
    weekdays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
    day: 'Dia {day}',
    dayLabel: 'dia',
    seasonLabel: 'estação',
    weatherLabel: 'clima',
    morning: 'Manhã',
    afternoon: 'Tarde',
    evening: 'Noite',
    night: 'Madrugada',
    sleeping: 'Dormindo profundamente: Dia {fromDay} → Dia {toDay} ({weekday})',
    wait: 'Aguarde...',
    sleepZzz: 'Zzz...'
  },

  // Seasons
  seasons: {
    spring: 'Primavera',
    summer: 'Verão',
    autumn: 'Outono',
    winter: 'Inverno'
  },

  // Weather Conditions
  weather: {
    conditions: {
      clear: 'Limpo',
      rain: 'Chuva',
      storm: 'Tempestade',
      fog: 'Neblina',
      snow: 'Neve',
      blizzard: 'Nevasca'
    }
  },

  // Tools
  tools: {
    axe: 'machado',
    pickaxe: 'picareta',
    machete: 'facão',
    hoe: 'enxada',
    wateringCan: 'regador',
    scythe: 'foice'
  },

  // Items (common ones) - legacy keys
  items: {
    wood: 'Madeira',
    stone: 'Pedra',
    wheat: 'Trigo',
    carrot: 'Cenoura',
    fence: 'Cerca',
    well: 'Poço',
    corn: 'Milho',
    tomato: 'Tomate',
    potato: 'Batata',
    seeds: 'Sementes',
    hay: 'Feno'
  },

  // Item names by ID - para tradução dinâmica
  itemNames: {
    0: 'Tesoura de jardinagem',
    1: 'Enxada',
    2: 'Martelo',
    3: 'Semente de Milho',
    4: 'Semente de Trigo',
    5: 'Maçã',
    6: 'Pão',
    7: 'Ração para Galinha',
    8: 'Ração para Ovelha',
    9: 'Madeira Bruta',
    10: 'Pedra',
    11: 'Foice',
    12: 'Regador',
    13: 'Picareta',
    14: 'Machado',
    15: 'Rastelo',
    16: 'Balde',
    124: 'Semente de Cenoura',
    18: 'Semente de Tomate',
    19: 'Semente de Batata',
    20: 'Semente de Morango',
    21: 'Semente de Flores',
    22: 'Machete',
    23: 'Queijo',
    24: 'Ovo Cozido',
    25: 'Torta de Maçã',
    26: 'Sopa de Legumes',
    27: 'Mel',
    28: 'Suco de Fruta',
    29: 'Feno',
    30: 'Ração para Vaca',
    31: 'Petisco para Animais',
    32: 'Tijolos',
    33: 'Telhas',
    34: 'Prego',
    35: 'Corda',
    36: 'Vidro',
    37: 'Ferro',
    40: 'Garrafa vazia',
    53: 'Semente de Árvore',
    54: 'Fibra Vegetal',
    55: 'Argila',
    56: 'Carvão',
    57: 'Lasca de Madeira',
    58: 'Tábua de Madeira',
    59: 'Farinha de Trigo',
    60: 'Ovo',
    61: 'Leite',
    62: 'Lã',
    63: 'Milho',
    64: 'Trigo',
    125: 'Cenoura',
    68: 'Morango',
    69: 'Baú de Armazenamento',
    71: 'Milho Assado',
    72: 'Salada de Frutas',
    73: 'Barra de Ferro',
    76: 'Haste de Madeira',
    43: 'Cerca de Madeira',
    49: 'Tecido de Lã',
    93: 'Poço de Água',
    94: 'Bateria',
    100: 'Contrato Municipal',
    103: 'Cocho de Água',
    104: 'Cocho de Ração (Gado/Ovelha)',
    105: 'Cocho de Ração (Suínos)',
    106: 'Cocho de Ração (Aves)',
    // Planting items (sementes + colheitas + pratos) — paridade EN/ES/PT
    66: 'Tomate',
    67: 'Batata',
    107: 'Grão de Feno',
    109: 'Feno Colhido',
    110: 'Semente de Pepino',
    111: 'Pepino',
    112: 'Muda de Abacaxi',
    113: 'Abacaxi',
    114: 'Semente de Matinho',
    115: 'Matinho',
    116: 'Semente de Girassol',
    117: 'Girassol',
    118: 'Semente de Abóbora',
    119: 'Abóbora',
    120: 'Semente de Brócolis',
    121: 'Brócolis',
    122: 'Semente de Beterraba',
    123: 'Beterraba',
    126: 'Semente de Uva',
    127: 'Uva',
    128: 'Semente de Pimentinha',
    129: 'Pimentinha',
    130: 'Semente de Pimentão',
    131: 'Pimentão',
    132: 'Semente de Couve-Flor',
    133: 'Couve-Flor',
    134: 'Salada Campestre',
    135: 'Sopa de Abóbora',
    136: 'Salada Tropical',
    // Itens diversos sem tradução prévia (materiais, decorações, rações, quest)
    41: 'Garrafa com Água',
    42: 'Balde com Água',
    44: 'Vaso de Flores',
    45: 'Lampião',
    46: 'Banco de Jardim',
    47: 'Sinalização',
    48: 'Linha',
    50: 'Tinta',
    51: 'Cola',
    52: 'Kit de Reparos',
    74: 'Placa de Metal',
    75: 'Parafuso',
    95: 'Garrafa de Leite Fresco',
    96: 'Grãos para Aves',
    97: 'Milho Moído e Farelo de Soja',
    98: 'Ração de Qualidade',
    // Remédios veterinários (ids 200-207)
    200: 'Vermífugo Rápido',
    201: 'Vermífugo Comum',
    202: 'Antibiótico Premium',
    203: 'Xarope Caseiro',
    204: 'Antiácido Veterinário',
    205: 'Probiótico em Pó',
    206: 'Antitérmico Forte',
    207: 'Chá Medicinal',
    // Animais vendidos pelo Rico / painel do cercado (ids 300-308)
    300: 'Pintinho',
    301: 'Cordeiro',
    302: 'Leitão',
    303: 'Bezerro',
    304: 'Vaca',
    305: 'Ovelha',
    306: 'Peru',
    307: 'Galo',
    308: 'Touro',
    309: 'Galinha'
  },

  // Recipe names by ID - para tradução dinâmica
  recipeNames: {
    wood_scrap: 'Lasca de Madeira (Lenha)',
    wood_plank: 'Tábua de Madeira',
    wooden_rod: 'Haste de Madeira',
    rope: 'Corda Simples',
    charcoal: 'Carvão',
    iron_bar: 'Barra de Ferro',
    nail: 'Prego',
    clay_brick: 'Tijolo de Argila',
    wool_fabric: 'Tecido de Lã',
    axe: 'Machado',
    pickaxe: 'Picareta',
    hoe: 'Enxada',
    scythe: 'Foice',
    wooden_fence: 'Cerca de Madeira',
    storage_chest: 'Baú de Armazenamento',
    well: 'Poço de Água',
    wheat_flour: 'Farinha de Trigo',
    simple_bread: 'Pão Simples',
    roasted_corn: 'Milho Assado',
    cheese: 'Queijo',
    boiled_egg: 'Ovo Cozido',
    fruit_salad: 'Salada de Frutas',
    animal_feed_basic: 'Ração Básica (Feno)',
    animal_treat: 'Petisco Animal',
    cattle_food_trough: 'Cocho de Ração (Gado/Ovelha)',
    pork_food_trough: 'Cocho de Ração (Suínos)',
    bird_food_trough: 'Cocho de Ração (Aves)'
  },

  // General Messages
  messages: {
    loading: 'iniciando...',
    preparingFarm: 'Preparando sua fazenda...',
    gameSaved: 'Jogo salvo!',
    gameLoaded: 'Jogo carregado!',
    itemAdded: '{item} adicionado ao inventário',
    itemRemoved: '{item} removido do inventário',
    levelUp: 'Subiu de nível!',
    lowHunger: 'Você está com fome!',
    lowThirst: 'Você está com sede!',
    lowEnergy: 'Você está cansado!',
    goodMorning: 'Bom dia! Energias renovadas.',
    languageChangeFailed: 'Falha ao trocar idioma. Tente novamente.'
  },

  // Settings
  settings: {
    title: '⚙️ Configurações',
    language: 'Idioma',
    sound: 'Som',
    music: 'Música',
    volume: 'Volume',
    fullscreen: 'Tela Cheia',
    save: 'Salvar',
    cancel: 'Cancelar',
    graphics: 'Gráficos',
    accessibility: 'Acessibilidade',
    highContrast: 'Alto contraste',
    reducedMotion: 'Reduzir animações',
    textSize: 'Tamanho do texto',
    textNormal: 'Normal',
    textLarge: 'Grande',
    textExtraLarge: 'Extra Grande',
    screenReader: 'Anúncios para leitor de tela',
    colorVision: 'Modo de visão de cor',
    cvOff: 'Desligado',
    cvProtanopia: 'Protanopia (vermelho-verde)',
    cvDeuteranopia: 'Deuteranopia (verde-vermelho)',
    cvTritanopia: 'Tritanopia (azul-amarelo)',
    cvAchromatopsia: 'Acromatopsia (sem cores)',
    audio: {
      title: 'Som',
      musicVolume: 'Volume da Música',
      musicVolumeHint: 'Ajuste o volume da música de fundo.',
      ambientVolume: 'Volume Ambiente',
      ambientVolumeHint: 'Sons do ambiente: pedra, madeira, construção, clima.',
      animalVolume: 'Volume dos Animais',
      animalVolumeHint: 'Sons dos animais: mugido, cacarejo, etc.',
    },
    controls: {
      title: 'Controles',
      remap: 'Remapear teclas',
      remapHint: 'Personalize as teclas do teclado (WASD, setas, atalhos).',
      openRemap: 'Abrir',
      remapTitle: 'Remapear teclas',
      remapSubtitle: 'Clique em uma tecla para trocar. ESC cancela.',
      pressKey: 'Pressione uma tecla… (ESC cancela, Backspace apaga o secundário)',
      reset: 'Padrão'
    }
  },

  // Controls - Añadidas desde settingsUI.js
  controls: {
    moveUp: {
      label: 'Mover para cima',
      desc: 'Andar para cima'
    },
    moveDown: {
      label: 'Mover para baixo',
      desc: 'Andar para baixo'
    },
    moveLeft: {
      label: 'Mover para esquerda',
      desc: 'Andar para esquerda'
    },
    moveRight: {
      label: 'Mover para direita',
      desc: 'Andar para direita'
    },
    interact: {
      label: 'Interagir',
      desc: 'Interação / usar'
    },
    toolWheel: {
      label: 'Trocar ferramenta',
      desc: 'Segure para abrir o seletor de ferramentas; solte para equipar'
    },
    inventory: {
      label: 'Inventário',
      desc: 'Abrir/fechar inventário'
    },
    merchants: {
      label: 'Mercadores',
      desc: 'Abrir/fechar mercadores'
    },
    config: {
      label: 'Configurações',
      desc: 'Abrir/fechar configurações'
    },
    help: {
      label: 'Ajuda',
      desc: 'Abrir/fechar atalhos'
    },
    // Issue #170: human-readable tool type names (toolType field on items).
    // Shown on the inventory details panel as "Type: Axe" etc.
    toolTypes: {
      shears: 'Tesoura',
      hoe: 'Enxada',
      hammer: 'Martelo',
      scythe: 'Foice',
      watering_can: 'Regador',
      pickaxe: 'Picareta',
      axe: 'Machado',
      rake: 'Rastelo',
      bucket: 'Balde',
      machete: 'Machete'
    }
  },

  // Actions
  actions: {
    interact: 'Interagir',
    pickup: 'Pegar',
    use: 'Usar',
    drop: 'Largar',
    eat: 'Comer',
    drink: 'Beber',
    build: 'Construir',
    destroy: 'Destruir',
    sleep: 'Dormir',
    harvest: 'Colher',
    plant: 'Plantar',
    water: 'Regar',
    feed: 'Alimentar'
  },

  // Farm Buildings
  buildings: {
    farmhouse: 'Casa da Fazenda',
    barn: 'Celeiro',
    coop: 'Galinheiro',
    silo: 'Silo',
    well: 'Poço',
    fence: 'Cerca',
    gate: 'Portão'
  },

  // Animals
  animals: {
    bull: 'Touro',
    calf: 'Bezerro',
    chick: 'Pintinho',
    chicken: 'Galinha',
    pig: 'Porco',
    cow: 'Vaca',
    pig: 'Porco',
    sheep: 'Ovelha',
    goat: 'Cabra',
    horse: 'Cavalo'
  },

  // Animal UI Panel
  animal: {
    ui: {
      actions: 'Ações',
      info: 'Info',
      interactions: 'Interações'
    },
    actions: {
      pet: 'Acariciar',
      guide: 'Guiar',
      unguide: 'Parar de Guiar',
      feed: 'Alimentar',
      collect: 'Coletar',
      close: 'Fechar'
    },
    stats: {
      hunger: 'Fome',
      thirst: 'Sede',
      morale: 'Moral',
      mood: 'Humor',
      hungerTip:  'Fome — alimentar com ração restaura. Abaixo de 30 fica faminto.',
      thirstTip:  'Sede — bebe na fonte/poço. Cai mais rápido em dias quentes.',
      moraleTip:  'Moral — afeta produção e disposição. Sobe com carinho e cuidado.',
    },
    mood: {
      sleeping: 'Dormindo',
      hurt: 'Machucado',
      suspicious: 'Desconfiado',
      angry: 'Irritado',
      sad: 'Triste',
      hungry: 'Faminto',
      needy: 'Carente',
      calm: 'Calmo'
    },
    feedback: {
      pet_ok: 'Gostou do carinho!',
      gained_trust: 'Ganhou confiança!',
      sleeping: 'Está dormindo... Zzz',
      suspicious_flee: 'Se afastou, desconfiado...',
      angry: 'Muito irritado para carinho!',
      max_pets: 'Já recebeu carinho suficiente hoje.',
      fed: 'Se alimentou!',
      no_food: 'Sem ração no inventário!',
      failed_remove_food: 'Não foi possível retirar a ração do inventário.',
      wrong_food: 'Esse alimento não serve pra essa espécie!',
      suspicious: 'Desconfiado demais para comer...',
      no_inventory: 'Inventário indisponível.',
      severe_refused: 'Não quer te seguir agora...',
      guide_start: 'Vai te seguir!',
      guide_stop: 'Parou de te seguir.',
      medicine_accept: 'Tomou o remédio sem reclamar.',
      medicine_mild_reject: 'Fez careta, mas tomou.',
      medicine_reject: 'Detestou o remédio!',
      medicine_cured: 'Curado! ✨',
      not_medicine: 'Esse item não é um remédio.',
      // Mensagens do botão Coletar (mirror das chaves animal.production.*)
      collected: 'Coletou!',
      not_ready: 'Nada pra coletar.',
      needs_tool: 'Precisa de ferramenta.',
      inventory_full: 'Inventário cheio.',
      no_production_system: 'Sistema indisponível.'
    },
    feedSub: {
      title: 'Alimentar',
      medicinesTitle: 'Remédios',
      feed: 'Ração',
      medicine: 'Remédios',
      back: 'Voltar',
      empty: 'Nenhum remédio no inventário.',
      emptyFood: 'Nenhum alimento no inventário.',
      wrongFoodHint: 'Esta comida não serve pra esta espécie',
    },
    type: {
      unknown: 'Desconhecido'
    },
    injury: {
      label: 'Sintoma',
      none: 'Saudável',
      severity: {
        scratch: 'Arranhão',
        wound: 'Ferida',
        severe: 'Ferimento grave'
      },
      // Já com preposição correta (concordância de gênero/número em PT).
      region: {
        head: 'na cabeça',
        leg: 'na perna',
        back: 'nas costas',
        chest: 'no peito',
        tail: 'na cauda'
      },
      format: '{severity} {region}'
    },
    disease: {
      unknown: '?',
      names: {
        parasitosis: 'Verminose',
        respiratory: 'Problema respiratório',
        digestive:   'Problema digestivo',
        fever:       'Febre'
      }
    },
    treatment: {
      label: 'Tratamento',
      format: '{icon} {name} · {days}/{requiredDays} dias · {dosesToday}/{requiredDoses} doses hoje'
    },
    // Produção (milk/wool/egg) — feedback de coleta no UiPanel/toasts
    production: {
      collected: '{name} coletado!',
      notReady: 'Nada pra coletar',
      needsTool: 'Precisa de ferramenta',
      inventoryFull: 'Inventário cheio',
      noInventory: 'Sem inventário',
      sleeping: 'Dormindo 💤',
    },
    // Aging / ciclo de vida — toast flutuante quando avança de estágio
    aging: {
      stage: {
        young:   'Filhote',
        adult:   'Adulto',
        mature:  'Maduro',
        elderly: 'Idoso',
      },
      toast: {
        adult:   '✨ Cresceu!',
        mature:  '✨ Maturou!',
        elderly: '✨ Envelheceu',
      }
    },
    // Tumba / memorial — quando animal morre de velhice, tumba aparece
    // no lugar e clique abre card com os dados.
    tomb: {
      title: 'In Memoriam',
      lived: 'Viveu {days} dia(s)',
      farewell: 'Despedir-se',
      close: 'Fechar',
      species: 'Espécie',
      lastWords: 'Últimas palavras',
    }
  },

  // Crops
  crops: {
    wheat: 'Trigo',
    corn: 'Milho',
    carrot: 'Cenoura',
    potato: 'Batata',
    tomato: 'Tomate',
    pumpkin: 'Abóbora',
    cabbage: 'Repolho'
  },

  // UI Elements
  ui: {
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    yes: 'Sim',
    no: 'Não',
    ok: 'OK',
    close: 'Fechar',
    back: 'Voltar',
    next: 'Próximo',
    previous: 'Anterior',
    save: 'Salvar',
    load: 'Carregar',
    delete: 'Deletar',
    new: 'Novo',
    merchants: 'Mercadores da Região',
    commerce: 'Comércio',
    inventory: 'Inventário',
    storage: 'Armazém',
    backToMerchants: 'Voltar aos Mercadores',
    otherSettings: 'Outras configurações em desenvolvimento...',
    inventoryTab: 'Inventário',
    storageTab: 'Armazém',
    inventoryNotAvailable: '🎒 Sistema de inventário não disponível',
    done: 'Concluir',
    minimapToggle: 'Alternar minimapa (M)',
    click: 'clique',
    rightClick: 'clique dir',
  },

  // HUD Action Buttons - MODIFICADO: usando marcadores dinâmicos {key}
  hud: {
    saveTooltip: 'Salvar / Carregar (💾)',
    settingsTooltip: 'Configurações ({key})',
    inventoryTooltip: 'Inventário ({key})',
    commerceTooltip: 'Comércio ({key})',
    helpTooltip: 'Atalhos ({key})'
  },

  // Tutorials/Help
  help: {
    movement: 'Use WASD ou setas para mover',
    interact: 'Pressione E para interagir',
    inventory: 'Pressione I para abrir inventário',
    pause: 'Pressione ESC para pausar',
    doorHint: 'Pressione <strong>E</strong> para acessar a casa'
  },

  // Character Selection
  characterSelection: {
    title: 'FarmingXP',
    subtitle: 'Selecione seu personagem para começar',
    startGame: 'Iniciar Jogo',
    continueAdventure: 'Ou continue sua aventura',
    loadGame: 'Carregar Jogo Salvo',
    inDevelopment: 'Em Desenvolvimento',
    onlyStellaAvailable: 'Apenas a Stella está disponível no momento!',
    selectStellaToPlay: 'Selecione a Stella para jogar.',
    selectCharacterFirst: 'Por favor, selecione um personagem primeiro.',
    saveNotAvailable: 'Sistema de save não disponível. Iniciando novo jogo.',
    redirecting: 'Apenas a Stella está disponível. Redirecionando...',
    subtitles: {
      stella: 'A jovem fazendeira',
      ben: 'O fazendeiro esperto',
      graham: 'O braço da agricultura',
      default: 'Fazendeiro'
    },
    descriptions: {
      stella: 'Aventureira e corajosa, Stella cresceu na fazenda da família e conhece todos os segredos da vida rural.',
      ben: 'Um cara pequeno com um grande cérebro! O técnico dos computadores nos campos.',
      graham: 'Um cara grande, destemido, sério e protetor, o melhor para o trabalho no campo.'
    },
    noSavesFound: 'Nenhum save encontrado. Selecione um personagem para começar.',
    saveSystemError: 'Erro ao acessar sistema de saves.'
  },

  // House System
  house: {
    title: 'Minha Casa',
    enter: 'Entrar em Casa',
    sleep: 'Dormir',
    crafting: 'Crafting',
    storage: 'Armazém',
    customize: 'Customizar',
    close: 'Fechar',
    entering: 'Entrando na casa...',
    craftingNotAvailable: 'Sistema de crafting não disponível',
    customizeNotImplemented: 'Customização ainda não implementada',
    saveGame: 'Salvar Jogo',
    loadGame: 'Carregar Jogo',
    saveNotAvailable: 'Sistema de save não disponível'
  },

  // Storage System
  storage: {
    title: 'Armazém',
    withdraw: 'Retirar Itens',
    deposit: 'Depositar Itens',
    items: 'itens',
    value: 'valor',
    stacks: 'stacks',
    mode: 'modo',
    withdrawMode: 'retirar',
    depositMode: 'depositar',
    withdrawBtn: 'retirar ({qty})',
    depositBtn: 'depositar ({qty})',
    emptyCategory: 'Sem itens nesta categoria',
    insufficientQuantity: 'Quantidade insuficiente no inventário',
    invalidCategory: 'Categoria inválida',
    storageFull: 'Armazém de {category} cheio',
    deposited: 'Depositado: {qty}x {name}',
    itemNotFound: 'Item não encontrado no armazém',
    withdrawn: 'Retirado: {qty}x {name}',
    inventoryFull: 'Inventário cheio',
    syncError: 'Erro de sincronia com inventário'
  },

  // Chest System
  chest: {
    title: 'Baú',
    storage: 'Armazenamento do Baú',
    inventory: 'Seu Inventário',
    takeAll: 'Pegar Tudo',
    storeAll: 'Guardar Tudo',
    organize: 'Organizar',
    empty: 'O baú está vazio',
    stored: '{name} guardado no baú',
    taken: '{name} retirado do baú',
    takenAll: '{count} itens retirados do baú',
    storedAll: '{count} itens guardados no baú',
    organized: 'Baú organizado!',
    notFound: 'Baú não encontrado!',
    categoryFull: 'Categoria {category} cheia no baú!'
  },

  // Well System
  well: {
    backpack: 'Mochila',
    actions: 'Ações',
    drink: 'Beber',
    collect: 'Coletar',
    fillBottle: 'Encher garrafa',
    fillWateringCan: 'Encher regador',
    noWateringCan: 'Você precisa de um regador',
    well: 'Poço',
    lowerBucket: 'Descer balde',
    insufficientWater: 'Água insuficiente no poço',
    playerNotAvailable: 'Sistema do jogador não disponível',
    noEmptyBottle: 'Nenhuma garrafa vazia no inventário',
  },

  // Water Trough (Cocho)
  foodTrough: {
    needFeed: 'Precisa de ração compatível no inventário',
    needPremium: 'Sem ração especial (Petisco / Ração de Qualidade)',
    filled: 'Cocho abastecido com {feed}',
    premiumFilled: 'Cocho temperado com {feed}',
    alreadyFull: 'Cocho de ração já está cheio',
    premiumFull: 'Barra especial já está cheia',
    systemUnavailable: 'Sistema não disponível',
    panel: {
      title: 'Cocho de Ração',
      close: 'Fechar',
      levelName: 'Nível de ração',
      premiumName: 'Tempero especial',
      feedsLabel: 'Rações no inventário:',
      addBtn: 'Adicionar ração',
      addPremiumBtn: 'Adicionar especial',
      fedSuccess: 'Ração adicionada',
      premiumSuccess: 'Especial adicionado',
    },
  },
  waterTrough: {
    needBucket: 'Precisa de um balde com água',
    filled: 'Cocho abastecido',
    alreadyFull: 'Cocho já está cheio',
    panel: {
      title: 'Cocho de Água',
      close: 'Fechar',
      addBtn: 'Adicionar água',
      levelName: 'Nível de água',
    },
  },

  // Crafting System
  crafting: {
    title: 'Crafting',
    craft: 'Criar',
    crafting: 'Craftando...',
    crafted: 'Craftado: {name}!',
    craftError: 'Erro ao craftar!',
    ingredients: 'Ingredientes',
    result: 'Resultado',
    notEnoughMaterials: 'Faltam materiais!',
    success: 'Item criado com sucesso!',
    recipes: 'Receitas',
    missing: 'Faltando'
  },

  // Save Slots UI
  saveSlots: {
    titleSaveLoad: 'Salvar / Carregar',
    titleSave: 'Salvar Jogo',
    titleLoad: 'Carregar Jogo',
    slotNumber: 'Slot {number}',
    empty: 'Vazio',
    active: 'Ativo',
    noSaveInSlot: 'Nenhum save neste slot',
    createSave: 'Criar Save',
    character: 'Personagem:',
    totalTime: 'Tempo Total:',
    createdAt: 'Criado em:',
    lastSave: 'Último save:',
    lastSession: 'Última sessão:',
    play: 'Jogar',
    save: 'Salvar',
    saveName: 'Nome do save:',
    defaultName: 'Save {number}',
    newName: 'Novo nome:',
    createSuccess: 'Save criado com sucesso!',
    createError: 'Erro ao criar save',
    loadError: 'Erro ao carregar save',
    loading: 'Carregando save...',
    applying: 'Aplicando dados...',
    applyError: 'Erro ao aplicar save',
    ready: 'Pronto!',
    loadSuccess: 'Save carregado!',
    confirmOverwrite: 'Sobrescrever "{name}"?\nIsso não pode ser desfeito.',
    overwriteSuccess: 'Save atualizado!',
    saveError: 'Erro ao salvar',
    emptyNameError: 'Nome não pode ser vazio',
    renameSuccess: 'Save renomeado!',
    renameError: 'Erro ao renomear',
    confirmDelete: 'Deletar "{name}"?\nIsso não pode ser desfeito!',
    deleteSuccess: 'Save deletado',
    deleteError: 'Erro ao deletar'
  },

  // Sleep / Loading Screen
  sleep: {
    title: 'Repouso Restaurador',
    progress: 'Progresso',
    fallingAsleep: 'Adormecendo...',
    closingEyes: 'Fechando os olhos...',
    cache: 'Cache',
    memory: 'Memória',
    waiting: 'Aguardando...',
    worldQuiet: 'O mundo fica silencioso',
    deepSleep: 'Sono Profundo',
    recoveringEnergy: 'Recuperando energia...',
    cleaning: 'Limpando...',
    analyzing: 'Analisando...',
    optimizing: 'Otimizando',
    reorganizing: 'Reorganizando pensamentos...',
    freeing: 'Liberando...',
    compacting: 'Compactando...',
    almostThere: 'Quase lá',
    sunRising: 'O sol está nascendo...',
    clean: 'Limpo',
    optimized: 'Otimizado',
    awakening: 'Despertando',
    goodMorning: 'Bom dia!',
    ready: 'Pronto'
  },

  // Loading Screen
  loading: {
    preparingFarm: 'Preparando sua fazenda...'
  },

  // Build System
  build: {
    mode: 'Modo Construção',
    gridX: 'grade x: esq | cen | dir',
    gridY: 'grade y: baixo | cen | cima',
    rotate: 'rotacionar (variante)',
    place: 'posicionar',
    exit: 'sair do modo construção',
    alignment: 'alinhamento',
    alignLeft: 'esq',
    alignCenter: 'cen',
    alignRight: 'dir',
    alignTop: 'topo',
    alignBottom: 'baixo',
    notBuildable: 'item não é construível',
    building: 'construindo: {name}',
    systemError: 'erro de sistema (theWorld)',
    itemEmpty: 'acabou o item!',
    chestPlaced: 'baú colocado! ({remaining} restante)',
    chestError: 'erro ao adicionar baú',
    chestFailed: 'falha ao colocar baú',
    chestLoading: 'sistema de baús carregando...',
    wellPlaced: 'poço colocado! ({remaining} restante)',
    wellError: 'erro ao colocar poço',
    wellLoading: 'sistema de poços carregando...',
    placed: 'colocado! ({remaining} restante)',
    placeError: 'erro ao colocar objeto',
    worldNotAvailable: 'erro: theWorld.addWorldObject não disponível',
    variant: 'variante: {name}',
    notAvailable: 'Função de construção não disponível.',
    notAvailableAfter: 'Função de construção não disponível após carregar.',
    buildError: 'Erro ao entrar no modo de construção. Verifique o console.',
    // Novas adições do sistema Q + pickup (cercado)
    emptyHint: 'Modo construção — Q troca item, clique pega cerca',
    pickedUp: 'Pegou cerca (×{qty}) — clique pra colocar',
    pickupEmpty: 'Sem cercas pra colocar',
    itemLabel: 'Item: {name}',
    emptyItem: '(vazio)',
    fenceName: 'Cerca',
    fenceNamePickup: 'Cerca (pega)',
    fenceNameFree: 'Cerca (modo livre)',
    // Labels do help panel reformulado (subpos virou no-op)
    cycle: 'trocar item',
    placeClick: 'colocar peça',
    pickClick: 'pegar cerca',
    tipTitle: '💡 Dica',
    tipText: 'Alinhe as cercas pelos conectores (pontos nos cantos). Quando todas ficam verdes e o cercado fecha, aparece um "+" marrom no centro — clique nele pra escolher os animais.',
  },

  // Painel de cercado (clique no "+" no centro de um cercado fechado)
  enclosure: {
    panel: {
      title: 'Cercado — escolher animal',
      close: 'Fechar',
      speciesCount: 'Espécies: {count} / {max}',
      balance: 'Saldo: {value}',
      empty: 'Nenhum animal disponível no catálogo.',
      addBtn: 'Adicionar',
      priceFormat: 'R$ {value}',
      cardMeta: '{price} · {count} no cercado',
      speciesLimitTitle: 'Limite de {max} espécies atingido',
      noMoneyTitle: 'Saldo insuficiente',
      toast: {
        added: '{name} adicionado!',
        speciesLimit: 'Limite de {max} espécies diferentes neste cercado.',
        noMoney: 'Saldo insuficiente ({price}).',
        noEnclosure: 'Cercado não encontrado.',
        noAssetName: 'Animal sem nome de asset.',
        noAsset: 'Asset do animal não carregado.',
        noCells: 'Cercado sem células interiores.',
        noWorld: 'Mundo indisponível.',
        noCurrencySystem: 'Sistema de moeda indisponível.',
        respawnFailed: 'Falha ao spawnar o animal.',
        generic: 'Falha ({reason}).',
      },
    },
  },

  // Quests
  quests: {
    title: 'Missões',
    noQuests: 'Nenhuma missão disponível.',
    tabActive: 'Em andamento',
    tabCompleted: 'Concluídas',
    noActiveQuests: 'Nenhuma missão em andamento.',
    noCompletedQuests: 'Nenhuma missão concluída.',
    status: {
      available: 'Disponível',
      active: 'Em andamento',
      completed: 'Concluída',
    },
    bartolomeu: {
      title: 'Ajudar a Cidade',
      description: 'Junte R$ 1.000 e entregue ao Bartolomeu para ajudar a cidade de Capa de Ganso.',
    },
    milly: {
      title: 'Encontrar Madalena',
      description: 'Encontre a gatinha Madalena que fugiu para a fazenda e devolva-a para Milly.',
    },
    johnMilk: {
      title: 'Leite para a família',
      description: 'Leve um pouco de leite fresco para o John. A Isabela tá reclamando que a geladeira tá vazia.',
    },
    lucasSecret: {
      title: 'Projeto secreto do Lucas',
      description: 'Lucas precisa de 3 parafusos e 5 madeiras para um projeto escondido do pai.',
      progress: 'Materiais coletados:\nPregos: {screws}/{screwsNeed}\nMadeira: {wood}/{woodNeed}',
      ready: 'Você já tem tudo que o Lucas pediu — pode entregar pra ele!',
    },
    tutorial: {
      firstMeeting: {
        title: 'Se apresentar',
        description: 'Vá até a cidade e puxe assunto com alguém — seu avô falava bem do John.',
      },
      petAnimal: {
        title: 'Carinho de gente',
        description: 'Faça carinho em 1 animal da fazenda.',
      },
      nameAnimal: {
        title: 'Batismo',
        description: 'Dê um nome pra 1 animal da fazenda.',
      },
      exploreCity: {
        title: 'Além da cerca',
        description: 'Conheça Cabo Ganso — atravesse o portal da picape.',
      },
      storeItem: {
        title: 'Arrume a casa',
        description: 'Guarde 1 item no armazém da casa.',
      },
    },
    fixPickup: {
      title: 'Consertar a Picape',
      description: 'A picape verde está quebrada. Encontre uma bateria no armazém para consertá-la e desbloquear a viagem para a cidade.',
      bubbleNotRepaired: 'hmm... preciso consertar essa picape...',
      bubbleNoBattery: 'Preciso de uma bateria para consertar... acho que vi uma no armazém.',
      bubbleRepairing: 'Instalando a bateria na picape...',
      bubbleRepaired: 'Picape consertada! Agora posso viajar para a cidade!',
      batteryHint: 'Pressione E para pegar a bateria',
      batteryPickedUp: 'Peguei a bateria! Agora preciso levá-la até a picape.',
    },
    travelMap: {
      title: '🗺️ Mapa da Cidade',
      currentBadge: '📍 Você está aqui',
      close: 'Fechar',
      closeHint: 'Pressione ESC para fechar',
      legend: {
        player: 'Você (jogador)',
        current: 'Local atual',
        destinations: 'Destinos',
        gas: 'Posto de gasolina',
        blocked: 'Área bloqueada',
      },
      locations: {
        farm:           { name: 'Fazenda',          desc: 'Cultivo & Colheita' },
        city:           { name: 'Bairro/Cidade',    desc: 'Centro urbano' },
        slaughterhouse: { name: 'Abatedouro',       desc: 'Processamento' },
        vet:            { name: 'Veterinário',      desc: 'Cuidados animais' },
        blocked:        { name: 'Área Desconhecida', desc: 'Indisponível' },
      },
      ariaTravel: 'Clique para viajar',
      ariaBlocked: 'Bloqueado',
      fuel: {
        label: 'Combustível',
      },
      popup: {
        ok: 'OK',
        yes: 'Sim',
        no: 'Não',
        arrived: 'Você viajou para {name}!',
        alreadyHere: 'Você já está em {name}!',
        locked: 'Esta área está bloqueada!\nVocê não pode viajar para lá ainda.',
        moving: 'Aguarde... Você ainda está viajando!',
        noPath: 'Não há caminho disponível para {name}.',
        inDev: '{name} ainda está em desenvolvimento.',
        insufficientFuel: 'Combustível insuficiente para chegar em {name}.\nTanque atual: {current} · Necessário: {needed}.',
      },
      refuel: {
        title: '⛽ Posto de Gasolina',
        ask: 'Gostaria de abastecer?\nTanque atual: {percent}',
        tankFull: 'O tanque já está cheio ({percent}). Continuando viagem.',
        sliderTitle: 'Quanto abastecer?',
        sliderInstruction: 'Arraste para escolher a quantidade.',
        currentTank: 'Tanque atual',
        afterRefuel: 'Após abastecer',
        amount: 'Quantidade',
        liters: 'Litros',
        cost: 'Total',
        balance: 'Saldo',
        pricePerLiter: '{price}/L',
        confirm: '✓ Abastecer',
        cancel: '✕ Cancelar',
        notEnoughMoney: 'Saldo insuficiente para abastecer essa quantidade.',
        success: 'Abasteceu {amount}. Tanque agora: {percent}.',
      },
    },
    hud: {
      tooltip: 'Missões',
    },
    hint: 'Pressione E',
    traveling: 'Viajando para cidade...',
  },

  // Dialogue system
  dialogue: {
    advanceHint: 'Clique ou pressione Espaço',
    talkHint: 'Pressione E para falar com {name}',
  },

  // Veterinária — painel da Alice
  vet: {
    title: 'Veterinário',
    subtitle: 'Alice — Cuidados Animais',
    close: 'Fechar',
    closeHint: 'Pressione ESC para fechar',
    alt: 'Alice, a veterinária',
    actionsLabel: 'Ações da veterinária',
    actions: {
      one:   'Conversar',
      two:   'Diagnosticar',
      three: 'Internar',
      four:  'Remédios',
    },
    dialogue: {
      hint: 'Clique para continuar',
      aliceBack: 'Olá novamente! Como posso ajudar?',
      intro: {
        aliceFirstGreet: 'hm? olá, como posso ajudar?',
        stellaFirst: 'sou nova por aqui.',
        benFirst: 'sou novo... acabei de me mudar.',
        grahamFirst: 'me mudei para cá.',
        aliceIntro: 'seja bem-vindo. Me chamo Alice, sou a veterinária que cuida de todos os bichinhos, desde dos pequenos até os grandes da fazenda. se precisar de algo, não hesite em me chamar.',
        stellaName: 'prazer! Sou Stella!',
        benName: 'sou Ben, prazer em te conhecer Alice.',
        grahamName: 'me chamo Graham, prazer.',
        aliceOutro: 'Prazer conhecer vocês! Se tiver algo que posso fazer com seus bichinhos, só trazerem eles!',
      },
      care: {
        injuredMale:   'coitado do {name}! Às vezes brigam com outro ou se machucam brincando, mas deixe que eu resolvo!',
        injuredFemale: 'coitada da {name}! Às vezes brigam com outra ou se machucam brincando, mas deixe que eu resolvo!',
        medicineMale:   'o {name} ainda está sob tratamento — mantenha os remédios em dia, viu?',
        medicineFemale: 'a {name} ainda está sob tratamento — mantenha os remédios em dia, viu?',
      },
    },
    diagnose: {
      title: 'Diagnóstico',
      back: '← Voltar',
      empty: 'Nenhum animal com sintomas no momento.',
      pendingHint: 'Animal com sintomas. Iniciar exame?',
      inProgress: 'Em diagnóstico — ~{minutes} min restantes',
      ready: 'Resultado pronto. Retirar?',
      done: 'Diagnosticado: {disease}',
      startBtn: 'Iniciar diagnóstico',
      retrieveBtn: 'Retirar (R$ {value})',
      feeLabel: 'Custo para retirar:',
      feeFormat: 'R$ {value}',
      noMoney: 'Saldo insuficiente para retirar (R$ {value}).',
    },
    medicine: {
      title: 'Loja de Remédios',
      back: '← Voltar',
      empty: 'Nenhum remédio disponível. Diagnostique um animal primeiro.',
      buyBtn: 'Comprar (R$ {value})',
      priceFormat: 'R$ {value}',
      cureInstant: 'Cura imediata',
      cureGradual: 'Cura em {days} dias',
      doses1: '1 dose/dia',
      doses2: '2 doses/dia',
      noMoney: 'Saldo insuficiente (R$ {value}).',
      inventoryFull: 'Inventário cheio.',
      boughtToast: 'Comprou: {name} (R$ {value})',
    },
  },

  // Hospital / Internação — fluxos do botão Internar do vet
  hospital: {
    admit_title: 'Internar animal',
    recovery_title: 'Animais internados',
    no_severe_animals: 'Nenhum animal com ferimento grave para internar.',
    no_recovery_animals: 'Nenhum animal internado no momento.',
    admit_btn: 'Internar',
    cancel_btn: 'Cancelar',
    confirm_btn: 'Confirmar',
    back_btn: 'Voltar',
    confirm_message:
      'Internar {animal} por {days} dia(s)? Custo total: {cost} (cobrado na retirada).',
    admit_success: 'Animal internado por {days} dia(s). Custo previsto: {cost}.',
    admit_failed: 'Não foi possível internar o animal.',
    remaining_days: 'Em recuperação — {days} dia(s) restante(s)',
    treatment_progress: '{days}d',
    ready_for_pickup: 'Pronto para retirada!',
    pickup_btn: 'Retirar ({cost})',
    pickup_success: '{name} voltou para a fazenda! Pago: {cost}.',
    pickup_failed: {
      generic: 'Não foi possível retirar o animal.',
      no_money: 'Dinheiro insuficiente.',
      not_ready: 'O animal ainda está em recuperação.',
      not_found: 'Registro não encontrado.',
      respawn_failed: 'Falha ao trazer o animal de volta.',
      no_currency_system: 'Sistema de moeda indisponível.',
    },
    pill: {
      ready: '{count} pronto(s) / {total} internado(s)',
      recovering: '{total} em recuperação',
    },
  },
  // NPC Bartolomeu dialogues
  npc: {
    bartolomeu: {
      sleeping: '*dormindo* ...zZzZz...',
      playerHi: 'Ah... oi?',
      wakeUp: {
        stella: '*acorda* ...hã? E quem é você, guria? O que faz aqui nesse fim de mundo?',
        ben: '*acorda* ...hã? E quem é você, pirralho? Cadê teus pais?',
        graham: '*engole seco* Si-sim? O que deseja, senhor?',
        default: '*acorda* ...quem é você?',
      },
      playerIntro: {
        stella: 'Bom... eu me mudei recentemente para cá e estou morando na casa do meu avô... meu tio me disse que essa cidade é a mais próxima e todos o conheciam também.',
        ben: 'Meus pais me mandaram para cá, cuidar da casa e do terreno do meu avô. E também essa cidade aqui, falaram pra mim que conheciam ele e que poderiam me ajudar qualquer coisa.',
        graham: 'Mudei para cá, estou na antiga casa de meu avô. E me recomendaram esta cidade. E você seria... o prefeito correto? Bartolomeu.',
        default: 'Me mudei recentemente para cá.',
      },
      bartolomeuIntro: {
        graham: 'Sou sim! Prefeito daqui da Capa de Ganso! Essa pequenina cidade onde transita florestas, ranchos, fazendas e animais. Espero que seja mais do que bem-vindo! E não ande muito à noite! Pois bom... o orçamento tá curto, mesmo com doações ainda estamos sem condições para novos postes...',
        default: 'Bom, sou Bartolomeu, prefeito daqui da Capa de Ganso! Essa pequenina cidade onde transita florestas, ranchos, fazendas e animais. Espero que seja mais do que bem-vindo! E não ande muito à noite! Pois bom... o orçamento tá curto, mesmo com doações ainda estamos sem condições para novos postes...',
      },
      playerReaction: {
        stella: 'Bom... acho que posso ajudar.',
        ben: 'Aaaah...',
        graham: 'Baseando no valor, talvez eu possa ajudar.',
        default: 'Entendo...',
      },
      gilbertLine: {
        ben: 'Bom... seu vovô deve ter sido o... Gilbert, certo? Talvez agora as noites de Capa de Ganso se tornem dia! Pois bem. Seu avô tinha um terreno muito sólido, talvez você consiga juntar uns {money}! Relaxa, descontarei do imposto, hahahaha!',
        stella: 'Olhando bem para você... seu avô é Gilbert, correto? Talvez agora as noites de Capa de Ganso se tornem dia! Pois bem. Seu avô tinha um terreno muito sólido, talvez você consiga juntar uns {money}! Relaxa, descontarei do imposto, hahahaha!',
        graham: 'Hmm... seu avô deve ter sido o Gilbert, certo? Talvez agora as noites de Capa de Ganso se tornem dia! Pois bem. Seu avô tinha um terreno muito sólido, talvez você consiga juntar uns {money}! Relaxa, descontarei do imposto, hahahaha!',
        default: 'Seu avô tinha um bom terreno. Talvez você consiga juntar {money}!',
      },
      merchantQuestion: 'Um terreno belíssimo, talvez umas plantações e árvores possam te dar lucro. Já conheceu nossos 3 pontas da economia?',
      merchantYes: 'Sim, já conheço!',
      merchantNo: 'Não, quem são?',
      merchantKnown: 'Perfeito! Venda para eles o seu material! E aí, acumulando seu dinheiro, venha falar comigo!',
      merchantExplain: 'Pressione U ou o botão 🛒 para abrir os mercadores! Lá você vai encontrar a Lara, o Rico e o Thomas. Você pode vender para qualquer um deles qualquer recurso e itens, mas se vender o item correto para cada um e suas profissões, talvez eles paguem melhor!',
      playerThought: '(Ok... o prefeito não deve bater muito bem da cabeça...)',
      questOffer: 'Ok então jovem! Aceita ajudar essa humilde cidade?',
      questWhisper: '*sussurrando* Posso te dar desconto de até 2% nos impostos da tua terra, ein! rsrs...',
      questAcceptQ: 'Aceitas?',
      questAcceptOpt: 'Vou ver o que consigo.',
      questDeclineOpt: 'Sei não... volto depois.',
      questAccepted: 'Ok! Junte {money} e volte aqui! Se vemos por aí meu jovem!!!!',
      questDeclined: '... então posso tirar meu cochilo no meu banco pós rolê de plymouth cuda? Até depois.',
      // Declined revisit
      declinedGreet: 'Olá novamente, jovem! Precisa de algo?',
      declinedAcceptOpt: 'Bom... posso ajudar sim.',
      declinedLeaveOpt: 'Nada demais, só dando uma volta.',
      declinedAccepted: 'Excelente! Junte {money} e volte aqui!',
      declinedLeave: 'Tudo bem! Aproveite a cidade então!',
      // Quest active
      activeGreet: 'E aí jovem! Conseguiu juntar o dinheiro?',
      activePlayerHas: 'Sim! Tenho {money}.',
      activeDeliverPrompt: 'Perfeito! Com {money} vamos conseguir iluminar essa cidade!',
      activeDeliverOpt: 'Entregar {money} (será descontado do seu saldo)',
      activeWaitOpt: 'Ainda não, volto depois.',
      activeDelivered: 'Muito obrigado jovem! A cidade agradece! Agora sim teremos postes novos!',
      activeDiscount: 'Descontei os 2% do imposto como prometido, hahahaha! Até mais!',
      activeWait: 'Sem pressa! Quando estiver pronto, volte aqui!',
      activeNotEnoughGreet: 'E aí jovem! Como vão as coisas?',
      activeNotEnoughPlayer: 'Ainda estou juntando... tenho {money} por enquanto.',
      activeNotEnoughBart: 'Falta um pouco ainda! Preciso de {money}. Continue vendendo seus recursos! Até mais!',
      // Completed
      completedGreet: 'E aí jovem! A cidade está cada vez melhor graças a você!',
      completedPlayer: 'Que bom! Fico feliz em ajudar.',
      completedBart: 'Continue assim! Capa de Ganso conta com você!',

      // ── Quest 2: Lojas novas + Impostos ──
      q2: {
        // Saudação inicial
        greet: {
          ben: 'Olá caro jovem! como anda a fazenda ein?',
          graham: 'Olá novamente, tem um tempo?',
          stella: 'Moça! tudo bem?',
        },
        playerHi: 'Ah.. oi, sim tudo bem.',
        bartExcited: 'Ótimo!!!!! *Bartolomeu se empolga* bo, estou com certas coisinhas que devo colocar aqui em breve! Mas antes... bom, precisaria que assinasse esse termo...',
        playerAbout: 'Sobre...',
        bartCutsOff: 'Alias!!! Nem sequer me disse seu nome não? Quem seria você? Uma falta grandiosa de respeito com seu prefeito querido não? Hahahaah!',
        // Nome do player
        nameIntro: {
          graham: '*suspira* Graham, Graham Enderfield.',
          ben: '*engole seco* Sou Ben, prazer Sr. prefeito.',
          stella: 'Stella, mas sobre o que é esse contrato?',
        },
        bartAfterNameStella: '*pigarreia* Explicarei senhorita Stella.',
        bartPleasure: {
          graham: 'Prazer senhor!',
          ben: 'Prazer jovem!',
          stella: 'Prazer senhora!',
        },
        // Explicação das lojas
        bartShops: 'Penso em abrir mais três lojinhas, fora a do centro.',
        playerCenter: 'Mas aqui não é o centro?',
        bartLaugh: 'O que? *Segura a risada* Bom... seguindo a rua lá de baixo você vai para o centro, aqui é só um dos cantinhos hahaahahaha!',

        // Escolhas rodada 1
        choiceContinue: 'Tá bom né... continue.',
        choiceWhatIGet: 'E o que irei ganhar com isso?',
        choiceWhereSign: 'Tá bom, onde assino?',
        choiceNotToday: 'Hoje não.',

        // Bartolomeu suspira (recusa)
        bartSigh: '*suspira* Tudo bem então... estarei aqui caso mude de ideia.',

        // Se escolher "continue"
        bartExplainShops: 'Ok!! Como tenho alguns amigos próximos vendedores, como Dona Cláudia e senhor Carlos, eu penso em chamá-los para abrir a lojinha deles por aqui! Carlos tem uma padaria e Cláudia vende flores. Interessante não?',
        shopReaction: {
          stella: 'Pães fresquinhos... e flores... aliás, preciso enfeitar um pouco aquela casa.',
          ben: 'Isso é bom...',
          graham: 'E você está sem condições para pagar novamente?',
        },
        bartShopReply: {
          stella: 'Sim sim senhorita!!!',
          ben: 'Claro!! Aceita?',
          graham: '*engole em seco, desviando o olhar para seu carro e voltando para Graham* Não é nem questão disso meu filho, ahahahha!',
        },

        // Se escolher "o que ganho"
        bartExplainGain: 'Bom, com a padaria do Carlos e a floricultura da Cláudia, a cidade vai crescer! E posso novamente diminuir 2% dos impostos da tua terra, que tal?',

        // Escolhas rodada 2
        choice2Sign: 'Assinar.',
        choice2WhatGain: 'Mas o que posso ganhar?',
        choice2Refuse: '*fica pensativo*',

        // Assinatura
        bartThanks: 'Maravilha! Aqui, assine aqui nessa linha... pronto! Muito obrigado jovem! Em breve as lojinhas estarão de pé!',

        // Retorno após recusa
        declinedGreet: 'Ah, olá. O que deseja?',
        declinedExplain: 'Me explica sobre o que é.',
        declinedSign: 'Posso assinar.',
        declinedVisit: 'Vim te ver.',
        bartVisitReply: {
          stella: 'Estarei aqui, sabe que não fugirei tão cedo.',
          default: '*dá uma risada*',
        },
        stellaVisitReply: '... tá?',

        // Quest ativa (após assinar)
        activeGreet: 'Olá! As lojas estão quase prontas! Ah, e não se esqueça dos impostos ein!',
      },

      // ── Sistema de Impostos ──
      tax: {
        noteTitle: 'Dia de Pagamento',
        noteDescription: 'Pague a taxa de {value} moedas. Cobrado a cada 10 dias.',
        contractTitle: 'Contrato Municipal',
        contractDescription: 'Termo de compromisso assinado com o prefeito Bartolomeu. Os impostos sofreram um aumento e a cada 10 dias será cobrada uma taxa para financiar a padaria e floricultura da cidade.',
        paid: 'Imposto pago! -{value} moedas.',
        notEnough: 'Você não tem moedas suficientes para pagar o imposto!',
        reminder: 'Dia de pagamento! Pague a taxa de {value} moedas.',
        payOption: 'Pagar {value} moedas.',
        laterOption: 'Depois eu pago...',
        thanksPaid: 'Muito bem! Obrigado pelo pagamento, jovem! A cidade agradece!',
        warnLater: 'Hmm... não demore muito ein! Sem o imposto em dia, alguns mercadores podem não aceitar negociar contigo...',
      },
      // Diálogo livre — após completar quest 1 e assinar o contrato
      free: {
        greet: 'Alguma dúvida {name}?',
        choicePassing: 'Não, somente passando por aqui.',
        choiceShops: 'Que lojas irão abrir?',
        graham: {
          l1: 'Você parece um soldadinho, lutou em guerra?',
          l2: 'Sim. Fui um fuzileiro naval.',
          l3: 'Que interessante! Eu fui também do exército!',
          l4: 'Unidade?',
          l5: '*pensa* ...',
          l6: 'Esqueci. *força um sorriso*',
          l7: '*murmura*',
        },
        ben: {
          l1: 'Vê se não fica até tarde na rua então.',
          l2: 'Hmhm.',
          l3: 'O quê? Gato comeu a língua?',
          l4: 'Não sou alérgico a gatos.',
          l5: '*murmura* Quantos cê tem?',
          l6: '17 anos.',
          l7: 'Que jovem de sorte, ganhou uma fazenda com 17 anos. Na sua idade eu tava rebocando paredes.',
          l8: 'Quero saber como é que vou cuidar daquele matagal todo isso sim... *sorri para Bartolomeu e se vira para ir embora*',
        },
        stella: {
          l1: 'Qualquer dia desses aceita dar uma voltinha? Aquela máquina é uma fera!',
          l2: '*franze a testa*',
          l3: 'E que carro é esse?',
          l4: 'É um Plymouth Cuda!! Motor V8 426 Hemi! Com um belo consumo de 4 km por litro!! Esse camarada de 1972 é fenomenal!!! *levanta do banco empolgado* Gostou, bela-dama?',
          l5: '*franze a testa, dando um sorriso fraco e fajuto* Que... legal... uau... *desvia o olhar*',
          l6: 'Topa um rolezinho? *pisca um olho, dando um sorriso*',
          l7: 'Não... tô ocupada, tá? Passo pra próxima, tchau tchau.',
          l8: '*acena com um sorriso*',
          l9: 'Que prefeito estranho... *pensa enquanto se vira para sair, suspirando*',
        },
        shops: {
          l1: 'Padaria e floricultura. Em breve vai ter mais opções de alimentação. *sussurra* Bom que paramos de comer a comida da Lara! *volta a falar normal* E claro, as flores! Pra melhorar o climinha de todo mundo!',
          l2: 'Aqui... é meio... *olha ao redor*, vazio mesmo.',
          l3: '*pigarreia* Precisamos mesmo melhorar as coisas...',
        },
      },
    },
    milly: {
      // Observando o player passar
      watching: '*uma senhora está te observando da janela...*',
      // Escolhas iniciais
      choiceAsk: 'Oi? Tudo bem?',
      choiceIgnore: '*ignorar*',
      choiceStare: '*encarar de volta*',
      // Após escolha "perguntar" ou "encarar"
      catQuestion: 'Oi... veio pegar meus gatos?',
      playerWhat: 'O quê?',
      catYell: '*fala mais alto da janela* VEIO PEGAR MEUS GATOS??',
      // Reação por personagem
      playerReaction: {
        stella: 'Não não! Eu juro que não!!',
        ben: '*se assusta*',
        graham: '*cruza os braços*',
      },
      millyReaction: {
        stella: 'Hmhmh ok...',
        ben: 'AHAHAHAHAHA levanta menino! *tosse de tanto rir*',
        graham: 'Uau, você é bem fortinho meu filho.',
      },
      // Apresentação
      millyIntro: 'Eu sou Milly. São novos moradores da Capa de Ganso? Dessa cidadezinha véia?',
      playerMoved: 'Sim... me mudei para cá recentemente, morando na antiga casa de Gilbert.',
      millyGilbert: 'Gilbert??? São os netinhos de Gilbert????????',
      playerYes: 'Sim...?',
      millySigh: 'Aah, Gilbert... *suspira*',
      millyFarewell: 'Estou morrendo de saudades dele... espero que vocês cuidem bem da fazenda dele ein...',

      // ── Quest: Madalena ──
      q2: {
        // Milly inicia conversa sobre Gilbert
        gilbertMemory: {
          stella: 'Gilbert era um homem maravilhoso... sempre trazia leite fresquinho para os meus gatos de manhã.',
          ben: 'Gilbert era um senhor muito gentil... sempre vinha aqui de manhãzinha trazer leite pros meus gatos.',
          graham: 'Gilbert... era um grande homem. Sempre trazia leite para os meus gatos, sem falta.',
        },
        playerAboutGilbert: {
          stella: 'Ele fazia isso...? *sorri* Parece que vovô era querido por todos aqui...',
          ben: '...é? Eu não sabia disso.',
          graham: 'Hmm. Isso soa como algo que ele faria.',
        },
        millyNod: 'Sim sim... *suspira* Mas enfim, vamos falar de coisa boa!',

        // Apresentação dos gatos
        catsIntro: 'Eu tenho cinco gatos! Deixa eu te apresentar: tem o Bigodinho, a Felpuda, o Sardinha, a Princesa...',
        catsPause: '...e a Madalena.',
        millyWorried: '*o olhar da Milly muda*',
        millyExplain: 'A Madalena... ela fez uma cirurgia recentemente. Mas logo depois que voltou, a danada fugiu pela janela!',
        millyTeary: 'Estou tão preocupada... ela nem deve estar totalmente recuperada ainda...',

        // Reação do player
        playerReaction: {
          stella: 'Ah não... coitadinha! Para onde ela foi?',
          ben: '...fugiu? Mas ela tá machucada?',
          graham: 'Entendo. Para que direção ela foi?',
        },
        millyDirection: 'Eu vi ela correr na direção da fazenda... provavelmente para os terrenos do Gilbert. Ela sempre gostou de lá...',

        // Escolha de aceitar
        choiceAccept: 'Eu vou procurar ela!',
        choiceNotNow: 'Agora não posso...',

        // Aceitar
        millyGrateful: {
          stella: 'Ah querida, muito obrigada!! A Madalena é uma gatinha escura, bem pequenina! Cuidado para não assustá-la!',
          ben: 'Obrigada meu filho! A Madalena é escurinha, pequenina! Vai devagar perto dela, tá?',
          graham: 'Muito obrigada jovem! Ela é uma gatinha escura, bem pequena. Seja gentil com ela, por favor.',
        },

        // Recusar
        millyUnderstand: 'Tudo bem... mas se mudar de ideia, por favor... ela está sozinha lá fora...',

        // Diálogo de retorno (enquanto não encontrou)
        returnGreet: 'Conseguiu encontrar a Madalena...?',
        returnNotYet: 'Ainda não... mas estou procurando.',
        returnMillySad: 'Por favor... ela deve estar tão assustada...',

        // Ao encontrar a Madalena na fazenda
        foundMadalena: '*Madalena mia suavemente ao te ver...*',
        playerFoundReaction: {
          stella: 'Achei você! Vem cá gatinha... calma... *pega a Madalena com cuidado*',
          ben: 'Ei... achei você... vem... *estende as mãos devagar*',
          graham: '*se agacha lentamente* ...vem cá.',
        },
        catCaught: '*Madalena se aconchega nos seus braços*',

        // Entregar para Milly
        deliverGreet: 'A MADALENA!! *os olhos da Milly se enchem de lágrimas*',
        millyJoy: 'Minha filhinha!! Ah... *abraça a Madalena* Obrigada... obrigada, obrigada!!',
        millyReward: {
          stella: 'Querida, muito obrigada de verdade! Tome, aceita esses trocados... não é muito, mas é de coração!',
          ben: 'Meu filho, obrigada!! Toma aqui, um presentinho pra você! Não é muito mas...',
          graham: 'Jovem, sou eternamente grata. Aceite isso, por favor. É o mínimo que posso fazer.',
        },
        playerFinish: {
          stella: 'Não precisa! ...mas obrigada. Fico feliz que ela esteja bem!',
          ben: 'Ah... valeu. Fico feliz que ela tá bem.',
          graham: 'Agradeço. Cuide bem dela.',
        },
        millyEnd: 'Pode deixar! E venha visitar a gente quando quiser, viu? Os gatos adoraram você!',
      },
      // Diálogo livre — após completar a quest da Madalena
      free: {
        ben: {
          l1: 'Oooi meu queridinho! Tudo bem com você? Veio ver os miaus?',
          l2: 'Ah oi! Tô ótimo, ainda aprendendo sobre as coisas de fazenda...',
          l3: 'Se quiser, venha comer e tomar café comigo! Posso ensinar umas coisinhas! *dá um sorriso*',
          l4: '*abre um sorriso e dá um joia para Milly*',
        },
        stella: {
          l1: 'Oi jovenzinha, tudo bem? Como vão os negócios da fazenda, ein?',
          l2: 'Tá indo bem... ainda não sei umas coisinhas, mas... acho que tô progredindo.',
          l3: 'Fico feliz! Mas não se esforça, tá bom? Se for algo muito braçal pode chamar os homens daqui, podem ajudar! Ah, e não esquece de vir aqui almoçar comigo!',
          l4: '*dá um sorriso e acena como despedida*',
        },
        graham: {
          l1: 'Olá moço, como vai indo a fazenda? Tá comendo direitinho lá?',
          l2: 'Bom dia, tudo bem com a senhora? A fazenda vai bem e sim, estou comendo direito.',
          l3: 'Fico feliz, meu filho! Depois venha almoçar comigo! Eu e os gatos vamos amar a sua companhia.',
          l4: '*sorri* Pode deixar que eu venho.',
        },
      },
    },

    // ── Bru & Juan — diálogo de introdução ──
    bruJuan: {
      bruRant: 'AAAH! que saco!! esse aplicativo de taxi demora tanto! ninguem aceita essa porcaria de corrida!!',

      choiceApproach: 'Aproximar sem fazer barulho.',
      choiceLeave: 'Deixar quietos.',

      approachStella: '*acena com a mão*',
      approachGraham: '*pigarreia*',
      approachBen: '*aparece de frente para Bru*',

      bruWho: 'ah... *franze a testa, olhando para {name}*, quem é tu?',

      introStella: 'olá... sou moradora nova, me chamo Stella e tô conhecendo a região.',
      introGraham: 'está tudo bem? aparenta... estressada. Ah, me chamo Graham, conhecendo a região.',
      introBen: 'oi.. t-tudo bem com o celular? *cora levemente*, ah e-e... me chamo Ben. sou novo na cidade',

      bruGreetDefault: 'ah.. prazer... Sou Bru *retorna o olhar para o celular*',
      bruTaxiFar: 'cacete!!! esse taxi tá longe! *suspira de estresse*',
      bruGreetBen: 'tá, legal garoto, só tô esperando meu taxi *retorna a olhar para o celular*.',

      playerHelp: 'quer ajuda com algo?',

      bruWarning: 'Se aquele homem ali atrás pedir dinheiro, não dê é um alcoólatra ok?',

      playerLooks: '*você olha para o lado e vê um homem caido no chão, com uma garrafa na mão se levantando.*',

      juanIntro: 'o-opa *arrota*, sou Juan. o esposo.....',
      bruInterrupt: 'EX... esposo, ex.',
      juanCorrect: 'bom.... *suspira*, ex esposo da Bru, sou Juan, e quem é você?',

      toJuanStella: 'Stella, prazer.. Juan',
      toJuanBen: 'Me chamo Ben, sou novo por aqui',
      toJuanGraham: 'Graham.',

      juanLunch: 'bom... prazer é todo meu, qualquer dia podemos marcar de almoçar em casa como boas-vindas.',

      bruCook: 'e se você for fazer comida então, por que eu não vou gastar meu ultimos centavos para suas coisas.',

      juanIgnore: '*abre um sorriso forçado*, ignorem ela gente! ela... tá meia estressada por conta do serviço e eu sei cozinhar tá? não compro coisas feitas.... *engole seco*',

      farewellStella: '*abre um pequeno sorriso, e gesticula com a cabeça concordando* bom... um prazer conhecer vocês, até depois.',
      farewellGraham: 'Certo. Foi um prazer, bom dia para vocês.',

      benLookThought: '*cruza os braços, trocando o olhar entre....*',
      benLookBru: 'Bru...',
      benLookJuan: 'Juan...',
      benFarewell: 'bom... acho que vou indo, boa sorte no trabalho e... {greeting}',

      greetMorning: 'bom dia',
      greetAfternoon: 'boa tarde',
    },

    family: {
      // ── Bolhas de interação (pré-diálogo) ──
      lucasWave: '*acena de volta e continua no que estava fazendo*',
      isabelaCallDad: '*olha surpresa* Paaaaai! Tem gente aqui!',
      isabelaStillHere: '*tira o olho do celular* Ainda tá aí? Tudo bem? Paaaai!',
      isabelaBusy: '*bufando no celular* agora não...',
      mollySilent: '*Molly te sorri, mas está ocupada*',

      // ── Abertura (Lucas e John) ──
      lucasDoubt: 'Sei não pai... tá certo mesmo?',
      johnHmm: 'Hm.... acho que invertemos algo.',
      lucasSerious: 'Hm..... sério pai?',

      // ── Isabela no celular ──
      isabelaLaugh: '*ri olhando para celular*',
      johnIsa1: 'Isa.',
      isabelaStillLaughing: '*rindo ainda no celular*',
      johnIsabela: 'Isabela!',

      // ── Isabela nota o player ──
      isabelaNoticeStella: 'aaai que fooi? *nota a Stella* Quem... é você?',
      isabelaNoticeBen: 'aaai que fooi? *nota o Ben* Pai, tem um menino aqui, amigo do Lucas?',
      isabelaNoticeGraham: 'aaai que fooi? *nota o Graham* *olha de cima a baixo* Que braço... digo... pai tem um homem aqui.',

      // ── John cumprimenta ──
      johnHello: 'Olá?',
      playerIntro: 'Olá... sou {name}.',
      lucasHi: 'Oie.',
      johnLost: 'E está perdido?',

      // ── Stella branch ──
      stellaNotLost: 'Não não.. estou conhecendo o bairro, me mudei para cá faz um tempo.',
      johnAlone: 'Sozinha?',
      stellaGilbert: 'Sim... conheciam o senhor Gilbert? era meu avô.',
      johnCondolencesStella: 'Meus pêsames, não consegui comparecer ao enterro Stella. Creio que está morando na casa dele?',
      stellaYes: 'Sim, estou sim.',
      johnIntroFamily: 'Entendo... Bom, me chamo John, John Alexander Miller, este é meu filho mais velho Lucas, *Lucas acena a mão*, aquela no celular sentada é a Isabela.',
      isabelaWelcome: 'Bem vindo a essa cidade minúscula.',
      johnIsa2: 'Isa.',
      isabelaMumble: '*murmura voltando pro celular*',

      // ── Graham branch ──
      grahamNotLost: 'Não, conhecendo o bairro.',
      johnRelative: 'Parente de alguém?',
      grahamGilbert: 'Gilbert, o fazendeiro que faleceu semana passada.',
      johnCondolencesGraham: 'Neto dele? Meus pêsames, não consegui comparecer.',
      grahamMissHim: 'Já sinto falta dele. E quem são as crianças?',
      isabelaCutIn: 'Sou Isabela, pode me chamar de Isa, o pateta ali é o Lucas.',
      lucasPateta: 'Opa, e ela que é pateta.',
      johnIntroAll: 'Sou John, ele é Lucas e ela é Isabela.',
      isabelaWave: '*acena com a mão*',
      johnMarine: 'Fuzileiro?',
      grahamNavy: 'Sim, marinha?',
      johnAirForce: 'Aeronáutica, batalhão?',
      graham107: '107° batalhão.',
      johnPilot: 'Piloto de caça.',
      lucasCool: 'Que legal, outro do exército.',
      johnFarewellGraham: 'Bom Graham, prazer em conhecer, o que precisar me procure ou chame minha esposa Molly.',
      isabelaFarewellGraham: '*sorrindo* Ou eu! E bom... bem vindo a Capa de Ganso!',
      lucasFrown: '*franze a testa para Isabela*',
      grahamSameToYou: 'Digo o mesmo a todos. Aliás estou na fazenda do meu avô.',
      johnGoodWalk: 'Ok, tenha um bom passeio.',

      // ── Ben branch ──
      benNotLost: 'Ah não... conhecendo o pessoal daqui do bairro.',
      johnParents: 'E onde estão seus pais?',
      benFarm: 'Bom... meio que cuidando da fazenda do meu avô.',
      johnGilbert: 'Gilbert?',
      benYes: 'Sim.',
      johnCondolencesBen: 'Conheci o Gilbert, meus pêsames, ele fará falta aqui.',
      isabelaFarmer: 'Então tu é o neto do fazendeiro?',
      benBlush: '*cora* S-sim.',
      isabelaAge: 'Cê tem oque? 15 anos?',
      ben17: '17...',
      lucasAge: 'Sério? Você tem a idade da minha irmã, mas parece bem novo, diferente dela.',
      isabelaShutUp: 'Cala boca pirralho!',
      johnNotNow: 'Isa, Lucas. Agora não.',
      johnIntroBen: 'Bom, este é meu garoto mais velho e minha garota mais velha, Lucas e Isabela.',
      johnFullIntroBen: 'Sou John Alexander Miller garoto, precisando de algo, não hesite em me chamar, ou chamar minha esposa Molly ok?',
      benFarewell: 'Tá bom... eu... se precisarem de algo me avisem ok? Vou tá lá na fazenda... tchau pessoal.',
      johnLucasWave: '*acenam com a mão*',
      isabelaBackToPhone: '*volta para o celular*',

      // ── Quest: Leite para a família ──
      milk: {
        greeting: 'Olá {name}. Tudo certo por aí na fazenda?',
        replyStella: 'Tá indo, tá indo! Ainda me acostumando com tudo.',
        replyGraham: 'Sob controle. A rotina ajuda.',
        replyBen: 'A-ah... tá indo, mais ou menos.',
        johnOfValue: 'Fico contente em ouvir. Seu avô era um homem de muito valor.',
        isabelaShout: 'Paaaaaai... cadê o leite???',
        johnNoShout: '*respira fundo* Isabela, não grita, por favor.',
        isabelaMumble: '*murmura alto* meu deus, acabou o leite, ninguém avisa nada nessa casa...',
        johnApology: '*baixo, para você* Peço desculpas pela cena. Molly saiu cedo e eu deveria ter passado no mercado. Acabei esquecendo.',
        johnAskMilk: '{name}, se não for incômodo, posso te pedir um favor. Se tiver leite sobrando na sua fazenda, eu compro de você. Me pouparia uma viagem até a cidade agora.',
        choiceAccept: 'Pode deixar, trago um pra você.',
        choiceAskPrice: 'Quanto você paga?',
        choiceDecline: 'Agora não vai dar, desculpa.',
        acceptStella: 'Deixa comigo! Acho que tenho sim, já volto.',
        acceptGraham: 'Deixa comigo. Trago agora.',
        acceptBen: 'A-ah... acho que tenho sim. Já trago.',
        johnThanks: 'Agradeço, de verdade. Fico te devendo essa.',
        isabelaThanksMurmur: '*do fundo* ...obrigada, acho.',
        askPriceStella: 'E quanto você paga, ein?',
        askPriceGraham: 'Quanto tá pagando?',
        askPriceBen: 'H-hmm... paga quanto?',
        johnPrice: 'Preço justo, pode confiar. 50 moedas pelo leite. Me parece razoável, combina com você?',
        priceOkStella: 'Combina sim, já volto.',
        priceOkGraham: 'Fechado.',
        priceOkBen: 'T-tá bom... já trago.',
        declineStella: 'Aaah, agora tô meio enrolada, desculpa!',
        declineGraham: 'Agora não dá. Fica pra outra.',
        declineBen: 'A-ah... agora não dá, desculpa.',
        johnDeclineReply: 'Tranquilo, fica para outro dia. Obrigado mesmo assim.',
        isabelaDeclineMurmur: '*murmura* ótimo, que maravilha, sem leite de novo...',
        johnSolve: '*baixo* Já resolvo, Isa.',
        fourthWall: 'Bom, assim que o desenvolvedor adicionar o sistema completo dos animais, ok. Você retorna para que a quest seja feita.',
        playerThought: '*pensando* ok...? ele falou com quem?',
        askIfGot: 'Conseguiu? Me salvou, {name}.',
        handStella: '*entrega o leite* Toma, fresquinho fresquinho.',
        handGraham: '*estende o leite* Toma.',
        handBen: 'T-toma. Espero que sirva.',
        johnPerfect: 'Perfeito. Aqui está o combinado, muito obrigado.',
        isabelaGrab: '*aparece rápido, pega o leite* valeu. *volta pro celular e some*',
        johnShake: '*balança a cabeça* Essa menina...',
        askStill: 'E aí, conseguiu o leite?',
        stillStella: 'Ainda não, me dá mais um tempinho!',
        stillGraham: 'Ainda não. Volto depois.',
        stillBen: 'A-ainda não consegui... desculpa.',
        johnTranquilo: 'Tranquilo, sem pressa nenhuma.',
        questDone: 'Valeu mais uma vez pelo leite de outro dia. Qualquer coisa, sabe onde me achar.',
      },

      // ── Quest: Projeto secreto do Lucas ──
      lucasQ: {
        psiu: 'Psiu, {name}... chega aqui, rapidinho.',
        reactStella: 'Oi Lucas, que foi?',
        reactGraham: 'Fala.',
        reactBen: 'A-aconteceu algo?',
        secretAsk: 'É segredo, viu? Promete que não fala pro meu pai?',
        promiseStella: 'Hmhmh, é pra namoradinha?',
        promiseGraham: 'Nada proibido, moleque?',
        promiseBen: 'P-prometo!',
        lucasDeny: 'Q-que??? Não, nada disso! Nada proibido também, juro! É só um projeto meu, no fundo do quintal. Se meu pai descobrir ele vai querer ajudar e aí perde a graça, saca?',
        askMaterials: 'Tu tem parafuso sobrando? Uns 3 dava pro gasto. E umas 5 madeiras também.',
        choiceAccept: 'Consigo sim, já volto.',
        choiceCurious: 'O que tu tá montando?',
        choiceDecline: 'Agora não dá.',
        curiousStella: 'Olha olha, o que é ein?',
        curiousGraham: 'Por que guardar segredo?',
        curiousBen: 'H-hmm... e o que que é?',
        lucasSurprise: 'Ahhh é surpresa! Se der certo eu te mostro. Se não der, melhor ninguém saber que eu tentei.',
        okStella: 'Se não for nada errado ok.',
        okGraham: 'Tá. Mas nada de roubada, né?',
        okBen: 'T-tá bom então.',
        lucasSwear: 'Juro que não! É coisa boa.',
        lucasThanks: 'Valeu demais, {name}! Tô te devendo uma.',
        afterAcceptStella: 'E depois eu quero ver viu?',
        afterAcceptGraham: 'Depois me conta o que é, moleque.',
        afterAcceptBen: 'T-tá bom, já volto.',
        declineStella: 'Agora não dá, depois a gente vê.',
        declineGraham: 'Não tenho sobrando.',
        declineBen: 'A-ah... agora não tenho não.',
        lucasDeclineReply: 'Tranquilo, sem estresse. Se sobrar um dia, me avisa.',
        askBrought: 'Trouxe mesmo? Salvou minha vida!',
        bringStella: '*entrega* Toma aí, 3 parafusos e 5 madeiras. Agora eu QUERO ver o que é ein.',
        bringGraham: '*coloca na mão dele* Pronto. Nada de roubada, moleque.',
        bringBen: 'T-toma. Era isso, né?',
        lucasJoy: 'É isso mesmo! Valeu, valeu, valeu!',
        lucasComeBack: 'Bom, retorna aqui depois!! Te mostro tudo que já fiz!',
        finalStella: 'Tô ansiosa pra ver!',
        finalGraham: 'Beleza, moleque.',
        finalBen: 'T-tá bom, volto sim.',
        questDone: 'E aí {name}! Segue firme, depois te mostro tudo.',
        noMaterialsStella: 'Ainda não consegui os materiais, me dá um tempo.',
        noMaterialsGraham: 'Ainda não tenho. Volto depois.',
        noMaterialsBen: 'A-ainda não consegui... desculpa.',
        lucasWait: 'Tranquilo, sem pressa.',
      },

      // ── Molly (esposa do John) ──
      molly: {
        greet: 'Oh, olá querido(a)! Você é da família do senhor Gilbert, não é?',
        replyStella: 'Sou sim! Stella, neta dele. Prazer.',
        replyGraham: 'Sim, neto. Graham.',
        replyBen: 'S-sim... eu sou o Ben, o neto dele.',
        intro: 'Que bom te conhecer! Sou Molly, esposa do John. Se precisar de qualquer coisa, é só bater na porta de casa.',
        farewell: 'Bom, vou continuar minha caminhada. Até qualquer hora!',
        repeat: 'Oi de novo, {name}! Aproveita o dia.',
      },
    },

    jeremy: {
      tryStella: 'Oi, tudo bem? Sou nova por aqui, me chamo Stella.',
      tryGraham: 'E aí, beleza? Me chamo Graham.',
      tryBen: 'O-oi... meu nome é Ben. Tudo bem?',
      stare: '*levanta o olhar do celular e encara sem expressão*',
      ignore: '*volta a olhar o celular sem dizer nada*',
      wave: '*acena com a mão*',
      postReactionStella: '*o ignora*',
      postReactionGraham: '*acena com a cabeça em resposta*',
      postReactionBen: '*devolve o aceno*',
    },

    couple: {
      // Abertura
      maryTease: "para bobo!!! hoje eu tô de folga",
      noahReply: "ué e essa roupa de escritorio?",
      maryCosplay: "é pro cosplay! já já chega a peruca.",
      noahJeremyLook: "aaaha, e o outro ali já vai tarde trabalhar *olha para Jeremy*",
      jeremyTaxi: "e tenho culpa que não chega o taxi?",
      coupleYes: "sim",
      jeremyMurmur: "*murmura*",
      maryNotice: "*nota {name}* oi?",
      greetMorning: "bom dia",
      greetAfternoon: "boa tarde",
      noahGreet: "opa! {greeting}!",

      // Escolhas iniciais
      choiceHello: "olá.",
      choiceCosplay: "cosplay?",
      choiceWave: "*acenar e sair*",
      playerWave: "*acena e sai*",

      // Branch "olá"
      coupleOpa: "opa!",
      newHereF: "tudo bem contigo? Aparenta ser nova, como se chama?",
      newHereM: "tudo bem contigo? Aparenta ser novo, como se chama?",

      introStella: "é, sou nova mesmo, mudei pra cá para cuidar do terreno do meu avô, sou Stella.",
      introGraham: "uhum, novo por aqui, aliás, cuidando da casa do meu avô, Graham.",
      introBen: "é, vim pra cá recentemente ficar na casa do meu avô, me chamo Ben.",

      maryGilbert: "Gilbert?",
      playerYes: "sim.",
      noahCondolence: "ah... é mesmo, infelizmente ele não está entre nós.",
      maryCosplayJudge: "hmmm, agora acho que não vou ter mais um avaliador de cosplay....",
      noahNote: "verdade... ele sempre dava uma nota",

      // Branch "cosplay?" (compartilhada)
      maryCosplayExplain: "ah sim! sou cosplayer!! tanto de animes, séries, jogos.... praticamente se tiver um evento eu vou!",
      maryIntro: "ah e claro eu sou Mary!",
      noahIntro: "E eu sou Noah, sou desenhista.",
      maryPraise: "o melhor artista desse planeta! ❤️",
      noahPraise: "claro, tenho a melhor cosplayer me amando!",
      coupleLaugh: "*risos tímidos*",

      jeremyComplainF: "dá para terem um respeito na frente da moça?",
      jeremyComplainM: "dá para terem um respeito na frente do pirralho?",

      playerTurn: "*se vira para o lado*",

      playerReactionJeremyStella: "agora decidiu não me ignorar?",
      playerReactionJeremyBen: "o-oi",
      playerReactionJeremyGraham: "", // Graham ignora
      playerReactionJeremyNew: "ah oi.",

      jeremyIntro: "me chamo Jeremy.",

      playerResponseStella: "*abre um sorriso falso, voltando a atenção para Mary & Noah*",
      playerResponseBen: "prazer Jeremy.",
      playerResponseGraham: "", // sem fala

      noahDismiss: "liga não! ele é todo frustradinho mesmo.",
      jeremyLawsuit: "ainda te dou um processo",
      maryFifthTime: "essa já é a quinta vez do dia que disse que vai processa-lo.",
      noahExplain: "Bom, esse pateta chamado de Jeremy é meu irmão gêmeo, como pode ver, Mary é minha esposa, qualquer dia cola aí em casa! pra gente se conhecer melhor.",
      noahInvite: "qualquer dia cola aí em casa! pra gente se conhecer melhor.",
      maryCook: "sim!! posso preparar algo para gente!!!",
      noahWeCook: "a gente prepara gata!",
      maryBlush: "*ri timidamente* para bobinho!",
      jeremyTaxiFinal: "vem logo taxista.....",

      // Diálogo livre (pós-intro)
      freeGreet: "E aí, tudo bem? Volte sempre!",
      jeremyWave: "*acena com a mão*",
      postReactionStella: "*ignora*",
      postReactionGraham: "*acena com a cabeça*",
      postReactionBen: "*devolve o aceno*",
    },

  },

  // Painel de atalhos
  shortcutsPanel: {
    title: '⌨️ Atalhos de Teclado',
    subtitle: 'As teclas abaixo refletem suas configurações atuais.',
    hintToggle: 'Pressione {key} para abrir/fechar.',
    unbound: 'Não configurado',
    sections: {
      movement: '🏃 Movimento',
      actions: '🎮 Ações',
      menus: '📦 Menus'
    }
  }
};