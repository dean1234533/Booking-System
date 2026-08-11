const puppeteer = require("puppeteer");
const path = require("path");

const BASE = "https://bookrightly.co.uk";
const OUT = path.join(__dirname, "../public/images");

const PAGES = [
  { url: "/tools", name: "screenshot-tools-hub.png" },
  { url: "/tools/no-show-calculator", name: "screenshot-tools-noshow.png" },
  { url: "/tools/revenue-calculator", name: "screenshot-tools-revenue.png" },
  { url: "/tools/pt-rate-calculator", name: "screenshot-tools-pt-rate.png" },
  { url: "/tools/service-pricing-calculator", name: "screenshot-tools-pricing.png" },
];

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  for (const { url, name } of PAGES) {
    const fullUrl = BASE + url;
    console.log(`Capturing ${fullUrl}...`);
    await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));
    const outPath = path.join(OUT, name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`  Saved → ${outPath}`);
  }

  await browser.close();
  console.log("Done.");
})();
