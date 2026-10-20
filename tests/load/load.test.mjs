// Test de chargement (lancé par la CI avant chaque mise en ligne) : chaque niveau s'ouvre et démarre sans
// erreur ni fichier manquant. Le rendu logiciel de la CI est trop lent pour jouer : les parcours et les
// budgets de performance (tests/e2e) se lancent sur une machine avec carte graphique.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser, startLevel, runUntil } from '../helpers/game.mjs';

let B;
before(async () => { B = await openBrowser(); });
after(async () => { await B?.close(); });

for (const id of ['japon', 'paris', 'newyork']) {
  test(`${id} : se charge et démarre sans erreur`, async () => {
    const { page, ctx, problems } = await startLevel(B.browser, B.server, id, { invincible: true });
    try {
      await runUntil(page, 5, 180000);
      const info = await page.evaluate(() => ({ state: window.__onima.state, obstacles: window.__onima.obstacles.list.length }));
      assert.equal(info.state, 'running');
      assert.ok(info.obstacles > 0, 'des obstacles sont générés');
      assert.deepEqual(problems, []);
    } finally {
      await ctx.close();
    }
  });
}
