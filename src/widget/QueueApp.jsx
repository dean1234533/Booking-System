import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

// Mirrors the "View Live Queue" button on the business's own hosted page
// (see TenantHome.jsx) rather than reproducing the whole join flow inline —
// that flow already lives at bookrightly.co.uk/queue/{shopId} (open/paused/
// position tracking, push notifications, all of it), so the widget just
// needs to be the same lightweight entry point into it, opened in a new tab
// so the visitor never leaves the site they're actually on.
export default function QueueApp({ shopId }) {
  const [brand, setBrand] = useState({ brandColor: "#2563EB", businessName: "" });

  useEffect(() => {
    if (!shopId) return;
    getDoc(doc(db, "barbers", shopId)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setBrand({ brandColor: d.brandColor || "#2563EB", businessName: d.businessName || d.name || "" });
      }
    });
  }, [shopId]);

  return (
    <div className="br-widget br-widget--queue" style={{ "--br-brand": brand.brandColor }}>
      <button
        className="br-button"
        style={{ background: brand.brandColor }}
        onClick={() => window.open(`https://bookrightly.co.uk/queue/${shopId}`, "_blank", "noopener")}
      >
        {brand.businessName ? `View ${brand.businessName}'s Live Queue` : "View Live Queue"}
      </button>
      <div className="br-footer">Powered by <a href="https://bookrightly.co.uk" target="_blank" rel="noopener">Bookrightly</a></div>
    </div>
  );
}
