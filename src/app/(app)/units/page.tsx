import { apiList } from "@/lib/server-api";
import type { UnitListItem, UniversitySummary } from "@/lib/types";
import { UnitsManager } from "@/components/units/units-manager";

export const metadata = { title: "Academic Units" };
export const dynamic = "force-dynamic";

export default async function UnitsPage() {
    const [units, universities] = await Promise.all([
        apiList<UnitListItem>("admin/units/?page=1&limit=100"),
        apiList<UniversitySummary>("admin/universities/?page=1&limit=100"),
    ]);

    return <UnitsManager initialUnits={units} universities={universities} />;
}

