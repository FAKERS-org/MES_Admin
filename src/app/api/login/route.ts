import { NextResponse, type NextRequest } from "next/server";

import { API_URL } from "@/lib/config";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { formatApiDetail } from "@/lib/utils";

/**
 * POST { email, password } -> MES_Api's OAuth2 password login
 * (`application/x-www-form-urlencoded`, username = email) -> sets the httpOnly
 * session cookie with the returned JWT.
 */
export async function POST(req: NextRequest) {
  let email: unknown;
  let password: unknown;
  try {
    ({ email, password } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: email.trim(), password }),
    });
  } catch {
    return NextResponse.json(
      { error: `Cannot reach the MES API at ${API_URL}` },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message =
      (payload && typeof payload === "object" && "detail" in payload
        ? formatApiDetail((payload as { detail: unknown }).detail)
        : null) ?? "Login failed";
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const data = (await res.json().catch(() => null)) as { access_token?: string } | null;
  if (!data?.access_token) {
    return NextResponse.json({ error: "API did not return an access token" }, { status: 502 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, data.access_token, sessionCookieOptions());
  return response;
}
