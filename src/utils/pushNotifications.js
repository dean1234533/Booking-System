// VAPID public key — must match the private key configured in the Cloudflare Worker
const VAPID_PUBLIC_KEY = 'BJuBUftoLDPz1W6i2V6IaxGrSF2yKNDvjmcho8rloEaCfrlaIgfGyEzxbjI0MbcUgobhN6lC06DaHMXXAGIwlks';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export async function requestAndSubscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { error: 'Push not supported in this browser.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { error: 'Notification permission denied.' };
  }

  try {
    const reg          = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    return { subscription };
  } catch (err) {
    return { error: err.message };
  }
}

export async function getExistingSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function unsubscribeFromPush() {
  const sub = await getExistingSubscription();
  if (sub) await sub.unsubscribe();
}

export function notificationsSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function currentPermission() {
  return 'Notification' in window ? Notification.permission : 'denied';
}
