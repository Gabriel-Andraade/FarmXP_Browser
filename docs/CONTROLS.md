# Game Controls

FarmXP Browser supports keyboard, mouse, and touch controls.

## Keyboard Controls

### Movement

| Key | Action |
|-----|--------|
| `W` / `Arrow Up` | Move up |
| `S` / `Arrow Down` | Move down |
| `A` / `Arrow Left` | Move left |
| `D` / `Arrow Right` | Move right |

Diagonal movement is supported (e.g., `W` + `D` for up-right). Movement speed is normalized for diagonal input.

### Interaction

| Key | Action |
|-----|--------|
| `E` | Interact with nearby objects (chests, houses, wells) |
| `K` | Inspect animal (when cursor is over an animal) |

### Inventory & UI

| Key | Action |
|-----|--------|
| `I` | Toggle inventory panel |
| `U` | Toggle merchant list / commerce system |
| `O` | Toggle settings/configuration panel |
| `Escape` | Close current modal/panel |

### Build Mode

| Key | Action |
|-----|--------|
| `B` | Enter build mode (with placeable item selected) |
| `R` | Rotate construction (for items with variants like fences) |
| `T` | Place/confirm construction |
| `1` | Grid align X: Left |
| `2` | Grid align X: Center |
| `3` | Grid align X: Right |
| `4` | Grid align Y: Top |
| `5` | Grid align Y: Center |
| `6` | Grid align Y: Bottom |
| `Escape` | Exit build mode |

## Mouse Controls (Desktop)

### Canvas Interaction

| Action | Effect |
|--------|--------|
| **Left Click** on canvas | Place object (build mode) or interact |
| **Left Click** on animal | Select animal to view stats |
| **Mouse Move** | Update build preview position |

### UI Interaction

| Action | Effect |
|--------|--------|
| Click inventory item | Select item |
| Click merchant card | Open commerce with that merchant |
| Click category button | Filter items by category |
| Click trade arrows | Switch between buy/sell modes |

## Mobile Controls

### Virtual Joystick

A virtual joystick appears in the bottom-left corner on mobile devices:
- **Drag** within the joystick area to move
- Release to stop

### Touch-to-Move

Alternatively, tap anywhere on the game canvas to move the player toward that position.

### Interaction Button

When near an interactable object, a purple `E` button appears in the bottom-right corner. Tap it to interact.

### Touch Gestures

| Gesture | Effect |
|---------|--------|
| **Tap** on canvas | Move to position / Select animal |
| **Tap** on UI element | Interact with UI |

## Build Mode Details

When entering build mode with a placeable item:

1. A help panel appears showing available controls
2. A colored grid overlay shows tile alignment
3. The preview follows your cursor/touch
4. Grid alignment keys (1-6) adjust sub-tile positioning:
   - **X-axis (1-2-3)**: Left, Center, Right alignment within tile
   - **Y-axis (4-5-6)**: Top, Center, Bottom alignment within tile

### Grid Colors

| Color | Meaning |
|-------|---------|
| Blue | Left/Top sub-position |
| Red | Center sub-position |
| Purple | Right/Bottom sub-position |
| White circle | Current cursor position |

## Sleep Mode

During sleep transitions (when sleeping in house):
- All controls are disabled
- Screen fades to black
- Time advances to next day morning
- Controls restore after wake-up animation

## Debug Controls

| Key/Action | Effect |
|------------|--------|
| `window.DEBUG_HITBOXES = true` | Show collision boxes |
| `window.BuildSystem.toggleDebug()` | Toggle build system debug overlay |
| `window.inventorySystem.debug()` | Log inventory contents to console |

## Control Configuration

Controls are defined in `scripts/thePlayer/control.js`:

```javascript
export const keys = {
    ArrowLeft: false, ArrowRight: false,
    ArrowUp: false, ArrowDown: false,
    KeyA: false, KeyW: false, KeyS: false, KeyD: false,
    KeyE: false, Space: false
};
```

The interaction range is configured in:

```javascript
export const PLAYER_INTERACTION_CONFIG = {
    widthRatio: 1.8,
    heightRatio: 1.8,
    offsetX: -0.4,
    offsetY: -0.4
};
```
