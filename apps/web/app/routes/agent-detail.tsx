import { useEffect } from "react";
import { Link, useParams, useNavigate, useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bot,
  Search,
  Code,
  Calendar,
  Mail,
  Database,
  Globe,
  FileText,
  MessageSquare,
  Settings,
  Zap,
  Wrench,
  CheckCircle2,
  Lightbulb,
  BookOpen,
  Sparkles,
  TrendingUp,
  Puzzle,
  Shield,
  Server,
  Cog,
  Link2,
  Send,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { IzanLogo } from "~/components/ui/izan-logo";
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
} from "~/lib/agent-display";
import { BUILTIN_AGENT_DEFINITIONS } from "@izan/agents";
import { DEFAULT_MCP_SERVERS } from "~/lib/mcp/config";
import { useAutomationStore } from "~/store/automation.store";
import type { Route } from "./+types/agent-detail";

const AGENT_ICONS: Record<string, typeof Bot> = {
  bot: Bot,
  search: Search,
  code: Code,
  calendar: Calendar,
  mail: Mail,
  database: Database,
  globe: Globe,
  "file-text": FileText,
  "message-square": MessageSquare,
  zap: Zap,
  shield: Shield,
  lightbulb: Lightbulb,
  puzzle: Puzzle,
  "trending-up": TrendingUp,
  twitter: Send,
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

/** clientLoader: falls back to IndexedDB for custom agents */
export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader();
  if (serverData.agent) return serverData; // Builtin: use prerendered data

  // Custom agent: query IndexedDB
  await initializeDatabase();
  const { useAgentStore } = await import("~/store");
  await useAgentStore.getState().initialize();
  const agents = useAgentStore.getState().agents;
  const agent = params.agentSlug
    ? agents.find((a) => a.slug === params.agentSlug || a.id === params.agentSlug) ?? null
    : null;
  return { agent };
}
clientLoader.hydrate = true as const;

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
    selectAgent,
    getAgentSlug,
    isInitialized,
  } = useAgentStore();
  // Direct selector - ensures re-render when agents array changes (custom agents from IndexedDB)
  const storeAgent = useAgentStore((s) =>
    agentSlug
      ? s.agents.find((a) => a.slug === agentSlug || a.id === agentSlug) ?? null
      : null
  );
  const allAgents = useAgentStore((s) => s.agents);
  const { initialize: initMCP } = useMCPStore();
  const isExtensionInstalled = useMCPStore((s) => s.isExtensionInstalled);
  const { userServers } = useMCPStore();
  const automationServers = useAutomationStore((s) => s.servers);

  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await Promise.all([initAgent(), initMCP()]);
    };
    init();
  }, [initAgent, initMCP]);

  // Prefer loaderData (prerender + initial load) - avoids IndexedDB wait for builtin agents
  const agent = loaderAgent ?? storeAgent;

  const handleUseAgent = async () => {
    if (!agent) return;
    await selectAgent(agent.id);
    // Navigate immediately, activate MCPs in background
    navigate(`/chat/${getAgentSlug(agent)}`);
    useMCPStore.getState().activateAgentMCPs(agent);
  };

  const handleTryPrompt = async (prompt: string) => {
    if (!agent) return;
    await selectAgent(agent.id);
    // Navigate immediately, activate MCPs in background
    navigate(`/chat/${getAgentSlug(agent)}`, {
      state: { initialPrompt: prompt },
    });
    useMCPStore.getState().activateAgentMCPs(agent);
  };

  // Show loading when we have no loaderData and store isn't ready yet (custom agent visit)
  if (!agent && !isInitialized) {
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

  const isCustomAgent = agent.source === "user";
  const Icon = AGENT_ICONS[agent.icon] || Bot;
  const iconColor = AGENT_COLORS[agent.id] || "bg-primary/10 text-primary";
  const detailedDescription = getAgentDetailedDescription(agent, t);
  const whatItDoes = getAgentWhatItDoes(agent, t);
  const mcps = getAgentMcps(agent, t);
  const features = getAgentFeatures(agent, t);
  const howToUse = getAgentHowToUse(agent, t);
  const proTip = getAgentProTip(agent, t);
  const usageExamples = getAgentUsageExamples(agent, t);

  const needsExtension = (agent.extensionMCPIds ?? []).length > 0 || (agent.automationServerIds ?? []).length > 0;

  const mcpIds = [...agent.implicitMCPIds, ...(agent.extensionMCPIds ?? []), ...agent.customMCPIds];
  const mcpServers = mcpIds
    .map((id) => DEFAULT_MCP_SERVERS.find((s) => s.id === id))
    .filter(Boolean);

  // Custom agent specific data
  const builtinMcps = isCustomAgent
    ? agent.implicitMCPIds.map((id) => DEFAULT_MCP_SERVERS.find((s) => s.id === id)).filter(Boolean)
    : [];
  const customMcps = isCustomAgent
    ? agent.customMCPIds.map((id) => userServers.find((s) => s.id === id)).filter(Boolean)
    : [];
  const macros = isCustomAgent
    ? (agent.automationServerIds ?? []).map((id) => automationServers.find((s) => s.id === id)).filter(Boolean)
    : [];
  const linkedAgents = isCustomAgent
    ? agent.linkedAgentIds.map((id) => allAgents.find((a) => a.id === id)).filter(Boolean)
    : [];

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
            <IzanLogo className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
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

          {/* Hero Section */}
          <div className="mb-10">
            <div className="flex items-start gap-4 sm:gap-5 mb-6">
              <div className={`rounded-2xl p-3 sm:p-4 ${iconColor}`}>
                <Icon className="h-10 w-10 sm:h-12 sm:w-12" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                    {getAgentDisplayName(agent, t)}
                  </h1>
                  {isCustomAgent && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {t("agents.userCreated")}
                    </span>
                  )}
                </div>
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

          {/* Extension Required */}
          {needsExtension && !isExtensionInstalled && (
            <section className="mb-8">
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
                <Puzzle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="flex-1 text-sm text-blue-800 dark:text-blue-200">
                  {t('extension.requiredBanner')}
                </p>
                <Link
                  to={`/${lang}/docs/chrome-extension`}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  {t('extension.installLink')}
                </Link>
              </div>
            </section>
          )}

          {/* About This Agent (builtin) */}
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

          {/* System Prompt (custom agents) */}
          {isCustomAgent && agent.basePrompt && (
            <section className="mb-8">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bot className="h-5 w-5 text-primary" />
                    {t("agents.basePrompt")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {agent.basePrompt}
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
                    onClick={() => handleTryPrompt(ex)}
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

          {/* MCPs & Tools (custom agents: enhanced view) */}
          {isCustomAgent && (builtinMcps.length > 0 || customMcps.length > 0 || macros.length > 0) && (
            <section className="mb-8">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-primary" />
                    {t("agents.detail.mcpsUsed")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {builtinMcps.map((s) => (
                    <div key={s!.id} className="flex items-center gap-2 text-sm">
                      <Server className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{s!.name}</span>
                    </div>
                  ))}
                  {customMcps.map((s) => (
                    <div key={s!.id} className="flex items-center gap-2 text-sm">
                      <Server className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{s!.name}</span>
                      <span className="text-xs text-muted-foreground">({s!.url})</span>
                    </div>
                  ))}
                  {macros.map((s) => (
                    <div key={s!.id} className="flex items-center gap-2 text-sm">
                      <Cog className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{s!.name}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Powered By (builtin agents) */}
          {!isCustomAgent && (mcps || mcpServers.length > 0) && (
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

          {/* Linked Agents (custom agents) */}
          {isCustomAgent && linkedAgents.length > 0 && (
            <section className="mb-8">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Link2 className="h-5 w-5 text-primary" />
                    {t("agents.linkedAgents")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {linkedAgents.map((la) => {
                    const LAIcon = AGENT_ICONS[la!.icon] || Bot;
                    return (
                      <div key={la!.id} className="flex items-center gap-2 text-sm">
                        <LAIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{getAgentDisplayName(la!, t)}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Model Parameters (custom agents) */}
          {isCustomAgent && (agent.temperature != null || agent.maxTokens != null || agent.topP != null || agent.maxIterations != null) && (
            <section className="mb-8">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5 text-primary" />
                    {t("agents.modelParams")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    {agent.temperature != null && (
                      <div>
                        <p className="text-muted-foreground">{t("agents.temperature")}</p>
                        <p className="font-medium">{agent.temperature}</p>
                      </div>
                    )}
                    {agent.maxTokens != null && (
                      <div>
                        <p className="text-muted-foreground">{t("agents.maxTokens")}</p>
                        <p className="font-medium">{agent.maxTokens.toLocaleString()}</p>
                      </div>
                    )}
                    {agent.topP != null && (
                      <div>
                        <p className="text-muted-foreground">{t("agents.topP")}</p>
                        <p className="font-medium">{agent.topP}</p>
                      </div>
                    )}
                    {agent.maxIterations != null && (
                      <div>
                        <p className="text-muted-foreground">{t("agents.maxIterations")}</p>
                        <p className="font-medium">{agent.maxIterations}</p>
                      </div>
                    )}
                  </div>
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
