import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Dev-only middleware: exchanges GitHub OAuth code for access token.
 * In production, deploy a small serverless function for this.
 */
function githubAuthMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  if (req.url !== "/api/auth/token" || req.method !== "POST") return next();

  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", async () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
      const tokenRes = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: process.env.VITE_GITHUB_CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET_GITHUB,
            code: body.code,
          }),
        }
      );
      const data = await tokenRes.json();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    } catch {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Token exchange failed" }));
    }
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.VITE_GITHUB_CLIENT_ID = env.VITE_GITHUB_CLIENT_ID;
  process.env.CLIENT_SECRET_GITHUB = env.CLIENT_SECRET_GITHUB;

  return {
    server: {
      port: 3001,
    },
    plugins: [
      {
        name: "github-auth-proxy",
        configureServer(server) {
          server.middlewares.use(githubAuthMiddleware);
        },
      },
      tailwindcss(),
      reactRouter(),
      tsconfigPaths({ root: import.meta.dirname }),
    ],
  };
});
