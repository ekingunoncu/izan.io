import type { Config } from "@react-router/dev/config";

const LANGS = ["en", "tr", "de"];

export default {
  ssr: false,
  prerender: [
    "/",
    ...LANGS.map((l) => `/${l}`),
    ...LANGS.map((l) => `/${l}/tools`),
    ...LANGS.map((l) => `/${l}/submit`),
  ],
} satisfies Config;
