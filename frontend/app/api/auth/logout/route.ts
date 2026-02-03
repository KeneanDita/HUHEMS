import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TOKEN_COOKIE = "huhems_token";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
