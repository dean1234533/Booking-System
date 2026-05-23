import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Fetch the shared business document details using the account UID
          const docRef = doc(db, "barbers", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            setUserProfile({
              ...profileData,
              // Safe fallbacks to guarantee industry types are never unassigned
              businessType: profileData.businessType || "barber",
              isAlternative: profileData.businessType && profileData.businessType !== "barber"
            });
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Context Error pulling Firestore profile:", err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    isBarber: userProfile?.businessType === "barber",
    isTrainer: userProfile?.businessType === "trainer",
    isPhoto: userProfile?.businessType === "photography",
    isTutor: userProfile?.businessType === "tutor"
  };

  return (
    <AppContext.Provider value={value}>
      {!loading && children}
    </AppContext.Provider>
  );
}

// Custom hook helper to read global state values across any inner page effortlessly
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside an AppProvider wrapper");
  }
  return context;
}