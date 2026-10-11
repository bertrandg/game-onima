// Effet de level up dessiné sur un canvas 2D au-dessus du jeu :
// nuit tombante avec halo, étoiles, flash, onde de choc, rayons, lens flare, gerbe d'étoiles.
// Pour rester fluide : canvas en basse résolution et sprites pré-rendus une seule fois.
const DURATION = 1.7;
const PEAK = 0.4;
const STAR_COLORS = ['#fff4a3', '#ffb3d9', '#b8e6ff', '#ffffff', '#ffd23f', '#d9b8ff'];
const RES = 0.6; // résolution du canvas d'effet par rapport à l'écran (CSS l'agrandit)

const env = (t, a, b, c, d) => (t < a || t > d ? 0 : t < b ? (t - a) / (b - a) : t < c ? 1 : 1 - (t - c) / (d - c));

function sprite(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}

const starSprite = (color) => sprite(64, (g, s) => {
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? s * 0.2 : s * 0.46, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
});

const sparkleSprite = () => sprite(32, (g, s) => {
  const m = s / 2;
  g.fillStyle = '#fffaf0';
  g.beginPath();
  g.moveTo(m, 0); g.quadraticCurveTo(m, m, s, m); g.quadraticCurveTo(m, m, m, s);
  g.quadraticCurveTo(m, m, 0, m); g.quadraticCurveTo(m, m, m, 0);
  g.fill();
});

const raysSprite = () => sprite(512, (g, s) => {
  const m = s / 2;
  g.translate(m, m);
  for (let i = 0; i < 14; i++) {
    g.rotate((Math.PI * 2) / 14);
    const rg = g.createLinearGradient(0, 0, m, 0);
    rg.addColorStop(0, 'rgba(255,240,200,0.55)');
    rg.addColorStop(1, 'rgba(255,200,240,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(m, -m * 0.07);
    g.lineTo(m, m * 0.07);
    g.closePath();
    g.fill();
  }
});

const glowSprite = () => sprite(256, (g, s) => {
  const m = s / 2;
  const rg = g.createRadialGradient(m, m, 0, m, m, m);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.3, 'rgba(255,236,190,0.6)');
  rg.addColorStop(1, 'rgba(255,200,230,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, s, s);
});

export class LevelUpFx {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.active = false;
    this.stars = STAR_COLORS.map(starSprite);
    this.sparkle = sparkleSprite();
    this.rays = raysSprite();
    this.glowImg = glowSprite();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.c.width = Math.max(1, Math.round(window.innerWidth * RES));
    this.c.height = Math.max(1, Math.round(window.innerHeight * RES));
  }

  start({ onPeak } = {}) {
    this.active = true;
    this.t = 0;
    this.onPeak = onPeak;
    this.peaked = false;
    this.burst = [];
    this.nightStars = Array.from({ length: 45 }, () => ({
      x: Math.random(), y: Math.random() * 0.6, r: 3 + Math.random() * 6, ph: Math.random() * 10,
    }));
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.g.clearRect(0, 0, this.c.width, this.c.height);
  }

  // lueur du personnage : monte jusqu'au pic puis s'estompe
  get glow() {
    if (!this.active) return 0;
    return this.t < PEAK ? (this.t / PEAK) * 0.8 : Math.max(0, 1 - (this.t - PEAK) / 0.7);
  }

  // sx, sy : position écran (px CSS) du personnage
  update(dt, sx, sy) {
    if (!this.active) return;
    this.t += dt;
    const t = this.t, g = this.g, W = this.c.width, H = this.c.height;
    g.clearRect(0, 0, W, H);
    if (t >= DURATION) { this.stop(); return; }
    const cx = sx * RES, cy = sy * RES;
    const R = Math.min(W, H);

    // ----- nuit : vignette sombre centrée sur le personnage -----
    const night = env(t, 0, 0.25, 1.15, DURATION);
    const grd = g.createRadialGradient(cx, cy, R * 0.08, cx, cy, Math.max(W, H) * 0.9);
    grd.addColorStop(0, 'rgba(20,10,60,0)');
    grd.addColorStop(0.18, 'rgba(18,10,58,0.55)');
    grd.addColorStop(1, 'rgba(6,4,30,0.85)');
    g.globalAlpha = night;
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);

    g.globalCompositeOperation = 'lighter';
    for (const s of this.nightStars) {
      const tw = 0.5 + 0.5 * Math.sin(t * 9 + s.ph);
      const size = s.r * (0.6 + tw * 0.6);
      g.globalAlpha = night * tw;
      g.drawImage(this.sparkle, s.x * W - size / 2, s.y * H - size / 2, size, size);
    }
    g.globalAlpha = 1;

    // ----- pic : changement de tenue -----
    if (!this.peaked && t >= PEAK) {
      this.peaked = true;
      this.onPeak?.();
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2 + Math.random() * 0.2;
        const v = R * (0.5 + Math.random() * 0.9);
        this.burst.push({
          x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8,
          size: R * (0.04 + Math.random() * 0.05), img: this.stars[i % this.stars.length],
        });
      }
    }
    if (this.peaked) {
      const pt = t - PEAK;
      // rayons tournants
      const rays = env(pt, 0, 0.15, 0.7, 1.2);
      if (rays > 0) {
        const s = R * 1.8;
        g.save();
        g.globalAlpha = rays;
        g.translate(cx, cy);
        g.rotate(pt * 0.9);
        g.drawImage(this.rays, -s / 2, -s / 2, s, s);
        g.restore();
      }
      // onde de choc
      const sh = Math.min(1, pt / 0.6);
      if (sh < 1) {
        g.globalAlpha = 0.9 * (1 - sh);
        g.strokeStyle = '#fff';
        g.lineWidth = 10 * (1 - sh) + 1.5;
        g.beginPath();
        g.arc(cx, cy, R * 0.05 + sh * Math.max(W, H) * 0.7, 0, Math.PI * 2);
        g.stroke();
      }
      // lens flare : halo, traînée horizontale, reflets vers le centre de l'écran
      const fl = env(pt, 0, 0.05, 0.4, 0.9);
      if (fl > 0) {
        g.globalAlpha = fl;
        const s = R * 0.5;
        g.drawImage(this.glowImg, cx - s / 2, cy - s / 2, s, s);
        g.drawImage(this.glowImg, 0, cy - 3, W, 6);
        const mx = W / 2 - cx, my = H / 2 - cy;
        for (const [k, r, a] of [[0.6, 0.05, 0.35], [1.1, 0.03, 0.3], [1.5, 0.08, 0.25], [1.9, 0.02, 0.35]]) {
          g.globalAlpha = fl * a;
          const d = R * r * 2;
          g.drawImage(this.glowImg, cx + mx * k - d / 2, cy + my * k - d / 2, d, d);
        }
      }
      // gerbe d'étoiles
      const life = Math.max(0, 1 - pt / 1.2);
      g.globalAlpha = life;
      for (const s of this.burst) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vx *= 1 - dt * 1.8; s.vy = s.vy * (1 - dt * 1.8) + R * 0.5 * dt;
        s.rot += s.vr * dt;
        const d = s.size * (0.6 + life * 0.6);
        g.save();
        g.translate(s.x, s.y);
        g.rotate(s.rot);
        g.drawImage(s.img, -d / 2, -d / 2, d, d);
        g.restore();
      }
      // flash blanc
      const flash = Math.max(0, 1 - pt / 0.3);
      if (flash > 0) {
        g.globalAlpha = 0.7 * flash;
        g.fillStyle = '#fff';
        g.fillRect(0, 0, W, H);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
}
