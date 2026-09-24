import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ id: string }> };

/** PATCH /api/v1/admin/programs/{id} - partial program update. */
export async function PATCH(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/programs/${id}`);
}

/** DELETE /api/v1/admin/programs/{id} */
export async function DELETE(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/programs/${id}`);
}
