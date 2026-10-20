import { proxyToApi } from "@/lib/proxy";

/** GET /api/v1/admin/programs/ - list all programs */
export async function GET(req: Request) {
  return proxyToApi(req, "admin/programs/");
}
