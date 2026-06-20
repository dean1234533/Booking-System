import { db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

export const fetchShopData = async (id) => {
  if (!id) {
    console.error("Helper Error: No ID provided to fetchShopData");
    return null;
  }

  try {
    // 1. Try fetching from 'tenants' (Primary Shop Collection)
    const tenantRef = doc(db, "tenants", id);
    const tenantSnap = await getDoc(tenantRef);

    if (tenantSnap.exists()) {
      return { id: tenantSnap.id, ...tenantSnap.data() };
    }

    // 2. If not found, check 'barbers' collection
    // (In case the ID in the URL is a barber's ID, not the shop ID)
    const barberRef = doc(db, "barbers", id);
    const barberSnap = await getDoc(barberRef);

    if (barberSnap.exists()) {
      const barberData = barberSnap.data();
      if (barberData.shopId) {
        // Recursively get the actual shop data using the barber's shopId link
        const linkedShopSnap = await getDoc(doc(db, "tenants", barberData.shopId));
        if (linkedShopSnap.exists()) {
          return { id: linkedShopSnap.id, ...linkedShopSnap.data() };
        }
      }
    }

    console.warn(`No shop found for ID: ${id}`);
    return null;
  } catch (error) {
    console.error("Firestore Helper Error:", error);
    return null;
  }
};