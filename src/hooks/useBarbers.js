import { useState, useEffect } from "react";

export function useBarbers() {
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBarbers() {
      try {
        setLoading(true);
        const { getAllBarbers } = await import("../firebase/firestore");
        const data = await getAllBarbers();
        setBarbers(data);
      } catch (err) {
        // A tab left open across a deploy can end up asking for a JS chunk
        // (this dynamic import included) that no longer exists on the server
        // — old chunk files get replaced, not kept alongside new ones. That
        // failure otherwise looks identical to "no businesses found": caught
        // here, empty list rendered, nothing visibly wrong. A reload re-fetches
        // the current chunk manifest and fixes it, so do that automatically
        // instead of leaving the tab silently broken — guarded to one attempt
        // per tab session so a genuine, persistent failure doesn't loop.
        const isChunkLoadError = /dynamically imported module|Failed to fetch|Importing a module script failed/i.test(err?.message || "");
        if (isChunkLoadError) {
          const KEY = "br_chunk_reload_v1";
          try {
            if (!sessionStorage.getItem(KEY)) {
              sessionStorage.setItem(KEY, "1");
              window.location.reload();
              return;
            }
          } catch {
            // sessionStorage unavailable — fall through to normal error state
          }
        }
        setError("Failed to load barbers.");
        console.error("Hook Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBarbers();
  }, []);

  return { barbers, loading, error };
}