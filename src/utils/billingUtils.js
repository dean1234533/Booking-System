import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Count total number of clients for a PT
 * @param {string} trainerId - PT/trainer ID
 * @returns {number} Total client count
 */
export async function countClientsByTrainer(trainerId) {
  try {
    const clientsRef = collection(db, "barbers", trainerId, "clients");
    const snapshot = await getDocs(clientsRef);
    return snapshot.size;
  } catch (error) {
    console.error("Error counting clients:", error);
    return 0;
  }
}

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

    // Only calculate overage for trainers
    if (businessType !== "trainer") {
      return {
        businessType,
        baseCost: "£10.00",
        totalCost: "£10.00",
        clientCount: 0,
        overageUnits: 0,
        overageCost: "£0.00",
        message: "Flat monthly fee",
      };
    }

    // Get client count for trainers (only trainers have clients collection)
    let clientCount = 0;
    try {
      clientCount = await countClientsByTrainer(userId);
    } catch (clientError) {
      console.error("Error counting clients, defaulting to 0:", clientError);
      clientCount = 0;
    }
    const freeClients = 10;
    const overageClients = Math.max(0, clientCount - freeClients);
    const overageUnits = Math.ceil(overageClients / 3);
    const overageCost = (overageUnits * 1.5).toFixed(2);
    const totalCost = (20 + parseFloat(overageCost)).toFixed(2);

    return {
      businessType,
      baseCost: "£20.00",
      overageCost: `£${overageCost}`,
      totalCost: `£${totalCost}`,
      clientCount,
      freeClients,
      overageClients,
      overageUnits,
      message: `${clientCount} clients (${freeClients} included + ${overageClients} extra)`,
    };
  } catch (error) {
    console.error("Error getting billing info:", error);
    return null;
  }
}

/**
 * Report usage to Stripe for a PT
 * @param {string} barberId - PT/trainer ID
 * @param {string} email - User email
 * @param {number} clientCount - Current client count
 */
export async function reportUsageToStripe(barberId, email, clientCount) {
  try {
    const response = await fetch("/api/report-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberId,
        email,
        clientCount,
      }),
    });

    if (!response.ok) {
      console.error("Failed to report usage:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error reporting usage:", error);
    return null;
  }
}

/**
 * Format cost for display
 * @param {string} cost - Cost string like "£20.00"
 * @returns {string} Formatted cost
 */
export function formatCost(cost) {
  if (typeof cost !== "string") return "£0.00";
  return cost.startsWith("£") ? cost : `£${cost}`;
}

/**
 * Calculate total monthly cost for a trainer
 * @param {number} clientCount - Number of clients
 * @returns {string} Total cost formatted
 */
export function calculateTrainerCost(clientCount) {
  const baseCost = 20;
  const freeClients = 10;
  const overageClients = Math.max(0, clientCount - freeClients);
  const overageUnits = Math.ceil(overageClients / 3);
  const overageCost = overageUnits * 1.5;
  const totalCost = baseCost + overageCost;

  return {
    base: "£20.00",
    overage: `£${overageCost.toFixed(2)}`,
    total: `£${totalCost.toFixed(2)}`,
    breakdown: `£20 (base) + ${overageUnits} × £1.50 (${overageClients} extra clients)`,
  };
}
