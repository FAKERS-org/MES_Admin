"use client";

import { Pencil, Plus, Search, Shield, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, PageHeader } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import type { RoleSummary, UserCreatePayload, UserSummary, UserUpdatePayload } from "@/lib/types";

function raw(form: FormData, key: string): string {
    return String(form.get(key) ?? "").trim();
}

export function UsersManager({
    initialUsers,
    availableRoles,
}: {
    initialUsers: UserSummary[];
    availableRoles: RoleSummary[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Filtered list
    const filtered = initialUsers.filter(u => {
        if (roleFilter && !u.roles.includes(roleFilter)) return false;
        if (search) {
            const term = search.toLowerCase();
            if (!u.email.toLowerCase().includes(term)) return false;
        }
        return true;
    });

    const toggleRoleSelection = (roleId: number) => {
        setSelectedRoleIds(prev => (prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]));
    };

    // Open Edit modal with prefilled roles
    const openEdit = async (user: UserSummary) => {
        setError(null);
        setEditingUser(user);
        try {
            const detail = await apiRequest<{ role_ids: number[] }>(`/api/admin/users/${user.id}`);
            setSelectedRoleIds(detail.role_ids ?? []);
        } catch {
            setSelectedRoleIds([]);
        }
    };

    // Create User
    const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);

        const payload: UserCreatePayload = {
            email: raw(form, "email"),
            password: raw(form, "password"),
            is_active: form.get("is_active") === "on",
            is_superuser: form.get("is_superuser") === "on",
            role_ids: selectedRoleIds,
        };

        try {
            await apiRequest("/api/admin/users", {
                method: "POST",
                body: payload,
            });
            setIsCreateOpen(false);
            setSelectedRoleIds([]);
            startTransition(() => router.refresh());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create user");
        }
    };

    // Update User
    const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingUser) return;
        setError(null);
        const form = new FormData(e.currentTarget);
        const newPassword = raw(form, "password");

        const payload: UserUpdatePayload = {
            email: raw(form, "email"),
            is_active: form.get("is_active") === "on",
            is_superuser: form.get("is_superuser") === "on",
            role_ids: selectedRoleIds,
            ...(newPassword ? { password: newPassword } : {}),
        };

        try {
            await apiRequest(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                body: payload,
            });
            setEditingUser(null);
            setSelectedRoleIds([]);
            startTransition(() => router.refresh());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to update user");
        }
    };

    // Delete User
    const handleDelete = async (id: number) => {
        setError(null);
        try {
            await apiRequest(`/api/admin/users/${id}`, { method: "DELETE" });
            startTransition(() => router.refresh());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to delete user");
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={<h1 className="text-2xl font-semibold tracking-tight">System Users</h1>}
                subtitle={`${filtered.length} of ${initialUsers.length} user accounts registered.`}
                actions={
                    <Button
                        onClick={() => {
                            setSelectedRoleIds([]);
                            setIsCreateOpen(true);
                        }}
                    >
                        <Plus className="size-4" />
                        New user
                    </Button>
                }
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

            {/* Filter Bar */}
            <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="min-w-56 flex-1 space-y-1.5">
                    <label htmlFor="u-search" className="text-xs font-medium text-muted-foreground">
                        Search by email
                    </label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="u-search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="user@example.com…"
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="w-56 space-y-1.5">
                    <label htmlFor="u-role" className="text-xs font-medium text-muted-foreground">
                        Role
                    </label>
                    <Select id="u-role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                        <option value="">All roles</option>
                        {availableRoles.map(r => (
                            <option key={r.id} value={r.name}>
                                {r.name}
                            </option>
                        ))}
                    </Select>
                </div>

                {search || roleFilter ? (
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSearch("");
                            setRoleFilter("");
                        }}
                    >
                        Reset
                    </Button>
                ) : null}
            </div>

            {/* Users Table */}
            <Card>
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="p-6">
                            <EmptyState
                                title="No users found"
                                description="Try adjusting your search filters or create a new user account."
                                action={
                                    <Button
                                        onClick={() => {
                                            setSelectedRoleIds([]);
                                            setIsCreateOpen(true);
                                        }}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Plus className="size-4" />
                                        New user
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User Email</TableHead>
                                    <TableHead>Roles & Badges</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(u => (
                                    <TableRow key={u.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold">
                                                    {u.email.slice(0, 2).toUpperCase()}
                                                </span>
                                                <div className="font-medium">{u.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {u.is_superuser ? (
                                                    <Badge
                                                        variant="default"
                                                        className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                                                    >
                                                        <Shield className="size-3" />
                                                        Superuser
                                                    </Badge>
                                                ) : null}
                                                {u.roles.length > 0 ? (
                                                    u.roles.map(r => (
                                                        <Badge key={r} variant="outline">
                                                            {r}
                                                        </Badge>
                                                    ))
                                                ) : !u.is_superuser ? (
                                                    <span className="text-xs text-muted-foreground">Standard User</span>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {u.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                                    <span className="size-1.5 rounded-full bg-emerald-600" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                    <span className="size-1.5 rounded-full bg-muted-foreground" />
                                                    Inactive
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(u.created_at).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                                                    <Pencil className="size-3.5" />
                                                    Edit
                                                </Button>
                                                <ConfirmButton
                                                    label="Delete"
                                                    confirmLabel="Delete user account?"
                                                    onConfirm={() => handleDelete(u.id)}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create User Modal */}
            {isCreateOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in fade-in-50">
                        <div className="flex items-center justify-between pb-4 border-b">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Users className="size-5 text-primary" />
                                Create User Account
                            </h2>
                            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
                                <X className="size-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4 pt-4">
                            <Field label="Email Address" htmlFor="c-email" required>
                                <Input
                                    id="c-email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="admin@example.com"
                                />
                            </Field>

                            <Field label="Initial Password" htmlFor="c-pass" required>
                                <Input
                                    id="c-pass"
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="Minimum 6 characters"
                                />
                            </Field>

                            <div className="space-y-2 pt-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Assigned Roles
                                </label>
                                <div className="space-y-2 max-h-36 overflow-y-auto rounded-lg border p-2.5">
                                    {availableRoles.map(role => (
                                        <label
                                            key={role.id}
                                            className="flex items-start gap-2.5 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedRoleIds.includes(role.id)}
                                                onChange={() => toggleRoleSelection(role.id)}
                                                className="mt-0.5 size-4 rounded border-gray-300 text-primary"
                                            />
                                            <div>
                                                <p className="font-medium text-xs leading-none">{role.name}</p>
                                                {role.description ? (
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        {role.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t pt-3">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="checkbox" name="is_active" defaultChecked className="size-4" />
                                    Active account
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="checkbox" name="is_superuser" className="size-4" />
                                    Superuser
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Create User</Button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {/* Edit User Modal */}
            {editingUser ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in fade-in-50">
                        <div className="flex items-center justify-between pb-4 border-b">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Pencil className="size-5 text-primary" />
                                Edit User Account
                            </h2>
                            <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                                <X className="size-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                            <Field label="Email Address" htmlFor="e-email" required>
                                <Input
                                    id="e-email"
                                    name="email"
                                    type="email"
                                    defaultValue={editingUser.email}
                                    required
                                />
                            </Field>

                            <Field label="Reset Password (optional)" htmlFor="e-pass">
                                <Input
                                    id="e-pass"
                                    name="password"
                                    type="password"
                                    placeholder="Leave blank to keep existing password"
                                />
                            </Field>

                            <div className="space-y-2 pt-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Assigned Roles
                                </label>
                                <div className="space-y-2 max-h-36 overflow-y-auto rounded-lg border p-2.5">
                                    {availableRoles.map(role => (
                                        <label
                                            key={role.id}
                                            className="flex items-start gap-2.5 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedRoleIds.includes(role.id)}
                                                onChange={() => toggleRoleSelection(role.id)}
                                                className="mt-0.5 size-4 rounded border-gray-300 text-primary"
                                            />
                                            <div>
                                                <p className="font-medium text-xs leading-none">{role.name}</p>
                                                {role.description ? (
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        {role.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t pt-3">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        defaultChecked={editingUser.is_active}
                                        className="size-4"
                                    />
                                    Active account
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="is_superuser"
                                        defaultChecked={editingUser.is_superuser}
                                        className="size-4"
                                    />
                                    Superuser
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Save Changes</Button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
