import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

function getSessionId() {
  try {
    let id = localStorage.getItem("br_session_id");
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("br_session_id", id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

// Fire-and-forget funnel event logging — must never throw or block the UI,
// since a broken analytics write is not a reason to interrupt signup/onboarding.
export function logFunnelEvent(event, data = {}) {
  try {
    addDoc(collection(db, "funnelEvents"), {
      event,
      sessionId: getSessionId(),
      path: typeof window !== "undefined" ? window.location.pathname : "",
      ...data,
      createdAt: serverTimestamp(),
    }).catch(() => {});
  } catch {
    /* analytics must never break the app */
  }
}
