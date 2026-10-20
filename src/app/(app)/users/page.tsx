import { UsersManager } from "@/components/users/users-manager";
import { apiList, apiRequest } from "@/lib/server-api";
import type { RoleSummary, UserSummary } from "@/lib/types";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
    const [users, roles] = await Promise.all([
        apiList<UserSummary>("admin/users/?page=1&limit=100"),
        apiRequest<RoleSummary[]>("admin/users/roles"),
    ]);

    return <UsersManager initialUsers={users} availableRoles={roles ?? []} />;
}
