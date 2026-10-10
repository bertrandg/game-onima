// Tableau des scores stocké dans le navigateur (localStorage)
const KEY = 'onima.scores.v1';
const NAME_KEY = 'onima.name';

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function loadScores() {
  return read().sort((a, b) => b.score - a.score);
}

export function addScore(name, score) {
  const list = read();
  const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, score, date: Date.now() };
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const kept = list.slice(0, 50);
  try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* stockage indisponible */ }
  const rank = list.findIndex((e) => e.id === entry.id) + 1;
  return { entry, rank };
}

export function bestFor(name) {
  return read().filter((e) => e.name === name).reduce((m, e) => Math.max(m, e.score), 0);
}

export function getName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

export function setName(n) {
  try { localStorage.setItem(NAME_KEY, n); } catch { /* stockage indisponible */ }
}
