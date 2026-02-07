import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Power,
  Mail,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { LegalPageLayout } from "~/components/LegalPageLayout";
import type { Route } from "./+types/terms";
import { SUPPORTED_LANGUAGES } from "~/i18n";

const LEGAL_LAST_UPDATED = "2026-02-07";
const SITE_URL = "https://izan.io";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "tr";
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

const SECTION_ICONS = {
  acceptance: FileCheck,
  useOfService: ShieldCheck,
  disclaimer: AlertTriangle,
  termination: Power,
  contact: Mail,
} as const;

export default function Terms() {
  const { t } = useTranslation("legal");
  const { lang } = useParams();

  const sections = [
    { key: "acceptance", title: t("terms.sections.acceptance") },
    { key: "useOfService", title: t("terms.sections.useOfService") },
    { key: "disclaimer", title: t("terms.sections.disclaimer") },
    { key: "termination", title: t("terms.sections.termination") },
    { key: "contact", title: t("terms.sections.contact") },
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
        {sections.map(({ key, title }) => {
          const Icon = SECTION_ICONS[key];
          return (
            <Card
              key={key}
              className="legal-section-card group rounded-2xl border-2 border-border/60 bg-card/80 shadow-sm hover:border-blue-500/25 hover:shadow-xl hover:shadow-blue-500/5"
            >
              <CardHeader className="p-6 sm:p-7">
                <div className="flex items-start gap-5">
                  <div className="legal-icon-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400/80 to-blue-500/60 text-blue-900 dark:from-blue-500/20 dark:to-blue-600/10 dark:text-blue-400">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="space-y-2 min-w-0 flex-1">
                    <CardTitle className="text-lg font-semibold tracking-tight">
                      {title}
                    </CardTitle>
                    <CardDescription className="text-[15px] leading-[1.65] text-muted-foreground">
                      {t(`terms.sections.${key}Desc`)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </article>
    </LegalPageLayout>
  );
}
