import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const DEFAULT_PIN = process.env.APP_PIN || "123456";
const AUTH_COOKIE_NAME = "shop_auth";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Helper to get PIN from database or env
async function getAppPin() {
  if (!isSupabaseConfigured()) {
    return DEFAULT_PIN;
  }
  
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "app_pin")
      .single();
    
    if (error || !data) {
      return DEFAULT_PIN;
    }
    
    return data.value || DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export async function POST(request) {
  try {
    const { pin } = await request.json();

    if (!pin) {
      return NextResponse.json(
        { success: false, error: "PIN is required" },
        { status: 400 },
      );
    }

    const appPin = await getAppPin();
    
    if (pin === appPin) {
      // Set auth cookie (not httpOnly so client JS can read it for auth checks)
      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_NAME, "authenticated", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_SECONDS,
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid PIN" },
      { status: 401 },
    );
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

    return NextResponse.json({
      authenticated: authCookie?.value === "authenticated",
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false });
  }
}
