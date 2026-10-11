import * as THREE from 'three';

function makeCanvas(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function noise(g, w, h, count, base, spread, size = 2) {
  for (let i = 0; i < count; i++) {
    const v = (Math.random() - 0.5) * spread;
    g.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0})`;
    g.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}

export function grassTexture() {
  const t = makeCanvas(128, 128, (g, w, h) => {
    g.fillStyle = '#8fc062';
    g.fillRect(0, 0, w, h);
    noise(g, w, h, 900, [135, 186, 92], 40, 2);
    noise(g, w, h, 120, [165, 205, 110], 20, 3);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function gravelTexture() {
  const t = makeCanvas(128, 128, (g, w, h) => {
    g.fillStyle = '#9b9085';
    g.fillRect(0, 0, w, h);
    noise(g, w, h, 1600, [150, 140, 130], 70, 2);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Traverses de voie (fond transparent)
export function sleeperTexture() {
  const t = makeCanvas(128, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#6b4c36';
    g.fillRect(0, 18, w, 28);
    g.fillStyle = '#5a3e2b';
    for (let i = 0; i < 4; i++) g.fillRect(0, 22 + i * 6, w, 1);
    g.fillStyle = '#7d5a40';
    g.fillRect(0, 18, w, 3);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function trainSideTexture(l) {
  return makeCanvas(512, 128, (g, w, h) => {
    g.fillStyle = l.body;
    g.fillRect(0, 0, w, h);
    // bandes
    g.fillStyle = l.stripe;
    g.fillRect(0, 88, w, 14);
    g.fillStyle = l.stripe2;
    g.fillRect(0, 106, w, 4);
    // portes
    const door = (x) => {
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(x - 2, 14, 48, 104);
      g.fillStyle = l.body;
      g.fillRect(x, 16, 44, 100);
      g.fillStyle = '#29384a';
      g.fillRect(x + 6, 24, 14, 36);
      g.fillRect(x + 24, 24, 14, 36);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x + 6, 24, 4, 36);
      g.fillRect(x + 24, 24, 4, 36);
    };
    door(40);
    door(428);
    // fenêtres
    for (let i = 0; i < 5; i++) {
      const x = 112 + i * 62;
      g.fillStyle = '#2b3a4c';
      g.fillRect(x, 24, 50, 40);
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.beginPath();
      g.moveTo(x, 64); g.lineTo(x + 18, 24); g.lineTo(x + 28, 24); g.lineTo(x + 10, 64);
      g.fill();
    }
  });
}

export function trainFrontTexture(l, moving) {
  return makeCanvas(256, 256, (g, w, h) => {
    g.fillStyle = l.body;
    g.fillRect(0, 0, w, h);
    // pare-brise
    g.fillStyle = '#1f2a38';
    g.beginPath();
    g.roundRect(18, 36, 220, 92, 14);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(30, 44, 60, 10);
    // girouette
    g.fillStyle = '#111';
    g.fillRect(84, 8, 88, 22);
    g.fillStyle = '#ffb23e';
    g.font = 'bold 16px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(moving ? '特急' : '普通', 128, 20);
    // bandes
    g.fillStyle = l.stripe;
    g.fillRect(0, 168, w, 26);
    g.fillStyle = l.stripe2;
    g.fillRect(0, 200, w, 8);
    // phares
    g.fillStyle = moving ? '#fffbe0' : '#d8d2b0';
    g.beginPath(); g.arc(46, 150, 14, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(210, 150, 14, 0, Math.PI * 2); g.fill();
    // attelage
    g.fillStyle = '#333';
    g.fillRect(112, 222, 32, 24);
  });
}

export function petalTexture() {
  return makeCanvas(32, 32, (g) => {
    g.translate(16, 16);
    g.rotate(0.5);
    const grd = g.createRadialGradient(0, 0, 1, 0, 0, 14);
    grd.addColorStop(0, '#fff0f6');
    grd.addColorStop(1, '#f5a3c4');
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
    g.fill();
  });
}

export function shadowTexture() {
  return makeCanvas(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    grd.addColorStop(0, 'rgba(40,30,40,0.55)');
    grd.addColorStop(1, 'rgba(40,30,40,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  });
}
