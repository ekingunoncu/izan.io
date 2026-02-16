import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Bot,
  Users,
  Sparkles,
  MessageSquare,
  Search,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { AgentCard } from "~/components/agent-card";
import { fetchAgentIndex } from "~/lib/github";
import { AGENT_CATEGORIES, type AgentIndexEntry } from "~/lib/types";
import type { Route } from "./+types/home";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";

  const titles: Record<string, string> = {
    en: "zihin.io - Community Agent Marketplace for izan.io",
    tr: "zihin.io - izan.io için Topluluk Agent Pazaryeri",
    de: "zihin.io - Community-Agent-Marktplatz für izan.io",
  };

  const descriptions: Record<string, string> = {
    en: "Discover, share, and contribute AI agents for izan.io. Browse community-created agents with MCP tools, browser macros, and custom prompts.",
    tr: "izan.io için AI agentları keşfedin, paylaşın ve katkıda bulunun. MCP araçları, tarayıcı makroları ve özel promptlarla topluluk agentlarını keşfedin.",
    de: "Entdecken, teilen und erstellen Sie KI-Agenten für izan.io. Community-Agenten mit MCP-Tools, Browser-Makros und benutzerdefinierten Prompts.",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "zihin.io",
    url: `https://zihin.io/${lang}`,
    description: descriptions[lang] || descriptions.en,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    keywords:
      "ai agent marketplace, mcp agents, browser automation agents, izan.io agents, community ai agents, open source ai",
    isAccessibleForFree: true,
    sameAs: [
      "https://github.com/ekingunoncu/zihin.io",
      "https://izan.io",
    ],
  };

  return [
    { title: titles[lang] || titles.en },
    { name: "description", content: descriptions[lang] || descriptions.en },
    { property: "og:title", content: titles[lang] || titles.en },
    { property: "og:description", content: descriptions[lang] || descriptions.en },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `https://zihin.io/${lang}` },
    { name: "twitter:title", content: titles[lang] || titles.en },
    { name: "twitter:description", content: descriptions[lang] || descriptions.en },
    { "script:ld+json": jsonLd },
  ];
}

export default function HomePage() {
  const { t } = useTranslation();
  const { lang = "en" } = useParams();
  const [agents, setAgents] = useState<AgentIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentIndex()
      .then(setAgents)
      .finally(() => setLoading(false));
  }, []);

  const featured = agents.slice(0, 6);
  const uniqueAuthors = new Set(agents.map((a) => a.author.githubUsername));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28 md:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="hero-blob animate-float absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-izan-primary sm:h-96 sm:w-96" />
          <div className="hero-blob animate-float-delayed absolute -right-32 bottom-1/4 h-72 w-72 rounded-full bg-izan-secondary sm:h-96 sm:w-96" />
          <div className="hero-blob animate-float absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-izan-accent sm:h-64 sm:w-64" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="animate-slide-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/60 px-4 py-1.5 text-sm backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-izan-primary" />
              {t("hero.badge")}
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {t("hero.title")}{" "}
              <span className="gradient-text">{t("hero.titleBrand")}</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              {t("hero.description")}
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to={`/${lang}/agents`}>
                <Button size="lg" className="gap-2">
                  <Search className="h-4 w-4" />
                  {t("hero.browseAgents")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={`/${lang}/submit`}>
                <Button variant="outline" size="lg" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t("hero.submitYourAgent")}
                </Button>
              </Link>
            </div>

            {!loading && (
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Bot className="h-4 w-4" />
                  {agents.length} {t("hero.agents")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {uniqueAuthors.size} {t("hero.contributors")}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured agents */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("home.featured")}</h2>
            <Link to={`/${lang}/agents`}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                {t("home.viewAll")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((agent) => (
              <AgentCard key={agent.slug} agent={agent} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold">
          {t("home.browseByCategory")}
        </h2>
        <div className="flex flex-wrap gap-3">
          {AGENT_CATEGORIES.map((category) => {
            const count = agents.filter(
              (a) => a.category === category
            ).length;
            return (
              <Link
                key={category}
                to={`/${lang}/agents?category=${encodeURIComponent(category)}`}
              >
                <div className="glass-card rounded-xl px-5 py-3 text-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <span className="font-medium">{category}</span>
                  {count > 0 && (
                    <span className="ml-2 text-muted-foreground">{count}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-bold">{t("home.shareTitle")}</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          {t("home.shareDescription")}
        </p>
        <Link to={`/${lang}/submit`}>
          <Button size="lg" className="mt-6 gap-2">
            <Sparkles className="h-4 w-4" />
            {t("hero.submitYourAgent")}
          </Button>
        </Link>
      </section>
    </>
  );
}
