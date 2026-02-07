import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Database,
  Globe,
  Cookie,
  Scale,
  UserX,
  FileEdit,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { LegalPageLayout } from "~/components/LegalPageLayout";
import type { Route } from "./+types/privacy";
import { SUPPORTED_LANGUAGES } from "~/i18n";

const LEGAL_LAST_UPDATED = "2026-02-07";
const SITE_URL = "https://izan.io";

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang || "en";
  const titles: Record<string, string> = {
    tr: "Gizlilik Politikası",
    en: "Privacy Policy",
    de: "Datenschutzrichtlinie",
  };
  const descriptions: Record<string, string> = {
    tr: "izan.io gizlilik politikası. Kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu öğrenin. Google Ads ile uyumlu.",
    en: "izan.io privacy policy. Learn how your personal data is collected, used, and protected. Google Ads compliant.",
    de: "izan.io Datenschutzrichtlinie. Erfahren Sie, wie Ihre Daten erhoben, verwendet und geschützt werden.",
  };
  const alternates = SUPPORTED_LANGUAGES.map((l) => ({
    tagName: "link" as const,
    rel: "alternate" as const,
    hrefLang: l,
    href: `${SITE_URL}/${l}/privacy`,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `izan.io - ${titles[lang] || titles.tr}`,
    description: descriptions[lang] || descriptions.tr,
    url: `${SITE_URL}/${lang}/privacy`,
    inLanguage: lang,
    isPartOf: { "@type": "WebSite", name: "izan.io", url: SITE_URL },
  };

  return [
    { title: `izan.io - ${titles[lang] || titles.tr}` },
    { name: "description", content: descriptions[lang] || descriptions.tr },
    { property: "og:title", content: `izan.io - ${titles[lang] || titles.tr}` },
    { property: "og:description", content: descriptions[lang] || descriptions.tr },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `${SITE_URL}/${lang}/privacy` },
    { tagName: "link" as const, rel: "canonical", href: `${SITE_URL}/${lang}/privacy` },
    ...alternates,
    {
      tagName: "link" as const,
      rel: "alternate" as const,
      hrefLang: "x-default",
      href: `${SITE_URL}/tr/privacy`,
    },
    { "script:ld+json": jsonLd },
  ];
}

const SECTION_ICONS = {
  dataWeStore: Database,
  thirdPartyServices: Globe,
  cookies: Cookie,
  gdpr: Scale,
  children: UserX,
  changes: FileEdit,
} as const;

export default function Privacy() {
  const { t } = useTranslation("legal");
  const { lang } = useParams();

  const sections = [
    { key: "dataWeStore", title: t("privacy.sections.dataWeStore") },
    { key: "thirdPartyServices", title: t("privacy.sections.thirdPartyServices") },
    { key: "cookies", title: t("privacy.sections.cookies") },
    { key: "gdpr", title: t("privacy.sections.gdpr") },
    { key: "children", title: t("privacy.sections.children") },
    { key: "changes", title: t("privacy.sections.changes") },
  ] as const;

  return (
    <LegalPageLayout
      page="privacy"
      backLabel={t("nav.backToHome")}
      title={t("privacy.title")}
      lastUpdated={`${t("privacy.lastUpdated")}: ${LEGAL_LAST_UPDATED}`}
      intro={t("privacy.intro")}
      otherPageLink={{ to: `/${lang}/terms`, label: t("nav.terms") }}
    >
      <article className="space-y-5">
        {sections.map(({ key, title }) => {
          const Icon = SECTION_ICONS[key];
          return (
            <Card
              key={key}
              className="legal-section-card group rounded-2xl border-2 border-border/60 bg-card/80 shadow-sm hover:border-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/5"
            >
              <CardHeader className="p-6 sm:p-7">
                <div className="flex items-start gap-5">
                  <div className="legal-icon-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/80 to-emerald-500/60 text-emerald-900 dark:from-emerald-500/20 dark:to-emerald-600/10 dark:text-emerald-400">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="space-y-2 min-w-0 flex-1">
                    <CardTitle className="text-lg font-semibold tracking-tight">
                      {title}
                    </CardTitle>
                    <CardDescription className="text-[15px] leading-[1.65] text-muted-foreground">
                      {t(`privacy.sections.${key}Desc`)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </article>

      <section className="mt-14 pt-10 border-t border-border/80">
        <Card className="overflow-hidden rounded-2xl border-2 border-emerald-500/15 bg-gradient-to-br from-emerald-500/8 to-emerald-600/5 shadow-sm">
          <CardContent className="flex items-center gap-5 p-6">
            <div className="legal-icon-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-400/80 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-400">
              <Shield className="h-6 w-6" strokeWidth={2} />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("privacy.contact")}{" "}
              <a
                href={`mailto:${t("privacy.contactEmail")}`}
                className="font-semibold text-foreground transition-colors hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                {t("privacy.contactEmail")}
              </a>
            </p>
          </CardContent>
        </Card>
      </section>
    </LegalPageLayout>
  );
}
