import { useRef, useState } from "react";

const FALLBACK_BEFORE = "/images/demo/decorator/living-room-before.jpg";
const FALLBACK_AFTER  = "/images/demo/decorator/living-room-after.jpg";

export default function BeforeAfterSlider({ before, after, aspectRatio = "4/5", radius = 8 }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);
  const touchStart = useRef(null);
  const touchAxis = useRef(null);

  const updatePos = (clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, x)));
  };

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    touchAxis.current = null;
  };

  const handleTouchMove = (e) => {
    const t = e.touches[0];
    if (!touchAxis.current && touchStart.current) {
      const dx = Math.abs(t.clientX - touchStart.current.x);
      const dy = Math.abs(t.clientY - touchStart.current.y);
      // Wait for a small, unambiguous movement before locking the gesture
      // to an axis — this is what lets a vertical swipe fall through to
      // the page's native scroll instead of getting stuck on the slider.
      if (dx < 6 && dy < 6) return;
      touchAxis.current = dx > dy ? "x" : "y";
    }
    if (touchAxis.current === "x") updatePos(t.clientX);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => updatePos(e.clientX)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio,
        borderRadius: radius,
        overflow: "hidden",
        cursor: "col-resize",
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        background: "#111",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <img src={after || FALLBACK_AFTER} alt="After" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before || FALLBACK_BEFORE} alt="Before" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <span style={{ position: "absolute", bottom: 12, left: 14, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff", background: "rgba(0,0,0,0.45)", padding: "4px 10px", borderRadius: 2, zIndex: 10 }}>
        Before
      </span>
      <span style={{ position: "absolute", bottom: 12, right: 14, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff", background: "rgba(0,0,0,0.45)", padding: "4px 10px", borderRadius: 2, zIndex: 10 }}>
        After
      </span>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pos}%`, width: 2, background: "#fff", zIndex: 10 }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 34, height: 34, background: "#fff", borderRadius: "50%", boxShadow: "0 4px 16px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ width: 2, height: 12, background: "#9ca3af", borderRadius: 2 }} />
            <div style={{ width: 2, height: 12, background: "#9ca3af", borderRadius: 2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
