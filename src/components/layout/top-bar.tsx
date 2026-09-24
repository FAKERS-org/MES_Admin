"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Menu, Moon, Sun } from "lucide-react";

import Breadcrumbs from "./breadcrumbs";

export default function TopBar({
  onToggleSidebar,
  docsUrl,
}: {
  onToggleSidebar: () => void;
  docsUrl: string;
}) {
  const [dark, setDark] = useState<boolean | null>(null);

  // Sync with the class the inline theme script already applied.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("mes-theme", next ? "dark" : "light");
    } catch {
      /* storage disabled */
    }
    setDark(next);
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="size-5" />
      </button>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1.5">
        <a
          href={docsUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
          title="MES_Api interactive documentation"
        >
          API docs
          <ExternalLink className="size-3.5" />
        </a>

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
    </header>
  );
}
