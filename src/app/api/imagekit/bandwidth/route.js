import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Get ImageKit bandwidth usage for the current billing cycle
 * Note: ImageKit's free tier doesn't have a public API for usage stats.
 * We'll count files and estimate storage instead.
 */
export async function GET() {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

    if (!privateKey) {
      return NextResponse.json({
        success: false,
        error: "ImageKit not configured",
      });
    }

    // ImageKit API - list files to count and estimate storage
    const authString = Buffer.from(`${privateKey}:`).toString("base64");

    // Get list of files (this endpoint works)
    const response = await fetch("https://api.imagekit.io/v1/files?limit=1000", {
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ImageKit] API error:", errorText);
      throw new Error("Failed to fetch ImageKit files");
    }

    const files = await response.json();

    // Calculate storage from file sizes
    let totalStorage = 0;
    let fileCount = 0;

    if (Array.isArray(files)) {
      fileCount = files.length;
      totalStorage = files.reduce((sum, file) => sum + (file.size || 0), 0);
    }

    // ImageKit free tier: 20GB storage, 20GB bandwidth/month
    const FREE_TIER_STORAGE = 20 * 1024 * 1024 * 1024; // 20GB
    const FREE_TIER_BANDWIDTH = 20 * 1024 * 1024 * 1024; // 20GB

    // We can only reliably track storage, not bandwidth (no public API for that)
    const bandwidthData = {
      used: totalStorage,
      total: FREE_TIER_STORAGE,
      usedFormatted: formatBytes(totalStorage),
      totalFormatted: formatBytes(FREE_TIER_STORAGE),
      usedPercentage: Math.round((totalStorage / FREE_TIER_STORAGE) * 10000) / 100,
      storageUsed: totalStorage,
      storageFormatted: formatBytes(totalStorage),
      fileCount: fileCount,
      note: "Showing storage usage (bandwidth stats require ImageKit dashboard)",
    };

    return NextResponse.json({
      success: true,
      data: bandwidthData,
    });
  } catch (error) {
    console.error("[ImageKit Bandwidth] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
