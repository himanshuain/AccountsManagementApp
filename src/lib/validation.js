import { z } from "zod";

/**
 * Common validation schemas for API input validation
 */

// UUID validation
export const uuidSchema = z.string().uuid("Invalid ID format");

// Common field validators
export const phoneSchema = z.string().max(20, "Phone number too long").optional().nullable();
export const emailSchema = z
  .string()
  .email("Invalid email")
  .max(100)
  .optional()
  .nullable()
  .or(z.literal(""));
export const textSchema = z.string().max(500, "Text too long").optional().nullable();
export const longTextSchema = z.string().max(2000, "Text too long").optional().nullable();
export const nameSchema = z.string().min(1, "Name is required").max(200, "Name too long");
export const optionalNameSchema = z.string().max(200, "Name too long").optional().nullable();

// Amount validation (supports Indian currency up to crores)
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform(val => (typeof val === "string" ? parseFloat(val) : val))
  .refine(val => !isNaN(val) && val >= 0 && val <= 99999999999, {
    message: "Amount must be between 0 and 99,99,99,99,999",
  })
  .optional()
  .nullable();

// Date validation
export const dateSchema = z
  .string()
  .refine(val => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: "Invalid date format (YYYY-MM-DD)",
  })
  .optional()
  .nullable();

// Payment status validation
export const paymentStatusSchema = z
  .enum(["pending", "partial", "paid"])
  .optional()
  .default("pending");

// Payment mode validation
export const paymentModeSchema = z
  .enum(["cash", "upi", "bank", "cheque", "other"])
  .optional()
  .default("upi");

// URL validation for images - supports both storage keys and full URLs
export const imageUrlSchema = z
  .string()
  .max(2000, "URL too long")
  .refine(
    val => {
      if (!val) return true; // Allow empty
      // Allow: storage keys, http URLs, https URLs, and data URLs
      // Storage keys: don't start with http/data, contain only safe path characters
      const isStorageKey = /^[a-zA-Z0-9_\-\/\.]+$/.test(val) && !val.startsWith("http") && !val.startsWith("data:");
      const isUrl = val.startsWith("http://") || val.startsWith("https://");
      const isDataUrl = val.startsWith("data:");
      return isStorageKey || isUrl || isDataUrl;
    },
    {
      message: "Invalid image URL or storage key",
    }
  )
  .optional()
  .nullable();

// Array of image URLs/storage keys
export const imageArraySchema = z
  .array(imageUrlSchema)
  .max(50, "Too many images")
  .optional()
  .nullable();

// JSONB payments array
export const paymentsArraySchema = z
  .array(
    z.object({
      amount: amountSchema,
      date: dateSchema,
      mode: paymentModeSchema,
      notes: textSchema,
      isFinalPayment: z.boolean().optional(),
    })
  )
  .max(100, "Too many payment records")
  .optional()
  .nullable();

// ==================== ENTITY SCHEMAS ====================

// Supplier validation schema
export const supplierSchema = z.object({
  id: uuidSchema.optional(),
  name: optionalNameSchema,
  companyName: optionalNameSchema,
  phone: phoneSchema,
  email: emailSchema,
  gstNumber: z.string().max(20).optional().nullable(),
  address: longTextSchema,
  upiId: z.string().max(100).optional().nullable(),
  upiQrCode: imageUrlSchema,
  profilePicture: imageUrlSchema,
  notes: longTextSchema,
});

// Transaction validation schema
export const transactionSchema = z.object({
  id: uuidSchema.optional(),
  supplierId: uuidSchema.optional().nullable(),
  date: dateSchema,
  amount: amountSchema,
  paidAmount: amountSchema,
  itemName: textSchema,
  paymentStatus: paymentStatusSchema,
  paymentMode: paymentModeSchema,
  dueDate: dateSchema,
  payments: paymentsArraySchema,
  notes: longTextSchema,
  billImages: imageArraySchema,
});

// Customer validation schema
export const customerSchema = z.object({
  id: uuidSchema.optional(),
  name: nameSchema,
  phone: phoneSchema,
  address: longTextSchema,
  profilePicture: imageUrlSchema,
  khataPhoto: imageUrlSchema,
  khataPhotos: imageArraySchema,
  totalPending: amountSchema,
});

// Udhar validation schema
export const udharSchema = z.object({
  id: uuidSchema.optional(),
  customerId: uuidSchema.optional().nullable(),
  date: dateSchema,
  amount: amountSchema,
  cashAmount: amountSchema,
  onlineAmount: amountSchema,
  paidAmount: amountSchema,
  paidCash: amountSchema,
  paidOnline: amountSchema,
  paymentStatus: paymentStatusSchema,
  payments: paymentsArraySchema,
  khataPhotos: imageArraySchema,
  itemDescription: longTextSchema,
  notes: longTextSchema,
});

// Income validation schema
export const incomeSchema = z.object({
  id: uuidSchema.optional(),
  date: dateSchema,
  type: z.enum(["daily", "weekly", "monthly", "other"]).optional().default("daily"),
  amount: amountSchema,
  cashAmount: amountSchema,
  onlineAmount: amountSchema,
  description: longTextSchema,
});

// ==================== VALIDATION HELPERS ====================

/**
 * Validate request body against a schema
 * Returns { success: true, data } or { success: false, error }
 */
export function validateBody(body, schema) {
  try {
    const result = schema.safeParse(body);
    if (result.success) {
      return { success: true, data: result.data };
    }

    // Format Zod errors into readable message
    const errors = result.error.errors.map(err => {
      const path = err.path.join(".");
      return path ? `${path}: ${err.message}` : err.message;
    });

    return { success: false, error: errors.join(", ") };
  } catch (error) {
    return { success: false, error: "Validation failed" };
  }
}

/**
 * Validate and sanitize a single field
 */
export function sanitizeString(value, maxLength = 500) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return String(value).slice(0, maxLength);

  // Remove potential XSS characters and trim
  return value
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate UUID parameter
 */
export function validateUUID(id) {
  const result = uuidSchema.safeParse(id);
  return result.success;
}

const validationSchemas = {
  supplierSchema,
  transactionSchema,
  customerSchema,
  udharSchema,
  incomeSchema,
  validateBody,
  validateUUID,
  sanitizeString,
};

export default validationSchemas;
