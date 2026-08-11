const puppeteer = require("puppeteer");
const path = require("path");

const BASE = "https://bookrightly.co.uk";
const OUT = path.join(__dirname, "../public/images");

const PAGES = [
  { url: "/",                                    name: "home" },
  { url: "/shop/S5s1FWMaz1XuAEo8gDSTTIqlqgL2",  name: "barber-profile" },
  { url: "/hairdresser/xyPHCqfFgoYympmcqUAzNS37URG3", name: "hairdresser-profile" },
  { url: "/pt-booking/Ih8OFcRzvuS3QbwtsYPeUFCnUEo1", name: "pt-profile" },
  { url: "/decorator/cKyzLBNBHuYKBS439GuE74UYEUv1",  name: "decorator-profile" },
  { url: "/tools",                               name: "tools-hub" },
  { url: "/tools/no-show-calculator",            name: "tools-noshow" },
  { url: "/tools/revenue-calculator",            name: "tools-revenue" },
  { url: "/tools/pt-rate-calculator",            name: "tools-ptrate" },
  { url: "/tools/service-pricing-calculator",    name: "tools-pricing" },
];

const VIEWPORTS = [
  { label: "desktop", width: 1280, height: 800 },
  { label: "mobile",  width: 390,  height: 844 },
];

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });

    for (const { url, name } of PAGES) {
      const fullUrl = BASE + url;
      console.log(`[${vp.label}] ${fullUrl}`);
      try {
        await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 20000 });
        await new Promise(r => setTimeout(r, 1200));
        const outPath = path.join(OUT, `ss-${vp.label}-${name}.png`);
        await page.screenshot({ path: outPath, fullPage: false });
        console.log(`  → ${outPath}`);
      } catch (e) {
        console.error(`  ERROR: ${e.message}`);
      }
    }

    await page.close();
  }

  await browser.close();
  console.log("Done.");
})();
