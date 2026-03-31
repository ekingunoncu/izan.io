import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { LegalPageLayout } from "~/components/LegalPageLayout";
import type { Route } from "./+types/terms";
import { SUPPORTED_LANGUAGES } from "~/i18n";

const LEGAL_LAST_UPDATED = "2026-02-07";
const SITE_URL = "https://izan.io";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";
  const titles: Record<string, string> = {
    tr: "Kullanım Koşulları",
    en: "Terms of Service",
    de: "Nutzungsbedingungen",
  };
  const descriptions: Record<string, string> = {
    tr: "izan.io kullanım koşulları. Hizmetimizi kullanırken uymanız gereken kurallar.",
    en: "izan.io terms of service. Rules you must follow when using our service.",
    de: "izan.io Nutzungsbedingungen. Regeln bei der Nutzung unseres Dienstes.",
  };
  const alternates = SUPPORTED_LANGUAGES.map((l) => ({
    tagName: "link" as const,
    rel: "alternate" as const,
    hrefLang: l,
    href: `${SITE_URL}/${l}/terms`,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `izan.io - ${titles[lang] || titles.tr}`,
    description: descriptions[lang] || descriptions.tr,
    url: `${SITE_URL}/${lang}/terms`,
    inLanguage: lang,
    isPartOf: { "@type": "WebSite", name: "izan.io", url: SITE_URL },
  };

  return [
    { title: `izan.io - ${titles[lang] || titles.tr}` },
    { name: "description", content: descriptions[lang] || descriptions.tr },
    { property: "og:title", content: `izan.io - ${titles[lang] || titles.tr}` },
    { property: "og:description", content: descriptions[lang] || descriptions.tr },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `${SITE_URL}/${lang}/terms` },
    { name: "twitter:title", content: `izan.io - ${titles[lang] || titles.tr}` },
    { name: "twitter:description", content: descriptions[lang] || descriptions.tr },
    { tagName: "link" as const, rel: "canonical", href: `${SITE_URL}/${lang}/terms` },
    ...alternates,
    {
      tagName: "link" as const,
      rel: "alternate" as const,
      hrefLang: "x-default",
      href: `${SITE_URL}/tr/terms`,
    },
    { "script:ld+json": jsonLd },
  ];
}

export default function Terms() {
  const { t } = useTranslation("legal");
  const { lang } = useParams();

  const sections = [
    "acceptance",
    "useOfService",
    "disclaimer",
    "termination",
    "contact",
  ] as const;

  return (
    <LegalPageLayout
      page="terms"
      backLabel={t("nav.backToHome")}
      title={t("terms.title")}
      lastUpdated={`${t("terms.lastUpdated")}: ${LEGAL_LAST_UPDATED}`}
      intro={t("terms.intro")}
      otherPageLink={{ to: `/${lang}/privacy`, label: t("nav.privacy") }}
    >
      <article className="space-y-5">
        {sections.map((key) => (
          <section key={key} className="rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-2">
              {t(`terms.sections.${key}`)}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(`terms.sections.${key}Desc`)}
            </p>
          </section>
        ))}
      </article>
    </LegalPageLayout>
  );
}
