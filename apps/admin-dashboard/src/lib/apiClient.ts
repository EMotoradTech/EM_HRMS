import { useMemo } from "react";
import { Settings, useSettings } from "./settings";
import { ServiceKey, SERVICES } from "./services";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function headersFor(serviceKey: ServiceKey, settings: Settings, isJson: boolean): HeadersInit {
  const def = SERVICES.find((s) => s.key === serviceKey)!;
  const headers: Record<string, string> = {};
  if (isJson) headers["Content-Type"] = "application/json";
  if (def.requiresApiKey) headers["x-internal-api-key"] = settings.apiKey;
  if (serviceKey === "hrVault") {
    headers["x-actor-email"] = settings.actorEmail;
    headers["x-actor-role"] = settings.actorRole;
  }
  return headers;
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.error ?? message;
    } catch {
      // non-JSON error body, fall back to statusText
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface Api {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
  upload<T>(path: string, form: FormData): Promise<T>;
  baseUrl: string;
}

/** A ready-to-call client for one backend service, bound to current settings. */
export function useApi(serviceKey: ServiceKey): Api {
  const { settings } = useSettings();
  return useMemo(() => {
    const baseUrl = settings.baseUrls[serviceKey];
    return {
      baseUrl,
      get: <T,>(path: string) =>
        fetch(`${baseUrl}${path}`, { headers: headersFor(serviceKey, settings, false) }).then((r) =>
          handle<T>(r)
        ),
      post: <T,>(path: string, body?: unknown) =>
        fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: headersFor(serviceKey, settings, true),
          body: body !== undefined ? JSON.stringify(body) : undefined,
        }).then((r) => handle<T>(r)),
      patch: <T,>(path: string, body?: unknown) =>
        fetch(`${baseUrl}${path}`, {
          method: "PATCH",
          headers: headersFor(serviceKey, settings, true),
          body: body !== undefined ? JSON.stringify(body) : undefined,
        }).then((r) => handle<T>(r)),
      del: <T,>(path: string) =>
        fetch(`${baseUrl}${path}`, {
          method: "DELETE",
          headers: headersFor(serviceKey, settings, false),
        }).then((r) => handle<T>(r)),
      upload: <T,>(path: string, form: FormData) =>
        fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: headersFor(serviceKey, settings, false), // no Content-Type: browser sets multipart boundary
          body: form,
        }).then((r) => handle<T>(r)),
    };
  }, [serviceKey, settings]);
}

/** Health check for the overview page — doesn't throw, just reports up/down. */
export async function pingHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}
