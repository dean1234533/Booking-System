import React from "react";

// A lazy-loaded chunk (React.lazy / dynamic import()) can 404 when a
// visitor has an old page open and a newer deploy has since replaced that
// chunk's hashed filename — the server falls back to index.html (hence the
// "text/html" MIME mismatch), which crashes the module loader. No amount of
// "Try again" fixes this by re-rendering the same stale tree; only a real
// reload fetches the current page shell, so detect this specific failure
// and reload once automatically instead of leaving a dead-end retry button.
function isStaleChunkError(error) {
  const msg = error?.message || "";
  return /dynamically imported module|Failed to fetch dynamically imported module|Loading chunk .* failed|Importing a module script failed/i.test(msg);
}

// Without this, any render crash anywhere in the tree just unmounts
// silently — a blank area with no text and no error, impossible to
// diagnose from a screenshot alone. This catches it and shows what
// actually broke, with a way to recover without a full app reload.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught a render crash:", error, info?.componentStack);
    if (isStaleChunkError(error)) {
      const KEY = "br_stale_chunk_reload";
      // Guard against a reload loop — if this fires again right after a
      // reload we already tried, something else is wrong; fall through to
      // the normal error UI instead of reloading forever.
      let alreadyTried = false;
      try { alreadyTried = sessionStorage.getItem(KEY) === "1"; } catch {}
      if (!alreadyTried) {
        try { sessionStorage.setItem(KEY, "1"); } catch {}
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.error) {
      if (isStaleChunkError(this.state.error)) {
        return (
          <div style={{
            padding: "2rem 1.5rem", textAlign: "center", fontFamily: "'DM Sans', sans-serif",
            color: "#333", maxWidth: 480, margin: "3rem auto",
          }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".5rem" }}>
              Updating…
            </div>
            <div style={{ fontSize: ".85rem", color: "#777" }}>
              A newer version of this page is available — reloading now.
            </div>
          </div>
        );
      }
      return (
        <div style={{
          padding: "2rem 1.5rem", textAlign: "center", fontFamily: "'DM Sans', sans-serif",
          color: "#333", maxWidth: 480, margin: "3rem auto",
        }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".5rem" }}>
            Something went wrong loading this.
          </div>
          <div style={{ fontSize: ".85rem", color: "#777", marginBottom: "1.25rem", wordBreak: "break-word" }}>
            {this.state.error?.message || "Unknown error"}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: ".6rem 1.4rem", borderRadius: 8, border: "none",
              background: "#2563EB", color: "#fff", fontWeight: 700, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
