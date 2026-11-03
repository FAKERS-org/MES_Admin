import { proxyToApi } from "@/lib/proxy";

export async function GET(req: Request) {
    return proxyToApi(req, "admin/units/");
}

export async function POST(req: Request) {
    return proxyToApi(req, "admin/units/");
}

