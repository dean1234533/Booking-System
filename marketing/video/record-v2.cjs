// v2 promo recordings (phone viewport). Writes clips/v2-*.webm plus
// clips/v2-*.json with the timestamps (seconds from recording start) of key
// moments, so audio taps can be synced to them.
// Usage: node marketing/video/record-v2.cjs [home|demo|flow]
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "clips");
const only = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

// A visible tap ripple, so a "tap" reads on video.
async function tapRipple(page, x, y) {
  await page.evaluate((x, y) => {
    const d = document.createElement("div");
    d.style.cssText = `position:fixed;left:${x - 30}px;top:${y - 30}px;width:60px;height:60px;border-radius:50%;background:rgba(37,99,235,.35);border:3px solid rgba(37,99,235,.95);z-index:2147483647;pointer-events:none;transform:scale(.4);opacity:1;transition:transform .45s ease-out,opacity .45s ease-out`;
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = "scale(1.6)"; d.style.opacity = "0"; });
    setTimeout(() => d.remove(), 700);
  }, x, y);
}

async function clip(browser, name, url, { pre, run, init }) {
  if (only.length && !only.includes(name)) return;
  const page = await browser.newPage();
  await page.setViewport({ width: 432, height: 768, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem("br_cookie_consent", "accepted"); sessionStorage.setItem("pwa_banner_dismissed", "1"); } catch {}
  });
  if (init) await page.evaluateOnNewDocument(init);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(1400);
  if (pre) await pre(page);
  const rec = await page.screencast({ path: path.join(OUT, `v2-${name}.webm`) });
  const t0 = Date.now();
  const marks = {};
  const mark = k => { marks[k] = +((Date.now() - t0) / 1000).toFixed(2); };
  try { await run(page, mark); } catch (e) { console.error(`[${name}] warning:`, e.message); }
  mark("end");
  await rec.stop();
  await page.close();
  fs.writeFileSync(path.join(OUT, `v2-${name}.json`), JSON.stringify(marks, null, 2));
  console.log("recorded", name, marks);
}

const isTime = `(b => /^\\s*\\d{1,2}:\\d{2}/.test(b.textContent || ""))`;
const isDate = `(b => /^\\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s*\\d/.test((b.textContent || "").trim()))`;

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });

  await clip(browser, "home", "https://bookrightly.co.uk/", {
    init: () => {
      document.addEventListener("DOMContentLoaded", () => {
        const st = document.createElement("style");
        st.textContent = 'button[aria-label="Chat with Bookrightly"]{display:none !important}';
        document.head.appendChild(st);
      });
    },
    run: async page => {
      await sleep(600);
      await glide(page, 515, 800);
      await sleep(3600);
    },
  });

  await clip(browser, "demo", "https://bookrightly.co.uk/fade-factory", {
    run: async page => {
      await sleep(1500);
      await glide(page, 900, 650);   // quick scroll down to the before/after gallery
      await sleep(2000);
    },
  });

  await clip(browser, "flow", "https://bookrightly.co.uk/barber/S5s1FWMaz1XuAEo8gDSTTIqlqgL2", {
    // Runs on every document load and re-applies continuously on the booking
    // route: the demo account can't take a real deposit (no Stripe), so the
    // summary is rendered with a deposit value for the promo.
    init: () => {
      const apply = () => {
        if (!location.pathname.startsWith("/book/")) return;
        const el = [...document.querySelectorAll("p,span,div")].find(e => e.children.length === 0 && /^No deposit required$/i.test((e.textContent || "").trim()));
        if (el) { el.textContent = "£10.00 paid ✓"; el.style.color = "#15803d"; el.style.fontWeight = "800"; el.style.fontSize = "1.05rem"; }
        const demo = [...document.querySelectorAll(".MuiAlert-root")].find(a => /demo/i.test(a.textContent || ""));
        if (demo) demo.style.display = "none";
      };
      setInterval(apply, 80);
    },
    // Start recording with the date/time picker already in view.
    pre: async page => {
      const ok = await page.evaluate(`(() => {
        const btn = [...document.querySelectorAll("button")].find(${isDate});
        if (!btn) return false;
        window.scrollTo(0, window.scrollY + btn.getBoundingClientRect().top - 250);
        return true;
      })()`);
      if (!ok) throw new Error("no date chips found");
      await sleep(500);
    },
    run: async (page, mark) => {
      await sleep(500);
      // Tap the first date (Monday 28 September).
      const date = await page.evaluate(`(() => {
        const chips = [...document.querySelectorAll("button")].filter(${isDate});
        const b = chips[0];
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      mark("dateTap");
      await tapRipple(page, date.x, date.y);
      await page.mouse.click(date.x, date.y);
      await sleep(400);
      // Tap the first time shown for that date.
      const time = await page.evaluate(`(() => {
        const b = [...document.querySelectorAll("button")].find(${isTime});
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      mark("timeTap");
      await tapRipple(page, time.x, time.y);
      await sleep(400);   // let the ripple read on screen before the page changes
      await page.mouse.click(time.x, time.y);
      // Wait for the appointment summary, then render the deposit row.
      await page.waitForFunction(() => /Appointment Summary/i.test(document.body.innerText), { timeout: 12000 });
      await sleep(500);
      mark("summary");
      // The persistent patcher (see `init`) rewrites the deposit row; wait for it.
      await page.waitForFunction(() => /£10\.00 paid/.test(document.body.innerText), { timeout: 8000 });
      await sleep(400);
      // Pre-fill the "Your Information" form for the still (no typing shown).
      const fill = async (label, value) => {
        const sel = await page.evaluate(l => {
          const lab = [...document.querySelectorAll("label")].find(x => x.textContent.trim().startsWith(l));
          const el = lab && (document.getElementById(lab.htmlFor) || lab.parentElement.querySelector("input,textarea"));
          if (!el) return null;
          el.setAttribute("data-fill", l); return `[data-fill="${l}"]`;
        }, label);
        if (!sel) { console.error("no field", label); return; }
        await page.click(sel, { clickCount: 3 });
        await page.keyboard.type(value, { delay: 5 });
      };
      await fill("Full Name", "Jamie Carter");
      await fill("Email", "jamie@example.com");
      await fill("Phone", "07700 900123");
      await fill("Style", "Skin fade, beard tidy");
      const g = await page.evaluate(() => { const el = [...document.querySelectorAll('[role="combobox"]')][0]; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (g) {
        await page.mouse.click(g.x, g.y); await sleep(400);
        await page.evaluate(() => [...document.querySelectorAll('li[role="option"]')].find(o => /^male$/i.test(o.textContent.trim()))?.click());
        await sleep(400);
      } else console.error("no gender select");
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await sleep(300);
      await page.screenshot({ path: path.join(OUT, "v2-flow-summary.png") });
      mark("deposit");
      await sleep(2200);
    },
  });

  await browser.close();
})().catch(e => { console.error("FAILED", e); process.exit(1); });
