import { createHash } from "node:crypto";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function contentSecurityPolicy(apiUrl) {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          ([, source]) => `'sha256-${createHash("sha256").update(source.replace(/\r\n?/g, "\n")).digest("base64")}'`
        );
        const api = apiUrl ? new URL(apiUrl).origin : "";
        const policy = [
          "default-src 'self'",
          ["script-src 'self'", ...inlineScripts].join(" "),
          "style-src 'self' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https://*.googleusercontent.com",
          ["connect-src 'self'", api].filter(Boolean).join(" "),
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; ");
        return html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), contentSecurityPolicy(env.VITE_API_URL || env.VITE_BACKEND_URL)],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_DEV_API_PROXY || "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false,
      target: "es2022",
    },
  };
});
