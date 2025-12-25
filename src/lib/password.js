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
 * Hash a PIN using bcrypt
 * @param {string} pin - The plain text PIN
 * @returns {Promise<string>} - The hashed PIN
 */
export async function hashPin(pin) {
  return bcrypt.hash(String(pin), SALT_ROUNDS);
}

/**
 * Verify a PIN against a hash
 * Handles both legacy plaintext PINs and new bcrypt hashes
 * @param {string} pin - The plain text PIN to verify
 * @param {string} storedValue - The stored PIN (either hash or legacy plaintext)
 * @returns {Promise<{ valid: boolean, needsUpgrade: boolean }>}
 */
export async function verifyPin(pin, storedValue) {
  // Ensure pin is a string
  const pinStr = String(pin);
  
  // Check if the stored value is a bcrypt hash
  if (isBcryptHash(storedValue)) {
    // It's a hash - use bcrypt compare
    try {
      const valid = await bcrypt.compare(pinStr, storedValue);
      return { valid, needsUpgrade: false };
    } catch (error) {
      console.error("bcrypt compare error:", error);
      return { valid: false, needsUpgrade: false };
    }
  }

  // Legacy plaintext comparison
  const valid = pinStr === storedValue;
  return { valid, needsUpgrade: valid }; // Only upgrade if the PIN is correct
}

/**
 * Check if a stored value is already hashed
 * @param {string} value - The stored value
 * @returns {boolean}
 */
export function isHashed(value) {
  return isBcryptHash(value);
}

export default {
  hashPin,
  verifyPin,
  isHashed,
};
