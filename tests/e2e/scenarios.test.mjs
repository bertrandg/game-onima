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
// défaite d'un type donné (sans sang) : animation de ce type, puis l'âme s'envole avant l'écran de fin
async function deadAs(page, kind) {
  await page.waitForFunction(() => window.__onima.state !== 'running', null, { timeout: 30000 });
  assert.equal(await page.evaluate(() => window.__onima.deathKind), kind);
  await page.waitForFunction(() => window.__onima.soulVisible || window.__onima.state === 'over', null, { timeout: 10000, polling: 50 });
  assert.equal(await page.evaluate(() => window.__onima.state), 'dying', 'l\'âme s\'envole avant l\'écran de fin');
  await dead(page);
}

test('trébucher sur une barrière : chute, envol de l\'âme, score affiché et enregistré', async () => {
  await scenario('japon', async (page) => {
    const z = await put(page, "ob.addBarrier(1, z, 'low')");
    await deadAs(page, 'trip');
    // elle s'est allongée devant la barrière, pas dedans
    const gap = (await state(page)).z - z;
    assert.ok(gap >= 1.8, `allongée à ${gap.toFixed(2)} m de la barrière`);
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
    await deadAs(page, 'head');
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
    await deadAs(page, 'faint');
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
    await deadAs(page, 'sink');
    const s = await state(page);
    assert.ok(Math.abs(s.x) < 1.2 && s.y < -7.2, `englouti par la boue (x = ${s.x.toFixed(2)}, y = ${s.y.toFixed(2)})`);
  });
});

test('Égypte : dalle effondrée, puis sortie du tombeau en montant l\'escalier sans s\'arrêter', async () => {
  await scenario('egypte', async (page) => {
    await put(page, 'ob.addHole(1, z, true)', 30);
    await page.waitForFunction(() => window.__onima.player.under && window.__onima.player.grounded, null, { timeout: 30000 });
    await page.evaluate(() => window.__t.clearAhead());
    let s = await state(page);
    assert.ok(s.y < -6, 'dans le tombeau');
    await put(page, 'ob.addStair(1, z)', 25);
    await page.waitForFunction(() => !window.__onima.player.under || window.__onima.state !== 'running', null, { timeout: 30000 });
    await page.waitForFunction(() => window.__onima.player.grounded || window.__onima.state !== 'running', null, { timeout: 20000 });
    s = await state(page);
    assert.equal(s.state, 'running');
    assert.equal(s.under, false);
    assert.ok(s.y >= 0, `de retour sur l'avenue (y = ${s.y.toFixed(2)})`);
  });
});

test('Égypte : sauter par-dessus une momie au bon moment ; une porte scellée est mortelle', async () => {
  await scenario('egypte', async (page) => {
    await put(page, 'ob.addHole(1, z, true)', 30);
    await page.waitForFunction(() => window.__onima.player.under && window.__onima.player.grounded, null, { timeout: 30000 });
    await page.evaluate(() => window.__t.clearAhead());
    const z = await put(page, "ob.addTombObstacle(1, z, 'mummy')", 40);
    // sommet du saut (environ 0,36 s après l'appui) au-dessus de la momie
    await page.evaluate((z) => window.__t.when((o) => o.player.z - (z - 0.3) < o.speed * 0.36, 'ArrowUp'), z);
    await passed(page, z);
    assert.equal((await state(page)).state, 'running');
    await put(page, "ob.addTombObstacle(1, z, 'door')", 30);
    await page.evaluate(() => window.__t.press('ArrowUp'));
    await deadAs(page, 'bonk');
  });
});

test('Hong Kong : monter par la rampe sur la passerelle, puis retomber dans la rue par une planche manquante', async () => {
  await scenario('hongkong', async (page) => {
    await page.evaluate(() => {
      const o = window.__onima, ob = o.obstacles, z = o.player.z;
      ob.nextSection = z - 1e6;
      ob.uCursor = z - 1e6;   // pas d'obstacles là-haut pendant le scénario
      ob.addRamp(1, z - 30);
      ob.addSection(z - 30 - 18, 160);
    });
    await page.waitForFunction(() => window.__onima.player.under || window.__onima.state !== 'running', null, { timeout: 30000 });
    let s = await state(page);
    assert.equal(s.state, 'running');
    assert.ok(s.y > 5, `sur la passerelle (y = ${s.y.toFixed(2)})`);
    // planche manquante juste devant, dans la voie du joueur
    await page.evaluate(() => {
      const o = window.__onima, ob = o.obstacles, sec = ob.sectionAt(o.player.z);
      ob.addGap(sec, 1, Math.ceil((sec.zStart - o.player.z + 24) / 4), 2);
    });
    await page.waitForFunction(() => !window.__onima.player.under || window.__onima.state !== 'running', null, { timeout: 30000 });
    await page.waitForFunction(() => window.__onima.player.grounded || window.__onima.state !== 'running', null, { timeout: 20000 });
    s = await state(page);
    assert.equal(s.state, 'running', 'on ne perd pas en tombant');
    assert.ok(s.y < 0.1, `de retour dans la rue (y = ${s.y.toFixed(2)})`);
  });
});

test('Hong Kong : sauter du toit d\'un minibus sur la passerelle, puis redescendre au bout', async () => {
  await scenario('hongkong', async (page) => {
    await page.evaluate(() => {
      const o = window.__onima, ob = o.obstacles, z = o.player.z;
      ob.nextSection = z - 1e6;
      ob.uCursor = z - 1e6;
      window.__z = z;
      ob.addTrain(1, z - 25, 2, true, false);   // deux minibus avec une rampe pour monter sur le toit (de z - 32 à z - 47)
      ob.addSection(z - 38, 60);
    });
    // bien engagée sur le toit : saut vers la passerelle qui commence juste devant, au-dessus
    await page.evaluate(() => window.__t.when((o) => o.player.y > 2.5 && o.player.grounded && o.player.z < window.__z - 31, 'ArrowUp'));
    await page.waitForFunction(() => window.__onima.player.under || window.__onima.state !== 'running', null, { timeout: 30000 });
    let s = await state(page);
    assert.equal(s.state, 'running');
    assert.ok(s.y > 5, `sur la passerelle (y = ${s.y.toFixed(2)})`);
    await page.waitForFunction(() => !window.__onima.player.under || window.__onima.state !== 'running', null, { timeout: 30000 });
    await page.waitForFunction(() => window.__onima.player.grounded || window.__onima.state !== 'running', null, { timeout: 20000 });
    s = await state(page);
    assert.equal(s.state, 'running');
    assert.ok(s.y < 0.1, 'redescendue dans la rue au bout de la passerelle');
  });
});

test('Centre commercial : rester dans la voie d\'un escalator fait monter d\'un étage, puis on redescend', async () => {
  await scenario('mall', async (page) => {
    // escalator qui monte dans la voie du joueur (pied aligné sur les dalles)
    assert.ok(await page.evaluate(() => { const o = window.__onima, ob = o.obstacles; return !!ob.tryConn(0, 1, Math.round((o.player.z - 40) / 5.2) * 5.2, 1); }), 'escalator posé');
    await page.waitForFunction(() => window.__onima.obstacles.floor === 1 || window.__onima.state !== 'running', null, { timeout: 30000 });
    let s = await state(page);
    assert.equal(s.state, 'running', `perdu (${await page.evaluate(() => window.__onima.deathKind)}) à y = ${s.y.toFixed(2)}`);
    assert.ok(Math.abs(s.y - 6.4) < 0.05, `au deuxième étage (y = ${s.y.toFixed(2)})`);
    assert.match(await page.textContent('#hud-extra'), /Étage 2/);
    // escalator qui descend un peu plus loin, toujours dans sa voie (route de nouveau vidée)
    const placed = await page.evaluate(() => {
      window.__t.clearAhead();
      const o = window.__onima, ob = o.obstacles;
      return !!ob.tryConn(0, -1, Math.round((o.player.z - 45) / 5.2) * 5.2, 1);
    });
    assert.ok(placed, 'escalator qui descend posé');
    await page.waitForFunction(() => window.__onima.obstacles.floor === 0 || window.__onima.state !== 'running', null, { timeout: 30000 });
    await page.waitForFunction(() => window.__onima.player.grounded || window.__onima.state !== 'running', null, { timeout: 20000 });
    s = await state(page);
    assert.equal(s.state, 'running');
    assert.ok(s.y < 0.05, `revenue au rez-de-chaussée (y = ${s.y.toFixed(2)})`);
  });
});

test('Centre commercial : changer de voie contre la balustrade d\'un escalator est mortel', async () => {
  await scenario('mall', async (page) => {
    const z0 = await page.evaluate(() => { const o = window.__onima, ob = o.obstacles; return ob.tryConn(0, 1, Math.round((o.player.z - 40) / 5.2) * 5.2, 2).zNear; });
    await page.evaluate((z0) => window.__t.when((o) => o.player.z < z0 - 8, 'ArrowRight'), z0);
    await deadAs(page, 'bonk');
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
