import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "shop_auth";
const SESSION_VERSION_COOKIE = "shop_session_version";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/api/auth", // Main auth endpoint (login/logout/verify)
];

// API routes that need protection
const PROTECTED_API_PREFIX = "/api/";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // Check if this is a protected API route
  if (pathname.startsWith(PROTECTED_API_PREFIX)) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
    const sessionVersionCookie = request.cookies.get(SESSION_VERSION_COOKIE);

    // Check if user is authenticated
    if (authCookie?.value !== "authenticated") {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    // Session version validation is done in the individual routes
    // since we need to check against the database value
    // For middleware, we just check if the cookies exist
    if (!sessionVersionCookie?.value) {
      return NextResponse.json(
        { success: false, error: "Session expired - Please login again" },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // For non-API routes, check authentication and redirect to login if needed
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  
  if (authCookie?.value !== "authenticated") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes except static files
    "/api/:path*",
    // Match all dashboard routes
    "/(dashboard)/:path*",
    "/suppliers/:path*",
    "/customers/:path*",
    "/transactions/:path*",
    "/reports/:path*",
    // Match root dashboard
    "/",
  ],
};

