import { describe, expect, it } from "vitest";
import { arrayBufferToBase64, createSquareFaviconSvg } from "./favicon";

describe("tenant favicon helpers", () => {
  it("base64-encodes binary logo data", () => {
    expect(arrayBufferToBase64(Uint8Array.from([0, 1, 2, 253, 254, 255]).buffer))
      .toBe("AAEC/f7/");
  });

  it("creates a square, padded SVG that contains the complete logo", () => {
    const svg = createSquareFaviconSvg({
      imageDataUrl: "data:image/jpeg;base64,dGVzdA==",
      backgroundColor: "#123456",
    });

    expect(svg).toContain('width="512" height="512" viewBox="0 0 512 512"');
    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(svg).toContain('href="data:image/jpeg;base64,dGVzdA=="');
  });

  it("escapes values before putting them in SVG attributes", () => {
    const svg = createSquareFaviconSvg({
      imageDataUrl: 'data:image/svg+xml,<svg id="logo">&</svg>',
      backgroundColor: 'url("bad")',
    });

    expect(svg).not.toContain('id="logo"');
    expect(svg).toContain('&lt;svg id=&quot;logo&quot;&gt;&amp;&lt;/svg&gt;');
    expect(svg).toContain('fill="url(&quot;bad&quot;)"');
  });
});
