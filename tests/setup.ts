// Ensure localStorage is functional across Node versions (including Node 26 experimental localStorage)
const store = new Map<string, string>();
const mockStorage: Storage = {
  get length() { return store.size; },
  clear: () => store.clear(),
  getItem: (key: string) => store.get(key) ?? null,
  key: (index: number) => Array.from(store.keys())[index] ?? null,
  removeItem: (key: string) => { store.delete(key); },
  setItem: (key: string, value: string) => { store.set(key, String(value)); }
};

try {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true
  });
} catch {
  // Ignore if non-configurable
}

if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  } catch {
    // Ignore if non-configurable
  }
}
