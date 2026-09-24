"use client";

import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";

import { Alert, Spinner } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function LoginForm({
  redirectTo,
  expired,
}: {
  redirectTo: string;
  expired: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Login failed. Please try again.");
        setPending(false);
        return;
      }

      // Full navigation: the shell is server-rendered, start it from a clean slate.
      window.location.assign(redirectTo);
    } catch {
      setError("Cannot reach the server. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Sign in</h2>
        <p className="text-sm text-muted-foreground">Use your MES API administrator account.</p>
      </div>

      {expired ? (
        <Alert variant="info">Your session expired. Please sign in again.</Alert>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="admin@example.com"
          required
          autoFocus
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : <LogIn className="size-4" />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
