import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyPin, hashPin } from "@/lib/password";

const DEFAULT_PIN = process.env.APP_PIN || "123456";
const AUTH_COOKIE_NAME = "shop_auth";
const AUTH_UI_COOKIE_NAME = "shop_auth_ui"; // Client-readable indicator for UI
const SESSION_VERSION_COOKIE = "shop_session_version";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Rate limit settings for PIN attempts
const PIN_RATE_LIMIT = {
  limit: 5, // 5 attempts
  windowMs: 60 * 1000, // per 1 minute
};

// Helper to get PIN from database or env
async function getStoredPin() {
  if (!isSupabaseConfigured()) {
    return { value: DEFAULT_PIN, fromDb: false };
  }

  try {
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "app_pin")
      .single();

    if (error || !data) {
      return { value: DEFAULT_PIN, fromDb: false };
    }

    return { value: data.value || DEFAULT_PIN, fromDb: true };
  } catch {
    return { value: DEFAULT_PIN, fromDb: false };
  }
}

// Helper to upgrade plaintext PIN to hashed version
async function upgradeToHashedPin(pin) {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = getServerClient();
    const hashedPin = await hashPin(pin);
    await supabase.from("app_settings").upsert(
      {
        key: "app_pin",
        value: hashedPin,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
    console.log("PIN upgraded to hashed version");
  } catch (error) {
    console.error("Failed to upgrade PIN to hash:", error);
  }
}

// Helper to get current session version from database
async function getSessionVersion() {
  if (!isSupabaseConfigured()) {
    return "1";
  }

  try {
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "session_version")
      .single();

    if (error || !data) {
      return "1";
    }

    return data.value || "1";
  } catch {
    return "1";
  }
}

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request);
    const rateLimitKey = `pin_auth:${clientIp}`;

    // Check rate limit before processing
    const rateLimit = checkRateLimit(rateLimitKey, PIN_RATE_LIMIT);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const { pin } = await request.json();

    if (!pin) {
      return NextResponse.json(
        {
          success: false,
          error: "PIN is required",
          remaining: rateLimit.remaining,
        },
        {
          status: 400,
          headers: {
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

    const storedPinData = await getStoredPin();

    // Verify PIN (handles both hashed and legacy plaintext)
    const { valid, needsUpgrade } = await verifyPin(pin, storedPinData.value);

    if (valid) {
      // Reset rate limit on successful login
      resetRateLimit(rateLimitKey);

      // Upgrade legacy plaintext PIN to hashed version (background, non-blocking)
      if (needsUpgrade && storedPinData.fromDb) {
        upgradeToHashedPin(pin).catch(() => {}); // Fire and forget
      }

      const sessionVersion = await getSessionVersion();
      const cookieStore = await cookies();

      // Set main auth cookie (httpOnly for security - can't be stolen via XSS)
      cookieStore.set(AUTH_COOKIE_NAME, "authenticated", {
        httpOnly: true, // SECURE: Not accessible via JavaScript
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_SECONDS,
        path: "/",
      });

      // Set UI indicator cookie (NOT httpOnly - for client-side UI state only)
      // This is NOT used for authentication, only for UI rendering decisions
      // The actual auth check happens via the httpOnly cookie in middleware/API
      cookieStore.set(AUTH_UI_COOKIE_NAME, "1", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_SECONDS,
        path: "/",
      });

      // Set session version cookie - this will be invalidated when password changes
      cookieStore.set(SESSION_VERSION_COOKIE, sessionVersion, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_SECONDS,
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid PIN",
        remaining: rateLimit.remaining,
      },
      {
        status: 401,
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    cookieStore.delete(AUTH_UI_COOKIE_NAME);
    cookieStore.delete(SESSION_VERSION_COOKIE);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
    const sessionVersionCookie = cookieStore.get(SESSION_VERSION_COOKIE);

    // If not authenticated, return false
    if (authCookie?.value !== "authenticated") {
      return NextResponse.json({ authenticated: false });
    }

    // Check if session version matches current version (for logout other devices)
    const currentSessionVersion = await getSessionVersion();
    if (sessionVersionCookie?.value !== currentSessionVersion) {
      // Session has been invalidated (password was changed)
      // Clear the cookies
      cookieStore.delete(AUTH_COOKIE_NAME);
      cookieStore.delete(AUTH_UI_COOKIE_NAME);
      cookieStore.delete(SESSION_VERSION_COOKIE);
      return NextResponse.json({
        authenticated: false,
        reason: "session_invalidated",
      });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    return NextResponse.json({ authenticated: false });
  }
}
