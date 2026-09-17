import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/quest", "/lesson", "/profile", "/projects", "/achievements", "/admin"];

/**
 * Optimistic gate only: it redirects requests without a session cookie so users
 * never see a protected shell. Real authorisation happens in every server
 * component, server action and route handler via requireUser()/requireAdmin().
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!PROTECTED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.has("authjs.session-token") || request.cookies.has("__Secure-authjs.session-token");

  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/quest/:path*", "/lesson/:path*", "/profile/:path*", "/projects/:path*", "/achievements/:path*", "/admin/:path*"],
};
