/**
 * English Translations Dictionary
 * @file en.js
 * @description Complete English translation object for FarmingXP game
 * Contains all UI strings, messages, and game content in English
 * Used by i18n system for language localization
 * @module translations/en
 * @exports {Object} Translation dictionary with nested keys
 * @example
 * import en from './en.js';
 * const menuPlayText = en.menu.play; // 'Play'
 * const hungerLabel = en.player.hunger; // 'Hunger'
 */
export default {
  // Main Menu
  menu: {
    play: 'Play',
    continue: 'Continue',
    newGame: 'New Game',
    settings: 'Settings',
    quit: 'Quit',
  },

  // Categories (used across multiple systems)
  categories: {
    all: 'All',
    tools: 'Tools',
    seeds: 'Seeds',
    construction: 'Construction',
    animal_food: 'Animal Feed',
    food: 'Food',
    resources: 'Resources',
    animals: 'Animals',
  },

  // Inventory System
  inventory: {
    title: 'Inventory',
    empty: 'Nothing here...',
    emptySubtext: 'This category is empty',
    full: 'Inventory full!',
    noDescription: 'No description available.',
    categories: {
      tools: 'Tools',
      seeds: 'Seeds',
      construction: 'Construction',
      animal_food: 'Animal Feed',
      food: 'Food',
      resources: 'Resources',
      all: 'All'
    },
    actions: {
      equip: 'Equip',
      consume: 'Consume',
      discard: 'Discard',
      build: 'Build',
      use: 'Use'
    },
    confirmDiscard: 'Discard {name}?',
    selectItem: 'Select an item'
  },

  // Player HUD
  player: {
    noCharacter: 'No character',
    level: 'Level',
    xp: 'XP',
    hunger: 'Hunger',
    thirst: 'Thirst',
    energy: 'Energy',
    money: 'Money',
    health: 'Health'
  },

  // Trading/Merchant System
  trading: {
    title: 'Trading',
    merchantsTitle: 'Regional Merchants',
    buy: 'Buy',
    sell: 'Sell',
    buying: 'Buying',
    selling: 'Selling',
    quantity: 'Quantity',
    price: 'Price',
    total: 'Total',
    close: 'Close',
    backToMerchants: 'Back to Merchants',
    notEnoughMoney: 'Not enough money!',
    inventoryFull: 'Inventory full or error adding item.',
    purchaseSuccess: 'Purchase complete! -{value}',
    saleSuccess: 'Sale complete! +{value}',
    confirm: 'Confirm',
    open: 'Open',
    closed: 'Closed',
    opensAt: 'Opens at {time}',
    closesAt: 'Closes at {time}',
    statusUnknown: 'Status unknown',
    closedDayOff: 'Closed ({day} is day off{nextDay})',
    reopens: ', reopens {day}',
    notOpenYet: 'Not open yet (Opens at {time})',
    alreadyClosed: 'Already closed (Closed at {time})',
    openUntil: 'Open - Closes at {time}',
    isClosed: '{name} is closed',
    merchantClosed: '{name} closed. Come back during business hours.',
    specialties: 'Specialties',
    empty: 'Empty',
    buyMode: 'Buy mode active. Select an item from the merchant.',
    sellMode: 'Sell mode active. Select an item from your inventory.',
    selected: 'Selected: {name} ({qty}x) - {action}: {price} each',
    confirmSell: 'Sell {qty}x {name} for {value}?',
    confirmBuy: 'Buy {qty}x {name} for {value}?',
    removeError: 'Error removing item from inventory.',
    storageNotImplemented: 'Direct storage sale/purchase not implemented.',
    itemNotFound: 'Item not found at the merchant.',
    invalidBuyValue: 'Invalid purchase value.',
    professions: {
      materialsSeller: 'Materials Seller',
      cook: 'Cook',
      livestock: 'Livestock'
    },
    descriptions: {
      thomas: 'Owner of the construction materials shop.',
      lara: 'Sells meals and ingredients.',
      rico: 'Sells seeds, feed and animals.'
    },
    specialtiesLabels: {
      resources: 'Resources',
      tools: 'Tools',
      construction: 'Construction',
      food: 'Food',
      ingredients: 'Ingredients',
      meals: 'Meals',
      seeds: 'Seeds',
      animals: 'Animals'
    }
  },

  // Time and Calendar
  time: {
    weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    day: 'Day {day}',
    dayLabel: 'day',
    seasonLabel: 'season',
    weatherLabel: 'weather',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
    sleeping: 'Sleeping soundly: Day {fromDay} → Day {toDay} ({weekday})',
    wait: 'Please wait...'
  },

  // Seasons
  seasons: {
    spring: 'Spring',
    summer: 'Summer',
    autumn: 'Autumn',
    winter: 'Winter'
  },

  // Weather Conditions
  weather: {
    conditions: {
      clear: 'Clear',
      rain: 'Rain',
      storm: 'Storm',
      fog: 'Fog',
      snow: 'Snow',
      blizzard: 'Blizzard'
    }
  },

  // Tools
  tools: {
    axe: 'axe',
    pickaxe: 'pickaxe',
    machete: 'machete',
    hoe: 'hoe',
    wateringCan: 'watering can',
    scythe: 'scythe'
  },

  // Items (common ones) - legacy keys
  items: {
    wood: 'Wood',
    stone: 'Stone',
    wheat: 'Wheat',
    carrot: 'Carrot',
    fence: 'Fence',
    well: 'Well',
    corn: 'Corn',
    tomato: 'Tomato',
    potato: 'Potato',
    seeds: 'Seeds',
    hay: 'Hay'
  },

  // Item names by ID - for dynamic translation
  itemNames: {
    0: 'Gardening Scissors',
    1: 'Hoe',
    2: 'Hammer',
    3: 'Corn Seeds',
    4: 'Wheat Seeds',
    5: 'Apple',
    6: 'Bread',
    7: 'Chicken Feed',
    8: 'Sheep Feed',
    9: 'Raw Wood',
    10: 'Stone',
    11: 'Scythe',
    12: 'Watering Can',
    13: 'Pickaxe',
    14: 'Axe',
    15: 'Rake',
    16: 'Bucket',
    17: 'Carrot Seeds',
    18: 'Tomato Seeds',
    19: 'Potato Seeds',
    20: 'Strawberry Seeds',
    21: 'Flower Seeds',
    22: 'Machete',
    23: 'Cheese',
    24: 'Boiled Egg',
    25: 'Apple Pie',
    26: 'Vegetable Soup',
    27: 'Honey',
    28: 'Fruit Juice',
    29: 'Hay',
    30: 'Cow Feed',
    31: 'Animal Treats',
    32: 'Bricks',
    33: 'Tiles',
    34: 'Nails',
    35: 'Rope',
    36: 'Glass',
    37: 'Iron',
    40: 'Empty Bottle',
    53: 'Tree Seeds',
    54: 'Plant Fiber',
    55: 'Clay',
    56: 'Charcoal',
    57: 'Wood Scraps',
    58: 'Wood Plank',
    59: 'Wheat Flour',
    60: 'Egg',
    61: 'Milk',
    62: 'Wool',
    63: 'Corn',
    64: 'Wheat',
    65: 'Strawberry',
    68: 'Orange',
    69: 'Storage Chest',
    71: 'Roasted Corn',
    72: 'Fruit Salad',
    73: 'Iron Bar',
    76: 'Wooden Rod',
    43: 'Wooden Fence',
    49: 'Wool Fabric',
    93: 'Water Well'
  },

  // Recipe names by ID - for dynamic translation
  recipeNames: {
    wood_scrap: 'Wood Scraps (Firewood)',
    wood_plank: 'Wood Plank',
    wooden_rod: 'Wooden Rod',
    rope: 'Simple Rope',
    charcoal: 'Charcoal',
    iron_bar: 'Iron Bar',
    nail: 'Nails',
    clay_brick: 'Clay Brick',
    wool_fabric: 'Wool Fabric',
    axe: 'Axe',
    pickaxe: 'Pickaxe',
    hoe: 'Hoe',
    scythe: 'Scythe',
    wooden_fence: 'Wooden Fence',
    storage_chest: 'Storage Chest',
    well: 'Water Well',
    wheat_flour: 'Wheat Flour',
    simple_bread: 'Simple Bread',
    roasted_corn: 'Roasted Corn',
    cheese: 'Cheese',
    boiled_egg: 'Boiled Egg',
    fruit_salad: 'Fruit Salad',
    animal_feed_basic: 'Basic Feed (Hay)',
    animal_treat: 'Animal Treat'
  },

  // General Messages
  messages: {
    loading: 'loading...',
    preparingFarm: 'Preparing your farm...',
    gameSaved: 'Game saved!',
    gameLoaded: 'Game loaded!',
    itemAdded: '{item} added to inventory',
    itemRemoved: '{item} removed from inventory',
    levelUp: 'Level up!',
    lowHunger: 'You are hungry!',
    lowThirst: 'You are thirsty!',
    lowEnergy: 'You are tired!',
    goodMorning: 'Good morning! Energy restored.',
    languageChangeFailed: 'Failed to change language. Please try again.'
  },

  // Settings
  settings: {
    title: '⚙️ Settings',
    language: 'Language',
    sound: 'Sound',
    music: 'Music',
    volume: 'Volume',
    fullscreen: 'Fullscreen',
    save: 'Save',
    cancel: 'Cancel',
    graphics: 'Graphics',
    accessibility: 'Accessibility',
    highContrast: 'High contrast',
    reducedMotion: 'Reduce animations',
    textSize: 'Text size',
    textNormal: 'Normal',
    textLarge: 'Large',
    textExtraLarge: 'Extra Large',
    screenReader: 'Screen reader announcements',
    colorVision: 'Color vision mode',
    cvOff: 'Off',
    cvProtanopia: 'Protanopia (red-green)',
    cvDeuteranopia: 'Deuteranopia (green-red)',
    cvTritanopia: 'Tritanopia (blue-yellow)',
    cvAchromatopsia: 'Achromatopsia (no colors)',

    controls: {
      title: 'Controls',
      remap: 'Remap keys',
      remapHint: 'Customize keyboard keys (WASD, arrows, shortcuts).',
      openRemap: 'Open',
      remapTitle: 'Remap Keys',
      remapSubtitle: 'Click a key to change. ESC cancels.',
      pressKey: 'Press a key... (ESC cancels, Backspace deletes secondary)',
      reset: 'Default'
    }
  },

  // Actions
  actions: {
    interact: 'Interact',
    pickup: 'Pick up',
    use: 'Use',
    drop: 'Drop',
    eat: 'Eat',
    drink: 'Drink',
    build: 'Build',
    destroy: 'Destroy',
    sleep: 'Sleep',
    harvest: 'Harvest',
    plant: 'Plant',
    water: 'Water',
    feed: 'Feed'
  },

  // Farm Buildings
  buildings: {
    farmhouse: 'Farmhouse',
    barn: 'Barn',
    coop: 'Coop',
    silo: 'Silo',
    well: 'Well',
    fence: 'Fence',
    gate: 'Gate'
  },

  // Animals
  animals: {
    chicken: 'Chicken',
    cow: 'Cow',
    pig: 'Pig',
    sheep: 'Sheep',
    goat: 'Goat',
    horse: 'Horse'
  },

  // Animal UI Panel
  animal: {
    ui: {
      actions: 'Actions',
      info: 'Info',
      interactions: 'Interactions'
    },
    actions: {
      pet: 'Pet',
      guide: 'Guide',
      feed: 'Feed',
      close: 'Close'
    },
    stats: {
      hunger: 'Hunger',
      thirst: 'Thirst',
      morale: 'Morale'
    },
    type: {
      unknown: 'Unknown'
    }
  },

  // Crops
  crops: {
    wheat: 'Wheat',
    corn: 'Corn',
    carrot: 'Carrot',
    potato: 'Potato',
    tomato: 'Tomato',
    pumpkin: 'Pumpkin',
    cabbage: 'Cabbage'
  },

  // UI Elements
  ui: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    save: 'Save',
    load: 'Load',
    delete: 'Delete',
    new: 'New',
    merchants: 'Regional Merchants',
    commerce: 'Commerce',
    inventory: 'Inventory',
    storage: 'Storage',
    backToMerchants: 'Back to Merchants',
    otherSettings: 'Other settings in development...',
    inventoryTab: 'Inventory',
    storageTab: 'Storage',
    inventoryNotAvailable: '🎒 Inventory system not available',
    done: 'Done'
  },

  // HUD Action Buttons
  hud: {
    saveTooltip: 'Save / Load (💾)',
    settingsTooltip: 'Settings ({key})',
    inventoryTooltip: 'Inventory ({key})',
    commerceTooltip: 'Commerce ({key})'
  },

  // Tutorials/Help
  help: {
    movement: 'Use WASD or arrows to move',
    interact: 'Press E to interact',
    inventory: 'Press I to open inventory',
    pause: 'Press ESC to pause',
    doorHint: 'Press <strong>E</strong> to access the house'
  },

  // Character Selection
  characterSelection: {
    title: 'FarmingXP',
    subtitle: 'Select your character to begin',
    startGame: 'Start Game',
    continueAdventure: 'Or continue your adventure',
    loadGame: 'Load Saved Game',
    inDevelopment: 'In Development',
    onlyStellaAvailable: 'Only Stella is available at the moment!',
    selectStellaToPlay: 'Select Stella to play.',
    selectCharacterFirst: 'Please select a character first.',
    saveNotAvailable: 'Save system not available. Starting new game.',
    redirecting: 'Only Stella is available. Redirecting...',
    subtitles: {
      stella: 'The young farmer',
      ben: 'The clever farmer',
      graham: 'The arm of agriculture',
      default: 'Farmer'
    },
    descriptions: {
      stella: 'Adventurous and courageous, Stella grew up on the family farm and knows all the secrets of rural life.',
      ben: 'A small guy with big brain! The technician for the computers in the fields.',
      graham: 'A big guy, fearless, serious and protective man, the best for field work.'
    },
    noSavesFound: 'No saves found. Select a character to begin.',
    saveSystemError: 'Error accessing save system.'
  },

  // House System
  house: {
    title: 'My House',
    enter: 'Enter House',
    sleep: 'Sleep',
    crafting: 'Crafting',
    storage: 'Storage',
    customize: 'Customize',
    close: 'Close',
    entering: 'Entering house...',
    craftingNotAvailable: 'Crafting system not available',
    customizeNotImplemented: 'Customization not yet implemented',
    saveGame: 'Save Game',
    loadGame: 'Load Game',
    saveNotAvailable: 'Save system not available'
  },

  // Storage System
  storage: {
    title: 'Storage',
    withdraw: 'Withdraw Items',
    deposit: 'Deposit Items',
    items: 'items',
    value: 'value',
    stacks: 'stacks',
    mode: 'mode',
    withdrawMode: 'withdraw',
    depositMode: 'deposit',
    withdrawBtn: 'withdraw ({qty})',
    depositBtn: 'deposit ({qty})',
    emptyCategory: 'No items in this category',
    insufficientQuantity: 'Insufficient quantity in inventory',
    invalidCategory: 'Invalid category',
    storageFull: '{category} storage full',
    deposited: 'Deposited: {qty}x {name}',
    itemNotFound: 'Item not found in storage',
    withdrawn: 'Withdrawn: {qty}x {name}',
    inventoryFull: 'Inventory full',
    syncError: 'Inventory sync error'
  },

  // Chest System
  chest: {
    title: 'Chest',
    storage: 'Chest Storage',
    inventory: 'Your Inventory',
    takeAll: 'Take All',
    storeAll: 'Store All',
    organize: 'Organize',
    empty: 'The chest is empty',
    stored: '{name} stored in chest',
    taken: '{name} taken from chest',
    takenAll: '{count} items taken from chest',
    storedAll: '{count} items stored in chest',
    organized: 'Chest organized!',
    notFound: 'Chest not found!',
    categoryFull: '{category} category full in chest!'
  },

  // Well System
  well: {
    backpack: 'Backpack',
    actions: 'Actions',
    drink: 'Drink',
    collect: 'Collect',
    fillBottle: 'Fill bottle',
    well: 'Well',
    lowerBucket: 'Lower bucket',
    insufficientWater: 'Insufficient water in the well',
    playerNotAvailable: 'Player system not available',
    noEmptyBottle: 'No empty bottle in inventory',
  },

  // Crafting System
  crafting: {
    title: 'Crafting',
    craft: 'Craft',
    crafting: 'Crafting...',
    crafted: 'Crafted: {name}!',
    craftError: 'Craft failed!',
    ingredients: 'Ingredients',
    result: 'Result',
    notEnoughMaterials: 'Missing materials!',
    success: 'Item crafted successfully!',
    recipes: 'Recipes',
    missing: 'Missing'
  },

  // Save Slots UI
  saveSlots: {
    titleSaveLoad: 'Save / Load',
    titleSave: 'Save Game',
    titleLoad: 'Load Game',
    slotNumber: 'Slot {number}',
    empty: 'Empty',
    active: 'Active',
    noSaveInSlot: 'No save in this slot',
    createSave: 'Create Save',
    character: 'Character:',
    totalTime: 'Total Time:',
    createdAt: 'Created:',
    lastSave: 'Last save:',
    lastSession: 'Last session:',
    play: 'Play',
    save: 'Save',
    saveName: 'Save name:',
    defaultName: 'Save {number}',
    newName: 'New name:',
    createSuccess: 'Save created successfully!',
    createError: 'Error creating save',
    loadError: 'Error loading save',
    loading: 'Loading save...',
    applying: 'Applying data...',
    applyError: 'Error applying save',
    ready: 'Ready!',
    loadSuccess: 'Save loaded!',
    confirmOverwrite: 'Overwrite "{name}"?\nThis cannot be undone.',
    overwriteSuccess: 'Save updated!',
    saveError: 'Error saving',
    emptyNameError: 'Name cannot be empty',
    renameSuccess: 'Save renamed!',
    renameError: 'Error renaming',
    confirmDelete: 'Delete "{name}"?\nThis cannot be undone!',
    deleteSuccess: 'Save deleted',
    deleteError: 'Error deleting'
  },

  // Sleep / Loading Screen
  sleep: {
    title: 'Restorative Rest',
    progress: 'Progress',
    fallingAsleep: 'Falling asleep...',
    closingEyes: 'Closing eyes...',
    cache: 'Cache',
    memory: 'Memory',
    waiting: 'Waiting...',
    worldQuiet: 'The world goes quiet',
    deepSleep: 'Deep Sleep',
    recoveringEnergy: 'Recovering energy...',
    cleaning: 'Cleaning...',
    analyzing: 'Analyzing...',
    optimizing: 'Optimizing',
    reorganizing: 'Reorganizing thoughts...',
    freeing: 'Freeing...',
    compacting: 'Compacting...',
    almostThere: 'Almost there',
    sunRising: 'The sun is rising...',
    clean: 'Clean',
    optimized: 'Optimized',
    awakening: 'Awakening',
    goodMorning: 'Good morning!',
    ready: 'Ready'
  },

  // Loading Screen
  loading: {
    preparingFarm: 'Preparing your farm...'
  },

  // Build System
  build: {
    mode: 'Build Mode',
    gridX: 'grid x: left | center | right',
    gridY: 'grid y: bottom | center | top',
    rotate: 'rotate (variant)',
    place: 'place',
    exit: 'exit build mode',
    alignment: 'alignment',
    alignLeft: 'left',
    alignCenter: 'center',
    alignRight: 'right',
    alignTop: 'top',
    alignBottom: 'bottom',
    notBuildable: 'item is not buildable',
    building: 'building: {name}',
    systemError: 'system error (theWorld)',
    itemEmpty: 'out of items!',
    chestPlaced: 'chest placed! ({remaining} remaining)',
    chestError: 'error adding chest',
    chestFailed: 'failed to place chest',
    chestLoading: 'chest system loading...',
    wellPlaced: 'well placed! ({remaining} remaining)',
    wellError: 'error placing well',
    wellLoading: 'well system loading...',
    placed: 'placed! ({remaining} remaining)',
    placeError: 'error placing object',
    worldNotAvailable: 'error: theWorld.addWorldObject not available',
    variant: 'variant: {name}',
    notAvailable: 'Build function not available.',
    notAvailableAfter: 'Build function not available after loading.',
    buildError: 'Error entering build mode. Check the console.'
  },

  // Controls for keybind remapping
  controls: {
    moveUp: {
      label: 'Move up',
      desc: 'Walk up'
    },
    moveDown: {
      label: 'Move down',
      desc: 'Walk down'
    },
    moveLeft: {
      label: 'Move left',
      desc: 'Walk left'
    },
    moveRight: {
      label: 'Move right',
      desc: 'Walk right'
    },
    interact: {
      label: 'Interact',
      desc: 'Interaction / use'
    },
    jump: {
      label: 'Jump',
      desc: 'Jump'
    },
    inventory: {
      label: 'Inventory',
      desc: 'Open/close inventory'
    },
    merchants: {
      label: 'Merchants',
      desc: 'Open/close merchants'
    },
    config: {
      label: 'Settings',
      desc: 'Open/close settings'
    }
  }
};