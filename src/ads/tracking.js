const ATTRIBUTION_KEY = 'br_ad_attribution_v1';
export const UTM_KEYS = ['utm_source', 'utm_campaign', 'utm_content'];
export function captureAttribution(search = window.location.search) {
  let stored = {};
  try { stored = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}'); } catch { /* Storage is optional. */ }
  const params = new URLSearchParams(search);
  const fresh = Object.fromEntries(UTM_KEYS.filter(key => params.has(key)).map(key => [key, params.get(key).slice(0, 500)]));
  // A new tagged visit replaces the previous campaign; avoid mixed attribution.
  const result = Object.keys(fresh).length ? fresh : Object.fromEntries(UTM_KEYS.filter(key => typeof stored?.[key] === 'string').map(key => [key, stored[key].slice(0, 500)]));
  try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(result)); } catch { /* Direct URL values still work. */ }
  return result;
}
export function ensurePixel() {
  if (window.fbq) return; // Existing index.html already sends PageView.
  const id = import.meta.env.VITE_META_PIXEL_ID;
  if (!id || !/^\d+$/.test(id)) return;
  const fbq = function () { if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments); else fbq.queue.push(arguments); };
  fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq;
  window.fbq = window._fbq = fbq;
  const script = document.createElement('script'); script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.append(script);
  fbq('init', id); fbq('track', 'PageView');
}
export function trackAdEvent(name, params = {}) {
  try { ensurePixel(); window.fbq?.('track', name, params); } catch { /* Analytics must never block signup. */ }
}
