import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TOKEN_COOKIE = "huhems_token";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "not authenticated" }, { status: 401 });
  }

  const body = await request.text();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

  let res: Response;
  try {
    res = await fetch(`${apiBase}/auth/password`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: `Cannot reach backend at ${apiBase}. Is it running?` },
      { status: 502 },
    );
  }

  const rawText = await res.text();
  const data = (() => {
    try {
      return JSON.parse(rawText) as unknown;
    } catch {
      return null;
    }
  })();
  const r = asRecord(data);

  if (!res.ok) {
    if (res.status === 404) {
      return NextResponse.json(
        {
          message:
            `Backend route /auth/password was not found (404) on ${apiBase}. This usually means the backend is running old code. Restart it from the latest code (local dev: run \`go run ./cmd/api\` in the backend folder; Docker: run \`docker compose up -d --build backend\`).`,
        },
        { status: 404 },
      );
    }
    const msg =
      (r && typeof r.message === "string" ? r.message : undefined) ??
      rawText.trim() ??
      "Failed to update password";
    return NextResponse.json({ message: msg }, { status: res.status });
  }

  return NextResponse.json({ message: "password updated" });
}
