import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { AgentCard } from "~/components/agent-card";
import { fetchAgentIndex } from "~/lib/github";
import { AGENT_CATEGORIES, type AgentIndexEntry } from "~/lib/types";
import type { Route } from "./+types/agents";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";

  const titles: Record<string, string> = {
    en: "Browse AI Agents - zihin.io",
    tr: "AI Agentları Keşfet - zihin.io",
    de: "KI-Agenten entdecken - zihin.io",
  };

  const descriptions: Record<string, string> = {
    en: "Browse community-created AI agents for izan.io. Filter by category, search agents with MCP tools and browser macros.",
    tr: "izan.io için topluluk tarafından oluşturulan AI agentlarını keşfedin. Kategoriye göre filtreleyin, MCP araçları ve tarayıcı makrolarıyla agent arayın.",
    de: "Entdecken Sie von der Community erstellte KI-Agenten für izan.io. Filtern Sie nach Kategorie, suchen Sie Agenten mit MCP-Tools und Browser-Makros.",
  };

  return [
    { title: titles[lang] || titles.en },
    { name: "description", content: descriptions[lang] || descriptions.en },
    { property: "og:title", content: titles[lang] || titles.en },
    { property: "og:description", content: descriptions[lang] || descriptions.en },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `https://zihin.io/${lang}/agents` },
    { name: "twitter:title", content: titles[lang] || titles.en },
    { name: "twitter:description", content: descriptions[lang] || descriptions.en },
  ];
}

type SortKey = "newest" | "alphabetical";

export default function BrowseAgentsPage() {
  const { t } = useTranslation();
  const { lang = "en" } = useParams();
  const [searchParams] = useSearchParams();
  const [agents, setAgents] = useState<AgentIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(
    searchParams.get("category")
  );
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    fetchAgentIndex()
      .then(setAgents)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = agents;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (category) {
      result = result.filter((a) => a.category === category);
    }

    if (sort === "newest") {
      result = [...result].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [agents, search, category, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("agents.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {loading
            ? t("agents.loading")
            : t("agents.available", { count: agents.length })}
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("agents.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="newest">{t("agents.newest")}</option>
          <option value="alphabetical">{t("agents.alphabetical")}</option>
        </select>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(null)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
            !category
              ? "border-izan-primary bg-izan-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("agents.all")}
        </button>
        {AGENT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(category === cat ? null : cat)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              category === cat
                ? "border-izan-primary bg-izan-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">
          {t("agents.loading")}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.slug} agent={agent} lang={lang} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">
          {t("agents.noResults")}
        </div>
      )}
    </div>
  );
}
