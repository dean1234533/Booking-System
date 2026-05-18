/**
 * bookingHelpers.js
 *
 * Confirmed against Firestore screenshots (2026-05-17):
 *
 * barbers/{id}:
 *   email:         "deanburt1308@gmail.com"  ← confirmed field name
 *   depositAmount: 25                         ← stored as NUMBER
 *
 * bookings/{id}:
 *   bookingFee:    "2.18"                     ← stored as STRING
 *   depositAmount: "25"                       ← stored as STRING
 *   email:         "sean_bree@yahoo.com"      ← this is the CLIENT email
 *   barberName:    "Dean B"
 *   barberId:      "mkQq8atYhreSUdJuWLFBK3Nnl5H2"
 *
 * Usage:
 *   import { getBarberEmail, calculateBookingFee, resolveBarberEmailAndFee }
 *     from "../utils/bookingHelpers";
 */

// ─── EMAIL ────────────────────────────────────────────────────────────────────

/**
 * Safely extracts the barber's email from the barber object.
 * Confirmed from Firestore: the field is called `email` on the barbers doc.
 *
 * @param {object} barber - Barber object from Firestore / useAuth
 * @returns {string|null}
 *
 * @example
 *   const email = getBarberEmail(barber);
 *   // → "deanburt1308@gmail.com"
 */
export function getBarberEmail(barber) {
  if (!barber || typeof barber !== "object") {
    console.warn("[getBarberEmail] No barber object provided");
    return null;
  }

  // Confirmed field name from screenshot: "email"
  // Extra fields kept as fallbacks for legacy records
  const candidates = [
    barber.email,         // ✅ confirmed in Firestore barbers doc
    barber.barberEmail,   // fallback
    barber.contactEmail,  // fallback
    barber.ownerEmail,    // fallback
  ];

  for (const candidate of candidates) {
    if (isValidEmail(candidate)) {
      return candidate.trim().toLowerCase();
    }
  }

  console.warn("[getBarberEmail] No valid email found. Barber object keys:", Object.keys(barber));
  return null;
}

function isValidEmail(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.includes("@") &&
    value !== "undefined" &&
    value !== "null"
  );
}


// ─── BOOKING FEE ─────────────────────────────────────────────────────────────

/**
 * Calculates booking fee from a deposit amount.
 * Mirrors create-intent.js server logic exactly.
 *
 * IMPORTANT: Firestore stores depositAmount as a STRING ("25") in bookings
 * and as a NUMBER (25) in barbers. This function safely handles both.
 *
 * @param {number|string} depositAmount - Deposit in POUNDS e.g. 25 or "25"
 * @returns {{
 *   depositPence:       number,
 *   bookingFeePence:    number,
 *   customerPaysPence:  number,
 *   depositPounds:      string,   "25.00"
 *   bookingFeePounds:   string,   "2.18"
 *   customerPaysPounds: string,   "27.18"
 *   isValid:            boolean
 * }}
 *
 * @example
 *   const fee = calculateBookingFee(barber.depositAmount); // 25 or "25"
 *   fee.bookingFeePounds   // "2.18"
 *   fee.customerPaysPounds // "27.18"
 */
export function calculateBookingFee(depositAmount) {
  const PLATFORM_FEE_PERCENT = 0.05;
  const STRIPE_PERCENT       = 0.0175;
  const STRIPE_FIXED_PENCE   = 45;

  // Handles both string "25" and number 25 from Firestore
  const depositPounds = Number(depositAmount);

  if (!depositAmount || isNaN(depositPounds) || depositPounds <= 0) {
    console.warn("[calculateBookingFee] Invalid depositAmount received:", depositAmount);
    return {
      depositPence:       0,
      bookingFeePence:    0,
      customerPaysPence:  0,
      depositPounds:      "0.00",
      bookingFeePounds:   "0.00",
      customerPaysPounds: "0.00",
      isValid:            false,
    };
  }

  const depositPence      = Math.round(depositPounds * 100);
  const platformFee       = Math.round(depositPence * PLATFORM_FEE_PERCENT);
  const customerPaysPence = Math.ceil(
    (depositPence + platformFee + STRIPE_FIXED_PENCE) / (1 - STRIPE_PERCENT)
  );
  const bookingFeePence   = customerPaysPence - depositPence;

  return {
    depositPence,
    bookingFeePence,
    customerPaysPence,
    depositPounds:      (depositPence      / 100).toFixed(2),   // "25.00"
    bookingFeePounds:   (bookingFeePence   / 100).toFixed(2),   // "2.18"
    customerPaysPounds: (customerPaysPence / 100).toFixed(2),   // "27.18"
    isValid: true,
  };
}


/**
 * Reads the bookingFee already stored on a booking document.
 * Use this in the dashboard/cancel email when you already have the booking
 * record — avoids recalculating a fee that was already saved at checkout.
 *
 * Confirmed from Firestore: bookingFee is stored as a string "2.18"
 *                           depositAmount is stored as a string "25"
 *
 * @param {object} booking - Booking document from Firestore
 * @returns {{
 *   bookingFeePounds:  string,   "2.18"
 *   depositPounds:     string,   "25.00"
 *   isValid:           boolean
 * }}
 *
 * @example
 *   const { bookingFeePounds, depositPounds } = getStoredFee(booking);
 */
export function getStoredFee(booking) {
  if (!booking) {
    return { bookingFeePounds: "0.00", depositPounds: "0.00", isValid: false };
  }

  const fee     = Number(booking.bookingFee);
  const deposit = Number(booking.depositAmount);

  const feeValid     = !isNaN(fee)     && fee     >= 0;
  const depositValid = !isNaN(deposit) && deposit >= 0;

  return {
    bookingFeePounds:  feeValid     ? fee.toFixed(2)     : "0.00",
    depositPounds:     depositValid ? deposit.toFixed(2) : "0.00",
    isValid:           feeValid && depositValid,
  };
}


// ─── COMBINED HELPER ─────────────────────────────────────────────────────────

/**
 * Returns barber email + full fee breakdown in one call.
 * Use in CheckoutForm when building the post-payment email payload.
 *
 * @param {object} barber - Barber object from Firestore
 * @returns {{ email: string|null, fee: ReturnType<calculateBookingFee> }}
 *
 * @example
 *   const { email, fee } = resolveBarberEmailAndFee(barber);
 *
 *   // Guards
 *   if (!email)       console.error("No barber email — check Firestore barbers doc");
 *   if (!fee.isValid) console.error("Bad depositAmount:", barber.depositAmount);
 *
 *   // Email payload
 *   body: JSON.stringify({
 *     barberEmail:   email,                  // "deanburt1308@gmail.com"
 *     depositAmount: fee.depositPounds,       // "25.00"
 *     bookingFee:    fee.bookingFeePounds,    // "2.18"
 *   })
 */
export function resolveBarberEmailAndFee(barber) {
  return {
    email: getBarberEmail(barber),
    fee:   calculateBookingFee(barber?.depositAmount),
  };
}
