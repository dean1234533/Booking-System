// src/context/TenantContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const TenantContext = createContext();

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveTenant() {
      const host = window.location.hostname; // e.g., "deansfades.com" or "localhost"
      const mainDomain = "yourplatform.com";

      // If we are NOT on the main platform, try to find a barber with this domain
      if (host !== mainDomain && host !== "localhost") {
        try {
          const q = query(collection(db, "barbers"), where("domain", "==", host));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Found the barber who owns this domain!
            setTenant(querySnapshot.docs[0].data());
          }
        } catch (error) {
          console.error("Domain resolution failed:", error);
        }
      }
      setLoading(false);
    }
    resolveTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);