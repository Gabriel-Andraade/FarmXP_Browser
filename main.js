
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


// Start the game loop when assets are loaded
// (WorldSystem will call generateWorld() when everything is loaded)
setTimeout(() => {
  startGameLoop();
}, 100);
