/**
 * ImageKit integration for image storage and optimization
 * Supports lazy loading, LQIP, and thumbnail generation
 * 
 * URL Format: https://ik.imagekit.io/{id}/tr:{transformations}/{path}
 * See: https://imagekit.io/docs/image-transformation
 */

// ImageKit configuration
const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";
const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "";

/**
 * Check if ImageKit is properly configured
 */
export function isImageKitConfigured() {
  return !!(IMAGEKIT_URL_ENDPOINT && IMAGEKIT_PUBLIC_KEY);
}

/**
 * Get the ImageKit URL endpoint
 */
export function getImageKitUrlEndpoint() {
  return IMAGEKIT_URL_ENDPOINT;
}

/**
 * Build ImageKit transformation URL
 * ImageKit URL format: https://ik.imagekit.io/{imagekit_id}/tr:{transformations}/{file_path}
 * 
 * @param {string} imageUrl - Original ImageKit URL
 * @param {string} transformString - Transformation string (e.g., "w-300,h-300,q-80")
 * @returns {string} Transformed URL
 */
function buildTransformUrl(imageUrl, transformString) {
  if (!imageUrl || !transformString) return imageUrl;
  
  try {
    const url = new URL(imageUrl);
    
    // Check if it's an ImageKit URL
    if (!url.hostname.includes("imagekit.io")) {
      return imageUrl;
    }
    
    // Get path parts: [imagekit_id, ...rest]
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 2) return imageUrl;
    
    // First part is the imagekit ID, rest is the file path
    const imagekitId = pathParts[0];
    const filePath = pathParts.slice(1).join("/");
    
    // Build new URL with transformation
    // Format: /imagekit_id/tr:transformations/filepath
    url.pathname = `/${imagekitId}/tr:${transformString}/${filePath}`;
    
    return url.toString();
  } catch (e) {
    console.error("Error building transform URL:", e);
    return imageUrl;
  }
}

/**
 * Get optimized image URL with ImageKit transformations
 * @param {string} imagePath - The image path or full URL
 * @param {Object} options - Transformation options
 * @returns {Object} Object containing src, lqip, and thumbnail URLs
 */
export function getOptimizedImageUrl(imagePath, options = {}) {
  if (!imagePath) return { src: "", lqip: "", thumbnail: "", original: "" };
  
  // If it's a base64 data URL, return as-is
  if (imagePath.startsWith("data:")) {
    return { 
      src: imagePath, 
      lqip: imagePath, 
      thumbnail: imagePath,
      original: imagePath,
    };
  }
  
  // If it's not an ImageKit URL, return as-is
  if (!imagePath.includes("ik.imagekit.io")) {
    return { 
      src: imagePath, 
      lqip: imagePath, 
      thumbnail: imagePath,
      original: imagePath,
    };
  }
  
  const {
    width,
    height,
    quality = 80,
    blur,
  } = options;
  
  // Build main transformation string
  const transforms = [];
  if (width) transforms.push(`w-${width}`);
  if (height) transforms.push(`h-${height}`);
  if (quality) transforms.push(`q-${quality}`);
  if (blur) transforms.push(`bl-${blur}`);
  transforms.push("f-auto"); // Auto format (WebP/AVIF)
  transforms.push("pr-true"); // Progressive loading
  
  const mainTransform = transforms.join(",");
  
  // LQIP: Very small, heavily blurred placeholder for slow connections
  const lqipTransform = "w-40,q-20,bl-30,f-auto";
  
  // Thumbnail: Small, optimized for grids/lists
  const thumbnailTransform = "w-200,h-200,q-60,c-at_max,f-auto";
  
  // Medium: For previews in forms
  const mediumTransform = "w-400,q-70,f-auto,pr-true";
  
  return {
    src: buildTransformUrl(imagePath, mainTransform),
    lqip: buildTransformUrl(imagePath, lqipTransform),
    thumbnail: buildTransformUrl(imagePath, thumbnailTransform),
    medium: buildTransformUrl(imagePath, mediumTransform),
    original: imagePath,
  };
}

/**
 * Generate srcset for responsive images
 * @param {string} imagePath - The image path
 * @param {number[]} widths - Array of widths for srcset
 * @returns {string} srcset string
 */
export function generateSrcSet(imagePath, widths = [320, 640, 768, 1024, 1280]) {
  if (!imagePath || !imagePath.includes("ik.imagekit.io")) return "";
  
  return widths
    .map(w => {
      const transform = `w-${w},q-75,f-auto`;
      return `${buildTransformUrl(imagePath, transform)} ${w}w`;
    })
    .join(", ");
}

/**
 * Get a specific transformation URL
 * @param {string} imageUrl - Original ImageKit URL
 * @param {Object} options - Transformation options
 * @returns {string} Transformed URL
 */
export function getTransformedUrl(imageUrl, options = {}) {
  if (!imageUrl || !imageUrl.includes("ik.imagekit.io")) return imageUrl;
  
  const transforms = [];
  if (options.width) transforms.push(`w-${options.width}`);
  if (options.height) transforms.push(`h-${options.height}`);
  if (options.quality) transforms.push(`q-${options.quality}`);
  if (options.blur) transforms.push(`bl-${options.blur}`);
  if (options.crop) transforms.push(`c-${options.crop}`);
  if (options.format !== false) transforms.push("f-auto");
  if (options.progressive !== false) transforms.push("pr-true");
  
  return buildTransformUrl(imageUrl, transforms.join(","));
}

/**
 * Get ImageKit upload authentication parameters
 * This should be called from a server-side API route
 */
export async function getUploadAuthParams() {
  const response = await fetch("/api/imagekit/auth");
  if (!response.ok) {
    throw new Error("Failed to get upload authentication");
  }
  return response.json();
}

/**
 * Upload image to ImageKit
 * @param {File|Blob} file - The file to upload
 * @param {string} folder - The folder to upload to
 * @param {string} fileName - Optional custom file name
 * @returns {Promise<Object>} Upload response with URL
 */
export async function uploadToImageKit(file, folder = "general", fileName = null) {
  if (!isImageKitConfigured()) {
    throw new Error("ImageKit is not configured");
  }
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  if (fileName) {
    formData.append("fileName", fileName);
  }
  
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Upload failed");
  }
  
  return response.json();
}

/**
 * Delete image from ImageKit
 * @param {string} fileId - The ImageKit file ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFromImageKit(fileId) {
  const response = await fetch(`/api/imagekit/delete?fileId=${fileId}`, {
    method: "DELETE",
  });
  
  return response.ok;
}

export default {
  isImageKitConfigured,
  getImageKitUrlEndpoint,
  getOptimizedImageUrl,
  generateSrcSet,
  uploadToImageKit,
  deleteFromImageKit,
};

