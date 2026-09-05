import { useState, type ChangeEvent } from "react";
import { Bell, ChevronDown, Menu, Moon, Search, Sun } from "lucide-react";
import "flag-icons/css/flag-icons.min.css";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n";

interface TopBarProps {
  onSearch?: (query: string) => void;
  onLanguageChange?: (lang: string) => void;
  onThemeToggle?: () => void;
  onNotificationsClick?: () => void;
  notificationCount?: number;
  onOpenSidebar?: () => void;
  isDark?: boolean;
}

const flagByLang: Record<string, string> = {
  kh: "fi-kh",
  en: "fi-gb",
};

function TopBar({
  onSearch,
  onLanguageChange,
  onThemeToggle,
  onNotificationsClick,
  notificationCount = 5,
  onOpenSidebar,
  isDark = false,
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { lang, setLang, t } = useLanguage();

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleLanguageChange = (value: string) => {
    const next = value === "en" ? "en" : "kh";
    setLang(next);
    onLanguageChange?.(next);
  };

  const iconButton =
    "p-2.5 rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  return (
    <header className="flex w-full items-center justify-between rounded-xl border bg-card px-6 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        {onOpenSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onOpenSidebar}
            aria-label={t("topbar.toggleMenu")}
          >
            <Menu className="size-5" />
          </Button>
        )}
        <div className="relative w-40 sm:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="size-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={t("topbar.searchPlaceholder")}
            className="w-full rounded-xl border-none bg-muted py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:bg-card focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Select language"
            >
              <span className={`fi ${flagByLang[lang]} size-5 rounded-full`} />
              <span>{lang.toUpperCase()}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={lang} onValueChange={handleLanguageChange}>
              <DropdownMenuRadioItem value="kh">
                <span className={`fi ${flagByLang.kh} size-4 rounded-full`} />
                {t("lang.kh")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">
                <span className={`fi ${flagByLang.en} size-4 rounded-full`} />
                {t("lang.en")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={onThemeToggle}
          className={iconButton}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>

        <button
          type="button"
          onClick={onNotificationsClick}
          className={`relative ${iconButton}`}
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pink-500 px-1.5 text-xs font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

export default TopBar;
