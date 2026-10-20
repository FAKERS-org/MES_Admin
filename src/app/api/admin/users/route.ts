import { proxyToApi } from "@/lib/proxy";

/** GET /api/v1/admin/users/ - list users */
export async function GET(req: Request) {
  return proxyToApi(req, "admin/users/");
}

/** POST /api/v1/admin/users/ - create user */
export async function POST(req: Request) {
  return proxyToApi(req, "admin/users/");
}
