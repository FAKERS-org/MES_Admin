"use client";

import { useState, type ReactNode } from "react";

import Sidebar from "./sidebar";
import TopBar from "./top-bar";

export default function Shell({ children, docsUrl }: { children: ReactNode; docsUrl: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile scrim */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onToggleSidebar={() => setSidebarOpen((open) => !open)} docsUrl={docsUrl} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
