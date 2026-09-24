import { formatApiDetail } from "./utils";

/** Error thrown by `apiRequest` when a proxied API call fails. */
export class ApiClientError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(formatApiDetail(detail) ?? `Request failed with status ${status}`);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Call one of this app's `/api/*` proxy routes from a client component.
 * The httpOnly session cookie is attached server-side by the route handler.
 *
 * `path` is a Next.js route path, e.g. `/api/admin/universities/123`.
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", body } = options;

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      cache: "no-store",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError(0, "Cannot reach the MES_Admin server");
  }

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    if (res.status === 401) {
      // Expired session: send the user back to the login screen.
      window.location.assign("/login?expired=1");
    }
    throw new ApiClientError(res.status, payload);
  }

  return payload as T;
}
