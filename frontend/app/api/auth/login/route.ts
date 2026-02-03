import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TOKEN_COOKIE = "huhems_token";
const FIRST_LOGIN_COOKIE = "huhems_first_login";
type Role = "admin" | "student";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const expectedRole = body?.expectedRole as Role | undefined;
  const forwardBody = { ...body } as Record<string, unknown>;
  delete forwardBody.expectedRole;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  let res: Response;
  try {
    res = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(forwardBody),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        message: `Cannot reach backend at ${apiBase}. Is it running?`,
      },
      { status: 502 },
    );
  }

  // Backend always returns JSON on success; on failure it should return {message},
  // but if it's an old server it may return plain text (e.g. 404 page not found).
  const rawText = await res.text();
  const data = (() => {
    try {
      return JSON.parse(rawText) as unknown;
    } catch {
      return null;
    }
  })();
  const dataObj = asRecord(data);

  if (!res.ok) {
    if (res.status === 404) {
      return NextResponse.json(
        {
          message:
            "Backend route /auth/login was not found (404). Restart the backend from the latest code (run `go run ./cmd/api` inside the backend folder).",
        },
        { status: 404 },
      );
    }
    const msg = (typeof dataObj?.message === "string" ? dataObj.message : undefined) ?? rawText?.trim() ?? "Login failed";
    return NextResponse.json({ message: msg }, { status: res.status });
  }

  const token = (typeof dataObj?.token === "string" ? dataObj.token : undefined) ?? undefined;
  if (!token) {
    return NextResponse.json({ message: "Missing token from backend" }, { status: 500 });
  }

  const role = (typeof dataObj?.role === "string" ? (dataObj.role as Role) : undefined) ?? undefined;
  if (expectedRole && role && role !== expectedRole) {
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 0,
    });
    return NextResponse.json(
      {
        message:
          expectedRole === "admin"
            ? "This account is not an admin. Use Student Login instead."
            : "This account is not a student. Use Admin Login instead.",
      },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  const firstLogin = Boolean(dataObj?.firstLogin);
  if (firstLogin) {
    cookieStore.set(FIRST_LOGIN_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      // Long enough to survive redirect; short enough not to linger.
      maxAge: 60 * 10,
    });
  }

  return NextResponse.json({ role: dataObj?.role, user: dataObj?.user, firstLogin });
}
