// Sons et petite musique pentatonique (gamme In) générés avec WebAudio
const SCALE = [293.66, 311.13, 392.0, 440.0, 466.16, 587.33, 622.25, 783.99, 880.0]; // ré mib sol la sib ...
const MUTE_KEY = 'onima.muted';

export class Sound {
  constructor() {
    this.ctx = null;
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { this.muted = false; }
    this.musicOn = false;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0.35;
    this.music.connect(this.master);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* stockage indisponible */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  tone(freq, dur, { type = 'sine', vol = 0.2, to = null, at = 0, out = null } = {}) {
    if (!this.ctx) return;
    const t = (at || this.ctx.currentTime);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out || this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur, { vol = 0.2, freq = 1000, q = 1, at = 0, out = null, type = 'bandpass' } = {}) {
    if (!this.ctx) return;
    const t = at || this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out || this.master);
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  jump() { this.tone(520, 0.2, { type: 'triangle', vol: 0.18, to: 1000 }); }
  lane() { this.tone(880, 0.06, { vol: 0.06 }); }
  slide() { this.noise(0.3, { vol: 0.15, freq: 1400, q: 0.7 }); }
  land() { this.noise(0.08, { vol: 0.08, freq: 400 }); }
  crash() {
    this.noise(0.6, { vol: 0.5, freq: 500, q: 0.5 });
    this.tone(160, 0.5, { type: 'sawtooth', vol: 0.25, to: 40 });
  }
  horn() {
    if (!this.ctx) return;
    const out = this.ctx.createGain();
    out.gain.value = 0.5;
    out.connect(this.master);
    this.tone(349, 0.7, { type: 'square', vol: 0.06, out });
    this.tone(440, 0.7, { type: 'square', vol: 0.05, out });
  }
  milestone() {
    const t = this.ctx?.currentTime || 0;
    [587.33, 783.99, 880].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.12, at: t + i * 0.09 }));
  }

  pluck(freq, t, vol = 0.14) {
    this.tone(freq, 0.9, { type: 'triangle', vol, at: t, out: this.music });
    this.tone(freq * 2, 0.35, { vol: vol * 0.35, at: t, out: this.music });
  }

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.note = 3;
    this.next = this.ctx.currentTime + 0.1;
    const eighth = 60 / 104 / 2;
    this.timer = setInterval(() => {
      while (this.next < this.ctx.currentTime + 0.15) {
        const t = this.next, s = this.step % 16;
        if (s % 8 === 0) {
          this.tone(90, 0.35, { vol: 0.35, to: 45, at: t, out: this.music });
          this.noise(0.12, { vol: 0.1, freq: 200, at: t, out: this.music });
        }
        if (s % 4 === 2) this.noise(0.05, { vol: 0.05, freq: 3000, q: 2, at: t, out: this.music });
        if (s === 0) this.tone(SCALE[0] / 2, 1.8, { type: 'sine', vol: 0.12, at: t, out: this.music });
        if (Math.random() > 0.35) {
          this.note = Math.max(0, Math.min(SCALE.length - 1, this.note + ((Math.random() * 5) | 0) - 2));
          this.pluck(SCALE[this.note], t);
        }
        this.next += eighth;
        this.step++;
      }
    }, 40);
  }

  stopMusic() {
    this.musicOn = false;
    clearInterval(this.timer);
  }
}
