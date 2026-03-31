import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { fetchToolIndex } from "~/lib/github";
import { TOOL_CATEGORIES, type ToolIndexEntry } from "~/lib/types";
import type { Route } from "./+types/home";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";

  const titles: Record<string, string> = {
    en: "zihin.io - Browser Tool Marketplace for AI",
    tr: "zihin.io - AI icin Tarayici Arac Pazaryeri",
    de: "zihin.io - Browser-Tool-Marktplatz fur KI",
  };

  const descriptions: Record<string, string> = {
    en: "Discover and install browser automation tools for the izan.io Chrome extension. Community-created, open source.",
    tr: "izan.io Chrome uzantisi icin tarayici otomasyon araclarini kesfedin ve yukleyin. Topluluk tarafindan olusturulmus, acik kaynak.",
    de: "Entdecken und installieren Sie Browser-Automatisierungstools fur die izan.io Chrome-Erweiterung. Community-erstellt, Open Source.",
  };

  return [
    { title: titles[lang] || titles.en },
    { name: "description", content: descriptions[lang] || descriptions.en },
    { property: "og:title", content: titles[lang] || titles.en },
    { property: "og:description", content: descriptions[lang] || descriptions.en },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `https://zihin.io/${lang}` },
  ];
}

export default function HomePage() {
  const { t } = useTranslation();
  const { lang = "en" } = useParams();
  const [tools, setTools] = useState<ToolIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchToolIndex()
      .then(setTools)
      .finally(() => setLoading(false));
  }, []);

  const featured = tools.slice(0, 6);

  return (
    <div className="max-w-3xl mx-auto px-4">

      {/* Hero */}
      <section className="py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          {t("hero.title")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          {t("hero.description")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to={`/${lang}/tools`}>
            <Button size="lg" className="gap-2">
              <Search className="h-4 w-4" />
              {t("hero.browseTools")}
            </Button>
          </Link>
          <Link to={`/${lang}/submit`}>
            <Button variant="outline" size="lg">
              {t("hero.submitYourTool")}
            </Button>
          </Link>
        </div>
        {!loading && tools.length > 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            {t("tools.available", { count: tools.length })}
          </p>
        )}
      </section>

      <hr className="border-border" />

      {/* Featured Tools */}
      {featured.length > 0 && (
        <section className="py-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">{t("home.featured")}</h2>
            <Link to={`/${lang}/tools`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              {t("home.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {featured.map((tool) => (
              <Link
                key={tool.slug}
                to={`/${lang}/tools/${tool.slug}`}
                className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm">{tool.displayName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tool.description}</p>
                  </div>
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground shrink-0">{tool.category}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && featured.length === 0 && (
        <section className="py-16 text-center">
          <p className="text-muted-foreground">{t("tools.noResults")}</p>
        </section>
      )}

      <hr className="border-border" />

      {/* Categories */}
      <section className="py-16">
        <h2 className="text-2xl font-semibold mb-6">{t("home.browseByCategory")}</h2>
        <div className="flex flex-wrap gap-2">
          {TOOL_CATEGORIES.map((category) => {
            const count = tools.filter((t) => t.category === category).length;
            return (
              <Link
                key={category}
                to={`/${lang}/tools?category=${encodeURIComponent(category)}`}
                className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <span>{category}</span>
                {count > 0 && <span className="text-muted-foreground text-xs">{count}</span>}
              </Link>
            );
          })}
        </div>
      </section>

      <hr className="border-border" />

      {/* Submit CTA */}
      <section className="py-16 text-center">
        <h2 className="text-2xl font-semibold mb-3">{t("home.shareTitle")}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-6">
          {t("home.shareDescription")}
        </p>
        <Link to={`/${lang}/submit`}>
          <Button size="lg">{t("hero.submitYourTool")}</Button>
        </Link>
      </section>

    </div>
  );
}
