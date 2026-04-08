/**
 * Spanish Translations Dictionary
 * @file es.js
 * @description Complete Spanish translation object for FarmingXP game
 * Contains all UI strings, messages, and game content in Spanish
 * Used by i18n system for language localization
 * @module translations/es
 * @exports {Object} Translation dictionary with nested keys
 * @example
 * import es from './es.js';
 * const menuPlayText = es.menu.play; // 'Jugar'
 * const hungerLabel = es.player.hunger; // 'Hambre'
 */
export default {
  // Achievements
  achievements: {
    title: 'Logros',
    unlocked: '¡Logro Desbloqueado!',
    locked: 'Bloqueado',
    hidden: '???',
    progress: '{current}/{target}',
    category: {
      all: 'Todos',
      farming: 'Granja',
      animals: 'Animales',
      economy: 'Economía',
      exploration: 'Exploración',
      survival: 'Supervivencia',
    },
    firstSteps:    { title: 'Primeros Pasos',      description: 'Comienza tu aventura en la granja' },
    nightOwl:      { title: 'Búho Nocturno',        description: 'Quédate despierto hasta las 10 PM' },
    firstTree:     { title: '¡Madera!',             description: 'Tala tu primer árbol' },
    lumberjack:    { title: 'Leñador',              description: 'Tala 50 árboles' },
    stoneBreaker:  { title: 'Rompe-Piedras',        description: 'Rompe 25 rocas' },
    firstBuild:    { title: 'Constructor',          description: 'Coloca tu primera estructura' },
    animalFriend:  { title: 'Amigo Animal',         description: 'Acaricia un animal por primera vez' },
    rancher:       { title: 'Ganadero',             description: 'Alimenta animales 20 veces' },
    firstCoin:     { title: 'Primera Moneda',       description: 'Gana dinero por primera vez' },
    wealthyFarmer: { title: 'Granjero Rico',        description: 'Ten $5,000 a la vez' },
    bigSpender:    { title: 'Derrochador',          description: 'Gasta un total de $10,000' },
    hoarder:       { title: 'Acumulador',           description: 'Posee 50 objetos únicos' },
    earlyBird:     { title: 'Madrugador',           description: 'Completa tu primera noche de sueño' },
    closeCall:     { title: 'Por Poco',             description: 'Deja que una necesidad llegue a niveles críticos' },
    survivor7:     { title: 'Superviviente',        description: 'Sobrevive 7 días en la granja' },
    // ── 40 logros adicionales ──
    treeHugger:       { title: 'Abraza-Árboles',       description: 'Tala 100 árboles' },
    deforestation:    { title: 'Deforestación',        description: 'Tala 250 árboles' },
    rockSolid:        { title: 'Roca Sólida',          description: 'Rompe 100 rocas' },
    quarryMaster:     { title: 'Maestro Cantero',      description: 'Rompe 250 rocas' },
    masterBuilder:    { title: 'Maestro Constructor',  description: 'Coloca 25 estructuras' },
    fenceEnthusiast:  { title: 'Entusiasta de Cercas', description: 'Coloca 50 cercas' },
    wellDigger:       { title: 'Cavador de Pozos',     description: 'Coloca tu primer pozo' },
    firstHit:         { title: 'Primer Golpe',         description: 'Ataca un objeto por primera vez' },
    persistentHitter: { title: 'Implacable',           description: 'Ataca objetos 500 veces' },
    thicketClearer:   { title: 'Limpiador de Maleza',  description: 'Limpia 10 matorrales' },
    petLover:         { title: 'Amante de Mascotas',   description: 'Acaricia animales 50 veces' },
    animalWhisperer:  { title: 'Susurrador de Animales', description: 'Acaricia animales 100 veces' },
    firstShear:       { title: 'Primera Esquila',      description: 'Esquila un animal por primera vez' },
    firstCollect:     { title: 'Cazador de Huevos',    description: 'Recoge un producto animal por primera vez' },
    feedingFrenzy:    { title: 'Frenesí Alimenticio',  description: 'Alimenta animales 100 veces' },
    dedicatedCaretaker: { title: 'Cuidador Dedicado',  description: 'Interactúa con animales 200 veces' },
    pennyPincher:     { title: 'Tacaño',               description: 'Ten $1,000 a la vez' },
    tycoon:           { title: 'Magnate',              description: 'Ten $25,000 a la vez' },
    millionaire:      { title: 'Millonario',           description: 'Ten $100,000 a la vez' },
    firstPurchase:    { title: 'Primera Compra',       description: 'Compra algo por primera vez' },
    generousSpender:  { title: 'Gastador Generoso',    description: 'Gasta un total de $50,000' },
    itemCollector10:  { title: 'Coleccionista',        description: 'Posee 10 objetos únicos' },
    itemCollector25:  { title: 'Entusiasta',           description: 'Posee 25 objetos únicos' },
    discardKing:      { title: 'Limpieza General',     description: 'Descarta 20 objetos' },
    midnightWanderer: { title: 'Vagabundo Nocturno',   description: 'Quédate despierto hasta la medianoche' },
    marathonRunner:   { title: 'Maratonista',          description: 'Camina 10,000 pasos' },
    speedWalker:      { title: 'Caminante Veloz',      description: 'Camina 50,000 pasos' },
    worldTraveler:    { title: 'Viajero del Mundo',    description: 'Camina 200,000 pasos' },
    weekOne:          { title: 'Una Semana',           description: 'Llega al día 7' },
    monthOne:         { title: 'Un Mes',               description: 'Llega al día 30' },
    stormChaser:      { title: 'Cazador de Tormentas', description: 'Presencia una tormenta' },
    fogWalker:        { title: 'Caminante en la Niebla', description: 'Presencia un día de niebla' },
    gourmet:          { title: 'Gourmet',              description: 'Consume 50 objetos' },
    foodie:           { title: 'Glotón',               description: 'Consume 100 objetos' },
    firstMeal:        { title: 'Primera Comida',       description: 'Come o bebe algo por primera vez' },
    survivor30:       { title: 'Superviviente Mensual', description: 'Sobrevive 30 días en la granja' },
    veteranFarmer:    { title: 'Granjero Veterano',    description: 'Sobrevive 100 días en la granja' },
    ironWill:         { title: 'Voluntad de Hierro',   description: 'Ten las tres necesidades en nivel crítico' },
    toolMaster:       { title: 'Maestro de Herramientas', description: 'Equipa herramientas 10 veces' },
    blizzardSurvivor: { title: 'Superviviente de Ventisca', description: 'Presencia una ventisca' },
  },

  // Main Menu (legacy keys)
  menu: {
    play: 'Jugar',
    continue: 'Continuar',
    newGame: 'Nuevo Juego',
    settings: 'Configuración',
    quit: 'Salir',
  },

  // Gallery
  gallery: {
    title: 'Galer\u00eda',
    newReward: '\u00a1Nueva imagen enviada a la Galer\u00eda!',
    imageNotCreated: '\u00a1Imagen a\u00fan no creada!',
    rewardSentToGallery: '\u00a1Esta recompensa ha sido enviada a tu Galer\u00eda!',
    noUnlockedImages: 'Ninguna imagen desbloqueada a\u00fan. \u00a1Completa logros para ganar recompensas!',
    photosEmpty: 'Ninguna foto a\u00fan.',
    notesEmpty: 'Ninguna nota a\u00fan.',
    screenshotsEmpty: 'Ninguna captura de pantalla a\u00fan.',
    tabs: {
      unlockedImages: 'Im\u00e1genes Desbloqueadas',
      characters: 'Personajes',
      photos: 'Fotos',
      notes: 'Notas',
      screenshots: 'Capturas de Pantalla',
    },
  },

  // Main Menu Screen
  mainMenu: {
    subtitle: 'men\u00fa principal',
    play: 'Jugar',
    settings: 'Configuraci\u00f3n',
    gallery: 'Galer\u00eda',
    achievements: 'Logros',
    credits: 'Cr\u00e9ditos',
    feedback: 'Comentarios',
    quit: 'Salir',
    newGame: 'Nuevo Juego',
    loadGame: 'Cargar Juego',
    back: 'Volver',
    comingSoon: 'Pr\u00f3ximamente',
    galleryComingSoon: '\u00a1Sistema de galer\u00eda pr\u00f3ximamente!',
    achievementsComingSoon: '\u00a1Sistema de logros pr\u00f3ximamente!',
    feedbackComingSoon: '\u00a1Sistema de comentarios pr\u00f3ximamente!',
    creditsText: 'FarmingXP \u2014 Hecho por Gabriel Andrade :D\n\nAgradecimientos especiales a todos los apoyadores y jugadores increíbles que hacen posible este proyecto!',
    quitMessage: '\u00a1Gracias por jugar FarmingXP!',
  },

  // Categories (used across multiple systems)
  categories: {
    all: 'Todos',
    tools: 'Herramientas',
    seeds: 'Semillas',
    construction: 'Construcción',
    animal_food: 'Alimento Animal',
    food: 'Comida',
    resources: 'Recursos',
    animals: 'Animales',
    resource: 'Recurso',
  },

  // Inventory System
  inventory: {
    title: 'Inventario',
    empty: 'Nada aquí...',
    emptySubtext: 'Esta categoría está vacía',
    full: '¡Inventario lleno!',
    noDescription: 'Sin descripción disponible.',
    categories: {
      tools: 'Herramientas',
      seeds: 'Semillas',
      construction: 'Construcción',
      animal_food: 'Alimento Animal',
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
    confirmDiscard: '¿Descartar {name}?',
    selectItem: 'Selecciona un artículo'
  },

  // Player HUD
  player: {
    noCharacter: 'Sin personaje',
    level: 'Nivel',
    xp: 'XP',
    hunger: 'Hambre',
    thirst: 'Sed',
    energy: 'Energía',
    money: 'Dinero',
    health: 'Salud'
  },

  // Trading/Merchant System
  trading: {
    title: 'Comercio',
    merchantsTitle: 'Mercaderes de la Región',
    buy: 'Comprar',
    sell: 'Vender',
    buying: 'Comprando',
    selling: 'Vendiendo',
    quantity: 'Cantidad',
    price: 'Precio',
    total: 'Total',
    close: 'Cerrar',
    backToMerchants: 'Volver a Mercaderes',
    notEnoughMoney: '¡Dinero insuficiente!',
    inventoryFull: 'Inventario lleno o error al añadir artículo.',
    purchaseSuccess: '¡Compra realizada! -{value}',
    saleSuccess: '¡Venta realizada! +{value}',
    confirm: 'Confirmar',
    open: 'Abierto',
    closed: 'Cerrado',
    opensAt: 'Abre a las {time}',
    closesAt: 'Cierra a las {time}',
    statusUnknown: 'Estado desconocido',
    closedDayOff: 'Cerrado ({day} es día libre{nextDay})',
    reopens: ', reabre {day}',
    notOpenYet: 'Aún no abrió (Abre a las {time})',
    alreadyClosed: 'Ya cerró (Cerró a las {time})',
    openUntil: 'Abierto - Cierra a las {time}',
    isClosed: '{name} está cerrado',
    merchantClosed: '{name} cerró. Vuelve durante el horario de atención.',
    specialties: 'Especialidades',
    empty: 'Vacío',
    buyMode: 'Modo compra activo. Selecciona un artículo del mercader.',
    sellMode: 'Modo venta activo. Selecciona un artículo de tu inventario.',
    selected: 'Seleccionado: {name} ({qty}x) - {action}: {price} cada uno',
    confirmSell: '¿Vender {qty}x {name} por {value}?',
    confirmBuy: '¿Comprar {qty}x {name} por {value}?',
    removeError: 'Error al remover artículo del inventario.',
    storageNotImplemented: 'Venta/Compra directa del almacén no implementada.',
    itemNotFound: 'Artículo no encontrado en el mercader.',
    invalidBuyValue: 'Valor de compra inválido.',
    professions: {
      materialsSeller: 'Vendedor de Materiales',
      cook: 'Cocinera',
      livestock: 'Ganadería'
    },
    descriptions: {
      thomas: 'Dueño de la tienda de materiales de construcción.',
      lara: 'Vende comidas e ingredientes.',
      rico: 'Vende semillas, alimento y animales.'
    },
    specialtiesLabels: {
      resources: 'Recursos',
      tools: 'Herramientas',
      construction: 'Construcción',
      food: 'Comida',
      ingredients: 'Ingredientes',
      meals: 'Comidas',
      seeds: 'Semillas',
      animals: 'Animales'
    }
  },

  // Time and Calendar
  time: {
    weekdays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    day: 'Día {day}',
    dayLabel: 'día',
    seasonLabel: 'estación',
    weatherLabel: 'clima',
    morning: 'Mañana',
    afternoon: 'Tarde',
    evening: 'Noche',
    night: 'Madrugada',
    sleeping: 'Durmiendo profundamente: Día {fromDay} → Día {toDay} ({weekday})',
    wait: 'Espere...',
    sleepZzz: 'Zzz...'
  },

  // Seasons
  seasons: {
    spring: 'Primavera',
    summer: 'Verano',
    autumn: 'Otoño',
    winter: 'Invierno'
  },

  // Weather Conditions
  weather: {
    conditions: {
      clear: 'Despejado',
      rain: 'Lluvia',
      storm: 'Tormenta',
      fog: 'Niebla',
      snow: 'Nieve',
      blizzard: 'Ventisca'
    }
  },

  // Tools
  tools: {
    axe: 'hacha',
    pickaxe: 'pico',
    machete: 'machete',
    hoe: 'azada',
    wateringCan: 'regadera',
    scythe: 'guadaña'
  },

  // Items (common ones) - legacy keys
  items: {
    wood: 'Madera',
    stone: 'Piedra',
    wheat: 'Trigo',
    carrot: 'Zanahoria',
    fence: 'Cerca',
    well: 'Pozo',
    corn: 'Maíz',
    tomato: 'Tomate',
    potato: 'Papa',
    seeds: 'Semillas',
    hay: 'Heno'
  },

  // Item names by ID - para traducción dinámica
  itemNames: {
    0: 'Tijeras de jardinería',
    1: 'Azada',
    2: 'Martillo',
    3: 'Semillas de Maíz',
    4: 'Semillas de Trigo',
    5: 'Manzana',
    6: 'Pan',
    7: 'Alimento para Gallina',
    8: 'Alimento para Oveja',
    9: 'Madera Cruda',
    10: 'Piedra',
    11: 'Guadaña',
    12: 'Regadera',
    13: 'Pico',
    14: 'Hacha',
    15: 'Rastrillo',
    16: 'Cubo',
    17: 'Semillas de Zanahoria',
    18: 'Semillas de Tomate',
    19: 'Semillas de Papa',
    20: 'Semillas de Fresa',
    21: 'Semillas de Flores',
    22: 'Machete',
    23: 'Queso',
    24: 'Huevo Cocido',
    25: 'Tarta de Manzana',
    26: 'Sopa de Verduras',
    27: 'Miel',
    28: 'Jugo de Fruta',
    29: 'Heno',
    30: 'Alimento para Vaca',
    31: 'Golosinas para Animales',
    32: 'Ladrillos',
    33: 'Tejas',
    34: 'Clavos',
    35: 'Cuerda',
    36: 'Vidrio',
    37: 'Hierro',
    40: 'Botella vacía',
    53: 'Semillas de Árbol',
    54: 'Fibra Vegetal',
    55: 'Arcilla',
    56: 'Carbón',
    57: 'Astillas de Madera',
    58: 'Tabla de Madera',
    59: 'Harina de Trigo',
    60: 'Huevo',
    61: 'Leche',
    62: 'Lana',
    63: 'Maíz',
    64: 'Trigo',
    65: 'Fresa',
    68: 'Naranja',
    69: 'Cofre de Almacenamiento',
    71: 'Maíz Asado',
    72: 'Ensalada de Frutas',
    73: 'Barra de Hierro',
    76: 'Vara de Madera',
    43: 'Cerca de Madera',
    49: 'Tela de Lana',
    93: 'Pozo de Agua',
    94: 'Batería',
    100: 'Contrato Municipal'
  },

  // Recipe names by ID - para traducción dinámica
  recipeNames: {
    wood_scrap: 'Astillas de Madera (Leña)',
    wood_plank: 'Tabla de Madera',
    wooden_rod: 'Vara de Madera',
    rope: 'Cuerda Simple',
    charcoal: 'Carbón',
    iron_bar: 'Barra de Hierro',
    nail: 'Clavos',
    clay_brick: 'Ladrillo de Arcilla',
    wool_fabric: 'Tela de Lana',
    axe: 'Hacha',
    pickaxe: 'Pico',
    hoe: 'Azada',
    scythe: 'Guadaña',
    wooden_fence: 'Cerca de Madera',
    storage_chest: 'Cofre de Almacenamiento',
    well: 'Pozo de Agua',
    wheat_flour: 'Harina de Trigo',
    simple_bread: 'Pan Simple',
    roasted_corn: 'Maíz Asado',
    cheese: 'Queso',
    boiled_egg: 'Huevo Cocido',
    fruit_salad: 'Ensalada de Frutas',
    animal_feed_basic: 'Alimento Básico (Heno)',
    animal_treat: 'Golosina Animal'
  },

  // General Messages
  messages: {
    loading: 'cargando...',
    preparingFarm: 'Preparando tu granja...',
    gameSaved: '¡Juego guardado!',
    gameLoaded: '¡Juego cargado!',
    itemAdded: '{item} añadido al inventario',
    itemRemoved: '{item} removido del inventario',
    levelUp: '¡Subiste de nivel!',
    lowHunger: '¡Tienes hambre!',
    lowThirst: '¡Tienes sed!',
    lowEnergy: '¡Estás cansado!',
    goodMorning: '¡Buenos días! Energías renovadas.',
    languageChangeFailed: 'Error al cambiar idioma. Inténtalo de nuevo.'
  },

  // Settings
  settings: {
    title: '⚙️ Configuración',
    language: 'Idioma',
    sound: 'Sonido',
    music: 'Música',
    volume: 'Volumen',
    fullscreen: 'Pantalla Completa',
    save: 'Guardar',
    cancel: 'Cancelar',
    graphics: 'Gráficos',
    accessibility: 'Accesibilidad',
    highContrast: 'Alto contraste',
    reducedMotion: 'Reducir animaciones',
    textSize: 'Tamaño del texto',
    textNormal: 'Normal',
    textLarge: 'Grande',
    textExtraLarge: 'Extra Grande',
    screenReader: 'Anuncios para lector de pantalla',
    colorVision: 'Modo de visión de color',
    cvOff: 'Desactivado',
    cvProtanopia: 'Protanopía (rojo-verde)',
    cvDeuteranopia: 'Deuteranopía (verde-rojo)',
    cvTritanopia: 'Tritanopía (azul-amarillo)',
    cvAchromatopsia: 'Acromatopsia (sin colores)',
    
    audio: {
      title: 'Sonido',
      musicVolume: 'Volumen de Música',
      musicVolumeHint: 'Ajusta el volumen de la música de fondo.',
      ambientVolume: 'Volumen Ambiental',
      ambientVolumeHint: 'Sonidos del ambiente: piedra, madera, construcción, clima.',
      animalVolume: 'Volumen de Animales',
      animalVolumeHint: 'Sonidos de animales: mugido, cacareo, etc.',
    },
    controls: {
      title: 'Controles',
      remap: 'Remapear teclas',
      remapHint: 'Personaliza las teclas del teclado (WASD, flechas, atajos).',
      openRemap: 'Abrir',
      remapTitle: 'Remapear teclas',
      remapSubtitle: 'Haz clic en una tecla para cambiarla. ESC cancela.',
      pressKey: 'Presiona una tecla… (ESC cancela, Retroceso borra el secundario)',
      reset: 'Restablecer'
    }
  },

  // Controls - Añadidas desde settingsUI.js
  controls: {
    moveUp: {
      label: 'Mover arriba',
      desc: 'Caminar hacia arriba'
    },
    moveDown: {
      label: 'Mover abajo',
      desc: 'Caminar hacia abajo'
    },
    moveLeft: {
      label: 'Mover izquierda',
      desc: 'Caminar hacia la izquierda'
    },
    moveRight: {
      label: 'Mover derecha',
      desc: 'Caminar hacia la derecha'
    },
    interact: {
      label: 'Interactuar',
      desc: 'Interacción / usar'
    },
    inventory: {
      label: 'Inventario',
      desc: 'Abrir/cerrar inventario'
    },
    merchants: {
      label: 'Mercaderes',
      desc: 'Abrir/cerrar mercaderes'
    },
    config: {
      label: 'Configuración',
      desc: 'Abrir/cerrar configuración'
    },
    help: {
      label: 'Ayuda',
      desc: 'Abrir/cerrar atajos'
    }
  },

  // Actions
  actions: {
    interact: 'Interactuar',
    pickup: 'Recoger',
    use: 'Usar',
    drop: 'Soltar',
    eat: 'Comer',
    drink: 'Beber',
    build: 'Construir',
    destroy: 'Destruir',
    sleep: 'Dormir',
    harvest: 'Cosechar',
    plant: 'Plantar',
    water: 'Regar',
    feed: 'Alimentar'
  },

  // Farm Buildings
  buildings: {
    farmhouse: 'Casa de Campo',
    barn: 'Granero',
    coop: 'Gallinero',
    silo: 'Silo',
    well: 'Pozo',
    fence: 'Cerca',
    gate: 'Portón'
  },

  // Animals
  animals: {
    bull: 'Toro',
    calf: 'Ternero',
    chick: 'Pollito',
    chicken: 'Gallina',
    cow: 'Vaca',
    pig: 'Cerdo',
    sheep: 'Oveja',
    goat: 'Cabra',
    horse: 'Caballo'
  },

  // Animal UI Panel
  animal: {
    ui: {
      actions: 'Acciones',
      info: 'Info',
      interactions: 'Interacciones'
    },
    actions: {
      pet: 'Acariciar',
      guide: 'Guiar',
      unguide: 'Dejar de Guiar',
      feed: 'Alimentar',
      close: 'Cerrar'
    },
    stats: {
      hunger: 'Hambre',
      thirst: 'Sed',
      morale: 'Moral',
      mood: 'Humor'
    },
    mood: {
      sleeping: 'Durmiendo',
      hurt: 'Herido',
      suspicious: 'Desconfiado',
      angry: 'Enfadado',
      sad: 'Triste',
      hungry: 'Hambriento',
      needy: 'Necesitado',
      calm: 'Tranquilo'
    },
    feedback: {
      pet_ok: 'Le encantaron las caricias!',
      gained_trust: 'Ganaste su confianza!',
      sleeping: 'Durmiendo... Zzz',
      suspicious_flee: 'Se alejó, desconfiado...',
      angry: 'Muy enfadado para caricias!',
      max_pets: 'Ya tuvo suficientes caricias hoy.',
      fed: 'Comió feliz!',
      no_food: 'Sin alimento en el inventario!',
      suspicious: 'Demasiado desconfiado para comer...',
      no_inventory: 'Inventario no disponible.'
    },
    type: {
      unknown: 'Desconocido'
    }
  },

  // Crops
  crops: {
    wheat: 'Trigo',
    corn: 'Maíz',
    carrot: 'Zanahoria',
    potato: 'Papa',
    tomato: 'Tomate',
    pumpkin: 'Calabaza',
    cabbage: 'Repollo'
  },

  // UI Elements
  ui: {
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    yes: 'Sí',
    no: 'No',
    ok: 'OK',
    close: 'Cerrar',
    back: 'Atrás',
    next: 'Siguiente',
    previous: 'Anterior',
    save: 'Guardar',
    load: 'Cargar',
    delete: 'Eliminar',
    new: 'Nuevo',
    merchants: 'Mercaderes de la Región',
    commerce: 'Comercio',
    inventory: 'Inventario',
    storage: 'Almacén',
    backToMerchants: 'Volver a Mercaderes',
    otherSettings: 'Otros ajustes en desarrollo...',
    inventoryTab: 'Inventario',
    storageTab: 'Almacén',
    inventoryNotAvailable: '🎒 Sistema de inventario no disponible',
    done: 'Hecho' // Añadido desde settingsUI.js
  },

  // HUD Action Buttons
  hud: {
    saveTooltip: 'Guardar / Cargar (💾)',
    settingsTooltip: 'Configuración ({key})',
    inventoryTooltip: 'Inventario ({key})',
    commerceTooltip: 'Comercio ({key})',
    helpTooltip: 'Atajos ({key})'
  },

  // Tutorials/Help
  help: {
    movement: 'Usa WASD o flechas para moverte',
    interact: 'Presiona E para interactuar',
    inventory: 'Presiona I para abrir inventario',
    pause: 'Presiona ESC para pausar',
    doorHint: 'Presiona <strong>E</strong> para acceder a la casa'
  },

  // Character Selection
  characterSelection: {
    title: 'FarmingXP',
    subtitle: 'Selecciona tu personaje para comenzar',
    startGame: 'Iniciar Juego',
    continueAdventure: 'O continúa tu aventura',
    loadGame: 'Cargar Juego Guardado',
    inDevelopment: 'En Desarrollo',
    onlyStellaAvailable: '¡Solo Stella está disponible por el momento!',
    selectStellaToPlay: 'Selecciona a Stella para jugar.',
    selectCharacterFirst: 'Por favor, selecciona un personaje primero.',
    saveNotAvailable: 'Sistema de guardado no disponible. Iniciando nuevo juego.',
    redirecting: 'Solo Stella está disponible. Redireccionando...',
    subtitles: {
      stella: 'La joven granjera',
      ben: 'El granjero astuto',
      graham: 'El brazo de la agricultura',
      default: 'Granjero'
    },
    descriptions: {
      stella: 'Aventurera y valiente, Stella creció en la granja familiar y conoce todos los secretos de la vida rural.',
      ben: '¡Un tipo pequeño con un gran cerebro! El técnico de las computadoras en los campos.',
      graham: 'Un tipo grande, intrépido, serio y protector, el mejor para el trabajo de campo.'
    },
    noSavesFound: 'No se encontraron guardados. Selecciona un personaje para comenzar.',
    saveSystemError: 'Error al acceder al sistema de guardado.'
  },

  // House System
  house: {
    title: 'Mi Casa',
    enter: 'Entrar a Casa',
    sleep: 'Dormir',
    crafting: 'Fabricación',
    storage: 'Almacén',
    customize: 'Personalizar',
    close: 'Cerrar',
    entering: 'Entrando a la casa...',
    craftingNotAvailable: 'Sistema de fabricación no disponible',
    customizeNotImplemented: 'Personalización aún no implementada',
    saveGame: 'Guardar Juego',
    loadGame: 'Cargar Juego',
    saveNotAvailable: 'Sistema de guardado no disponible'
  },

  // Storage System
  storage: {
    title: 'Almacén',
    withdraw: 'Retirar Artículos',
    deposit: 'Depositar Artículos',
    items: 'artículos',
    value: 'valor',
    stacks: 'pilas',
    mode: 'modo',
    withdrawMode: 'retirar',
    depositMode: 'depositar',
    withdrawBtn: 'retirar ({qty})',
    depositBtn: 'depositar ({qty})',
    emptyCategory: 'Sin artículos en esta categoría',
    insufficientQuantity: 'Cantidad insuficiente en inventario',
    invalidCategory: 'Categoría inválida',
    storageFull: 'Almacén de {category} lleno',
    deposited: 'Depositado: {qty}x {name}',
    itemNotFound: 'Artículo no encontrado en almacén',
    withdrawn: 'Retirado: {qty}x {name}',
    inventoryFull: 'Inventario lleno',
    syncError: 'Error de sincronización con inventario'
  },

  // Chest System
  chest: {
    title: 'Cofre',
    storage: 'Almacenamiento del Cofre',
    inventory: 'Tu Inventario',
    takeAll: 'Tomar Todo',
    storeAll: 'Guardar Todo',
    organize: 'Organizar',
    empty: 'El cofre está vacío',
    stored: '{name} guardado en el cofre',
    taken: '{name} retirado del cofre',
    takenAll: '{count} artículos retirados del cofre',
    storedAll: '{count} artículos guardados en el cofre',
    organized: '¡Cofre organizado!',
    notFound: '¡Cofre no encontrado!',
    categoryFull: '¡Categoría {category} llena en el cofre!'
  },

  // Well System
  well: {
    backpack: 'Mochila',
    actions: 'Acciones',
    drink: 'Beber',
    collect: 'Recolectar',
    fillBottle: 'Llenar botella',
    well: 'Pozo',
    lowerBucket: 'Bajar balde',
    insufficientWater: 'Agua insuficiente en el pozo',
    playerNotAvailable: 'Sistema del jugador no disponible',
    noEmptyBottle: 'Ninguna botella vacía en el inventario',
  },

  // Crafting System
  crafting: {
    title: 'Fabricación',
    craft: 'Crear',
    crafting: 'Fabricando...',
    crafted: '¡Fabricado: {name}!',
    craftError: '¡Error al fabricar!',
    ingredients: 'Ingredientes',
    result: 'Resultado',
    notEnoughMaterials: '¡Faltan materiales!',
    success: '¡Artículo creado con éxito!',
    recipes: 'Recetas',
    missing: 'Faltando'
  },

  // Save Slots UI
  saveSlots: {
    titleSaveLoad: 'Guardar / Cargar',
    titleSave: 'Guardar Juego',
    titleLoad: 'Cargar Juego',
    slotNumber: 'Slot {number}',
    empty: 'Vacío',
    active: 'Activo',
    noSaveInSlot: 'Sin guardado en este slot',
    createSave: 'Crear Guardado',
    character: 'Personaje:',
    totalTime: 'Tiempo Total:',
    createdAt: 'Creado:',
    lastSave: 'Último guardado:',
    lastSession: 'Última sesión:',
    play: 'Jugar',
    save: 'Guardar',
    saveName: 'Nombre del guardado:',
    defaultName: 'Guardado {number}',
    newName: 'Nuevo nombre:',
    createSuccess: '¡Guardado creado con éxito!',
    createError: 'Error al crear guardado',
    loadError: 'Error al cargar guardado',
    loading: 'Cargando guardado...',
    applying: 'Aplicando datos...',
    applyError: 'Error al aplicar guardado',
    ready: '¡Listo!',
    loadSuccess: '¡Guardado cargado!',
    confirmOverwrite: '¿Sobrescribir "{name}"?\nEsto no se puede deshacer.',
    overwriteSuccess: '¡Guardado actualizado!',
    saveError: 'Error al guardar',
    emptyNameError: 'El nombre no puede estar vacío',
    renameSuccess: '¡Guardado renombrado!',
    renameError: 'Error al renombrar',
    confirmDelete: '¿Eliminar "{name}"?\n¡Esto no se puede deshacer!',
    deleteSuccess: 'Guardado eliminado',
    deleteError: 'Error al eliminar'
  },

  // Sleep / Loading Screen
  sleep: {
    title: 'Descanso Reparador',
    progress: 'Progreso',
    fallingAsleep: 'Quedándose dormido...',
    closingEyes: 'Cerrando los ojos...',
    cache: 'Caché',
    memory: 'Memoria',
    waiting: 'Esperando...',
    worldQuiet: 'El mundo se queda en silencio',
    deepSleep: 'Sueño Profundo',
    recoveringEnergy: 'Recuperando energía...',
    cleaning: 'Limpiando...',
    analyzing: 'Analizando...',
    optimizing: 'Optimizando',
    reorganizing: 'Reorganizando pensamientos...',
    freeing: 'Liberando...',
    compacting: 'Compactando...',
    almostThere: 'Casi listo',
    sunRising: 'El sol está saliendo...',
    clean: 'Limpio',
    optimized: 'Optimizado',
    awakening: 'Despertando',
    goodMorning: '¡Buenos días!',
    ready: 'Listo'
  },

  // Loading Screen
  loading: {
    preparingFarm: 'Preparando tu granja...'
  },

  // Build System
  build: {
    mode: 'Modo Construcción',
    gridX: 'cuadrícula x: izq | cen | der',
    gridY: 'cuadrícula y: abajo | cen | arriba',
    rotate: 'rotar (variante)',
    place: 'colocar',
    exit: 'salir del modo construcción',
    alignment: 'alineación',
    alignLeft: 'izq',
    alignCenter: 'cen',
    alignRight: 'der',
    alignTop: 'arriba',
    alignBottom: 'abajo',
    notBuildable: 'el artículo no es construible',
    building: 'construyendo: {name}',
    systemError: 'error de sistema (theWorld)',
    itemEmpty: '¡se acabó el artículo!',
    chestPlaced: '¡cofre colocado! ({remaining} restante)',
    chestError: 'error al agregar cofre',
    chestFailed: 'fallo al colocar cofre',
    chestLoading: 'sistema de cofres cargando...',
    wellPlaced: '¡pozo colocado! ({remaining} restante)',
    wellError: 'error al colocar pozo',
    wellLoading: 'sistema de pozos cargando...',
    placed: '¡colocado! ({remaining} restante)',
    placeError: 'error al colocar objeto',
    worldNotAvailable: 'error: theWorld.addWorldObject no disponible',
    variant: 'variante: {name}',
    notAvailable: 'Función de construcción no disponible.',
    notAvailableAfter: 'Función de construcción no disponible después de cargar.',
    buildError: 'Error al entrar en modo de construcción. Consulta la consola.'
  },

  // Misiones
  quests: {
    title: 'Misiones',
    noQuests: 'No hay misiones disponibles.',
    status: {
      available: 'Disponible',
      active: 'En progreso',
      completed: 'Completada',
    },
    fixPickup: {
      title: 'Reparar la Camioneta',
      description: 'La camioneta verde está rota. Encuentra una batería en el almacén para repararla y desbloquear el viaje a la ciudad.',
      bubbleNotRepaired: 'hmm... necesito reparar esta camioneta...',
      bubbleNoBattery: 'Necesito una batería para repararla... creo que vi una en el almacén.',
      bubbleRepairing: 'Instalando la batería en la camioneta...',
      bubbleRepaired: '¡Camioneta reparada! ¡Ahora puedo viajar a la ciudad!',
      batteryHint: 'Pulsa E para recoger la batería',
      batteryPickedUp: '¡Tengo la batería! Ahora necesito llevarla a la camioneta.',
    },
    hud: {
      tooltip: 'Misiones',
    },
    hint: 'Pulsa E',
    traveling: 'Viajando a ciudad...',
  },

  // Dialogue system
  dialogue: {
    advanceHint: 'Haz clic o pulsa Espacio',
    talkHint: 'Pulsa E para hablar con {name}',
  },

  // NPC Bartolomeu dialogues
  npc: {
    bartolomeu: {
      sleeping: '*durmiendo* ...zZzZz...',
      playerHi: 'Eh... ¿hola?',
      wakeUp: {
        stella: '*se despierta* ...¿eh? ¿Y quién eres tú, chica? ¿Qué haces aquí en este fin del mundo?',
        ben: '*se despierta* ...¿eh? ¿Y quién eres tú, chaval? ¿Dónde están tus padres?',
        graham: '*traga saliva* S-sí, ¿señor? ¿Qué necesita?',
        default: '*se despierta* ...¿quién eres?',
      },
      playerIntro: {
        stella: 'Bueno... me mudé aquí hace poco y estoy viviendo en la casa de mi abuelo... mi tío me dijo que este pueblo es el más cercano y que todos lo conocían también.',
        ben: 'Mis padres me mandaron aquí a cuidar la casa y el terreno de mi abuelo. También me dijeron que la gente de aquí lo conocía y que podrían ayudarme en lo que necesitara.',
        graham: 'Me mudé aquí, estoy en la antigua casa de mi abuelo. Me recomendaron este pueblo. Y usted sería... el alcalde, ¿correcto? Bartolomeu.',
        default: 'Me mudé aquí hace poco.',
      },
      bartolomeuIntro: {
        graham: '¡Así es! ¡Alcalde de Capa de Ganso! Este pequeño pueblo con bosques, ranchos, granjas y animales. ¡Espero que se sienta más que bienvenido! ¡Y no ande mucho de noche! Porque bueno... el presupuesto está corto, incluso con donaciones todavía no podemos pagar farolas nuevas...',
        default: 'Bueno, soy Bartolomeu, ¡alcalde de Capa de Ganso! Este pequeño pueblo con bosques, ranchos, granjas y animales. ¡Espero que seas más que bienvenido! ¡Y no andes mucho de noche! Porque bueno... el presupuesto está corto, incluso con donaciones todavía no podemos pagar farolas nuevas...',
      },
      playerReaction: {
        stella: 'Bueno... creo que puedo ayudar.',
        ben: 'Oooh...',
        graham: 'Basándome en el valor, tal vez pueda ayudar.',
        default: 'Entiendo...',
      },
      gilbertLine: {
        ben: 'Bueno... tu abuelito debe haber sido... Gilbert, ¿verdad? ¡Quizás ahora las noches de Capa de Ganso se conviertan en día! Pues bien. Tu abuelo tenía un terreno muy sólido, ¡quizás puedas juntar unos {money}! Tranquilo, ¡lo descontaré de los impuestos, jajajaja!',
        stella: 'Mirándote bien... tu abuelo es Gilbert, ¿correcto? ¡Quizás ahora las noches de Capa de Ganso se conviertan en día! Pues bien. Tu abuelo tenía un terreno muy sólido, ¡quizás puedas juntar unos {money}! Tranquilo, ¡lo descontaré de los impuestos, jajajaja!',
        graham: 'Hmm... tu abuelo debe haber sido Gilbert, ¿verdad? ¡Quizás ahora las noches de Capa de Ganso se conviertan en día! Pues bien. Tu abuelo tenía un terreno muy sólido, ¡quizás puedas juntar unos {money}! Tranquilo, ¡lo descontaré de los impuestos, jajajaja!',
        default: 'Tu abuelo tenía un buen terreno. ¡Quizás puedas juntar {money}!',
      },
      merchantQuestion: 'Un terreno hermoso, quizás unas plantaciones y árboles puedan darte ganancias. ¿Ya conoces nuestros 3 pilares de la economía?',
      merchantYes: '¡Sí, ya los conozco!',
      merchantNo: 'No, ¿quiénes son?',
      merchantKnown: '¡Perfecto! ¡Véndeles tu material! Y cuando hayas acumulado tu dinero, ¡ven a hablar conmigo!',
      merchantExplain: '¡Pulsa U o el botón 🛒 para abrir los mercaderes! Allí encontrarás a Lara, Rico y Thomas. Puedes vender cualquier recurso e ítems a cualquiera de ellos, ¡pero si vendes el ítem correcto a cada uno según su profesión, quizás paguen mejor!',
      playerThought: '(Ok... el alcalde no debe estar muy bien de la cabeza...)',
      questOffer: '¡Bueno entonces joven! ¿Aceptas ayudar a este humilde pueblo?',
      questWhisper: '*susurrando* ¡Puedo darte un descuento de hasta 2% en los impuestos de tu tierra, eh! jaja...',
      questAcceptQ: '¿Aceptas?',
      questAcceptOpt: 'Veré qué puedo hacer.',
      questDeclineOpt: 'No sé... vuelvo después.',
      questAccepted: '¡Ok! ¡Junta {money} y vuelve aquí! ¡Nos vemos por ahí, joven!!!!',
      questDeclined: '... ¿entonces puedo volver a mi siesta en mi banco después de mi paseo en Plymouth Cuda? Hasta luego.',
      // Declined revisit
      declinedGreet: '¡Hola de nuevo, joven! ¿Necesitas algo?',
      declinedAcceptOpt: 'Bueno... puedo ayudar después de todo.',
      declinedLeaveOpt: 'Nada importante, solo paseando.',
      declinedAccepted: '¡Excelente! ¡Junta {money} y vuelve aquí!',
      declinedLeave: '¡Está bien! ¡Disfruta el pueblo entonces!',
      // Quest active
      activeGreet: '¡Hey joven! ¿Lograste juntar el dinero?',
      activePlayerHas: '¡Sí! Tengo {money}.',
      activeDeliverPrompt: '¡Perfecto! ¡Con {money} podremos iluminar este pueblo!',
      activeDeliverOpt: 'Entregar {money} (se descontará de tu saldo)',
      activeWaitOpt: 'Todavía no, vuelvo después.',
      activeDelivered: '¡Muchas gracias joven! ¡El pueblo lo agradece! ¡Ahora sí tendremos farolas nuevas!',
      activeDiscount: '¡Desconté el 2% de impuesto como prometí, jajajaja! ¡Hasta luego!',
      activeWait: '¡Sin prisa! ¡Cuando estés listo, vuelve aquí!',
      activeNotEnoughGreet: '¡Hey joven! ¿Cómo van las cosas?',
      activeNotEnoughPlayer: 'Todavía estoy juntando... tengo {money} por ahora.',
      activeNotEnoughBart: '¡Falta un poco todavía! Necesito {money}. ¡Sigue vendiendo tus recursos! ¡Hasta luego!',
      // Completed
      completedGreet: '¡Hey joven! ¡El pueblo está cada vez mejor gracias a ti!',
      completedPlayer: '¡Qué bien! Me alegra ayudar.',
      completedBart: '¡Sigue así! ¡Capa de Ganso cuenta contigo!',

      // ── Quest 2: Tiendas nuevas + Impuestos ──
      q2: {
        // Saludo inicial
        greet: {
          ben: '¡Hola querido joven! ¿Cómo va la granja, eh?',
          graham: 'Hola de nuevo, ¿tienes un momento?',
          stella: '¡Señorita! ¿Todo bien?',
        },
        playerHi: 'Eh.. hola, sí todo bien.',
        bartExcited: '¡¡¡¡¡Genial!!!!! *Bartolomeu se emociona* Bueno, ¡tengo algunas cositas que debo poner aquí pronto! Pero antes... bueno, necesitaría que firmaras este documento...',
        playerAbout: 'Sobre...',
        bartCutsOff: '¡¡¡Espera!!! ¿Ni siquiera me has dicho tu nombre? ¿Quién serías tú? ¡Una gran falta de respeto con tu querido alcalde, no? ¡Jajajaja!',
        // Nombre del jugador
        nameIntro: {
          graham: '*suspira* Graham, Graham Enderfield.',
          ben: '*traga saliva* Soy Ben, un placer Sr. alcalde.',
          stella: 'Stella, pero ¿de qué se trata este contrato?',
        },
        bartAfterNameStella: '*carraspea* Le explicaré señorita Stella.',
        bartPleasure: {
          graham: '¡Un placer señor!',
          ben: '¡Un placer joven!',
          stella: '¡Un placer señora!',
        },
        // Explicación de las tiendas
        bartShops: 'Pienso en abrir tres tienditas más, aparte de la del centro.',
        playerCenter: '¿Pero aquí no es el centro?',
        bartLaugh: '¿Qué? *Aguanta la risa* Bueno... siguiendo la calle de abajo llegas al centro, ¡esto es solo una de las esquinitas jajajaja!',

        // Opciones ronda 1
        choiceContinue: 'Está bien... continúa.',
        choiceWhatIGet: '¿Y qué gano yo con esto?',
        choiceWhereSign: 'Está bien, ¿dónde firmo?',
        choiceNotToday: 'Hoy no.',

        // Bartolomeu suspira (rechazo)
        bartSigh: '*suspira* Está bien entonces... estaré aquí si cambias de opinión.',

        // Si elige "continuar"
        bartExplainShops: '¡¡Ok!! Como tengo algunos amigos cercanos que son vendedores, como Doña Claudia y el señor Carlos, ¡pienso en invitarlos a abrir su tiendita por aquí! Carlos tiene una panadería y Claudia vende flores. ¿Interesante no?',
        shopReaction: {
          stella: 'Pan fresquito... y flores... de hecho, necesito decorar un poco esa casa.',
          ben: 'Eso está bien...',
          graham: '¿Y usted no tiene condiciones para pagar de nuevo?',
        },
        bartShopReply: {
          stella: '¡¡¡Sí sí señorita!!!',
          ben: '¡¡Claro!! ¿Aceptas?',
          graham: '*traga saliva, desviando la mirada hacia su coche y volviendo a Graham* ¡No es ni cuestión de eso hijo mío, ajajaja!',
        },

        // Si elige "qué gano"
        bartExplainGain: 'Bueno, ¡con la panadería de Carlos y la floristería de Claudia, el pueblo va a crecer! Y puedo volver a reducirte un 2% de los impuestos de tu tierra, ¿qué te parece?',

        // Opciones ronda 2
        choice2Sign: 'Firmar.',
        choice2WhatGain: '¿Pero qué puedo ganar?',
        choice2Refuse: '*se queda pensativo*',

        // Firma
        bartThanks: '¡Maravilloso! Aquí, firma en esta línea... ¡listo! ¡Muchas gracias! ¡Pronto las tienditas estarán en pie!',

        // Retorno tras rechazo
        declinedGreet: 'Ah, hola. ¿Qué deseas?',
        declinedExplain: 'Explícame de qué se trata.',
        declinedSign: 'Puedo firmar.',
        declinedVisit: 'Vine a verte.',
        bartVisitReply: {
          stella: 'Estaré aquí, sabes que no me escaparé tan pronto.',
          default: '*se ríe*',
        },
        stellaVisitReply: '... ¿vale?',

        // Misión activa (después de firmar)
        activeGreet: '¡Hola! ¡Las tiendas están casi listas! ¡Ah, y no te olvides de los impuestos, eh!',
      },

      // ── Sistema de Impuestos ──
      tax: {
        noteTitle: 'Día de Pago',
        noteDescription: 'Paga la tasa de {value} monedas. Se cobra cada 10 días.',
        contractTitle: 'Contrato Municipal',
        contractDescription: 'Acuerdo de compromiso firmado con el alcalde Bartolomeu. Los impuestos han subido y cada 10 días se cobrará una tasa para financiar la panadería y floristería del pueblo.',
        paid: '¡Impuesto pagado! -{value} monedas.',
        notEnough: '¡No tienes monedas suficientes para pagar el impuesto!',
        reminder: '¡Día de pago! Paga la tasa de {value} monedas.',
        payOption: 'Pagar {value} monedas.',
        laterOption: 'Después pago...',
        thanksPaid: '¡Muy bien! ¡Gracias por el pago, joven! ¡El pueblo lo agradece!',
        warnLater: 'Hmm... ¡no tardes mucho, eh! Sin los impuestos al día, algunos mercaderes podrían negarse a hacer negocios contigo...',
      },
      // Diálogo libre — tras completar la misión 1 y firmar el contrato
      free: {
        greet: '¿Alguna duda, {name}?',
        choicePassing: 'No, solo estoy de paso.',
        choiceShops: '¿Qué tiendas van a abrir?',
        graham: {
          l1: 'Pareces un soldadito, ¿luchaste en alguna guerra?',
          l2: 'Sí. Fui infante de marina.',
          l3: '¡Qué interesante! ¡Yo también serví en el ejército!',
          l4: '¿Unidad?',
          l5: '*piensa* ...',
          l6: 'Lo olvidé. *fuerza una sonrisa*',
          l7: '*murmura*',
        },
        ben: {
          l1: 'Mira de no quedarte hasta tarde en la calle, entonces.',
          l2: 'Mhm.',
          l3: '¿Qué? ¿Te comió la lengua el gato?',
          l4: 'No soy alérgico a los gatos.',
          l5: '*murmura* ¿Cuántos años tienes?',
          l6: '17.',
          l7: 'Qué joven con suerte, ¡una granja entera con 17 años! A tu edad yo estaba revocando paredes.',
          l8: 'Solo quiero saber cómo voy a cuidar de todo ese matorral... *sonríe a Bartolomeu y se da la vuelta para irse*',
        },
        stella: {
          l1: '¿Qué te parece dar una vuelta uno de estos días? ¡Esa máquina es una bestia!',
          l2: '*frunce el ceño*',
          l3: '¿Y qué coche es ese?',
          l4: '¡¡Es un Plymouth Cuda!! ¡Motor V8 426 Hemi! ¡Con un consumo precioso de unos 25 litros cada 100 km!! ¡Este compañero del 72 es fenomenal! *se levanta del banco emocionado* ¿Te gusta, bella dama?',
          l5: '*frunce el ceño con una sonrisa débil y forzada* Qué... guay... vaya... *desvía la mirada*',
          l6: '¿Te animas a una vueltita? *guiña un ojo con una sonrisa*',
          l7: 'No... estoy ocupada, ¿vale? Para la próxima, chau chau.',
          l8: '*saluda con una sonrisa*',
          l9: 'Qué alcalde más raro... *piensa mientras se da la vuelta para salir, suspirando*',
        },
        shops: {
          l1: 'Una panadería y una floristería. Pronto habrá más opciones de comida. *susurra* ¡Qué bueno dejar de comer la comida de Lara! *vuelve a hablar normal* Y claro, ¡las flores! ¡Para mejorar el ánimo de todos!',
          l2: 'Esto está... un poco... *mira alrededor* vacío, la verdad.',
          l3: '*carraspea* La verdad es que necesitamos mejorar las cosas...',
        },
      },
    },
    milly: {
      // Observando al jugador pasar
      watching: '*una señora te está observando desde la ventana...*',
      // Opciones iniciales
      choiceAsk: '¿Hola? ¿Todo bien?',
      choiceIgnore: '*ignorar*',
      choiceStare: '*devolver la mirada*',
      // Tras elegir "preguntar" o "encarar"
      catQuestion: 'Hola... ¿viniste a llevarte mis gatos?',
      playerWhat: '¿Qué?',
      catYell: '*habla más fuerte desde la ventana* ¿¡VINISTE A LLEVARTE MIS GATOS!?',
      // Reacción por personaje
      playerReaction: {
        stella: '¡No no! ¡Te juro que no!',
        ben: '*se asusta*',
        graham: '*cruza los brazos*',
      },
      millyReaction: {
        stella: 'Hmhmh está bien...',
        ben: '¡JAJAJAJAJA levántate muchacho! *tose de tanto reír*',
        graham: 'Vaya, eres bastante fuerte, hijo mío.',
      },
      // Presentación
      millyIntro: 'Soy Milly. ¿Son nuevos residentes de Capa de Ganso? ¿De este pueblito viejo?',
      playerMoved: 'Sí... me mudé aquí recientemente, viviendo en la antigua casa de Gilbert.',
      millyGilbert: '¿¿¿Gilbert??? ¿¿¿Son los nietitos de Gilbert????????',
      playerYes: '¿Sí...?',
      millySigh: 'Aah, Gilbert... *suspira*',
      millyFarewell: 'Lo extraño mucho... espero que cuiden bien de su granja, ¿eh?...',

      // ── Quest: Madalena ──
      q2: {
        // Milly inicia la conversación sobre Gilbert
        gilbertMemory: {
          stella: 'Gilbert era un hombre maravilloso... siempre traía leche fresca para mis gatos por la mañana.',
          ben: 'Gilbert era un señor muy amable... siempre venía por la mañana a traer leche para mis gatos.',
          graham: 'Gilbert... era un gran hombre. Siempre traía leche para mis gatos, sin falta.',
        },
        playerAboutGilbert: {
          stella: '¿Él hacía eso...? *sonríe* Parece que el abuelo era querido por todos aquí...',
          ben: '...¿en serio? No lo sabía.',
          graham: 'Hmm. Eso suena a algo que él haría.',
        },
        millyNod: 'Sí sí... *suspira* Pero bueno, ¡hablemos de cosas buenas!',

        // Presentación de los gatos
        catsIntro: '¡Tengo cinco gatos! Déjame presentártelos: está Bigotito, Peluda, Sardina, Princesa...',
        catsPause: '...y Madalena.',
        millyWorried: '*la expresión de Milly cambia*',
        millyExplain: 'Madalena... tuvo una cirugía recientemente. Pero justo después de volver, ¡la pícara se escapó por la ventana!',
        millyTeary: 'Estoy tan preocupada... probablemente no se ha recuperado del todo...',

        // Reacción del jugador
        playerReaction: {
          stella: '¡Ay no... pobrecita! ¿A dónde fue?',
          ben: '...¿se escapó? ¿Pero está herida?',
          graham: 'Entiendo. ¿Hacia qué dirección fue?',
        },
        millyDirection: 'La vi correr hacia la granja... probablemente a los terrenos de Gilbert. Siempre le gustó ese lugar...',

        // Opción de aceptar
        choiceAccept: '¡Voy a buscarla!',
        choiceNotNow: 'Ahora no puedo...',

        // Aceptar
        millyGrateful: {
          stella: '¡Ay querida, muchas gracias!! ¡Madalena es una gatita gris oscura, muy chiquita! ¡Ten cuidado de no asustarla!',
          ben: '¡Muchas gracias hijo! ¡Madalena es gris oscurita, chiquitita! Ve despacio cerca de ella, ¿sí?',
          graham: '¡Muchas gracias joven! Es una gatita gris oscura, muy pequeña. Sea gentil con ella, por favor.',
        },

        // Rechazar
        millyUnderstand: 'Está bien... pero si cambias de opinión, por favor... está sola allá afuera...',

        // Diálogo de retorno (mientras no la encuentra)
        returnGreet: '¿Encontraste a Madalena...?',
        returnNotYet: 'Todavía no... pero estoy buscando.',
        returnMillySad: 'Por favor... debe estar tan asustada...',

        // Al encontrar a Madalena en la granja
        foundMadalena: '*Madalena maúlla suavemente al verte...*',
        playerFoundReaction: {
          stella: '¡Te encontré! Ven gatita... tranquila... *recoge a Madalena con cuidado*',
          ben: 'Eh... te encontré... ven... *extiende las manos despacio*',
          graham: '*se agacha lentamente* ...ven aquí.',
        },
        catCaught: '*Madalena se acurruca en tus brazos*',

        // Entregar a Milly
        deliverGreet: '¡¡MADALENA!! *los ojos de Milly se llenan de lágrimas*',
        millyJoy: '¡¡Mi bebé!! Ay... *abraza a Madalena* ¡Gracias... gracias, gracias!!',
        millyReward: {
          stella: '¡Querida, muchas gracias de verdad! Toma, acepta estas monedas... no es mucho, ¡pero es de corazón!',
          ben: '¡Hijo, gracias!! ¡Toma, un regalito para ti! No es mucho pero...',
          graham: 'Joven, le estoy eternamente agradecida. Acepte esto, por favor. Es lo mínimo que puedo hacer.',
        },
        playerFinish: {
          stella: '¡No hace falta! ...pero gracias. ¡Me alegra que esté bien!',
          ben: 'Ah... gracias. Me alegra que esté bien.',
          graham: 'Se lo agradezco. Cuídela bien.',
        },
        millyEnd: '¡Claro que sí! ¡Y ven a visitarnos cuando quieras, eh? ¡A los gatos les encantaste!',
      },
      // Diálogo libre — tras completar la misión de Madalena
      free: {
        ben: {
          l1: '¡Ay, mi cielo! ¿Cómo estás? ¿Vienes a ver a los mininos?',
          l2: '¡Ah, hola! Estoy bien, todavía aprendiendo cosas de la granja...',
          l3: 'Si quieres, ven a desayunar conmigo. ¡Te puedo enseñar algunas cositas! *sonríe*',
          l4: '*esboza una sonrisa y le hace un pulgar arriba a Milly*',
        },
        stella: {
          l1: 'Hola jovencita, ¿qué tal? ¿Cómo van los negocios de la granja, eh?',
          l2: 'Va bien... todavía no sé algunas cositas, pero... creo que estoy progresando.',
          l3: '¡Me alegro! Pero no te esfuerces demasiado, ¿vale? Si hay algo muy pesado puedes llamar a los hombres de aquí, te pueden ayudar. ¡Ah, y no olvides venir a almorzar conmigo!',
          l4: '*sonríe y se despide con la mano*',
        },
        graham: {
          l1: 'Hola muchacho, ¿cómo va la granja? ¿Estás comiendo bien por allá?',
          l2: 'Buenos días, ¿está usted bien? La granja va bien y sí, estoy comiendo bien.',
          l3: '¡Me alegro, hijo mío! Ven a almorzar conmigo algún día. ¡A los gatos y a mí nos encantará tu compañía!',
          l4: '*sonríe* Cuente con ello, vendré.',
        },
      },
    },
  },

  // Panel de atajos
  shortcutsPanel: {
    title: '⌨️ Atajos de Teclado',
    subtitle: 'Las teclas de abajo reflejan tu configuración actual.',
    hintToggle: 'Pulsa {key} para abrir/cerrar.',
    unbound: 'Sin asignar',
    sections: {
      movement: '🏃 Movimiento',
      actions: '🎮 Acciones',
      menus: '📦 Menús'
    }
  }
};