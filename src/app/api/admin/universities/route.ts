import { proxyToApi } from "@/lib/proxy";

/** POST /api/v1/admin/universities/ - create a university (always starts as DRAFT). */
export async function POST(req: Request) {
  return proxyToApi(req, "admin/universities/");
}
