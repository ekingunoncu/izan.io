import type { Config } from "@react-router/dev/config";

const LANGUAGES = ["tr", "en", "de"];
const AGENT_SLUGS = ["general", "web-search", "domain-expert"];

export default {
  ssr: false,
  prerender: [
    "/",
    ...LANGUAGES.map((lang) => `/${lang}`),
    ...LANGUAGES.map((lang) => `/${lang}/agents`),
    ...LANGUAGES.flatMap((lang) =>
      AGENT_SLUGS.map((slug) => `/${lang}/agents/${slug}`)
    ),
  ],
} satisfies Config;
