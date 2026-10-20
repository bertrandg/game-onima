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
    // filtre de la musique : étouffée quand on est sous terre
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000;
    this.music.connect(this.musicFilter).connect(this.master);
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
  // chute dans une bouche d'égout : glissando qui descend et « plouf » étouffé
  fall() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(700, 0.5, { type: 'triangle', vol: 0.16, to: 120 });
    this.noise(0.35, { vol: 0.12, freq: 300, q: 0.8, at: t + 0.4 });
  }
  // bond par l'échelle : arpège qui monte
  climb() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.16, { type: 'square', vol: 0.06, at: t + i * 0.05 }));
    this.tone(400, 0.5, { type: 'triangle', vol: 0.14, to: 1600 });
  }
  setMuffle(on) {
    if (!this.ctx || this.muffled === on) return;
    this.muffled = on;
    this.musicFilter.frequency.setTargetAtTime(on ? 650 : 20000, this.ctx.currentTime, 0.15);
  }
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

  // la note monte à chaque bonbon jusqu'au 10e
  candy(step) {
    const sc = (this.style && this.style.scale) || SCALE;
    const f = sc[step % sc.length] * 2;
    const t = this.ctx?.currentTime || 0;
    this.tone(f, 0.12, { type: 'triangle', vol: 0.14, at: t });
    this.tone(f * 1.5, 0.15, { type: 'sine', vol: 0.08, at: t + 0.05 });
  }
  // fanfare de déblocage d'un niveau : arpège montant puis accord tenu
  unlock() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.22, { type: 'square', vol: 0.06, at: t + i * 0.1 }));
    for (const f of [523.25, 659.25, 783.99, 1046.5]) this.tone(f, 1.2, { type: 'triangle', vol: 0.1, at: t + 0.55 });
    this.tone(2093, 1.0, { type: 'sine', vol: 0.06, at: t + 0.6, to: 3136 });
    this.noise(0.8, { vol: 0.05, freq: 7000, q: 0.7, at: t + 0.55 });
  }
  levelUp() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      this.tone(f, 0.18, { type: 'square', vol: 0.07, at: t + i * 0.07 });
      this.tone(f, 0.3, { type: 'triangle', vol: 0.12, at: t + i * 0.07 });
    });
    this.tone(1568, 0.6, { type: 'triangle', vol: 0.14, at: t + 0.38 });
    this.tone(2093, 0.7, { type: 'sine', vol: 0.08, at: t + 0.45, to: 2637 });
    this.noise(0.5, { vol: 0.06, freq: 6000, q: 0.8, at: t + 0.38 });
  }

  pluck(freq, t, vol = 0.14) {
    this.tone(freq, 0.9, { type: 'triangle', vol, at: t, out: this.music });
    this.tone(freq * 2, 0.35, { vol: vol * 0.35, at: t, out: this.music });
  }

  // accordéon : deux ondes carrées légèrement désaccordées, filtrées
  squeeze(freq, t, dur, vol = 0.05) {
    if (!this.ctx) return;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.music);
    for (const d of [-4, 4]) {
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq;
      o.detune.value = d;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  // style = { scale, meter, bpm, voice } fourni par le niveau ('koto' en 4/4 ou 'musette' en valse à 3 temps)
  startMusic(style) {
    if (!this.ctx || this.musicOn) return;
    if (style) this.style = style;
    const st = this.style || { scale: SCALE, meter: 4, bpm: 104, voice: 'koto' };
    const SC = st.scale;
    this.musicOn = true;
    this.step = 0;
    this.note = 3;
    this.next = this.ctx.currentTime + 0.1;
    const eighth = 60 / st.bpm / 2;
    const bar = st.meter * 2;
    // valse : grille d'accords (fondamentale = degré de la gamme) I - V - I - IV
    const chords = [[0, 2, 4], [4, 6, 8], [0, 2, 4], [3, 5, 7]];
    // jazz : I - IV - I - V (degrés de la gamme blues)
    const jazzChords = [[0, 2, 5], [2, 4, 6], [0, 2, 5], [4, 6, 8]];
    this.timer = setInterval(() => {
      while (this.next < this.ctx.currentTime + 0.15) {
        const t = this.next, s = this.step % bar;
        if (st.voice === 'jazz') {
          // swing : croches inégales (longue-brève), walking bass, accords sur 2 et 4, charleston
          const sw = s % 2 ? eighth * 0.34 : 0;
          const ts = t + sw;
          const ch = jazzChords[Math.floor(this.step / bar) % jazzChords.length];
          if (s % 2 === 0) {
            const walk = [0, 2, 4, 5][(s / 2) % 4];
            this.tone(SC[(ch[0] + walk) % SC.length] / 4, eighth * 1.7, { type: 'triangle', vol: 0.22, at: t, out: this.music });
          }
          if (s === 2 || s === 6) {
            for (const k of ch) this.tone(SC[k % SC.length], 0.12, { type: 'square', vol: 0.018, at: ts, out: this.music });
            this.noise(0.05, { vol: 0.05, freq: 6000, q: 1.5, at: t, out: this.music });
          }
          if (s % 2 === 1) this.noise(0.03, { vol: 0.03, freq: 8000, q: 2, at: ts, out: this.music });
          if (Math.random() > 0.4) {
            this.note = Math.max(0, Math.min(SC.length - 1, this.note + ((Math.random() * 5) | 0) - 2));
            this.tone(SC[this.note] * 2, eighth * (s % 2 ? 0.8 : 1.3), { type: 'triangle', vol: 0.09, at: ts, out: this.music });
            this.tone(SC[this.note] * 4, eighth * 0.5, { type: 'sine', vol: 0.025, at: ts, out: this.music });
          }
        } else if (st.voice === 'musette') {
          const ch = chords[Math.floor(this.step / bar) % chords.length];
          if (s === 0) this.tone(SC[ch[0]] / 2, 0.45, { type: 'triangle', vol: 0.2, at: t, out: this.music });
          if (s === 2 || s === 4) {
            for (const k of ch.slice(1)) this.squeeze(SC[k % SC.length], t, 0.16, 0.022);
          }
          if (s % 2 === 0 || Math.random() > 0.55) {
            this.note = Math.max(0, Math.min(SC.length - 1, this.note + ((Math.random() * 5) | 0) - 2));
            if (Math.random() > 0.2) this.squeeze(SC[this.note] * 2, t, eighth * (s % 2 ? 0.9 : 1.8), 0.045);
          }
        } else {
          if (s % 8 === 0) {
            this.tone(90, 0.35, { vol: 0.35, to: 45, at: t, out: this.music });
            this.noise(0.12, { vol: 0.1, freq: 200, at: t, out: this.music });
          }
          if (s % 4 === 2) this.noise(0.05, { vol: 0.05, freq: 3000, q: 2, at: t, out: this.music });
          if (s === 0) this.tone(SC[0] / 2, 1.8, { type: 'sine', vol: 0.12, at: t, out: this.music });
          if (Math.random() > 0.35) {
            this.note = Math.max(0, Math.min(SC.length - 1, this.note + ((Math.random() * 5) | 0) - 2));
            this.pluck(SC[this.note], t);
          }
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
