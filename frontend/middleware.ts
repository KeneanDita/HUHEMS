import { NextResponse, type NextRequest } from "next/server";

const TOKEN_COOKIE = "huhems_token";

function base64UrlDecode(input: string): string {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  // Edge runtime: use atob.
  return atob(base64);
}

function getRoleFromToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isLoggedIn = Boolean(token);

  const next = searchParams.get("next");
  const studentLoginUrl = new URL("/auth/login", request.url);
  const adminLoginUrl = new URL("/auth/admin-login", request.url);
  if (!next) {
    studentLoginUrl.searchParams.set("next", pathname);
    adminLoginUrl.searchParams.set("next", pathname);
  }

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) return NextResponse.redirect(adminLoginUrl);
    const role = getRoleFromToken(token!);
    if (role !== "admin") return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/student")) {
    if (!isLoggedIn) return NextResponse.redirect(studentLoginUrl);
    const role = getRoleFromToken(token!);
    if (role !== "student") return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/auth/login") && isLoggedIn) {
    const role = getRoleFromToken(token!);
    if (role === "admin") return NextResponse.redirect(new URL("/admin", request.url));
    if (role === "student") return NextResponse.redirect(new URL("/student", request.url));
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/auth/admin-login") && isLoggedIn) {
    const role = getRoleFromToken(token!);
    if (role === "admin") return NextResponse.redirect(new URL("/admin", request.url));
    if (role === "student") return NextResponse.redirect(new URL("/student", request.url));
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/auth/login", "/auth/admin-login"],
};
