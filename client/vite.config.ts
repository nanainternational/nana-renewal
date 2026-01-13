import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// ✅ ESM 환경에서도 __dirname 사용 가능하게 처리
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ Render(또는 외부 도메인)에서 `vite preview` 실행 시
// "Blocked request. This host (...) is not allowed." 방지용 설정
const ALLOWED_HOSTS = [
  "nana-renewal-backend.onrender.com",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // ✅ 원래 프로젝트 alias 유지
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
      "@assets": path.resolve(__dirname, "..", "attached_assets"),
    },
  },
  // ✅ 원래 build 설정 유지 (client/dist)
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  // ✅ 개발 서버에서도 동일 문제가 생길 수 있어서 같이 허용
  server: {
    allowedHosts: ALLOWED_HOSTS,
  },
  // ✅ Render에서는 `vite preview`를 쓰고 있으니 preview에 반드시 설정
  preview: {
    allowedHosts: ALLOWED_HOSTS,
  },
});
