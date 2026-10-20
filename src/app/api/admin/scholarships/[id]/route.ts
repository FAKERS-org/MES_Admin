import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ id: string }> };

/** PATCH /api/v1/admin/scholarships/{id} - partial scholarship update */
export async function PATCH(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/scholarships/${id}`);
}

/** DELETE /api/v1/admin/scholarships/{id} - delete scholarship */
export async function DELETE(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/scholarships/${id}`);
}
