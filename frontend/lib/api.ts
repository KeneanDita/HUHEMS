import { getApiBaseUrl } from "./env";

export type ApiError = {
  status: number;
  message: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, getApiBaseUrl());

  const response = await fetch(url, {
    ...init,
    method: "GET",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await parseJsonSafe(response);
    const obj = asRecord(body);
    throw {
      status: response.status,
      message: typeof body === "string" ? body : (typeof obj?.message === "string" ? obj.message : "Request failed"),
    } satisfies ApiError;
  }

  return (await response.json()) as T;
}
