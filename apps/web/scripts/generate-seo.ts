/**
 * Auto-generates robots.txt and sitemap.xml for SEO.
 * Run before build: npm run generate:seo
 *
 * Set PUBLIC_SITE_URL in .env (e.g. https://izan.io) for production.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BUILTIN_AGENT_DEFINITIONS } from "@izan/agents";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LANGUAGES = ["tr", "en", "de"] as const;
const DEFAULT_LANG = "en";

/** Built-in agent slugs for sitemap (from packages/agents) */
const AGENT_SLUGS = BUILTIN_AGENT_DEFINITIONS.map((a) => a.slug);

/** Routes to include in sitemap (under :lang). Excludes chat (client-only), settings (private). */
const SITEMAP_ROUTES = [
  { path: "", priority: 1.0, changefreq: "weekly" as const },
  { path: "agents", priority: 0.8, changefreq: "weekly" as const },
  { path: "privacy", priority: 0.6, changefreq: "monthly" as const },
  { path: "terms", priority: 0.6, changefreq: "monthly" as const },
];

const SITE_URL =
  process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || "https://izan.io";

function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function generateSitemapXml(): string {
  const urls: string[] = [];

  for (const route of SITEMAP_ROUTES) {
    for (const lang of LANGUAGES) {
      const loc = `${SITE_URL}/${lang}${route.path ? `/${route.path}` : ""}`;

      const alternateLinks = LANGUAGES.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}/${l}${route.path ? `/${route.path}` : ""}" />`
      ).join("\n");
      const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/${DEFAULT_LANG}${route.path ? `/${route.path}` : ""}" />`;

      urls.push(`  <url>
    <loc>${loc}</loc>
${alternateLinks}
${xDefault}
    <priority>${route.priority}</priority>
    <changefreq>${route.changefreq}</changefreq>
  </url>`);
    }
  }

  // Agent detail pages: /:lang/agents/:agentSlug
  for (const slug of AGENT_SLUGS) {
    const path = `agents/${slug}`;
    for (const lang of LANGUAGES) {
      const loc = `${SITE_URL}/${lang}/${path}`;
      const alternateLinks = LANGUAGES.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}/${l}/${path}" />`
      ).join("\n");
      const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/${DEFAULT_LANG}/${path}" />`;
      urls.push(`  <url>
    <loc>${loc}</loc>
${alternateLinks}
${xDefault}
    <priority>0.7</priority>
    <changefreq>weekly</changefreq>
  </url>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

${urls.join("\n\n")}

</urlset>
`;
}

function main() {
  const publicDir = path.resolve(__dirname, "../public");

  const robotsTxt = generateRobotsTxt();
  const sitemapXml = generateSitemapXml();

  fs.writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf-8");
  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf-8");

  console.log("Generated public/robots.txt and public/sitemap.xml");
  console.log("Site URL:", SITE_URL);
}

main();
