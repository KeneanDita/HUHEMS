import { NextResponse } from "next/server";

import { getBackendAuthHeaders, getBackendBaseUrl } from "../_util";

export async function GET(request: Request) {
  const auth = await getBackendAuthHeaders();
  if (!auth) {
    return NextResponse.json({ message: "not authenticated" }, { status: 401 });
  }

  const baseUrl = getBackendBaseUrl();
  const url = new URL("/student/results", baseUrl);
  const incomingUrl = new URL(request.url);
  incomingUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      ...auth,
    },
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
