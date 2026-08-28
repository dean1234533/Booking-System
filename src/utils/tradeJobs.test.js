import { describe, it, expect } from "vitest";
import {
  calcLineTotals, nextJobStatus, isValidEnquiryStatus, ENQUIRY_STATUSES,
  getQuoteLabels, getJobTypes,
} from "./tradeJobs";

describe("calcLineTotals", () => {
  it("sums qty × price across items", () => {
    const items = [{ qty: "2", price: "50" }, { qty: "1", price: "30" }];
    expect(calcLineTotals(items, 0).subtotal).toBe(130);
  });

  it("applies VAT rate as a percentage of the subtotal", () => {
    const items = [{ qty: "1", price: "100" }];
    const { subtotal, vat, total } = calcLineTotals(items, 20);
    expect(subtotal).toBe(100);
    expect(vat).toBe(20);
    expect(total).toBe(120);
  });

  it("treats a zero/missing VAT rate as no VAT", () => {
    const items = [{ qty: "1", price: "100" }];
    expect(calcLineTotals(items, 0).vat).toBe(0);
    expect(calcLineTotals(items, undefined).vat).toBe(0);
  });

  it("treats empty/missing qty or price as zero", () => {
    const items = [{ qty: "", price: "" }, { qty: undefined, price: undefined }];
    expect(calcLineTotals(items, 20)).toEqual({ subtotal: 0, vat: 0, total: 0 });
  });

  it("handles an empty or missing items array", () => {
    expect(calcLineTotals([], 20)).toEqual({ subtotal: 0, vat: 0, total: 0 });
    expect(calcLineTotals(undefined, 20)).toEqual({ subtotal: 0, vat: 0, total: 0 });
  });
});

describe("nextJobStatus", () => {
  it("cycles pending -> in-progress -> done -> pending", () => {
    expect(nextJobStatus("pending")).toBe("in-progress");
    expect(nextJobStatus("in-progress")).toBe("done");
    expect(nextJobStatus("done")).toBe("pending");
  });

  it("defaults to pending for an unrecognised or missing status", () => {
    expect(nextJobStatus("something-else")).toBe("pending");
    expect(nextJobStatus(undefined)).toBe("pending");
  });
});

describe("isValidEnquiryStatus", () => {
  it("accepts every status in the defined lifecycle", () => {
    ENQUIRY_STATUSES.forEach(status => expect(isValidEnquiryStatus(status)).toBe(true));
  });

  it("rejects anything outside the defined lifecycle", () => {
    expect(isValidEnquiryStatus("archived")).toBe(false);
    expect(isValidEnquiryStatus("")).toBe(false);
    expect(isValidEnquiryStatus(undefined)).toBe(false);
  });
});

describe("getQuoteLabels", () => {
  it("returns plumber-specific copy for the plumber business type", () => {
    const labels = getQuoteLabels("plumber");
    expect(labels.defaultJobTitle).toBe("Plumbing & Heating Work");
    expect(labels.units).toContain("call-out");
  });

  it("falls back to decorator's existing copy for decorator and unknown types", () => {
    expect(getQuoteLabels("decorator").defaultJobTitle).toBe("Decorating Works");
    expect(getQuoteLabels("something-unknown").defaultJobTitle).toBe("Decorating Works");
    expect(getQuoteLabels(undefined).defaultJobTitle).toBe("Decorating Works");
  });
});

describe("getJobTypes", () => {
  it("returns plumber-specific job types for the plumber business type", () => {
    expect(getJobTypes("plumber")).toContain("Boiler Install");
  });

  it("falls back to decorator's existing job types for decorator and unknown types", () => {
    expect(getJobTypes("decorator")).toContain("Full Interior Paint");
    expect(getJobTypes("something-unknown")).toContain("Full Interior Paint");
  });
});
