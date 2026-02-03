import { cookies } from "next/headers";

const TOKEN_COOKIE = "huhems_token";

export function getBackendBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
}

export async function getBackendAuthHeaders(): Promise<Record<string, string> | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export async function forwardStudentRequest(request: Request, backendPath: string): Promise<Response> {
  const auth = await getBackendAuthHeaders();
  if (!auth) {
    return new Response(JSON.stringify({ message: "not authenticated" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const baseUrl = getBackendBaseUrl();
  const url = new URL(backendPath, baseUrl);

  // Forward querystring from the incoming request.
  const incomingUrl = new URL(request.url);
  incomingUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Preserve request content-type if present.
  const contentType = request.headers.get("content-type") ?? undefined;
  const headers: Record<string, string> = {
    ...auth,
    ...(contentType ? { "content-type": contentType } : {}),
  };

  const method = request.method.toUpperCase();
  const shouldSendBody = method !== "GET" && method !== "HEAD";

  return fetch(url.toString(), {
    method,
    headers,
    body: shouldSendBody ? await request.text() : undefined,
    cache: "no-store",
  });
}
