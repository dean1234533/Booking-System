// v2 promo visuals for both formats:
//   reel: 1080x1920 (Instagram Reels/Stories/TikTok) — all key content inside
//         y=250..1400, 120px clear on the right for the Reels buttons.
//   feed: 1080x1350 (4:5 feed post) — same content, reframed.
// Writes assets/v2/<format>-*.png. Scene "frame" PNGs have a transparent,
// rounded window where the phone-screen recording shows through.
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "assets", "v2");
fs.mkdirSync(OUT, { recursive: true });

const FORMATS = {
  reel: { W: 1080, H: 1920, bandTop: 250, bandBottom: 1400, capY: 270, winY: 620, markY: 270 },
  feed: { W: 1080, H: 1350, bandTop: 60,  bandBottom: 1290, capY: 110, winY: 430, markY: 70 },
};
const WIN = { x: 110, w: 800, h: 780 };   // phone-screen window
const TEXT_X = 110, TEXT_W = 850;         // text column: ends at x=960 (120px right margin)

const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,500;0,700;0,900;1,900&display=swap" rel="stylesheet">`;
const base = F => `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${F.W}px;height:${F.H}px;font-family:'DM Sans',sans-serif;overflow:hidden;background:transparent}
  .mark{position:absolute;top:${F.markY}px;left:${TEXT_X}px;font-size:60px;font-weight:900;letter-spacing:-.04em}
  .mark em{font-style:italic;color:#2563EB}
  .band{position:absolute;left:${TEXT_X}px;width:${TEXT_W}px;top:${F.bandTop}px;height:${F.bandBottom - F.bandTop}px;display:flex;flex-direction:column;justify-content:center}
  .hide{visibility:hidden}
`;

const pages = F => {
  const B = base(F);
  const mark = c => `<div class="mark" style="color:${c.ink}">book<em style="color:${c.acc}">rightly</em></div>`;

  // ── caption + phone-window scene frames ──
  // caption card laid over the full-screen recording (inside the safe band)
  const frame = (bg, ink, sub, ring, acc, title, subtitle) => `
    <style>${B}
      .cap{position:absolute;left:${TEXT_X - 20}px;width:${TEXT_W + 40}px;top:${F.capY}px;padding:34px 40px 38px;border-radius:44px;background:${bg};border:4px solid ${ring};box-shadow:0 24px 60px rgba(0,0,0,.28);color:${ink}}
      .t{font-size:78px;line-height:1.02;font-weight:900;letter-spacing:-.045em}
      .t i{font-style:normal;color:${acc}}
      .s{margin-top:18px;font-size:42px;line-height:1.28;color:${sub};font-weight:500}
    </style>
    <div class="cap"><div class="t">${title}</div>${subtitle ? `<div class="s">${subtitle}</div>` : ""}</div>`;

  const P = {};
  P["frame-dash"] = { transparent: true, html: frame("#f4f1e9", "#111116", "#696a73", "#dedcd3", "#2563EB", "Meet <i>Bookrightly</i>", "Booking software for UK barbers, salons, PTs &amp; trades") };
  P["frame-site"] = { transparent: true, html: frame("#111116", "#ffffff", "rgba(255,255,255,.72)", "#2c2d36", "#60A5FA", "Your own <i>booking page</i>", "Branded to you, live in minutes") };
  P["frame-flow"] = { transparent: true, html: frame("#eaf2ff", "#111116", "#4a5568", "#c7d8f5", "#2563EB", "Booked in <i>seconds</i>", "") };

  // ── "Booked ✓" badge that pops onto the phone window at the booking moment ──
  P["badge"] = { transparent: true, html: `
    <style>${B}
      .b{position:absolute;left:${TEXT_X + TEXT_W - 340}px;top:${F.bandBottom - 210}px;background:#16a34a;color:#fff;border-radius:999px;padding:24px 46px;font-size:56px;font-weight:900;letter-spacing:-.03em;box-shadow:0 18px 40px rgba(22,163,74,.45)}
    </style><div class="b">Booked ✓</div>` };

  // ── hook (dark) ──
  const hook = (showH, showS) => `
    <style>${B}
      .h{font-size:134px;line-height:.95;font-weight:900;letter-spacing:-.06em;color:#fff}
      .h span{color:#60A5FA}
      .p{margin-top:52px;font-size:50px;line-height:1.3;color:rgba(255,255,255,.66);font-weight:500}
    </style>
    <div class="band"><div class="h ${showH ? "" : "hide"}">Still taking bookings over <span>DM?</span></div><div class="p ${showS ? "" : "hide"}">There's a better way — and it's free to start.</div></div>`;
  P["hook-bg"] = { transparent: false, bg: "#111116", html: `<style>${B}</style>${mark({ ink: "#fff", acc: "#60A5FA" })}` };
  P["hook-h"] = { transparent: true, html: hook(true, false) };
  P["hook-s"] = { transparent: true, html: hook(false, true) };

  // ── "No-shows? Handled." (cream) — ticks animate in one by one ──
  const feat = (showH, rows) => `
    <style>${B}
      .h{font-size:120px;line-height:.96;font-weight:900;letter-spacing:-.06em;color:#111116;margin-bottom:64px}
      .h span{color:#2563EB}
      .row{display:flex;align-items:center;gap:32px;background:#fff;border:2px solid #dedcd3;border-radius:44px;padding:36px 44px;margin-bottom:26px;font-size:48px;font-weight:700;letter-spacing:-.02em;color:#111116}
      .tick{flex:none;width:80px;height:80px;border-radius:50%;background:#2563EB;color:#fff;display:grid;place-items:center;font-size:50px;font-weight:900}
    </style>
    <div class="band">
      <div class="h ${showH ? "" : "hide"}">No-shows?<br><span>Handled.</span></div>
      ${["Deposits taken at booking", "Confirmation &amp; reminder emails", "0% commission. Ever."].map((t, i) =>
        `<div class="row ${rows.includes(i) ? "" : "hide"}"><div class="tick">✓</div>${t}</div>`).join("")}
    </div>`;
  P["feat-bg"] = { transparent: false, bg: "#f4f1e9", html: `<style>${B}</style>${mark({ ink: "#111116", acc: "#2563EB" })}` };
  P["feat-h"] = { transparent: true, html: feat(true, []) };
  P["feat-r1"] = { transparent: true, html: feat(false, [0]) };
  P["feat-r2"] = { transparent: true, html: feat(false, [1]) };
  P["feat-r3"] = { transparent: true, html: feat(false, [2]) };

  // ── pricing card (dark), big text only ──
  const price = (showH, showS) => `
    <style>${B}
      .h{font-size:108px;line-height:.98;font-weight:900;letter-spacing:-.06em;color:#fff}
      .h span{color:#60A5FA}
      .p{margin-top:52px;font-size:64px;line-height:1.2;color:rgba(255,255,255,.78);font-weight:700;letter-spacing:-.02em}
    </style>
    <div class="band"><div class="h ${showH ? "" : "hide"}">Free plan.<br><span>Paid from £5/mo.</span></div><div class="p ${showS ? "" : "hide"}">Zero commission. Ever.</div></div>`;
  P["price-bg"] = { transparent: false, bg: "#111116", html: `<style>${B}</style>${mark({ ink: "#fff", acc: "#60A5FA" })}` };
  P["price-h"] = { transparent: true, html: price(true, false) };
  P["price-s"] = { transparent: true, html: price(false, true) };

  // ── end card (unchanged design, moved into the safe area) ──
  P["cta"] = { transparent: false, bg: "#2563EB", html: `
    <style>${B}
      .cta{position:absolute;left:120px;width:840px;top:${F.bandTop}px;height:${F.bandBottom - F.bandTop}px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;color:#fff}
      h1{font-size:164px;line-height:.92;font-weight:900;letter-spacing:-.065em}
      p{margin-top:52px;font-size:48px;line-height:1.35;color:rgba(255,255,255,.85);font-weight:500}
      .pill{margin-top:72px;background:#fff;color:#111116;border-radius:999px;padding:42px 84px;font-size:64px;font-weight:900;letter-spacing:-.03em}
    </style>
    ${mark({ ink: "#fff", acc: "#BFDBFE" })}
    <div class="cta"><h1>Start free today</h1><p>90-day free trial on paid plans.<br>No card needed. Free plan forever.</p><div class="pill">bookrightly.co.uk</div></div>` };
  return P;
};

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  for (const [fname, F] of Object.entries(FORMATS)) {
    await page.setViewport({ width: F.W, height: F.H, deviceScaleFactor: 1 });
    for (const [name, def] of Object.entries(pages(F))) {
      const bg = def.bg ? `<style>html,body{background:${def.bg} !important}</style>` : "";
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}</head><body>${def.html}${bg}</body></html>`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await Promise.race([page.evaluate(() => document.fonts.load("900 40px 'DM Sans'").then(() => document.fonts.ready)), new Promise(r => setTimeout(r, 8000))]);
      await new Promise(r => setTimeout(r, 450));
      await page.screenshot({ path: path.join(OUT, `${fname}-${name}.png`), omitBackground: !!def.transparent });
      console.log("wrote", `${fname}-${name}`);
    }
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
