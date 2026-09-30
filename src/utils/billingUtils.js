import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Get billing info for a user
 * @param {string} userId - User ID
 * @returns {object} Billing info with cost calculation
 */
export async function getBillingInfo(userId) {
  try {
    const userDoc = await getDoc(doc(db, "barbers", userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    const businessType = userData.businessType || "barber";

    // Flat fee for every business type, unlimited clients, no per-client
    // metering. See PLATFORM_FEE_PERCENT in bookingHelpers.jsx for the same
    // "no puzzle" reasoning applied to the transaction-fee side of pricing.
    const baseCost = "£10.00";
    return {
      businessType,
      baseCost,
      totalCost: baseCost,
      message: "Flat monthly fee — unlimited clients",
    };
  } catch (error) {
    console.error("Error getting billing info:", error);
    return null;
  }
}

