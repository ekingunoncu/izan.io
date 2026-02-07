/**
 * Google Analytics & Google Ads with Consent Mode v2.
 * - SEO: Page views, conversion tracking
 * - GDPR: Default consent denied for ad_user_data, ad_personalization in EEA
 *
 * Set VITE_GA_MEASUREMENT_ID in .env (e.g. G-XXXXXXXXXX for GA4, or AW-XXXX for Ads).
 * For Google Ads conversion tracking, use the same ID or add gtag config in Google Ads.
 */
import { useEffect } from "react";

const GA_ID = typeof import.meta !== "undefined" ? import.meta.env?.VITE_GA_MEASUREMENT_ID : undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  useEffect(() => {
    if (!GA_ID || typeof document === "undefined") return;

    // Consent Mode v2: Default denied for EU/EEA compliance (GDPR)
    // When user grants consent, call: gtag('consent', 'update', { ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted', ad_storage: 'granted' })
    window.dataLayer = window.dataLayer || [];
    const gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag = gtag;

    gtag("consent", "default", {
      ad_storage: "denied",
      analytics_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    gtag("js", new Date());
    gtag("config", GA_ID, {
      anonymize_ip: true,
      cookie_flags: "SameSite=None;Secure",
    });
  }, []);

  return null;
}
