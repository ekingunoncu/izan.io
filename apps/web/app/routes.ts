import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  // Root: detect browser language and redirect to /:lang
  index("routes/lang-redirect.tsx"),

  // Language-prefixed routes (prerendered)
  route(":lang", "routes/lang-layout.tsx", [
    index("routes/home.tsx"),
    route("agents", "routes/agents-layout.tsx", [
      index("routes/agents.tsx"),
      route(":agentSlug", "routes/agent-detail.tsx"),
    ]),
    route("docs", "routes/docs-layout.tsx", [
      index("routes/docs-index.tsx"),
      route(":slug", "routes/docs-page.tsx"),
    ]),
    route("settings", "routes/settings.tsx"),
    route("analytics", "routes/analytics.tsx"),
    route("privacy", "routes/privacy.tsx"),
    route("terms", "routes/terms.tsx"),
  ]),

  // Chat: client-only, no language prefix. /chat for default, /chat/:agentSlug for shareable links
  route("chat", "routes/chat-layout.tsx", { id: "routes/chat-layout" }, [
    index("routes/chat.tsx", { id: "routes/chat-index" }),
    route(":agentSlug", "routes/chat.tsx", { id: "routes/chat-agent" }),
  ]),

] satisfies RouteConfig;
