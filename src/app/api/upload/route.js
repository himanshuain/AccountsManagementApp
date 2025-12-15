import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Upload image to ImageKit
 * Falls back to Supabase if ImageKit is not configured
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "general";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Check if ImageKit is configured
    const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const imageKitPublicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    const imageKitUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

    if (imageKitPrivateKey && imageKitPublicKey && imageKitUrlEndpoint) {
      // Use ImageKit
      const url = await uploadToImageKit(file, folder, imageKitPrivateKey, imageKitPublicKey);
      if (url) {
        return NextResponse.json({ success: true, url });
      }
    }

    // Fallback to Supabase if ImageKit upload fails or not configured
    const { uploadImageToSupabase } = await import("@/lib/supabase-storage");
    const url = await uploadImageToSupabase(file, folder);

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Upload failed - Storage not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Upload file to ImageKit using multipart/form-data
 */
async function uploadToImageKit(file, folder, privateKey, publicKey) {
  try {
    // Convert file to base64 with data URI prefix
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";
    const base64WithPrefix = `data:${mimeType};base64,${buffer.toString("base64")}`;
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name?.split(".").pop() || "jpg";
    const fileName = `${timestamp}-${randomStr}.${extension}`;
    
    // Create auth signature (Basic auth with private key)
    const authString = Buffer.from(`${privateKey}:`).toString("base64");
    
    // Build form data for ImageKit upload API
    const formData = new FormData();
    formData.append("file", base64WithPrefix);
    formData.append("fileName", fileName);
    formData.append("folder", `/${folder}`);
    formData.append("useUniqueFileName", "true");
    
    // Upload to ImageKit
    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[ImageKit] Upload error:", error);
      return null;
    }

    const result = await response.json();
    console.log("[ImageKit] Upload success:", result.url);
    return result.url;
  } catch (error) {
    console.error("[ImageKit] Upload error:", error);
    return null;
  }
}
