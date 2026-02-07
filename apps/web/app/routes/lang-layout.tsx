import { Outlet, redirect } from "react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/lang-layout";
import { SUPPORTED_LANGUAGES, isSupportedLanguage } from "~/i18n";

// Server loader – used only at prerender time
export function loader({ params }: Route.LoaderArgs) {
  const { lang } = params;
  if (!lang || !isSupportedLanguage(lang)) {
    throw redirect("/en");
  }
  return { lang };
}

// Client loader – used during client-side navigation (ssr: false)
export function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { lang } = params;
  if (!lang || !isSupportedLanguage(lang)) {
    throw redirect("/en");
  }
  return { lang };
}

// Hydrate from the server-prerendered data when available
clientLoader.hydrate = true as const;

export default function LangLayout({ loaderData }: Route.ComponentProps) {
  const { lang } = loaderData;
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  return <Outlet />;
}

export function meta({ params: _params }: Route.MetaArgs) {
  const alternates = SUPPORTED_LANGUAGES.map((l) => ({
    tagName: "link" as const,
    rel: "alternate",
    hrefLang: l,
    href: `https://izan.io/${l}`,
  }));

  return [
    ...alternates,
    {
      tagName: "link" as const,
      rel: "alternate",
      hrefLang: "x-default",
      href: "https://izan.io/en",
    },
  ];
}
