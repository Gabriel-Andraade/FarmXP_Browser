# Game Systems Documentation

Detailed documentation of FarmXP Browser's game systems.

## Inventory System

**File:** `scripts/thePlayer/inventorySystem.js`

### Categories

| Category | Portuguese | Items |
|----------|------------|-------|
| `tools` | Ferramentas | Scissors, hoe, pickaxe, axe, watering can |
| `seeds` | Sementes | Corn, wheat, carrot, tomato, potato seeds |
| `food` | Comida | Apples, bread, cheese, prepared meals |
| `animal_food` | Racao | Chicken feed, sheep feed, hay |
| `construction` | Construcao | Fences, chests, wells |
| `resources` | Recursos | Wood, stone, iron, crops |

### Stack Limits

Each category has configurable limits:
- **Slot limit**: Maximum number of different items per category
- **Stack limit**: Maximum quantity per item stack

### Key Methods

```javascript
inventorySystem.addItem(itemId, quantity)
inventorySystem.removeItem(itemId, quantity)
inventorySystem.getItemQuantity(itemId)
inventorySystem.setSelectedItem(itemId)
inventorySystem.getSelectedItem()
inventorySystem.getInventory()
```

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `inventoryUpdated` | `{ inventory }` | Fired on any inventory change |
| `itemEquipped` | `{ item }` | Tool or food equipped |
| `itemUnequipped` | - | Item unequipped |

---

## Collision System

**File:** `scripts/collisionSystem.js`

### AABB Collision Detection

The system uses Axis-Aligned Bounding Box collision:

```javascript
function checkAABBCollision(boxA, boxB) {
    return (
        boxA.x < boxB.x + boxB.width &&
        boxA.x + boxA.width > boxB.x &&
        boxA.y < boxB.y + boxB.height &&
        boxA.y + boxA.height > boxB.y
    );
}
```

### Hitbox Types

**Physical Hitboxes** (block movement):
- Trees (trunk area only)
- Rocks
- House walls
- Wells (base area)
- Fences

**Interaction Hitboxes** (trigger E key):
- Chests
- Houses (door area)
- Wells
- Animals

### Configuration

Hitbox sizes are defined in `CONFIG_SIZES` and `ANIMAL_CONFIGS`:

```javascript
static CONFIG_SIZES = {
    TREE: { width: 38, height: 40, offsetY: 38, offsetX: 16 },
    ROCK: { width: 32, height: 27 },
    CHEST: { width: 31, height: 31 },
    // ...
};
```

---

## Weather System

**File:** `scripts/weather.js`

### Time Management

- **Day length**: 2 real minutes = 24 game hours
- **Time speed**: Configurable via `WeatherSystem.timeSpeed`
- **Week days**: Segunda, Terca, Quarta, Quinta, Sexta, Sabado, Domingo

### Weather Types

| Type | Effects | Season Weight |
|------|---------|---------------|
| `clear` | Normal visibility | All seasons |
| `rain` | Rain particles, darker | Spring/Summer/Fall |
| `storm` | Heavy rain, lightning | Spring/Summer/Fall |
| `fog` | Reduced visibility | All seasons |
| `blizzard` | Snow particles | Winter only |

### Day/Night Cycle

Ambient darkness varies by hour:

| Time | Darkness |
|------|----------|
| 0:00-4:00 | 100% |
| 5:00-6:00 | 95-85% |
| 7:00-8:00 | 60-0% |
| 8:00-16:00 | 0% (daylight) |
| 17:00-20:00 | 50-100% |

### Sleep System

When the player sleeps:
1. `sleepStarted` event dispatched
2. Fade to black (1.5s)
3. Time advances to 6:00 AM next day
4. Weather randomizes
5. Fade in (1.5s)
6. `sleepEnded` event dispatched

---

## Merchant System

**File:** `scripts/merchant.js`

### Merchants

| Name | Specialty | Schedule |
|------|-----------|----------|
| Thomas | Construction materials, tools | Mon-Fri 8:00-18:00 |
| Lara | Food, ingredients | Mon-Sat 6:00-20:00 |
| Rico | Seeds, animal feed | Tue-Sun 7:00-19:00 |

### Trade Modes

- **Sell**: Player sells items at 50% of base price
- **Buy**: Player buys at merchant's listed price

### Commerce Flow

1. Player opens merchant list (`U` key or store button)
2. Selects merchant (must be open)
3. Switches to buy/sell mode
4. Selects item and quantity
5. Confirms transaction
6. Currency updated via `currencyManager`

---

## Build System

**File:** `scripts/buildSystem.js`

### Construction Types

| Type | ID | Dimensions |
|------|----|------------|
| Chest | 69 | 31x31 px |
| Well | 93 | 75x95 px |
| Fence X | - | 32x32 px |
| Fence Y | - | 6x62 px |

### Grid Alignment

The build system uses a tile grid (default 32px):
- **Sub-positions**: 9 alignment points per tile (3x3 grid)
- Keys 1-3: X-axis (left/center/right)
- Keys 4-6: Y-axis (top/center/bottom)

### Placement Flow

1. Select placeable item in inventory
2. Press `B` to enter build mode
3. Move cursor to position
4. Adjust alignment with number keys
5. Press `T` or click to place
6. Item removed from inventory

---

## Animal AI System

**File:** `scripts/animal/animalAI.js`

### States

| State | Duration | Behavior |
|-------|----------|----------|
| `idle` | 1-3 seconds | Stand still, idle animation |
| `move` | 0.5-2 seconds | Walk toward random point |

### Movement

- **Speed**: 0.5 units/frame
- **Sight radius**: 128 pixels (movement range)
- **Collision**: Animals stop and re-path on collision

### Animation

- **Idle frame rate**: 500ms per frame
- **Move frame rate**: 150ms per frame
- **Directions**: down (0), left (1), right (2), up (3)

---

## Player Needs System

**File:** `scripts/thePlayer/playerSystem.js`

### Needs

| Need | Max | Critical | Effects |
|------|-----|----------|---------|
| Hunger | 100 | < 10 | Speed reduction |
| Thirst | 100 | < 10 | Speed reduction |
| Energy | 100 | < 15 | Speed reduction |

### Consumption Rates

| Activity | Hunger | Thirst | Energy |
|----------|--------|--------|--------|
| Moving | 0.5/unit | 0.7/unit | 1.0/unit |
| Breaking | 1.0/action | 1.5/action | 2.0/action |
| Building | 0.8/action | 1.0/action | 1.5/action |
| Collecting | 0.3/action | 0.4/action | 0.5/action |
| Idle | 0.05/sec | 0.1/sec | -0.5/sec (recovers) |

### Restoration

Food items have `fillUp` property:

```javascript
{
    id: 5,
    name: "Maca",
    fillUp: { hunger: 15, thirst: 5, energy: 10 }
}
```

### Critical State

When any need drops below critical:
- Efficiency multiplier: 0.3x (30% normal speed)
- Visual feedback on HUD
- `needsCritical` event dispatched
