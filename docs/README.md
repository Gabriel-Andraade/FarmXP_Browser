# FarmXP Browser Documentation

Welcome to the FarmXP Browser documentation. FarmXP is a browser-based farming simulation game built with vanilla JavaScript and HTML5 Canvas.

## Table of Contents

- [Setup Guide](./SETUP.md) - Installation and running the game
- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [Controls](./CONTROLS.md) - Keyboard, mouse, and mobile controls
- [Game Systems](./SYSTEMS.md) - Detailed game systems documentation
- [API Reference](./API.md) - Public API and exported functions
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines

## Quick Start

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Run the development server
bun run server.ts
```

Then open `http://localhost:3000` in your browser.

## Features

### Core Gameplay
- **Character Selection** - Choose your farmer character
- **Farming** - Plant seeds, water crops, harvest produce
- **Building** - Place fences, chests, wells, and other structures
- **Commerce** - Buy and sell items with regional merchants
- **Animal Husbandry** - Raise and care for farm animals

### Technical Features
- **Lazy Loading** - Systems load on-demand for fast startup
- **Responsive UI** - Supports desktop and mobile devices
- **Dynamic Weather** - Rain, storms, fog, and seasonal weather
- **Day/Night Cycle** - Time-based lighting and merchant schedules
- **Collision System** - AABB-based physics and interaction zones
- **Sleep System** - Rest to restore energy and advance time

## Project Structure

```
FarmXP_Browser/
├── index.html          # Main HTML entry point
├── server.ts           # Bun development server
├── style/              # CSS stylesheets
├── assets/             # Game assets (sprites, portraits)
├── scripts/            # JavaScript modules
│   ├── main.js         # Game initialization and loop
│   ├── theWorld.js     # World management and rendering
│   ├── thePlayer/      # Player-related modules
│   │   ├── control.js          # Input handling
│   │   ├── inventorySystem.js  # Inventory management
│   │   ├── playerSystem.js     # Player needs (hunger, thirst, energy)
│   │   └── ...
│   ├── animal/         # Animal AI and UI
│   ├── buildSystem.js  # Construction system
│   ├── collisionSystem.js  # Physics and hitboxes
│   ├── merchant.js     # Commerce system
│   ├── weather.js      # Weather and time system
│   └── ...
└── docs/               # Documentation
```

## Language

The game interface is in Portuguese (Brazilian). Key terms:
- Inventario = Inventory
- Mercadores = Merchants
- Construcao = Construction
- Ferramentas = Tools
- Sementes = Seeds
- Comida = Food

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with touch support

## License

See the project root for license information.
