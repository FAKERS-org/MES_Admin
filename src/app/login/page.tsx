import { ShieldCheck } from "lucide-react";

import LoginForm from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; expired?: string }>;
}) {
  const { from, expired } = await searchParams;
  const redirectTo = from && from.startsWith("/") && !from.startsWith("//") ? from : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
            M
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">MES Admin</h1>
            <p className="text-sm text-muted-foreground">
              Back-office for the MES University Info API
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <LoginForm redirectTo={redirectTo} expired={expired === "1"} />
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Your session is stored in an httpOnly cookie; the token never reaches the browser.
        </p>
      </div>
    </div>
  );
}
