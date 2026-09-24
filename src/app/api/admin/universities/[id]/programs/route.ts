import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ id: string }> };

/** POST /api/v1/admin/universities/{id}/programs/ - add a program to a university. */
export async function POST(req: Request, { params }: Context) {
  const { id } = await params;
  return proxyToApi(req, `admin/universities/${id}/programs/`);
}
