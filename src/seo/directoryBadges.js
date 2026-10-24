// Public badge feed for Bookrightly's existing Submitator project.
const FEED = "https://api.submitator.com/badge/81a8f054-96cb-49f3-94dd-6bc75ba7fed2.html";
const MAX_BYTES = 64 * 1024;
const TAGS = new Set(["a", "img", "span", "svg", "path", "circle"]);
const ATTRS = new Set(["href", "src", "alt", "title", "width", "height", "loading", "target", "rel", "viewbox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "d", "cx", "cy", "r", "xmlns", "data-sbm-ref"]);
const STYLE_PROPERTIES = new Set(["display", "align-items", "justify-content", "gap", "padding", "background", "background-color", "color", "border", "border-radius", "box-shadow", "font-family", "font-size", "font-weight", "letter-spacing", "text-transform", "text-decoration", "flex-direction", "line-height"]);

export function cleanBadgeStyle(value) {
  return value.split(";").map(rule => {
    const colon = rule.indexOf(":");
    const key = rule.slice(0, colon).trim().toLowerCase();
    const val = rule.slice(colon + 1).trim();
    if (colon < 0 || !STYLE_PROPERTIES.has(key) || /url|expression|@|\\/i.test(val) || !/^[#\w\s.,()%/'"-]+$/.test(val)) return "";
    return `${key}:${val}`;
  }).filter(Boolean).join(";");
}

// Exact provider-issued URLs that currently return 404. Keep the directory
// link usable until the provider publishes a listing with a working URL.
const UNPUBLISHED_LINKS = new Set([
  "https://postyourstartup.co/startup/bookrightly",
  "https://bunny.directory/product/bookrightly",
  "https://findly.tools/bookrightly",
  "https://nicklaunches.com/products/bookrightly/",
  "https://easydofollow.dev/productivity/bookrightly",
  "https://easylaunch.dev/productivity/bookrightly.co",
  "https://startupbenchmarks.com/product/bookrightly.co",
]);
const UNAVAILABLE_IMAGES = new Map([
  ["https://postyourstartup.co/api/badge/bookrightly", "PostYourStartup"],
  ["https://bunny.directory/product/bookrightly/badge.svg", "Bunny Directory"],
]);

export function sanitizeBadgeElement(element) {
  if (!TAGS.has(element.tagName.toLowerCase())) { element.remove(); return; }
  if (element.tagName.toLowerCase() === "img") {
    const src = [...element.attributes].find(([name]) => name.toLowerCase() === "src")?.[1];
    const label = UNAVAILABLE_IMAGES.get(src?.split("?")[0]);
    if (label) { element.replace(label); return; }
  }
  for (const [name, value] of [...element.attributes]) {
    const key = name.toLowerCase();
    if (key === "href" && UNPUBLISHED_LINKS.has(value.trim().replace(/^http:/i, "https:").split("?")[0])) {
      element.setAttribute(name, new URL(value.replace(/^http:/i, "https:")).origin + "/");
    } else if (key === "src" && value === "https://nextbigproduct.com/assets/badge/copythathq.svg?theme=light") {
      element.setAttribute(name, "https://nextbigproduct.com/assets/badge/bookrightly.svg?theme=light");
    } else if (key === "style") {
      element.setAttribute(name, cleanBadgeStyle(value));
    } else if ((key === "href" || key === "src") && /^http:\/\//i.test(value.trim())) {
      // Some issued embeds still use HTTP. Keep badges usable on HTTPS pages.
      element.setAttribute(name, value.trim().replace(/^http:/i, "https:"));
    } else if (!ATTRS.has(key) || ((key === "href" || key === "src") && !/^https:\/\//i.test(value.trim()))) {
      element.removeAttribute(name);
    } else if (key === "alt" && value === "ShareSpeak on SaaSGrow") {
      // Correct the provider's generic template name for this project's badge.
      element.setAttribute(name, "Bookrightly on SaaSGrow");
    }
  }
  if (element.tagName.toLowerCase() === "a") {
    element.setAttribute("target", "_blank");
    element.setAttribute("rel", "noopener noreferrer");
  }
}

export async function readBadgeFeed(response) {
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) throw new Error("Badge feed exceeds size limit");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

// These listings already exist, or have accepted the badge commitment.
// Twelve Tools is deliberately NOT hardcoded here even though it needed a
// manual badge to pass their 24h verification check (tried plain link, then
// their badge2-dark.svg — both "not detected" by their checker despite
// being confirmed live via direct fetch each time) — the live Submitator
// feed below started serving their own official badge0-white.svg entry on
// its own, so a local copy here would just duplicate it in the footer.
const LOCAL_ITEMS = `
<li><a href="https://launchpadly.co/startup/bookrightly?ref=badge" target="_blank" rel="noopener noreferrer" data-launchpadly-badge="bookrightly">Proudly listed on Launchpadly Startup Directory</a></li>
<li><a href="https://sourceforge.net/software/product/Bookrightly/" target="_blank" rel="noopener noreferrer"><img src="https://b.sf-syn.com/badge_img/4133962/light-default?variant_id=sf" alt="Bookrightly Reviews on SourceForge" width="125"></a></li>
<li><a href="https://neeed.directory" target="_blank" rel="noopener noreferrer"><img src="https://neeed.directory/badges/neeed-badge-light.svg" alt="Featured on neeed.directory" width="139"></a></li>
<li><a href="https://lift-off.sh" target="_blank" rel="noopener noreferrer" title="LiftOff launch badge"><img src="https://lift-off.sh/images/badges/badgeLaunchedDark.webp" alt="LiftOff launch badge" width="200"></a></li>
<li><a href="https://huzzler.so/products/Mx5XZHP28v/bookrightly?utm_source=huzzler_product_website&amp;utm_medium=badge&amp;utm_campaign=free_listing" target="_blank" rel="noopener noreferrer"><img src="https://huzzler.so/assets/images/embeddable-badges/featured.png" alt="Huzzler Embed Badge" width="159" height="55"></a></li>`;

export async function getDirectoryBadgeItems() {
  try {
    // No app/CDN cache: directory changes are visible on the next request.
    const response = await fetch(FEED, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    if (!response.ok) throw new Error(`Badge feed HTTP ${response.status}`);
    const raw = await readBadgeFeed(response);
    const safe = await new HTMLRewriter()
      .on("*", { element: sanitizeBadgeElement })
      .on("a", { element(element) {
        element.before("<li>", { html: true });
        element.onEndTag(tag => tag.after("</li>", { html: true }));
      } })
      .transform(new Response(raw, { headers: { "Content-Type": "text/html" } })).text();
    return LOCAL_ITEMS + safe;
  } catch (error) {
    console.warn("directory_badge_feed_unavailable", error.message);
    return LOCAL_ITEMS;
  }
}

export function badgeFallbackHtml(items) {
  return `<section id="bookrightly-badge-fallback" aria-label="Bookrightly directory listings" style="background:#111116;color:#fff;padding:24px;max-width:100%;font-family:system-ui,sans-serif">
<style>#bookrightly-badge-fallback ul{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;list-style:none;margin:0;padding:0}#bookrightly-badge-fallback li{flex:0 0 248px;min-height:112px;display:flex;align-items:center;justify-content:center;scroll-snap-align:start;padding:16px;box-sizing:border-box;border:1px solid #ffffff26;border-radius:16px}#bookrightly-badge-fallback a{color:#fff}#bookrightly-badge-fallback img{max-width:100%;height:auto}</style>
<h2 style="font-size:14px">Find us on</h2><ul>${items}</ul></section>`;
}
