import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";

const app = express();

// 공통 미들웨어
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ===============================
// API 라우트 등록 (여기서만!)
// ===============================
registerRoutes(app);

// ===============================
// 프론트 정적 파일 서빙 (Vite build 결과)
// - npm --prefix client run build => client/dist
// - root vite build              => dist/public
// Render 설정이 어느 build path를 만들든 동일하게 서빙합니다.
// ===============================
const clientDistCandidates = [
  path.resolve(process.cwd(), "client", "dist"),
  path.resolve(process.cwd(), "dist", "public"),
  path.resolve(process.cwd(), "server", "public"),
];
const clientDist = clientDistCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "index.html")),
) || clientDistCandidates[0];
const indexHtml = path.join(clientDist, "index.html");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// ===============================
// SPA 라우팅: /api 제외한 모든 GET은 index.html
// (React Router가 /1688, /ai-detail 등을 처리)
// ===============================
app.get(/^\/(?!api).*/, (req, res) => {
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  return res.status(404).send("Client build not found. Run client build first.");
});

// 서버 시작
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 clientDist: ${clientDist}`);
});
