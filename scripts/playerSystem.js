
// scripts/playerSystem.js

export const player = {
  level: 1,
  xp: 0,
  xpMax: 100,
  hunger: 100,
  thirst: 100,
  energy: 100,
  money: 0,
};
// Automatic decay (hunger, thirst, energy)
export function decayStats() {
  player.hunger = Math.max(0, player.hunger - 1);
  player.thirst = Math.max(0, player.thirst - 2);
  player.energy = Math.max(0, player.energy - 1);


}

// XP and money
export function gainXP(amount) {
  player.xp += amount;
  if (player.xp >= player.xpMax) {
    player.xp -= player.xpMax;
    player.level++;
    player.xpMax = Math.floor(player.xpMax * 1.5);
  }

}

export function earnMoney(amount) {
  player.money += amount;

}
