// Environnement minimal pour charger les modules du jeu dans Node : faux localStorage, faux document
// (les textures dessinées sur canvas deviennent des dessins « à vide ») et hasard reproductible.

// localStorage en mémoire ; storage.broken = true simule un stockage refusé (navigation privée…)
export const storage = {
  data: new Map(),
  broken: false,
  getItem(k) { if (this.broken) throw new Error('stockage refusé'); return this.data.has(k) ? this.data.get(k) : null; },
  setItem(k, v) { if (this.broken) throw new Error('stockage refusé'); this.data.set(k, String(v)); },
  removeItem(k) { this.data.delete(k); },
  clear() { this.data.clear(); this.broken = false; },
};
globalThis.localStorage = storage;

// contexte 2D qui accepte tout : chaque méthode renvoie encore un objet qui accepte tout
const anything = () => new Proxy(function () {}, {
  get(t, k) {
    if (k in t) return t[k];
    if (k === Symbol.toPrimitive) return () => 0;
    return (t[k] = anything());
  },
  set(t, k, v) { t[k] = v; return true; },
  apply() { return anything(); },
});
const element = (tag) => ({
  tagName: tag.toUpperCase(), width: 300, height: 150, style: {}, className: '', parentNode: null,
  getContext: () => anything(),
  appendChild() {}, insertBefore() {}, addEventListener() {}, setAttribute() {},
  classList: { add() {}, remove() {}, toggle() {} },
});
if (!globalThis.document) {
  globalThis.document = {
    createElement: element,
    createElementNS: (ns, tag) => element(tag),
    getElementById: () => null,
    body: element('body'),
  };
}

// Math.random rejouable : même graine, même partie générée
export function seed(s) {
  let a = s >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// fetch des fichiers locaux (le kit de New York est chargé au démarrage du module)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const netFetch = globalThis.fetch;
globalThis.fetch = async (url, ...rest) => {
  const u = String(url);
  if (!u.startsWith('file:')) return netFetch(url, ...rest);
  const buf = await readFile(fileURLToPath(u));
  return new Response(buf);
};
