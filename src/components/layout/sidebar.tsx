"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, LogOut, X } from "lucide-react";

import { APP_NAME, APP_VERSION } from "@/lib/config";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Manage",
    items: [{ href: "/universities", label: "Universities", icon: Building2 }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            M
          </span>
          <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            v{APP_VERSION}
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <form
          action="/api/logout"
          method="POST"
          onSubmit={(event) => {
            event.preventDefault();
            fetch("/api/logout", { method: "POST" }).finally(() => {
              window.location.assign("/login");
            });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
