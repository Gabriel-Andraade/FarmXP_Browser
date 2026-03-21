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
  // Main Menu
  menu: {
    play: 'Jogar',
    continue: 'Continuar',
    newGame: 'Novo Jogo',
    settings: 'Configurações',
    quit: 'Sair',
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
    done: 'Concluir',
    minimapToggle: 'Alternar minimapa (M)'
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