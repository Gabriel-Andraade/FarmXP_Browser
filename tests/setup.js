globalThis.window ??= {};
globalThis.document ??= {};
globalThis.localStorage ??= {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
  clear() {}
};
