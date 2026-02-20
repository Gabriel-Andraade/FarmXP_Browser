// Test environment setup - stubs for browser globals
import { afterAll, mock } from "bun:test";

// ==============================
// Simple EventTarget helpers
// ==============================
function createListenerMap() {
  return new Map();
}

function addListener(map, type, cb) {
  if (!cb) return;
  const list = map.get(type) ?? [];
  list.push(cb);
  map.set(type, list);
}

function removeListener(map, type, cb) {
  const list = map.get(type);
  if (!list) return;
  map.set(type, list.filter(fn => fn !== cb));
}

function dispatchTo(map, target, event) {
  const list = map.get(event?.type);
  if (!list || list.length === 0) return true;

  for (const fn of [...list]) {
    try { fn.call(target, event); } catch (e) {
      console.error('Error in event listener:', e);
    }
  }
  return !event?.defaultPrevented;
}

// IMPORTANT: avoid mock.module leakage across test files
afterAll(() => {
  try { mock.restore(); } catch {}
});

// ==============================
// Globals
// ==============================
globalThis.window ??= {};

globalThis.performance ??= {
  now: () => Date.now()
};

// Enhanced DOM stubs to prevent errors when production code accesses these
const mockElement = (tag = "div") => {
  const _listeners = createListenerMap();

  return {
    _listeners,
    style: {},
    children: [],
    childNodes: [],
    tagName: tag.toUpperCase(),
    className: "",
    id: "",
    innerHTML: "",
    textContent: "",
    src: "",
    alt: "",
    dataset: {},

    appendChild(child) {
      this.children.push(child);
      this.childNodes.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter(c => c !== child);
      this.childNodes = this.childNodes.filter(c => c !== child);
      return child;
    },
    remove() {},

    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    },

    setAttribute: () => {},
    getAttribute: () => null,

    addEventListener(type, cb) { addListener(_listeners, type, cb); },
    removeEventListener(type, cb) { removeListener(_listeners, type, cb); },
    dispatchEvent(event) { return dispatchTo(_listeners, this, event); },

    querySelector: () => mockElement(),
    querySelectorAll: () => [],
    contains: () => false,

    getBoundingClientRect: () => ({
      top: 0, left: 0, bottom: 0, right: 0,
      width: 0, height: 0, x: 0, y: 0
    }),

    getContext: () => ({
      fillStyle: "",
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray() })
    })
  };
};

const _documentListeners = createListenerMap();

globalThis.document ??= {
  _listeners: _documentListeners,

  getElementById: () => mockElement("div"),
  createElement: (tag) => mockElement(tag),

  addEventListener(type, cb) { addListener(_documentListeners, type, cb); },
  removeEventListener(type, cb) { removeListener(_documentListeners, type, cb); },
  dispatchEvent(event) { return dispatchTo(_documentListeners, this, event); },

  head: { appendChild: () => {}, children: [] },
  body: {
    appendChild: () => {},
    children: [],
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }
  },

  querySelector: () => mockElement(),
  querySelectorAll: () => [mockElement()],
  documentElement: mockElement("html"),
  readyState: "complete"
};

// Stub window.location for logger.js and other modules that check hostname
globalThis.window.location ??= {
  hostname: "localhost",
  href: "http://localhost/",
  origin: "http://localhost",
  pathname: "/",
  search: "",
  hash: ""
};

const _windowListeners = createListenerMap();

globalThis.window.addEventListener = (type, cb) => addListener(_windowListeners, type, cb);
globalThis.window.removeEventListener = (type, cb) => removeListener(_windowListeners, type, cb);
globalThis.window.dispatchEvent = (event) => dispatchTo(_windowListeners, globalThis.window, event);

globalThis.window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true
});

globalThis.window.requestAnimationFrame = (callback) => {
  const id = setTimeout(() => callback(performance.now()), 16);
  return id;
};

globalThis.window.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

globalThis.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
    this.bubbles = options?.bubbles ?? false;
    this.cancelable = options?.cancelable ?? false;
    this.defaultPrevented = false;
  }
  preventDefault() { this.defaultPrevented = true; }
};

globalThis.localStorage ??= {
  _data: {},
  getItem(key) { return this._data[key] ?? null; },
  setItem(key, value) { this._data[key] = String(value); },
  removeItem(key) { delete this._data[key]; },
  clear() { this._data = {}; }
};

// Reset localStorage + listeners between tests (call manually if needed)
globalThis.resetTestEnvironment = () => {
  globalThis.localStorage._data = {};
  _documentListeners.clear();
  _windowListeners.clear();
};
