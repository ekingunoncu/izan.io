import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
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
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useAgentStore, useMCPStore } from "~/store";
import { initializeDatabase } from "~/lib/db";
import {
  getAgentDisplayName,
  getAgentDisplayDescription,
  getAgentWhatItDoes,
  getAgentMcps,
  getAgentUsageExamples,
} from "~/lib/agent-display";
import { DEFAULT_MCP_SERVERS } from "~/lib/mcp/config";
import type { Route } from "./+types/agent-detail";

const AGENT_ICONS: Record<string, typeof Bot> = {
  bot: Bot,
  search: Search,
  code: Code,
  globe: Globe,
  "message-square": MessageSquare,
  zap: Zap,
};

export function clientLoader() {
  return null;
}

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.agentSlug || "Agent"} - izan.io` },
    { name: "robots", content: "noindex" },
  ];
}

export default function AgentDetail() {
  const { t } = useTranslation("common");
  const { lang, agentSlug } = useParams();
  const navigate = useNavigate();
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

  const agent = agentSlug ? getAgentBySlug(agentSlug) : null;

  const handleUseAgent = async () => {
    if (!agent) return;
    await selectAgent(agent.id);
    await useMCPStore.getState().activateAgentMCPs(agent);
    navigate(`/chat/${getAgentSlug(agent)}`);
  };

  if (!isInitialized) {
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
  const whatItDoes = getAgentWhatItDoes(agent, t);
  const mcps = getAgentMcps(agent, t);
  const usageExamples = getAgentUsageExamples(agent, t);

  const mcpIds = [...agent.implicitMCPIds, ...agent.customMCPIds];
  const mcpServers = mcpIds
    .map((id) => DEFAULT_MCP_SERVERS.find((s) => s.id === id))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
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
        <div className="max-w-2xl mx-auto">
          <Link
            to={`/${lang}/agents`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("agents.detail.backToAgents")}
          </Link>

          <Card className="overflow-hidden">
            <CardHeader className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl sm:text-3xl">
                    {getAgentDisplayName(agent, t)}
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {getAgentDisplayDescription(agent, t)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
              {whatItDoes && (
                <section>
                  <h3 className="flex items-center gap-2 font-semibold mb-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    {t("agents.detail.whatItDoes")}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{whatItDoes}</p>
                </section>
              )}

              {(mcps || mcpServers.length > 0) && (
                <section>
                  <h3 className="flex items-center gap-2 font-semibold mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    {t("agents.detail.mcpsUsed")}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {mcps ||
                      mcpServers.map((s) => s?.name).filter(Boolean).join(", ")}
                  </p>
                </section>
              )}

              {usageExamples.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 font-semibold mb-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    {t("agents.detail.usageExamples")}
                  </h3>
                  <ul className="space-y-2">
                    {usageExamples.map((ex, i) => (
                      <li
                        key={`usage-${i}-${ex.slice(0, 20)}`}
                        className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/20"
                      >
                        "{ex}"
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {agent.enabled && (
                <div className="pt-4">
                  <Button className="w-full" size="lg" onClick={handleUseAgent}>
                    {t("agents.detail.useAgent")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
