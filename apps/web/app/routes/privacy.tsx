import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { LegalPageLayout } from "~/components/LegalPageLayout";
import type { Route } from "./+types/privacy";
import { SUPPORTED_LANGUAGES } from "~/i18n";

const LEGAL_LAST_UPDATED = "2026-02-11";
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
    { name: "twitter:title", content: `izan.io - ${titles[lang] || titles.tr}` },
    { name: "twitter:description", content: descriptions[lang] || descriptions.tr },
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

export default function Privacy() {
  const { t } = useTranslation("legal");
  const { lang } = useParams();

  const sections = [
    "dataWeStore",
    "browserExtension",
    "limitedUse",
    "thirdPartyServices",
    "cookies",
    "gdpr",
    "children",
    "changes",
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
        {sections.map((key) => (
          <section key={key} className="rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-2">
              {t(`privacy.sections.${key}`)}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(`privacy.sections.${key}Desc`)}
            </p>
          </section>
        ))}
      </article>

      <section className="mt-14 pt-10 border-t">
        <p className="text-sm text-muted-foreground">
          {t("privacy.contact")}{" "}
          <a
            href={`mailto:${t("privacy.contactEmail")}`}
            className="font-semibold text-foreground hover:underline"
          >
            {t("privacy.contactEmail")}
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
}
