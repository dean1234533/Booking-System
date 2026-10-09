// Builds the homepage "how it works" explainer: a clickable video (not an
// autoplay loop), calmer pacing than the ad promos — plain crossfades, no
// beat-sync, no sfx. Prereqs: record-explainer.cjs (clips), cards-explainer.cjs
// (cards/captions), music-explainer.cjs (audio).
//   node build-explainer.cjs  ->  bookrightly-explainer.mp4 (1280x800)
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const D = __dirname;
const TMP = path.join(D, "tmp-explainer");
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const W = 1280, H = 800;
const T = 0.4; // crossfade duration — calm, not a quick-cut edit
const ff = args => execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: "inherit" });
const png = n => path.join(D, "assets", "explainer", `${n}.png`);
const clip = n => path.join(D, "clips", `${n}.webm`);
const loopIn = (file, dur) => ["-loop", "1", "-framerate", "30", "-t", String(dur), "-i", file];
const enc = out => ["-r", "30", "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p", "-an", out];
const seg = name => path.join(TMP, `${name}.mp4`);

// Measured via `ffmpeg -i <clip> -f null -` (webm screencasts have no
// reliable container duration metadata).
const RAW_DUR = { "ex-signup": 12.13, "ex-onboarding": 14.46, "ex-publicpage": 4.93 };
// Trim a touch off each clip's tail so the crossfade into the next scene
// doesn't linger on a static end frame.
const trimmed = name => RAW_DUR[name] - 0.3;

function cardScene(name, dur, cardPng) {
  ff([...loopIn(png(cardPng), dur), ...enc(seg(name))]);
}

// A raw screen recording, optionally with one or more lower-third captions
// that fade in/out at given times. captions: [{file, st, en}]
function screenScene(name, webm, dur, captions) {
  const inputs = ["-i", clip(webm), ...captions.flatMap(c => loopIn(png(c.file), dur))];
  let fc = `[0:v]fps=30,trim=duration=${dur},setpts=PTS-STARTPTS,scale=${W}:${H}:flags=lanczos,setsar=1,format=yuv420p[base]`;
  let cur = "base";
  captions.forEach((c, i) => {
    const fadeOutStart = c.en - 0.35;
    fc += `;[${i + 1}:v]format=rgba,fade=t=in:st=${c.st}:d=0.3:alpha=1,fade=t=out:st=${fadeOutStart}:d=0.35:alpha=1[cap${i}]`;
    fc += `;[${cur}][cap${i}]overlay=0:0:format=auto,format=yuv420p[s${i}]`;
    cur = `s${i}`;
  });
  ff([...inputs, "-filter_complex", fc, "-map", `[${cur}]`, "-t", String(dur), ...enc(seg(name))]);
}

// ── scenes ──
cardScene("c0", 3.0, "card-ex-intro");
screenScene("c1", "ex-signup", trimmed("ex-signup"), [
  { file: "cap-ex-1", st: 0.3, en: 4.0 },
]);
screenScene("c2", "ex-onboarding", trimmed("ex-onboarding"), [
  { file: "cap-ex-2a", st: 0.2, en: 1.5 },
  { file: "cap-ex-2b", st: 1.8, en: 7.0 },
  { file: "cap-ex-2c", st: 7.3, en: 10.8 },
  { file: "cap-ex-2d", st: 11.1, en: Math.min(trimmed("ex-onboarding") - 0.2, 13.8) },
]);
screenScene("c3", "ex-publicpage", trimmed("ex-publicpage"), [
  { file: "cap-ex-3", st: 0.3, en: trimmed("ex-publicpage") - 0.2 },
]);
cardScene("c4", 4.0, "card-ex-cta");

const SCENES = ["c0", "c1", "c2", "c3", "c4"];
const DUR = [3.0, trimmed("ex-signup"), trimmed("ex-onboarding"), trimmed("ex-publicpage"), 4.0];

// ── video: crossfade chain ──
const inputs = SCENES.flatMap(s => ["-i", seg(s)]);
let chain = "", last = "[0:v]", len = DUR[0];
for (let i = 1; i < SCENES.length; i++) {
  const label = i === SCENES.length - 1 ? "[vout]" : `[x${i}]`;
  chain += `${last}[${i}:v]xfade=transition=fade:duration=${T}:offset=${(len - T).toFixed(2)}${label};`;
  last = label;
  len += DUR[i] - T;
}
const videoOnly = path.join(TMP, "video.mp4");
ff([...inputs, "-filter_complex", chain.slice(0, -1), "-map", "[vout]", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an", videoOnly]);

// ── audio: calm pad bed, normalised to -16 LUFS (quieter than the beat-driven ad — this video leans on captions, not music, to carry attention) ──
const TARGET = -16;
const music = path.join(D, "assets", "explainer", "music-explainer.wav");
function measure(filterChain, inputs) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...inputs, "-filter_complex", filterChain, "-f", "null", "-"], { encoding: "utf8" });
  const m = r.stderr.match(/I:\s+(-?[\d.]+) LUFS/g);
  return m ? parseFloat(m[m.length - 1].replace(/[^-\d.]/g, "")) : NaN;
}
const musicMeasured = measure(`[0:a]atrim=0:${len.toFixed(2)},ebur128=peak=true`, ["-i", music]);
const musicGain = TARGET - musicMeasured;
const CEIL = 0.79;
let trim = 0;
for (let k = 0; k < 3; k++) {
  const chainA = `[0:a]atrim=0:${len.toFixed(2)},asetpts=PTS-STARTPTS,volume=${(musicGain + trim).toFixed(2)}dB,alimiter=limit=${CEIL}:level=0,afade=t=in:st=0:d=1,afade=t=out:st=${(len - 1.5).toFixed(2)}:d=1.5[o];[o]ebur128=peak=true`;
  const m = measure(chainA, ["-i", music]);
  if (Number.isFinite(m)) trim += TARGET - m;
}
const audioChain = `[0:a]atrim=0:${len.toFixed(2)},asetpts=PTS-STARTPTS,volume=${(musicGain + trim).toFixed(2)}dB,alimiter=limit=${CEIL}:level=0,afade=t=in:st=0:d=1,afade=t=out:st=${(len - 1.5).toFixed(2)}:d=1.5[aout]`;
const audioOnly = path.join(TMP, "audio.m4a");
ff(["-i", music, "-filter_complex", audioChain, "-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", audioOnly]);

const OUT = path.join(D, "bookrightly-explainer.mp4");
ff(["-i", videoOnly, "-i", audioOnly, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-t", len.toFixed(2), "-movflags", "+faststart", OUT]);
const finalLufs = measure(`[0:a]ebur128=peak=true`, ["-i", OUT]);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`built ${OUT}  (~${len.toFixed(2)}s, music gain ${musicGain.toFixed(1)} dB, final ≈ ${finalLufs} LUFS)`);
