import { apiRequest } from "@/lib/server-api";
import type { SystemInfo, UserProfile } from "@/lib/types";
import { SettingsManager } from "@/components/settings/settings-manager";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const [userProfile, systemInfo] = await Promise.all([
        apiRequest<UserProfile>("auth/me"),
        apiRequest<SystemInfo>("admin/system/info"),
    ]);

    return <SettingsManager userProfile={userProfile} systemInfo={systemInfo} />;
}
