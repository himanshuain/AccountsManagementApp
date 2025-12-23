import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Service role key for server-side operations (bypasses RLS)
// This should ONLY be used in API routes, never exposed to the client
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for public/anonymous access (subject to RLS policies)
export const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Admin client for server-side operations (bypasses RLS)
// Use this in API routes for protected operations
export const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

export const isSupabaseConfigured = () => {
  return !!supabase;
};

// Check if admin client is available (for server-side operations)
export const isSupabaseAdminConfigured = () => {
  return !!supabaseAdmin;
};

// Get the appropriate client for server operations
// Falls back to regular client if service role key is not set
export const getServerClient = () => {
  return supabaseAdmin || supabase;
};

export default supabase;
