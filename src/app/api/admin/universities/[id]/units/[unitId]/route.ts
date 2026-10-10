import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ id: string; unitId: string }> };

/** PATCH /api/v1/admin/universities/{id}/units/{unit_id} - partial unit update. */
export async function PATCH(req: Request, { params }: Context) {
  const { id, unitId } = await params;
  return proxyToApi(req, `admin/universities/${id}/units/${unitId}`);
}

/** DELETE /api/v1/admin/universities/{id}/units/{unit_id} - deletes the unit and its content. */
export async function DELETE(req: Request, { params }: Context) {
  const { id, unitId } = await params;
  return proxyToApi(req, `admin/universities/${id}/units/${unitId}`);
}
