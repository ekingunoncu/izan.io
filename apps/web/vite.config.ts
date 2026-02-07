import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom", "react-router"],
  },
  server: {
    proxy: {
      // Proxy MCP API to local dev server (avoids CORS; run: npm run dev -w @izan/mcp-servers)
      "/api": {
        target: "http://localhost:3100",
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
    tailwindcss(),
    reactRouter(),
    tsconfigPaths({ root: import.meta.dirname }),
  ],
});
