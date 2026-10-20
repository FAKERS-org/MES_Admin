import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ id: string }> };

/** GET /api/v1/admin/users/{id} - get user */
export async function GET(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/users/${id}`);
}

/** PATCH /api/v1/admin/users/{id} - update user */
export async function PATCH(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/users/${id}`);
}

/** DELETE /api/v1/admin/users/{id} - delete user */
export async function DELETE(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/users/${id}`);
}
