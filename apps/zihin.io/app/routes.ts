import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  // Root: detect language and redirect to /:lang
  index("routes/lang-redirect.tsx"),

  // Language-prefixed routes
  route(":lang", "routes/lang-layout.tsx", [
    index("routes/home.tsx"),
    route("tools", "routes/tools.tsx"),
    route("tools/:slug", "routes/tool-detail.tsx"),
    route("submit", "routes/submit.tsx"),
  ]),

] satisfies RouteConfig;
