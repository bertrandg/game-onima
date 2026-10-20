// Test de fumée : chaque niveau se charge et se joue un moment dans un vrai navigateur (joueur rendu
// invincible), sans erreur ni fichier manquant.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser, startLevel, runUntil } from '../helpers/game.mjs';

let B;
before(async () => { B = await openBrowser(); });
after(async () => { await B?.close(); });

for (const id of ['japon', 'paris', 'newyork']) {
  test(`${id} : se charge et se joue sans erreur`, async () => {
    const { page, ctx, problems } = await startLevel(B.browser, B.server, id, { invincible: true });
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
