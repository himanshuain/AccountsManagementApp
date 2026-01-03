import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { deleteMultipleFromR2, isR2Configured } from "@/lib/r2-storage";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for cleanup

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "shop-images";

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * List all files in R2 bucket
 */
async function listAllR2Files() {
  const client = getR2Client();
  const allFiles = [];
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const response = await client.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          allFiles.push(obj.Key);
        }
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return allFiles;
}

/**
 * Collect all image references from the database
 */
async function collectAllDatabaseImages() {
  const supabase = getServerClient();
  const allImages = new Set();

  // Helper to add images from various fields
  const addImage = (value) => {
    if (value && typeof value === "string" && !value.startsWith("data:")) {
      allImages.add(value);
    }
  };

  const addImagesFromArray = (arr) => {
    if (Array.isArray(arr)) {
      arr.forEach(addImage);
    }
  };

  const addImagesFromPayments = (payments) => {
    if (Array.isArray(payments)) {
      payments.forEach(payment => {
        addImage(payment.receiptUrl);
        addImage(payment.receipt_url);
        addImage(payment.receiptKey);
        addImage(payment.receipt_key);
        addImagesFromArray(payment.receiptUrls);
        addImagesFromArray(payment.receipt_urls);
      });
    }
  };

  // 1. Get all customer images
  const { data: customers } = await supabase
    .from("customers")
    .select("profile_picture, khata_photo, khata_photos");

  if (customers) {
    customers.forEach(c => {
      addImage(c.profile_picture);
      addImage(c.khata_photo);
      addImagesFromArray(c.khata_photos);
    });
  }

  // 2. Get all supplier images
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("profile_picture, upi_qr_code, logo, photos");

  if (suppliers) {
    suppliers.forEach(s => {
      addImage(s.profile_picture);
      addImage(s.upi_qr_code);
      addImage(s.logo);
      addImagesFromArray(s.photos);
    });
  }

  // 3. Get all transaction images
  const { data: transactions } = await supabase
    .from("transactions")
    .select("bill_images, payments");

  if (transactions) {
    transactions.forEach(t => {
      addImagesFromArray(t.bill_images);
      addImagesFromPayments(t.payments);
    });
  }

  // 4. Get all udhar images
  const { data: udhars } = await supabase
    .from("udhar")
    .select("khata_photos, bill_image, payments");

  if (udhars) {
    udhars.forEach(u => {
      addImage(u.bill_image);
      addImagesFromArray(u.khata_photos);
      addImagesFromPayments(u.payments);
    });
  }

  return allImages;
}

/**
 * GET: Analyze orphaned files (dry run)
 * POST: Delete orphaned files
 */
export async function GET(request) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: "R2 storage not configured" },
        { status: 500 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    console.log("[Cleanup] Starting orphaned files analysis...");

    // Get all files from R2
    const r2Files = await listAllR2Files();
    console.log(`[Cleanup] Found ${r2Files.length} files in R2`);

    // Get all image references from database
    const dbImages = await collectAllDatabaseImages();
    console.log(`[Cleanup] Found ${dbImages.size} image references in database`);

    // Find orphaned files (in R2 but not in database)
    const orphanedFiles = r2Files.filter(file => !dbImages.has(file));
    console.log(`[Cleanup] Found ${orphanedFiles.length} orphaned files`);

    // Group orphaned files by folder for better visibility
    const byFolder = {};
    orphanedFiles.forEach(file => {
      const folder = file.split("/")[0] || "root";
      if (!byFolder[folder]) byFolder[folder] = [];
      byFolder[folder].push(file);
    });

    return NextResponse.json({
      success: true,
      analysis: {
        totalR2Files: r2Files.length,
        totalDbReferences: dbImages.size,
        orphanedCount: orphanedFiles.length,
        orphanedByFolder: Object.keys(byFolder).reduce((acc, folder) => {
          acc[folder] = byFolder[folder].length;
          return acc;
        }, {}),
      },
      orphanedFiles: orphanedFiles,
      message: orphanedFiles.length > 0
        ? `Found ${orphanedFiles.length} orphaned files. Use POST request to delete them.`
        : "No orphaned files found. Storage is clean!",
    });
  } catch (error) {
    console.error("[Cleanup] Analysis error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: "R2 storage not configured" },
        { status: 500 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    // Optional: Check for confirmation in body
    const body = await request.json().catch(() => ({}));
    if (!body.confirm) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Please include { \"confirm\": true } in the request body to proceed with deletion" 
        },
        { status: 400 }
      );
    }

    console.log("[Cleanup] Starting orphaned files deletion...");

    // Get all files from R2
    const r2Files = await listAllR2Files();
    console.log(`[Cleanup] Found ${r2Files.length} files in R2`);

    // Get all image references from database
    const dbImages = await collectAllDatabaseImages();
    console.log(`[Cleanup] Found ${dbImages.size} image references in database`);

    // Find orphaned files
    const orphanedFiles = r2Files.filter(file => !dbImages.has(file));
    console.log(`[Cleanup] Found ${orphanedFiles.length} orphaned files to delete`);

    if (orphanedFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No orphaned files to delete. Storage is already clean!",
        deleted: 0,
        failed: 0,
      });
    }

    // Delete orphaned files
    const result = await deleteMultipleFromR2(orphanedFiles);

    console.log(`[Cleanup] Deletion complete: ${result.deleted} deleted, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Cleanup complete. Deleted ${result.deleted} orphaned files.`,
      deleted: result.deleted,
      failed: result.failed,
      deletedFiles: orphanedFiles,
    });
  } catch (error) {
    console.error("[Cleanup] Deletion error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

