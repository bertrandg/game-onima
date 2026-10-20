// Chaque niveau se charge et se joue 700 m (joueur invincible) sans erreur ni fichier manquant, et
// reste dans ses budgets de performance : nombre d'appels de dessin et de triangles par image (maximum relevé sur
// 600 m de course), et mémoire graphique stable dans la durée (pas de fuite de géométries/textures).
// Les budgets sont environ 15 % au-dessus des valeurs mesurées en octobre 2026 : un dépassement
// signale un décor ou un effet devenu trop lourd pour les téléphones. À relever en connaissance de cause.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser, startLevel, runUntil } from '../helpers/game.mjs';

const BUDGET = {
  japon: { calls: 185, triangles: 860000 },
  paris: { calls: 190, triangles: 650000 },
  newyork: { calls: 265, triangles: 870000 },
  'newyork (égouts)': { calls: 235, triangles: 830000 },
};

let B;
before(async () => { B = await openBrowser(); });
after(async () => { await B?.close(); });

// relevé à chaque image du maximum, tant que active() est vrai
const startProbe = (page) => page.evaluate(() => {
  const o = window.__onima, max = (window.__max = { calls: 0, triangles: 0, frames: 0, on: true });
  const tick = () => {
    if (max.on) {
      const r = o.renderer.info.render;
      max.calls = Math.max(max.calls, r.calls);
      max.triangles = Math.max(max.triangles, r.triangles);
      max.frames++;
    }
    requestAnimationFrame(tick);
  };
  tick();
});
const readProbe = (page) => page.evaluate(() => { const m = { ...window.__max }; window.__max.on = false; return m; });
const memory = (page) => page.evaluate(() => ({ ...window.__onima.renderer.info.memory }));
const within = (name, got) => {
  const b = BUDGET[name];
  assert.ok(got.frames > 30, `${name} : seulement ${got.frames} images mesurées`);
  assert.ok(got.calls <= b.calls, `${name} : ${got.calls} appels de dessin (budget ${b.calls})`);
  assert.ok(got.triangles <= b.triangles, `${name} : ${got.triangles} triangles (budget ${b.triangles})`);
};

for (const id of ['japon', 'paris', 'newyork']) {
  test(`${id} : se joue sans erreur, dans le budget de dessin, sans fuite de mémoire graphique`, async () => {
    const { page, ctx, problems } = await startLevel(B.browser, B.server, id, { invincible: true });
    try {
      // la rue seule (à New York, pas de bouche ouverte pendant la mesure)
      await page.evaluate(() => { const ob = window.__onima.obstacles; if ('nextHole' in ob) ob.nextHole = -1e9; });
      await runUntil(page, 100);
      assert.ok(await page.evaluate(() => window.__onima.obstacles.list.length > 0), 'des obstacles sont générés');
      const m0 = await memory(page);
      await startProbe(page);
      await runUntil(page, 700, 180000);
      within(id, await readProbe(page));
      const m1 = await memory(page);
      assert.ok(m1.geometries <= m0.geometries + 15, `géométries : ${m0.geometries} → ${m1.geometries}`);
      assert.ok(m1.textures <= m0.textures + 2, `textures : ${m0.textures} → ${m1.textures}`);

      if (id === 'newyork') {
        await page.evaluate(() => { window.__t.clearAhead(); window.__t.press('ArrowLeft'); });
        await page.waitForFunction(() => Math.abs(window.__onima.player.x + 2.6) < 0.05);
        await page.evaluate(() => {
          const o = window.__onima, ob = o.obstacles;
          ob.addHole(0, o.player.z - 30, true);
          ob.nextLadder = o.player.z - 1e6;   // on reste en bas pendant la mesure
          ob.sCursor = o.player.z - 60;
        });
        await page.waitForFunction(() => window.__onima.player.under, null, { timeout: 30000 });
        const d = await page.evaluate(() => window.__onima.dist);
        await startProbe(page);
        await runUntil(page, d + 150, 120000);
        assert.ok(await page.evaluate(() => window.__onima.player.under), 'toujours dans les égouts');
        within('newyork (égouts)', await readProbe(page));
      }
      assert.deepEqual(problems, []);
    } finally {
      await ctx.close();
    }
  });
}
