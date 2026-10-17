// Niveau 2 : le Paris de la Belle Époque. Ce module (et tout le dossier paris/) n'est téléchargé
// qu'au moment où le joueur choisit ce niveau.
import * as THREE from 'three';
import { parisScenery, FOG_COLOR } from './scenery.js';
import { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuild } from './decor.js';
import { parisVehicleKit } from './vehicles.js';
import { parisItems } from './items.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// pavés parisiens en arc de cercle (sol général)
function cobbles(base, light, dark) {
  return () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = dark;
    g.fillRect(0, 0, w, h);
    const s = 32;
    for (let row = 0; row < h / s + 1; row++) {
      for (let col = 0; col < w / s + 1; col++) {
        const x = col * s + (row % 2 ? s / 2 : 0), y = row * s;
        const v = Math.random() * 30 - 15;
        const c = base.map((k) => Math.max(0, Math.min(255, k + v)));
        g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        g.beginPath();
        g.roundRect(x - s / 2 + 2, y - s / 2 + 2, s - 4, s - 4, 7);
        g.fill();
        g.fillStyle = light;
        g.fillRect(x - s / 2 + 6, y - s / 2 + 5, s - 14, 3);
      }
    }
  });
}

// voie de tramway noyée dans les pavés : pas de traverses visibles
const noSleepers = () => canvasTex(4, 4, (g) => g.clearRect(0, 0, 4, 4));

// feuilles de platane dorées qui tombent
const leafTexture = () => canvasTex(32, 32, (g) => {
  g.translate(16, 16);
  g.rotate(0.6);
  const grd = g.createRadialGradient(0, 0, 1, 0, 0, 14);
  grd.addColorStop(0, '#ffe08a');
  grd.addColorStop(1, '#d8902a');
  g.fillStyle = grd;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 7 : 14, a = (i / 10) * Math.PI * 2;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8);
  }
  g.fill();
});

export default {
  id: 'paris',
  fog: FOG_COLOR,
  // musique : valse musette à l'accordéon, en do majeur, à 3 temps
  music: { scale: [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33], meter: 3, bpm: 168, voice: 'musette' },
  world: {
    decor: { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuild },
    lights: { sky: '#fff0e0', ground: '#b8a890', hemi: 1.7, sun: '#ffd8a8', sunI: 2.2 },
    track: {
      ground: cobbles([176, 168, 156], 'rgba(255,255,255,0.18)', '#7a746a'), groundTile: 6,
      bed: cobbles([140, 132, 122], 'rgba(255,255,255,0.12)', '#5e5850'),
      sleepers: noSleepers,
      rail: '#6a6e72', railTop: '#c4c8cc', curb: '#9a968c',
    },
    particles: { texture: leafTexture, size: 0.3 },
    scenery: parisScenery,
  },
  obstacleKit: parisVehicleKit,
  items: parisItems,
};
