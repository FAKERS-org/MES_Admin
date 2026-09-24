/**
 * Session cookie helpers.
 *
 * The cookie is httpOnly: the JWT issued by MES_Api's `/api/v1/auth/login`
 * never reaches browser JavaScript. Every API call from the browser is proxied
 * through a Next.js route handler that attaches the `Authorization` header.
 */

export const SESSION_COOKIE = "mes_admin_session";

/** Seconds the session cookie lives. Keep in sync with the API's ACCESS_TOKEN_EXPIRE_MINUTES. */
export const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE ?? 1800);

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
