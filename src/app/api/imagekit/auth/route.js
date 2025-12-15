import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Generate authentication parameters for ImageKit client-side uploads
 */
export async function GET() {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    
    if (!privateKey) {
      return NextResponse.json(
        { error: "ImageKit private key not configured" },
        { status: 500 }
      );
    }
    
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour expiry
    
    // Create signature
    const signatureString = token + expire;
    const signature = crypto
      .createHmac("sha1", privateKey)
      .update(signatureString)
      .digest("hex");
    
    return NextResponse.json({
      token,
      expire,
      signature,
    });
  } catch (error) {
    console.error("[ImageKit Auth] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

