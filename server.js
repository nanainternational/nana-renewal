import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(
  cors({
    origin: "https://nana-renewal.onrender.com",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// API 예시
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ 프론트 정적 파일 서빙
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));

// ✅ SPA fallback (React Router 대응)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
