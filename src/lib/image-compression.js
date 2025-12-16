/**
 * Compress an image file while maintaining acceptable quality
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width (default: 1920)
 * @param {number} options.maxHeight - Maximum height (default: 1920)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
 * @param {number} options.maxSizeKB - Target max file size in KB (default: 500)
 * @returns {Promise<File>} - Compressed image file
 */
export async function compressImage(file, options = {}) {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8, maxSizeKB = 500 } = options;

  // Skip compression for small files (under 100KB)
  if (file.size < 100 * 1024) {
    return file;
  }

  // Skip compression for non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality adjustment
        const compressWithQuality = currentQuality => {
          canvas.toBlob(
            blob => {
              if (!blob) {
                resolve(file); // Return original if compression fails
                return;
              }

              // If still too large and quality can be reduced, try again
              if (blob.size > maxSizeKB * 1024 && currentQuality > 0.3) {
                compressWithQuality(currentQuality - 0.1);
                return;
              }

              // Create new file with compressed blob
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });

              // Log compression stats
              const originalSizeKB = Math.round(file.size / 1024);
              const compressedSizeKB = Math.round(compressedFile.size / 1024);
              const savings = Math.round(((file.size - compressedFile.size) / file.size) * 100);
              console.log(
                `[Image Compression] ${originalSizeKB}KB → ${compressedSizeKB}KB (${savings}% reduction)`
              );

              resolve(compressedFile);
            },
            "image/jpeg",
            currentQuality
          );
        };

        compressWithQuality(quality);
      };

      img.onerror = () => {
        resolve(file); // Return original if loading fails
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      resolve(file); // Return original if reading fails
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple images
 * @param {File[]} files - Array of image files to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File[]>} - Array of compressed image files
 */
export async function compressImages(files, options = {}) {
  return Promise.all(files.map(file => compressImage(file, options)));
}

export default compressImage;
