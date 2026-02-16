import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Server,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { AgentCard } from "~/components/agent-card";
import { fetchAgent, fetchAgentIndex } from "~/lib/github";
import type { MarketplaceAgent, AgentIndexEntry } from "~/lib/types";
import type { Route } from "./+types/agent-detail";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";
  const slug = params.slug || "";

  const titles: Record<string, string> = {
    en: `${slug} - AI Agent - zihin.io`,
    tr: `${slug} - AI Agent - zihin.io`,
    de: `${slug} - KI-Agent - zihin.io`,
  };

  const descriptions: Record<string, string> = {
    en: `View details, system prompt, and MCP tools for the ${slug} AI agent on zihin.io.`,
    tr: `zihin.io'da ${slug} AI agentının detaylarını, sistem promptunu ve MCP araçlarını görüntüleyin.`,
    de: `Details, System-Prompt und MCP-Tools des ${slug} KI-Agenten auf zihin.io anzeigen.`,
  };

  return [
    { title: titles[lang] || titles.en },
    { name: "description", content: descriptions[lang] || descriptions.en },
    { property: "og:title", content: titles[lang] || titles.en },
    { property: "og:description", content: descriptions[lang] || descriptions.en },
    { property: "og:type", content: "article" },
    { property: "og:url", content: `https://zihin.io/${lang}/agents/${slug}` },
    { name: "twitter:title", content: titles[lang] || titles.en },
    { name: "twitter:description", content: descriptions[lang] || descriptions.en },
  ];
}

function downloadForIzan(agent: MarketplaceAgent) {
  const exportData = {
    version: 1,
    exportedAt: Date.now(),
    agent: {
      name: agent.name,
      slug: agent.slug,
      description: agent.description,
      icon: agent.icon,
      basePrompt: agent.basePrompt,
      category: agent.category,
      implicitMCPIds: agent.implicitMCPIds ?? [],
      extensionMCPIds: agent.extensionMCPIds ?? [],
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      topP: agent.topP,
    },
    customMCPs: (agent.requiredMCPs ?? []).map((mcp) => ({
      name: mcp.name,
      url: mcp.url,
      description: mcp.description,
      headers: mcp.headers,
    })),
    macros: agent.macros,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${agent.slug}.agent.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AgentDetailPage() {
  const { t } = useTranslation();
  const { slug, lang = "en" } = useParams();
  const [agent, setAgent] = useState<MarketplaceAgent | null>(null);
  const [related, setRelated] = useState<AgentIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [promptExpanded, setPromptExpanded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    Promise.all([fetchAgent(slug), fetchAgentIndex()]).then(
      ([agentData, allAgents]) => {
        setAgent(agentData);
        if (agentData) {
          setRelated(
            allAgents
              .filter(
                (a) =>
                  a.category === agentData.category && a.slug !== agentData.slug
              )
              .slice(0, 3)
          );
        }
        setLoading(false);
      }
    );
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">{t("agents.notFound")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("agents.notFoundDesc")}
        </p>
        <Link to={`/${lang}/agents`}>
          <Button variant="outline" className="mt-6">
            {t("agents.title")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to={`/${lang}/agents`}>
        <Button variant="ghost" size="sm" className="mb-6 gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          {t("agents.backToAgents")}
        </Button>
      </Link>

      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-izan-primary/20 to-izan-secondary/20 text-4xl">
          {agent.icon}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {agent.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-izan-primary/30 bg-izan-primary/10 px-3 py-1 text-sm font-medium">
              {agent.category}
            </span>
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Card className="mt-8">
        <CardContent className="flex items-center gap-4 p-5">
          <img
            src={`https://github.com/${agent.author.githubUsername}.png?size=80`}
            alt={agent.author.displayName}
            className="h-10 w-10 rounded-full"
          />
          <div>
            <p className="font-medium">{agent.author.displayName}</p>
            <a
              href={`https://github.com/${agent.author.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              @{agent.author.githubUsername}
            </a>
          </div>
          <div className="ml-auto text-right text-xs text-muted-foreground">
            <p>v{agent.version}</p>
            <p>Updated {new Date(agent.updatedAt).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <button
            onClick={() => setPromptExpanded(!promptExpanded)}
            className="flex w-full items-center justify-between"
          >
            <CardTitle>{t("agents.systemPrompt")}</CardTitle>
            {promptExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {promptExpanded && (
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed">
              {agent.basePrompt}
            </pre>
          </CardContent>
        )}
      </Card>

      {agent.requiredMCPs && agent.requiredMCPs.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              {t("agents.mcpServers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {agent.requiredMCPs.map((mcp) => (
                <li
                  key={mcp.url}
                  className="rounded-lg bg-muted px-4 py-3"
                >
                  <p className="font-medium text-sm">{mcp.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                    {mcp.url}
                  </p>
                  {mcp.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {mcp.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {agent.macros?.servers && agent.macros.servers.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("agents.macroTools")}</CardTitle>
          </CardHeader>
          <CardContent>
            {agent.macros.servers.map((server) => (
              <div key={server.name} className="mb-4 last:mb-0">
                <p className="mb-2 text-sm font-medium">{server.name}</p>
                <ul className="space-y-2">
                  {server.tools.map((tool) => (
                    <li
                      key={tool.name}
                      className="rounded-lg bg-muted px-4 py-3"
                    >
                      <p className="text-sm font-medium">{tool.displayName || tool.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tool.description}
                      </p>
                      {tool.parameters.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {tool.parameters.map((p) => (
                            <span
                              key={p.name}
                              className="rounded border px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                            >
                              {p.name}{p.required ? "" : "?"}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {agent.examplePrompts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("agents.examplePrompts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {agent.examplePrompts.map((prompt, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-muted px-4 py-3 text-sm"
                >
                  &ldquo;{prompt}&rdquo;
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Button
          size="lg"
          variant="outline"
          className="gap-2"
          onClick={() => downloadForIzan(agent)}
        >
          <Download className="h-4 w-4" />
          {t("agents.downloadForIzan")}
        </Button>
        <a
          href={`https://izan.io/chat/${agent.slug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="lg" className="gap-2">
            {t("agents.useInIzan")}
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-bold">
            {t("agents.relatedIn", { category: agent.category })}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <AgentCard key={a.slug} agent={a} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
