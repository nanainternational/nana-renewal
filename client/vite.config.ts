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
  },
  preview: {
    host: true,
    allowedHosts: [".onrender.com", "nana-renewal-backend.onrender.com"],
  },
});
