import Cookies from "js-cookie";

// UI indicator cookie (client-readable) - NOT used for actual auth
// The real auth cookie is httpOnly and checked by server/middleware
const AUTH_UI_COOKIE_NAME = "shop_auth_ui";
const SESSION_DURATION_DAYS = 7;

export function setAuthCookie(isAuthenticated) {
  // Note: The actual httpOnly auth cookie is set by the server
  // This only manages the UI indicator cookie for client-side state
  if (isAuthenticated) {
    Cookies.set(AUTH_UI_COOKIE_NAME, "1", {
      expires: SESSION_DURATION_DAYS,
      sameSite: "lax",
      path: "/",
    });
  } else {
    Cookies.remove(AUTH_UI_COOKIE_NAME, { path: "/" });
  }
}

// Quick local check - use for initial UI rendering only
// This checks the UI indicator, not the actual auth status
// Real auth is verified server-side via httpOnly cookie
export function isAuthenticated() {
  return Cookies.get(AUTH_UI_COOKIE_NAME) === "1";
}

export function logout() {
  // Clear UI indicator cookie (server clears the httpOnly cookies)
  Cookies.remove(AUTH_UI_COOKIE_NAME, { path: "/" });
}

// Server-side session validation - checks if session is still valid
// This verifies the session version hasn't been invalidated (e.g., after password change)
export async function verifySession() {
  try {
    // First quick check - if no local cookie, definitely not authenticated
    if (!isAuthenticated()) {
      return { authenticated: false, reason: "no_cookie" };
    }

    // Call server to verify session version
    const response = await fetch("/api/auth", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!data.authenticated) {
      // Session was invalidated - clear local cookies
      logout();
      return { authenticated: false, reason: data.reason || "invalid_session" };
    }

    return { authenticated: true };
  } catch (error) {
    // On network error, fall back to local cookie check
    // This allows offline usage if already authenticated
    return { authenticated: isAuthenticated(), reason: "network_error" };
  }
}

// Legacy function name for backwards compatibility
export async function verifyPin(pin) {
  return verifyPassword(pin);
}

// Verify password with the server
export async function verifyPassword(password) {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (data.success) {
      setAuthCookie(true);
      return { success: true };
    }

    return { success: false, error: data.error || "Invalid password" };
  } catch (error) {
    return { success: false, error: "Connection error" };
  }
}
