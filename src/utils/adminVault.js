// Lets the admin lock the real admin key behind a password they choose,
// instead of having to remember the actual key string. Real encryption via
// the browser's own Web Crypto API (PBKDF2 + AES-GCM) — the admin key is
// never stored in plaintext, and AES-GCM's auth tag means a wrong password
// fails to decrypt at all rather than silently producing garbage, which
// doubles as free password verification.
const VAULT_STORAGE_KEY = "br_admin_vault";
const PBKDF2_ITERATIONS = 150000;

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(password, saltBytes) {
  const baseKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function hasVault() {
  try { return Boolean(localStorage.getItem(VAULT_STORAGE_KEY)); } catch { return false; }
}

export function clearVault() {
  try { localStorage.removeItem(VAULT_STORAGE_KEY); } catch {}
}

export async function createVault(adminKey, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, new TextEncoder().encode(adminKey),
  );
  const vault = { salt: bufToB64(salt), iv: bufToB64(iv), ciphertext: bufToB64(ciphertext) };
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
}

// Throws if the password is wrong (AES-GCM tag mismatch) or no vault exists.
export async function unlockVault(password) {
  const raw = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!raw) throw new Error("No saved admin key on this device yet.");
  const vault = JSON.parse(raw);
  const key = await deriveKey(password, b64ToBuf(vault.salt));
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuf(vault.iv) }, key, b64ToBuf(vault.ciphertext),
  );
  return new TextDecoder().decode(plainBuf);
}
