import { proxyToApi } from "@/lib/proxy";

/** GET /api/v1/auth/me - get current user profile */
export async function GET(req: Request) {
  return proxyToApi(req, "auth/me");
}
