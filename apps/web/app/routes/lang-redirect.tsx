import { redirect, useNavigate } from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/lang-redirect";
import { detectBrowserLanguage } from "~/i18n";

export function meta() {
  return [
    { title: "izan.io - Open Source AI Agent Platform | Browser Automation, MCP Tools, 17+ Providers" },
    { name: "description", content: "Build and deploy AI agents with browser automation, Chrome extension macros, MCP protocol tools, and 17+ AI providers. Open source, privacy-first." },
    { property: "og:title", content: "izan.io - Open Source AI Agent Platform" },
    { property: "og:description", content: "Build and deploy AI agents with browser automation, Chrome extension macros, MCP protocol tools, and 17+ AI providers." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://izan.io/" },
    { tagName: "link", rel: "canonical", href: "https://izan.io/en" },
    { tagName: "link", rel: "alternate", hrefLang: "en", href: "https://izan.io/en" },
    { tagName: "link", rel: "alternate", hrefLang: "tr", href: "https://izan.io/tr" },
    { tagName: "link", rel: "alternate", hrefLang: "de", href: "https://izan.io/de" },
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: "https://izan.io/en" },
  ];
}

// Server (prerender): return data instead of redirect so SPA fallback gets 200
export function loader({ request }: Route.LoaderArgs) {
  const acceptLang = request.headers.get("Accept-Language") || "";
  let lang = "en";
  if (acceptLang.startsWith("de")) lang = "de";
  else if (acceptLang.startsWith("tr")) lang = "tr";
  else if (acceptLang.startsWith("en")) lang = "en";
  return { redirectTo: `/${lang}` };
}

// Client: redirect on navigation to /
export function clientLoader() {
  const lang = detectBrowserLanguage();
  return redirect(`/${lang}`);
}

export default function LangRedirect({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const redirectTo = loaderData?.redirectTo;

  useEffect(() => {
    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [redirectTo, navigate]);

  return null;
}
