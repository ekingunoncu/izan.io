import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Local MCP proxy middleware (dev only).
 *
 * In production the Lambda at /api/proxy/mcp handles CORS-bypass proxying.
 * In dev, the Lambda can't reach localhost servers, so we replicate the same
 * logic here: parse X-MCP-Proxy-Target (base64 JSON → {url, headers}),
 * forward the request, and pipe the response back.
 */
function mcpProxyMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  if (req.url !== "/api/proxy/mcp") return next();

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": req.headers.origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Accept, MCP-Protocol-Version, Mcp-Session-Id, X-MCP-Proxy-Target",
    });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  // Read body
  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", async () => {
    const body = Buffer.concat(chunks).toString("utf-8");
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": req.headers.origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Accept, MCP-Protocol-Version, Mcp-Session-Id, X-MCP-Proxy-Target",
    };

    // Parse target from header
    const targetRaw =
      req.headers["x-mcp-proxy-target"] as string | undefined;
    if (!targetRaw) {
      res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Missing X-MCP-Proxy-Target header" }),
      );
      return;
    }

    let target: { url: string; headers?: Record<string, string> };
    try {
      target = JSON.parse(Buffer.from(targetRaw, "base64").toString("utf-8"));
      if (!target.url?.startsWith("http")) throw new Error("bad url");
    } catch {
      res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Invalid X-MCP-Proxy-Target header" }),
      );
      return;
    }

    // Build headers to forward
    const fwdHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(target.headers || {}),
    };
    const forwardKeys = [
      "mcp-protocol-version",
      "mcp-session-id",
      "authorization",
    ];
    for (const k of forwardKeys) {
      const v = req.headers[k];
      if (typeof v === "string") fwdHeaders[k] = v;
    }

    try {
      const upstream = await fetch(target.url, {
        method: "POST",
        headers: fwdHeaders,
        body,
      });

      const resBody = await upstream.text();
      const resHeaders: Record<string, string> = { ...corsHeaders };
      const ct = upstream.headers.get("content-type");
      if (ct) resHeaders["Content-Type"] = ct;
      const sessionId = upstream.headers.get("mcp-session-id");
      if (sessionId) resHeaders["Mcp-Session-Id"] = sessionId;

      res.writeHead(upstream.status, resHeaders);
      res.end(resBody);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[dev-proxy-mcp] Error:", message);
      res.writeHead(502, { ...corsHeaders, "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: `Proxy error: ${message}` },
        }),
      );
    }
  });
}

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom", "react-router"],
  },
  server: {
    proxy: {
      // Proxy /api to production (proxy-mcp, github-stars). Same-origin in prod.
      // Note: /api/proxy/mcp is handled by the local middleware below (runs first).
      "/api": {
        target: "https://izan.io",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    // Silence Chrome DevTools .well-known requests in dev
    {
      name: "silence-well-known",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith("/.well-known/")) {
            res.statusCode = 404;
            res.end();
            return;
          }
          next();
        });
      },
    },
    // Local MCP proxy — must run before the /api proxy catches it
    {
      name: "dev-mcp-proxy",
      configureServer(server) {
        server.middlewares.use(mcpProxyMiddleware);
      },
    },
    tailwindcss(),
    reactRouter(),
    tsconfigPaths({ root: import.meta.dirname }),
  ],
});
