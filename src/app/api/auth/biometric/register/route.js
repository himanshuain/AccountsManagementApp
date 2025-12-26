import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import crypto from "crypto";

const AUTH_COOKIE_NAME = "shop_auth";

// POST - Get registration challenge (called first, user must be authenticated)
export async function POST(request) {
  try {
    // Verify user is authenticated
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

    if (authCookie?.value !== "authenticated") {
      return NextResponse.json(
        { success: false, error: "Must be authenticated to register biometric" },
        { status: 401 }
      );
    }

    const { deviceId } = await request.json();

    // Generate a random challenge
    const challenge = crypto.randomBytes(32).toString("base64url");

    // Generate a user ID based on device ID for device-specific credentials
    const userId = crypto
      .createHash("sha256")
      .update(`shop-manager-user-${deviceId || 'default'}`)
      .digest()
      .toString("base64url")
      .substring(0, 32);

    // Get the hostname for RP ID
    const host = request.headers.get("host") || "localhost";
    const rpId = host.split(":")[0]; // Remove port if present

    // Store challenge temporarily (expires in 5 minutes)
    if (isSupabaseConfigured()) {
      const supabase = getServerClient();
      await supabase.from("app_settings").upsert(
        {
          key: `biometric_challenge_${deviceId || 'default'}`,
          value: JSON.stringify({
            challenge,
            deviceId,
            createdAt: Date.now(),
            expiresAt: Date.now() + 5 * 60 * 1000,
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    }

    return NextResponse.json({
      challenge,
      userId,
      rpId,
      rpName: "Shop Manager",
    });
  } catch (error) {
    console.error("Biometric registration challenge error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate challenge" },
      { status: 500 }
    );
  }
}

// PUT - Store credential after successful registration
export async function PUT(request) {
  try {
    // Verify user is authenticated
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

    if (authCookie?.value !== "authenticated") {
      return NextResponse.json(
        { success: false, error: "Must be authenticated to register biometric" },
        { status: 401 }
      );
    }

    const { credentialId, clientDataJSON, attestationObject, deviceId } = await request.json();

    if (!credentialId || !clientDataJSON || !attestationObject) {
      return NextResponse.json(
        { success: false, error: "Missing credential data" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = getServerClient();

      // Verify challenge hasn't expired
      const { data: challengeData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", `biometric_challenge_${deviceId || 'default'}`)
        .single();

      if (challengeData?.value) {
        const challenge = JSON.parse(challengeData.value);
        if (Date.now() > challenge.expiresAt) {
          return NextResponse.json(
            { success: false, error: "Challenge expired" },
            { status: 400 }
          );
        }
      }

      // Get existing credentials array or create new one
      const { data: existingData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "biometric_credentials")
        .single();

      let credentials = [];
      if (existingData?.value) {
        try {
          credentials = JSON.parse(existingData.value);
          if (!Array.isArray(credentials)) {
            credentials = [];
          }
        } catch {
          credentials = [];
        }
      }

      // Remove any existing credential for this device (to update it)
      credentials = credentials.filter(c => c.deviceId !== deviceId);

      // Add the new credential
      const newCredential = {
        credentialId,
        attestationObject,
        deviceId,
        createdAt: new Date().toISOString(),
        verificationHash: crypto
          .createHash("sha256")
          .update(credentialId + attestationObject + deviceId)
          .digest("hex"),
      };
      credentials.push(newCredential);

      // Store the updated credentials array
      await supabase.from("app_settings").upsert(
        {
          key: "biometric_credentials",
          value: JSON.stringify(credentials),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      // Clean up the challenge
      await supabase.from("app_settings").delete().eq("key", `biometric_challenge_${deviceId || 'default'}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Biometric credential storage error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to store credential" },
      { status: 500 }
    );
  }
}

// DELETE - Remove biometric credential for a specific device
export async function DELETE(request) {
  try {
    // Verify user is authenticated
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

    if (authCookie?.value !== "authenticated") {
      return NextResponse.json(
        { success: false, error: "Must be authenticated to remove biometric" },
        { status: 401 }
      );
    }

    const { credentialId, deviceId } = await request.json();

    if (isSupabaseConfigured()) {
      const supabase = getServerClient();

      // Get existing credentials array
      const { data: existingData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "biometric_credentials")
        .single();

      if (existingData?.value) {
        let credentials = JSON.parse(existingData.value);
        
        // Remove the credential for this device
        credentials = credentials.filter(c => 
          c.credentialId !== credentialId && c.deviceId !== deviceId
        );

        // Update the credentials array
        await supabase.from("app_settings").upsert(
          {
            key: "biometric_credentials",
            value: JSON.stringify(credentials),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Biometric credential removal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove credential" },
      { status: 500 }
    );
  }
}
