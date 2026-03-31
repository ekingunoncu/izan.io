import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/home";
import { SUPPORTED_LANGUAGES } from "~/i18n";
import { IzanLogo } from "~/components/ui/izan-logo";
import { GitHubStarButton } from "~/components/GitHubStarButton";

const SITE_URL = "https://izan.io";

const MCP_CONFIG = `{
  "mcpServers": {
    "izan-browser": {
      "command": "npx",
      "args": ["izan-mcp"]
    }
  }
}`;

export const HOME_TITLES: Record<string, string> = {
  en: "izan.io - Turn any JS function into a tool your AI can call",
  tr: "izan.io - JS fonksiyonunu AI aracina donusturun",
  de: "izan.io - JS-Funktion zum KI-Tool machen",
};

export const HOME_DESCRIPTIONS: Record<string, string> = {
  en: "Write a JavaScript function, izan.io turns it into an MCP tool. Claude Code, Cursor, VS Code - any MCP client calls it and gets the result. 500+ community tools included.",
  tr: "JavaScript fonksiyonu yazin, izan.io MCP aracina cevirsin. Claude Code, Cursor, VS Code - herhangi bir MCP istemcisi cagirir, sonucu alir. 500+ topluluk araci dahil.",
  de: "JavaScript-Funktion schreiben, izan.io macht ein MCP-Tool daraus. Claude Code, Cursor, VS Code - jeder MCP-Client ruft es auf. 500+ Community-Tools inklusive.",
};

export function buildHomeJsonLd(lang: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "izan.io",
    url: SITE_URL,
    description: HOME_DESCRIPTIONS[lang] || HOME_DESCRIPTIONS.en,
    applicationCategory: "BrowserExtension",
    operatingSystem: "Chrome",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";
  const alternates = SUPPORTED_LANGUAGES.map((l) => ({
    tagName: "link" as const,
    rel: "alternate",
    hrefLang: l,
    href: l === "en" ? `${SITE_URL}/` : `${SITE_URL}/${l}`,
  }));

  return [
    { title: HOME_TITLES[lang] || HOME_TITLES.en },
    { name: "description", content: HOME_DESCRIPTIONS[lang] || HOME_DESCRIPTIONS.en },
    { property: "og:title", content: HOME_TITLES[lang] || HOME_TITLES.en },
    { property: "og:description", content: HOME_DESCRIPTIONS[lang] || HOME_DESCRIPTIONS.en },
    { property: "og:type", content: "website" },
    { property: "og:url", content: lang === "en" ? `${SITE_URL}/` : `${SITE_URL}/${lang}` },
    { name: "twitter:title", content: HOME_TITLES[lang] || HOME_TITLES.en },
    { name: "twitter:description", content: HOME_DESCRIPTIONS[lang] || HOME_DESCRIPTIONS.en },
    ...alternates,
    { tagName: "link" as const, rel: "alternate", hrefLang: "x-default", href: `${SITE_URL}/` },
    { "script:ld+json": buildHomeJsonLd(lang) },
  ];
}

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation("common");
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
    >
      {copied ? t("home.configCopied") : t("home.configCopy")}
    </button>
  );
}

function HomeContent() {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const currentLang = lang || "en";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to={`/${currentLang}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <IzanLogo className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold tracking-tight">izan.io</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to={`/${currentLang}/docs`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.docs")}
            </Link>
            <GitHubStarButton />
            <span className="text-xs text-muted-foreground/50">
              {SUPPORTED_LANGUAGES.map((l) => (
                <Link
                  key={l}
                  to={`/${l}`}
                  className={`px-1 transition-colors ${l === currentLang ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground"}`}
                >
                  {l}
                </Link>
              ))}
            </span>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4">

        {/* Hero */}
        <section className="py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {t("home.heroTitle")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t("home.heroSubtitle")}
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://chromewebstore.google.com"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              {t("home.installExtension")}
            </a>
            <a
              href="https://www.youtube.com/watch?v=jyZmNIUs-oE"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              {t("home.watchDemo")}
            </a>
          </div>
        </section>

        <hr className="border-border" />

        {/* Problem */}
        <section className="py-16 text-center">
          <h2 className="text-2xl font-semibold mb-3">{t("home.problemTitle")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("home.problemDesc")}
          </p>
        </section>

        <hr className="border-border" />

        {/* How it works */}
        <section className="py-16">
          <h2 className="text-2xl font-semibold text-center mb-12">{t("home.howItWorksTitle")}</h2>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <h3 className="font-semibold mb-1">{t("home.step1Title")}</h3>
                <p className="text-sm text-muted-foreground">{t("home.step1Desc")}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t("home.step2Title")}</h3>
                <p className="text-sm text-muted-foreground mb-3">{t("home.step2Desc")}</p>
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                    <span className="text-xs text-muted-foreground font-mono">{t("home.configTitle")}</span>
                    <CopyButton text={MCP_CONFIG} />
                  </div>
                  <pre className="p-4 text-sm font-mono overflow-x-auto bg-[#0a0a0a] text-[#e5e5e5] rounded-b-lg">{MCP_CONFIG}</pre>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <h3 className="font-semibold mb-1">{t("home.step3Title")}</h3>
                <p className="text-sm text-muted-foreground">{t("home.step3Desc")}</p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* Features */}
        <section className="py-16">
          <h2 className="text-2xl font-semibold text-center mb-10">{t("home.featuresTitle")}</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="border rounded-lg p-5">
                <h3 className="font-semibold mb-1.5">{t(`home.feature${n}Title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`home.feature${n}Desc`)}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-border" />

        {/* Marketplace CTA */}
        <section className="py-16 text-center">
          <h2 className="text-2xl font-semibold mb-3">{t("home.marketplaceTitle")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            {t("home.marketplaceDesc")}
          </p>
          <a
            href="https://zihin.io"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            {t("home.marketplaceCta")}
          </a>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-muted-foreground">
          {t("home.footer")}
        </div>
      </footer>
    </div>
  );
}

export function HomePage({ lang: _lang }: { lang: string }) {
  return <HomeContent />;
}

export default function Home() {
  return <HomeContent />;
}
