import { NextResponse } from "next/server";
import { uploadToR2, generateStorageKey, isR2Configured } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

// Security constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max file size
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];
const ALLOWED_FOLDERS = ["general", "suppliers", "customers", "bills", "receipts", "khata", "qr-codes"];

/**
 * Validate file type by checking magic bytes (file signature)
 * This prevents content-type spoofing attacks
 */
function validateFileSignature(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return "image/jpeg";
  }
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return "image/png";
  }
  
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  
  // HEIC/HEIF: Check for ftyp box with heic/heif brand
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return "image/heic";
  }
  
  return null;
}

/**
 * Upload image to Cloudflare R2
 *
 * Security features:
 * - File type validation (MIME type + magic bytes)
 * - File size limit (10MB)
 * - Folder whitelist
 * - Sanitized storage keys
 *
 * Returns only the storage key (not full URL).
 * The client resolves the storage key to a CDN URL at display time.
 *
 * Example response: { success: true, storageKey: "suppliers/1703520000000-abc123.jpg" }
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "general";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: "Storage not configured. Please set up R2 credentials." },
        { status: 500 }
      );
    }

    // Validate folder (whitelist approach)
    const sanitizedFolder = folder.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!ALLOWED_FOLDERS.includes(sanitizedFolder)) {
      console.warn(`[Upload] Invalid folder attempted: ${folder}`);
      return NextResponse.json(
        { success: false, error: "Invalid folder specified" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Get file extension and validate
    const extension = file.name?.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    // Validate MIME type
    const declaredMimeType = file.type?.toLowerCase() || "";
    if (!ALLOWED_MIME_TYPES.includes(declaredMimeType)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    // Get file data
    const arrayBuffer = await file.arrayBuffer();

    // Validate file signature (magic bytes) to prevent content-type spoofing
    const detectedMimeType = validateFileSignature(arrayBuffer);
    if (!detectedMimeType) {
      console.warn(`[Upload] File signature validation failed for: ${file.name}`);
      return NextResponse.json(
        { success: false, error: "Invalid file format. File does not appear to be a valid image." },
        { status: 400 }
      );
    }

    // Generate storage key
    const storageKey = generateStorageKey(sanitizedFolder, file.name);

    // Upload to R2 with detected content type for security
    const result = await uploadToR2(arrayBuffer, storageKey, detectedMimeType);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Upload failed" },
        { status: 500 }
      );
    }

    // Return only the storage key (not the full URL)
    // Client will resolve this to a CDN URL at display time
    return NextResponse.json({
      success: true,
      storageKey: result.storageKey,
      // For backwards compatibility, also include url
      // This is resolved from the storage key
      url: result.storageKey,
    });
  } catch (error) {
    console.error("[Upload] Failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
