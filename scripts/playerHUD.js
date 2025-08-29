
// Player HUD system
import { player } from "./playerSystem.js";
import { decayStats } from "./playerSystem.js";

export function updatePlayerInfo() {
  const infoDiv = document.querySelector(".playerInfo");
  infoDiv.innerHTML = `
    <h2>Jogador</h2>
    <p>Level: ${player.level}</p>
    <p>XP: ${player.xp}/${player.xpMax} [${"|".repeat(player.xp / 10)}]</p>
    <p>🍗 Fome: ${player.hunger}</p>
    <p>💧 Sede: ${player.thirst}</p>
    <p>⚡ Energia: ${player.energy}</p>
    <p>💰 Dinheiro: ${player.money}</p>
  `;
}
