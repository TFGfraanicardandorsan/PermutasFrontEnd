import '@testing-library/jest-dom/vitest';

// Node >= 25 expone un `localStorage` global experimental que, sin --localstorage-file,
// no implementa la API Storage y oculta el de jsdom. Lo sustituimos por uno en memoria.
const crearStorage = () => {
  let datos = new Map();
  return {
    get length() { return datos.size; },
    key: (i) => [...datos.keys()][i] ?? null,
    getItem: (k) => (datos.has(String(k)) ? datos.get(String(k)) : null),
    setItem: (k, v) => { datos.set(String(k), String(v)); },
    removeItem: (k) => { datos.delete(String(k)); },
    clear: () => { datos = new Map(); },
  };
};

for (const nombre of ['localStorage', 'sessionStorage']) {
  if (typeof globalThis[nombre]?.getItem !== 'function') {
    Object.defineProperty(globalThis, nombre, { value: crearStorage(), configurable: true, writable: true });
  }
}
