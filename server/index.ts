import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";

const app = express();

// 공통 미들웨어
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 라우트 등록 (여기서만!)
const httpServer = registerRoutes(app);

// 서버 시작
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
