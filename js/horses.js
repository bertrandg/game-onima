import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { registerMixer } from './anim.js';

// Chevaux attelés qui galopent : modèle « Horse » de Quaternius (CC0, models/horse/), avec son squelette et
// son animation de galop, auquel on a ajouté dans Blender un harnais (tapis, sangle, collier, bride,
// œillères, pompon) attaché aux os. Le maillage ne garde qu'un rôle par sommet (attribut _role) : les
// couleurs de la robe et du harnais sont posées ici, selon le niveau. Un seul appel de dessin par cheval.
// Tête vers +z, sabots en y = 0, environ 2,4 m du nez à la queue.
const URL_GLB = new URL('../models/horse/horse.glb', import.meta.url).href;

// rôles des sommets (voir tools/export-plants.py et la préparation dans Blender)
const R = { coat: 0, dark: 1, hair: 2, muzzle: 3, hooves: 4, light: 5, eye: 6, eyeWhite: 7, leather: 8, accent: 9, metal: 10 };
export const COATS = {
  bay: { coat: '#7a4a2a', dark: '#3a2418', hair: '#221610', muzzle: '#4a3020', hooves: '#2a2522', light: '#9a6a42' },
  white: { coat: '#ece6dc', dark: '#bcb4a8', hair: '#d8d0c4', muzzle: '#8a8078', hooves: '#5a5048', light: '#f8f4ee' },
  chestnut: { coat: '#a8582a', dark: '#6a3418', hair: '#e8c890', muzzle: '#6a4028', hooves: '#3a3028', light: '#c87a42' },
  black: { coat: '#2e2a2e', dark: '#1e1a1e', hair: '#141214', muzzle: '#3e383a', hooves: '#1a1818', light: '#4a4448' },
};

const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
let GLTF = null;
const geos = {};

export async function loadHorse() {
  GLTF ||= await new GLTFLoader().loadAsync(URL_GLB);
  return GLTF;
}

function baseMesh() {
  let m = null;
  GLTF.scene.traverse((o) => { if (o.isSkinnedMesh) m = o; });
  return m;
}

// géométrie colorée pour une robe et un harnais donnés (mise en cache, partagée par tous les chevaux pareils)
function coloredGeo(coat, harness) {
  const key = JSON.stringify([coat, harness]);
  if (geos[key]) return geos[key];
  const g = baseMesh().geometry.clone();
  const role = g.attributes._role;
  const pal = { ...coat, eye: '#141014', eyeWhite: '#f4f0ea', ...harness };
  const cols = {};
  for (const [k, v] of Object.entries(R)) cols[v] = new THREE.Color(pal[k] || '#ff00ff');
  const c = new Float32Array(role.count * 3);
  for (let i = 0; i < role.count; i++) {
    const col = cols[Math.round(role.getX(i))];
    c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return (geos[key] = g);
}

// un cheval qui galope : coat = robe (COATS), harness = { leather, accent, metal }
export function horse(coat, harness, { scale = 1, speed = 1.6 } = {}) {
  const root = cloneSkinned(GLTF.scene);
  root.traverse((o) => {
    if (o.isSkinnedMesh) { o.geometry = coloredGeo(coat, harness); o.material = mat; o.frustumCulled = false; }
  });
  root.scale.multiplyScalar(scale);
  const mixer = new THREE.AnimationMixer(root);
  const act = mixer.clipAction(GLTF.animations[0]);
  act.play();
  act.time = Math.random() * GLTF.animations[0].duration;   // les deux chevaux ne sont pas en phase
  act.timeScale = speed;
  registerMixer(mixer);
  return root;
}
