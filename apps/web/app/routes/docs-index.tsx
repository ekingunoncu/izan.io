import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
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

          return (
            <div key={cat.id}>
              <h2 className="text-lg font-semibold mb-4">{t(cat.titleKey)}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {entries.map((entry) => (
                  <Link
                    key={entry.slug}
                    to={`/${lang}/docs/${entry.slug}`}
                    className="group rounded-xl border p-5 transition-all duration-200 hover:shadow-md hover:border-primary/30"
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
