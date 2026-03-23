// =====================================================
// NOVAS CONQUISTAS SUGERIDAS
// =====================================================

// ═══════════════════════ FARMING ═══════════════════════

{
  id: 'green_thumb',
  category: 'farming',
  icon: '🌱',
  i18nKey: 'achievements.greenThumb',
  type: 'cumulative',
  target: 100,
  events: ['cropPlanted'],            // assumindo que existe um evento ao plantar
  condition: () => true,
  hidden: false,
},
{
  id: 'harvest_master',
  category: 'farming',
  icon: '🌾',
  i18nKey: 'achievements.harvestMaster',
  type: 'cumulative',
  target: 500,
  events: ['cropHarvested'],          // evento de colheita
  condition: () => true,
  hidden: false,
},
{
  id: 'diverse_farm',
  category: 'farming',
  icon: '🌽',
  i18nKey: 'achievements.diverseFarm',
  type: 'threshold',                   // conta tipos únicos plantados
  target: 10,
  events: ['cropPlanted'],
  condition: (detail) => {
    // Precisaria de um estado global para armazenar os tipos já plantados
    // Ou podemos usar um acumulador externo, mas aqui simplificamos:
    // Na prática, o achievement tracker acumularia os tipos vistos.
    // Para esta sugestão, considere que o evento passa o tipo da cultura.
    return true; // A lógica real seria mais complexa, mas o objetivo é ilustrar.
  },
  hidden: false,
},
{
  id: 'golden_harvest',
  category: 'farming',
  icon: '🌟',
  i18nKey: 'achievements.goldenHarvest',
  type: 'cumulative',
  target: 100,
  events: ['cropHarvested'],
  condition: (detail) => detail.quality === 'gold', // se existir qualidade
  hidden: false,
},
{
  id: 'tiller',
  category: 'farming',
  icon: '🚜',
  i18nKey: 'achievements.tiller',
  type: 'cumulative',
  target: 1000,
  events: ['tileTilled'],              // evento de arar a terra
  condition: () => true,
  hidden: false,
},

// ═══════════════════════ ANIMALS ═══════════════════════

{
  id: 'animal_whisperer',
  category: 'animals',
  icon: '💕',
  i18nKey: 'achievements.animalWhisperer',
  type: 'cumulative',
  target: 50,
  events: ['animalAction'],
  condition: (detail) => detail.action === 'pet',
  hidden: false,
},
{
  id: 'egg_collector',
  category: 'animals',
  icon: '🥚',
  i18nKey: 'achievements.eggCollector',
  type: 'cumulative',
  target: 100,
  events: ['itemCollected'],           // ou 'animalProduct'
  condition: (detail) => detail.item === 'egg',
  hidden: false,
},
{
  id: 'milk_maid',
  category: 'animals',
  icon: '🥛',
  i18nKey: 'achievements.milkMaid',
  type: 'cumulative',
  target: 100,
  events: ['itemCollected'],
  condition: (detail) => detail.item === 'milk',
  hidden: false,
},
{
  id: 'shearer',
  category: 'animals',
  icon: '✂️',
  i18nKey: 'achievements.shearer',
  type: 'cumulative',
  target: 50,
  events: ['animalAction'],
  condition: (detail) => detail.action === 'shear',
  hidden: false,
},
{
  id: 'full_barn',
  category: 'animals',
  icon: '🐏',
  i18nKey: 'achievements.fullBarn',
  type: 'threshold',
  target: 10,
  events: ['animalCountChanged'],      // evento que dispara quando o número de animais muda
  condition: (detail) => detail.count >= 10,
  hidden: false,
},

// ═══════════════════════ ECONOMY ═══════════════════════

{
  id: 'shopaholic',
  category: 'economy',
  icon: '🛒',
  i18nKey: 'achievements.shopaholic',
  type: 'cumulative',
  target: 50,
  events: ['itemPurchased'],           // evento de compra
  condition: () => true,
  increment: (detail) => detail.quantity || 1,
  hidden: false,
},
{
  id: 'millionaire',
  category: 'economy',
  icon: '💎',
  i18nKey: 'achievements.millionaire',
  type: 'threshold',
  target: 1000000,
  events: ['moneyChanged'],
  condition: (detail) => detail.money >= 1000000,
  hidden: false,
},
{
  id: 'trader',
  category: 'economy',
  icon: '📈',
  i18nKey: 'achievements.trader',
  type: 'cumulative',
  target: 1000,
  events: ['itemSold'],                // evento de venda
  condition: () => true,
  increment: (detail) => detail.quantity || 1,
  hidden: false,
},
{
  id: 'bargain_hunter',
  category: 'economy',
  icon: '🏷️',
  i18nKey: 'achievements.bargainHunter',
  type: 'single',
  target: 1,
  events: ['itemPurchased'],
  condition: (detail) => detail.discount > 0,  // se houver desconto
  hidden: false,
},

// ═══════════════════════ EXPLORATION ═══════════════════════

{
  id: 'explorer',
  category: 'exploration',
  icon: '🗺️',
  i18nKey: 'achievements.explorer',
  type: 'threshold',
  target: 5,
  events: ['mapChanged'],              // evento ao entrar em novo mapa/bioma
  condition: (detail) => {
    // Seria necessário um contador de mapas únicos visitados.
    // Aqui simplificamos: o evento pode enviar o nome do mapa e o tracker armazenar os já visitados.
    return true;
  },
  hidden: false,
},
{
  id: 'deep_diver',
  category: 'exploration',
  icon: '⛰️',
  i18nKey: 'achievements.deepDiver',
  type: 'threshold',
  target: 50,                           // nível da mina
  events: ['mineLevelReached'],
  condition: (detail) => detail.level >= 50,
  hidden: false,
},
{
  id: 'treasure_hunter',
  category: 'exploration',
  icon: '🎁',
  i18nKey: 'achievements.treasureHunter',
  type: 'cumulative',
  target: 10,
  events: ['treasureFound'],
  condition: () => true,
  hidden: false,
},
{
  id: 'nomad',
  category: 'exploration',
  icon: '🚶',
  i18nKey: 'achievements.nomad',
  type: 'cumulative',
  target: 10000,
  events: ['playerMoved'],             // evento de movimento, com passos ou distância
  condition: () => true,
  increment: (detail) => detail.steps || 1,
  hidden: false,
},

// ═══════════════════════ SURVIVAL ═══════════════════════

{
  id: 'well_fed',
  category: 'survival',
  icon: '🍲',
  i18nKey: 'achievements.wellFed',
  type: 'single',                      // talvez 'cumulative' para dias seguidos?
  target: 1,
  events: ['dayEnded'],
  condition: (detail) => {
    // Condição complexa: todas as necessidades > 90% ao final do dia
    // Depende do estado global. Poderia ser um evento 'needsChecked'.
    return false; // Placeholder
  },
  hidden: false,
},
{
  id: 'iron_stomach',
  category: 'survival',
  icon: '🍽️',
  i18nKey: 'achievements.ironStomach',
  type: 'threshold',                    // contar alimentos diferentes consumidos
  target: 20,
  events: ['foodEaten'],
  condition: (detail) => {
    // Similar ao diverseFarm, precisa de acumulador de tipos únicos.
    return true;
  },
  hidden: false,
},
{
  id: 'early_riser',
  category: 'survival',
  icon: '⏰',
  i18nKey: 'achievements.earlyRiser',
  type: 'cumulative',
  target: 10,
  events: ['wakeUp'],
  condition: (detail) => detail.hour < 6,  // acordar antes das 6h
  hidden: false,
},
{
  id: 'master_chef',
  category: 'survival',
  icon: '👨‍🍳',
  i18nKey: 'achievements.masterChef',
  type: 'cumulative',
  target: 50,
  events: ['itemCooked'],
  condition: () => true,
  hidden: false,
},

// ═══════════════════════ CRAFTING (se houver categoria própria) ═══════════════════════
// Caso queira adicionar uma nova categoria 'crafting' no ACHIEVEMENT_CATEGORIES

{
  id: 'crafter',
  category: 'crafting',                 // nova categoria
  icon: '🔨',
  i18nKey: 'achievements.crafter',
  type: 'cumulative',
  target: 100,
  events: ['itemCrafted'],
  condition: () => true,
  hidden: false,
},
{
  id: 'blacksmith',
  category: 'crafting',
  icon: '⚒️',
  i18nKey: 'achievements.blacksmith',
  type: 'cumulative',
  target: 50,
  events: ['itemCrafted'],
  condition: (detail) => detail.category === 'tool',
  hidden: false,
},

// ═══════════════════════ MISC / LONGEVIDADE ═══════════════════════

{
  id: 'seasoned_farmer',
  category: 'survival',                 // ou 'exploration'
  icon: '🍂',
  i18nKey: 'achievements.seasonedFarmer',
  type: 'threshold',
  target: 4,                            // passou pelas 4 estações
  events: ['seasonChanged'],
  condition: (detail) => {
    // Acumular estações já vividas (precisa de contador)
    return true;
  },
  hidden: false,
},
{
  id: 'anniversary',
  category: 'survival',
  icon: '🎂',
  i18nKey: 'achievements.anniversary',
  type: 'threshold',
  target: 365,                          // dias jogados
  events: ['dayStarted'],
  condition: (detail) => detail.day >= 365,
  hidden: false,
},
