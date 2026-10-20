import { proxyToApi } from "@/lib/proxy";

/** GET /api/v1/admin/users/roles - list roles */
export async function GET(req: Request) {
  return proxyToApi(req, "admin/users/roles");
}
