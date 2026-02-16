import { Outlet, redirect } from "react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/lang-layout";
import { SUPPORTED_LANGUAGES, isSupportedLanguage } from "~/i18n";

export function loader({ params }: Route.LoaderArgs) {
  const { lang } = params;
  if (!lang || !isSupportedLanguage(lang)) {
    throw redirect("/en");
  }
  return { lang };
}

export function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { lang } = params;
  if (!lang || !isSupportedLanguage(lang)) {
    throw redirect("/en");
  }
  return { lang };
}

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

export function meta() {
  const alternates = SUPPORTED_LANGUAGES.map((l) => ({
    tagName: "link" as const,
    rel: "alternate",
    hrefLang: l,
    href: `https://zihin.io/${l}`,
  }));

  return [
    ...alternates,
    {
      tagName: "link" as const,
      rel: "alternate",
      hrefLang: "x-default",
      href: "https://zihin.io/en",
    },
  ];
}
