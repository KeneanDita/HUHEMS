import { NextResponse } from "next/server";

import { getBackendAuthHeaders, getBackendBaseUrl } from "../../_util";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = await getBackendAuthHeaders();
  if (!headers) return NextResponse.json({ message: "not authenticated" }, { status: 401 });

  const body = await request.text();
  const res = await fetch(`${getBackendBaseUrl()}/admin/students/${id}`, {
    method: "PUT",
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

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = await getBackendAuthHeaders();
  if (!headers) return NextResponse.json({ message: "not authenticated" }, { status: 401 });

  const res = await fetch(`${getBackendBaseUrl()}/admin/students/${id}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
