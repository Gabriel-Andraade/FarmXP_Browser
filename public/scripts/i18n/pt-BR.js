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
      consume: 'Consumir',
      discard: 'Descartar',
      build: 'Construir',
      use: 'Usar'
    },
    confirmDiscard: 'Descartar {name}?',
    selectItem: 'Selecione um item'
  },

  // Player HUD
  player: {
    noCharacter: 'Sem personagem',
    level: 'Level',
    xp: 'XP',
    hunger: 'Fome',
    thirst: 'Sede',
    energy: 'Energia',
    money: 'Dinheiro',
    health: 'Saúde'
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
    17: 'Semente de Cenoura',
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
    65: 'Morango',
    68: 'Laranja',
    69: 'Baú de Armazenamento',
    71: 'Milho Assado',
    72: 'Salada de Frutas',
    73: 'Barra de Ferro',
    76: 'Haste de Madeira',
    43: 'Cerca de Madeira',
    49: 'Tecido de Lã',
    93: 'Poço de Água',
    94: 'Bateria',
    100: 'Contrato Municipal'
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
    animal_treat: 'Petisco Animal'
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
      close: 'Fechar'
    },
    stats: {
      hunger: 'Fome',
      thirst: 'Sede',
      morale: 'Moral',
      mood: 'Humor'
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
      suspicious: 'Desconfiado demais para comer...',
      no_inventory: 'Inventário indisponível.'
    },
    type: {
      unknown: 'Desconhecido'
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
    done: 'Concluir' // Añadido desde settingsUI.js
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
    well: 'Poço',
    lowerBucket: 'Descer balde',
    insufficientWater: 'Água insuficiente no poço',
    playerNotAvailable: 'Sistema do jogador não disponível',
    noEmptyBottle: 'Nenhuma garrafa vazia no inventário',
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
    notAvailableAfter: 'Função de construção não disponível após carregamento.',
    buildError: 'Erro ao entrar no modo de construção. Verifique o console.'
  },

  // Quests / Missões
  quests: {
    title: 'Missões',
    noQuests: 'Nenhuma missão disponível.',
    status: {
      available: 'Disponível',
      active: 'Em andamento',
      completed: 'Concluída',
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