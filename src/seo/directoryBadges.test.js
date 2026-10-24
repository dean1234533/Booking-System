import { describe, expect, it, vi } from "vitest";
import { cleanBadgeStyle, readBadgeFeed, sanitizeBadgeElement, getDirectoryBadgeItems } from "./directoryBadges";

function element(tagName, attributes) {
  const attrs = new Map(Object.entries(attributes));
  return { tagName, attributes: [...attrs], attrs, removed: false,
    remove() { this.removed = true; },
    removeAttribute(name) { attrs.delete(name); },
    setAttribute(name, value) { attrs.set(name, value); },
  };
}

describe("directory badge feed boundaries", () => {
  it("keeps HTTPS links but strips executable attributes and schemes", () => {
    const badge = element("a", { href: "javascript:alert(1)", onclick: "alert(1)", "data-sbm-ref": "project", rel: "opener" });
    sanitizeBadgeElement(badge);
    expect(badge.attrs.has("href")).toBe(false);
    expect(badge.attrs.has("onclick")).toBe(false);
    expect(badge.attrs.get("rel")).toBe("noopener noreferrer");
    expect(badge.attrs.get("data-sbm-ref")).toBe("project");
    const image = element("img", { src: "https://directory.example/badge.svg", onerror: "alert(1)", width: "139" });
    sanitizeBadgeElement(image);
    expect(image.attrs.get("src")).toBe("https://directory.example/badge.svg");
    expect(image.attrs.has("onerror")).toBe(false);
    const oldEmbed = element("img", { src: "http://easydofollow.dev/badge/easydofollow-badge-light.svg" });
    sanitizeBadgeElement(oldEmbed);
    expect(oldEmbed.attrs.get("src")).toBe("https://easydofollow.dev/badge/easydofollow-badge-light.svg");
  });

  it("removes active embeds and CSS that could obscure the page", () => {
    for (const tag of ["script", "iframe", "foreignObject", "style", "form"]) {
      const node = element(tag, {});
      sanitizeBadgeElement(node);
      expect(node.removed).toBe(true);
    }
    expect(cleanBadgeStyle("position:fixed;z-index:99999;background:url(https://evil.example);color:#fff;display:inline-flex")).toBe("color:#fff;display:inline-flex");
  });

  it("bounds a feed even when the server omits Content-Length", async () => {
    await expect(readBadgeFeed(new Response("x".repeat(65537)))).rejects.toThrow("size limit");
    await expect(readBadgeFeed(new Response("<a>badge</a>"))).resolves.toBe("<a>badge</a>");
  });

  it("keeps known listings available when the remote service is down", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const html = await getDirectoryBadgeItems();
      expect(html).toContain("launchpadly.co/startup/bookrightly");
      expect(html).toContain("sourceforge.net/software/product/Bookrightly");
    } finally { fetchMock.mockRestore(); warning.mockRestore(); }
  });
});
