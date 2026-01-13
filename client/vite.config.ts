import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Render(또는 외부 도메인)에서 `vite preview` 실행 시
// "Blocked request. This host (...) is not allowed." 방지
const ALLOWED_HOSTS = [
  "nana-renewal-backend.onrender.com",
  "nana-renewal-backend.onrender.com",
  "localhost",
  "127.0.0.1",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "..", "shared"),
      "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    allowedHosts: ALLOWED_HOSTS,
  },
  preview: {
    allowedHosts: ALLOWED_HOSTS,
    host: "0.0.0.0",
    port: Number(process.env.PORT || 4173),
  },
});
