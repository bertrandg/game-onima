// Tableaux des scores stockés dans le navigateur (localStorage), un par niveau.
// Le niveau 1 garde la clé d'origine pour conserver les scores existants.
const NAME_KEY = 'onima.name';
const LEVEL_KEY = 'onima.level';
const keyFor = (level = 'japon') => (level === 'japon' ? 'onima.scores.v1' : `onima.scores.${level}.v1`);

function read(level) {
  try {
    const v = JSON.parse(localStorage.getItem(keyFor(level)));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function loadScores(level) {
  return read(level).sort((a, b) => b.score - a.score);
}

export function addScore(level, name, score) {
  const list = read(level);
  const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, score, date: Date.now() };
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const kept = list.slice(0, 50);
  try { localStorage.setItem(keyFor(level), JSON.stringify(kept)); } catch { /* stockage indisponible */ }
  const rank = list.findIndex((e) => e.id === entry.id) + 1;
  return { entry, rank };
}

// meilleur score d'un joueur sur un niveau
export function bestFor(level, name) {
  return read(level).filter((e) => e.name === name).reduce((m, e) => Math.max(m, e.score), 0);
}

// meilleur score tous joueurs confondus sur cet appareil (sert au déblocage des niveaux)
export function bestOnLevel(level) {
  return read(level).reduce((m, e) => Math.max(m, e.score), 0);
}

export function getName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

export function setName(n) {
  try { localStorage.setItem(NAME_KEY, n); } catch { /* stockage indisponible */ }
}

export function getLevel() {
  try { return localStorage.getItem(LEVEL_KEY) || 'japon'; } catch { return 'japon'; }
}

// code secret de l'écran d'accueil : tous les niveaux débloqués
const ALL_KEY = 'onima.unlockAll';
export function allUnlocked() {
  try { return localStorage.getItem(ALL_KEY) === '1'; } catch { return false; }
}
export function setAllUnlocked() {
  try { localStorage.setItem(ALL_KEY, '1'); } catch { /* stockage indisponible */ }
}

export function setLevel(id) {
  try { localStorage.setItem(LEVEL_KEY, id); } catch { /* stockage indisponible */ }
}
