// Firebase Auth's own floor is 6 characters with no complexity requirement at
// all, so "123456" was a valid password. This is the single shared check used
// by every password-creation form (Signup, StaffSignup) so the rule can't
// drift between them.
const COMMON_WEAK_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "password1",
  "password123", "qwerty123", "qwertyui", "letmein1", "welcome1",
  "abc12345", "iloveyou1", "admin123", "changeme1",
]);

export const PASSWORD_HELP_TEXT = "At least 8 characters, with a letter and a number.";

// Returns an error message string, or null if the password is acceptable.
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return "Use at least 8 characters.";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Include at least one letter and one number.";
  }
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return "That password is too common — please choose a stronger one.";
  }
  return null;
}
