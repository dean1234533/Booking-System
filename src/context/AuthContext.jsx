import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This listens to Firebase and updates the 'barber' state globally
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setBarber(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ barber, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};