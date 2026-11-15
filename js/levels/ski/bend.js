import * as THREE from 'three';

// La piste descend et tourne, mais le jeu reste calculé dans un repère droit et plat (voies parallèles,
// sol à y = 0) : c'est à l'affichage que tout ce qui est devant le joueur est déplacé vers le bas (la pente)
// et sur le côté (les virages). Le déplacement ne dépend que de la distance au joueur et se calcule dans
// le shader de chaque matière du niveau (bendMaterial). Sous le joueur, il est nul : le jeu ne voit rien.
//
// Profil de la piste en fonction de la distance parcourue u (= -z) :
//   X(u) : tracé vu du ciel (sommes de sinus : de longues courbes douces, à gauche puis à droite)
//   Y(u) : altitude (pente moyenne de 24 %, avec des passages plus raides et des replats)

export const N = 72;          // échantillons envoyés au shader
export const STEP = 5;        // mètres entre deux échantillons
export const D0 = 40;         // le premier échantillon est 40 m derrière le joueur

const P = { x: [26, 170, 0], x2: [11, 83, 1.7], x3: [3, 53, 0.4], y: [9, 120, 0], y2: [3, 47, 2.1] };
const BASE_SLOPE = 0.24;
const ROLL = 0.0005;

// tirage d'un nouveau tracé (au début de chaque descente)
export function newTrack(rnd = Math.random) {
  P.x[2] = rnd() * 6.28; P.x2[2] = rnd() * 6.28; P.x3[2] = rnd() * 6.28;
  P.y[2] = rnd() * 6.28; P.y2[2] = rnd() * 6.28;
}

const sx = ([a, l, p], u) => a * Math.sin(u / l + p);
const cx = ([a, l, p], u) => (a / l) * Math.cos(u / l + p);
export const trackX = (u) => sx(P.x, u) + sx(P.x2, u) + sx(P.x3, u);
export const headingAt = (u) => cx(P.x, u) + cx(P.x2, u) + cx(P.x3, u);   // dX/du
export const trackY = (u) => -BASE_SLOPE * u - sx(P.y, u) - sx(P.y2, u);
export const slopeAt = (u) => BASE_SLOPE + cx(P.y, u) + cx(P.y2, u);       // pente (positive en descente)

// état partagé avec les shaders : décalage (x, y) de chaque échantillon par rapport au joueur
export const bendUniforms = {
  uBend: { value: Array.from({ length: N }, () => new THREE.Vector2()) },
  uPz: { value: 0 },
};
export const view = { pz: 0, u: 0, heading: 0, slope: BASE_SLOPE };

// décalage d'un point situé d mètres devant (d < 0) ou derrière (d > 0) le joueur
export function bendAt(d, out = { x: 0, y: 0 }) {
  const u0 = view.u, u = u0 - d;
  out.x = trackX(u) - trackX(u0) - view.heading * (u - u0);   // le tracé part toujours droit devant elle
  out.y = trackY(u) - trackY(u0);
  // la pente s'accentue au loin : la piste plonge derrière une rupture, on devine la vallée en contrebas
  if (d < 0) out.y -= ROLL * d * d;
  return out;
}

const _o = { x: 0, y: 0 };
export function updateBend(pz) {
  view.pz = pz;
  view.u = -pz;
  view.heading = headingAt(view.u);
  view.slope = slopeAt(view.u);
  bendUniforms.uPz.value = pz;
  const arr = bendUniforms.uBend.value;
  for (let i = 0; i < N; i++) {
    bendAt(D0 - i * STEP, _o);
    arr[i].set(_o.x, _o.y);
  }
}

// Fonction GLSL : même interpolation que ci-dessus, prolongée en ligne droite au-delà des échantillons
const GLSL = `
uniform vec2 uBend[${N}];
uniform float uPz;
vec3 skiBend(vec3 w) {
  float f = (${D0.toFixed(1)} - (w.z - uPz)) / ${STEP.toFixed(1)};
  float c = clamp(f, 0.0, ${(N - 1).toFixed(1)} - 0.001);
  int i = int(c);
  vec2 o = mix(uBend[i], uBend[i + 1], c - float(i));
  if (f > ${(N - 1).toFixed(1)}) o += (uBend[${N - 1}] - uBend[${N - 2}]) * (f - ${(N - 1).toFixed(1)});
  if (f < 0.0) o += (uBend[0] - uBend[1]) * (-f);
  return w + vec3(o.x, o.y, 0.0);
}
`;
const PROJECT = `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 skiWorld = modelMatrix * mvPosition;
skiWorld.xyz = skiBend( skiWorld.xyz );
mvPosition = viewMatrix * skiWorld;
gl_Position = projectionMatrix * mvPosition;
`;

// Ajoute la déformation à une matière (Lambert, Toon, Basic, Points… : toutes passent par project_vertex)
export function bendMaterial(m) {
  if (m.userData.bent) return m;
  m.userData.bent = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uBend = bendUniforms.uBend;
    sh.uniforms.uPz = bendUniforms.uPz;
    sh.vertexShader = GLSL + sh.vertexShader.replace('#include <project_vertex>', PROJECT);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => key() + '|skibend';
  return m;
}

// Toutes les matières d'un objet (et de ses enfants) ; le découpage hors champ est coupé, car les sommets
// affichés ne sont plus là où three.js les croit
export function bendObject(o) {
  o.traverse((c) => {
    if (c.material) for (const m of [].concat(c.material)) bendMaterial(m);
    if (c.isMesh || c.isPoints) c.frustumCulled = false;
  });
  return o;
}
