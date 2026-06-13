import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isReplitDev = process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined;

export default defineConfig({
  plugins: [
    react(),
    ...(isReplitDev
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default(),
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      "onnxruntime-web/webgpu": "onnxruntime-web",
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react") || id.includes("wouter")) return "react-vendor";
          if (id.includes("@radix-ui") || id.includes("lucide-react")) return "ui-vendor";
          if (id.includes("firebase")) return "firebase-vendor";
          if (id.includes("recharts")) return "charts-vendor";
          if (id.includes("@imgly") || id.includes("@mediapipe")) return "image-tools";
          if (id.includes("jszip") || id.includes("file-saver")) return "download-tools";
          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
