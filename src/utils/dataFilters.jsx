/**
 * Helper to validate if a barber or shop object is "real"
 */
export const isValidBarber = (barber) => {
  if (!barber) return false;
  
  // Strict check for name existence and content
  const hasName = barber.name && 
                  barber.name.trim() !== "" && 
                  barber.name !== "undefined";
                  
  const hasBusiness = barber.businessName && 
                      barber.businessName.trim() !== "" && 
                      barber.businessName !== "undefined";
  
  // Must have a name AND a valid Firestore ID
  return !!((hasName || hasBusiness) && (barber.id || barber.uid));
};

/**
 * Filters an array of barbers to remove ghost cards
 */
export const filterGhostCards = (barberArray) => {
  if (!Array.isArray(barberArray)) return [];
  return barberArray.filter(isValidBarber);
};