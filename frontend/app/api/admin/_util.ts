import { cookies } from "next/headers";

import { getApiBaseUrl } from "@/lib/env";

const TOKEN_COOKIE = "huhems_token";

export async function getBackendAuthHeaders(): Promise<Record<string, string> | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export function getBackendBaseUrl(): string {
  return getApiBaseUrl();
}
