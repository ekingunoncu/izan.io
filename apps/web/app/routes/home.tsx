import { Link, useParams, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  MessageSquare,
  Bot,
  Shield,
  Settings,
  Sparkles,
  ChevronRight,
  Code2,
  Users,
  Link2,
  Puzzle,
  Eye,
  Brain,
  Monitor,
  Image,
  Store,
  ArrowRight,
  Star,
  Check,
  MousePointerClick,
  BookOpen,
} from "lucide-react";
import { BUILTIN_AGENT_DEFINITIONS } from "@izan/agents";
import { getAgentIcon } from "~/components/agents/AgentSelector";
import { PROVIDERS } from "~/lib/providers";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { GitHubStarButton } from "~/components/GitHubStarButton";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/home";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";

  const titles: Record<string, string> = {
    tr: "izan.io - Akıllı AI Agent Platformu",
    en: "izan.io - Smart AI Agent Platform",
    de: "izan.io - Intelligente KI-Agent-Plattform",
  };

  const descriptions: Record<string, string> = {
    tr: "İşini bilen akıllı AI agentlar. Tarayıcı otomasyonu, domain arama ve daha fazlası. Açık kaynak, gizlilik öncelikli.",
    en: "Smart AI agents that actually get things done. Browser automation, domain search, and more. Open source, privacy first.",
    de: "Intelligente KI-Agenten, die wirklich Ergebnisse liefern. Browser-Automatisierung, Domain-Suche und mehr. Open Source, Datenschutz zuerst.",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "izan.io",
    url: `https://izan.io/${lang}`,
    description: descriptions[lang] || descriptions.en,
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
    { title: titles[lang] || titles.en },
    { name: "description", content: descriptions[lang] || descriptions.en },
    { property: "og:title", content: titles[lang] || titles.en },
    {
      property: "og:description",
      content: descriptions[lang] || descriptions.en,
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `https://izan.io/${lang}` },
    {
      "script:ld+json": jsonLd,
    },
  ];
}

const HOME_SHOWCASE_AGENTS = BUILTIN_AGENT_DEFINITIONS.filter(
  (def) => def.homeShowcase
).map((def) => ({
  titleKey: def.homeShowcase!.titleKey,
  descKey: def.homeShowcase!.descKey,
  icon: getAgentIcon(def.homeShowcase!.icon),
  active: true,
  agentId: def.id,
  color: def.homeShowcase!.color,
}));

const AGENTS = [
  ...HOME_SHOWCASE_AGENTS,
  {
    titleKey: "home.agentMoreTitle",
    descKey: "home.agentMoreDesc",
    icon: Sparkles,
    active: false,
    agentId: null,
    color:
      "bg-amber-400/80 text-amber-900 dark:bg-amber-500/10 dark:text-amber-400",
  },
];

const FLEX_ITEMS = [
  {
    titleKey: "home.flexMcpTitle",
    descKey: "home.flexMcpDesc",
    icon: Puzzle,
  },
  {
    titleKey: "home.flexCreateTitle",
    descKey: "home.flexCreateDesc",
    icon: Bot,
  },
  {
    titleKey: "home.flexChainTitle",
    descKey: "home.flexChainDesc",
    icon: Link2,
  },
  {
    titleKey: "home.flexMacrosTitle",
    descKey: "home.flexMacrosDesc",
    icon: MousePointerClick,
  },
  {
    titleKey: "home.flexTestTitle",
    descKey: "home.flexTestDesc",
    icon: Eye,
  },
];

const ROADMAP_ITEMS = [
  {
    titleKey: "home.roadmapItem1Title",
    descKey: "home.roadmapItem1Desc",
    icon: Store,
  },
  {
    titleKey: "home.roadmapItem2Title",
    descKey: "home.roadmapItem2Desc",
    icon: Monitor,
  },
  {
    titleKey: "home.roadmapItem3Title",
    descKey: "home.roadmapItem3Desc",
    icon: Image,
  },
  {
    titleKey: "home.roadmapItem4Title",
    descKey: "home.roadmapItem4Desc",
    icon: Brain,
  },
];

export default function Home() {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
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
            <Link to={`/${lang}/docs`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 min-h-[44px] text-sm sm:text-base sm:h-9 sm:min-h-0 px-3 sm:px-4 rounded-lg gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">{t("nav.docs")}</span>
              </Button>
            </Link>
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

      <main>
        {/* ========== HERO ========== */}
        <section className="relative py-14 sm:py-18 md:py-24 overflow-hidden section-hero">
          {/* Animated gradient blobs */}
          <div className="absolute inset-0 -z-10" aria-hidden>
            <div className="hero-blob animate-float absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-500/30 dark:bg-blue-500/20" />
            <div className="hero-blob animate-float-delayed absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-violet-500/25 dark:bg-violet-500/15" />
            <div className="hero-blob animate-float absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-emerald-400/15 dark:bg-emerald-400/10" />
          </div>
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />

          <div className="container mx-auto px-4 sm:px-6 text-center max-w-4xl animate-slide-up relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8">
              <Sparkles className="h-4 w-4" />
              {t("home.heroBadge")}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 sm:mb-8 leading-[1.15]">
              {t("home.heroTitle")}
              <span className="block mt-3 gradient-text">
                {t("home.heroSubtitle")}
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 sm:mb-12 leading-relaxed max-w-2xl mx-auto">
              {t("home.heroDescription")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center">
              <Link to={`/${lang}/agents`} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="gap-2.5 w-full sm:w-auto h-14 px-8 rounded-xl text-base font-semibold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]"
                >
                  <Bot className="h-5 w-5" />
                  {t("home.discoverAgents")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/chat" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2.5 w-full sm:w-auto h-14 px-8 rounded-xl text-base font-semibold border-2 hover:bg-primary/5 transition-all duration-300"
                >
                  <MessageSquare className="h-5 w-5" />
                  {t("home.startChat")}
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                {t("home.openSourceBadge")}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                {t("home.noApiKeyStorage")}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                {t("home.communityBadge")}
              </span>
            </div>
          </div>
        </section>

        {/* ========== DEMO VIDEO ========== */}
        <section className="py-10 sm:py-14 md:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                {t("home.demoTitle")}
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("home.demoDesc")}
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/5 bg-black aspect-video">
                <iframe
                  src="https://www.youtube.com/embed/5CHOTIYhP1w?rel=0&modestbranding=1"
                  title={t("home.demoTitle")}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ========== FEATURES - Bento Grid ========== */}
        <section className="py-10 sm:py-14 md:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {/* Feature 1 - Larger */}
              <div className="md:col-span-2 group relative rounded-2xl border border-blue-200/40 dark:border-blue-500/15 bg-blue-50/30 dark:bg-blue-950/25 p-8 sm:p-10 transition-all duration-300 hover:shadow-md hover:shadow-blue-500/5 hover:border-blue-200/60 dark:hover:border-blue-500/25 overflow-hidden">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-md shadow-blue-500/15 mb-6">
                    <Bot className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-3">
                    {t("home.featureAgentsTitle")}
                  </h3>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
                    {t("home.featureAgentsDesc")}
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group relative rounded-2xl border border-emerald-200/40 dark:border-emerald-500/15 bg-emerald-50/30 dark:bg-emerald-950/25 p-8 sm:p-10 transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/5 hover:border-emerald-200/60 dark:hover:border-emerald-500/25 overflow-hidden">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/15 mb-6">
                    <Shield className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {t("home.featurePrivacyTitle")}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t("home.featurePrivacyDesc")}
                  </p>
                </div>
              </div>

              {/* Feature 3 - Macros */}
              <div className="group relative rounded-2xl border border-violet-200/40 dark:border-violet-500/15 bg-violet-50/30 dark:bg-violet-950/25 p-8 sm:p-10 transition-all duration-300 hover:shadow-md hover:shadow-violet-500/5 hover:border-violet-200/60 dark:hover:border-violet-500/25 overflow-hidden">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-md shadow-violet-500/15 mb-6">
                    <MousePointerClick className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {t("home.featureMacrosTitle")}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t("home.featureMacrosDesc")}
                  </p>
                  <Link
                    to={`/${lang}/docs/chrome-extension`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline mt-3"
                  >
                    {t("home.featureMacrosExtLink")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Feature 4 - For Everyone */}
              <div className="md:col-span-2 group relative rounded-2xl border border-amber-200/40 dark:border-amber-500/15 bg-amber-50/30 dark:bg-amber-950/25 p-8 sm:p-10 transition-all duration-300 hover:shadow-md hover:shadow-amber-500/5 hover:border-amber-200/60 dark:hover:border-amber-500/25 overflow-hidden">
                <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/15">
                    <Users className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-3">
                      {t("home.featureForEveryoneTitle")}
                    </h3>
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                      {t("home.featureForEveryoneDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== AGENT SHOWCASE - Dark section ========== */}
        <section className="relative py-12 sm:py-16 md:py-20 section-dark text-white overflow-hidden">
          {/* Decorative glowing orbs */}
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-violet-600/20 blur-[100px]" aria-hidden />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-blue-600/20 blur-[80px]" aria-hidden />

          <div className="container mx-auto px-4 sm:px-6 relative">
            <div className="text-center mb-10 sm:mb-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 mb-4">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                {t("home.agentShowcaseTitle")}
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                {t("home.agentShowcaseTitle")}
              </h2>
              <p className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto">
                {t("home.agentShowcaseDesc")}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
              {AGENTS.map((agent) => {
                const Icon = agent.icon;
                const content = (
                  <div
                    className={`group relative flex flex-col rounded-2xl border transition-all duration-300 p-5 sm:p-6 h-full min-h-[200px] ${
                      agent.active
                        ? "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-white/5 cursor-pointer hover:-translate-y-1"
                        : "border-white/5 bg-white/[0.02] opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${agent.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
                          agent.active
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/5 text-white/40 border border-white/10"
                        }`}
                      >
                        {agent.active
                          ? t("home.agentActive")
                          : t("home.agentComingSoon")}
                      </span>
                    </div>
                    <h3 className="text-base font-bold mb-1.5 text-white shrink-0">
                      {t(agent.titleKey)}
                    </h3>
                    <p className="text-sm leading-relaxed text-white/50 flex-1 min-h-0">
                      {t(agent.descKey)}
                    </p>
                    <div className="mt-4 shrink-0 h-5 flex items-center">
                      {agent.active ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-white/70 group-hover:text-white transition-colors">
                          {t("home.agentActive")}
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                );

                if (agent.active && agent.agentId) {
                  return (
                    <Link
                      key={agent.titleKey}
                      to={`/${lang}/agents/${agent.agentId}`}
                      className="block h-full"
                    >
                      {content}
                    </Link>
                  );
                }
                return (
                  <div key={agent.titleKey} className="h-full">
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========== HOW IT WORKS - Numbered Steps ========== */}
        <section className="py-12 sm:py-16 md:py-20 bg-muted/30 dark:bg-muted/10 section-muted-fade-from-dark">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-14 sm:mb-20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                {t("home.howItWorks")}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 md:gap-6 max-w-4xl mx-auto">
              {[1, 2, 3].map((step, idx) => (
                <div
                  key={step}
                  className={`relative flex flex-col items-center text-center ${idx < 2 ? "step-connector" : ""}`}
                >
                  {/* Large step number */}
                  <div className="relative mb-6">
                    <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground font-bold text-2xl sm:text-3xl shadow-xl shadow-primary/20">
                      {step}
                    </div>
                    <div className="absolute inset-0 rounded-3xl bg-primary/20 animate-pulse-glow -z-10 scale-110" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">
                    {t(`home.step${step}Title`)}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xs">
                    {t(`home.step${step}Desc`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== FLEXIBILITY - Gradient Border Cards ========== */}
        <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden section-light-fade">
          {/* Background decoration */}
          <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-400/10 dark:bg-violet-400/5 blur-[100px]" aria-hidden />
          <div className="absolute -right-40 top-1/3 w-64 h-64 rounded-full bg-blue-400/10 dark:bg-blue-400/5 blur-[80px]" aria-hidden />

          <div className="container mx-auto px-4 sm:px-6 relative">
            <div className="text-center mb-14 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                {t("home.flexTitle")}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("home.flexDesc")}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
              {FLEX_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                const gradients = [
                  "from-violet-500/20 via-transparent to-blue-500/20 hover:from-violet-500/30 hover:to-blue-500/30",
                  "from-blue-500/20 via-transparent to-emerald-500/20 hover:from-blue-500/30 hover:to-emerald-500/30",
                  "from-emerald-500/20 via-transparent to-amber-500/20 hover:from-emerald-500/30 hover:to-amber-500/30",
                  "from-amber-500/20 via-transparent to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30",
                  "from-rose-500/20 via-transparent to-violet-500/20 hover:from-rose-500/30 hover:to-violet-500/30",
                ];
                const iconColors = [
                  "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/15",
                  "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/15",
                  "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15",
                  "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15",
                  "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/15",
                ];
                return (
                  <div
                    key={item.titleKey}
                    className={`group relative rounded-2xl p-[1px] bg-gradient-to-br ${gradients[idx]} transition-all duration-300`}
                  >
                    <div className="rounded-2xl bg-background p-7 sm:p-8 h-full">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconColors[idx]} mb-5`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">
                        {t(item.titleKey)}
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        {t(item.descKey)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========== ROADMAP - Timeline ========== */}
        <section className="py-12 sm:py-16 md:py-20 bg-muted/30 dark:bg-muted/10 section-muted-fade">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-14 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                {t("home.roadmapTitle")}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("home.roadmapDesc")}
              </p>
            </div>
            <div className="max-w-2xl mx-auto relative">
              {/* Vertical timeline line */}
              <div className="absolute left-5 sm:left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" aria-hidden />

              <div className="space-y-6 sm:space-y-8">
                {ROADMAP_ITEMS.map((item, index) => {
                  const Icon = item.icon;
                  const dotColors = [
                    "bg-violet-500 shadow-violet-500/30",
                    "bg-blue-500 shadow-blue-500/30",
                    "bg-emerald-500 shadow-emerald-500/30",
                    "bg-amber-500 shadow-amber-500/30",
                    "bg-rose-500 shadow-rose-500/30",
                  ];
                  return (
                    <div
                      key={item.titleKey}
                      className="relative flex items-start gap-6 sm:gap-8 group"
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full ${dotColors[index]} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-2 pt-1">
                        <h3 className="font-bold text-base sm:text-lg mb-1.5 group-hover:text-primary transition-colors">
                          {t(item.titleKey)}
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {t(item.descKey)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ========== PRIVACY CTA - Gradient card ========== */}
        <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6">
            <Link
              to={`/${lang}/privacy`}
              className="block group relative rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10"
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 dark:from-emerald-600 dark:via-emerald-700 dark:to-teal-800" />
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "40px 40px",
              }} />
              {/* Decorative shapes */}
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform duration-700" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />

              <div className="relative p-10 sm:p-14 md:p-20 text-center text-white">
                <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm mx-auto mb-8 shadow-lg">
                  <Shield className="h-9 w-9" />
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-5">
                  {t("home.privacyTitle")}
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed mb-8">
                  {t("home.privacyDesc")}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-6">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
                    <Code2 className="h-4 w-4" />
                    {t("home.openSourceBadge")}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
                    <Shield className="h-4 w-4" />
                    {t("home.noApiKeyStorage")}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
                    <Users className="h-4 w-4" />
                    {t("home.communityBadge")}
                  </span>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white group-hover:gap-3 transition-all">
                  {t("home.privacyLink")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* ========== PROVIDERS - Clean grid ========== */}
        <section className="py-12 sm:py-16 md:py-20 bg-muted/30 dark:bg-muted/10 section-muted-fade">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-14 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                {t("home.providersTitle")}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("home.providersDesc")}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 max-w-5xl mx-auto">
              {PROVIDERS.map((provider) => (
                <a
                  key={provider.id}
                  href={provider.apiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 rounded-xl border bg-background/80 dark:bg-background/50 px-4 py-3.5 transition-all duration-200 hover:border-primary/30 hover:bg-background hover:shadow-lg hover:-translate-y-0.5"
                >
                  <span className="font-medium text-sm truncate flex-1">
                    {provider.name}
                  </span>
                  {provider.hasFreeTier && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs bg-emerald-400/90 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-md shrink-0 cursor-help">
                          {t("provider.freeTier")}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {t(`provider.freeTierHint.${provider.id}`)}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </a>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link to={`/${lang}/settings`}>
                <Button variant="outline" className="gap-2 rounded-xl h-12 px-6 text-base font-medium border-2 hover:bg-primary/5">
                  {t("home.providersCta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="border-t bg-muted/20 dark:bg-muted/5">
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="sm:col-span-2 md:col-span-1">
              <Link
                to={`/${lang}`}
                className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <span className="text-lg font-semibold tracking-tight">
                  izan.io
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {t("home.footer")}
              </p>
            </div>
            {/* Links */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-foreground/80">Product</h4>
              <div className="flex flex-col gap-2.5">
                <Link to={`/${lang}/agents`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("nav.agents")}
                </Link>
                <Link to={`/${lang}/docs`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("nav.docs")}
                </Link>
                <Link to="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("nav.startChat")}
                </Link>
                <Link to={`/${lang}/settings`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("nav.settings")}
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-foreground/80">Legal</h4>
              <div className="flex flex-col gap-2.5">
                <Link to={`/${lang}/privacy`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("legal:nav.privacy")}
                </Link>
                <Link to={`/${lang}/terms`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("legal:nav.terms")}
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-foreground/80">Community</h4>
              <div className="flex flex-col gap-2.5">
                <a
                  href="https://github.com/ekingunoncu/izan.io"
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
                <a
                  href="https://www.youtube.com/@izan_io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  YouTube
                </a>
              </div>
            </div>
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} izan.io
            </p>
            <div className="hidden sm:block">
              <GitHubStarButton />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
