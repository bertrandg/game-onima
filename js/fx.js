// Effet de level up dessiné sur un canvas 2D au-dessus du jeu :
// nuit tombante avec halo, étoiles, éclairs, flash, onde de choc, rayons, lens flare, gerbe d'étoiles
const DURATION = 2.0;
const PEAK = 0.62;
const BOLT_TIMES = [0.18, 0.34, 0.5];
const STAR_COLORS = ['#fff4a3', '#ffb3d9', '#b8e6ff', '#ffffff', '#ffd23f', '#d9b8ff'];

const env = (t, a, b, c, d) => (t < a || t > d ? 0 : t < b ? (t - a) / (b - a) : t < c ? 1 : 1 - (t - c) / (d - c));

function star5(g, x, y, r, rot) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r, a = rot + (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

function sparkle4(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
}

// éclair en zigzag par déplacement du point milieu, avec ramifications
function makeBolt(x0, y0, x1, y1, rough, depth = 0) {
  let pts = [[x0, y0], [x1, y1]];
  let off = rough;
  for (let k = 0; k < 6; k++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const nx = -(by - ay), ny = bx - ax, len = Math.hypot(nx, ny) || 1;
      const d = (Math.random() - 0.5) * off;
      next.push([(ax + bx) / 2 + (nx / len) * d, (ay + by) / 2 + (ny / len) * d], pts[i + 1]);
    }
    pts = next;
    off *= 0.55;
  }
  const branches = [];
  if (depth === 0) {
    for (let i = 0; i < 3; i++) {
      const p = pts[8 + ((Math.random() * (pts.length - 24)) | 0)];
      const a = Math.atan2(y1 - y0, x1 - x0) + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6);
      const l = Math.hypot(x1 - x0, y1 - y0) * (0.15 + Math.random() * 0.2);
      branches.push(makeBolt(p[0], p[1], p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l, rough * 0.4, 1).pts);
    }
  }
  return { pts, branches };
}

export class LevelUpFx {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.active = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.c.width = Math.round(window.innerWidth * this.dpr);
    this.c.height = Math.round(window.innerHeight * this.dpr);
    if (!this.active) this.g.clearRect(0, 0, this.c.width, this.c.height);
  }

  start({ onPeak, onBolt } = {}) {
    this.active = true;
    this.t = 0;
    this.onPeak = onPeak;
    this.onBolt = onBolt;
    this.peaked = false;
    this.bolts = [];
    this.boltIdx = 0;
    this.burst = [];
    this.nightStars = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random() * 0.62, r: 0.6 + Math.random() * 1.8, ph: Math.random() * 10,
    }));
  }

  stop() {
    this.active = false;
    this.g.clearRect(0, 0, this.c.width, this.c.height);
  }

  // lueur du personnage : monte pendant les éclairs, maximale au pic, puis s'estompe
  get glow() {
    if (!this.active) return 0;
    return this.t < PEAK ? Math.max(0, (this.t - 0.15) / (PEAK - 0.15)) * 0.8 : Math.max(0, 1 - (this.t - PEAK) / 0.7);
  }

  // ralenti pendant l'effet
  get timeScale() {
    if (!this.active) return 1;
    return this.t < 1.0 ? 0.4 : Math.min(1, 0.4 + (this.t - 1.0) * 1.2);
  }

  // sx, sy : position écran (px CSS) du personnage
  update(dt, sx, sy) {
    if (!this.active) return;
    this.t += dt;
    const t = this.t, g = this.g, W = this.c.width, H = this.c.height, dpr = this.dpr;
    const cx = sx * dpr, cy = sy * dpr;
    const R = Math.min(W, H);
    g.clearRect(0, 0, W, H);
    if (t >= DURATION) { this.stop(); return; }

    // ----- nuit -----
    const night = env(t, 0, 0.3, 1.35, DURATION);
    const grd = g.createRadialGradient(cx, cy, R * 0.08, cx, cy, Math.max(W, H) * 0.9);
    grd.addColorStop(0, 'rgba(20,10,60,0)');
    grd.addColorStop(0.18, `rgba(18,10,58,${0.55 * night})`);
    grd.addColorStop(1, `rgba(6,4,30,${0.85 * night})`);
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);

    g.globalCompositeOperation = 'lighter';
    for (const s of this.nightStars) {
      const tw = 0.5 + 0.5 * Math.sin(t * 9 + s.ph);
      g.fillStyle = `rgba(255,250,235,${night * tw})`;
      sparkle4(g, s.x * W, s.y * H, s.r * dpr * (2 + tw * 2));
    }

    // ----- éclairs -----
    while (this.boltIdx < BOLT_TIMES.length && t >= BOLT_TIMES[this.boltIdx]) {
      const fromX = W * (0.15 + Math.random() * 0.7);
      this.bolts.push({ born: t, ...makeBolt(fromX, -10, cx + (Math.random() - 0.5) * R * 0.05, cy - R * 0.05, R * 0.35) });
      this.boltIdx++;
      this.onBolt?.();
    }
    for (const b of this.bolts) {
      const age = t - b.born;
      if (age > 0.22) continue;
      const a = (1 - age / 0.22) * (Math.random() < 0.25 ? 0.4 : 1);
      const drawPath = (pts, w) => {
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.lineWidth = w;
        g.stroke();
      };
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.shadowColor = 'rgba(140,200,255,1)';
      g.shadowBlur = 30 * dpr;
      g.strokeStyle = `rgba(150,205,255,${a * 0.8})`;
      drawPath(b.pts, 9 * dpr);
      b.branches.forEach((p) => drawPath(p, 4 * dpr));
      g.shadowBlur = 0;
      g.strokeStyle = `rgba(255,255,255,${a})`;
      drawPath(b.pts, 3 * dpr);
      b.branches.forEach((p) => drawPath(p, 1.5 * dpr));
      // éclat d'impact et flash de l'écran
      g.fillStyle = `rgba(220,240,255,${0.25 * a})`;
      g.fillRect(0, 0, W, H);
      const ig = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18);
      ig.addColorStop(0, `rgba(255,255,255,${a})`);
      ig.addColorStop(1, 'rgba(160,210,255,0)');
      g.fillStyle = ig;
      g.fillRect(cx - R * 0.2, cy - R * 0.2, R * 0.4, R * 0.4);
    }

    // ----- pic : changement de tenue -----
    if (!this.peaked && t >= PEAK) {
      this.peaked = true;
      this.onPeak?.();
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2 + Math.random() * 0.2;
        const v = R * (0.5 + Math.random() * 0.9);
        this.burst.push({
          x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8,
          size: R * (0.018 + Math.random() * 0.025), color: STAR_COLORS[i % STAR_COLORS.length],
        });
      }
    }
    if (this.peaked) {
      const pt = t - PEAK;
      // rayons tournants derrière le personnage
      const rays = env(pt, 0, 0.15, 0.8, 1.3);
      if (rays > 0) {
        g.save();
        g.translate(cx, cy);
        g.rotate(pt * 0.9);
        for (let i = 0; i < 14; i++) {
          g.rotate((Math.PI * 2) / 14);
          const rg = g.createLinearGradient(0, 0, R * 0.9, 0);
          rg.addColorStop(0, `rgba(255,240,200,${0.45 * rays})`);
          rg.addColorStop(1, 'rgba(255,200,240,0)');
          g.fillStyle = rg;
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(R * 0.9, -R * 0.06);
          g.lineTo(R * 0.9, R * 0.06);
          g.closePath();
          g.fill();
        }
        g.restore();
      }
      // onde de choc
      const sh = Math.min(1, pt / 0.7);
      if (sh < 1) {
        g.strokeStyle = `rgba(255,255,255,${0.9 * (1 - sh)})`;
        g.lineWidth = (14 * (1 - sh) + 2) * dpr;
        g.beginPath();
        g.arc(cx, cy, R * 0.05 + sh * Math.max(W, H) * 0.7, 0, Math.PI * 2);
        g.stroke();
      }
      // lens flare : traînée horizontale + reflets sur l'axe centre-écran
      const fl = env(pt, 0, 0.05, 0.5, 1.1);
      if (fl > 0) {
        const lg = g.createLinearGradient(0, cy, W, cy);
        lg.addColorStop(0, 'rgba(160,200,255,0)');
        lg.addColorStop(cx / W, `rgba(255,255,255,${0.9 * fl})`);
        lg.addColorStop(1, 'rgba(255,180,230,0)');
        g.fillStyle = lg;
        g.fillRect(0, cy - 3 * dpr, W, 6 * dpr);
        const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.22);
        core.addColorStop(0, `rgba(255,255,255,${fl})`);
        core.addColorStop(0.3, `rgba(255,236,190,${0.6 * fl})`);
        core.addColorStop(1, 'rgba(255,200,230,0)');
        g.fillStyle = core;
        g.fillRect(cx - R * 0.25, cy - R * 0.25, R * 0.5, R * 0.5);
        const mx = W / 2 - cx, my = H / 2 - cy;
        [[0.6, 0.05, '180,220,255'], [1.1, 0.03, '255,190,230'], [1.5, 0.08, '200,255,220'], [1.9, 0.02, '255,240,180']]
          .forEach(([k, r, rgb]) => {
            g.fillStyle = `rgba(${rgb},${0.35 * fl})`;
            g.beginPath();
            g.arc(cx + mx * k, cy + my * k, R * r, 0, Math.PI * 2);
            g.fill();
          });
      }
      // gerbe d'étoiles
      for (const s of this.burst) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vx *= 1 - dt * 1.8; s.vy = s.vy * (1 - dt * 1.8) + R * 0.5 * dt;
        s.rot += s.vr * dt;
        const life = Math.max(0, 1 - pt / 1.3);
        g.fillStyle = s.color;
        g.globalAlpha = life;
        star5(g, s.x, s.y, s.size * (0.6 + life * 0.6), s.rot);
      }
      g.globalAlpha = 1;
      // flash blanc
      const flash = Math.max(0, 1 - pt / 0.3);
      if (flash > 0) {
        g.fillStyle = `rgba(255,255,255,${0.75 * flash})`;
        g.fillRect(0, 0, W, H);
      }
    }
    g.globalCompositeOperation = 'source-over';
  }
}
