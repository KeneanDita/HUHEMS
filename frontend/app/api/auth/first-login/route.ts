import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const FIRST_LOGIN_COOKIE = "huhems_first_login";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(FIRST_LOGIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
