import { apiList, apiPage } from "@/lib/server-api";
import type { ProgramListItem, UniversitySummary } from "@/lib/types";
import { ProgramsManager, type ProgramSearchParams } from "@/components/programs/programs-manager";

export const metadata = { title: "Programs" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function ProgramsPage({
    searchParams,
}: {
    searchParams: Promise<ProgramSearchParams>;
}) {
    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const degreeLevel = params.degree_level ?? "";
    const universityId = params.university_id ?? "";
    const faculty = params.faculty ?? "";
    const shift = params.shift ?? "";
    const requestedPage = Math.max(1, Number(params.page ?? 1));

    const apiParams = new URLSearchParams();
    apiParams.set("page", String(requestedPage));
    apiParams.set("limit", String(PAGE_SIZE));
    if (q) apiParams.set("q", q);
    if (degreeLevel) apiParams.set("degree_level", degreeLevel);
    if (universityId) apiParams.set("university_id", universityId);
    if (faculty) apiParams.set("faculty", faculty);
    if (shift) apiParams.set("shift", shift);

    const [pageData, universities] = await Promise.all([
        apiPage<ProgramListItem>(`admin/programs/?${apiParams.toString()}`),
        apiList<UniversitySummary>("admin/universities/?page=1&limit=100"),
    ]);

    return (
        <ProgramsManager
            pageData={pageData}
            universities={universities}
            searchParams={params}
        />
    );
}
