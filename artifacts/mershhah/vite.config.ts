import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;
const basePath = process.env.BASE_PATH ?? "/";
const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...(!isProd && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default()
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            })
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner()
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets"
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react-is/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("/node_modules/@tanstack/")) {
            return "vendor-query";
          }
          if (id.includes("/node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          if (
            id.includes("/node_modules/recharts") ||
            id.includes("/node_modules/d3-") ||
            id.includes("/node_modules/victory-") ||
            id.includes("/node_modules/d3/")
          ) {
            return "vendor-charts";
          }
          if (id.includes("/node_modules/framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("/node_modules/date-fns")) {
            return "vendor-date";
          }
          if (id.includes("/node_modules/lucide-react")) {
            return "vendor-icons";
          }
          if (
            id.includes("/node_modules/@radix-ui/") ||
            id.includes("/node_modules/cmdk") ||
            id.includes("/node_modules/vaul")
          ) {
            return "vendor-ui";
          }
          if (
            id.includes("/node_modules/react-hook-form") ||
            id.includes("/node_modules/zod") ||
            id.includes("/node_modules/@hookform/")
          ) {
            return "vendor-forms";
          }
          if (id.includes("/node_modules/")) {
            return "vendor-misc";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
