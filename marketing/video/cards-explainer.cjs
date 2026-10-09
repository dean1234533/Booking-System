// Title/CTA cards + lower-third captions for the homepage "how it works"
// explainer (clickable video, not an autoplay loop — calmer pacing, no
// beat-sync needed). Same visual language as cards-landscape.cjs.
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "assets", "explainer");
fs.mkdirSync(OUT, { recursive: true });

const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;700;900&display=swap" rel="stylesheet">`;
const BASE = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:1280px;height:800px;font-family:'DM Sans',sans-serif;overflow:hidden}
  .mark{position:absolute;top:44px;left:64px;font-size:34px;font-weight:900;letter-spacing:-.04em}
  .mark em{font-style:italic;color:#2563EB}
`;

const cards = {
  "card-ex-intro": `
    <style>${BASE} body{background:#111116;color:#fff}
      .mark{color:#fff} .mark em{color:#60A5FA}
      .wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 120px}
      h1{font-size:76px;line-height:1.05;font-weight:900;letter-spacing:-.045em}
      h1 span{color:#60A5FA}
      p{margin-top:28px;font-size:28px;color:rgba(255,255,255,.62);font-weight:500}
    </style>
    <div class="mark">book<em>rightly</em></div>
    <div class="wrap"><h1>How <span>Bookrightly</span> works</h1><p>From sign-up to your first booking — in under 2 minutes.</p></div>`,
  "card-ex-cta": `
    <style>${BASE} body{background:#2563EB;color:#fff}
      .mark{color:#fff} .mark em{color:#BFDBFE}
      .wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
      h1{font-size:84px;line-height:1.02;font-weight:900;letter-spacing:-.05em}
      p{margin-top:22px;font-size:28px;line-height:1.35;color:rgba(255,255,255,.85);font-weight:500}
      .pill{margin-top:38px;background:#fff;color:#111116;border-radius:999px;padding:20px 54px;font-size:34px;font-weight:900;letter-spacing:-.02em}
    </style>
    <div class="mark">book<em>rightly</em></div>
    <div class="wrap"><h1>Start free today</h1><p>No card needed. Free plan, forever.</p><div class="pill">bookrightly.co.uk</div></div>`,
};

const captions = {
  "cap-ex-1": ["1. Create your free account", "No card needed — just a name and email"],
  "cap-ex-2a": ["2. Add your business details", ""],
  "cap-ex-2b": ["Claim your free booking link", "Yours to share anywhere — Instagram, WhatsApp, Google"],
  "cap-ex-2c": ["Set your weekly availability", ""],
  "cap-ex-2d": ["You're live — ready to take bookings", ""],
  "cap-ex-3": ["3. Clients book directly", "No more back-and-forth DMs"],
};
const captionHTML = ([title, sub]) => `
  <style>${BASE} html,body{background:transparent}
    .box{position:absolute;left:56px;bottom:56px;max-width:900px;background:rgba(17,17,22,.92);border-radius:28px;padding:26px 36px;color:#fff;box-shadow:0 16px 46px rgba(0,0,0,.35)}
    .t{font-size:34px;line-height:1.1;font-weight:900;letter-spacing:-.03em}
    .s{margin-top:${sub ? 10 : 0}px;font-size:20px;line-height:1.3;color:rgba(255,255,255,.74);font-weight:500}
  </style><div class="box"><div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ""}</div>`;

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  const shoot = async (name, html, transparent) => {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}</head><body>${html}</body></html>`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await Promise.race([page.evaluate(() => document.fonts.load("900 40px 'DM Sans'").then(() => document.fonts.ready)), new Promise(r => setTimeout(r, 8000))]);
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(OUT, `${name}.png`), omitBackground: !!transparent });
    console.log("wrote", name);
  };
  for (const [name, html] of Object.entries(cards)) await shoot(name, html, false);
  for (const [name, c] of Object.entries(captions)) await shoot(name, captionHTML(c), true);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
