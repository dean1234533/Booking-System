// Minimal Firestore REST client for the Worker (service-account token, same
// mechanism as the rest of worker.js). Unlike worker.js's toFirestoreFields it
// handles maps, arrays and doubles, and supports create-if-not-exists and
// atomic increments — both needed for idempotent reminders and usage caps.
export function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)])) } };
}
export function dec(f) {
  if (!f) return undefined;
  if ("stringValue" in f) return f.stringValue;
  if ("booleanValue" in f) return f.booleanValue;
  if ("integerValue" in f) return Number(f.integerValue);
  if ("doubleValue" in f) return f.doubleValue;
  if ("nullValue" in f) return null;
  if ("timestampValue" in f) return f.timestampValue;
  if ("arrayValue" in f) return (f.arrayValue.values || []).map(dec);
  if ("mapValue" in f) return decDoc(f.mapValue.fields || {});
  return undefined;
}
export const decDoc = fields => Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, dec(v)]));
export const encFields = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, enc(v)]));

export function fsClient(base, projectId, token) {
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const docName = path => `projects/${projectId}/databases/(default)/documents/${path}`;
  const wrap = d => (d && d.name ? { id: d.name.split("/").pop(), ...decDoc(d.fields) } : null);
  return {
    async get(path) {
      const r = await fetch(`${base}/${path}`, { headers: auth });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`firestore get ${path}: ${r.status}`);
      return wrap(await r.json());
    },
    // -> "created" | "exists"
    async create(collectionPath, id, data) {
      const r = await fetch(`${base}/${collectionPath}?documentId=${encodeURIComponent(id)}`, { method: "POST", headers: auth, body: JSON.stringify({ fields: encFields(data) }) });
      if (r.status === 409) return "exists";
      if (!r.ok) throw new Error(`firestore create ${collectionPath}/${id}: ${r.status} ${await r.text().catch(() => "")}`);
      return "created";
    },
    // Merge only the given top-level fields (creates the doc if missing).
    async patch(path, data) {
      const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
      const r = await fetch(`${base}/${path}?${mask}`, { method: "PATCH", headers: auth, body: JSON.stringify({ fields: encFields(data) }) });
      if (!r.ok) throw new Error(`firestore patch ${path}: ${r.status}`);
    },
    async del(path) { await fetch(`${base}/${path}`, { method: "DELETE", headers: auth }); },
    // Atomic server-side increment (creates the doc if it doesn't exist).
    async increment(path, field, by = 1) {
      const r = await fetch(`${base}:commit`, { method: "POST", headers: auth, body: JSON.stringify({
        writes: [{ transform: { document: docName(path), fieldTransforms: [{ fieldPath: field, increment: { integerValue: String(by) } }] } }],
      }) });
      if (!r.ok) throw new Error(`firestore increment ${path}: ${r.status}`);
    },
    async query(structuredQuery) {
      const r = await fetch(`${base}:runQuery`, { method: "POST", headers: auth, body: JSON.stringify({ structuredQuery }) });
      if (!r.ok) throw new Error(`firestore query: ${r.status}`);
      return (await r.json()).filter(x => x.document).map(x => wrap(x.document));
    },
  };
}
export const eq = (fieldPath, v) => ({ fieldFilter: { field: { fieldPath }, op: "EQUAL", value: enc(v) } });
export const isIn = (fieldPath, arr) => ({ fieldFilter: { field: { fieldPath }, op: "IN", value: { arrayValue: { values: arr.map(enc) } } } });
export const and = filters => ({ compositeFilter: { op: "AND", filters } });

export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
