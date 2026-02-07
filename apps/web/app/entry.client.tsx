import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { initTheme } from "~/lib/theme";
import i18n, { isSupportedLanguage } from "~/i18n";

initTheme();

// Set i18n language from URL before first render (e.g. /en/agents → English)
const pathLang = globalThis.location?.pathname?.split("/")[1];
if (pathLang && isSupportedLanguage(pathLang)) {
  i18n.changeLanguage(pathLang);
}

startTransition(() => {
  hydrateRoot(document, <HydratedRouter />);
});
