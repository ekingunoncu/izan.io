import type { Config } from "@react-router/dev/config";

const LANGS = ["en", "tr", "de"];

export default {
  ssr: false,
  prerender: [
    "/",
    ...LANGS.map((l) => `/${l}`),
    ...LANGS.map((l) => `/${l}/agents`),
    ...LANGS.map((l) => `/${l}/submit`),
    "/auth/callback",
  ],
} satisfies Config;
