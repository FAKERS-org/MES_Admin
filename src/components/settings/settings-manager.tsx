"use client";

import { Cloud, Database, Globe, KeyRound, Server, UserCheck, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader, Spinner } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { apiRequest } from "@/lib/api";
import { API_DOCS_URL, API_URL } from "@/lib/config";
import type { SystemInfo, UserProfile } from "@/lib/types";

export function SettingsManager({ userProfile, systemInfo }: { userProfile: UserProfile; systemInfo: SystemInfo }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        try {
            await apiRequest("/api/admin/auth/change-password", {
                method: "POST",
                body: {
                    current_password: currentPassword,
                    new_password: newPassword,
                },
            });
            setSuccess("Password updated successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to change password");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={<h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>}
                subtitle="Manage your administrator account credentials, review system telemetry, and monitor API connectivity."
            />

            {error ? (
                <Alert variant="destructive">
                    <div className="flex items-center justify-between">
                        <span>{error}</span>
                        <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                            <X className="size-3.5" />
                        </Button>
                    </div>
                </Alert>
            ) : null}
            {success ? (
                <Alert variant="success">
                    <div className="flex items-center justify-between">
                        <span>{success}</span>
                        <Button variant="ghost" size="sm" onClick={() => setSuccess(null)}>
                            <X className="size-3.5" />
                        </Button>
                    </div>
                </Alert>
            ) : null}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <StatCard
                    label="Universities"
                    value={systemInfo.total_universities}
                    hint="Catalog records"
                    accent="primary"
                />
                <StatCard
                    label="Programs"
                    value={systemInfo.total_programs}
                    hint="Academic offerings"
                    accent="primary"
                />
                <StatCard label="Units" value={systemInfo.total_units} hint="Faculties & Depts" accent="muted" />
                <StatCard
                    label="Scholarships"
                    value={systemInfo.total_scholarships}
                    hint="Available grants"
                    accent="success"
                />
                <StatCard label="Admin Users" value={systemInfo.total_users} hint="Active accounts" accent="warning" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* User Profile & Security */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <UserCheck className="size-5 text-primary" />
                            <CardTitle>My Profile</CardTitle>
                        </div>
                        <CardDescription>Your current administrative account session details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Email Account</span>
                                <span className="font-semibold text-sm">{userProfile.email}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Privilege Level</span>
                                <div className="flex items-center gap-1.5">
                                    {userProfile.is_superuser ? (
                                        <Badge variant="default" className="bg-success hover:bg-amber-600 text-white">
                                            Superuser
                                        </Badge>
                                    ) : null}
                                    {userProfile.roles.map(r => (
                                        <Badge key={r} variant="outline">
                                            {r}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Account Status</span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                    <span className="size-1.5 rounded-full bg-emerald-600" />
                                    Active & Authenticated
                                </span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <h3 className="font-medium text-sm flex items-center gap-1.5 mb-3">
                                <KeyRound className="size-4 text-muted-foreground" />
                                Change Account Password
                            </h3>
                            <form onSubmit={handlePasswordChange} className="space-y-3">
                                <Field label="Current Password" htmlFor="cur-pass" required>
                                    <Input
                                        id="cur-pass"
                                        type="password"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                    />
                                </Field>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="New Password" htmlFor="new-pass" required>
                                        <Input
                                            id="new-pass"
                                            type="password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            required
                                            placeholder="Min. 6 characters"
                                        />
                                    </Field>
                                    <Field label="Confirm New Password" htmlFor="cnf-pass" required>
                                        <Input
                                            id="cnf-pass"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            required
                                            placeholder="••••••••"
                                        />
                                    </Field>
                                </div>

                                <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
                                    {isSubmitting ? <Spinner className="size-4" /> : null}
                                    Update Password
                                </Button>
                            </form>
                        </div>
                    </CardContent>
                </Card>

                {/* System Diagnostics & Environment */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Server className="size-5 text-primary" />
                            <CardTitle>System & Infrastructure</CardTitle>
                        </div>
                        <CardDescription>Backend environment and external service connectivity.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-2.5">
                                    <Server className="size-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs font-medium">MES_Api Backend</p>
                                        <p className="text-[11px] text-muted-foreground">{API_URL}</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                    <span className="size-1.5 rounded-full bg-emerald-600" />
                                    Online ({systemInfo.environment})
                                </span>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-2.5">
                                    <Database className="size-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs font-medium">PostgreSQL Database</p>
                                        <p className="text-[11px] text-muted-foreground">SQLModel engine</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                    <span className="size-1.5 rounded-full bg-emerald-600" />
                                    Connected
                                </span>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-2.5">
                                    <Cloud className="size-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs font-medium">Cloudflare R2 Object Storage</p>
                                        <p className="text-[11px] text-muted-foreground">Presigned upload URLs</p>
                                    </div>
                                </div>
                                {systemInfo.r2_storage_configured ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                        <span className="size-1.5 rounded-full bg-emerald-600" />
                                        Configured
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                                        <span className="size-1.5 rounded-full bg-amber-600" />
                                        Not configured
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                API Documentation
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Explore interactive OpenAPI documentation, test endpoints, and review schema
                                specifications directly in Swagger UI.
                            </p>
                            <a
                                href={API_DOCS_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline pt-1"
                            >
                                <Globe className="size-3.5" />
                                Open Swagger Documentation
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
