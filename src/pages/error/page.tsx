import { Link } from "react-router-dom";
import { Home, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}

export default function ErrorPage({
  title = "Page not found",
  description = "Sorry, the page you are looking for doesn't exist or has been moved.",
  showHomeButton = true,
}: ErrorPageProps) {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <AlertCircle className="h-20 w-20 text-muted-foreground/50" />
        </div>

        <h1 className="mb-4 text-4xl font-bold text-foreground">{title}</h1>
        <p className="mb-8 max-w-md text-lg text-muted-foreground">{description}</p>

        {showHomeButton && (
          <Link to="/">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              {t("nav.dashboard")}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
