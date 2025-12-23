import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Clean up orphaned images from ImageKit that are not linked to any data
 * This helps reduce storage costs by removing unused images
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

    // Get all image URLs used in the app
    const usedImageUrls = new Set();
    const supabase = getServerClient();

    // Collect images from customers
    const { data: customers } = await supabase
      .from("customers")
      .select("profilePicture, khataPhotos");

    customers?.forEach(customer => {
      if (customer.profilePicture) usedImageUrls.add(customer.profilePicture);
      if (customer.khataPhotos) {
        customer.khataPhotos.forEach(url => usedImageUrls.add(url));
      }
    });

    // Collect images from suppliers
    const { data: suppliers } = await supabase.from("suppliers").select("logo, photos");

    suppliers?.forEach(supplier => {
      if (supplier.logo) usedImageUrls.add(supplier.logo);
      if (supplier.photos) {
        supplier.photos.forEach(url => usedImageUrls.add(url));
      }
    });

    // Collect images from transactions
    const { data: transactions } = await supabase.from("transactions").select("billImages");

    transactions?.forEach(transaction => {
      if (transaction.billImages) {
        transaction.billImages.forEach(url => usedImageUrls.add(url));
      }
    });

    // Collect images from udhar
    const { data: udharList } = await supabase.from("udhar").select("billImage");

    udharList?.forEach(udhar => {
      if (udhar.billImage) usedImageUrls.add(udhar.billImage);
    });

    // Get all files from ImageKit
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

    // Find orphaned files
    const orphanedFiles = files.filter(file => {
      return !usedImageUrls.has(file.url);
    });

    // Delete orphaned files
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
        usedImagesCount: usedImageUrls.size,
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

    // Get all image URLs used in the app
    const usedImageUrls = new Set();
    const supabase = getServerClient();

    // Collect images from all tables
    const { data: customers } = await supabase
      .from("customers")
      .select("profilePicture, khataPhotos");

    customers?.forEach(customer => {
      if (customer.profilePicture) usedImageUrls.add(customer.profilePicture);
      if (customer.khataPhotos) {
        customer.khataPhotos.forEach(url => usedImageUrls.add(url));
      }
    });

    const { data: suppliers } = await supabase.from("suppliers").select("logo, photos");

    suppliers?.forEach(supplier => {
      if (supplier.logo) usedImageUrls.add(supplier.logo);
      if (supplier.photos) {
        supplier.photos.forEach(url => usedImageUrls.add(url));
      }
    });

    const { data: transactions } = await supabase.from("transactions").select("billImages");

    transactions?.forEach(transaction => {
      if (transaction.billImages) {
        transaction.billImages.forEach(url => usedImageUrls.add(url));
      }
    });

    const { data: udharList } = await supabase.from("udhar").select("billImage");

    udharList?.forEach(udhar => {
      if (udhar.billImage) usedImageUrls.add(udhar.billImage);
    });

    // Get all files from ImageKit
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

    // Find orphaned files
    const orphanedFiles = files.filter(file => {
      return !usedImageUrls.has(file.url);
    });

    // Calculate potential savings
    const totalOrphanedSize = orphanedFiles.reduce((sum, file) => sum + (file.size || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalFilesInStorage: files.length,
        usedImagesCount: usedImageUrls.size,
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
