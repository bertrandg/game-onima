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

// usure des pavés dans chaque voie : deux ornières lustrées par le passage des roues (fond transparent)
const wornRuts = () => canvasTex(128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (const cx of [0.2 * w, 0.8 * w]) {
    const grd = g.createLinearGradient(cx - 14, 0, cx + 14, 0);
    grd.addColorStop(0, 'rgba(40,34,30,0)');
    grd.addColorStop(0.5, 'rgba(40,34,30,0.42)');
    grd.addColorStop(1, 'rgba(40,34,30,0)');
    g.fillStyle = grd;
    g.fillRect(cx - 14, 0, 28, h);
    // reflets polis sur les pavés usés
    for (let i = 0; i < 10; i++) {
      g.fillStyle = `rgba(255,240,220,${0.08 + Math.random() * 0.1})`;
      g.fillRect(cx - 6 + Math.random() * 12, Math.random() * h, 2, 6 + Math.random() * 10);
    }
  }
  // léger assombrissement au centre de la voie (traces de sabots)
  const mid = g.createLinearGradient(w * 0.35, 0, w * 0.65, 0);
  mid.addColorStop(0, 'rgba(40,34,30,0)');
  mid.addColorStop(0.5, 'rgba(40,34,30,0.16)');
  mid.addColorStop(1, 'rgba(40,34,30,0)');
  g.fillStyle = mid;
  g.fillRect(w * 0.35, 0, w * 0.3, h);
});

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
      sleepers: wornRuts, rails: false,
      dividers: '#b4ada0', dividerEdge: '#8e887c', curb: '#9a968c',
    },
    particles: { texture: leafTexture, size: 0.3 },
    scenery: parisScenery,
  },
  // tenues débloquées tous les 10 objets à Paris (la première est la tenue de départ)
  palettes: [
    { name: 'Jade', top: '#62a86c', cuff: '#b4dc84', sash: '#2f7350', skirt: '#7d2a4c', ribbon: '#4a7fd0' },
    { name: 'Moulin Rouge', top: '#d8303a', cuff: '#ffd6dc', sash: '#1c1a1e', skirt: '#2a1a24', ribbon: '#ffd23f' },
    { name: 'Macaron Framboise', top: '#f7a8c4', cuff: '#fff0f4', sash: '#d85a8a', skirt: '#b8dc8a', ribbon: '#ffffff' },
    { name: 'Fée Verte', top: '#8ad84a', cuff: '#e0ffc0', sash: '#2f8a3a', skirt: '#1f4a2a', ribbon: '#c8ffd0' },
    { name: 'Montmartre', top: '#f4ecd8', cuff: '#bcd6f0', sash: '#2c4a8a', skirt: '#2c4a8a', ribbon: '#c8302a' },
    { name: 'Café Crème', top: '#c8a070', cuff: '#f4e6cc', sash: '#6a4426', skirt: '#4a2e1c', ribbon: '#f4ecd8' },
    { name: 'Tour Eiffel', top: '#9a6a4a', cuff: '#e8c890', sash: '#5e4436', skirt: '#3a2a22', ribbon: '#d8b04a' },
    { name: 'Lavande de Provence', top: '#b48ae0', cuff: '#efe2ff', sash: '#6a4bb8', skirt: '#f4ecd8', ribbon: '#8ad84a' },
    { name: 'Nuit Parisienne', top: '#1f2a5a', cuff: '#d8b04a', sash: '#d8b04a', skirt: '#14183a', ribbon: '#f2d24a' },
    { name: 'Champagne', top: '#f2dc9a', cuff: '#fff8e0', sash: '#c8a040', skirt: '#f4ecd8', ribbon: '#e8b0c0' },
  ],
  obstacleKit: parisVehicleKit,
  items: parisItems,
};
