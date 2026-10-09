// Records a real, full free-plan signup -> onboarding -> live booking page
// walkthrough for the homepage "how it works" explainer video. This creates
// a genuine test account (there's no safe way to fake a real signup flow) —
// run cleanup-explainer-account.cjs afterward to delete it. Writes
// clips/explainer-account.json with the created email/slug for that script.
// Usage: node marketing/video/record-explainer.cjs
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "clips");
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STAMP = Date.now().toString(36);
const TEST_EMAIL = `explainer-demo-${STAMP}@bookrightly.co.uk`;
const TEST_SLUG = `demo-barber-${STAMP}`;
const TEST_PASSWORD = "ExplainerDemo123!";

fs.writeFileSync(path.join(OUT, "explainer-account.json"), JSON.stringify({ email: TEST_EMAIL, slug: TEST_SLUG }, null, 2));

async function tapRipple(page, x, y) {
  await page.evaluate((x, y) => {
    const d = document.createElement("div");
    d.style.cssText = `position:fixed;left:${x - 30}px;top:${y - 30}px;width:60px;height:60px;border-radius:50%;background:rgba(37,99,235,.35);border:3px solid rgba(37,99,235,.95);z-index:2147483647;pointer-events:none;transform:scale(.4);opacity:1;transition:transform .45s ease-out,opacity .45s ease-out`;
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = "scale(1.6)"; d.style.opacity = "0"; });
    setTimeout(() => d.remove(), 700);
  }, x, y);
}

async function clickByText(page, selector, text, { exact = false } = {}) {
  const handles = await page.$$(selector);
  for (const h of handles) {
    const t = (await page.evaluate(el => el.textContent, h)).trim();
    if (exact ? t === text : t.includes(text)) {
      const box = await h.boundingBox();
      if (box) await tapRipple(page, box.x + box.width / 2, box.y + box.height / 2);
      await sleep(250);
      await h.click();
      return true;
    }
  }
  console.error(`[clickByText] not found: "${text}" via ${selector}`);
  return false;
}

// Finds an input/textarea by its visible <label> text (MUI renders label as
// a sibling, not always with a matching htmlFor), then types into it. Same
// technique already proven in record-v2.cjs's booking-summary fill step.
async function fillByLabel(page, labelStart, value) {
  const sel = await page.evaluate(l => {
    const lab = [...document.querySelectorAll("label")].find(x => x.textContent.trim().startsWith(l));
    if (!lab) return null;
    const root = lab.closest(".MuiFormControl-root") || lab.parentElement;
    const el = (lab.htmlFor && document.getElementById(lab.htmlFor)) || root?.querySelector("input,textarea");
    if (!el) return null;
    el.setAttribute("data-fill", l);
    return `[data-fill="${l}"]`;
  }, labelStart);
  if (!sel) { console.error(`[fillByLabel] not found: "${labelStart}"`); return false; }
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.type(value, { delay: 20 });
  return true;
}

async function fillByName(page, name, value) {
  const sel = `input[name="${name}"]`;
  await page.waitForSelector(sel, { timeout: 10000 });
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.type(value, { delay: 20 });
}

// Clears a pre-populated React-controlled input via real key events (a
// dispatched synthetic "input" event wasn't picked up by React's listener
// in testing — the DOM value visually changed but the component's state
// never did, leaving the field looking right but functionally stale), then
// types the new value. Real keystrokes are what React actually observes
// here, so clearing must also go through real keys: focus, jump to the end,
// then backspace exactly as many times as the current value is long.
async function clearAndType(page, selector, value) {
  await page.click(selector);
  const len = await page.evaluate(sel => document.querySelector(sel).value.length, selector);
  await page.keyboard.press("End");
  for (let i = 0; i < len; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type(value, { delay: 35 });
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1.5 });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem("br_cookie_consent", "accepted"); sessionStorage.setItem("pwa_banner_dismissed", "1"); } catch {}
  });

  // ── Segment 1: Signup ────────────────────────────────────────────────────
  await page.goto("https://bookrightly.co.uk/signup", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(1200);
  let rec = await page.screencast({ path: path.join(OUT, "ex-signup.webm") });

  await clickByText(page, "button", "Barbershop");
  await sleep(700);

  // Plan dropdown -> "Just the free option"
  await page.click("div.MuiSelect-select");
  await sleep(500);
  await clickByText(page, "li[role='option']", "Just the free option");
  await sleep(800);

  await clickByText(page, "button", "Continue", { exact: true });
  await page.waitForSelector("input[name='businessName']", { timeout: 10000 });
  await sleep(800);

  // Step 1 — business/personal details
  await fillByName(page, "businessName", "Fade Factory Demo");
  await fillByName(page, "name", "Jamie Carter");
  await fillByName(page, "email", TEST_EMAIL);
  await sleep(500);
  await clickByText(page, "button", "Continue", { exact: true });
  await page.waitForSelector("input[name='password']", { timeout: 10000 });
  await sleep(800);

  // Step 2 — password + create account
  await fillByName(page, "password", TEST_PASSWORD);
  await fillByName(page, "confirm", TEST_PASSWORD);
  await sleep(500);
  await clickByText(page, "button", "Create free account", { exact: true });

  // Account creation + redirect to /onboarding
  await page.waitForFunction(() => location.pathname === "/onboarding", { timeout: 20000 });
  await sleep(1500);
  await rec.stop();
  console.log("recorded ex-signup.webm");

  // ── Segment 2: Onboarding (Profile -> Booking link -> Availability) ────
  rec = await page.screencast({ path: path.join(OUT, "ex-onboarding.webm") });
  await sleep(800);

  // Profile step — business name/type already carried over from signup;
  // just add a location, matching what a real owner would actually fill.
  await page.screenshot({ path: path.join(OUT, "debug-1-profile.png") });
  await fillByLabel(page, "Location", "London");
  await sleep(600);
  await clickByText(page, "button.ob-cta", "Continue");
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, "debug-2-after-profile.png") });

  // Booking link step — type a slug, wait for the availability check.
  const slugSel = "input[aria-label='Choose your booking link']";
  await page.waitForSelector(slugSel, { timeout: 10000 });
  await sleep(400);
  const box = await (await page.$(slugSel)).boundingBox();
  if (box) await tapRipple(page, box.x + box.width / 2, box.y + box.height / 2);
  await clearAndType(page, slugSel, TEST_SLUG);
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, "debug-3-slug.png") });
  console.log("hint text:", await page.evaluate(() => document.querySelector("#booking-link-hint")?.textContent));
  console.log("hint class:", await page.evaluate(() => document.querySelector("#booking-link-hint")?.className));
  await page.waitForFunction(
    () => document.querySelector("#booking-link-hint")?.className.includes("available"),
    { timeout: 15000 },
  );
  await sleep(600);
  await clickByText(page, "button.ob-cta", "Claim link");
  await sleep(1200);

  // Availability step — turn on a couple of weekdays, keep default times.
  await page.waitForSelector(".ob-day-toggle", { timeout: 10000 });
  const dayToggles = await page.$$(".ob-day-toggle");
  for (const toggle of dayToggles.slice(0, 5)) { // Mon-Fri
    const box = await toggle.boundingBox();
    if (box) await tapRipple(page, box.x + box.width / 2, box.y + box.height / 2);
    await toggle.click();
    await sleep(250);
  }
  await sleep(500);
  await clickByText(page, "button.ob-cta", "Continue");

  // Onboarding completes -> "You're ready to take bookings" done screen,
  // which requires one more click through to the dashboard (it doesn't
  // auto-redirect).
  await page.waitForSelector("button.ob-cta-secondary", { timeout: 10000 });
  await sleep(800);
  await clickByText(page, "button.ob-cta-secondary", "Go to dashboard");
  await page.waitForFunction(() => location.pathname.startsWith("/dashboard"), { timeout: 20000 });
  await sleep(2000);
  await rec.stop();
  console.log("recorded ex-onboarding.webm");

  // ── Segment 3: the live public booking page ─────────────────────────────
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1.5 });
  await page2.evaluateOnNewDocument(() => {
    try { localStorage.setItem("br_cookie_consent", "accepted"); } catch {}
  });
  await page2.goto(`https://bookrightly.co.uk/${TEST_SLUG}`, { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(1500);
  const rec2 = await page2.screencast({ path: path.join(OUT, "ex-publicpage.webm") });

  const dateChip = await page2.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(x => /^\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*\d/.test((x.textContent || "").trim()));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (dateChip) {
    await tapRipple(page2, dateChip.x, dateChip.y);
    await page2.mouse.click(dateChip.x, dateChip.y);
    await sleep(900);
  }

  const timeChip = await page2.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(x => /^\s*\d{1,2}:\d{2}/.test((x.textContent || "").trim()));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (timeChip) {
    await tapRipple(page2, timeChip.x, timeChip.y);
    await sleep(500);
    await page2.mouse.click(timeChip.x, timeChip.y);
    await sleep(1500);
  }
  await sleep(2000);
  await rec2.stop();
  console.log("recorded ex-publicpage.webm");

  await browser.close();
  console.log("DONE. Test account:", TEST_EMAIL, "slug:", TEST_SLUG);
})().catch(e => { console.error("FAILED", e); process.exit(1); });
