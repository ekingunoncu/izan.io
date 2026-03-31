import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  // Root: detect browser language and redirect to /:lang
  index("routes/lang-redirect.tsx"),

  // Language-prefixed routes (prerendered)
  route(":lang", "routes/lang-layout.tsx", [
    index("routes/home.tsx"),
    route("docs", "routes/docs-layout.tsx", [
      index("routes/docs-index.tsx"),
      route(":slug", "routes/docs-page.tsx"),
    ]),
    route("privacy", "routes/privacy.tsx"),
    route("terms", "routes/terms.tsx"),
  ]),
] satisfies RouteConfig;
