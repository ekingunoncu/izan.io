import type { Config } from "@react-router/dev/config";
import { BUILTIN_AGENT_DEFINITIONS } from "@izan/agents";

const LANGUAGES = ["tr", "en", "de"];
const AGENT_SLUGS = BUILTIN_AGENT_DEFINITIONS.map((a) => a.slug);

export default {
  ssr: false,
  prerender: [
    "/",
    ...LANGUAGES.map((lang) => `/${lang}`),
    ...LANGUAGES.map((lang) => `/${lang}/agents`),
    ...LANGUAGES.flatMap((lang) =>
      AGENT_SLUGS.map((slug) => `/${lang}/agents/${slug}`)
    ),
    ...LANGUAGES.map((lang) => `/${lang}/privacy`),
    ...LANGUAGES.map((lang) => `/${lang}/terms`),
  ],
} satisfies Config;
