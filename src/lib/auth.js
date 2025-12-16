import Cookies from "js-cookie";

const AUTH_COOKIE_NAME = "shop_auth";
const SESSION_DURATION_DAYS = 7;

export function setAuthCookie(isAuthenticated) {
  if (isAuthenticated) {
    Cookies.set(AUTH_COOKIE_NAME, "authenticated", {
      expires: SESSION_DURATION_DAYS,
      sameSite: "lax",
      path: "/",
    });
  } else {
    Cookies.remove(AUTH_COOKIE_NAME, { path: "/" });
  }
}

// Quick local check - use for initial UI rendering
export function isAuthenticated() {
  return Cookies.get(AUTH_COOKIE_NAME) === "authenticated";
}

export function logout() {
  Cookies.remove(AUTH_COOKIE_NAME, { path: "/" });
  Cookies.remove("shop_session_version", { path: "/" });
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

export async function verifyPin(pin) {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    const data = await response.json();

    if (data.success) {
      setAuthCookie(true);
      return { success: true };
    }

    return { success: false, error: data.error || "Invalid PIN" };
  } catch (error) {
    return { success: false, error: "Connection error" };
  }
}
