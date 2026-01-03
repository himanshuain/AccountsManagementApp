import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/password";

// Helper to increment session version (to logout all other devices)
async function incrementSessionVersion() {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = getServerClient();
    // Get current version
    const { data: currentData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "session_version")
      .single();

    const currentVersion = parseInt(currentData?.value || "1", 10);
    const newVersion = String(currentVersion + 1);

    // Upsert the new version
    await supabase.from("app_settings").upsert(
      {
        key: "session_version",
        value: newVersion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    return newVersion;
  } catch (error) {
    console.error("Failed to increment session version:", error);
    return null;
  }
}

export async function POST(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Database not configured",
      });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json(
        { success: false, error: "New password is required" },
        { status: 400 }
      );
    }

    // Validate password strength
    const { valid, errors } = validatePasswordStrength(newPassword);
    if (!valid) {
      return NextResponse.json({ success: false, error: errors[0] }, { status: 400 });
    }

    const supabase = getServerClient();

    // Try to get existing password (check both new 'app_password' and legacy 'app_pin' keys)
    let existingSettings = null;
    let settingsKey = "app_password";

    const { data: passwordSettings, error: passwordFetchError } = await supabase
      .from("app_settings")
      .select("*")
      .eq("key", "app_password")
      .single();

    if (passwordFetchError && passwordFetchError.code === "PGRST116") {
      // No app_password, try legacy app_pin
      const { data: pinSettings, error: pinFetchError } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "app_pin")
        .single();

      if (!pinFetchError && pinSettings) {
        existingSettings = pinSettings;
        settingsKey = "app_pin";
      }
    } else if (!passwordFetchError) {
      existingSettings = passwordSettings;
    }

    if (!existingSettings) {
      // No existing password in database - check against ENV variable
      const envPassword = process.env.APP_PASSWORD || process.env.APP_PIN || "admin123";
      const { valid: envPasswordValid } = await verifyPassword(currentPassword, envPassword);
      if (currentPassword && !envPasswordValid) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect" },
          { status: 401 }
        );
      }

      // Hash the new password before storing
      const hashedNewPassword = await hashPassword(newPassword);

      // Insert new setting with hashed password
      const { error: insertError } = await supabase
        .from("app_settings")
        .insert({ key: "app_password", value: hashedNewPassword });

      if (insertError) {
        console.error("Failed to save password:", insertError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to save new password. Make sure app_settings table exists.",
          },
          { status: 500 }
        );
      }

      // Increment session version to logout other devices
      const newSessionVersion = await incrementSessionVersion();

      // Update the current session's version cookie
      if (newSessionVersion) {
        const cookieStore = await cookies();
        cookieStore.set("shop_session_version", newSessionVersion, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: "/",
        });
      }

      return NextResponse.json({ success: true, loggedOutOtherDevices: true });
    }

    // Verify current password (handles both hashed and legacy plaintext)
    const storedPassword =
      existingSettings?.value || process.env.APP_PASSWORD || process.env.APP_PIN || "admin123";
    const { valid: currentPasswordValid } = await verifyPassword(currentPassword, storedPassword);
    if (!currentPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash the new password before storing
    const hashedNewPassword = await hashPassword(newPassword);

    // If we were using legacy app_pin, migrate to app_password
    if (settingsKey === "app_pin") {
      // Delete the old app_pin entry
      await supabase.from("app_settings").delete().eq("key", "app_pin");

      // Insert new app_password entry
      const { error: insertError } = await supabase
        .from("app_settings")
        .insert({
          key: "app_password",
          value: hashedNewPassword,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Failed to migrate password:", insertError);
        return NextResponse.json(
          { success: false, error: "Failed to update password" },
          { status: 500 }
        );
      }
    } else {
      // Update password with hashed value
      const { error: updateError } = await supabase
        .from("app_settings")
        .update({ value: hashedNewPassword, updated_at: new Date().toISOString() })
        .eq("key", "app_password");

      if (updateError) {
        console.error("Failed to update password:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to update password" },
          { status: 500 }
        );
      }
    }

    // Increment session version to logout other devices
    const newSessionVersion = await incrementSessionVersion();

    // Update the current session's version cookie
    if (newSessionVersion) {
      const cookieStore = await cookies();
      cookieStore.set("shop_session_version", newSessionVersion, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });
    }

    return NextResponse.json({ success: true, loggedOutOtherDevices: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
