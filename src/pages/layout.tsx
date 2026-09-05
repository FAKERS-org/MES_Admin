import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FileText, History, LayoutGrid, User, ClipboardList } from "lucide-react";
import Sidebar, { type NavItem } from "@/components/shared/sidebar";
import TopBar from "@/components/shared/top-bar";
import Breadcrumbs from "@/components/shared/breadcrumbs";
import { useTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";

function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const { pathname } = useLocation();

  const isDashboard = pathname === "/";
  const isExam = pathname.startsWith("/exam");
  const isInfo = pathname === "/info" || pathname.startsWith("/info/");

  const navItems: NavItem[] = [
    { icon: <LayoutGrid className="size-4" />, label: t("nav.dashboard"), active: isDashboard, to: "/" },
    { icon: <ClipboardList className="size-4" />, label: t("nav.exam"), active: isExam, to: "/exam" },
    { icon: <History className="size-4" />, label: t("nav.history"), active: pathname === "/history", to: "/history" },
    { icon: <FileText className="size-4" />, label: t("nav.info"), active: isInfo, to: "/info" },
    { icon: <User className="size-4" />, label: t("nav.profile"), active: pathname === "/profile", to: "/profile" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} navItems={navItems} logoSrc="/images/logo.svg" />

      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-muted/40 dark:bg-background">
        <main className="flex h-screen flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
          <TopBar onOpenSidebar={() => setSidebarOpen((o) => !o)} isDark={isDark} onThemeToggle={toggleTheme} />
          <Breadcrumbs />
          <div className="flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default RootLayout;
