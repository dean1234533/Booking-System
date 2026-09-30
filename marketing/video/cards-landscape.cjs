// Landscape (1920x1080) title cards + lower-third captions for the promo.
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "assets");
fs.mkdirSync(OUT, { recursive: true });

const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;700;900&display=swap" rel="stylesheet">`;
const BASE = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:1920px;height:1080px;font-family:'DM Sans',sans-serif;overflow:hidden}
  .mark{position:absolute;top:70px;left:110px;font-size:56px;font-weight:900;letter-spacing:-.04em}
  .mark em{font-style:italic;color:#2563EB}
`;

const cards = {
  "card-hook-land": `
    <style>${BASE} body{background:#111116;color:#fff}
      .mark{color:#fff} .mark em{color:#60A5FA}
      .wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 140px}
      h1{font-size:190px;line-height:.95;font-weight:900;letter-spacing:-.06em;max-width:1500px}
      h1 span{color:#60A5FA}
      p{margin-top:56px;font-size:50px;color:rgba(255,255,255,.62);font-weight:500}
    </style>
    <div class="mark">book<em>rightly</em></div>
    <div class="wrap"><h1>Still taking bookings over <span>DM?</span></h1><p>There's a better way — and it's free to start.</p></div>`,
  "card-features-land": `
    <style>${BASE} body{background:#f4f1e9;color:#111116}
      .wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 130px}
      h1{font-size:170px;line-height:.95;font-weight:900;letter-spacing:-.06em}
      h1 span{color:#2563EB}
      .rows{width:860px}
      .row{display:flex;align-items:center;gap:36px;background:#fff;border:2px solid #dedcd3;border-radius:48px;padding:42px 50px;margin-bottom:30px;font-size:50px;font-weight:700;letter-spacing:-.02em}
      .tick{flex:none;width:88px;height:88px;border-radius:50%;background:#2563EB;color:#fff;display:grid;place-items:center;font-size:54px;font-weight:900}
    </style>
    <div class="mark">book<em>rightly</em></div>
    <div class="wrap"><h1>No-shows?<br><span>Handled.</span></h1>
      <div class="rows">
        <div class="row"><div class="tick">✓</div>Deposits taken at booking</div>
        <div class="row"><div class="tick">✓</div>Confirmation &amp; reminder emails</div>
        <div class="row"><div class="tick">✓</div>0% commission. Ever.</div>
      </div></div>`,
  "card-cta-land": `
    <style>${BASE} body{background:#2563EB;color:#fff}
      .mark{color:#fff} .mark em{color:#BFDBFE}
      .wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
      h1{font-size:220px;line-height:.92;font-weight:900;letter-spacing:-.065em}
      p{margin-top:48px;font-size:52px;line-height:1.35;color:rgba(255,255,255,.85);font-weight:500}
      .pill{margin-top:70px;background:#fff;color:#111116;border-radius:999px;padding:38px 100px;font-size:72px;font-weight:900;letter-spacing:-.03em}
    </style>
    <div class="mark">book<em>rightly</em></div>
    <div class="wrap"><h1>Start free today</h1><p>90-day free trial on paid plans. No card needed. Free plan forever.</p><div class="pill">bookrightly.co.uk</div></div>`,
};

const captions = {
  "cap-home-land": ["Meet Bookrightly", "Booking software for UK barbers, salons, PTs & trades"],
  "cap-demo-land": ["Your own booking page", "Branded to you, live in minutes"],
  "cap-times-land": ["Clients pick a real, open time", ""],
  "cap-form-land": ["Booked in seconds — no DMs", ""],
  "cap-pricing-land": ["Free plan. Paid from £5.", "Zero commission. Ever."],
};
const captionHTML = ([title, sub]) => `
  <style>${BASE} html,body{background:transparent}
    .box{position:absolute;left:90px;bottom:80px;max-width:1250px;background:rgba(17,17,22,.92);border-radius:44px;padding:38px 56px;color:#fff;box-shadow:0 24px 70px rgba(0,0,0,.35)}
    .t{font-size:72px;line-height:1.02;font-weight:900;letter-spacing:-.045em}
    .s{margin-top:${sub ? 16 : 0}px;font-size:38px;line-height:1.3;color:rgba(255,255,255,.74);font-weight:500}
  </style><div class="box"><div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ""}</div>`;

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
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
