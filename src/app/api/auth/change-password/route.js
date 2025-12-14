import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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

    // Validate PIN is exactly 6 digits
    if (!/^\d{6}$/.test(newPassword)) {
      return NextResponse.json(
        { success: false, error: "PIN must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Check if settings table exists, if not create it
    const { data: existingSettings, error: fetchError } = await supabase
      .from("app_settings")
      .select("*")
      .eq("key", "app_pin")
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      // Table doesn't exist or no row - create settings with new password
      // First check if current password matches ENV variable
      const envPin = process.env.APP_PIN || "123456";
      if (currentPassword && currentPassword !== envPin) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect" },
          { status: 401 }
        );
      }

      // Insert new setting
      const { error: insertError } = await supabase
        .from("app_settings")
        .insert({ key: "app_pin", value: newPassword });

      if (insertError) {
        console.error("Failed to save password:", insertError);
        return NextResponse.json(
          { success: false, error: "Failed to save new password. Make sure app_settings table exists." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (fetchError) {
      console.error("Error fetching settings:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to verify password" },
        { status: 500 }
      );
    }

    // Verify current password
    const storedPin = existingSettings?.value || process.env.APP_PIN || "123456";
    if (currentPassword !== storedPin) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Update password
    const { error: updateError } = await supabase
      .from("app_settings")
      .update({ value: newPassword, updated_at: new Date().toISOString() })
      .eq("key", "app_pin");

    if (updateError) {
      console.error("Failed to update password:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update password" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

