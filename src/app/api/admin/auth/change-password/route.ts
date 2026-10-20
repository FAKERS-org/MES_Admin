import { proxyToApi } from "@/lib/proxy";

/** POST /api/v1/auth/change-password - change password */
export async function POST(req: Request) {
  return proxyToApi(req, "auth/change-password");
}
