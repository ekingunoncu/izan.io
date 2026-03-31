import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { ToolCard } from "~/components/tool-card";
import { fetchToolIndex } from "~/lib/github";
import { TOOL_CATEGORIES, type ToolIndexEntry } from "~/lib/types";
import type { Route } from "./+types/tools";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";

  const titles: Record<string, string> = {
    en: "Browse Browser Tools - zihin.io",
    tr: "Tarayici Araclarini Kesfet - zihin.io",
    de: "Browser-Tools entdecken - zihin.io",
  };

  const descriptions: Record<string, string> = {
    en: "Browse community-created browser automation tools. Filter by category, search tools for web automation and AI agents.",
    tr: "Topluluk tarafindan olusturulan tarayici otomasyon araclarini kesfet. Kategoriye gore filtrele, web otomasyonu ve AI ajanlari icin arac ara.",
    de: "Entdecken Sie von der Community erstellte Browser-Automatisierungstools. Filtern Sie nach Kategorie, suchen Sie Tools fur Web-Automatisierung und KI-Agenten.",
  };

  return [
    { title: titles[lang] || titles.en },
    { name: "description", content: descriptions[lang] || descriptions.en },
    { property: "og:title", content: titles[lang] || titles.en },
    { property: "og:description", content: descriptions[lang] || descriptions.en },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `https://zihin.io/${lang}/tools` },
    { name: "twitter:title", content: titles[lang] || titles.en },
    { name: "twitter:description", content: descriptions[lang] || descriptions.en },
  ];
}

type SortKey = "newest" | "alphabetical";

export default function BrowseToolsPage() {
  const { t } = useTranslation();
  const { lang = "en" } = useParams();
  const [searchParams] = useSearchParams();
  const [tools, setTools] = useState<ToolIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(
    searchParams.get("category")
  );
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    fetchToolIndex()
      .then(setTools)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = tools;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.displayName.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (category) {
      result = result.filter((t) => t.category === category);
    }

    if (sort === "newest") {
      result = [...result].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } else {
      result = [...result].sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    return result;
  }, [tools, search, category, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("tools.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {loading
            ? t("tools.loading")
            : t("tools.available", { count: tools.length })}
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("tools.search")}
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
          <option value="newest">{t("tools.newest")}</option>
          <option value="alphabetical">{t("tools.alphabetical")}</option>
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
          {t("tools.all")}
        </button>
        {TOOL_CATEGORIES.map((cat) => (
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
          {t("tools.loading")}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} lang={lang} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">
          {t("tools.noResults")}
        </div>
      )}
    </div>
  );
}
