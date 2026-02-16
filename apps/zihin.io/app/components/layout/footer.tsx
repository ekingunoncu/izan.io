import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { IzanLogo } from "~/components/ui/izan-logo";

export function Footer() {
  const { t } = useTranslation();
  const { lang = "en" } = useParams();

  return (
    <footer className="border-t bg-muted/20 dark:bg-muted/5">
      <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link
              to={`/${lang}`}
              className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
            >
              <IzanLogo className="h-8 w-8 text-primary" />
              <span className="text-lg font-semibold tracking-tight">
                zihin.io
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t("footer.tagline")}
            </p>
          </div>
          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-foreground/80">
              {t("footer.product")}
            </h4>
            <div className="flex flex-col gap-2.5">
              <Link
                to={`/${lang}/agents`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("footer.browseAgents")}
              </Link>
              <Link
                to={`/${lang}/submit`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("footer.submitAgent")}
              </Link>
              <a
                href="https://izan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                izan.io
              </a>
            </div>
          </div>
          {/* Community */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-foreground/80">
              {t("footer.community")}
            </h4>
            <div className="flex flex-col gap-2.5">
              <a
                href="https://github.com/ekingunoncu/zihin.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://x.com/izan_io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                X (Twitter)
              </a>
            </div>
          </div>
        </div>
        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} zihin.io
          </p>
        </div>
      </div>
    </footer>
  );
}
