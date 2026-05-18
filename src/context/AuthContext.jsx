import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await signOut(auth);
      // Optional: Add a window.location.href = "/login" here if 
      // your router doesn't automatically handle the redirect.
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setBarber(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Memoize the value to optimize performance
  const value = useMemo(() => ({
    barber,
    loading,
    logout
  }), [barber, loading]);

  return (
    <AuthContext.Provider value={value}>
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