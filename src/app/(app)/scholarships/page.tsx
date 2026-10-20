import { apiList } from "@/lib/server-api";
import type { ScholarshipListItem, UniversitySummary } from "@/lib/types";
import { ScholarshipsManager } from "@/components/scholarships/scholarships-manager";

export const metadata = { title: "Scholarships" };
export const dynamic = "force-dynamic";

export default async function ScholarshipsPage() {
    const [scholarships, universities] = await Promise.all([
        apiList<ScholarshipListItem>("admin/scholarships/?page=1&limit=100"),
        apiList<UniversitySummary>("admin/universities/?page=1&limit=100"),
    ]);

    return <ScholarshipsManager initialScholarships={scholarships} universities={universities} />;
}
