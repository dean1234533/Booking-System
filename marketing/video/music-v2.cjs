// Synthesises an original 120 BPM lo-fi/hip-hop instrumental plus the UI
// sound effects for the v2 promo. Everything is generated from scratch (no
// samples, no third-party audio), so it's royalty-free by construction.
// Output: assets/music-v2.wav (18.5s) and assets/sfx-click.wav / sfx-chime.wav
const fs = require("fs");
const path = require("path");

const SR = 44100;
const BPM = 120;
const BEAT = 60 / BPM;              // 0.5s — every scene cut in the edit lands on a multiple of this
const DUR = 18.5;
const N = Math.ceil(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);

// Deterministic noise so renders are repeatable.
let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function add(t, samples, gain = 1, pan = 0) {
  const start = Math.round(t * SR);
  const gl = gain * (pan <= 0 ? 1 : 1 - pan), gr = gain * (pan >= 0 ? 1 : 1 + pan);
  for (let i = 0; i < samples.length; i++) {
    const k = start + i;
    if (k < 0 || k >= N) continue;
    L[k] += samples[i] * gl; R[k] += samples[i] * gr;
  }
}
const env = (i, sr, atk, dec) => Math.min(1, i / (atk * sr)) * Math.exp(-i / (dec * sr));

// ── drums ──
function kick() {
  const len = Math.round(SR * 0.4), o = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, f = 46 + 90 * Math.exp(-t * 28);
    ph += (2 * Math.PI * f) / SR;
    o[i] = Math.sin(ph) * Math.exp(-t * 9) + (i < 90 ? rnd() * 0.25 * (1 - i / 90) : 0);
  }
  return o;
}
function snare() {
  const len = Math.round(SR * 0.28), o = new Float32Array(len);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, n = rnd(), hp = n - prev * 0.6; prev = n;
    o[i] = hp * 0.7 * Math.exp(-t * 16) + Math.sin(2 * Math.PI * 185 * t) * 0.45 * Math.exp(-t * 26);
  }
  return o;
}
function hat(open) {
  const len = Math.round(SR * (open ? 0.22 : 0.06)), o = new Float32Array(len);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < len; i++) {
    const n = rnd(), hp = n - p1 * 1.0 + p2 * 0.0; p2 = p1; p1 = n;
    o[i] = hp * Math.exp(-(i / SR) * (open ? 16 : 70));
  }
  return o;
}
function crash() {
  const len = Math.round(SR * 1.2), o = new Float32Array(len);
  let p = 0;
  for (let i = 0; i < len; i++) { const n = rnd(); o[i] = (n - p * 0.8) * Math.exp(-(i / SR) * 3.2); p = n; }
  return o;
}
// ── tonal voices ──
function bass(f, dur) {
  const len = Math.round(SR * dur), o = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR, e = Math.min(1, t / 0.008) * Math.exp(-t * 2.2) * Math.min(1, (dur - t) / 0.03);
    o[i] = (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t)) * e;
  }
  return o;
}
function keys(f, dur) { // electric-piano-ish: soft sine + decaying bell partial + slight detune
  const len = Math.round(SR * dur), o = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR, e = Math.min(1, t / 0.006) * Math.exp(-t * 3.0) * Math.min(1, (dur - t) / 0.05);
    o[i] = (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.004 * t)
      + 0.22 * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-t * 14)) * e * 0.5;
  }
  return o;
}
function pluck(f, dur = 0.35) {
  const len = Math.round(SR * dur), o = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR, e = Math.min(1, t / 0.004) * Math.exp(-t * 9);
    const tri = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * t));
    o[i] = (tri * 0.7 + Math.sin(2 * Math.PI * f * 2 * t) * 0.15) * e;
  }
  return o;
}

// ── arrangement ──
const CHORDS = [
  { root: 110.0,  notes: [220.0, 261.63, 329.63, 392.0] },     // Am7
  { root: 87.31,  notes: [174.61, 220.0, 261.63, 329.63] },    // Fmaj7
  { root: 130.81, notes: [261.63, 329.63, 392.0, 493.88] },    // Cmaj7
  { root: 98.0,   notes: [196.0, 246.94, 293.66, 329.63] },    // G6
];
const PENT = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
const K = kick(), S = snare(), HC = hat(false), HO = hat(true), CR = crash();
const bars = Math.ceil(DUR / (BEAT * 4));

for (let bar = 0; bar < bars; bar++) {
  const b0 = bar * 4 * BEAT;
  const ch = bar === 8 ? { root: 130.81, notes: [261.63, 329.63, 392.0, 523.25] } : CHORDS[bar % 4];
  const full = bar >= 1 && bar <= 7;
  const outro = bar >= 8;

  // drums
  add(b0 + 0 * BEAT, K, 0.95);
  if (!outro) { add(b0 + 1.5 * BEAT, K, 0.75); add(b0 + 2.25 * BEAT, K, 0.65); }
  if (full) { add(b0 + 1 * BEAT, S, 0.6, 0.05); add(b0 + 3 * BEAT, S, 0.62, -0.05); }
  for (let h = 0; h < 8; h++) {
    if (outro && h % 2) continue;
    add(b0 + h * 0.5 * BEAT, HC, h % 2 ? 0.16 : 0.24, h % 2 ? 0.25 : -0.2);
  }
  if (!outro) add(b0 + 3.5 * BEAT, HO, 0.16, 0.3);

  // bass
  add(b0 + 0 * BEAT, bass(ch.root, 1.4 * BEAT), 0.7);
  add(b0 + 1.5 * BEAT, bass(ch.root, 0.4 * BEAT), 0.55);
  add(b0 + 2.5 * BEAT, bass(ch.root * 1.5, 0.45 * BEAT), 0.5);
  if (!outro) add(b0 + 3.25 * BEAT, bass(ch.root * 2, 0.35 * BEAT), 0.4);

  // chords (electric-piano stabs), gently spread across the stereo field
  const stab = (beat, len, g) => ch.notes.forEach((f, i) => add(b0 + beat * BEAT, keys(f, len * BEAT), g, (i - 1.5) * 0.18));
  stab(0, 1.4, 0.32); stab(1.5, 0.45, 0.26); stab(2.5, 0.45, 0.26);
  if (bar >= 2) stab(3.5, 0.4, 0.2);

  // lead arpeggio from bar 3 onward (the "build" while the dashboard/site scenes play)
  if (bar >= 2 && bar <= 7) {
    for (let s = 0; s < 8; s++) {
      const idx = (s * 2 + bar * 3 + (s % 3)) % PENT.length;
      if ((s + bar) % 4 === 3) continue;              // leave a few gaps so it breathes
      add(b0 + s * 0.5 * BEAT, pluck(PENT[idx]), 0.2, s % 2 ? 0.35 : -0.35);
    }
  }
}
// impact into the end card (15.0s) and a soft rise before it
add(15.0, CR, 0.5); add(15.0, K, 1.0);
{
  const len = Math.round(SR * 0.5), o = new Float32Array(len);
  let p = 0;
  for (let i = 0; i < len; i++) { const n = rnd(); o[i] = (n - p * 0.7) * Math.pow(i / len, 2.2) * 0.5; p = n; }
  add(14.5, o, 0.5);
}

// lo-fi character: gentle low-pass + soft saturation + a touch of vinyl hiss
let yl = 0, yr = 0;
const a = 1 - Math.exp(-2 * Math.PI * 8500 / SR);
let peak = 0;
for (let i = 0; i < N; i++) {
  yl += a * (L[i] - yl); yr += a * (R[i] - yr);
  L[i] = Math.tanh(yl * 1.25) + rnd() * 0.0025;
  R[i] = Math.tanh(yr * 1.25) + rnd() * 0.0025;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.85 / peak;

function writeWav(file, l, r, gain) {
  const n = l.length, buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(l[i] * gain * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(r[i] * gain * 32767))), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}

const OUT = path.join(__dirname, "assets");
fs.mkdirSync(OUT, { recursive: true });
writeWav(path.join(OUT, "music-v2.wav"), L, R, norm);

// ── UI sound effects ──
function sfxClick() { // soft, short "tap": tick + low thump
  const len = Math.round(SR * 0.09), o = new Float32Array(len);
  let p = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, n = rnd(), hp = n - p * 0.9; p = n;
    o[i] = hp * 0.5 * Math.exp(-t * 90) + Math.sin(2 * Math.PI * 1450 * t) * 0.5 * Math.exp(-t * 60) + Math.sin(2 * Math.PI * 260 * t) * 0.5 * Math.exp(-t * 45);
  }
  return o;
}
function sfxChime() { // bright two-note "booked ✓" ping
  const len = Math.round(SR * 0.9), o = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const n1 = Math.sin(2 * Math.PI * 1318.5 * t) * Math.exp(-t * 6.5);
    const t2 = Math.max(0, t - 0.11);
    const n2 = t >= 0.11 ? Math.sin(2 * Math.PI * 1975.5 * t2) * Math.exp(-t2 * 5.5) : 0;
    o[i] = (n1 * 0.55 + n2 * 0.6 + 0.12 * Math.sin(2 * Math.PI * 3951 * t) * Math.exp(-t * 12)) * Math.min(1, t / 0.004);
  }
  return o;
}
const c = sfxClick(), ch = sfxChime();
writeWav(path.join(OUT, "sfx-click.wav"), c, c, 0.8);
writeWav(path.join(OUT, "sfx-chime.wav"), ch, ch, 0.8);
console.log(`wrote music-v2.wav (${DUR}s @ ${BPM} BPM), sfx-click.wav, sfx-chime.wav`);
