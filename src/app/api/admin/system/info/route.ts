import { proxyToApi } from "@/lib/proxy";

/** GET /api/v1/admin/system/info - get system diagnostic info */
export async function GET(req: Request) {
  return proxyToApi(req, "admin/system/info");
}
