// Clavier (flèches / ZQSD / WASD / espace) et swipe tactile ou souris
export class Input {
  constructor(handlers, isActive) {
    this.h = handlers;
    this.isActive = isActive;
    this.start = null;

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key;
      let action = null;
      if (k === 'ArrowLeft' || k === 'a' || k === 'q' || k === 'A' || k === 'Q') action = 'left';
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') action = 'right';
      else if (k === 'ArrowUp' || k === 'w' || k === 'z' || k === 'W' || k === 'Z' || k === ' ') action = 'up';
      else if (k === 'ArrowDown' || k === 's' || k === 'S') action = 'down';
      else if (k === 'Escape' || k === 'p' || k === 'P') action = 'pause';
      if (!action) return;
      if (action !== 'pause' && !this.isActive()) return;
      e.preventDefault();
      if (!e.repeat) this.h[action]?.();
    });

    const ignore = (e) => e.target.closest && e.target.closest('button, input, a, .screen');
    window.addEventListener('pointerdown', (e) => {
      if (ignore(e) || !this.isActive()) return;
      this.start = { x: e.clientX, y: e.clientY, id: e.pointerId, fired: false };
    });
    window.addEventListener('pointermove', (e) => {
      const s = this.start;
      if (!s || s.fired || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      const th = Math.max(24, Math.min(window.innerWidth, window.innerHeight) * 0.04);
      if (Math.max(Math.abs(dx), Math.abs(dy)) < th) return;
      s.fired = true;
      if (Math.abs(dx) > Math.abs(dy)) this.h[dx > 0 ? 'right' : 'left']?.();
      else this.h[dy < 0 ? 'up' : 'down']?.();
    });
    const end = () => { this.start = null; };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }
}
