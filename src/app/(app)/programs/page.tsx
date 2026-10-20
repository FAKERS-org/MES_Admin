import { apiList } from "@/lib/server-api";
import type { ProgramListItem, UniversitySummary } from "@/lib/types";
import { ProgramsManager } from "@/components/programs/programs-manager";

export const metadata = { title: "Programs" };
export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
    const [programs, universities] = await Promise.all([
        apiList<ProgramListItem>("admin/programs/?page=1&limit=100"),
        apiList<UniversitySummary>("admin/universities/?page=1&limit=100"),
    ]);

    return <ProgramsManager initialPrograms={programs} universities={universities} />;
}
