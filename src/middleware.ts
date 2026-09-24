import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Route guard: everything except the login page and `/api/*` requires a session
 * cookie. The cookie only proves a login happened - token validity is enforced
 * by MES_Api itself (a 401 sends the user back to /login?expired=1).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // Route handlers (/api/login, /api/logout, /api/admin/...) do their own auth.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");

  if (isLoginRoute) {
    if (hasSession) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
