/**
 * @file achievementDefinitions.js - Achievement definitions
 * @description All achievement data for FarmingXP.
 *
 * To add a new achievement, copy one of the entries below and change:
 *   id         – unique string
 *   category   – farming | animals | economy | exploration | survival
 *   icon       – emoji
 *   i18nKey    – base key in i18n files (needs .title and .description)
 *   type       – 'single' (one-time) | 'cumulative' (sum up) | 'threshold' (reach value)
 *   target     – number to reach
 *   events     – array of event names to listen to
 *   condition  – (eventDetail) => boolean – return true when the event should count
 *   hidden     – if true, title/description show as "???" until unlocked
 *
 * @module achievementDefinitions
 */

export const ACHIEVEMENT_CATEGORIES = [
  'all', 'farming', 'animals', 'economy', 'exploration', 'survival'
];

export const ACHIEVEMENTS = [

  // ═══════════════════════ EXPLORATION ═══════════════════════

  {
    id: 'first_steps',
    category: 'exploration',
    icon: '👣',
    i18nKey: 'achievements.firstSteps',
    type: 'single',
    target: 1,
    events: ['playerReady'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'night_owl',
    category: 'exploration',
    icon: '🦉',
    i18nKey: 'achievements.nightOwl',
    type: 'single',
    target: 1,
    events: ['timeChanged'],
    condition: (detail) => detail.time >= 1320, // 22:00
    hidden: false,
  },

  // ═══════════════════════ FARMING ═══════════════════════

  {
    id: 'first_tree',
    category: 'farming',
    icon: '🪓',
    i18nKey: 'achievements.firstTree',
    type: 'single',
    target: 1,
    events: ['objectDestroyed'],
    condition: (detail) => {
      const t = (detail.type || '').toUpperCase();
      return t === 'TREE';
    },
    hidden: false,
  },
  {
    id: 'lumberjack',
    category: 'farming',
    icon: '🪵',
    i18nKey: 'achievements.lumberjack',
    type: 'cumulative',
    target: 50,
    events: ['objectDestroyed'],
    condition: (detail) => {
      const t = (detail.type || '').toUpperCase();
      return t === 'TREE';
    },
    hidden: false,
  },
  {
    id: 'stone_breaker',
    category: 'farming',
    icon: '⛏️',
    i18nKey: 'achievements.stoneBreaker',
    type: 'cumulative',
    target: 25,
    events: ['objectDestroyed'],
    condition: (detail) => {
      const t = (detail.type || '').toUpperCase();
      return t === 'ROCK';
    },
    hidden: false,
  },
  {
    id: 'first_build',
    category: 'farming',
    icon: '🏗️',
    i18nKey: 'achievements.firstBuild',
    type: 'single',
    target: 1,
    events: ['worldObjectAdded'],
    condition: () => true,
    hidden: false,
  },

  // ═══════════════════════ ANIMALS ═══════════════════════

  {
    id: 'animal_friend',
    category: 'animals',
    icon: '🐾',
    i18nKey: 'achievements.animalFriend',
    type: 'single',
    target: 1,
    events: ['animalAction'],
    condition: (detail) => detail.action === 'pet',
    hidden: false,
  },
  {
    id: 'rancher',
    category: 'animals',
    icon: '🐄',
    i18nKey: 'achievements.rancher',
    type: 'cumulative',
    target: 20,
    events: ['animalAction'],
    condition: (detail) => detail.action === 'feed',
    hidden: false,
  },

  // ═══════════════════════ ECONOMY ═══════════════════════

  {
    id: 'first_coin',
    category: 'economy',
    icon: '🪙',
    i18nKey: 'achievements.firstCoin',
    type: 'single',
    target: 1,
    events: ['moneyChanged'],
    condition: (detail) => detail.difference > 0,
    hidden: false,
  },
  {
    id: 'wealthy_farmer',
    category: 'economy',
    icon: '💰',
    i18nKey: 'achievements.wealthyFarmer',
    type: 'threshold',
    target: 5000,
    events: ['moneyChanged'],
    condition: (detail) => detail.money >= 5000,
    hidden: false,
  },
  {
    id: 'big_spender',
    category: 'economy',
    icon: '💸',
    i18nKey: 'achievements.bigSpender',
    type: 'cumulative',
    target: 10000,
    events: ['moneyChanged'],
    condition: (detail) => detail.difference < 0,
    increment: (detail) => Math.abs(detail.difference),
    hidden: false,
  },
  {
    id: 'hoarder',
    category: 'economy',
    icon: '📦',
    i18nKey: 'achievements.hoarder',
    type: 'threshold',
    target: 50,
    events: ['inventoryUpdated'],
    condition: (detail) => {
      // conta itens unicos no inventario
      const inv = detail.inventory;
      if (!inv) return false;
      let count = 0;
      if (inv.categories) {
        for (const cat of Object.values(inv.categories)) {
          if (Array.isArray(cat)) count += cat.length;
        }
      }
      return count >= 50;
    },
    hidden: false,
  },

  // ═══════════════════════ SURVIVAL ═══════════════════════

  {
    id: 'early_bird',
    category: 'survival',
    icon: '🌅',
    i18nKey: 'achievements.earlyBird',
    type: 'single',
    target: 1,
    events: ['sleepEnded'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'close_call',
    category: 'survival',
    icon: '💀',
    i18nKey: 'achievements.closeCall',
    type: 'single',
    target: 1,
    events: ['needsCritical'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'survivor_7',
    category: 'survival',
    icon: '🏕️',
    i18nKey: 'achievements.survivor7',
    type: 'cumulative',
    target: 7,
    events: ['sleepEnded'],
    condition: () => true,
    hidden: false,
  },

  // ═══════════════════════════════════════════════════════════════
  //  40 ADDITIONAL ACHIEVEMENTS
  // ═══════════════════════════════════════════════════════════════

  // ─────────────── FARMING (10) ───────────────

  {
    id: 'tree_hugger',
    category: 'farming',
    icon: '🌳',
    i18nKey: 'achievements.treeHugger',
    type: 'cumulative',
    target: 100,
    events: ['objectDestroyed'],
    condition: (d) => (d.type || '').toUpperCase() === 'TREE',
    hidden: false,
  },
  {
    id: 'deforestation',
    category: 'farming',
    icon: '🏜️',
    i18nKey: 'achievements.deforestation',
    type: 'cumulative',
    target: 250,
    events: ['objectDestroyed'],
    condition: (d) => (d.type || '').toUpperCase() === 'TREE',
    hidden: true,
  },
  {
    id: 'rock_solid',
    category: 'farming',
    icon: '🪨',
    i18nKey: 'achievements.rockSolid',
    type: 'cumulative',
    target: 100,
    events: ['objectDestroyed'],
    condition: (d) => (d.type || '').toUpperCase() === 'ROCK',
    hidden: false,
  },
  {
    id: 'quarry_master',
    category: 'farming',
    icon: '⛰️',
    i18nKey: 'achievements.quarryMaster',
    type: 'cumulative',
    target: 250,
    events: ['objectDestroyed'],
    condition: (d) => (d.type || '').toUpperCase() === 'ROCK',
    hidden: false,
  },
  {
    id: 'master_builder',
    category: 'farming',
    icon: '🏠',
    i18nKey: 'achievements.masterBuilder',
    type: 'cumulative',
    target: 25,
    events: ['worldObjectAdded'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'fence_enthusiast',
    category: 'farming',
    icon: '🚧',
    i18nKey: 'achievements.fenceEnthusiast',
    type: 'cumulative',
    target: 50,
    events: ['worldObjectAdded'],
    condition: (d) => {
      const t = (d.object?.type || '').toLowerCase();
      return t === 'fence' || t === 'fencex' || t === 'fencey';
    },
    hidden: false,
  },
  {
    id: 'well_digger',
    category: 'farming',
    icon: '🪣',
    i18nKey: 'achievements.wellDigger',
    type: 'single',
    target: 1,
    events: ['wellPlaced'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'first_hit',
    category: 'farming',
    icon: '💥',
    i18nKey: 'achievements.firstHit',
    type: 'single',
    target: 1,
    events: ['playerAttack'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'persistent_hitter',
    category: 'farming',
    icon: '🔨',
    i18nKey: 'achievements.persistentHitter',
    type: 'cumulative',
    target: 500,
    events: ['playerAttack'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'thicket_clearer',
    category: 'farming',
    icon: '🌿',
    i18nKey: 'achievements.thicketClearer',
    type: 'cumulative',
    target: 10,
    events: ['objectDestroyed'],
    condition: (d) => (d.type || '').toUpperCase() === 'THICKET',
    hidden: false,
  },

  // ─────────────── ANIMALS (6) ───────────────

  {
    id: 'pet_lover',
    category: 'animals',
    icon: '💕',
    i18nKey: 'achievements.petLover',
    type: 'cumulative',
    target: 50,
    events: ['animalAction'],
    condition: (d) => d.action === 'pet',
    hidden: false,
  },
  {
    id: 'animal_whisperer',
    category: 'animals',
    icon: '🐾',
    i18nKey: 'achievements.animalWhisperer',
    type: 'cumulative',
    target: 100,
    events: ['animalAction'],
    condition: (d) => d.action === 'pet',
    hidden: false,
  },
  {
    id: 'first_shear',
    category: 'animals',
    icon: '✂️',
    i18nKey: 'achievements.firstShear',
    type: 'single',
    target: 1,
    events: ['animalAction'],
    condition: (d) => d.action === 'shear',
    hidden: false,
  },
  {
    id: 'first_collect',
    category: 'animals',
    icon: '🥚',
    i18nKey: 'achievements.firstCollect',
    type: 'single',
    target: 1,
    events: ['animalAction'],
    condition: (d) => d.action === 'collect',
    hidden: false,
  },
  {
    id: 'feeding_frenzy',
    category: 'animals',
    icon: '🍽️',
    i18nKey: 'achievements.feedingFrenzy',
    type: 'cumulative',
    target: 100,
    events: ['animalAction'],
    condition: (d) => d.action === 'feed',
    hidden: false,
  },
  {
    id: 'dedicated_caretaker',
    category: 'animals',
    icon: '🧑‍🌾',
    i18nKey: 'achievements.dedicatedCaretaker',
    type: 'cumulative',
    target: 200,
    events: ['animalAction'],
    condition: () => true,
    hidden: false,
  },

  // ─────────────── ECONOMY (8) ───────────────

  {
    id: 'penny_pincher',
    category: 'economy',
    icon: '💵',
    i18nKey: 'achievements.pennyPincher',
    type: 'threshold',
    target: 1000,
    events: ['moneyChanged'],
    condition: (d) => d.money >= 1000,
    hidden: false,
  },
  {
    id: 'tycoon',
    category: 'economy',
    icon: '🏦',
    i18nKey: 'achievements.tycoon',
    type: 'threshold',
    target: 25000,
    events: ['moneyChanged'],
    condition: (d) => d.money >= 25000,
    hidden: false,
  },
  {
    id: 'millionaire',
    category: 'economy',
    icon: '👑',
    i18nKey: 'achievements.millionaire',
    type: 'threshold',
    target: 100000,
    events: ['moneyChanged'],
    condition: (d) => d.money >= 100000,
    hidden: true,
  },
  {
    id: 'first_purchase',
    category: 'economy',
    icon: '🛒',
    i18nKey: 'achievements.firstPurchase',
    type: 'single',
    target: 1,
    events: ['moneyChanged'],
    condition: (d) => d.difference < 0,
    hidden: false,
  },
  {
    id: 'generous_spender',
    category: 'economy',
    icon: '🤑',
    i18nKey: 'achievements.generousSpender',
    type: 'cumulative',
    target: 50000,
    events: ['moneyChanged'],
    condition: (d) => d.difference < 0,
    increment: (d) => Math.abs(d.difference),
    hidden: false,
  },
  {
    id: 'item_collector_10',
    category: 'economy',
    icon: '🎒',
    i18nKey: 'achievements.itemCollector10',
    type: 'threshold',
    target: 10,
    events: ['inventoryUpdated'],
    condition: (d) => {
      const inv = d.inventory;
      if (!inv) return false;
      let count = 0;
      if (inv.categories) {
        for (const cat of Object.values(inv.categories)) {
          if (Array.isArray(cat)) count += cat.length;
        }
      }
      return count >= 10;
    },
    hidden: false,
  },
  {
    id: 'item_collector_25',
    category: 'economy',
    icon: '🧳',
    i18nKey: 'achievements.itemCollector25',
    type: 'threshold',
    target: 25,
    events: ['inventoryUpdated'],
    condition: (d) => {
      const inv = d.inventory;
      if (!inv) return false;
      let count = 0;
      if (inv.categories) {
        for (const cat of Object.values(inv.categories)) {
          if (Array.isArray(cat)) count += cat.length;
        }
      }
      return count >= 25;
    },
    hidden: false,
  },
  {
    id: 'discard_king',
    category: 'economy',
    icon: '🗑️',
    i18nKey: 'achievements.discardKing',
    type: 'cumulative',
    target: 20,
    events: ['discardItemRequest'],
    condition: () => true,
    hidden: false,
  },

  // ─────────────── EXPLORATION (8) ───────────────

  {
    id: 'midnight_wanderer',
    category: 'exploration',
    icon: '🌙',
    i18nKey: 'achievements.midnightWanderer',
    type: 'single',
    target: 1,
    events: ['timeChanged'],
    condition: (d) => d.time >= 1440 || d.time === 0,
    hidden: false,
  },
  {
    id: 'marathon_runner',
    category: 'exploration',
    icon: '🏃',
    i18nKey: 'achievements.marathonRunner',
    type: 'cumulative',
    target: 10000,
    events: ['playerMoved'],
    condition: (d) => d.distance > 0,
    increment: (d) => Math.round(d.distance),
    hidden: false,
  },
  {
    id: 'speed_walker',
    category: 'exploration',
    icon: '🚶',
    i18nKey: 'achievements.speedWalker',
    type: 'cumulative',
    target: 50000,
    events: ['playerMoved'],
    condition: (d) => d.distance > 0,
    increment: (d) => Math.round(d.distance),
    hidden: false,
  },
  {
    id: 'world_traveler',
    category: 'exploration',
    icon: '🌍',
    i18nKey: 'achievements.worldTraveler',
    type: 'cumulative',
    target: 200000,
    events: ['playerMoved'],
    condition: (d) => d.distance > 0,
    increment: (d) => Math.round(d.distance),
    hidden: true,
  },
  {
    id: 'week_one',
    category: 'exploration',
    icon: '📅',
    i18nKey: 'achievements.weekOne',
    type: 'threshold',
    target: 7,
    events: ['dayChanged'],
    condition: (d) => d.day >= 7,
    hidden: false,
  },
  {
    id: 'month_one',
    category: 'exploration',
    icon: '🗓️',
    i18nKey: 'achievements.monthOne',
    type: 'threshold',
    target: 30,
    events: ['dayChanged'],
    condition: (d) => d.day >= 30,
    hidden: false,
  },
  {
    id: 'storm_chaser',
    category: 'exploration',
    icon: '⛈️',
    i18nKey: 'achievements.stormChaser',
    type: 'single',
    target: 1,
    events: ['weatherChanged'],
    condition: (d) => d.type === 'storm',
    hidden: false,
  },
  {
    id: 'fog_walker',
    category: 'exploration',
    icon: '🌫️',
    i18nKey: 'achievements.fogWalker',
    type: 'single',
    target: 1,
    events: ['weatherChanged'],
    condition: (d) => d.type === 'fog',
    hidden: false,
  },

  // ─────────────── SURVIVAL (8) ───────────────

  {
    id: 'gourmet',
    category: 'survival',
    icon: '🍽️',
    i18nKey: 'achievements.gourmet',
    type: 'cumulative',
    target: 50,
    events: ['removeItemAfterConsumption'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'foodie',
    category: 'survival',
    icon: '🧑‍🍳',
    i18nKey: 'achievements.foodie',
    type: 'cumulative',
    target: 100,
    events: ['removeItemAfterConsumption'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'first_meal',
    category: 'survival',
    icon: '🍎',
    i18nKey: 'achievements.firstMeal',
    type: 'single',
    target: 1,
    events: ['removeItemAfterConsumption'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'survivor_30',
    category: 'survival',
    icon: '🏅',
    i18nKey: 'achievements.survivor30',
    type: 'cumulative',
    target: 30,
    events: ['sleepEnded'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'veteran_farmer',
    category: 'survival',
    icon: '🎖️',
    i18nKey: 'achievements.veteranFarmer',
    type: 'cumulative',
    target: 100,
    events: ['sleepEnded'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'iron_will',
    category: 'survival',
    icon: '☠️',
    i18nKey: 'achievements.ironWill',
    type: 'single',
    target: 1,
    events: ['needsCritical'],
    condition: (d) => {
      const critical = 15;
      let count = 0;
      if (d.hunger <= critical) count++;
      if (d.thirst <= critical) count++;
      if (d.energy <= critical) count++;
      return count >= 3;
    },
    hidden: true,
  },
  {
    id: 'tool_master',
    category: 'survival',
    icon: '🛠️',
    i18nKey: 'achievements.toolMaster',
    type: 'cumulative',
    target: 10,
    events: ['itemEquipped'],
    condition: () => true,
    hidden: false,
  },
  {
    id: 'blizzard_survivor',
    category: 'survival',
    icon: '❄️',
    i18nKey: 'achievements.blizzardSurvivor',
    type: 'single',
    target: 1,
    events: ['weatherChanged'],
    condition: (d) => d.type === 'blizzard',
    hidden: false,
  },
];
