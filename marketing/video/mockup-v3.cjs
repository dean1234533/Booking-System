// v3: phone mockup of the dashboard for the 4:5 hook scene -> assets/v2/feed-hook-phone.png (1080x1350, transparent)
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const OUT = path.join(__dirname, "assets", "v2");
(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const p = await browser.newPage();
  await p.setViewport({ width: 432, height: 768, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("br_cookie_consent", "accepted"); sessionStorage.setItem("pwa_banner_dismissed", "1"); } catch {} });
  await p.goto("https://bookrightly.co.uk/", { waitUntil: "networkidle2", timeout: 45000 });
  await p.addStyleTag({ content: 'button[aria-label="Chat with Bookrightly"]{display:none !important}' });
  await new Promise(r => setTimeout(r, 1200));
  await p.evaluate(() => window.scrollTo(0, 690));
  await new Promise(r => setTimeout(r, 1200));
  const shot = path.join(OUT, "dash-screen.png");
  await p.screenshot({ path: shot });
  const b64 = fs.readFileSync(shot).toString("base64");
  const q = await browser.newPage();
  await q.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
  await q.setContent(`<!doctype html><body style="margin:0;width:1080px;height:1350px;background:transparent;overflow:hidden">
    <div style="position:absolute;left:250px;top:1010px;width:580px;height:1000px;border-radius:84px;background:#0b0b0e;padding:16px;box-shadow:0 0 0 3px #3a3b44,0 30px 80px rgba(0,0,0,.55)">
      <div style="width:100%;height:100%;border-radius:70px;overflow:hidden;background:#f4f1e9"><img src="data:image/png;base64,${b64}" style="width:100%;display:block"></div>
      <div style="position:absolute;left:50%;top:30px;transform:translateX(-50%);width:120px;height:30px;border-radius:20px;background:#0b0b0e"></div>
    </div></body>`);
  await q.screenshot({ path: path.join(OUT, "feed-hook-phone.png"), omitBackground: true });
  await browser.close();
  console.log("wrote feed-hook-phone.png");
})();
