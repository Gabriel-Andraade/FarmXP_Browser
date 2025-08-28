import { decayStats } from "./playerSystem.js";
import { updatePlayerInfo } from "./playerHUD.js";
import { WorldSystem } from './worldSystem.js';

// --- Player status decay ---
// Decrease player stats (hunger, thirst, energy) every 5 seconds
setInterval(() => {
  decayStats();
  updatePlayerInfo();
}, 5000);

// --- Game Loop with WorldSystem integration ---
// Controls the main game loop and frame rate
let lastTime = 0;
const fps = 60;
const fpsInterval = 1000 / fps;

function gameLoop(timestamp) {
  // Control frame rate
  if (timestamp < lastTime + fpsInterval) {
    requestAnimationFrame(gameLoop);
    return;
  }
  lastTime = timestamp;
  // Update all game systems
  WorldSystem.update();
  // Render all game systems
  WorldSystem.draw();
  // Request the next animation frame
  requestAnimationFrame(gameLoop);
}

// Start the main game loop
export function startGameLoop() {
  requestAnimationFrame(gameLoop);
}