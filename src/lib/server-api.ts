import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { API_URL } from "./config";
import { SESSION_COOKIE } from "./auth";
import { formatApiDetail } from "./utils";

/** Thrown when MES_Api answers with a non-2xx status. Rendered by `error.tsx`. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function readDetail(res: Response): Promise<string> {
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON body */
  }
  const detail =
    payload && typeof payload === "object" && "detail" in payload
      ? formatApiDetail((payload as { detail: unknown }).detail)
      : null;
  return detail ?? `Request to MES_Api failed with status ${res.status}`;
}

/**
 * Fetch MES_Api from a server component / route handler.
 * - no session cookie -> redirect to /login
 * - expired token (401) -> redirect to /login?expired=1
 * - other errors -> throw ApiError
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: Method; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", body } = options;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/${path}`, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Cannot reach the MES API at ${API_URL}. Is it running?`);
  }

  if (res.status === 401) redirect("/login?expired=1");
  if (!res.ok) throw new ApiError(res.status, await readDetail(res));
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

/** Unauthenticated health probe used by the dashboard and the top bar. */
export async function fetchHealth(): Promise<{ ok: boolean; status?: string; env?: string }> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { status: string; env: string };
    return { ok: true, status: data.status, env: data.env };
  } catch {
    return { ok: false };
  }
}

/**
 * IDs of universities whose status is PUBLISHED.
 *
 * The admin schemas do not expose `status`, but the public endpoint only lists
 * published rows - so one paginated sweep gives us draft/published state for
 * every record without N+1 lookups.
 */
export async function publishedIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    for (let page = 1; page <= 20; page += 1) {
      const res = await fetch(
        `${API_URL}/api/v1/public/universities/?page=${page}&limit=100`,
        { cache: "no-store" },
      );
      if (!res.ok) break;
      const data = (await res.json()) as { items?: Array<{ id: string }> };
      const items = data.items ?? [];
      for (const item of items) ids.add(item.id);
      if (items.length < 100) break;
    }
  } catch {
    /* API unreachable: treated as "nothing published"; the page-level fetch will surface the error */
  }
  return ids;
}
