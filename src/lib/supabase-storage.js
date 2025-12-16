import { supabase, isSupabaseConfigured } from "./supabase";

// ==================== IMAGE UPLOAD ====================
// For images, we use Supabase Storage

export async function uploadImageToSupabase(file, folder = "general") {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const filename = `${folder}/${Date.now()}-${file.name || "image.jpg"}`;
    const { data, error } = await supabase.storage.from("images").upload(filename, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.error("[Supabase] Image upload error:", error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("[Supabase] Image upload error:", error);
    return null;
  }
}

export async function uploadImageFromBase64ToSupabase(base64Data, filename, folder = "general") {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();

    return await uploadImageToSupabase(blob, folder);
  } catch (error) {
    console.error("[Supabase] Base64 image upload error:", error);
    return null;
  }
}
