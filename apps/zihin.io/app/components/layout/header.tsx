import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { IzanLogo } from "~/components/ui/izan-logo";

export function Header() {
  const { t } = useTranslation();
  const { lang = "en" } = useParams();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
        <Link to={`/${lang}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <IzanLogo className="h-6 w-6 text-primary" />
          <span className="text-sm font-semibold tracking-tight">zihin.io</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to={`/${lang}/tools`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.browse")}
          </Link>
          <Link to={`/${lang}/submit`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.submit")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
