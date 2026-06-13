import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "..", "shared"),
      "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
      "onnxruntime-web/webgpu": "onnxruntime-web",
    },
  },
  build: {
    outDir: "dist",
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
  preview: {
    host: true,
    allowedHosts: [".onrender.com", "nana-renewal-backend.onrender.com"],
  },
});
