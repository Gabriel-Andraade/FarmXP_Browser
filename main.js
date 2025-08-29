
import { updatePlayerInfo } from "./scripts/playerHUD.js";
import { startGameLoop } from "./scripts/gameLoop.js";
import { WorldSystem } from "./scripts/worldSystem.js";

// Load all game systems
import("./scripts/farmSystem.js");
import("./scripts/playerSystem.js");
import("./scripts/saveSystem.js");
import("./scripts/weather.js");


const canvas = document.getElementById("gameCanvas");
// Initialize world system
WorldSystem.init(canvas);

// Mount InfoCorner UI
import("./scripts/infoCorner.js").then(({ InfoCorner }) => {
  // Remove old inventory if still present (for hot reload/dev)
  const old = document.querySelector('.inventory');
  if (old) old.remove();
  // Mount new info corner
  const mount = document.getElementById('infoCornerMount');
  if (mount) {
    const infoCorner = new InfoCorner();
    mount.appendChild(infoCorner.container);
  }
});

// Start the game loop when assets are loaded
// (WorldSystem will call generateWorld() when everything is loaded)
setTimeout(() => {
  startGameLoop();
}, 100);
