import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
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
  Puzzle,
  Zap,
  Shield,
  MessageSquare,
  Lightbulb,
  Settings,
  Server,
  Cog,
  Link2,
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
import { initializeDatabase } from "~/lib/db";
import { DEFAULT_MCP_SERVERS } from "~/lib/mcp/config";
import { useAutomationStore } from "~/store/automation.store";
import { getAgentDisplayName, getAgentDisplayDescription } from "~/lib/agent-display";

const AGENT_ICONS: Record<string, typeof Bot> = {
  bot: Bot,
  search: Search,
  code: Code,
  calendar: Calendar,
  mail: Mail,
  database: Database,
  globe: Globe,
  "file-text": FileText,
  puzzle: Puzzle,
  zap: Zap,
  shield: Shield,
  "message-square": MessageSquare,
  lightbulb: Lightbulb,
};

export default function CustomAgentProfile() {
  const { t, i18n } = useTranslation("common");
  const lang = (i18n.language || "en").split("-")[0];
  const { agentSlug } = useParams();
  const navigate = useNavigate();
  const { initialize: initAgent, selectAgent, getAgentSlug, isInitialized } =
    useAgentStore();
  const agent = useAgentStore((s) =>
    agentSlug
      ? (s.agents.find((a) => a.slug === agentSlug || a.id === agentSlug) ??
          null)
      : null
  );
  const allAgents = useAgentStore((s) => s.agents);
  const { initialize: initMCP } = useMCPStore();
  const { userServers } = useMCPStore();
  const automationServers = useAutomationStore((s) => s.servers);
  const isExtensionInstalled = useMCPStore((s) => s.isExtensionInstalled);

  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await Promise.all([initAgent(), initMCP()]);
    };
    init();
  }, [initAgent, initMCP]);

  const handleUseAgent = async () => {
    if (!agent) return;
    await selectAgent(agent.id);
    navigate(`/chat/${getAgentSlug(agent)}`);
    useMCPStore.getState().activateAgentMCPs(agent);
  };

  // Loading
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

  // Not found
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

  // Collect MCP info
  const builtinMcps = agent.implicitMCPIds
    .map((id) => DEFAULT_MCP_SERVERS.find((s) => s.id === id))
    .filter(Boolean);
  const customMcps = agent.customMCPIds
    .map((id) => userServers.find((s) => s.id === id))
    .filter(Boolean);
  const macros = (agent.automationServerIds ?? [])
    .map((id) => automationServers.find((s) => s.id === id))
    .filter(Boolean);
  const linkedAgents = agent.linkedAgentIds
    .map((id) => allAgents.find((a) => a.id === id))
    .filter(Boolean);

  const needsExtension =
    (agent.extensionMCPIds ?? []).length > 0 ||
    (agent.automationServerIds ?? []).length > 0;

  return (
    <div className="min-h-screen bg-background">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link
            to={`/${lang}`}
            className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <IzanLogo className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
            <span className="text-lg sm:text-xl font-semibold truncate">
              izan.io
            </span>
          </Link>
          <Link to={`/${lang}/settings`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
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

          {/* Hero */}
          <div className="mb-10">
            <div className="flex items-start gap-4 sm:gap-5 mb-6">
              <div className="rounded-2xl p-3 sm:p-4 bg-primary/10 text-primary">
                <Icon className="h-10 w-10 sm:h-12 sm:w-12" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                    {getAgentDisplayName(agent, t)}
                  </h1>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {t("agents.userCreated")}
                  </span>
                </div>
                <p className="text-base sm:text-lg text-muted-foreground">
                  {getAgentDisplayDescription(agent, t)}
                </p>
              </div>
            </div>

            {agent.enabled && (
              <Button
                className="w-full sm:w-auto"
                size="lg"
                onClick={handleUseAgent}
              >
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
                  {t("extension.requiredBanner")}
                </p>
                <Link
                  to={`/${lang}/docs/chrome-extension`}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  {t("extension.installLink")}
                </Link>
              </div>
            </section>
          )}

          {/* System Prompt */}
          {agent.basePrompt && (
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

          {/* MCPs & Tools */}
          {(builtinMcps.length > 0 ||
            customMcps.length > 0 ||
            macros.length > 0) && (
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
                    <div
                      key={s!.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Server className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{s!.name}</span>
                    </div>
                  ))}
                  {customMcps.map((s) => (
                    <div
                      key={s!.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Server className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{s!.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({s!.url})
                      </span>
                    </div>
                  ))}
                  {macros.map((s) => (
                    <div
                      key={s!.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Cog className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{s!.name}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Linked Agents */}
          {linkedAgents.length > 0 && (
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
                      <div
                        key={la!.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <LAIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{getAgentDisplayName(la!, t)}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Model Parameters */}
          {(agent.temperature != null ||
            agent.maxTokens != null ||
            agent.topP != null ||
            agent.maxIterations != null) && (
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
                        <p className="text-muted-foreground">
                          {t("agents.temperature")}
                        </p>
                        <p className="font-medium">{agent.temperature}</p>
                      </div>
                    )}
                    {agent.maxTokens != null && (
                      <div>
                        <p className="text-muted-foreground">
                          {t("agents.maxTokens")}
                        </p>
                        <p className="font-medium">
                          {agent.maxTokens.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {agent.topP != null && (
                      <div>
                        <p className="text-muted-foreground">
                          {t("agents.topP")}
                        </p>
                        <p className="font-medium">{agent.topP}</p>
                      </div>
                    )}
                    {agent.maxIterations != null && (
                      <div>
                        <p className="text-muted-foreground">
                          {t("agents.maxIterations")}
                        </p>
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
