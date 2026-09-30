// Assembles clips + cards + captions into marketing/video/bookrightly-promo.mp4
// (1080x1920, 30fps, H.264, silent — add trending audio in TikTok/Instagram).
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const D = __dirname;
const TMP = path.join(D, "tmp");
fs.mkdirSync(TMP, { recursive: true });
const L = process.argv.includes("--landscape");
const W = L ? 1920 : 1080, H = L ? 1080 : 1920, SUF = L ? "-land" : "";
const FADE = 0.4; // seconds of cross-fade between scenes

const ff = args => execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: "inherit" });

// Screen-recording segment: trim, upscale to 1080x1920, optional caption pill.
function clipSegment(name, clip, ss, dur, cap) {
  const out = path.join(TMP, `${name}.mp4`);
  const inputs = ["-ss", String(ss), "-t", String(dur), "-i", path.join(D, "clips", `${clip}${SUF}.webm`)];
  let fc = `[0:v]fps=30,scale=${W}:${H}:flags=lanczos,setsar=1,format=yuv420p[v]`;
  if (cap) {
    inputs.push("-loop", "1", "-t", String(dur), "-i", path.join(D, "assets", `${cap}${SUF}.png`));
    fc += `;[1:v]format=rgba,fade=t=in:st=0.5:d=0.4:alpha=1,fade=t=out:st=${(dur - 0.7).toFixed(2)}:d=0.4:alpha=1[c];[v][c]overlay=0:0:format=auto,format=yuv420p[o]`;
  } else fc += `;[v]null[o]`;
  ff([...inputs, "-filter_complex", fc, "-map", "[o]", "-r", "30", "-c:v", "libx264", "-crf", "14", "-preset", "fast", "-an", out]);
  return { file: out, dur };
}

// Title-card segment with a slow push-in so it isn't dead still.
function cardSegment(name, card, dur) {
  const out = path.join(TMP, `${name}.mp4`);
  // Looped still: each input frame is its own frame, so zoompan runs with
  // d=1 and the zoom is driven by the input frame number (`in`).
  ff(["-loop", "1", "-framerate", "30", "-t", String(dur), "-i", path.join(D, "assets", `${card}${SUF}.png`),
    "-vf", `zoompan=z='1+0.0005*in':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=30,setsar=1,format=yuv420p`,
    "-r", "30", "-c:v", "libx264", "-crf", "14", "-preset", "fast", "-an", out]);
  return { file: out, dur };
}

// Trim points differ per orientation: the desktop recordings scroll and load
// at different moments than the phone ones.
const T = L
  ? { home: [0.5, 4.5], demo: [0.8, 7.0], flowA: [1.6, 3.4], flowB: [6.2, 6.2], pricing: [3.0, 6.5] }
  : { home: [2.0, 4.5], demo: [2.2, 7.0], flowA: [2.0, 3.0], flowB: [6.3, 6.0], pricing: [3.4, 6.5] };
const segments = [
  cardSegment("s1", "card-hook", 3.0),
  clipSegment("s2", "home", ...T.home, "cap-home"),
  clipSegment("s3", "demo", ...T.demo, "cap-demo"),
  clipSegment("s4", "flow", ...T.flowA, "cap-times"),
  clipSegment("s5", "flow", ...T.flowB, "cap-form"),
  cardSegment("s6", "card-features", 3.5),
  clipSegment("s7", "pricing", ...T.pricing, "cap-pricing"),
  cardSegment("s8", "card-cta", 4.0),
];

// Chain of xfades.
const inputs = segments.flatMap(s => ["-i", s.file]);
let chain = "", last = "[0:v]", elapsed = segments[0].dur;
for (let i = 1; i < segments.length; i++) {
  const offset = (elapsed - FADE).toFixed(2);
  const label = i === segments.length - 1 ? "[vout]" : `[x${i}]`;
  chain += `${last}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset}${label};`;
  last = label;
  elapsed += segments[i].dur - FADE;
}
const total = elapsed;
const OUT = path.join(D, L ? "bookrightly-promo-landscape.mp4" : "bookrightly-promo.mp4");
ff([...inputs, "-f", "lavfi", "-t", total.toFixed(2), "-i", "anullsrc=r=44100:cl=stereo",
  "-filter_complex", chain.slice(0, -1), "-map", "[vout]", "-map", `${segments.length}:a`,
  "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30",
  "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-shortest", OUT]);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`built ${OUT} (~${total.toFixed(1)}s)`);
