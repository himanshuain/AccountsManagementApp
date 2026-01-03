import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// Regex to identify bcrypt hashes (supports $2a$, $2b$, $2y$ prefixes)
const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$.{53}$/;

/**
 * Check if a value looks like a bcrypt hash
 * @param {string} value - The value to check
 * @returns {boolean}
 */
function isBcryptHash(value) {
  if (!value || typeof value !== "string") return false;
  // bcrypt hashes are always 60 characters and start with $2a$, $2b$, or $2y$
  return BCRYPT_HASH_REGEX.test(value);
}

/**
 * Hash a password using bcrypt
 * @param {string} password - The plain text password
 * @returns {Promise<string>} - The hashed password
 */
export async function hashPassword(password) {
  return bcrypt.hash(String(password), SALT_ROUNDS);
}

/**
 * Legacy function name for backwards compatibility
 */
export async function hashPin(pin) {
  return hashPassword(pin);
}

/**
 * Verify a password against a hash
 * Handles both legacy plaintext passwords and bcrypt hashes
 * @param {string} password - The plain text password to verify
 * @param {string} storedValue - The stored password (either hash or legacy plaintext)
 * @returns {Promise<{ valid: boolean, needsUpgrade: boolean }>}
 */
export async function verifyPassword(password, storedValue) {
  // Ensure password is a string
  const passwordStr = String(password);

  // Check if the stored value is a bcrypt hash
  if (isBcryptHash(storedValue)) {
    // It's a hash - use bcrypt compare
    try {
      const valid = await bcrypt.compare(passwordStr, storedValue);
      return { valid, needsUpgrade: false };
    } catch (error) {
      console.error("bcrypt compare error:", error);
      return { valid: false, needsUpgrade: false };
    }
  }

  // Legacy plaintext comparison
  const valid = passwordStr === storedValue;
  return { valid, needsUpgrade: valid }; // Only upgrade if the password is correct
}

/**
 * Legacy function name for backwards compatibility
 */
export async function verifyPin(pin, storedValue) {
  return verifyPassword(pin, storedValue);
}

/**
 * Check if a stored value is already hashed
 * @param {string} value - The stored value
 * @returns {boolean}
 */
export function isHashed(value) {
  return isBcryptHash(value);
}

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePasswordStrength(password) {
  const errors = [];

  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  if (password && password.length > 128) {
    errors.push("Password must be less than 128 characters");
  }

  // Note: We're keeping it simple - no complex requirements
  // This allows the user to set a simple but secure password

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  hashPassword,
  hashPin,
  verifyPassword,
  verifyPin,
  isHashed,
  validatePasswordStrength,
};
