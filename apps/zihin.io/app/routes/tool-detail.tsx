import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Download,
  Tag,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ToolCard } from "~/components/tool-card";
import { fetchTool, fetchToolIndex } from "~/lib/github";
import type { MarketplaceTool, ToolIndexEntry } from "~/lib/types";
import type { Route } from "./+types/tool-detail";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";
  const slug = params.slug || "";

  const titles: Record<string, string> = {
    en: `${slug} - Browser Tool - zihin.io`,
    tr: `${slug} - Tarayici Araci - zihin.io`,
    de: `${slug} - Browser-Tool - zihin.io`,
  };

  const descriptions: Record<string, string> = {
    en: `View details, parameters, and code for the ${slug} browser automation tool on zihin.io.`,
    tr: `zihin.io'da ${slug} tarayici otomasyon aracinin detaylarini, parametrelerini ve kodunu goruntuleyin.`,
    de: `Details, Parameter und Code des ${slug} Browser-Automatisierungstools auf zihin.io anzeigen.`,
  };

  return [
    { title: titles[lang] || titles.en },
    { name: "description", content: descriptions[lang] || descriptions.en },
    { property: "og:title", content: titles[lang] || titles.en },
    { property: "og:description", content: descriptions[lang] || descriptions.en },
    { property: "og:type", content: "article" },
    { property: "og:url", content: `https://zihin.io/${lang}/tools/${slug}` },
    { name: "twitter:title", content: titles[lang] || titles.en },
    { name: "twitter:description", content: descriptions[lang] || descriptions.en },
  ];
}

function downloadToolJSON(tool: MarketplaceTool) {
  const exportData = {
    schemaVersion: 1,
    tool: {
      name: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      category: tool.category,
      parameters: tool.parameters,
      code: tool.code,
      version: tool.version,
    },
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tool.slug}.tool.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ToolDetailPage() {
  const { t } = useTranslation();
  const { slug, lang = "en" } = useParams();
  const [tool, setTool] = useState<MarketplaceTool | null>(null);
  const [related, setRelated] = useState<ToolIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeExpanded, setCodeExpanded] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    Promise.all([fetchTool(slug), fetchToolIndex()]).then(
      ([toolData, allTools]) => {
        setTool(toolData);
        if (toolData) {
          setRelated(
            allTools
              .filter(
                (t) =>
                  t.category === toolData.category && t.slug !== toolData.slug
              )
              .slice(0, 3)
          );
        }
        setLoading(false);
      }
    );
  }, [slug]);

  const copyCode = async () => {
    if (!tool) return;
    await navigator.clipboard.writeText(tool.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">{t("tools.notFound")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("tools.notFoundDesc")}
        </p>
        <Link to={`/${lang}/tools`}>
          <Button variant="outline" className="mt-6">
            {t("tools.title")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to={`/${lang}/tools`}>
        <Button variant="ghost" size="sm" className="mb-6 gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          {t("tools.backToTools")}
        </Button>
      </Link>

      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-izan-primary/20 to-izan-secondary/20 text-2xl font-mono font-bold text-izan-primary">
          fn
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{tool.displayName}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {tool.name}
          </p>
          <p className="mt-2 text-lg text-muted-foreground">
            {tool.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-izan-primary/30 bg-izan-primary/10 px-3 py-1 text-sm font-medium">
              {tool.category}
            </span>
            {tool.tags.map((tag) => (
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
            src={`https://github.com/${tool.author.githubUsername}.png?size=80`}
            alt={tool.author.displayName}
            className="h-10 w-10 rounded-full"
          />
          <div>
            <p className="font-medium">{tool.author.displayName}</p>
            <a
              href={`https://github.com/${tool.author.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              @{tool.author.githubUsername}
            </a>
          </div>
          <div className="ml-auto text-right text-xs text-muted-foreground">
            <p>v{tool.version}</p>
            <p>Updated {new Date(tool.updatedAt).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      {tool.parameters.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("tools.parameters")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tool.parameters.map((param) => (
                <div
                  key={param.name}
                  className="rounded-lg bg-muted px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {param.name}
                    </span>
                    <span className="rounded border px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {param.type}
                    </span>
                    {param.required && (
                      <span className="rounded bg-izan-primary/10 px-1.5 py-0.5 text-xs font-medium text-izan-primary">
                        required
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {param.description}
                  </p>
                  {param.enum && param.enum.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {param.enum.map((val) => (
                        <span
                          key={val}
                          className="rounded border px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                        >
                          {val}
                        </span>
                      ))}
                    </div>
                  )}
                  {param.default !== undefined && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Default: <span className="font-mono">{String(param.default)}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <button
            onClick={() => setCodeExpanded(!codeExpanded)}
            className="flex w-full items-center justify-between"
          >
            <CardTitle>{t("tools.code")}</CardTitle>
            {codeExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {codeExpanded && (
          <CardContent>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 gap-1.5"
                onClick={copyCode}
              >
                {codeCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {t("tools.copied")}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    {t("tools.copyCode")}
                  </>
                )}
              </Button>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 pr-24 font-mono text-sm leading-relaxed">
                {tool.code}
              </pre>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="mt-8 flex justify-center gap-3">
        <Button
          size="lg"
          variant="outline"
          className="gap-2"
          onClick={() => downloadToolJSON(tool)}
        >
          <Download className="h-4 w-4" />
          {t("tools.downloadJSON")}
        </Button>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-bold">
            {t("tools.relatedIn", { category: tool.category })}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((t) => (
              <ToolCard key={t.slug} tool={t} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
