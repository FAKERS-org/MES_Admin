import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface NavItem {
  icon: ReactNode;
  label: string;
  active?: boolean;
  to?: string;
}

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  logoSrc?: string;
  logoAlt?: string;
  className?: string;
}

function Sidebar({
  open,
  onClose,
  navItems,
  logoSrc = "/images/MES-logo-horizontal.png",
  logoAlt = "MES Logo",
  className,
}: SidebarProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleNav = (item: NavItem) => {
    if (item.to) {
      navigate(item.to);
    }
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[transform,width] duration-300 ease-in-out sm:w-64 lg:static",
        open ? "translate-x-0 lg:w-64" : "-translate-x-full lg:translate-x-0 lg:w-0",
        className,
      )}
    >
      <div className="flex h-full w-64 flex-col">
        <div className="flex items-center justify-center px-5 py-6">
          <img src={logoSrc} alt={logoAlt} className="h-7 w-auto object-contain" />
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNav(item)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-sky-100 font-semibold text-sky-900 dark:bg-sky-950/80 dark:text-sky-100"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto px-3 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-5" />
            <span>{t("sidebar.logout")}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
