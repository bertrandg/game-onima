// Chaque niveau se charge et se joue 700 m (joueur invincible) sans erreur ni fichier manquant, et
// reste dans ses budgets de performance : nombre d'appels de dessin et de triangles par image (maximum relevé sur
// 600 m de course), et mémoire graphique stable dans la durée (pas de fuite de géométries/textures).
// Les budgets sont environ 15 % au-dessus des valeurs mesurées (octobre 2026 ; Égypte et Hong Kong en novembre 2026) : un dépassement
// signale un décor ou un effet devenu trop lourd pour les téléphones. À relever en connaissance de cause.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser, startLevel, runUntil } from '../helpers/game.mjs';

const BUDGET = {
  japon: { calls: 185, triangles: 860000 },
  paris: { calls: 190, triangles: 800000 },   // relevé en novembre 2026 : vitrines, platanes, cagettes, rive d'en face continue
  newyork: { calls: 265, triangles: 870000 },
  'newyork (égouts)': { calls: 235, triangles: 830000 },
  egypte: { calls: 205, triangles: 820000 },
  'egypte (tombeau)': { calls: 215, triangles: 900000 },   // maximum relevé pendant la chute (deux étages affichés)
  hongkong: { calls: 240, triangles: 740000 },
  'hongkong (passerelles)': { calls: 235, triangles: 570000 },
  mall: { calls: 270, triangles: 1000000 },   // relevé en novembre 2026 en montant les six étages (deux ou trois étages affichés près des escalators) ; façades détaillées : jusqu'à 915 000
};
// autre étage : voie où poser l'ouverture (New York : bouches sur les côtés seulement), ou passerelle au-dessus
const BELOW = { newyork: { name: 'newyork (égouts)', lane: 0 }, egypte: { name: 'egypte (tombeau)', lane: 1 }, hongkong: { name: 'hongkong (passerelles)', above: true } };

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

for (const id of ['japon', 'paris', 'newyork', 'egypte', 'hongkong', 'mall']) {
  test(`${id} : se joue sans erreur, dans le budget de dessin, sans fuite de mémoire graphique`, async () => {
    const { page, ctx, problems } = await startLevel(B.browser, B.server, id, { invincible: true });
    try {
      // la rue seule (pas de passage à l'étage du dessous pendant la mesure)
      await page.evaluate(() => { const ob = window.__onima.obstacles; if ('nextHole' in ob) ob.nextHole = -1e9; });
      await runUntil(page, 100);
      assert.ok(await page.evaluate(() => window.__onima.obstacles.list.length > 0), 'des obstacles sont générés');
      const m0 = await memory(page);
      await startProbe(page);
      await runUntil(page, 700, 180000);
      within(id, await readProbe(page));
      const m1 = await memory(page);
      // le nombre varie de ±20 selon le parcours tiré ; une fuite d'une géométrie par tranche de décor en ajouterait plus
      assert.ok(m1.geometries <= m0.geometries + 25, `géométries : ${m0.geometries} → ${m1.geometries}`);
      assert.ok(m1.textures <= m0.textures + 2, `textures : ${m0.textures} → ${m1.textures}`);

      const below = BELOW[id];
      if (below) {
        await page.evaluate(() => window.__t.clearAhead());
        if (below.above) {
          await page.evaluate(() => {
            const o = window.__onima, ob = o.obstacles, z = o.player.z;
            ob.nextSection = z - 1e6;
            ob.addRamp(1, z - 30);
            ob.addSection(z - 48, 240);
            ob.uCursor = z - 60;
            ob.addGap = () => null;   // on reste là-haut pendant la mesure (obstacles d'en haut, mais pas de trou)
          });
        } else if (below.lane === 0) {
          await page.evaluate(() => window.__t.press('ArrowLeft'));
          await page.waitForFunction(() => Math.abs(window.__onima.player.x + 2.6) < 0.05);
        }
        if (!below.above) await page.evaluate((lane) => {
          const o = window.__onima, ob = o.obstacles;
          ob.addHole(lane, o.player.z - 30, true);
          ob.nextLadder = ob.nextStair = o.player.z - 1e6;   // on reste en bas pendant la mesure
          ob.sCursor = o.player.z - 60;
        }, below.lane);
        await page.waitForFunction(() => window.__onima.player.under, null, { timeout: 30000 });
        const d = await page.evaluate(() => window.__onima.dist);
        await startProbe(page);
        await runUntil(page, d + 150, 120000);
        assert.ok(await page.evaluate(() => window.__onima.player.under), 'toujours à l\'autre étage');
        within(below.name, await readProbe(page));
      }
      assert.deepEqual(problems, []);
    } finally {
      await ctx.close();
    }
  });
}
