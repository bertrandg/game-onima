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
