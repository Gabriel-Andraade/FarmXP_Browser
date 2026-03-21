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
  // Main Menu
  menu: {
    play: 'Jugar',
    continue: 'Continuar',
    newGame: 'Nuevo Juego',
    settings: 'Configuración',
    quit: 'Salir',
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
    93: 'Pozo de Agua'
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
      feed: 'Alimentar',
      close: 'Cerrar'
    },
    stats: {
      hunger: 'Hambre',
      thirst: 'Sed',
      morale: 'Moral'
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
    done: 'Hecho',
    minimapToggle: 'Alternar minimapa (M)'
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