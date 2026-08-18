import { describe, it, expect } from "vitest";
import { sanitizeSlug, isValidSlugFormat, isReservedSlug, validateSlug, RESERVED_SLUGS } from "./bookingSlug";

describe("sanitizeSlug", () => {
  it("lowercases and trims", () => {
    expect(sanitizeSlug("  JayCuts  ")).toBe("jaycuts");
  });

  it("replaces whitespace with hyphens", () => {
    expect(sanitizeSlug("Jay Cuts Barber")).toBe("jay-cuts-barber");
  });

  it("strips invalid characters", () => {
    expect(sanitizeSlug("Jay's_Cuts!@#")).toBe("jayscuts");
  });

  it("collapses double hyphens", () => {
    expect(sanitizeSlug("jay--cuts")).toBe("jay-cuts");
  });

  it("strips leading/trailing hyphens", () => {
    expect(sanitizeSlug("-jaycuts-")).toBe("jaycuts");
  });

  it("handles empty/null/undefined input", () => {
    expect(sanitizeSlug("")).toBe("");
    expect(sanitizeSlug(null)).toBe("");
    expect(sanitizeSlug(undefined)).toBe("");
  });
});

describe("isValidSlugFormat", () => {
  it("accepts valid slugs", () => {
    expect(isValidSlugFormat("jaycuts")).toBe(true);
    expect(isValidSlugFormat("jay-cuts")).toBe(true);
    expect(isValidSlugFormat("jay-cuts-2")).toBe(true);
    expect(isValidSlugFormat("abc")).toBe(true); // minimum length
  });

  it("rejects slugs under 3 characters", () => {
    expect(isValidSlugFormat("ab")).toBe(false);
    expect(isValidSlugFormat("a")).toBe(false);
    expect(isValidSlugFormat("")).toBe(false);
  });

  it("rejects slugs over 30 characters", () => {
    expect(isValidSlugFormat("a".repeat(31))).toBe(false);
    expect(isValidSlugFormat("a".repeat(30))).toBe(true);
  });

  it("rejects leading or trailing hyphens", () => {
    expect(isValidSlugFormat("-jaycuts")).toBe(false);
    expect(isValidSlugFormat("jaycuts-")).toBe(false);
  });

  it("rejects uppercase and invalid characters", () => {
    expect(isValidSlugFormat("JayCuts")).toBe(false);
    expect(isValidSlugFormat("jay_cuts")).toBe(false);
    expect(isValidSlugFormat("jay cuts")).toBe(false);
    expect(isValidSlugFormat("jay.cuts")).toBe(false);
  });
});

describe("isReservedSlug", () => {
  it("flags known platform routes as reserved", () => {
    expect(isReservedSlug("pricing")).toBe(true);
    expect(isReservedSlug("dashboard")).toBe(true);
    expect(isReservedSlug("login")).toBe(true);
    expect(isReservedSlug("bookrightly")).toBe(true);
    expect(isReservedSlug("api")).toBe(true);
  });

  it("does not flag ordinary business names", () => {
    expect(isReservedSlug("jaycuts")).toBe(false);
    expect(isReservedSlug("glowbeauty")).toBe(false);
    expect(isReservedSlug("deanpt")).toBe(false);
  });

  it("the reserved set is non-empty and includes every business-route prefix", () => {
    ["barber", "shop", "hairdresser", "decorator", "pt-booking", "pt-book"].forEach(seg => {
      expect(RESERVED_SLUGS.has(seg)).toBe(true);
    });
  });
});

describe("validateSlug", () => {
  it("returns valid:true for a good slug", () => {
    const result = validateSlug("Jay Cuts");
    expect(result.valid).toBe(true);
    expect(result.slug).toBe("jay-cuts");
  });

  it("returns an error for empty input", () => {
    const result = validateSlug("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns an error for a reserved word", () => {
    const result = validateSlug("dashboard");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/reserved/i);
  });

  it("returns an error for an invalid format after sanitizing", () => {
    const result = validateSlug("ab"); // too short after sanitize
    expect(result.valid).toBe(false);
  });
});
