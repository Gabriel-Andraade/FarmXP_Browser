# FarmXP Browser

A browser-based farming simulation game built with vanilla JavaScript and HTML5 Canvas.

## Quick Start

**Prerequisites:** [Bun](https://bun.sh/) v1.2.21 or higher

```bash
# Install dependencies
bun install

# Run the development server
bun run server.ts
```

Open `http://localhost:3000` in your browser.

## Features

- Character selection and customization
- Farming mechanics (planting, watering, harvesting)
- Building system (fences, chests, wells)
- Merchant commerce system with schedules
- Animal husbandry with autonomous AI
- Dynamic weather and day/night cycle
- Player needs system (hunger, thirst, energy)
- Desktop and mobile support

## Controls

| Key | Action |
|-----|--------|
| `WASD` / Arrow Keys | Move |
| `E` | Interact |
| `I` | Inventory |
| `U` | Merchants |
| `B` | Build mode |
| `Escape` | Close panel |

See [docs/CONTROLS.md](./docs/CONTROLS.md) for complete controls.

## Documentation

- [Setup Guide](./docs/SETUP.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Controls](./docs/CONTROLS.md)
- [Game Systems](./docs/SYSTEMS.md)
- [API Reference](./docs/API.md)
- [Contributing](./docs/CONTRIBUTING.md)

## Project Structure

```
FarmXP_Browser/
├── index.html          # Main entry point
├── server.ts           # Bun development server
├── style/              # CSS modules
├── assets/             # Sprites and images
├── scripts/            # JavaScript modules
│   ├── main.js         # Game loop
│   ├── theWorld.js     # World rendering
│   ├── thePlayer/      # Player systems
│   ├── animal/         # Animal AI
│   └── ...
└── docs/               # Documentation
```

## Language

The game interface is in Portuguese (Brazilian).

## Browser Support

Chrome 90+, Firefox 88+, Safari 14+, and mobile browsers with touch support.
