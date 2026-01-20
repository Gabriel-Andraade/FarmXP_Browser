export const cssManager = {
  basePath: "./style/",
  version: "1.0.0",
  files: [
    "base.css",
    "modals.css",
    //"hud.css",
    "player-panel.css",
    "game.css",
    "character-select.css",
    "house.css",
    "commerce.css",
    "config.css",
  ],
  loadOne(file) {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = `${this.basePath}${file}?v=${this.version}`;
      link.onload = () => resolve(file);
      link.onerror = () => reject(new Error(`Falha ao carregar: ${file}`));
      document.head.appendChild(link);
    });
  },
  async loadAll() {
    for (const file of this.files) {
      await this.loadOne(file);
    }
  },
};
