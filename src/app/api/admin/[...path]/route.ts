import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ path: string[] }> };

async function forward(req: Request, path: string[]) {
  const pathStr = path.join("/");
  // If path starts with "auth", proxy to "auth/...", otherwise "admin/..."
  const upstream = path[0] === "auth"
    ? pathStr
    : `admin/${pathStr}${path.length === 1 ? "/" : ""}`;
  return proxyToApi(req, upstream);
}

export async function GET(req: Request, { params }: Context) {
  const { path } = await params;
  return forward(req, path);
}

export async function POST(req: Request, { params }: Context) {
  const { path } = await params;
  return forward(req, path);
}

export async function PATCH(req: Request, { params }: Context) {
  const { path } = await params;
  return forward(req, path);
}

export async function DELETE(req: Request, { params }: Context) {
  const { path } = await params;
  return forward(req, path);
}
