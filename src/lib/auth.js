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

export function isAuthenticated() {
  return Cookies.get(AUTH_COOKIE_NAME) === "authenticated";
}

export function logout() {
  Cookies.remove(AUTH_COOKIE_NAME, { path: "/" });
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
