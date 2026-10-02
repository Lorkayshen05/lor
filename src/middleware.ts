import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "aq_session";

const PUBLIC_PAGES = ["/", "/login", "/register"];
const PUBLIC_API_PREFIXES = ["/api/auth"];

/**
 * Lightweight, Edge-safe gate: only checks whether the session cookie is
 * present (libsql's file:// driver needs Node's fs, so it can't run here).
 * Full session validation — expiry, matching a real session row, role
 * checks — happens per page/route via getSessionUser().
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/api")) {
    if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
    if (!hasSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  if (PUBLIC_PAGES.includes(pathname)) {
    if (hasSession && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|pyodide/|pyworker.js).*)"],
};
