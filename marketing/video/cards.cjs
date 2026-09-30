// Renders the title cards and caption overlays (1080x1920 PNGs) for the promo.
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "assets");
fs.mkdirSync(OUT, { recursive: true });

const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;700;900&display=swap" rel="stylesheet">`;
const BASE = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:1080px;height:1920px;font-family:'DM Sans',sans-serif;overflow:hidden}
  .mark{position:absolute;top:110px;left:0;right:0;text-align:center;font-size:64px;font-weight:900;letter-spacing:-.04em}
  .mark em{font-style:italic;color:#2563EB}
`;

const cards = {
  "card-hook": `
    <style>${BASE} body{background:#111116;color:#fff}
      .mark{color:#fff} .mark em{color:#60A5FA}
      .wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 90px}
      h1{font-size:150px;line-height:.95;font-weight:900;letter-spacing:-.06em}
      h1 span{color:#60A5FA}
      p{margin-top:56px;font-size:46px;line-height:1.35;color:rgba(255,255,255,.62);font-weight:500}
    </style>
    <div class="mark">book<em>rightly</em></div>
    <div class="wrap"><h1>Still taking bookings over <span>DM?</span></h1><p>There's a better way — and it's free to start.</p></div>`,
  "card-features": `
    <style>${BASE} body{background:#f4f1e9;color:#111116}
      .wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 80px}
      h1{font-size:118px;line-height:.98;font-weight:900;letter-spacing:-.055em;margin-bottom:80px}
      h1 span{color:#2563EB}
      .row{display:flex;align-items:center;gap:36px;background:#fff;border:2px solid #dedcd3;border-radius:44px;padding:44px 48px;margin-bottom:28px;font-size:50px;font-weight:700;letter-spacing:-.02em}
      .tick{flex:none;width:84px;height:84px;border-radius:50%;background:#2563EB;color:#fff;display:grid;place-items:center;font-size:52px;font-weight:900}
    </style>
    <div class="mark">book<em>rightly</em></div>
    <div class="wrap"><h1>No-shows?<br><span>Handled.</span></h1>
      <div class="row"><div class="tick">✓</div>Deposits taken at booking</div>
      <div class="row"><div class="tick">✓</div>Confirmation &amp; reminder emails</div>
      <div class="row"><div class="tick">✓</div>0% commission. Ever.</div>
    </div>`,
  "card-cta": `
    <style>${BASE} body{background:#2563EB;color:#fff}
      .mark{color:#fff} .mark em{color:#BFDBFE}
      .wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 80px}
      h1{font-size:170px;line-height:.92;font-weight:900;letter-spacing:-.065em}
      p{margin-top:56px;font-size:48px;line-height:1.35;color:rgba(255,255,255,.82);font-weight:500}
      .pill{margin-top:80px;background:#fff;color:#111116;border-radius:999px;padding:44px 90px;font-size:64px;font-weight:900;letter-spacing:-.03em}
    </style>
    <div class="mark">book<em>rightly</em></div>
    <div class="wrap"><h1>Start free today</h1><p>90-day free trial on paid plans.<br>No card needed. Free plan forever.</p><div class="pill">bookrightly.co.uk</div></div>`,
};

// Transparent caption pills laid over the screen recordings.
const captions = {
  "cap-home": ["Meet Bookrightly", "Booking software for UK barbers, salons, PTs & trades"],
  "cap-demo": ["Your own booking page", "Branded to you, live in minutes"],
  "cap-times": ["Clients pick a real, open time", ""],
  "cap-form": ["Booked in seconds — no DMs", ""],
  "cap-pricing": ["Free plan. Paid from £5.", "Zero commission. Ever."],
};
const captionHTML = ([title, sub]) => `
  <style>${BASE} html,body{background:transparent}
    .box{position:absolute;left:60px;right:60px;bottom:170px;background:rgba(17,17,22,.9);border-radius:56px;padding:52px 56px;text-align:center;color:#fff;box-shadow:0 30px 80px rgba(0,0,0,.35)}
    .t{font-size:78px;line-height:1.02;font-weight:900;letter-spacing:-.045em}
    .s{margin-top:${sub ? 22 : 0}px;font-size:42px;line-height:1.3;color:rgba(255,255,255,.72);font-weight:500}
  </style><div class="box"><div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ""}</div>`;

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  const shoot = async (name, html, transparent) => {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}</head><body>${html}</body></html>`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await Promise.race([page.evaluate(() => document.fonts.load("900 40px 'DM Sans'").then(() => document.fonts.ready)), new Promise(r => setTimeout(r, 8000))]);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, `${name}.png`), omitBackground: !!transparent });
    console.log("wrote", name);
  };
  for (const [name, html] of Object.entries(cards)) await shoot(name, html, false);
  for (const [name, c] of Object.entries(captions)) await shoot(name, captionHTML(c), true);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
