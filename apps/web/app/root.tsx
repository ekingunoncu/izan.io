import { useEffect } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
} from "react-router";

import "./index.css";
import { ClientInit } from "~/components/ClientInit";
import { CookieConsent } from "~/components/CookieConsent";
import { GitHubFeedbackWidget } from "~/components/GitHubFeedbackWidget";
import { GoogleAnalytics } from "~/components/GoogleAnalytics";
import { MicrosoftClarity } from "~/components/MicrosoftClarity";
import i18n, {
  isSupportedLanguage,
  getStoredLanguagePreference,
  setStoredLanguagePreference,
} from "~/i18n";

export function Layout({ children }: { children: React.ReactNode }) {
  // Extract language from route params (if available)
  const matches = useMatches();
  const langMatch = matches.find(
    (m) => m.params && "lang" in m.params
  );
  const langFromParams =
    langMatch?.params?.lang && isSupportedLanguage(langMatch.params.lang)
      ? langMatch.params.lang
      : null;
  // When route has no lang (e.g. /chat), use stored preference; otherwise default to "tr"
  const lang =
    langFromParams ??
    (typeof globalThis.window === "undefined"
      ? "tr"
      : getStoredLanguagePreference() ?? "tr");

  // Sync i18n with URL lang so /en/agents shows English (BOTH server and client).
  // Must run synchronously before render to avoid hydration mismatch.
  if (i18n.language !== lang) {
    // eslint-disable-next-line react-hooks/immutability -- intentional sync for i18n hydration
    i18n.language = lang;
  }

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  // Persist lang when from URL params so /chat and redirects use it
  useEffect(() => {
    if (langFromParams) {
      setStoredLanguagePreference(langFromParams);
    }
  }, [langFromParams]);

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var c=document.cookie.match(/theme=([^;]+)/);var t=c?c[1]:localStorage.getItem('theme');if(!c&&t){document.cookie='theme='+t+';path=/;max-age=31536000;SameSite=Lax';}document.documentElement.classList.toggle('dark',t!=='light');})();`,
          }}
        />
      </head>
      <body>
        <ClientInit />
        <GoogleAnalytics />
        <MicrosoftClarity />
        {children}
        <GitHubFeedbackWidget />
        <CookieConsent />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
      </div>
    </div>
  );
}

export default function Root() {
  return <Outlet />;
}
