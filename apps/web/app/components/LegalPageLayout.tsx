import { Link, useParams } from "react-router";
import { ChevronDown } from "lucide-react";
import { IzanLogo } from "~/components/ui/izan-logo";
import { Button } from "~/components/ui/button";
import type { SupportedLanguage } from "~/i18n";
import { cn } from "~/lib/utils";
import { useState, useRef, useEffect } from "react";

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
];

type LegalPage = "privacy" | "terms";

interface LegalPageLayoutProps {
  readonly children: React.ReactNode;
  readonly backLabel: string;
  readonly title: string;
  readonly lastUpdated: string;
  readonly intro: string;
  readonly otherPageLink: { to: string; label: string };
  readonly page: LegalPage;
}

export function LegalPageLayout({
  children,
  backLabel,
  title,
  lastUpdated,
  intro,
  otherPageLink,
  page,
}: LegalPageLayoutProps) {
  const { lang } = useParams();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === lang)?.label ?? "TR";
  const basePath = lang ? `/${lang}` : "";
  const alternatePath = (l: SupportedLanguage) => `/${l}/${page}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle background pattern */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-b from-primary/[0.07] via-transparent to-muted/30"
        aria-hidden
      />

      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <Link to={basePath}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground"
            >
              ← {backLabel}
            </Button>
          </Link>
          <Link
            to={basePath}
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
          >
            <IzanLogo className="h-8 w-8 sm:h-9 sm:w-9 text-primary" />
            <span className="text-lg sm:text-xl font-semibold tracking-tight truncate">
              izan.io
            </span>
          </Link>
          <div className="relative" ref={langRef}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 min-w-[4.5rem]"
              onClick={() => setLangOpen(!langOpen)}
            >
              <span className="text-sm font-medium">{currentLang}</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", langOpen && "rotate-180")}
              />
            </Button>
            {langOpen && (
              <div className="legal-lang-dropdown absolute right-0 top-full mt-2 py-1.5 rounded-xl border bg-card shadow-xl shadow-black/5 min-w-[7.5rem] overflow-hidden">
                {LANGUAGES.map((l) => (
                  <Link
                    key={l.code}
                    to={alternatePath(l.code)}
                    className={cn(
                      "block px-4 py-2.5 text-sm transition-colors",
                      lang === l.code
                        ? "bg-muted font-medium text-foreground"
                        : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-3xl">
        <div className="mb-12">
          <span className="inline-block rounded-full border bg-slate-200/90 dark:bg-muted/50 px-3 py-1 text-xs font-medium text-slate-700 dark:text-muted-foreground mb-6">
            {lastUpdated}
          </span>
          <h1 className="legal-hero-title text-3xl sm:text-4xl md:text-[2.75rem] font-bold mb-4">
            {title}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            {intro}
          </p>
        </div>

        {children}

        <footer className="mt-16 pt-10 border-t border-border/80">
          <div className="flex flex-wrap items-center gap-3">
            <Link to={basePath}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-2 h-9 px-4"
              >
                ← {backLabel}
              </Button>
            </Link>
            <Link to={otherPageLink.to}>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg h-9 px-4 text-muted-foreground hover:text-foreground"
              >
                {otherPageLink.label}
              </Button>
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
