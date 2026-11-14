import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ path: string[] }> };

const COLLECTION_SEGMENTS = new Set([
  "universities",
  "units",
  "programs",
  "scholarships",
  "users",
  "facilities",
  "curriculum-sections",
  "campuses",
]);

async function forward(req: Request, path: string[]) {
  const last = path[path.length - 1];
  const trailingSlash = COLLECTION_SEGMENTS.has(last) ? "/" : "";
  const pathStr = `${path.join("/")}${trailingSlash}`;

  const upstream = path[0] === "auth" ? pathStr : `admin/${pathStr}`;
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
