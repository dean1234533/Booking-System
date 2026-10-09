// Synthesises a calm, ~85 BPM ambient pad instrumental for the homepage
// "how it works" explainer — no drums, no beat-sync (this video uses plain
// crossfades, not quick cuts). Generated from scratch, so royalty-free by
// construction. Same synthesis/WAV-writing technique as music-v2.cjs.
// Output: assets/explainer/music-explainer.wav
const fs = require("fs");
const path = require("path");

const SR = 44100;
const DUR = 42; // padded beyond the ~37s edit; build-explainer.cjs trims + fades it
const N = Math.ceil(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);

let seed = 987654;
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

// Soft electric-piano-ish pad: slow attack, long decay, gentle detune.
function pad(f, dur) {
  const len = Math.round(SR * dur), o = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const e = Math.min(1, t / 0.6) * Math.min(1, (dur - t) / 0.8);
    o[i] = (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t)
      + 0.18 * Math.sin(2 * Math.PI * f * 2 * t)) * e * 0.4;
  }
  return o;
}
// A soft, breathy pluck for the occasional top-line note.
function pluck(f, dur = 1.1) {
  const len = Math.round(SR * dur), o = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR, e = Math.min(1, t / 0.02) * Math.exp(-t * 1.6);
    o[i] = Math.sin(2 * Math.PI * f * t) * e * 0.22;
  }
  return o;
}
function sub(f, dur) {
  const len = Math.round(SR * dur), o = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR, e = Math.min(1, t / 0.4) * Math.min(1, (dur - t) / 0.6);
    o[i] = Math.sin(2 * Math.PI * f * t) * e * 0.35;
  }
  return o;
}

// Cmaj9 -> Am7 -> Fmaj7 -> Gsus, 4 bars each at a slow, unhurried pace.
const BAR = 4.6;
const PROGRESSION = [
  { root: 65.41, notes: [261.63, 329.63, 392.0, 493.88] },   // C
  { root: 55.00, notes: [220.0, 261.63, 329.63, 440.0] },    // Am
  { root: 87.31, notes: [174.61, 261.63, 329.63, 440.0] },   // F
  { root: 49.00, notes: [196.0, 246.94, 293.66, 392.0] },    // G
];
const TOP = [523.25, 587.33, 659.25, 783.99, 880.0];
const bars = Math.ceil(DUR / BAR);
for (let bar = 0; bar < bars; bar++) {
  const b0 = bar * BAR;
  const ch = PROGRESSION[bar % PROGRESSION.length];
  add(b0, sub(ch.root, BAR + 0.6), 0.6);
  ch.notes.forEach((f, i) => add(b0, pad(f, BAR + 0.6), 0.22, (i - 1.5) * 0.22));
  // sparse, breathy top-line — only in the middle section so it doesn't feel busy
  if (bar >= 1 && bar <= bars - 3 && bar % 2 === 0) {
    const n1 = TOP[(bar * 2) % TOP.length], n2 = TOP[(bar * 2 + 2) % TOP.length];
    add(b0 + 0.8, pluck(n1), 0.5, -0.25);
    add(b0 + 2.6, pluck(n2), 0.4, 0.25);
  }
}

// Gentle low-pass + soft saturation for warmth (no vinyl hiss — too busy under speech-free narration captions).
let yl = 0, yr = 0;
const a = 1 - Math.exp(-2 * Math.PI * 6000 / SR);
let peak = 0;
for (let i = 0; i < N; i++) {
  yl += a * (L[i] - yl); yr += a * (R[i] - yr);
  L[i] = Math.tanh(yl * 1.05);
  R[i] = Math.tanh(yr * 1.05);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.82 / peak;

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

const OUT = path.join(__dirname, "assets", "explainer");
fs.mkdirSync(OUT, { recursive: true });
writeWav(path.join(OUT, "music-explainer.wav"), L, R, norm);
console.log(`wrote music-explainer.wav (${DUR}s)`);
