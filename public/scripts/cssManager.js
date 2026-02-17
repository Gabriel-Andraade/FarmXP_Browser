/**
 * @file cssManager.js - Optional CSS loader
 *
 * Source of truth for core styles is: public/index.html via <link>.
 * This module is kept ONLY for rare cases where you want to lazily load
 * an extra stylesheet at runtime (feature-gated CSS).
 */
export const cssManager = {
  basePath: "./style/",
  version: "1.0.0",

  /**
   * Keep empty to avoid duplicate loads, since index.html already loads CSS.
   */
  files: [],

  /**
   * Loads a single CSS file dynamically (idempotent).
   * If the same stylesheet (same pathname) is already present, it resolves immediately.
   *
   * @param {string} file - CSS filename (e.g. "custom.css")
   * @returns {Promise<string>}
   */
  loadOne(file) {
    return new Promise((resolve, reject) => {
      try {
        const target = new URL(`${this.basePath}${file}`, document.baseURI);
        const targetPath = target.pathname;

        // Avoid duplicates even if existing link has no ?v= or a different query.
        const alreadyLoaded = Array.from(
          document.querySelectorAll('link[rel="stylesheet"]')
        ).some((l) => {
          try {
            return new URL(l.href, document.baseURI).pathname === targetPath;
          } catch {
            return false;
          }
        });

        if (alreadyLoaded) {
          resolve(file);
          return;
        }

        const hrefWithVersion = new URL(target.href);
        hrefWithVersion.searchParams.set("v", this.version);

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = hrefWithVersion.toString();

        link.onload = () => resolve(file);
        link.onerror = () => { link.remove(); reject(new Error(`Failed to load: ${file}`)); };

        document.head.appendChild(link);
      } catch (e) {
        reject(e);
      }
    });
  },

  /**
   * Loads all files listed in `files`.
   * By default, this is a no-op (files is empty).
   *
   * @returns {Promise<void>}
   */
  async loadAll() {
    if (!this.files || this.files.length === 0) return;
    await Promise.all(this.files.map((file) => this.loadOne(file)));
  },
};
