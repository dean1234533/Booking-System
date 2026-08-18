/**
 * The canonical, public-facing site origin — for building links that get
 * copied, shared via WhatsApp, or shown as a QR code to a client.
 *
 * Deliberately NOT window.location.origin: dashboard sessions get reached
 * from several hosts (booking-system-cdce0.web.app during testing, the
 * legacy bookehtrim.co.uk domain, a workers.dev preview) and a link built
 * from whichever one happened to serve the page looks broken/unfamiliar to
 * the client it's sent to. Every client-facing shareable link should point
 * at the one real domain, regardless of where the owner is viewing their
 * dashboard from.
 */
export const SITE_URL = "https://bookrightly.co.uk";
