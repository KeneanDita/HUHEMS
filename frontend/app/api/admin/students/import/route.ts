import { NextResponse } from "next/server";

import { getBackendAuthHeaders, getBackendBaseUrl } from "../../_util";

export async function POST(request: Request) {
  const headers = await getBackendAuthHeaders();
  if (!headers) return NextResponse.json({ message: "not authenticated" }, { status: 401 });

  const formData = await request.formData();

  const res = await fetch(`${getBackendBaseUrl()}/admin/students/import`, {
    method: "POST",
    headers,
    body: formData,
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
