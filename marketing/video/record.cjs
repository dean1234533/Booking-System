// Records the four live-site screen clips used in the promo video.
// Run from anywhere: node marketing/video/record.cjs
const puppeteer = require("puppeteer");
const path = require("path");

const OUT = path.join(__dirname, "clips");
const L = process.argv.includes("--landscape");
const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const S = n => (L ? Math.round(n * 0.62) : n); // scroll distances are tuned for a phone-height page
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Eased scroll so the motion looks deliberate on video (native smooth
// scrolling speed varies by content height).
async function glide(page, delta, ms) {
  await page.evaluate((delta, ms) => new Promise(resolve => {
    const start = window.scrollY, t0 = performance.now();
    const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    (function step(now) {
      const p = Math.min(1, (now - t0) / ms);
      window.scrollTo(0, start + delta * ease(p));
      p < 1 ? requestAnimationFrame(step) : resolve();
    })(t0);
  }), delta, ms);
}

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport(L
    ? { width: 1280, height: 720, deviceScaleFactor: 1 }
    : { width: 432, height: 768, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
  // Pre-accept cookies + dismiss the install banner so neither covers the shot.
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem("br_cookie_consent", "accepted"); sessionStorage.setItem("pwa_banner_dismissed", "1"); } catch {}
  });
  return page;
}

async function clip(browser, name, url, script) {
  if (names.length && !names.includes(name)) return;
  const page = await newPage(browser);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(1200);
  const rec = await page.screencast({ path: path.join(OUT, `${name}${L ? "-land" : ""}.webm`) });
  try { await script(page); } catch (e) { console.error(`[${name}] script warning:`, e.message); }
  await rec.stop();
  await page.close();
  console.log("recorded", name);
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });

  await clip(browser, "home", "https://bookrightly.co.uk/", async page => {
    await sleep(2200);
    await glide(page, S(720), 2200); await sleep(1400);
    await glide(page, S(760), 2200); await sleep(1200);
  });

  await clip(browser, "demo", "https://bookrightly.co.uk/fade-factory", async page => {
    await sleep(2400);
    await glide(page, S(700), 2400); await sleep(1200);
    await glide(page, S(800), 2400); await sleep(1200);
    await glide(page, S(800), 2400); await sleep(900);
  });

  await clip(browser, "flow", "https://bookrightly.co.uk/barber/S5s1FWMaz1XuAEo8gDSTTIqlqgL2", async page => {
    await sleep(800);
    // Glide down to the slot picker so the viewer actually sees the times.
    const y = await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(b => /^\s*\d{1,2}:\d{2}/.test(b.textContent || ""));
      if (!btn) return null;
      return btn.getBoundingClientRect().top + window.scrollY;
    });
    if (y == null) throw new Error("no time slot button found");
    await glide(page, y - (L ? 300 : 320) - (await page.evaluate(() => window.scrollY)), 2600);
    await sleep(1600);
    // Tap the first available time.
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(b => /^\s*\d{1,2}:\d{2}/.test(b.textContent || ""));
      btn.click();
    });
    await sleep(2800);
    // Fill the booking form in its real order (name, email, phone) — never submitted.
    const values = ["Jamie Carter", "jamie@example.com", "07700 900123"];
    const inputs = await page.$$("input");
    let i = 0;
    for (const input of inputs) {
      const type = await input.evaluate(el => el.type);
      if (["text", "email", "tel"].includes(type) && i < values.length) {
        await input.evaluate(el => el.scrollIntoView({ block: "center" }));
        await input.click();
        await page.keyboard.type(values[i++], { delay: 60 });
        await sleep(300);
      }
    }
    await sleep(1600);
  });

  await clip(browser, "pricing", "https://bookrightly.co.uk/pricing", async page => {
    await sleep(2000);
    await glide(page, S(900), 2400); await sleep(1400);
    await glide(page, S(900), 2400); await sleep(1400);
    await glide(page, S(900), 2400); await sleep(900);
  });

  await browser.close();
})().catch(e => { console.error("FAILED", e); process.exit(1); });
