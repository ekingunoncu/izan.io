import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { BookOpen, Puzzle, Settings2 } from "lucide-react";
import { DOC_CATEGORIES, DOC_ENTRIES } from "~/docs/manifest";
import type { Route } from "./+types/docs-index";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";
  const titles: Record<string, string> = {
    en: "Documentation - izan.io",
    tr: "Dokümantasyon - izan.io",
    de: "Dokumentation - izan.io",
  };
  return [{ title: titles[lang] || titles.en }];
}

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  "getting-started": BookOpen,
  features: Puzzle,
  configuration: Settings2,
};

const CATEGORY_COLORS: Record<string, string> = {
  "getting-started":
    "border-blue-200/40 dark:border-blue-500/15 bg-blue-50/30 dark:bg-blue-950/25 hover:border-blue-200/60 dark:hover:border-blue-500/25",
  features:
    "border-violet-200/40 dark:border-violet-500/15 bg-violet-50/30 dark:bg-violet-950/25 hover:border-violet-200/60 dark:hover:border-violet-500/25",
  configuration:
    "border-emerald-200/40 dark:border-emerald-500/15 bg-emerald-50/30 dark:bg-emerald-950/25 hover:border-emerald-200/60 dark:hover:border-emerald-500/25",
};

const ICON_COLORS: Record<string, string> = {
  "getting-started": "bg-blue-500 text-white",
  features: "bg-violet-500 text-white",
  configuration: "bg-emerald-500 text-white",
};

export default function DocsIndex() {
  const { t } = useTranslation("common");
  const { lang } = useParams();

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-bold mb-3">
        {t("docs.title")}
      </h1>
      <p className="text-lg text-muted-foreground mb-10">
        {t("docs.description")}
      </p>

      <div className="flex flex-col gap-8">
        {DOC_CATEGORIES.map((cat) => {
          const entries = DOC_ENTRIES.filter((e) => e.category === cat.id);
          const Icon = CATEGORY_ICONS[cat.id] || BookOpen;

          return (
            <div key={cat.id}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${ICON_COLORS[cat.id] || "bg-primary text-primary-foreground"}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold">{t(cat.titleKey)}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {entries.map((entry) => (
                  <Link
                    key={entry.slug}
                    to={`/${lang}/docs/${entry.slug}`}
                    className={`group rounded-xl border p-5 transition-all duration-200 hover:shadow-md ${CATEGORY_COLORS[cat.id] || ""}`}
                  >
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {t(entry.titleKey)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
