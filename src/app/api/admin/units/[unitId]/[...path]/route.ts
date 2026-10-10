import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ unitId: string; path: string[] }> };

/**
 * Catch-all proxy for a unit's own content rows: facilities, scholarships and
 * curriculum sections. Every upstream route lives under
 * `/api/v1/admin/units/{unitId}/...` and is permission-guarded, so forwarding
 * the sub-path is safe - the API is the trust boundary, not this dashboard.
 *
 * Single-segment paths (list/create, e.g. `facilities`) keep the trailing
 * slash because the backend declares those routes as `"/"` under a prefixed
 * router; multi-segment paths (`facilities/{id}`) must not have one.
 */
async function forward(req: Request, unitId: string, path: string[]) {
  const upstream =
    path.length === 1 ? `admin/units/${unitId}/${path[0]}/` : `admin/units/${unitId}/${path.join("/")}`;
  return proxyToApi(req, upstream);
}

export async function GET(req: Request, { params }: Context) {
  const { unitId, path } = await params;
  return forward(req, unitId, path);
}

export async function POST(req: Request, { params }: Context) {
  const { unitId, path } = await params;
  return forward(req, unitId, path);
}

export async function PATCH(req: Request, { params }: Context) {
  const { unitId, path } = await params;
  return forward(req, unitId, path);
}

export async function DELETE(req: Request, { params }: Context) {
  const { unitId, path } = await params;
  return forward(req, unitId, path);
}
