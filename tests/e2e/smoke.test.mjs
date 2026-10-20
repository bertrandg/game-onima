// Test de fumée : chaque niveau se charge et se joue une vingtaine de secondes dans un vrai navigateur
// (joueur rendu invincible), sans erreur ni fichier manquant. À New York, on passe aussi par les égouts.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { serve } from '../helpers/server.mjs';

// Chrome installé sur la machine ; en CI, rendu WebGL logiciel (pas de carte graphique)
const ARGS = process.env.CI
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];

let server, browser;
before(async () => {
  server = await serve();
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ARGS });
});
after(async () => {
  await browser?.close();
  server?.close();
});

async function startLevel(id) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`erreur : ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console : ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`échec réseau : ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} : ${r.url()}`); });
  await page.addInitScript((level) => {
    localStorage.setItem('onima.level', level);
    localStorage.setItem('onima.unlockAll', '1');
    localStorage.setItem('onima.name', 'Test');
  }, id);
  await page.goto(`${server.url}/#debug`);
  await page.waitForFunction((level) => window.__onima && window.__onima.level === level, id, { timeout: 60000 });
  await page.click('#btn-play');
  await page.waitForFunction(() => window.__onima.state === 'running');
  // invincible : on veut vérifier que tout s'affiche et tourne, pas savoir jouer
  await page.evaluate(() => {
    const o = window.__onima;
    const resolve = o.obstacles.resolve.bind(o.obstacles);
    o.obstacles.resolve = (p) => ({ ...resolve(p), crash: null });
    o.candies.hitFugu = () => null;
  });
  return { page, ctx, problems };
}

const runUntil = (page, meters, timeout = 60000) =>
  page.waitForFunction((m) => window.__onima.dist >= m, meters, { timeout, polling: 250 });

for (const id of ['japon', 'paris', 'newyork']) {
  test(`${id} : se charge et se joue sans erreur`, async () => {
    const { page, ctx, problems } = await startLevel(id);
    try {
      await runUntil(page, 150);
      const info = await page.evaluate(() => {
        const o = window.__onima, r = o.renderer.info.render;
        return { state: o.state, calls: r.calls, triangles: r.triangles, obstacles: o.obstacles.list.length };
      });
      assert.equal(info.state, 'running');
      assert.ok(info.obstacles > 0, 'des obstacles sont générés');
      assert.ok(info.calls > 0 && info.triangles > 0, 'la scène est dessinée');
      assert.deepEqual(problems, []);
    } finally {
      await ctx.close();
    }
  });
}

test('newyork : chute dans une bouche d\'égout puis course dans les égouts', async () => {
  const { page, ctx, problems } = await startLevel('newyork');
  try {
    await runUntil(page, 30);
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => window.__onima.player.lane === 0 && Math.abs(window.__onima.player.x + 2.6) < 0.05);
    // bouche ouverte posée juste devant le joueur, dans sa voie
    await page.evaluate(() => { const o = window.__onima; o.obstacles.addHole(0, o.player.z - 25, true); });
    await page.waitForFunction(() => window.__onima.player.under === true, null, { timeout: 30000 });
    const start = await page.evaluate(() => window.__onima.dist);
    await runUntil(page, start + 60);
    const st = await page.evaluate(() => ({ state: window.__onima.state, y: window.__onima.player.y }));
    assert.equal(st.state, 'running');
    assert.ok(st.y < -5, `joueur dans les égouts (y = ${st.y.toFixed(1)})`);
    assert.deepEqual(problems, []);
  } finally {
    await ctx.close();
  }
});
