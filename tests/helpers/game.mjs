// Pilotage du jeu dans Chrome pour les tests (page ouverte avec #debug, qui expose window.__onima)
import { chromium } from 'playwright-core';
import { serve } from './server.mjs';

// Chrome installé sur la machine ; en CI, rendu WebGL logiciel (pas de carte graphique)
const ARGS = process.env.CI
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];

export async function openBrowser() {
  const server = await serve();
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ARGS });
  return { server, browser, close: async () => { await browser.close(); server.close(); } };
}

// Outils injectés dans la page : vider la route devant le joueur, appuyer sur une touche au bon moment
function pageTools() {
  const o = () => window.__onima;
  const T = {
    press(key) { window.dispatchEvent(new KeyboardEvent('keydown', { key })); },
    // supprime tout ce qui est devant le joueur (rue, égouts, malus) et repousse la suite à `free` mètres
    clearAhead(free = 120) {
      const { obstacles: ob, candies: c, player: p } = o();
      for (const x of ob.list) if (x.mesh) ob.scene.remove(x.mesh);
      ob.list = [];
      ob.reserve = null;
      ob.cursor = p.z - free;
      ob.busy = [p.z, p.z, p.z];
      if (ob.sList) {
        for (const x of ob.sList) if (x.mesh) ob.sewer.remove(x.mesh);
        ob.sList = [];
        ob.sCursor = p.z - free;
        ob.sBusy = [p.z, p.z, p.z];
        ob.nextHole = p.z - 1e6;
        ob.nextLadder = p.z - 1e6;
      }
      for (const f of c.fugus) c.scene.remove(f.mesh);
      c.fugus = [];
    },
    // appuie sur `key` à la première image où cond() est vraie ; renvoie une promesse
    when(cond, key) {
      return new Promise((ok) => {
        const tick = () => { if (cond(o())) { if (key) T.press(key); ok(true); } else requestAnimationFrame(tick); };
        tick();
      });
    },
  };
  window.__t = T;
}

export async function startLevel(browser, server, id, { invincible = false, unlockAll = true, storage = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage();
  const problems = [], logs = [];
  page.on('console', (m) => logs.push(`${m.type()} : ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`erreur : ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console : ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`échec réseau : ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} : ${r.url()}`); });
  await page.addInitScript(({ level, unlockAll, storage }) => {
    if (sessionStorage.getItem('init')) return;   // une seule fois (pas à chaque rechargement)
    sessionStorage.setItem('init', '1');
    localStorage.setItem('onima.level', level);
    localStorage.setItem('onima.name', 'Test');
    if (unlockAll) localStorage.setItem('onima.unlockAll', '1');
    for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
  }, { level: id, unlockAll, storage });
  await page.addInitScript(pageTools);
  await page.goto(`${server.url}/#debug`);
  try {
    await page.waitForFunction((level) => window.__onima && window.__onima.level === level, id, { timeout: 90000 });
  } catch (e) {
    // sans ces détails, un échec en CI serait incompréhensible
    const gl = await page.evaluate(() => {
      const c = document.createElement('canvas').getContext('webgl2');
      return c ? c.getParameter(c.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? c.RENDERER) : 'aucun WebGL2';
    }).catch((x) => String(x));
    throw new Error(`${id} ne se charge pas (${e.message})\nWebGL : ${gl}\n${[...problems, ...logs].join('\n')}`);
  }
  await page.click('#btn-play');
  await page.waitForFunction(() => window.__onima.state === 'running');
  if (invincible) {
    await page.evaluate(() => {
      const o = window.__onima;
      const resolve = o.obstacles.resolve.bind(o.obstacles);
      o.obstacles.resolve = (p) => ({ ...resolve(p), crash: null });
      o.candies.hitFugu = () => null;
    });
  }
  return { page, ctx, problems };
}

export const runUntil = (page, meters, timeout = 90000) =>
  page.waitForFunction((m) => window.__onima.dist >= m, meters, { timeout, polling: 100 });

export const state = (page) => page.evaluate(() => {
  const o = window.__onima, p = o.player;
  return { state: o.state, dist: o.dist, lane: p.lane, x: p.x, y: p.y, z: p.z, under: p.under, grounded: p.grounded, candies: o.candyCount };
});
