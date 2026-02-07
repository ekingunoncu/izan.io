import { Link, useParams, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  MessageSquare,
  Bot,
  Shield,
  Zap,
  Settings,
  Sparkles,
  ChevronRight,
  Code2,
} from "lucide-react";
import { PROVIDERS } from "~/lib/providers";
import { GitHubStarButton } from "~/components/GitHubStarButton";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { Route } from "./+types/home";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";

  const titles: Record<string, string> = {
    tr: "izan.io - Yerel AI Asistan",
    en: "izan.io - Local AI Assistant",
    de: "izan.io - Lokaler KI-Assistent",
  };

  const descriptions: Record<string, string> = {
    tr: "AI asistanınız. OpenAI, Anthropic, Google ve daha fazlası ile güçlendirilmiş.",
    en: "Your AI assistant. Powered by OpenAI, Anthropic, Google and more.",
    de: "Ihr KI-Assistent. Angetrieben von OpenAI, Anthropic, Google und mehr.",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "izan.io",
    url: `https://izan.io/${lang}`,
    description: descriptions[lang] || descriptions.tr,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    browserRequirements: "Modern web browser",
  };

  return [
    { title: titles[lang] || titles.tr },
    { name: "description", content: descriptions[lang] || descriptions.tr },
    { property: "og:title", content: titles[lang] || titles.tr },
    {
      property: "og:description",
      content: descriptions[lang] || descriptions.tr,
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `https://izan.io/${lang}` },
    {
      "script:ld+json": jsonLd,
    },
  ];
}

export default function Home() {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const location = useLocation();

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
        className="fixed inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-muted/20"
        aria-hidden
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <Link
            to={`/${lang}`}
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-lg sm:text-xl font-semibold tracking-tight truncate">
              izan.io
            </span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 flex-shrink-0">
            <div className="hidden sm:block">
              <GitHubStarButton />
            </div>
            <Link to={`/${lang}/settings`} state={{ from: location.pathname }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 rounded-lg"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <Link to={`/${lang}/agents`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 min-h-[44px] text-sm sm:text-base sm:h-9 sm:min-h-0 px-3 sm:px-4 rounded-lg"
              >
                {t("nav.agents")}
              </Button>
            </Link>
            <Link to="/chat">
              <Button
                size="sm"
                className="h-11 min-h-[44px] text-sm sm:text-base sm:h-9 sm:min-h-0 px-3 sm:px-4 rounded-lg shadow-sm"
              >
                {t("nav.startChat")}
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 sm:px-6">
        <section className="py-16 sm:py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-slate-200/90 dark:bg-muted/50 px-3.5 py-1 text-xs font-medium tracking-wide text-slate-700 dark:text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              {t("home.heroBadge")}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 sm:mb-8 leading-[1.1]">
              {t("home.heroTitle")}
              <span className="block mt-2 bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                {t("home.heroSubtitle")}
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 leading-relaxed max-w-2xl mx-auto">
              {t("home.heroDescription")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
              <Link to="/chat" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="gap-2 w-full sm:w-auto h-12 px-6 rounded-lg text-base font-medium shadow-lg"
                >
                  <MessageSquare className="h-5 w-5" />
                  {t("home.startChat")}
                </Button>
              </Link>
              <Link to={`/${lang}/agents`} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 w-full sm:w-auto h-12 px-6 rounded-lg text-base font-medium"
                >
                  <Bot className="h-5 w-5" />
                  {t("home.discoverAgents")}
                </Button>
              </Link>
              <div className="w-full sm:w-auto flex justify-center">
                <GitHubStarButton />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 sm:py-16 md:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="group border-2 transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/80 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Shield className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-semibold">
                  {t("home.featurePrivacyTitle")}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {t("home.featurePrivacyDesc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/80 text-amber-900 dark:bg-amber-500/10 dark:text-amber-400">
                  <Zap className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-semibold">
                  {t("home.featureWebGPUTitle")}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {t("home.featureWebGPUDesc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 sm:col-span-2 lg:col-span-1">
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400">
                  <Bot className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-semibold">
                  {t("home.featureAgentsTitle")}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {t("home.featureAgentsDesc")}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Providers */}
        <section className="py-12 sm:py-16 md:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            {t("home.providersTitle")}
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10 sm:mb-12">
            {t("home.providersDesc")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {PROVIDERS.map((provider) => (
              <a
                key={provider.id}
                href={provider.apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 rounded-xl border-2 bg-card/60 px-4 py-3 transition-all hover:border-primary/30 hover:bg-card hover:shadow-md"
              >
                <span className="font-medium text-sm truncate flex-1">
                  {provider.name}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              to={`/${lang}/settings`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t("home.providersCta")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 sm:py-16 md:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12 sm:mb-16">
            {t("home.howItWorks")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-md mb-5">
                  {step}
                </div>
                <h3 className="font-semibold text-base mb-2">
                  {t(`home.step${step}Title`)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`home.step${step}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy Promise / Open Source */}
        <section className="py-12 sm:py-16 md:py-20">
          <Link
            to={`/${lang}/privacy`}
            className="block group rounded-2xl border-2 bg-card/50 p-8 sm:p-10 md:p-14 text-center backdrop-blur-sm transition-all hover:border-emerald-500/30 hover:bg-card/70 hover:shadow-lg"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/80 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400 mx-auto mb-6">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4">
              {t("home.privacyTitle")}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
              {t("home.privacyDesc")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
                <Code2 className="h-3.5 w-3.5" />
                {t("home.openSourceBadge")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Shield className="h-3.5 w-3.5" />
                {t("home.noApiKeyStorage")}
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-primary group-hover:underline">
              {t("home.privacyLink")} →
            </p>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-4">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground order-2 sm:order-1">
              {t("home.footer")}
            </p>
            <div className="flex items-center gap-4 order-1 sm:order-2 flex-wrap justify-center">
              <a
                href="https://github.com/ekingunoncu/izan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                GitHub
              </a>
              <Link
                to={`/${lang}/agents`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("nav.agents")}
              </Link>
              <Link
                to={`/${lang}/settings`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("nav.settings")}
              </Link>
              <Link
                to={`/${lang}/privacy`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("legal:nav.privacy")}
              </Link>
              <Link
                to={`/${lang}/terms`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("legal:nav.terms")}
              </Link>
              <Link
                to="/chat"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("nav.startChat")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
