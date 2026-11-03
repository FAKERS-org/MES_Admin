import { proxyToApi } from "@/lib/proxy";

type Context = { params: Promise<{ unitId: string }> };

export async function GET(req: Request, { params }: Context) {
    const { unitId } = await params;
    return proxyToApi(req, `admin/units/${unitId}`);
}

export async function PATCH(req: Request, { params }: Context) {
    const { unitId } = await params;
    return proxyToApi(req, `admin/units/${unitId}`);
}

export async function DELETE(req: Request, { params }: Context) {
    const { unitId } = await params;
    return proxyToApi(req, `admin/units/${unitId}`);
}

