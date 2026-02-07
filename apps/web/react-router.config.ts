import type { Config } from "@react-router/dev/config";

const LANGUAGES = ["tr", "en", "de"];

export default {
  ssr: false,
  prerender: [
    "/",
    ...LANGUAGES.map((lang) => `/${lang}`),
    ...LANGUAGES.map((lang) => `/${lang}/agents`),
  ],
} satisfies Config;
