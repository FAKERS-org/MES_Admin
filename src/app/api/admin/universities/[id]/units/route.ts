import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ id: string }> };

/** GET /api/v1/admin/universities/{id}/units/ - list units of a university. */
export async function GET(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/universities/${id}/units/`);
}

/** POST /api/v1/admin/universities/{id}/units/ - create a unit. */
export async function POST(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/universities/${id}/units/`);
}
