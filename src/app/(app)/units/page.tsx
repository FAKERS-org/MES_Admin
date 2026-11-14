import { apiList, apiPage } from "@/lib/server-api";
import type { UnitListItem, UniversitySummary } from "@/lib/types";
import { UnitsManager, type UnitSearchParams } from "@/components/units/units-manager";

export const metadata = { title: "Academic Units" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function UnitsPage({
    searchParams,
}: {
    searchParams: Promise<UnitSearchParams>;
}) {
    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const universityId = params.university_id ?? "";
    const kind = params.kind ?? "";
    const requestedPage = Math.max(1, Number(params.page ?? 1));

    const apiParams = new URLSearchParams();
    apiParams.set("page", String(requestedPage));
    apiParams.set("limit", String(PAGE_SIZE));
    if (q) apiParams.set("q", q);
    if (universityId) apiParams.set("university_id", universityId);
    if (kind) apiParams.set("kind", kind);

    const [pageData, universities] = await Promise.all([
        apiPage<UnitListItem>(`admin/units/?${apiParams.toString()}`),
        apiList<UniversitySummary>("admin/universities/?page=1&limit=100"),
    ]);

    return (
        <UnitsManager
            pageData={pageData}
            universities={universities}
            searchParams={params}
        />
    );
}
