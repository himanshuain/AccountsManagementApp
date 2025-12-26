import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import crypto from "crypto";

const AUTH_COOKIE_NAME = "shop_auth";
const AUTH_UI_COOKIE_NAME = "shop_auth_ui";
const SESSION_VERSION_COOKIE = "shop_session_version";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

// Helper to get session version
async function getSessionVersion() {
  if (!isSupabaseConfigured()) return "1";

  try {
    const supabase = getServerClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "session_version")
      .single();

    return data?.value || "1";
  } catch {
    return "1";
  }
}

// Helper to find credential by ID or device ID
function findCredential(credentials, credentialId, deviceId) {
  return credentials.find(c => 
    c.credentialId === credentialId || c.deviceId === deviceId
  );
}

// POST - Get authentication challenge
export async function POST(request) {
  try {
    const { credentialId, deviceId } = await request.json();

    if (!credentialId) {
      return NextResponse.json(
        { success: false, error: "Credential ID required" },
        { status: 400 }
      );
    }

    // Verify the credential exists in the database
    if (isSupabaseConfigured()) {
      const supabase = getServerClient();
      const { data: credentialsData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "biometric_credentials")
        .single();

      if (!credentialsData?.value) {
        return NextResponse.json(
          { success: false, error: "No biometric credentials registered" },
          { status: 404 }
        );
      }

      const credentials = JSON.parse(credentialsData.value);
      const credential = findCredential(credentials, credentialId, deviceId);
      
      if (!credential) {
        return NextResponse.json(
          { success: false, error: "Credential not recognized for this device" },
          { status: 404 }
        );
      }
    }

    // Generate a random challenge
    const challenge = crypto.randomBytes(32).toString("base64url");

    // Get the hostname for RP ID
    const host = request.headers.get("host") || "localhost";
    const rpId = host.split(":")[0];

    // Store challenge temporarily (expires in 5 minutes)
    if (isSupabaseConfigured()) {
      const supabase = getServerClient();
      await supabase.from("app_settings").upsert(
        {
          key: `biometric_auth_challenge_${deviceId || credentialId}`,
          value: JSON.stringify({
            challenge,
            credentialId,
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
      rpId,
    });
  } catch (error) {
    console.error("Biometric authentication challenge error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate challenge" },
      { status: 500 }
    );
  }
}

// PUT - Verify authentication assertion and grant access
export async function PUT(request) {
  try {
    const { credentialId, clientDataJSON, authenticatorData, signature, userHandle, deviceId } =
      await request.json();

    if (!credentialId || !clientDataJSON || !authenticatorData || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing authentication data" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = getServerClient();

      // Verify the challenge hasn't expired
      const { data: challengeData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", `biometric_auth_challenge_${deviceId || credentialId}`)
        .single();

      if (!challengeData?.value) {
        return NextResponse.json(
          { success: false, error: "No pending authentication challenge" },
          { status: 400 }
        );
      }

      const challenge = JSON.parse(challengeData.value);

      if (Date.now() > challenge.expiresAt) {
        return NextResponse.json(
          { success: false, error: "Authentication challenge expired" },
          { status: 400 }
        );
      }

      if (challenge.credentialId !== credentialId) {
        return NextResponse.json(
          { success: false, error: "Credential mismatch" },
          { status: 401 }
        );
      }

      // Verify the credential exists
      const { data: credentialsData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "biometric_credentials")
        .single();

      if (!credentialsData?.value) {
        return NextResponse.json(
          { success: false, error: "No biometric credentials registered" },
          { status: 404 }
        );
      }

      const credentials = JSON.parse(credentialsData.value);
      const credential = findCredential(credentials, credentialId, deviceId);
      
      if (!credential) {
        return NextResponse.json(
          { success: false, error: "Credential not recognized" },
          { status: 401 }
        );
      }

      // Verify clientDataJSON contains our challenge (basic verification)
      try {
        const clientData = JSON.parse(
          Buffer.from(
            clientDataJSON.replace(/-/g, "+").replace(/_/g, "/"),
            "base64"
          ).toString("utf8")
        );

        if (clientData.challenge !== challenge.challenge) {
          return NextResponse.json(
            { success: false, error: "Challenge verification failed" },
            { status: 401 }
          );
        }

        if (clientData.type !== "webauthn.get") {
          return NextResponse.json(
            { success: false, error: "Invalid assertion type" },
            { status: 401 }
          );
        }
      } catch (parseError) {
        return NextResponse.json(
          { success: false, error: "Invalid client data" },
          { status: 400 }
        );
      }

      // Clean up the challenge
      await supabase.from("app_settings").delete().eq("key", `biometric_auth_challenge_${deviceId || credentialId}`);
    }

    // Biometric verification passed - grant access
    const sessionVersion = await getSessionVersion();
    const cookieStore = await cookies();

    // Set main auth cookie
    cookieStore.set(AUTH_COOKIE_NAME, "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });

    // Set UI indicator cookie
    cookieStore.set(AUTH_UI_COOKIE_NAME, "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });

    // Set session version cookie
    cookieStore.set(SESSION_VERSION_COOKIE, sessionVersion, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Biometric authentication verification error:", error);
    return NextResponse.json(
      { success: false, error: "Biometric verification failed" },
      { status: 500 }
    );
  }
}
