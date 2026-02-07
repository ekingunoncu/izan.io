/**
 * GDPR/CCPA cookie consent banner for Google Analytics & Ads.
 * Consent stored in localStorage; updates gtag consent state when user chooses.
 */
import { useState } from "react";
import { Link, useMatches } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { updateClarityConsent } from "~/components/MicrosoftClarity";
import { isSupportedLanguage, type SupportedLanguage } from "~/i18n";

const CONSENT_KEY = "izan_cookie_consent";

function getLangFromRoute(matches: ReturnType<typeof useMatches>): SupportedLanguage {
  const m = matches.find((r) => r.params && "lang" in r.params);
  const lang = m?.params?.lang;
  return lang && isSupportedLanguage(lang) ? lang : "en";
}

export function CookieConsent() {
  const { t } = useTranslation("common");
  const matches = useMatches();
  const lang = getLangFromRoute(matches);
  const [show, setShow] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) === null
  );

  const updateConsent = (granted: boolean) => {
    localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
    setShow(false);

    if (typeof window !== "undefined" && window.gtag && granted) {
      window.gtag("consent", "update", {
        ad_storage: "granted",
        analytics_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
      });
    }
    updateClarityConsent(granted);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 p-4 sm:p-6 shadow-lg"
      role="dialog"
      aria-label={t("cookie.bannerLabel")}
    >
      <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          {t("cookie.bannerText")}{" "}
          <Link
            to={`/${lang}/privacy`}
            className="text-primary hover:underline underline-offset-2"
          >
            {t("cookie.privacyLink")}
          </Link>
        </p>
        <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateConsent(false)}
            className="flex-1 sm:flex-none"
          >
            {t("cookie.reject")}
          </Button>
          <Button
            size="sm"
            onClick={() => updateConsent(true)}
            className="flex-1 sm:flex-none"
          >
            {t("cookie.accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
