import { NextResponse, type NextRequest } from "next/server";

import { API_URL } from "./config";
import { SESSION_COOKIE } from "./auth";
import { formatApiDetail } from "./utils";
import { cookies } from "next/headers";

/**
 * Forwards a browser request to MES_Api with the JWT from the httpOnly session
 * cookie attached. Used by the client-side mutation routes under `/api/admin`.
 */
export async function proxyToApi(req: Request, upstreamPath: string): Promise<NextResponse> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const method = req.method;
  const rawBody = method === "GET" || method === "HEAD" ? "" : await req.text();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/${upstreamPath}`, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(rawBody ? { "Content-Type": "application/json" } : {}),
      },
      body: rawBody || undefined,
    });
  } catch {
    return NextResponse.json(
      { detail: `Cannot reach the MES API at ${API_URL}` },
      { status: 502 },
    );
  }

  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}

/** 405 helper for route handlers that only expose mutations. */
export function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { detail: formatApiDetail("Method not allowed") },
    { status: 405 },
  );
}

export type { NextRequest };
