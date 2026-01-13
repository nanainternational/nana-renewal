import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Render(또는 외부 도메인)에서 `vite preview` 실행 시
// "Blocked request. This host (...) is not allowed." 방지용 설정
const ALLOWED_HOSTS = [
  "nana-renewal-backend.onrender.com",
  "nana-renewal-backend.onrender.com", // (오타 방지용 동일값, 유지해도 무방)
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 개발 서버에서도 동일 문제가 생길 수 있어서 같이 허용
  server: {
    allowedHosts: ALLOWED_HOSTS,
  },
  // Render에서는 `vite preview`를 쓰고 있으니 preview에 반드시 설정
  preview: {
    allowedHosts: ALLOWED_HOSTS,
  },
});
