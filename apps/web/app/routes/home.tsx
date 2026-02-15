import { Link, useParams, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  MessageSquare,
  Bot,
  Shield,
  Settings,
  BarChart3,
  Sparkles,
  ChevronRight,
  Code2,
  Users,
  Puzzle,
  Eye,
  Database,
  Hourglass,
  Monitor,
  Store,
  ArrowRight,
  Star,
  Check,
  MousePointerClick,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Download,
} from "lucide-react";
import { BUILTIN_AGENT_DEFINITIONS } from "@izan/agents";
import { getAgentIcon } from "~/components/agents/AgentSelector";
import { PROVIDERS } from "~/lib/providers";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { GitHubStarButton } from "~/components/GitHubStarButton";
import { Button } from "~/components/ui/button";
import { IzanLogo } from "~/components/ui/izan-logo";
import type { Route } from "./+types/home";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";

  const titles: Record<string, string> = {
    en: "izan.io - Open Source AI Agent Platform | Browser Automation, MCP Tools, 17+ Providers",
    tr: "izan.io - Açık Kaynak AI Agent Platformu | Tarayıcı Otomasyonu, MCP Araçları, 17+ Sağlayıcı",
    de: "izan.io - Open Source KI-Agent-Plattform | Browser-Automatisierung, MCP-Tools, 17+ Anbieter",
  };

  const descriptions: Record<string, string> = {
    en: "Build and deploy AI agents with browser automation, Chrome extension macros, MCP protocol tools, and 17+ AI providers. Open source, privacy-first. Create custom agents, schedule tasks, extract web data.",
    tr: "Tarayıcı otomasyonu, Chrome uzantısı makroları, MCP protokol araçları ve 17+ AI sağlayıcı ile AI agentlar oluşturun. Açık kaynak, gizlilik öncelikli. Özel agentlar yaratın, görevleri planlayın, web verisi çekin.",
    de: "Erstellen Sie KI-Agenten mit Browser-Automatisierung, Chrome-Extension-Makros, MCP-Protokoll-Tools und 17+ KI-Anbietern. Open Source, Datenschutz zuerst. Agenten erstellen, Aufgaben planen, Web-Daten extrahieren.",
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
    keywords:
      "ai agent platform, browser automation, mcp client web, chrome extension ai, no-code automation, ai assistant open source, multi-agent orchestration, scheduled ai tasks, web data extraction, privacy-first ai",
    featureList: [
      "Multi-Agent Orchestration",
      "Chrome Extension Browser Automation",
      "17+ AI Providers",
      "MCP Protocol Client",
      "Visual No-Code Macro Builder",
      "Scheduled Automations & Cron Tasks",
      "Long-Running Background Tasks",
      "Privacy-First Open Source",
      "Custom Agent Builder",
      "AI-Powered Web Data Extraction",
    ],
    license: "https://www.gnu.org/licenses/agpl-3.0.html",
    isAccessibleForFree: true,
    sameAs: [
      "https://github.com/ekingunoncu/izan.io",
      "https://x.com/izan_io",
      "https://www.youtube.com/@izan_io",
    ],
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
    { name: "twitter:title", content: titles[lang] || titles.en },
    {
      name: "twitter:description",
      content: descriptions[lang] || descriptions.en,
    },
    { "script:ld+json": jsonLd },
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

const FEATURES = [
  { slug: "agents", titleKey: "home.featAgentsTitle", descKey: "home.featAgentsDesc", icon: Bot, color: "blue", wide: true },
  { slug: "browser", titleKey: "home.featBrowserTitle", descKey: "home.featBrowserDesc", icon: MousePointerClick, color: "violet", wide: false },
  { slug: "providers", titleKey: "home.featProvidersTitle", descKey: "home.featProvidersDesc", icon: Sparkles, color: "amber", wide: false },
  { slug: "mcp", titleKey: "home.featMcpTitle", descKey: "home.featMcpDesc", icon: Puzzle, color: "emerald", wide: false },
  { slug: "macros", titleKey: "home.featMacrosTitle", descKey: "home.featMacrosDesc", icon: Eye, color: "rose", wide: false },
  { slug: "scheduled", titleKey: "home.featScheduledTitle", descKey: "home.featScheduledDesc", icon: CalendarClock, color: "teal", wide: true },
  { slug: "background", titleKey: "home.featBackgroundTitle", descKey: "home.featBackgroundDesc", icon: Hourglass, color: "indigo", wide: false },
  { slug: "privacy", titleKey: "home.featPrivacyTitle", descKey: "home.featPrivacyDesc", icon: Shield, color: "emerald", wide: false },
  { slug: "builder", titleKey: "home.featBuilderTitle", descKey: "home.featBuilderDesc", icon: Settings, color: "amber", wide: false },
  { slug: "extraction", titleKey: "home.featExtractionTitle", descKey: "home.featExtractionDesc", icon: Database, color: "violet", wide: false },
];

const colorMap: Record<string, { border: string; bg: string; iconBg: string; shadow: string }> = {
  blue: {
    border: "border-blue-200/40 dark:border-blue-500/15 hover:border-blue-200/60 dark:hover:border-blue-500/25",
    bg: "bg-blue-50/30 dark:bg-blue-950/25",
    iconBg: "bg-blue-500 shadow-blue-500/15",
    shadow: "hover:shadow-blue-500/5",
  },
  violet: {
    border: "border-violet-200/40 dark:border-violet-500/15 hover:border-violet-200/60 dark:hover:border-violet-500/25",
    bg: "bg-violet-50/30 dark:bg-violet-950/25",
    iconBg: "bg-violet-500 shadow-violet-500/15",
    shadow: "hover:shadow-violet-500/5",
  },
  amber: {
    border: "border-amber-200/40 dark:border-amber-500/15 hover:border-amber-200/60 dark:hover:border-amber-500/25",
    bg: "bg-amber-50/30 dark:bg-amber-950/25",
    iconBg: "bg-amber-500 shadow-amber-500/15",
    shadow: "hover:shadow-amber-500/5",
  },
  emerald: {
    border: "border-emerald-200/40 dark:border-emerald-500/15 hover:border-emerald-200/60 dark:hover:border-emerald-500/25",
    bg: "bg-emerald-50/30 dark:bg-emerald-950/25",
    iconBg: "bg-emerald-500 shadow-emerald-500/15",
    shadow: "hover:shadow-emerald-500/5",
  },
  rose: {
    border: "border-rose-200/40 dark:border-rose-500/15 hover:border-rose-200/60 dark:hover:border-rose-500/25",
    bg: "bg-rose-50/30 dark:bg-rose-950/25",
    iconBg: "bg-rose-500 shadow-rose-500/15",
    shadow: "hover:shadow-rose-500/5",
  },
  teal: {
    border: "border-teal-200/40 dark:border-teal-500/15 hover:border-teal-200/60 dark:hover:border-teal-500/25",
    bg: "bg-teal-50/30 dark:bg-teal-950/25",
    iconBg: "bg-teal-500 shadow-teal-500/15",
    shadow: "hover:shadow-teal-500/5",
  },
  indigo: {
    border: "border-indigo-200/40 dark:border-indigo-500/15 hover:border-indigo-200/60 dark:hover:border-indigo-500/25",
    bg: "bg-indigo-50/30 dark:bg-indigo-950/25",
    iconBg: "bg-indigo-500 shadow-indigo-500/15",
    shadow: "hover:shadow-indigo-500/5",
  },
};

function FeatureDecoration({ slug }: { slug: string }) {
  switch (slug) {
    case "agents":
      return (
        <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
          <rect x="50" y="2" width="40" height="28" rx="8" className="fill-blue-500" />
          <rect x="2" y="68" width="36" height="28" rx="8" className="fill-emerald-500" />
          <rect x="102" y="68" width="36" height="28" rx="8" className="fill-violet-500" />
          <line x1="70" y1="30" x2="20" y2="68" className="stroke-blue-500" strokeWidth="2" strokeDasharray="4 4">
            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1s" repeatCount="indefinite" />
          </line>
          <line x1="70" y1="30" x2="120" y2="68" className="stroke-blue-500" strokeWidth="2" strokeDasharray="4 4">
            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1s" repeatCount="indefinite" />
          </line>
        </svg>
      );
    case "browser":
      return (
        <svg width="64" height="72" viewBox="0 0 64 72" fill="none">
          <rect x="8" y="4" width="48" height="36" rx="6" className="stroke-violet-500" strokeWidth="2" fill="none" />
          <circle cx="32" cy="22" r="4" className="fill-violet-500">
            <animate attributeName="cx" values="20;44;20" dur="3s" repeatCount="indefinite" />
            <animate attributeName="cy" values="14;28;14" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="32" cy="56" r="10" className="stroke-violet-500" strokeWidth="2" fill="none">
            <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="32" cy="56" r="3" className="fill-violet-500" />
        </svg>
      );
    case "providers":
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="16" cy="16" r="3" className="fill-amber-500" opacity="0.5" />
          <circle cx="32" cy="16" r="3" className="fill-amber-500" opacity="0.5" />
          <circle cx="48" cy="16" r="3" className="fill-amber-500" opacity="0.5" />
          <circle cx="16" cy="32" r="3" className="fill-amber-500" opacity="0.5" />
          <circle cx="32" cy="32" r="4" className="fill-amber-500">
            <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="48" cy="32" r="3" className="fill-amber-500" opacity="0.5" />
          <circle cx="16" cy="48" r="3" className="fill-amber-500" opacity="0.5" />
          <circle cx="32" cy="48" r="3" className="fill-amber-500" opacity="0.5" />
          <circle cx="48" cy="48" r="3" className="fill-amber-500" opacity="0.5" />
        </svg>
      );
    case "mcp":
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="18" y="18" width="28" height="28" rx="6" className="stroke-emerald-500" strokeWidth="2" fill="none" />
          <line x1="32" y1="8" x2="32" y2="18" className="stroke-emerald-500" strokeWidth="1.5" strokeDasharray="3 3">
            <animate attributeName="stroke-dashoffset" from="6" to="0" dur="1s" repeatCount="indefinite" />
          </line>
          <line x1="32" y1="46" x2="32" y2="56" className="stroke-emerald-500" strokeWidth="1.5" strokeDasharray="3 3">
            <animate attributeName="stroke-dashoffset" from="6" to="0" dur="1s" repeatCount="indefinite" />
          </line>
          <line x1="8" y1="32" x2="18" y2="32" className="stroke-emerald-500" strokeWidth="1.5" strokeDasharray="3 3">
            <animate attributeName="stroke-dashoffset" from="6" to="0" dur="1s" repeatCount="indefinite" />
          </line>
          <line x1="46" y1="32" x2="56" y2="32" className="stroke-emerald-500" strokeWidth="1.5" strokeDasharray="3 3">
            <animate attributeName="stroke-dashoffset" from="6" to="0" dur="1s" repeatCount="indefinite" />
          </line>
        </svg>
      );
    case "macros":
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="20" className="stroke-rose-500" strokeWidth="2" fill="none" />
          <circle cx="32" cy="32" r="8" className="fill-rose-500" opacity="0.6">
            <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="32" cy="32" r="3" className="fill-rose-500" />
        </svg>
      );
    case "scheduled":
      return (
        <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
          <circle cx="40" cy="40" r="24" className="stroke-teal-500" strokeWidth="2" fill="none" />
          <line x1="40" y1="40" x2="40" y2="24" className="stroke-teal-500" strokeWidth="2" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 40 40" to="360 40 40" dur="10s" repeatCount="indefinite" />
          </line>
          <line x1="40" y1="40" x2="52" y2="40" className="stroke-teal-500" strokeWidth="1.5" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 40 40" to="360 40 40" dur="60s" repeatCount="indefinite" />
          </line>
          <circle cx="40" cy="40" r="2" className="fill-teal-500" />
          <rect x="76" y="20" width="32" height="6" rx="3" className="fill-teal-500" opacity="0.4" />
          <rect x="76" y="34" width="24" height="6" rx="3" className="fill-teal-500" opacity="0.3" />
          <rect x="76" y="48" width="28" height="6" rx="3" className="fill-teal-500" opacity="0.2" />
        </svg>
      );
    case "background":
      return (
        <svg width="48" height="72" viewBox="0 0 48 72" fill="none">
          <path d="M8 4h32v24L28 36H20L8 28V4Z" className="stroke-indigo-500" strokeWidth="2" fill="none" />
          <path d="M8 68h32V44L28 36H20L8 44V68Z" className="stroke-indigo-500" strokeWidth="2" fill="none" />
          <circle cx="24" cy="36" r="2" className="fill-indigo-500">
            <animate attributeName="cy" values="20;52;20" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="3s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    case "privacy":
      return (
        <svg width="64" height="72" viewBox="0 0 64 72" fill="none">
          <rect x="8" y="30" width="48" height="36" rx="6" className="stroke-emerald-500" strokeWidth="2.5" fill="none" />
          <path d="M18 30V22C18 14.268 24.268 8 32 8C39.732 8 46 14.268 46 22V30" className="stroke-emerald-500" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="32" cy="48" r="5" className="fill-emerald-500">
            <animate attributeName="r" values="5;6;5" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    case "builder":
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="20" className="stroke-amber-500" strokeWidth="1.5" fill="none" strokeDasharray="4 4">
            <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="20s" repeatCount="indefinite" />
          </circle>
          <circle cx="32" cy="32" r="10" className="stroke-amber-500" strokeWidth="2" fill="none" />
          <circle cx="32" cy="32" r="4" className="fill-amber-500" />
        </svg>
      );
    case "extraction":
      return (
        <svg width="64" height="72" viewBox="0 0 64 72" fill="none">
          <rect x="4" y="4" width="56" height="40" rx="4" className="stroke-violet-500" strokeWidth="2" fill="none" />
          <line x1="4" y1="14" x2="60" y2="14" className="stroke-violet-500" strokeWidth="1" />
          <rect x="12" y="22" width="24" height="4" rx="2" className="fill-violet-500" opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" begin="0s" repeatCount="indefinite" />
          </rect>
          <rect x="12" y="30" width="32" height="4" rx="2" className="fill-violet-500" opacity="0.3">
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" begin="0.3s" repeatCount="indefinite" />
          </rect>
          <rect x="12" y="38" width="20" height="4" rx="2" className="fill-violet-500" opacity="0.2">
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" begin="0.6s" repeatCount="indefinite" />
          </rect>
          <rect x="16" y="52" width="32" height="6" rx="3" className="fill-violet-500" opacity="0.5" />
          <rect x="16" y="62" width="24" height="6" rx="3" className="fill-violet-500" opacity="0.3" />
        </svg>
      );
    default:
      return null;
  }
}

const ROADMAP_ITEMS = [
  {
    titleKey: "home.roadmapItem2Title",
    descKey: "home.roadmapItem2Desc",
    icon: Hourglass,
    shipped: true,
  },
  {
    titleKey: "home.roadmapItem3Title",
    descKey: "home.roadmapItem3Desc",
    icon: CalendarClock,
    shipped: true,
  },
  {
    titleKey: "home.roadmapItem1Title",
    descKey: "home.roadmapItem1Desc",
    icon: Store,
    shipped: false,
  },
  {
    titleKey: "home.roadmapItem4Title",
    descKey: "home.roadmapItem4Desc",
    icon: Database,
    shipped: false,
  },
  {
    titleKey: "home.roadmapItem5Title",
    descKey: "home.roadmapItem5Desc",
    icon: Monitor,
    shipped: false,
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
            <IzanLogo className="h-8 w-8 sm:h-9 sm:w-9 text-primary" />
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
            <Link to={`/${lang}/plans`} state={{ from: location.pathname }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 rounded-lg"
              >
                <CalendarClock className="h-5 w-5" />
              </Button>
            </Link>
            <Link to={`/${lang}/analytics`} state={{ from: location.pathname }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 rounded-lg"
              >
                <BarChart3 className="h-5 w-5" />
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
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
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

        {/* ========== FEATURES - SEO Grid ========== */}
        <section className="py-10 sm:py-14 md:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-14">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                {t("home.featSectionTitle")}
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("home.featSectionDesc")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {FEATURES.map((feat) => {
                const Icon = feat.icon;
                const c = colorMap[feat.color];
                return (
                  <div
                    key={feat.slug}
                    className={`group relative rounded-2xl border ${c.border} ${c.bg} p-7 sm:p-8 transition-all duration-300 hover:shadow-md ${c.shadow} overflow-hidden ${
                      feat.wide ? "md:col-span-2" : ""
                    }`}
                  >
                    {/* SVG decoration */}
                    <div className="absolute top-5 right-5 sm:top-6 sm:right-6 opacity-[0.10] dark:opacity-[0.13] group-hover:opacity-[0.20] transition-opacity duration-500" aria-hidden>
                      <FeatureDecoration slug={feat.slug} />
                    </div>
                    <div className="relative">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.iconBg} text-white shadow-md mb-5`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold mb-2">
                        {t(feat.titleKey)}
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        {t(feat.descKey)}
                      </p>
                    </div>
                  </div>
                );
              })}
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

        {/* ========== HOW IT WORKS ========== */}
        <section className="py-12 sm:py-16 md:py-20 bg-muted/30 dark:bg-muted/10 section-muted-fade-from-dark">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                {t("home.howItWorks")}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-5 md:gap-6 max-w-6xl mx-auto">
              {([
                { step: 1, icon: Sparkles, color: "blue" as const },
                { step: 2, icon: Download, color: "amber" as const },
                { step: 3, icon: Bot, color: "violet" as const },
                { step: 4, icon: CheckCircle2, color: "emerald" as const },
              ]).map(({ step, icon: StepIcon, color }, idx) => {
                const accents = {
                  blue: {
                    border: "border-blue-500/20 hover:border-blue-500/40",
                    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                    icon: "bg-blue-500 shadow-blue-500/20",
                    glow: "bg-blue-500/10",
                  },
                  amber: {
                    border: "border-amber-500/20 hover:border-amber-500/40",
                    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    icon: "bg-amber-500 shadow-amber-500/20",
                    glow: "bg-amber-500/10",
                  },
                  violet: {
                    border: "border-violet-500/20 hover:border-violet-500/40",
                    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
                    icon: "bg-violet-500 shadow-violet-500/20",
                    glow: "bg-violet-500/10",
                  },
                  emerald: {
                    border: "border-emerald-500/20 hover:border-emerald-500/40",
                    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    icon: "bg-emerald-500 shadow-emerald-500/20",
                    glow: "bg-emerald-500/10",
                  },
                };
                const a = accents[color];
                return (
                  <div key={step} className="relative">
                    {/* Arrow connector (desktop) */}
                    {idx < 3 && (
                      <div className="hidden lg:block absolute top-12 -right-4 z-10">
                        <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className={`group relative rounded-2xl border ${a.border} bg-background/60 dark:bg-background/40 p-6 sm:p-7 transition-all duration-300 hover:shadow-lg overflow-hidden h-full`}>
                      {/* Subtle glow */}
                      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${a.glow} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} aria-hidden />
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-5">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.icon} text-white shadow-lg`}>
                            <StepIcon className="h-5 w-5" />
                          </div>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${a.badge}`}>
                            {step}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">
                          {t(`home.step${step}Title`)}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {t(`home.step${step}Desc`)}
                        </p>
                      </div>
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
              <div className="absolute left-5 sm:left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400/40 via-primary/20 to-transparent" aria-hidden />

              <div className="space-y-6 sm:space-y-8">
                {ROADMAP_ITEMS.map((item, index) => {
                  const Icon = item.icon;
                  const dotColors = [
                    "bg-emerald-500 shadow-emerald-500/30",
                    "bg-emerald-500 shadow-emerald-500/30",
                    "bg-violet-500 shadow-violet-500/30",
                    "bg-blue-500 shadow-blue-500/30",
                    "bg-amber-500 shadow-amber-500/30",
                  ];
                  return (
                    <div
                      key={item.titleKey}
                      className="relative flex items-start gap-6 sm:gap-8 group"
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full ${dotColors[index]} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                          {item.shipped ? (
                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                          ) : (
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                          )}
                        </div>
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-2 pt-1">
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                          <h3 className="font-bold text-base sm:text-lg group-hover:text-primary transition-colors">
                            {t(item.titleKey)}
                          </h3>
                          {item.shipped ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-semibold">
                              <Check className="h-3 w-3" />
                              {t("home.roadmapShipped")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-primary/5 text-muted-foreground px-2.5 py-0.5 text-xs font-medium">
                              {t("home.roadmapPlanned")}
                            </span>
                          )}
                        </div>
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
                  {provider.isLocal ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs bg-violet-400/90 text-violet-950 dark:bg-violet-900/40 dark:text-violet-300 px-2 py-0.5 rounded-md shrink-0 cursor-help">
                          {t("provider.local")}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {t(`provider.localHint.${provider.id}`)}
                      </TooltipContent>
                    </Tooltip>
                  ) : provider.hasFreeTier ? (
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
                  ) : null}
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
                <IzanLogo className="h-8 w-8 text-primary" />
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
                <Link to={`/${lang}/plans`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("nav.plans")}
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
