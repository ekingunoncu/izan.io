import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  // Root: detect language and redirect to /:lang
  index("routes/lang-redirect.tsx"),

  // Language-prefixed routes
  route(":lang", "routes/lang-layout.tsx", [
    index("routes/home.tsx"),
    route("agents", "routes/agents.tsx"),
    route("agents/:slug", "routes/agent-detail.tsx"),
    route("submit", "routes/submit.tsx"),
  ]),

  // Auth callback (no lang prefix)
  route("auth/callback", "routes/auth-callback.tsx"),
] satisfies RouteConfig;
