// Vérifications statiques : tous les imports pointent vers un fichier existant, et leurs noms passent
// le versionnement du déploiement (sinon le navigateur garde l'ancienne version en cache).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const JS = walk(join(ROOT, 'js')).filter((f) => f.endsWith('.js'));
// même motif que dans .github/workflows/pages.yml
const VERSIONED = /^\.{1,2}\/[a-z./]+\.js$/;
const IMPORT = /(?:from\s+|import\s*\(\s*)'([^']+)'/g;

const imports = JS.flatMap((file) => [...readFileSync(file, 'utf8').matchAll(IMPORT)].map((m) => ({ file, spec: m[1] })));

test('les modules du jeu sont trouvés', () => {
  assert.ok(JS.length > 20, `${JS.length} modules`);
  assert.ok(imports.length > 50, `${imports.length} imports`);
});

test('chaque import relatif pointe vers un fichier existant', () => {
  const missing = imports.filter(({ file, spec }) => spec.startsWith('.') && !existsSync(resolve(dirname(file), spec)));
  assert.deepEqual(missing.map(({ file, spec }) => `${relative(ROOT, file)} → ${spec}`), []);
});

test('chaque import relatif sera versionné au déploiement (minuscules, sans chiffre ni tiret)', () => {
  const bad = imports.filter(({ spec }) => spec.startsWith('.') && !VERSIONED.test(spec));
  assert.deepEqual(bad.map(({ file, spec }) => `${relative(ROOT, file)} → ${spec}`), []);
});

test('les seuls imports externes sont three et ses modules complémentaires', () => {
  const bad = imports.filter(({ spec }) => !spec.startsWith('.') && spec !== 'three' && !spec.startsWith('three/addons/'));
  assert.deepEqual(bad.map(({ file, spec }) => `${relative(ROOT, file)} → ${spec}`), []);
});

test('les tests utilisent la même version de three que le jeu', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const cdn = html.match(/three@([\d.]+)\/build/)[1];
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.devDependencies.three, cdn);
});

test('les fichiers référencés par la page existent', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]).filter((r) => !r.startsWith('//'));
  assert.ok(refs.includes('js/main.js'));
  assert.deepEqual(refs.filter((r) => !existsSync(join(ROOT, r))), []);
});

test('aucun fichier de modèle ou d\'image ne dépasse 1,5 Mo', () => {
  const big = [...walk(join(ROOT, 'models')), ...walk(join(ROOT, 'img'))]
    .filter((f) => statSync(f).size > 1.5 * 1024 * 1024)
    .map((f) => `${relative(ROOT, f)} : ${(statSync(f).size / 1048576).toFixed(1)} Mo`);
  assert.deepEqual(big, []);
});
