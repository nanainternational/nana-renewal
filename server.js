import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import vvicRouter from "./server_vvic.js";
import a1688Router from "./server_1688.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.disable("etag");
app.set("etag", false);

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ 라우터 분리
app.use("/api/vvic", vvicRouter);
app.use("/api/1688", a1688Router);

// ✅ /api/me는 항상 JSON(프론트 크래시 방지)
app.get("/api/me", (req, res) => {
  res.status(200).json({ ok: false, error: "not_logged_in" });
});

// ✅ 정적 경로 자동 탐지: client/dist 우선, 없으면 dist
const clientDistA = path.join(__dirname, "client", "dist");
const clientDistB = path.join(__dirname, "dist");

const clientDist = fs.existsSync(path.join(clientDistA, "index.html"))
  ? clientDistA
  : clientDistB;

app.use(express.static(clientDist));

// ✅ /api/*는 절대 index.html로 보내지 않기
app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, error: "api_not_found", path: req.originalUrl });
});

// ✅ SPA fallback
app.get("*", (req, res) => {
  const indexPath = path.join(clientDist, "index.html");
  if (!fs.existsSync(indexPath)) {
    return res.status(500).send(
      `index.html not found. looked at: ${indexPath}\n` +
      `hint: Render Build Command에 "npm run build"를 포함해야 합니다.`
    );
  }
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Serving static from: ${clientDist}`);
});
