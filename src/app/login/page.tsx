import Image from "next/image";
import { ShieldCheck } from "lucide-react";

import LoginForm from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; expired?: string }>;
}) {
  const { from, expired } = await searchParams;
  const redirectTo =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image
            src="/static/MES-logo-horizontal.svg"
            alt="MES Admin"
            width={150}
            height={42}
          />
          <p className="max-w-xs text-sm text-muted-foreground">
            Manage universities and their study programs.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <LoginForm redirectTo={redirectTo} expired={expired === "1"} />
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Session stored in httpOnly cookie, hidden from scripts.
        </p>
      </div>
    </div>
  );
}
