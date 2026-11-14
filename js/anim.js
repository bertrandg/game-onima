// Animations des obstacles à squelette (chevaux qui galopent) : chaque véhicule animé inscrit ici son
// AnimationMixer ; la boucle de jeu les fait avancer à chaque image. Module léger, importé par main.js
// sans charger le chargeur glTF (seuls les niveaux à chevaux le téléchargent, voir horses.js).
const mixers = new Set();

export function registerMixer(mixer) { mixers.add(mixer); }

const inScene = (o) => { while (o.parent) o = o.parent; return o.isScene; };
// fait avancer les animations encore dans la scène ; oublie les autres (véhicule passé ou retiré : un
// véhicule est mis dans la scène dès sa construction, avant la première image)
export function animateMixers(dt) {
  for (const m of mixers) {
    if (inScene(m.getRoot())) m.update(dt);
    else {
      m.stopAllAction();
      m.uncacheRoot(m.getRoot());
      // chaque squelette garde ses os dans une petite texture : la libérer, sinon elle reste en mémoire graphique
      m.getRoot().traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
      mixers.delete(m);
    }
  }
}
