// Builds the v2 promo: ~18s, cuts on the beat of the 120 BPM soundtrack.
//   node build-v2.cjs           -> bookrightly-promo-v2.mp4       (1080x1920, 9:16)
//   node build-v2.cjs --feed    -> bookrightly-promo-v2-feed.mp4  (1080x1350, 4:5)
// Prereqs: record-v2.cjs (clips), cards-v2.cjs (visuals), music-v2.cjs (audio).
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FEED = process.argv.includes("--feed");
const F = FEED ? { name: "feed", W: 1080, H: 1350, bandBottom: 1290 } : { name: "reel", W: 1080, H: 1920, bandBottom: 1400 };
// The whole 9:16 screen recording, uncropped: full canvas for reels, full height (centred) for the 4:5 feed.
const WIN = FEED ? { x: 160, w: 760, h: 1350 } : { x: 0, w: 1080, h: 1920 };
const D = __dirname;
const TMP = path.join(D, `tmp-${F.name}`);
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const T = 0.2;      // transition length (150–250ms per the brief)
const PAD = T / 2;  // each scene is padded so the cut lands mid-transition, on the beat
const BOUNDS = [0, 2.5, 5.0, 8.0, 11.0, 13.5, 15.0, 18.0]; // all multiples of a beat @120 BPM
const DUR = BOUNDS.map((b, i) => (i === BOUNDS.length - 1 ? 0 : BOUNDS[i + 1] - b + (i === 0 ? PAD : T)));
DUR.pop();
DUR[DUR.length - 1] = 18.0 - (BOUNDS[BOUNDS.length - 2] - PAD) ; // last scene runs to 18.0s exactly

const ff = args => execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: "inherit" });
const png = n => path.join(D, "assets", "v2", `${F.name}-${n}.png`);
const clip = n => path.join(D, "clips", `v2-${n}.webm`);
const loopIn = (file, dur) => ["-loop", "1", "-framerate", "30", "-t", String(dur), "-i", file];
const enc = out => ["-r", "30", "-c:v", "libx264", "-crf", "14", "-preset", "fast", "-pix_fmt", "yuv420p", "-an", out];
const seg = name => path.join(TMP, `${name}.mp4`);
const marks = JSON.parse(fs.readFileSync(path.join(D, "clips", "v2-flow.json"), "utf8"));

// A background + text layers that slide up / fade in at chosen times.
function layerScene(name, dur, bg, layers) {
  const inputs = [...loopIn(png(bg), dur)];
  layers.forEach(l => inputs.push(...loopIn(png(l.file), dur)));
  let fc = `[0:v]format=rgba[c0]`, cur = "c0";
  layers.forEach((l, i) => {
    fc += `;[${i + 1}:v]format=rgba,fade=t=in:st=${l.st}:d=0.22:alpha=1[l${i}]`;
    fc += `;[${cur}][l${i}]overlay=x=0:y='min(${l.dy},max(0,${l.dy}*(1-(t-${l.st})/0.25)))':format=auto[c${i + 1}]`;
    cur = `c${i + 1}`;
  });
  fc += `;[${cur}]format=yuv420p[o]`;
  ff([...inputs, "-filter_complex", fc, "-map", "[o]", "-t", String(dur), ...enc(seg(name))]);
}

// Phone-window scene: a cropped, gently panning slice of a screen recording
// shown through the frame's rounded window.
function screenScene(name, dur, frame, { webm, ss, y0, dy }) {
  const inputs = ["-ss", String(ss), "-t", String(dur + 0.5), "-i", clip(webm), ...loopIn(png(frame), dur)];
  const fc = [
    `[0:v]fps=30,tpad=stop_mode=clone:stop_duration=0.6,trim=duration=${dur},setpts=PTS-STARTPTS,scale=${WIN.w}:${WIN.h}:flags=lanczos,setsar=1[m]`,
    `color=c=#111116:s=${F.W}x${F.H}:r=30:d=${dur}[base]`,
    `[base][m]overlay=x=${WIN.x}:y=0[b]`,
    `[1:v]format=rgba[f]`,
    `[b][f]overlay=0:0:format=auto,format=yuv420p[o]`,
  ].join(";");
  ff([...inputs, "-filter_complex", fc, "-map", "[o]", "-t", String(dur), ...enc(seg(name))]);
}

// Booking flow: tap a date, tap a time (recorded), then jump straight to the
// appointment summary (a crisp still of the real page, deposit shown) with a
// "Booked ✓" badge popping on.
function flowScene(name, dur, aDur) {
  const inputs = [
    "-ss", "0", "-t", String(aDur + 0.5), "-i", clip("flow"),
    ...loopIn(path.join(D, "clips", "v2-flow-summary.png"), dur - aDur),
    ...loopIn(png("frame-flow"), dur),
    ...loopIn(png("badge"), dur),
  ];
  const fc = [
    `[0:v]fps=30,tpad=start_mode=clone:start_duration=${A_PAD}:stop_mode=clone:stop_duration=0.6,trim=duration=${aDur},setpts=PTS-STARTPTS,scale=${WIN.w}:${WIN.h}:flags=lanczos,setsar=1,format=yuv420p[a]`,
    `[1:v]fps=30,scale=${WIN.w}:${WIN.h}:flags=lanczos,setsar=1,format=yuv420p[b]`,
    `[a][b]concat=n=2:v=1:a=0[m]`,
    `color=c=#111116:s=${F.W}x${F.H}:r=30:d=${dur}[base]`,
    `[base][m]overlay=x=${WIN.x}:y=0[b1]`,
    `[2:v]format=rgba[f]`,
    `[b1][f]overlay=0:0:format=auto[b2]`,
    `[3:v]format=rgba,fade=t=in:st=${aDur}:d=0.2:alpha=1[bd]`,
    `[b2][bd]overlay=x=0:y='min(44,max(0,44*(1-(t-${aDur})/0.25)))':format=auto,format=yuv420p[o]`,
  ].join(";");
  ff([...inputs, "-filter_complex", fc, "-map", "[o]", "-t", String(dur), ...enc(seg(name))]);
}

function ctaScene(name, dur) {
  ff(["-loop", "1", "-framerate", "30", "-t", String(dur), "-i", png("cta"),
    "-vf", `zoompan=z='1+0.0004*in':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${F.W}x${F.H}:fps=30,setsar=1,format=yuv420p`,
    ...enc(seg(name))]);
}

// ── scenes (see BOUNDS) ──
const A_DUR = 1.5;  // recorded tap sequence — cut before the page-transition spinner
const A_PAD = 0.1;  // clone-frame lead-in so the first tap lands exactly on the 8.5s beat
layerScene("s0", DUR[0], "hook-bg", [{ file: "hook-h", st: 0.15, dy: 70 }, { file: "hook-s", st: 0.75, dy: 50 }]);
screenScene("s1", DUR[1], "frame-dash", { webm: "home", ss: 1.3 });
screenScene("s2", DUR[2], "frame-site", { webm: "demo", ss: 1.4 });
flowScene("s3", DUR[3], A_DUR);
layerScene("s4", DUR[4], "feat-bg", [
  { file: "feat-h", st: 0.1, dy: 50 }, { file: "feat-r1", st: 0.6, dy: 44 },
  { file: "feat-r2", st: 1.1, dy: 44 }, { file: "feat-r3", st: 1.6, dy: 44 }]);
layerScene("s5", DUR[5], "price-bg", [{ file: "price-h", st: 0.1, dy: 50 }, { file: "price-s", st: 0.6, dy: 40 }]);
ctaScene("s6", DUR[6]);

// ── video: quick cuts / slides / zooms on the beat ──
const trans = ["slideleft", "slideleft", "slideleft", "slidedown", "slideup", "circleopen"]; // (xfade "zoomin" flashes blank at its midpoint — avoided)
const inputs = DUR.flatMap((_, i) => ["-i", seg(`s${i}`)]);
let chain = "", last = "[0:v]", len = DUR[0];
for (let i = 1; i < DUR.length; i++) {
  const label = i === DUR.length - 1 ? "[vout]" : `[x${i}]`;
  chain += `${last}[${i}:v]xfade=transition=${trans[i - 1]}:duration=${T}:offset=${(len - T).toFixed(2)}${label};`;
  last = label;
  len += DUR[i] - T;
}
const videoOnly = path.join(TMP, "video.mp4");
ff([...inputs, "-filter_complex", chain.slice(0, -1), "-map", "[vout]", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an", videoOnly]);

// ── audio: music normalised to -14 LUFS, UI sfx synced to the recorded taps, fades ──
const TARGET = -14;
const music = path.join(D, "assets", "music-v2.wav");
const sceneStart = BOUNDS[3] - PAD; // global time at which the flow scene's local t=0 falls
const sfx = [
  { file: "sfx-click.wav", t: sceneStart + A_PAD + marks.dateTap, vol: 1.0 },              // date tap
  { file: "sfx-click.wav", t: sceneStart + A_PAD + marks.timeTap, vol: 1.0 },              // time tap
  { file: "sfx-chime.wav", t: sceneStart + A_DUR + 0.1, vol: 0.9 },                // "Booked ✓" (lands on the 9.5s beat)
];
function measure(filterChain, inputs) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...inputs, "-filter_complex", filterChain, "-f", "null", "-"], { encoding: "utf8" });
  const m = r.stderr.match(/I:\s+(-?[\d.]+) LUFS/g);
  return m ? parseFloat(m[m.length - 1].replace(/[^-\d.]/g, "")) : NaN;
}
// pass 1: measure the music alone and set its gain to hit the target
const musicMeasured = measure(`[0:a]atrim=0:18,ebur128=peak=true`, ["-i", music]);
const musicGain = TARGET - musicMeasured;
const sfxInputs = sfx.flatMap(s => ["-i", path.join(D, "assets", s.file)]);
const mix = [
  `[0:a]atrim=0:18,asetpts=PTS-STARTPTS,volume=${musicGain.toFixed(2)}dB[m]`,
  ...sfx.map((s, i) => `[${i + 1}:a]adelay=${Math.round(s.t * 1000)}|${Math.round(s.t * 1000)},volume=${s.vol}[x${i}]`),
  `[m]${sfx.map((_, i) => `[x${i}]`).join("")}amix=inputs=${sfx.length + 1}:normalize=0:duration=first[mx]`,
];
// pass 2: iterate the final trim so that, AFTER the true-peak ceiling is applied,
// the finished mix (music + sfx) still measures at the target loudness. The
// ceiling is -2 dBFS: AAC encoding adds inter-sample overshoot, and a -1 dBFS
// limit measured +0.5 dBTP on the finished file.
const CEIL = 0.79;
let trim = 0;
for (let k = 0; k < 3; k++) {
  const m = measure(mix.join(";") + `;[mx]volume=${trim.toFixed(2)}dB,alimiter=limit=${CEIL}:level=0[o];[o]ebur128=peak=true`, ["-i", music, ...sfxInputs]);
  if (Number.isFinite(m)) trim += TARGET - m;
}
const audioChain = mix.join(";") + `;[mx]volume=${trim.toFixed(2)}dB,alimiter=limit=${CEIL}:level=0,afade=t=in:st=0:d=0.5,afade=t=out:st=17:d=1[aout]`;
const audioOnly = path.join(TMP, "audio.m4a");
ff(["-i", music, ...sfxInputs, "-filter_complex", audioChain, "-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", audioOnly]);

const OUT = path.join(D, FEED ? "bookrightly-promo-v2-feed.mp4" : "bookrightly-promo-v2.mp4");
ff(["-i", videoOnly, "-i", audioOnly, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-t", "18.0", "-movflags", "+faststart", OUT]);
const finalLufs = measure(`[0:a]ebur128=peak=true`, ["-i", OUT]);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`built ${OUT}  (~${len.toFixed(2)}s video, music gain ${musicGain.toFixed(1)} dB, final ≈ ${finalLufs} LUFS)`);
