/**
 * Microsoft Clarity - session replays, heatmaps, insights.
 * Consent: respects izan_cookie_consent from CookieConsent banner.
 *
 * Set VITE_CLARITY_PROJECT_ID in .env (from clarity.microsoft.com > Settings > Overview).
 */
import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

const CLARITY_ID =
  typeof import.meta !== "undefined" ? import.meta.env?.VITE_CLARITY_PROJECT_ID : undefined;

const CONSENT_KEY = "izan_cookie_consent";

export function MicrosoftClarity() {
  useEffect(() => {
    if (!CLARITY_ID || typeof document === "undefined") return;

    const stored = localStorage.getItem(CONSENT_KEY);
    const granted = stored === "granted";

    Clarity.init(CLARITY_ID);
    Clarity.consentV2({
      ad_Storage: granted ? "granted" : "denied",
      analytics_Storage: granted ? "granted" : "denied",
    });
  }, []);

  return null;
}

/**
 * Call from CookieConsent when user grants/denies.
 * Exported for use in CookieConsent.
 */
export function updateClarityConsent(granted: boolean) {
  try {
    Clarity.consentV2({
      ad_Storage: granted ? "granted" : "denied",
      analytics_Storage: granted ? "granted" : "denied",
    });
  } catch {
    // Clarity may not be loaded yet
  }
}
