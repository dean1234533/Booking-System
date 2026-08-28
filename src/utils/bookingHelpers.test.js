import { describe, it, expect } from "vitest";
import { calculateBookingFee, PLATFORM_FEE_PERCENT, STRIPE_PERCENT, STRIPE_FIXED_PENCE } from "./bookingHelpers";

describe("calculateBookingFee", () => {
  it("computes the gross-up correctly for a £25 deposit (platform fee is 0 — customer only covers Stripe's real cost)", () => {
    const fee = calculateBookingFee(25);
    expect(fee.depositPence).toBe(2500);
    expect(fee.isValid).toBe(true);
    const expectedPlatformFee = Math.round(2500 * PLATFORM_FEE_PERCENT);
    const expectedCustomerPays = Math.ceil((2500 + expectedPlatformFee + STRIPE_FIXED_PENCE) / (1 - STRIPE_PERCENT));
    expect(fee.customerPaysPence).toBe(expectedCustomerPays);
    expect(fee.bookingFeePence).toBe(expectedCustomerPays - 2500);
  });

  it("handles a string deposit amount (as stored in Firestore)", () => {
    const fee = calculateBookingFee("25");
    expect(fee.depositPence).toBe(2500);
    expect(fee.isValid).toBe(true);
  });

  it("formats pounds values as 2-decimal strings", () => {
    const fee = calculateBookingFee(25);
    expect(fee.depositPounds).toBe("25.00");
    expect(fee.customerPaysPounds).toMatch(/^\d+\.\d{2}$/);
  });

  it("returns an invalid result for zero, negative, or missing deposit", () => {
    expect(calculateBookingFee(0).isValid).toBe(false);
    expect(calculateBookingFee(-10).isValid).toBe(false);
    expect(calculateBookingFee(null).isValid).toBe(false);
    expect(calculateBookingFee(undefined).isValid).toBe(false);
  });

  it("returns an invalid result for non-numeric input", () => {
    const fee = calculateBookingFee("not-a-number");
    expect(fee.isValid).toBe(false);
    expect(fee.customerPaysPounds).toBe("0.00");
  });

  it("customer always pays more than the deposit (fee is never zero/negative)", () => {
    const fee = calculateBookingFee(10);
    expect(fee.customerPaysPence).toBeGreaterThan(fee.depositPence);
  });
});
