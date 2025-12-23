import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// Prefix to identify hashed PINs (vs legacy plaintext)
const HASH_PREFIX = "$2a$";

/**
 * Hash a PIN using bcrypt
 * @param {string} pin - The plain text PIN
 * @returns {Promise<string>} - The hashed PIN
 */
export async function hashPin(pin) {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/**
 * Verify a PIN against a hash
 * Handles both legacy plaintext PINs and new bcrypt hashes
 * @param {string} pin - The plain text PIN to verify
 * @param {string} storedValue - The stored PIN (either hash or legacy plaintext)
 * @returns {Promise<{ valid: boolean, needsUpgrade: boolean }>}
 */
export async function verifyPin(pin, storedValue) {
  // Check if the stored value is a bcrypt hash
  if (storedValue && storedValue.startsWith(HASH_PREFIX)) {
    // It's a hash - use bcrypt compare
    const valid = await bcrypt.compare(pin, storedValue);
    return { valid, needsUpgrade: false };
  }
  
  // Legacy plaintext comparison
  const valid = pin === storedValue;
  return { valid, needsUpgrade: valid }; // Only upgrade if the PIN is correct
}

/**
 * Check if a stored value is already hashed
 * @param {string} value - The stored value
 * @returns {boolean}
 */
export function isHashed(value) {
  return value && value.startsWith(HASH_PREFIX);
}

export default {
  hashPin,
  verifyPin,
  isHashed,
};

