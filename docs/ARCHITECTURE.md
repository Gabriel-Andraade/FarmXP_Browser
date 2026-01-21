# Architecture Overview

FarmXP Browser follows a modular architecture with lazy-loaded systems for optimal performance.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.html                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    main.js (Entry Point)                │   │
│  │  - Game loop                                            │   │
│  │  - System orchestration                                 │   │
│  │  - Event coordination                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐            │
│         ▼                    ▼                    ▼            │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │  theWorld   │     │  thePlayer  │     │   Systems   │      │
│  │  (Render)   │     │  (Control)  │     │  (Logic)    │      │
│  └─────────────┘     └─────────────┘     └─────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Module Dependency Graph

```
main.js
├── theWorld.js (world objects, rendering)
├── thePlayer/
│   ├── characterSelection.js
│   ├── control.js (input handling)
│   ├── cameraSystem.js
│   ├── inventorySystem.js
│   ├── playerSystem.js (needs management)
│   ├── playerHUD.js
│   └── stella.js (player character)
├── collisionSystem.js
├── assetManager.js
├── loadingScreen.js
└── [Lazy Loaded Systems]
    ├── buildSystem.js
    ├── chestSystem.js
    ├── houseSystem.js
    ├── wellSystem.js
    ├── weather.js
    ├── merchant.js
    └── animal/
        ├── animalAI.js
        └── UiPanel.js
```

## Core Systems

### 1. Game Loop (`main.js`)

The main game loop runs at 60fps (30fps on mobile) and has three phases:

```javascript
function gameLoop(timestamp) {
    // 1. UPDATE LOGIC
    WeatherSystem.update(deltaTime);
    updateAnimals();
    updatePlayer(deltaTime, keys);

    // 2. RENDER
    drawBackground(ctx);
    getSortedWorldObjects().forEach(obj => obj.draw(ctx));
    drawWeatherEffects(ctx);

    // 3. UI
    worldUI.render(ctx);
    playerHUD.render();

    requestAnimationFrame(gameLoop);
}
```

### 2. World System (`theWorld.js`)

Manages all world objects with Y-sorting for proper depth rendering:

- Static objects (trees, rocks, houses)
- Dynamic objects (player, animals)
- Interactable objects (chests, wells)

### 3. Collision System (`collisionSystem.js`)

Dual-hitbox architecture:

| Type | Color (Debug) | Purpose |
|------|---------------|---------|
| Physical | Red | Solid collision (movement blocking) |
| Interaction | Orange/Green | Interaction zones (E key trigger) |
| Player Range | Yellow | Player's interaction reach |
| Player Body | Blue | Player's physical hitbox |

```javascript
class CollisionSystem {
    hitboxes = new Map();           // Physical hitboxes
    interactionHitboxes = new Map(); // Interaction zones
    playerInteractionHitbox = null;  // Player's reach
}
```

### 4. Camera System (`cameraSystem.js`)

Viewport management with world-to-screen coordinate transformation:

```javascript
const camera = {
    x, y,           // World position
    width, height,  // Viewport size
    zoom,           // Zoom level (default: 2)

    worldToScreen(wx, wy) { ... },
    screenToWorld(sx, sy) { ... }
};
```

## Lazy Loading Strategy

Systems are loaded on-demand to improve initial load time:

```javascript
// In main.js
async function loadCriticalSystems() {
    // These load immediately
    const playerSystem = await import("./playerSystem.js");
    const inventorySystem = await import("./inventorySystem.js");
}

// These load when first needed
document.addEventListener("playerInteract", async (e) => {
    if (e.detail.originalType === "chest" && !chestSystem) {
        const module = await import("./chestSystem.js");
        chestSystem = module.chestSystem;
    }
});
```

## Event System

The game uses custom DOM events for inter-system communication:

| Event | Dispatcher | Listeners |
|-------|------------|-----------|
| `playerReady` | playerSystem | main.js |
| `characterSelected` | characterSelection | main.js |
| `inventoryUpdated` | inventorySystem | inventoryUI |
| `playerInteract` | control.js | main.js |
| `timeChanged` | weather.js | merchant.js |
| `sleepStarted/Ended` | weather.js | main.js, control.js |

## State Management

### Global State (Window)

Exposed for cross-module access and debugging:

```javascript
window.currentPlayer     // Player entity
window.inventorySystem   // Inventory manager
window.merchantSystem    // Commerce manager
window.BuildSystem       // Construction mode
window.theWorld          // World manager
window.playerHUD         // HUD component
```

### System-Local State

Each system maintains its own state:

```javascript
// inventorySystem.js
class InventorySystem {
    categories = { tools, seeds, food, ... };
    equipped = { tool: null, food: null };
    selectedItem = null;
}
```

## Rendering Pipeline

1. **Clear canvas**
2. **Draw background** (grass tiles)
3. **Draw world objects** (Y-sorted)
   - Static objects
   - Animals
   - Player
4. **Draw build preview** (if in build mode)
5. **Draw debug hitboxes** (if DEBUG_HITBOXES)
6. **Draw weather effects** (rain, snow, fog)
7. **Draw weather UI** (time, day, season)
8. **Draw player HUD** (needs bars, money)

## Mobile Optimization

On mobile devices:
- FPS capped at 30
- Image smoothing disabled
- Virtual joystick enabled
- Touch-to-move system active
