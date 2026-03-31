import type { Config } from "@react-router/dev/config";

const LANGUAGES = ["tr", "en", "de"];

// Doc slugs inlined here because react-router typegen can't import local .ts
const DOC_SLUGS = [
  "getting-started",
  "chrome-extension",
  "tools",
  "bridge",
  "marketplace",
];

export default {
  ssr: false,
  prerender: [
    "/",
    ...LANGUAGES.map((lang) => `/${lang}`),
    ...LANGUAGES.map((lang) => `/${lang}/docs`),
    ...LANGUAGES.flatMap((lang) =>
      DOC_SLUGS.map((slug) => `/${lang}/docs/${slug}`)
    ),
    ...LANGUAGES.map((lang) => `/${lang}/privacy`),
    ...LANGUAGES.map((lang) => `/${lang}/terms`),
  ],
} satisfies Config;
