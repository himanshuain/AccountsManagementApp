import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Supabase not configured",
      });
    }

    const supabase = getServerClient();
    // Get list of all files in the images bucket
    const { data: files, error } = await supabase.storage.from("images").list("", {
      limit: 1000,
      offset: 0,
    });

    if (error) {
      console.error("[Storage API] Error fetching storage info:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    // Calculate total size recursively for all folders
    let totalSize = 0;
    let fileCount = 0;

    // Function to get size of a folder
    async function getFolderSize(folderPath) {
      const sb = getServerClient();
      const { data: items, error } = await sb.storage
        .from("images")
        .list(folderPath || "", { limit: 1000 });

      if (error || !items) return 0;

      let size = 0;
      for (const item of items) {
        if (item.id) {
          // It's a file
          size += item.metadata?.size || 0;
          fileCount++;
        } else {
          // It's a folder, recurse
          const subPath = folderPath ? `${folderPath}/${item.name}` : item.name;
          size += await getFolderSize(subPath);
        }
      }
      return size;
    }

    // Get root folder contents and calculate sizes
    for (const item of files || []) {
      if (item.id) {
        // It's a file
        totalSize += item.metadata?.size || 0;
        fileCount++;
      } else {
        // It's a folder
        totalSize += await getFolderSize(item.name);
      }
    }

    // Free tier limit is 1GB = 1073741824 bytes
    const FREE_TIER_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB in bytes
    const usedPercentage = (totalSize / FREE_TIER_LIMIT) * 100;

    return NextResponse.json({
      success: true,
      data: {
        used: totalSize,
        total: FREE_TIER_LIMIT,
        usedFormatted: formatBytes(totalSize),
        totalFormatted: formatBytes(FREE_TIER_LIMIT),
        usedPercentage: Math.round(usedPercentage * 100) / 100,
        fileCount,
      },
    });
  } catch (error) {
    console.error("[Storage API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
