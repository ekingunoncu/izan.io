import { redirect } from "react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/lang-redirect";
import { detectBrowserLanguage } from "~/i18n";
import {
  HomePage,
  HOME_TITLES,
  HOME_DESCRIPTIONS,
  buildHomeJsonLd,
} from "./home";

export function meta() {
  const lang = "en";
  return [
    { title: HOME_TITLES[lang] },
    { name: "description", content: HOME_DESCRIPTIONS[lang] },
    { property: "og:title", content: HOME_TITLES[lang] },
    { property: "og:description", content: HOME_DESCRIPTIONS[lang] },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://izan.io/" },
    { tagName: "link", rel: "canonical", href: "https://izan.io/" },
    { tagName: "link", rel: "alternate", hrefLang: "en", href: "https://izan.io/" },
    { tagName: "link", rel: "alternate", hrefLang: "tr", href: "https://izan.io/tr" },
    { tagName: "link", rel: "alternate", hrefLang: "de", href: "https://izan.io/de" },
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: "https://izan.io/" },
    { name: "twitter:title", content: HOME_TITLES[lang] },
    { name: "twitter:description", content: HOME_DESCRIPTIONS[lang] },
    { "script:ld+json": buildHomeJsonLd(lang) },
  ];
}

// Server (prerender): return English lang data so prerendered HTML contains the full home page
export function loader() {
  return { lang: "en" as const };
}

// Client: detect browser language. Non-English → redirect, English → stay
export function clientLoader() {
  const lang = detectBrowserLanguage();
  if (lang !== "en") {
    return redirect(`/${lang}`);
  }
  return { lang: "en" as const };
}

clientLoader.hydrate = true as const;

export default function LangRedirect({ loaderData }: Route.ComponentProps) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== "en") {
      i18n.changeLanguage("en");
    }
  }, [i18n]);

  return <HomePage lang={loaderData?.lang || "en"} />;
}
