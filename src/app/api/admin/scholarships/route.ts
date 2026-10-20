import { proxyToApi } from "@/lib/proxy";

/** GET /api/v1/admin/scholarships/ - list all scholarships */
export async function GET(req: Request) {
  return proxyToApi(req, "admin/scholarships/");
}

/** POST /api/v1/admin/scholarships/ - create direct scholarship */
export async function POST(req: Request) {
  return proxyToApi(req, "admin/scholarships/");
}
