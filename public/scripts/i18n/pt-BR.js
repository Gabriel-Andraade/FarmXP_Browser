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
    93: 'Poço de Água'
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
      feed: 'Alimentar',
      close: 'Fechar'
    },
    stats: {
      hunger: 'Fome',
      thirst: 'Sede',
      morale: 'Moral'
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