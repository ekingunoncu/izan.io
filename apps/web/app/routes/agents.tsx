import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router";
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
  Star,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { IzanLogo } from "~/components/ui/izan-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useAgentStore, useMCPStore } from "~/store";
import { initializeDatabase } from "~/lib/db";
import { getAgentDisplayName, getAgentDisplayDescription } from "~/lib/agent-display";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/agents";

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

export function clientLoader() {
  return null;
}

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";
  const titles: Record<string, string> = {
    tr: "AI Agentlar - izan.io",
    en: "AI Agents - izan.io",
    de: "KI-Agenten - izan.io",
  };
  const descriptions: Record<string, string> = {
    tr: "MCP protokolü ile entegre AI agentlar. Web araştırma, kod asistanı ve daha fazlası.",
    en: "AI agents integrated with MCP protocol. Web research, code assistant and more.",
    de: "KI-Agenten mit MCP-Protokoll integriert. Webrecherche, Code-Assistent und mehr.",
  };
  return [
    { title: titles[lang] || titles.tr },
    { name: "description", content: descriptions[lang] || descriptions.tr },
    { property: "og:title", content: titles[lang] || titles.tr },
    { property: "og:description", content: descriptions[lang] || descriptions.tr },
    { property: "og:url", content: `https://izan.io/${lang}/agents` },
    { name: "twitter:title", content: titles[lang] || titles.tr },
    { name: "twitter:description", content: descriptions[lang] || descriptions.tr },
  ];
}

export default function Agents() {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { agents, favoriteAgentIds, initialize: initAgent, selectAgent, searchAgents, getAgentSlug, toggleFavoriteAgent, isInitialized } = useAgentStore();
  const { initialize: initMCP } = useMCPStore();
  const [agentSearch, setAgentSearch] = useState("");

  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await Promise.all([initAgent(), initMCP()]);
    };
    init();
  }, [initAgent, initMCP]);

  const handleUseAgent = async (agentId: string) => {
    const agent = useAgentStore.getState().getAgentById(agentId);
    await selectAgent(agentId);
    if (agent) {
      // Navigate immediately, activate MCPs in background
      navigate(`/chat/${getAgentSlug(agent)}`);
      useMCPStore.getState().activateAgentMCPs(agent);
    }
  };

  const filteredAgents = agentSearch.trim() ? searchAgents(agentSearch) : agents;
  const favoriteAgents = filteredAgents
    .filter((a) => favoriteAgentIds.includes(a.id))
    .sort((a, b) => favoriteAgentIds.indexOf(a.id) - favoriteAgentIds.indexOf(b.id));
  const builtinAgents = filteredAgents
    .filter((a) => a.source === "builtin" && !favoriteAgentIds.includes(a.id))
    .sort((a, b) => (a.id === "general" ? -1 : b.id === "general" ? 1 : 0));
  const userAgents = filteredAgents.filter((a) => a.source === "user" && !favoriteAgentIds.includes(a.id));

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

  const renderAgentCard = (agent: (typeof agents)[0]) => {
    const Icon = AGENT_ICONS[agent.icon] || Bot;
    const isFavorite = favoriteAgentIds.includes(agent.id);
    const colorClass =
      agent.category === "web_search"
        ? "text-blue-500"
        : agent.category === "code_assistant"
          ? "text-green-500"
          : agent.category === "calendar"
            ? "text-orange-500"
            : agent.category === "email"
              ? "text-red-500"
              : agent.category === "database"
                ? "text-purple-500"
                : agent.category === "api_connector"
                  ? "text-cyan-500"
                  : agent.category === "file_manager"
                    ? "text-yellow-500"
                    : "text-primary";
    return (
      <Card
        key={agent.id}
        className={cn(
          "transition-all flex flex-col h-full",
          agent.enabled ? "hover:shadow-lg cursor-pointer" : "opacity-60"
        )}
      >
        <CardHeader className="p-4 sm:p-6 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Icon className={cn("h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0", colorClass)} />
            <div className="flex items-center gap-2">
              {!agent.enabled && (
                <span className="text-xs bg-slate-300/80 text-slate-800 dark:bg-muted dark:text-muted-foreground px-2 py-1 rounded">
                  {t("agents.comingSoon")}
                </span>
              )}
              {agent.source === "user" && (
                <span className="text-xs bg-primary/25 text-primary dark:bg-primary/10 dark:text-primary px-2 py-1 rounded">
                  {t("agents.userCreated")}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavoriteAgent(agent.id);
                }}
                aria-label={isFavorite ? t("agents.removeFromFavorites") : t("agents.addToFavorites")}
              >
                <Star className={cn("h-4 w-4", isFavorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
              </Button>
            </div>
          </div>
          <CardTitle className="mt-4">{getAgentDisplayName(agent, t)}</CardTitle>
          <CardDescription>{getAgentDisplayDescription(agent, t)}</CardDescription>
        </CardHeader>
        {agent.enabled && (
          <CardContent className="p-4 sm:p-6 pt-0 flex gap-2">
            <Link to={`/${lang}/agents/${getAgentSlug(agent)}`} className="flex-1">
              <Button variant="outline" className="w-full">
                {t("agents.detail.detailBtn")}
              </Button>
            </Link>
            <Button className="flex-1" onClick={() => handleUseAgent(agent.id)}>
              {t("agents.use")}
            </Button>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-3 sm:gap-4">
          <Link to={`/${lang}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
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
          <Link to={`/${lang}/settings`} state={{ from: location.pathname }}>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            {t("agents.title")}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-6">
            {t("agents.description")}
          </p>

          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder={t("agents.search")}
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {favoriteAgents.map(renderAgentCard)}
            {builtinAgents.map(renderAgentCard)}
            {userAgents.map(renderAgentCard)}
          </div>
        </div>
      </main>
    </div>
  );
}
