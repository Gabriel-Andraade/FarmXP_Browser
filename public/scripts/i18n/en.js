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
  // Achievements
  achievements: {
    title: 'Achievements',
    unlocked: 'Achievement Unlocked!',
    locked: 'Locked',
    hidden: '???',
    progress: '{current}/{target}',
    category: {
      all: 'All',
      farming: 'Farming',
      animals: 'Animals',
      economy: 'Economy',
      exploration: 'Exploration',
      survival: 'Survival',
    },
    firstSteps:    { title: 'First Steps',       description: 'Start your farming adventure' },
    nightOwl:      { title: 'Night Owl',          description: 'Stay awake past 10 PM' },
    firstTree:     { title: 'Timber!',            description: 'Chop down your first tree' },
    lumberjack:    { title: 'Lumberjack',         description: 'Chop down 50 trees' },
    stoneBreaker:  { title: 'Stone Breaker',      description: 'Break 25 rocks' },
    firstBuild:    { title: 'Builder',            description: 'Place your first building' },
    animalFriend:  { title: 'Animal Friend',      description: 'Pet an animal for the first time' },
    rancher:       { title: 'Rancher',            description: 'Feed animals 20 times' },
    firstCoin:     { title: 'First Coin',         description: 'Earn money for the first time' },
    wealthyFarmer: { title: 'Wealthy Farmer',     description: 'Have $5,000 at once' },
    bigSpender:    { title: 'Big Spender',        description: 'Spend a total of $10,000' },
    hoarder:       { title: 'Hoarder',            description: 'Own 50 unique items' },
    earlyBird:     { title: 'Early Bird',         description: 'Complete your first night of sleep' },
    closeCall:     { title: 'Close Call',          description: 'Let a need reach critical levels' },
    survivor7:     { title: 'Week Survivor',      description: 'Survive 7 days on the farm' },
    // ── 40 additional achievements ──
    treeHugger:       { title: 'Tree Hugger',          description: 'Chop down 100 trees' },
    deforestation:    { title: 'Deforestation',        description: 'Chop down 250 trees' },
    rockSolid:        { title: 'Rock Solid',           description: 'Break 100 rocks' },
    quarryMaster:     { title: 'Quarry Master',        description: 'Break 250 rocks' },
    masterBuilder:    { title: 'Master Builder',       description: 'Place 25 structures' },
    fenceEnthusiast:  { title: 'Fence Enthusiast',     description: 'Place 50 fences' },
    wellDigger:       { title: 'Well Digger',          description: 'Place your first well' },
    firstHit:         { title: 'First Strike',         description: 'Attack an object for the first time' },
    persistentHitter: { title: 'Relentless',           description: 'Attack objects 500 times' },
    thicketClearer:   { title: 'Thicket Clearer',      description: 'Clear 10 thickets' },
    petLover:         { title: 'Pet Lover',            description: 'Pet animals 50 times' },
    animalWhisperer:  { title: 'Animal Whisperer',     description: 'Pet animals 100 times' },
    firstShear:       { title: 'First Shear',          description: 'Shear an animal for the first time' },
    firstCollect:     { title: 'Egg Hunter',           description: 'Collect an animal product for the first time' },
    feedingFrenzy:    { title: 'Feeding Frenzy',       description: 'Feed animals 100 times' },
    dedicatedCaretaker: { title: 'Dedicated Caretaker', description: 'Interact with animals 200 times' },
    pennyPincher:     { title: 'Penny Pincher',        description: 'Have $1,000 at once' },
    tycoon:           { title: 'Tycoon',               description: 'Have $25,000 at once' },
    millionaire:      { title: 'Millionaire',          description: 'Have $100,000 at once' },
    firstPurchase:    { title: 'First Purchase',       description: 'Buy something for the first time' },
    generousSpender:  { title: 'Generous Spender',     description: 'Spend a total of $50,000' },
    itemCollector10:  { title: 'Collector',            description: 'Own 10 unique items' },
    itemCollector25:  { title: 'Enthusiast',           description: 'Own 25 unique items' },
    discardKing:      { title: 'Spring Cleaning',      description: 'Discard 20 items' },
    midnightWanderer: { title: 'Midnight Wanderer',    description: 'Stay awake until midnight' },
    marathonRunner:   { title: 'Marathon Runner',      description: 'Walk 10,000 steps' },
    speedWalker:      { title: 'Speed Walker',         description: 'Walk 50,000 steps' },
    worldTraveler:    { title: 'World Traveler',       description: 'Walk 200,000 steps' },
    weekOne:          { title: 'One Week In',          description: 'Reach day 7' },
    monthOne:         { title: 'One Month In',         description: 'Reach day 30' },
    stormChaser:      { title: 'Storm Chaser',         description: 'Experience a storm' },
    fogWalker:        { title: 'Fog Walker',           description: 'Experience foggy weather' },
    gourmet:          { title: 'Gourmet',              description: 'Consume 50 items' },
    foodie:           { title: 'Foodie',               description: 'Consume 100 items' },
    firstMeal:        { title: 'First Meal',           description: 'Eat or drink something for the first time' },
    survivor30:       { title: 'Monthly Survivor',     description: 'Survive 30 days on the farm' },
    veteranFarmer:    { title: 'Veteran Farmer',       description: 'Survive 100 days on the farm' },
    ironWill:         { title: 'Iron Will',            description: 'Have all three needs at critical levels' },
    toolMaster:       { title: 'Tool Master',          description: 'Equip tools 10 times' },
    blizzardSurvivor: { title: 'Blizzard Survivor',    description: 'Experience a blizzard' },
  },

  // Main Menu (legacy keys)
  menu: {
    play: 'Play',
    continue: 'Continue',
    newGame: 'New Game',
    settings: 'Settings',
    quit: 'Quit',
  },

  // Gallery
  gallery: {
    title: 'Gallery',
    newReward: 'New image sent to the Gallery!',
    imageNotCreated: 'Image not yet created!',
    rewardSentToGallery: 'This reward has been sent to your Gallery!',
    noUnlockedImages: 'No images unlocked yet. Complete achievements to earn rewards!',
    photosEmpty: 'No photos yet.',
    notesEmpty: 'No notes yet.',
    screenshotsEmpty: 'No screenshots yet.',
    tabs: {
      unlockedImages: 'Unlocked Images',
      characters: 'Characters',
      photos: 'Photos',
      notes: 'Notes',
      screenshots: 'Screenshots',
    },
  },

  // Main Menu Screen
  mainMenu: {
    subtitle: 'main menu',
    play: 'Play',
    settings: 'Settings',
    gallery: 'Gallery',
    achievements: 'Achievements',
    credits: 'Credits',
    feedback: 'Feedback',
    quit: 'Quit',
    newGame: 'New Game',
    loadGame: 'Load Game',
    back: 'Back',
    comingSoon: 'Coming soon',
    galleryComingSoon: 'Gallery system coming soon!',
    achievementsComingSoon: 'Achievements system coming soon!',
    feedbackComingSoon: 'Feedback system coming soon!',
    creditsText: 'FarmingXP \u2014 Made by Gabriel Andrade :D\n\nSpecial thanks to all the amazing supporters and players who make this project possible!',
    quitMessage: 'Thanks for playing FarmingXP!',
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
    resource: 'Resource',
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
    wait: 'Please wait...',
    sleepZzz: 'Zzz...'
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
    93: 'Water Well',
    94: 'Battery',
    100: 'Municipal Contract'
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

    audio: {
      title: 'Sound',
      musicVolume: 'Music Volume',
      musicVolumeHint: 'Adjust the background music volume.',
      ambientVolume: 'Ambient Volume',
      ambientVolumeHint: 'Environment sounds: stone, wood, construction, weather.',
      animalVolume: 'Animal Volume',
      animalVolumeHint: 'Animal sounds: mooing, clucking, etc.',
    },
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

  // Controls - Added from settingsUI.js
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
    },
    help: {
      label: 'Help',
      desc: 'Open/close shortcuts'
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
    bull: 'Bull',
    calf: 'Calf',
    chick: 'Chick',
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
      unguide: 'Stop Guiding',
      feed: 'Feed',
      close: 'Close'
    },
    stats: {
      hunger: 'Hunger',
      thirst: 'Thirst',
      morale: 'Morale',
      mood: 'Mood'
    },
    mood: {
      sleeping: 'Sleeping',
      hurt: 'Hurt',
      suspicious: 'Suspicious',
      angry: 'Angry',
      sad: 'Sad',
      hungry: 'Hungry',
      needy: 'Needy',
      calm: 'Calm'
    },
    feedback: {
      pet_ok: 'Loved the petting!',
      gained_trust: 'Gained trust!',
      sleeping: 'Sleeping... Zzz',
      suspicious_flee: 'Ran away, suspicious...',
      angry: 'Too angry to be petted!',
      max_pets: 'Had enough petting for today.',
      fed: 'Ate happily!',
      no_food: 'No feed in inventory!',
      suspicious: 'Too suspicious to eat...',
      no_inventory: 'Inventory unavailable.'
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
    commerceTooltip: 'Commerce ({key})',
    helpTooltip: 'Shortcuts ({key})'
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

  // Quests
  quests: {
    title: 'Quests',
    noQuests: 'No quests available.',
    status: {
      available: 'Available',
      active: 'In progress',
      completed: 'Completed',
    },
    fixPickup: {
      title: 'Fix the Pickup Truck',
      description: 'The green pickup truck is broken. Find a battery in the storage shed to fix it and unlock travel to the city.',
      bubbleNotRepaired: 'hmm... I need to fix this pickup truck...',
      bubbleNoBattery: 'I need a battery to fix it... I think I saw one in the storage shed.',
      bubbleRepairing: 'Installing the battery in the pickup...',
      bubbleRepaired: 'Pickup fixed! Now I can travel to the city!',
      batteryHint: 'Press E to pick up the battery',
      batteryPickedUp: 'Got the battery! Now I need to bring it to the pickup truck.',
    },
    hud: {
      tooltip: 'Quests',
    },
    hint: 'Press E',
    traveling: 'Traveling to city...',
  },

  // Dialogue system
  dialogue: {
    advanceHint: 'Click or press Space',
    talkHint: 'Press E to talk to {name}',
  },

  // NPC Bartolomeu dialogues
  npc: {
    bartolomeu: {
      sleeping: '*sleeping* ...zZzZz...',
      playerHi: 'Uh... hi?',
      wakeUp: {
        stella: '*wakes up* ...huh? And who are you, girl? What are you doing in this middle of nowhere?',
        ben: '*wakes up* ...huh? And who are you, kid? Where are your parents?',
        graham: '*gulps* Y-yes? What do you need, sir?',
        default: '*wakes up* ...who are you?',
      },
      playerIntro: {
        stella: 'Well... I recently moved here and I\'m living in my grandfather\'s house... my uncle told me this town is the closest and everyone knew him too.',
        ben: 'My parents sent me here to take care of my grandfather\'s house and land. Also, they told me people here knew him and could help me with anything.',
        graham: 'I moved here, I\'m at my grandfather\'s old house. This town was recommended to me. And you would be... the mayor, correct? Bartolomeu.',
        default: 'I recently moved here.',
      },
      bartolomeuIntro: {
        graham: 'That\'s right! Mayor of Capa de Ganso! This tiny town with forests, ranches, farms and animals. I hope you feel more than welcome! And don\'t walk around too much at night! Because well... the budget is tight, even with donations we still can\'t afford new streetlights...',
        default: 'Well, I\'m Bartolomeu, mayor of Capa de Ganso! This tiny town with forests, ranches, farms and animals. I hope you feel more than welcome! And don\'t walk around too much at night! Because well... the budget is tight, even with donations we still can\'t afford new streetlights...',
      },
      playerReaction: {
        stella: 'Well... I think I can help.',
        ben: 'Oooh...',
        graham: 'Based on the amount, maybe I can help.',
        default: 'I see...',
      },
      gilbertLine: {
        ben: 'Well... your grandpa must have been... Gilbert, right? Maybe now the nights of Capa de Ganso will turn into day! Anyway. Your grandfather had a very solid piece of land, maybe you can gather about {money}! Relax, I\'ll discount it from the taxes, hahahaha!',
        stella: 'Looking at you closely... your grandfather is Gilbert, correct? Maybe now the nights of Capa de Ganso will turn into day! Anyway. Your grandfather had a very solid piece of land, maybe you can gather about {money}! Relax, I\'ll discount it from the taxes, hahahaha!',
        graham: 'Hmm... your grandfather must have been Gilbert, right? Maybe now the nights of Capa de Ganso will turn into day! Anyway. Your grandfather had a very solid piece of land, maybe you can gather about {money}! Relax, I\'ll discount it from the taxes, hahahaha!',
        default: 'Your grandfather had a good piece of land. Maybe you can gather {money}!',
      },
      merchantQuestion: 'A beautiful piece of land, maybe some crops and trees can earn you a profit. Have you met our 3 pillars of the economy?',
      merchantYes: 'Yes, I know them!',
      merchantNo: 'No, who are they?',
      merchantKnown: 'Perfect! Sell them your materials! And once you\'ve saved up your money, come talk to me!',
      merchantExplain: 'Press U or the 🛒 button to open the merchants! There you\'ll find Lara, Rico and Thomas. You can sell any resource and items to any of them, but if you sell the right item to each one matching their profession, they might pay better!',
      playerThought: '(Ok... the mayor might not be all there...)',
      questOffer: 'Alright then young one! Will you help this humble town?',
      questWhisper: '*whispering* I can give you up to a 2% discount on your land taxes, heh! haha...',
      questAcceptQ: 'Do you accept?',
      questAcceptOpt: 'I\'ll see what I can do.',
      questDeclineOpt: 'I don\'t know... I\'ll come back later.',
      questAccepted: 'Ok! Gather {money} and come back here! See you around, young one!!!!',
      questDeclined: '... so can I go back to my nap on my bench after my Plymouth Cuda ride? See you later.',
      // Declined revisit
      declinedGreet: 'Hello again, young one! Need something?',
      declinedAcceptOpt: 'Well... I can help after all.',
      declinedLeaveOpt: 'Nothing much, just taking a walk.',
      declinedAccepted: 'Excellent! Gather {money} and come back here!',
      declinedLeave: 'Alright! Enjoy the town then!',
      // Quest active
      activeGreet: 'Hey young one! Did you manage to gather the money?',
      activePlayerHas: 'Yes! I have {money}.',
      activeDeliverPrompt: 'Perfect! With {money} we\'ll be able to light up this town!',
      activeDeliverOpt: 'Deliver {money} (will be deducted from your balance)',
      activeWaitOpt: 'Not yet, I\'ll come back later.',
      activeDelivered: 'Thank you so much young one! The town is grateful! Now we\'ll have new streetlights!',
      activeDiscount: 'I\'ve deducted the 2% tax discount as promised, hahahaha! See you!',
      activeWait: 'No rush! When you\'re ready, come back here!',
      activeNotEnoughGreet: 'Hey young one! How are things going?',
      activeNotEnoughPlayer: 'Still saving up... I have {money} so far.',
      activeNotEnoughBart: 'Still a bit short! I need {money}. Keep selling your resources! See you!',
      // Completed
      completedGreet: 'Hey young one! The town is getting better and better thanks to you!',
      completedPlayer: 'That\'s great! Happy to help.',
      completedBart: 'Keep it up! Capa de Ganso counts on you!',

      // ── Quest 2: New shops + Taxes ──
      q2: {
        // Initial greeting
        greet: {
          ben: 'Hello dear young man! How\'s the farm going, huh?',
          graham: 'Hello again, got a moment?',
          stella: 'Miss! How are you?',
        },
        playerHi: 'Uh.. hi, yeah everything\'s fine.',
        bartExcited: 'Great!!!!! *Bartolomeu gets excited* So, I have some little things I need to set up here soon! But first... well, I\'d need you to sign this document...',
        playerAbout: 'About...',
        bartCutsOff: 'Oh wait!!! You haven\'t even told me your name! Who might you be? Quite a grand lack of respect towards your beloved mayor, no? Hahahaah!',
        // Player name
        nameIntro: {
          graham: '*sighs* Graham, Graham Enderfield.',
          ben: '*gulps* I\'m Ben, pleased to meet you, Mr. Mayor.',
          stella: 'Stella, but what is this contract about?',
        },
        bartAfterNameStella: '*clears throat* I\'ll explain, Miss Stella.',
        bartPleasure: {
          graham: 'Pleased to meet you, sir!',
          ben: 'Pleased to meet you, young man!',
          stella: 'Pleased to meet you, ma\'am!',
        },
        // Shops explanation
        bartShops: 'I\'m thinking of opening three more little shops, besides the one in the center.',
        playerCenter: 'But isn\'t this the center?',
        bartLaugh: 'What? *Holds back laughter* Well... if you follow the street down there you\'ll get to the center, this is just one of the little corners hahahaha!',

        // Round 1 choices
        choiceContinue: 'Alright then... go on.',
        choiceWhatIGet: 'And what do I get out of this?',
        choiceWhereSign: 'Alright, where do I sign?',
        choiceNotToday: 'Not today.',

        // Bartolomeu sighs (refusal)
        bartSigh: '*sighs* Alright then... I\'ll be here if you change your mind.',

        // If "continue" is chosen
        bartExplainShops: 'Ok!! Since I have some close friends who are merchants, like Mrs. Claudia and Mr. Carlos, I\'m thinking of inviting them to open their shops here! Carlos has a bakery and Claudia sells flowers. Interesting, right?',
        shopReaction: {
          stella: 'Fresh bread... and flowers... actually, I need to spruce up that house a bit.',
          ben: 'That\'s nice...',
          graham: 'And you can\'t afford to pay for it again?',
        },
        bartShopReply: {
          stella: 'Yes yes, miss!!!',
          ben: 'Of course!! Do you accept?',
          graham: '*gulps, glancing at his car and back at Graham* It\'s not even about that, my friend, ahahahha!',
        },

        // If "what do I get" is chosen
        bartExplainGain: 'Well, with Carlos\'s bakery and Claudia\'s flower shop, the town will grow! And I can give you another 2% discount on your land taxes, how about that?',

        // Round 2 choices
        choice2Sign: 'Sign.',
        choice2WhatGain: 'But what can I gain?',
        choice2Refuse: '*thinks it over*',

        // Signing
        bartThanks: 'Wonderful! Here, sign on this line... done! Thank you so much! The shops will be up and running soon!',

        // Return after refusal
        declinedGreet: 'Ah, hello. What do you need?',
        declinedExplain: 'Explain to me what it\'s about.',
        declinedSign: 'I can sign.',
        declinedVisit: 'Just came to see you.',
        bartVisitReply: {
          stella: 'I\'ll be here, you know I won\'t run away anytime soon.',
          default: '*laughs*',
        },
        stellaVisitReply: '... okay?',

        // Quest active (after signing)
        activeGreet: 'Hello! The shops are almost ready! Oh, and don\'t forget about the taxes, huh!',
      },

      // ── Tax System ──
      tax: {
        noteTitle: 'Payment Day',
        noteDescription: 'Pay the tax of {value} coins. Charged every 10 days.',
        contractTitle: 'Municipal Contract',
        contractDescription: 'Commitment agreement signed with Mayor Bartolomeu. Taxes have been raised and a fee will be charged every 10 days to fund the town\'s bakery and flower shop.',
        paid: 'Tax paid! -{value} coins.',
        notEnough: 'You don\'t have enough coins to pay the tax!',
        reminder: 'Payment day! Pay the tax of {value} coins.',
        payOption: 'Pay {value} coins.',
        laterOption: 'I\'ll pay later...',
        thanksPaid: 'Very well! Thanks for the payment, young one! The town is grateful!',
        warnLater: 'Hmm... don\'t take too long, okay! Without your taxes up to date, some merchants might refuse to do business with you...',
      },
      // Free dialogue — after completing quest 1 and signing the contract
      free: {
        greet: 'Any questions, {name}?',
        choicePassing: 'No, just passing by.',
        choiceShops: 'What shops are opening?',
        graham: {
          l1: 'You look like a little soldier — did you fight in any war?',
          l2: 'Yes. I was a marine.',
          l3: 'How interesting! I served in the army myself!',
          l4: 'What unit?',
          l5: '*thinks* ...',
          l6: 'I forgot. *forces a smile*',
          l7: '*mumbles*',
        },
        ben: {
          l1: 'See that you don\'t stay out too late, then.',
          l2: 'Mhm.',
          l3: 'What? Cat got your tongue?',
          l4: 'I\'m not allergic to cats.',
          l5: '*mutters* How old are you?',
          l6: '17.',
          l7: 'Lucky kid — got a whole farm at 17. At your age I was plastering walls.',
          l8: 'I just want to figure out how I\'m supposed to take care of all that overgrown land... *smiles at Bartolomeu and turns to leave*',
        },
        stella: {
          l1: 'How about going for a little ride one of these days? That machine is a beast!',
          l2: '*frowns*',
          l3: 'And what car is that?',
          l4: 'It\'s a Plymouth Cuda!! V8 426 Hemi engine! Beautiful fuel economy of about 9 miles per gallon!! This 1972 fella is phenomenal!!! *jumps up from the bench excited* You like it, beautiful lady?',
          l5: '*frowns and gives a weak, fake smile* That\'s... cool... wow... *looks away*',
          l6: 'How about a little spin? *winks with a smile*',
          l7: 'No... I\'m busy, alright? Maybe next time, bye bye.',
          l8: '*waves with a smile*',
          l9: 'What a strange mayor... *thinks while turning to leave, sighing*',
        },
        shops: {
          l1: 'A bakery and a flower shop. Soon there\'ll be more food options. *whispers* It\'ll be nice to stop eating Lara\'s cooking! *back to normal voice* And of course, the flowers! To brighten everyone\'s mood!',
          l2: 'It is... kind of... *looks around* empty around here.',
          l3: '*clears throat* We really do need to improve things...',
        },
      },
    },
    milly: {
      // Watching the player walk by
      watching: '*an old lady is watching you from the window...*',
      // Initial choices
      choiceAsk: 'Hi? Everything okay?',
      choiceIgnore: '*ignore*',
      choiceStare: '*stare back*',
      // After choosing "ask" or "stare"
      catQuestion: 'Hi... did you come to take my cats?',
      playerWhat: 'What?',
      catYell: '*speaks louder from the window* DID YOU COME TO TAKE MY CATS??',
      // Reaction by character
      playerReaction: {
        stella: 'No no! I swear I didn\'t!!',
        ben: '*gets startled*',
        graham: '*crosses arms*',
      },
      millyReaction: {
        stella: 'Hmhmh okay...',
        ben: 'AHAHAHAHAHA get up boy! *coughs from laughing so hard*',
        graham: 'Wow, you\'re quite strong, my boy.',
      },
      // Introduction
      millyIntro: 'I\'m Milly. Are you new residents of Capa de Ganso? This little old town?',
      playerMoved: 'Yes... I moved here recently, living in Gilbert\'s old house.',
      millyGilbert: 'Gilbert??? You\'re Gilbert\'s grandchildren????????',
      playerYes: 'Yes...?',
      millySigh: 'Aah, Gilbert... *sighs*',
      millyFarewell: 'I miss him so much... I hope you take good care of his farm, okay...',

      // ── Quest: Madalena ──
      q2: {
        // Milly starts conversation about Gilbert
        gilbertMemory: {
          stella: 'Gilbert was a wonderful man... he always brought fresh milk for my cats in the morning.',
          ben: 'Gilbert was a very kind man... always came by in the morning to bring milk for my cats.',
          graham: 'Gilbert... was a great man. He always brought milk for my cats, without fail.',
        },
        playerAboutGilbert: {
          stella: 'He did that...? *smiles* Seems like grandpa was loved by everyone here...',
          ben: '...really? I didn\'t know that.',
          graham: 'Hmm. That sounds like something he would do.',
        },
        millyNod: 'Yes yes... *sighs* But anyway, let\'s talk about something nice!',

        // Cat introductions
        catsIntro: 'I have five cats! Let me introduce them: there\'s Whiskers, Fluffy, Sardine, Princess...',
        catsPause: '...and Madalena.',
        millyWorried: '*Milly\'s expression changes*',
        millyExplain: 'Madalena... she had surgery recently. But right after she came back, the little rascal escaped through the window!',
        millyTeary: 'I\'m so worried... she probably hasn\'t fully recovered yet...',

        // Player reaction
        playerReaction: {
          stella: 'Oh no... poor thing! Where did she go?',
          ben: '...escaped? But is she hurt?',
          graham: 'I see. Which direction did she go?',
        },
        millyDirection: 'I saw her run towards the farm... probably to Gilbert\'s land. She always liked it there...',

        // Accept choice
        choiceAccept: 'I\'ll go look for her!',
        choiceNotNow: 'I can\'t right now...',

        // Accept
        millyGrateful: {
          stella: 'Oh dear, thank you so much!! Madalena is a dark gray kitty, very small! Be careful not to scare her!',
          ben: 'Thank you so much, dear! Madalena is a dark gray little cat! Go easy near her, okay?',
          graham: 'Thank you so much, young man! She\'s a dark gray cat, very small. Please be gentle with her.',
        },

        // Refuse
        millyUnderstand: 'That\'s okay... but if you change your mind, please... she\'s out there all alone...',

        // Return dialogue (while not found yet)
        returnGreet: 'Did you find Madalena...?',
        returnNotYet: 'Not yet... but I\'m looking.',
        returnMillySad: 'Please... she must be so scared...',

        // Upon finding Madalena on the farm
        foundMadalena: '*Madalena meows softly when she sees you...*',
        playerFoundReaction: {
          stella: 'Found you! Come here kitty... easy... *picks up Madalena carefully*',
          ben: 'Hey... found you... come on... *reaches out slowly*',
          graham: '*crouches slowly* ...come here.',
        },
        catCaught: '*Madalena snuggles into your arms*',

        // Deliver to Milly
        deliverGreet: 'MADALENA!! *Milly\'s eyes fill with tears*',
        millyJoy: 'My baby!! Oh... *hugs Madalena* Thank you... thank you, thank you!!',
        millyReward: {
          stella: 'Dear, thank you so very much! Here, take these coins... it\'s not much, but it comes from the heart!',
          ben: 'Sweetie, thank you!! Here, a little something for you! It\'s not much but...',
          graham: 'Young man, I\'m forever grateful. Please accept this. It\'s the least I can do.',
        },
        playerFinish: {
          stella: 'You don\'t have to! ...but thanks. I\'m glad she\'s okay!',
          ben: 'Oh... thanks. Glad she\'s alright.',
          graham: 'I appreciate it. Take good care of her.',
        },
        millyEnd: 'You bet! And come visit us anytime, okay? The cats loved you!',
      },
      // Free dialogue — after completing the Madalena quest
      free: {
        ben: {
          l1: 'Ooh sweetie! How are you doing? Came to see the kitties?',
          l2: 'Oh, hi! I\'m good, still learning all this farm stuff...',
          l3: 'If you\'d like, come over for breakfast and coffee with me! I can teach you a thing or two! *smiles*',
          l4: '*breaks into a smile and gives Milly a thumbs up*',
        },
        stella: {
          l1: 'Hi dear, how are you? How\'s the farm business going, hm?',
          l2: 'It\'s going alright... I still don\'t know a few things, but... I think I\'m making progress.',
          l3: 'I\'m so glad! But don\'t push yourself too hard, okay? If anything\'s too heavy, just call the men around here, they can help! Oh, and don\'t forget to come over for lunch with me!',
          l4: '*smiles and waves goodbye*',
        },
        graham: {
          l1: 'Hello young man, how\'s the farm coming along? Are you eating properly out there?',
          l2: 'Good morning, ma\'am, are you well? The farm\'s doing fine, and yes, I\'m eating properly.',
          l3: 'I\'m so happy, dear! Come have lunch with me sometime! The cats and I would love your company.',
          l4: '*smiles* I\'ll be sure to come.',
        },
      },
    },
  },

  // Shortcuts panel
  shortcutsPanel: {
    title: '⌨️ Keyboard Shortcuts',
    subtitle: 'Keys below reflect your current settings.',
    hintToggle: 'Press {key} to open/close.',
    unbound: 'Not set',
    sections: {
      movement: '🏃 Movement',
      actions: '🎮 Actions',
      menus: '📦 Menus'
    }
  }
};