# API Reference

Public API documentation for FarmXP Browser systems.

## Global Objects

These objects are exposed on `window` for cross-module access:

```javascript
window.currentPlayer      // Player entity
window.inventorySystem    // Inventory manager
window.merchantSystem     // Commerce system
window.playerSystem       // Player needs/equipment
window.BuildSystem        // Construction mode
window.WeatherSystem      // Time and weather
window.collisionSystem    // Physics system
window.playerHUD          // HUD component
window.theWorld           // World manager
```

---

## Inventory System

### inventorySystem.addItem(categoryOrId, itemIdOrQty, quantity)

Add item to inventory.

**Signatures:**
```javascript
// By ID (auto-maps to category)
inventorySystem.addItem(itemId, quantity);

// By category (legacy)
inventorySystem.addItem(category, itemId, quantity);
```

**Returns:** `boolean` - Success status

**Example:**
```javascript
inventorySystem.addItem(5, 3);  // Add 3 apples
inventorySystem.addItem(0, 1);  // Add 1 scissors
```

---

### inventorySystem.removeItem(categoryOrId, itemIdOrQty, quantity)

Remove item from inventory.

**Returns:** `boolean` - Success status

---

### inventorySystem.getItemQuantity(itemId)

Get total quantity of item across all categories.

**Returns:** `number`

---

### inventorySystem.setSelectedItem(itemId)

Select an item for use/build mode.

**Returns:** `boolean` - Success status

---

### inventorySystem.getSelectedItem()

Get currently selected item with full data.

**Returns:** `object | null`

---

### inventorySystem.getInventory()

Get full inventory structure.

**Returns:**
```javascript
{
    tools: { limit, stackLimit, items: [...] },
    seeds: { ... },
    food: { ... },
    animal_food: { ... },
    construction: { ... },
    resources: { ... }
}
```

---

### inventorySystem.debug()

Log formatted inventory to console.

---

## Weather System

### WeatherSystem.currentTime

Current time in minutes (0-1439).

```javascript
const hours = Math.floor(WeatherSystem.currentTime / 60);
const minutes = WeatherSystem.currentTime % 60;
```

---

### WeatherSystem.day

Current day number (1-30 per month).

---

### WeatherSystem.season

Current season: `"Primavera"`, `"Verao"`, `"Outono"`, `"Inverno"`

---

### WeatherSystem.weatherType

Current weather: `"clear"`, `"rain"`, `"storm"`, `"fog"`, `"blizzard"`

---

### WeatherSystem.getTimeString()

Get formatted time string.

**Returns:** `string` - Format `"HH:MM"`

---

### WeatherSystem.getWeekday()

Get current day of week.

**Returns:** `string` - `"Segunda"`, `"Terca"`, etc.

---

### WeatherSystem.sleep()

Trigger sleep sequence (advance to next day).

---

## Collision System

### collisionSystem.addHitbox(objectId, objectType, x, y, width, height, originalObject)

Register a hitbox for collision detection.

---

### collisionSystem.removeHitbox(id)

Remove a hitbox by ID.

---

### collisionSystem.checkCollision(boxA, boxB)

Check if two boxes overlap.

**Returns:** `boolean`

---

### collisionSystem.areaCollides(x, y, w, h, ignoreId)

Check if area overlaps any registered hitbox.

**Returns:** `boolean`

---

### collisionSystem.getObjectAtMouse(screenX, screenY, camera, options)

Get object under mouse cursor.

**Options:**
- `requirePlayerInRange`: `boolean` - Only return if player can interact

**Returns:** `object | null`

---

### collisionSystem.drawHitboxes(ctx, camera)

Render debug hitboxes (requires `window.DEBUG_HITBOXES = true`).

---

## Build System

### BuildSystem.startBuilding(itemData)

Enter build mode with selected item.

```javascript
const item = inventorySystem.getSelectedItem();
if (item?.placeable) {
    BuildSystem.startBuilding(item);
}
```

---

### BuildSystem.stopBuilding()

Exit build mode without placing.

---

### BuildSystem.placeObject()

Place object at current preview position.

---

### BuildSystem.rotate()

Cycle through item variants (e.g., fence orientations).

---

### BuildSystem.setSubPosition(axis, value)

Set grid alignment.

- `axis`: `"x"` or `"y"`
- `value`: `-1` (left/top), `0` (center), `1` (right/bottom)

---

### BuildSystem.active

`boolean` - Whether build mode is active.

---

## Player System

### playerSystem.getNeeds()

Get current need values.

**Returns:**
```javascript
{ hunger: 0-100, thirst: 0-100, energy: 0-100 }
```

---

### playerSystem.restoreNeeds(hunger, thirst, energy)

Add to need values.

---

### playerSystem.consumeNeeds(actionType, multiplier)

Deplete needs based on action.

**Action types:** `"moving"`, `"breaking"`, `"building"`, `"collecting"`, `"idle"`

---

### playerSystem.equipItem(item)

Equip a tool or food item.

---

### playerSystem.getEquippedItem()

Get currently equipped item.

**Returns:** `object | null`

---

## Merchant System

### merchantSystem.openMerchantsList()

Open merchant selection modal.

---

### merchantSystem.closeAllModals()

Close all commerce modals.

---

### merchantSystem.isMerchantOpen(merchant)

Check if merchant is open based on schedule.

**Returns:** `boolean`

---

## Events

### Custom Events

```javascript
// Listen for inventory changes
document.addEventListener('inventoryUpdated', (e) => {
    console.log(e.detail.inventory);
});

// Listen for time changes
document.addEventListener('timeChanged', (e) => {
    console.log(e.detail.day, e.detail.time);
});

// Listen for player interaction
document.addEventListener('playerInteract', (e) => {
    console.log(e.detail.objectId, e.detail.originalType);
});
```

### Event List

| Event | Payload |
|-------|---------|
| `characterSelected` | - |
| `playerReady` | `{ player, updateFunction }` |
| `inventoryUpdated` | `{ inventory }` |
| `playerInteract` | `{ objectId, originalType }` |
| `timeChanged` | `{ day, time, weekday }` |
| `dayChanged` | `{ day }` |
| `sleepStarted` | - |
| `sleepEnded` | - |
| `playerNeedsChanged` | `{ hunger, thirst, energy }` |
| `needsCritical` | `{ hunger, thirst, energy, multiplier }` |
| `itemEquipped` | `{ item }` |
| `itemUnequipped` | - |

---

## Debug Functions

```javascript
// Add item by ID
window.debugItem(itemId);

// Spawn animals
window.gameDebug.spawnAnimals(count, type);

// List animals
window.gameDebug.listAnimals();

// Clear animals
window.gameDebug.clearAnimals();

// Test sleep
window.gameDebug.triggerSleep();
window.gameDebug.wakeUp();

// Performance info
window.gameDebug.getPerformance();
```
