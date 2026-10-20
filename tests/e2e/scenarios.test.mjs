// Parcours scénarisés : la vraie partie, sans invincibilité. La route devant le joueur est vidée puis on
// y pose exactement les obstacles voulus ; les touches sont envoyées depuis la page, à l'image près.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser, startLevel, restart, runUntil, state } from '../helpers/game.mjs';

let B;
const sessions = new Map();
before(async () => { B = await openBrowser(); });
after(async () => {
  for (const s of sessions.values()) await s.ctx.close();
  await B?.close();
});

// Chaque niveau n'est chargé qu'une fois : les scénarios suivants relancent une partie dans la même page.
// fn(page) joue le scénario, après un départ de 20 m et une route vidée devant le joueur.
async function scenario(id, fn, opts) {
  const key = opts ? `${id} ${JSON.stringify(opts)}` : id;
  let s = sessions.get(key);
  if (!s) sessions.set(key, (s = await startLevel(B.browser, B.server, id, opts)));
  else await restart(s.page);
  await runUntil(s.page, 20);
  await s.page.evaluate(() => window.__t.clearAhead());
  await fn(s.page);
  assert.deepEqual(s.problems, []);
}
// pose un obstacle à `ahead` mètres devant le joueur ; renvoie son z le plus proche
const put = (page, code, ahead = 40) => page.evaluate(([code, ahead]) => {
  const o = window.__onima, ob = o.obstacles, z = o.player.z - ahead;
  new Function('o', 'ob', 'z', code)(o, ob, z);
  return z;
}, [code, ahead]);
// attend que le joueur ait dépassé z de `margin` mètres (ou soit mort)
const passed = (page, z, margin = 6) => page.waitForFunction(([z, m]) => {
  const o = window.__onima;
  return o.state !== 'running' || o.player.z < z - m;
}, [z, margin], { timeout: 60000, polling: 50 });
const dead = (page) => page.waitForFunction(() => window.__onima.state === 'over', null, { timeout: 30000 });

test('percuter une barrière : fin de partie, score affiché et enregistré', async () => {
  await scenario('japon', async (page) => {
    await put(page, "ob.addBarrier(1, z, 'low')");
    await dead(page);
    const r = await page.evaluate(() => ({
      over: !document.getElementById('screen-over').classList.contains('hidden'),
      shown: document.getElementById('over-score').textContent.replace(/\D/g, ''),
      saved: JSON.parse(localStorage.getItem('onima.scores.v1')),
    }));
    assert.ok(r.over, 'écran de fin affiché');
    assert.equal(r.saved.length, 1);
    assert.equal(r.saved[0].name, 'Test');
    assert.equal(String(r.saved[0].score), r.shown);
  });
});

test('sauter par-dessus une barrière basse', async () => {
  await scenario('japon', async (page) => {
    const z = await put(page, "ob.addBarrier(1, z, 'low')");
    await page.evaluate((z) => window.__t.when((o) => o.player.z - z < o.speed * 0.3, 'ArrowUp'), z);
    await passed(page, z);
    assert.equal((await state(page)).state, 'running');
  });
});

test('passer en roulade sous une barrière haute (et mourir sans roulade)', async () => {
  await scenario('paris', async (page) => {
    const z = await put(page, "ob.addBarrier(1, z, 'high')");
    await page.evaluate((z) => window.__t.when((o) => o.player.z - z < o.speed * 0.2, 'ArrowDown'), z);
    await passed(page, z);
    assert.equal((await state(page)).state, 'running');
    await put(page, "ob.addBarrier(1, z, 'high')", 30);
    await dead(page);
  });
});

test('changer de voie pour éviter un véhicule, puis monter sur un bus par la rampe', async () => {
  await scenario('newyork', async (page) => {
    const z = await put(page, 'ob.addTrain(1, z, 2, false, false)');
    await page.evaluate(() => window.__t.press('ArrowLeft'));
    await passed(page, z - 21);
    let s = await state(page);
    assert.equal(s.state, 'running');
    assert.equal(s.lane, 0);
    await page.evaluate(() => window.__t.clearAhead());
    const zr = await put(page, 'ob.addTrain(0, z, 1, true, false)', 30);
    // sur le toit, au-dessus de la rampe (7 m) et du bus
    await page.waitForFunction((z) => window.__onima.player.z < z - 10 || window.__onima.state !== 'running', zr, { timeout: 30000 });
    s = await state(page);
    assert.equal(s.state, 'running');
    assert.ok(s.y > 2, `sur le toit (y = ${s.y.toFixed(2)})`);
  });
});

test('ramasser une friandise ; toucher le malus fait perdre', async () => {
  await scenario('newyork', async (page) => {
    const before = (await state(page)).candies;
    const z = await put(page, 'o.candies.placeAt(0, 0.9, z, 1)', 30);
    await passed(page, z, 2);
    assert.equal((await state(page)).candies, before + 1);
    await put(page, 'o.candies.placeFugu(1, z, ob)', 30);
    await dead(page);
  });
});

test('pause : le jeu s\'arrête puis reprend', async () => {
  await scenario('japon', async (page) => {
    await page.evaluate(() => window.__t.press('Escape'));
    await page.waitForFunction(() => window.__onima.state === 'paused');
    const d0 = (await state(page)).dist;
    await page.waitForTimeout(500);
    assert.equal((await state(page)).dist, d0);
    await page.click('#btn-resume');
    await page.waitForFunction((d) => window.__onima.dist > d + 5, d0);
  });
});

test('New York : bouche d\'égout, traversée du canal en sautant, puis sortie par l\'échelle', async () => {
  await scenario('newyork', async (page) => {
    await page.evaluate(() => window.__t.press('ArrowLeft'));
    await page.waitForFunction(() => Math.abs(window.__onima.player.x + 2.6) < 0.05);
    await put(page, 'ob.addHole(0, z, true)', 30);
    await page.waitForFunction(() => window.__onima.player.under && window.__onima.player.grounded, null, { timeout: 30000 });
    await page.evaluate(() => window.__t.clearAhead());
    let s = await state(page);
    assert.ok(s.y < -6, 'dans les égouts');
    // saut puis changement de voie en l'air : on passe du quai gauche au quai droit d'un coup
    await page.evaluate(() => window.__t.press('ArrowUp'));
    await page.evaluate(() => window.__t.when((o) => o.player.vy > 0 && o.player.y > -6.5, 'ArrowRight'));
    await page.waitForFunction(() => window.__onima.player.grounded || window.__onima.state !== 'running', null, { timeout: 20000 });
    s = await state(page);
    assert.equal(s.state, 'running', 'pas tombé dans la boue');
    assert.equal(s.lane, 2);
    // échelle sur le quai droit : on saute à son pied pour remonter
    const z = await put(page, 'ob.addLadder(2, z)', 30);
    await page.evaluate((z) => window.__t.when((o) => o.player.z < z + 2 && o.player.grounded, 'ArrowUp'), z);
    await page.waitForFunction(() => !window.__onima.player.under || window.__onima.state !== 'running', null, { timeout: 20000 });
    await page.waitForFunction(() => window.__onima.player.grounded || window.__onima.state !== 'running', null, { timeout: 20000 });
    s = await state(page);
    assert.equal(s.state, 'running');
    assert.equal(s.under, false);
    assert.ok(s.y >= 0, `de retour dans la rue (y = ${s.y.toFixed(2)})`);
  });
});

test('New York : marcher dans la boue des égouts est mortel', async () => {
  await scenario('newyork', async (page) => {
    await page.evaluate(() => window.__t.press('ArrowLeft'));
    await page.waitForFunction(() => Math.abs(window.__onima.player.x + 2.6) < 0.05);
    await put(page, 'ob.addHole(0, z, true)', 30);
    await page.waitForFunction(() => window.__onima.player.under && window.__onima.player.grounded, null, { timeout: 30000 });
    await page.evaluate(() => { window.__t.clearAhead(); window.__t.press('ArrowRight'); });
    await dead(page);
    const s = await state(page);
    assert.ok(Math.abs(s.x) < 1.2 && s.y < -7.2, `englouti par la boue (x = ${s.x.toFixed(2)}, y = ${s.y.toFixed(2)})`);
  });
});

test('déblocage : 2300 points à Paris débloquent New York pendant la partie et à la fin', async () => {
  const storage = { 'onima.scores.v1': JSON.stringify([{ id: 'a', name: 'Test', score: 1600, date: 1 }]) };
  await scenario('paris', async (page) => {
    const locked = await page.evaluate(() => document.getElementById('unlock').classList.contains('show'));
    assert.equal(locked, false);
    await page.evaluate(() => window.__onima.addCandies(230));
    await page.waitForFunction(() => document.getElementById('unlock').classList.contains('show'));
    assert.match(await page.textContent('#unlock-name'), /New York/);
    await put(page, "ob.addBarrier(1, z, 'low')", 30);
    await dead(page);
    assert.match(await page.textContent('#over-msg'), /New York/);
  }, { unlockAll: false, storage });
});
