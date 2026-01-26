import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import vvicRouter from "./server_vvic.js";
import a1688Router from "./server_1688.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== 기본 미들웨어 ===== */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ===== API 라우터 연결 ===== */
app.use("/api/vvic", vvicRouter);
app.use("/api/1688", a1688Router);

/* ===== 정적 파일 ===== */
app.use(express.static(path.join(__dirname, "dist")));

/* ===== API 404 방어 ===== */
app.use("/api", (req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_NOT_FOUND",
    path: req.originalUrl,
  });
});

/* ===== SPA fallback ===== */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

/* ===== 서버 시작 ===== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
