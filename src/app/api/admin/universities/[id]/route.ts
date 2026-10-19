import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ id: string }> };

/** GET /api/v1/admin/universities/{id} - get university detail. */
export async function GET(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/universities/${id}`);
}

/** PATCH /api/v1/admin/universities/{id} - partial update (incl. status publish/draft). */
export async function PATCH(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/universities/${id}`);
}

/** DELETE /api/v1/admin/universities/{id} - deletes the university and its programs. */
export async function DELETE(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/universities/${id}`);
}
