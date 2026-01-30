// Test environment setup - stubs for browser globals

globalThis.window ??= {};

// Enhanced DOM stubs to prevent errors when production code accesses these
const mockElement = (tag = 'div') => ({
  style: {},
  children: [],
  childNodes: [],
  tagName: tag.toUpperCase(),
  className: '',
  id: '',
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
  classList: {
    add: () => {},
    remove: () => {},
    toggle: () => {},
    contains: () => false
  },
  setAttribute: () => {},
  getAttribute: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  contains: () => false,
  getBoundingClientRect: () => ({ 
    top: 0, left: 0, bottom: 0, right: 0, 
    width: 0, height: 0, x: 0, y: 0 
  }),
  getContext: (contextType) => ({
    fillStyle: '',
    fillRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray() })
  })
});

globalThis.document ??= {
  getElementById: (id) => mockElement('div'),
  createElement: (tag) => mockElement(tag),
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
  head: { appendChild: () => {}, children: [] },
  body: { appendChild: () => {}, children: [] },
  querySelector: () => mockElement(),
  querySelectorAll: () => [mockElement()],
  documentElement: mockElement('html'),
  readyState: 'complete'
};

// Add window methods that production code might use
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
  setTimeout(callback, 16); // ~60fps
  return 1;
};

globalThis.window.cancelAnimationFrame = () => {};

globalThis.window.addEventListener = () => {};
globalThis.window.removeEventListener = () => {};

globalThis.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
    this.bubbles = options?.bubbles ?? false;
    this.cancelable = options?.cancelable ?? false;
  }
};

globalThis.localStorage ??= {
  _data: {},
  getItem(key) { return this._data[key] ?? null; },
  setItem(key, value) { this._data[key] = String(value); },
  removeItem(key) { delete this._data[key]; },
  clear() { this._data = {}; }
};

// Reset localStorage between tests
globalThis.resetTestEnvironment = () => {
  globalThis.localStorage._data = {};
};
