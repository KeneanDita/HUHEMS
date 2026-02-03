import { NextResponse } from "next/server";

import { getBackendAuthHeaders, getBackendBaseUrl } from "../../../_util";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const headers = await getBackendAuthHeaders();
  if (!headers) return NextResponse.json({ message: "not authenticated" }, { status: 401 });

  const body = await request.text();
  const res = await fetch(`${getBackendBaseUrl()}/student/attempts/${id}/answer`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body,
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
