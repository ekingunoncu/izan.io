import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
} from "react-router";
import { useEffect } from "react";

import "./index.css";
import { Header } from "~/components/layout/header";
import { Footer } from "~/components/layout/footer";
import { TooltipProvider } from "~/components/ui/tooltip";
import i18n, {
  isSupportedLanguage,
  getStoredLanguagePreference,
  setStoredLanguagePreference,
} from "~/i18n";

export function Layout({ children }: { children: React.ReactNode }) {
  const matches = useMatches();
  const langMatch = matches.find((m) => m.params && "lang" in m.params);
  const langFromParams =
    langMatch?.params?.lang && isSupportedLanguage(langMatch.params.lang)
      ? langMatch.params.lang
      : null;

  const lang =
    langFromParams ??
    (typeof globalThis.window === "undefined"
      ? "en"
      : getStoredLanguagePreference() ?? "en");

  if (i18n.language !== lang) {
    i18n.language = lang;
  }

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  useEffect(() => {
    if (langFromParams) {
      setStoredLanguagePreference(langFromParams);
    }
  }, [langFromParams]);

  return (
    <html lang={lang} className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <meta property="og:site_name" content="zihin.io" />
        <meta property="og:image" content="https://zihin.io/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://zihin.io/og-image.png" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen antialiased">
        <TooltipProvider delayDuration={300}>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </TooltipProvider>
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
      </div>
    </div>
  );
}

export default function Root() {
  return <Outlet />;
}
