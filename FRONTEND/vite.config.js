import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // In development, /api goes to the local backend unless VITE_API_URL points elsewhere.
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
