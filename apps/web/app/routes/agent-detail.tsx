import { useEffect } from "react";
import { Link, useParams, useNavigate, useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bot,
  Search,
  Code,
  Globe,
  MessageSquare,
  Settings,
  Zap,
  Wrench,
  CheckCircle2,
  Lightbulb,
  BookOpen,
  Sparkles,
  TrendingUp,
  Key,
  ExternalLink,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useAgentStore, useMCPStore } from "~/store";
import { initializeDatabase, DEFAULT_AGENTS } from "~/lib/db";
import {
  getAgentDisplayName,
  getAgentDisplayDescription,
  getAgentDetailedDescription,
  getAgentWhatItDoes,
  getAgentMcps,
  getAgentFeatures,
  getAgentHowToUse,
  getAgentProTip,
  getAgentUsageExamples,
  getAgentSerpApiSection,
} from "~/lib/agent-display";
import { MissingApiKeyBanner } from "~/components/agents/MissingApiKeyBanner";
import { BUILTIN_AGENT_DEFINITIONS } from "@izan/agents";
import { DEFAULT_MCP_SERVERS } from "~/lib/mcp/config";
import type { Route } from "./+types/agent-detail";

const AGENT_ICONS: Record<string, typeof Bot> = {
  bot: Bot,
  search: Search,
  code: Code,
  globe: Globe,
  "message-square": MessageSquare,
  zap: Zap,
  "trending-up": TrendingUp,
};

const AGENT_COLORS: Record<string, string> = Object.fromEntries(
  BUILTIN_AGENT_DEFINITIONS.map((def) => [
    def.id,
    def.homeShowcase?.color ?? def.color ?? "bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400",
  ])
);

/** Loader runs at build time (prerender) and on client nav - provides agent for SEO */
export function loader({ params }: Route.LoaderArgs) {
  const agent = params.agentSlug
    ? DEFAULT_AGENTS.find(
        (a) => a.slug === params.agentSlug || a.id === params.agentSlug
      ) ?? null
    : null;
  return { agent };
}

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.agentSlug || "Agent"} - izan.io` },
    { name: "robots", content: "index, follow" },
  ];
}

export default function AgentDetail() {
  const { t } = useTranslation("common");
  const { lang, agentSlug } = useParams();
  const navigate = useNavigate();
  const { agent: loaderAgent } = useLoaderData<typeof loader>();
  const {
    initialize: initAgent,
    getAgentBySlug,
    selectAgent,
    getAgentSlug,
    isInitialized,
  } = useAgentStore();
  const { initialize: initMCP } = useMCPStore();

  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await Promise.all([initAgent(), initMCP()]);
    };
    init();
  }, [initAgent, initMCP]);

  // Prefer loaderData (prerender + initial load) - avoids IndexedDB wait for builtin agents
  const agent = loaderAgent ?? (agentSlug ? getAgentBySlug(agentSlug) : null);

  const handleUseAgent = async () => {
    if (!agent) return;
    await selectAgent(agent.id);
    await useMCPStore.getState().activateAgentMCPs(agent);
    navigate(`/chat/${getAgentSlug(agent)}`);
  };

  // Show loading only when we have no loaderData and store isn't ready (custom agent nav)
  if (!agent && !loaderAgent && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">{t("settings.mcpLoading")}</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t("agents.searchNoResults")}</p>
        <Link to={`/${lang}/agents`}>
          <Button variant="outline">{t("agents.detail.backToAgents")}</Button>
        </Link>
      </div>
    );
  }

  const Icon = AGENT_ICONS[agent.icon] || Bot;
  const iconColor = AGENT_COLORS[agent.id] || "bg-primary/10 text-primary";
  const detailedDescription = getAgentDetailedDescription(agent, t);
  const whatItDoes = getAgentWhatItDoes(agent, t);
  const mcps = getAgentMcps(agent, t);
  const features = getAgentFeatures(agent, t);
  const howToUse = getAgentHowToUse(agent, t);
  const proTip = getAgentProTip(agent, t);
  const usageExamples = getAgentUsageExamples(agent, t);
  const serpApiSection = getAgentSerpApiSection(agent, t);

  const mcpIds = [...agent.implicitMCPIds, ...agent.customMCPIds];
  const mcpServers = mcpIds
    .map((id) => DEFAULT_MCP_SERVERS.find((s) => s.id === id))
    .filter(Boolean);

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

      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-3 sm:gap-4">
          <Link to={`/${lang}/agents`}>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link
            to={`/${lang}`}
            className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <span className="text-lg sm:text-xl font-semibold truncate">izan.io</span>
          </Link>
          <Link to={`/${lang}/settings`}>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <Link
            to={`/${lang}/agents`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("agents.detail.backToAgents")}
          </Link>

          <MissingApiKeyBanner agent={agent} className="mb-6" />

          {/* Hero Section */}
          <div className="mb-10">
            <div className="flex items-start gap-4 sm:gap-5 mb-6">
              <div className={`rounded-2xl p-3 sm:p-4 ${iconColor}`}>
                <Icon className="h-10 w-10 sm:h-12 sm:w-12" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  {getAgentDisplayName(agent, t)}
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground">
                  {getAgentDisplayDescription(agent, t)}
                </p>
              </div>
            </div>

            {agent.enabled && (
              <Button className="w-full sm:w-auto" size="lg" onClick={handleUseAgent}>
                <MessageSquare className="h-5 w-5 mr-2" />
                {t("agents.detail.useAgent")}
              </Button>
            )}
          </div>

          {/* About This Agent */}
          {detailedDescription && (
            <section className="mb-8">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t("agents.detail.about")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {detailedDescription}
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* What It Does */}
          {whatItDoes && (
            <section className="mb-8">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wrench className="h-5 w-5 text-primary" />
                    {t("agents.detail.whatItDoes")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {whatItDoes}
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Key Features */}
          {features.length > 0 && (
            <section className="mb-8">
              <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {t("agents.detail.keyFeatures")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-3 rounded-xl border-2 bg-card/60 p-4 transition-all hover:border-primary/20 hover:bg-card"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* How to Use */}
          {howToUse && (
            <section className="mb-8">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {t("agents.detail.howToUse")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {howToUse}
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Usage Examples */}
          {usageExamples.length > 0 && (
            <section className="mb-8">
              <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <MessageSquare className="h-5 w-5 text-primary" />
                {t("agents.detail.usageExamples")}
              </h2>
              <div className="space-y-2.5">
                {usageExamples.map((ex, i) => (
                  <button
                    key={`usage-${i}-${ex.slice(0, 20)}`}
                    onClick={handleUseAgent}
                    className="w-full text-left group flex items-center gap-3 rounded-xl border-2 bg-card/60 px-4 py-3 transition-all hover:border-primary/20 hover:bg-card hover:shadow-sm cursor-pointer"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      &ldquo;{ex}&rdquo;
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Pro Tip */}
          {proTip && (
            <section className="mb-8">
              <div className="rounded-xl border-2 border-amber-500/25 bg-amber-500/5 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/80 text-amber-900 dark:bg-amber-500/10 dark:text-amber-400">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">
                      {t("agents.detail.proTip")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {proTip}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Serp API & Pricing (web-search only) */}
          {serpApiSection && (
            <section className="mb-8">
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Key className="h-5 w-5 text-primary" />
                    {serpApiSection.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {serpApiSection.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="https://serpapi.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      {t("agents.builtin.web-search.serpApiGetKey")}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <span className="text-muted-foreground">·</span>
                    <a
                      href="https://serpapi.com/pricing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      {t("agents.builtin.web-search.serpApiViewPricing")}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Powered By (MCPs) */}
          {(mcps || mcpServers.length > 0) && (
            <section className="mb-8">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-primary" />
                    {t("agents.detail.mcpsUsed")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {mcps ||
                      mcpServers.map((s) => s?.name).filter(Boolean).join(", ")}
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Bottom CTA */}
          {agent.enabled && (
            <div className="pt-4 pb-8">
              <Button className="w-full" size="lg" onClick={handleUseAgent}>
                <MessageSquare className="h-5 w-5 mr-2" />
                {t("agents.detail.useAgent")}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
