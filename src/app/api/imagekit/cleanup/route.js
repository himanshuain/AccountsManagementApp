import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { collectAllDatabaseImageRefs } from "@/lib/collect-database-images";
import { extractStorageKeyFromUrl, getComparableImageRefs, isImageKitUrl } from "@/lib/image-url";

export const dynamic = "force-dynamic";

function isImageKitFileUsed(file, dbRefs) {
  if (!file?.url) return false;
  if (dbRefs.has(file.url)) return true;

  const fileRefs = getComparableImageRefs(file.url);
  if (fileRefs.some(r => dbRefs.has(r))) return true;

  if (isImageKitUrl(file.url)) {
    const key = extractStorageKeyFromUrl(file.url);
    if (key && dbRefs.has(key)) return true;
  }

  return false;
}

/**
 * Clean up orphaned images from ImageKit media library (legacy direct uploads).
 * R2-backed images are not listed here; use /api/storage/cleanup for R2.
 */
export async function POST(request) {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

    if (!privateKey) {
      return NextResponse.json({
        success: false,
        error: "ImageKit not configured",
      });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Database not configured",
      });
    }

    const usedImageRefs = await collectAllDatabaseImageRefs();
    const authString = Buffer.from(`${privateKey}:`).toString("base64");

    const filesResponse = await fetch("https://api.imagekit.io/v1/files?limit=1000", {
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });

    if (!filesResponse.ok) {
      throw new Error("Failed to fetch files from ImageKit");
    }

    const files = await filesResponse.json();
    const orphanedFiles = files.filter(file => !isImageKitFileUsed(file, usedImageRefs));

    let deletedCount = 0;
    const errors = [];

    for (const file of orphanedFiles) {
      try {
        const deleteResponse = await fetch(`https://api.imagekit.io/v1/files/${file.fileId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${authString}`,
          },
        });

        if (deleteResponse.ok) {
          deletedCount++;
        } else {
          errors.push({ fileId: file.fileId, error: "Delete failed" });
        }
      } catch (error) {
        errors.push({ fileId: file.fileId, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalFilesScanned: files.length,
        usedImagesCount: usedImageRefs.size,
        orphanedFilesFound: orphanedFiles.length,
        deletedCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("[Cleanup API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET: Preview orphaned images without deleting
 */
export async function GET(request) {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

    if (!privateKey) {
      return NextResponse.json({
        success: false,
        error: "ImageKit not configured",
      });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Database not configured",
      });
    }

    const usedImageRefs = await collectAllDatabaseImageRefs();
    const authString = Buffer.from(`${privateKey}:`).toString("base64");

    const filesResponse = await fetch("https://api.imagekit.io/v1/files?limit=1000", {
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });

    if (!filesResponse.ok) {
      throw new Error("Failed to fetch files from ImageKit");
    }

    const files = await filesResponse.json();
    const orphanedFiles = files.filter(file => !isImageKitFileUsed(file, usedImageRefs));
    const totalOrphanedSize = orphanedFiles.reduce((sum, file) => sum + (file.size || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalFilesInStorage: files.length,
        usedImagesCount: usedImageRefs.size,
        orphanedFilesCount: orphanedFiles.length,
        potentialSavings: formatBytes(totalOrphanedSize),
        potentialSavingsBytes: totalOrphanedSize,
        orphanedFiles: orphanedFiles.map(f => ({
          fileId: f.fileId,
          name: f.name,
          url: f.url,
          size: f.size,
          sizeFormatted: formatBytes(f.size),
          createdAt: f.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("[Cleanup API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
