import { useContext } from "react";
// Correct path based on your earlier update
import { AuthContext } from "../components/AuthContext"; 

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};