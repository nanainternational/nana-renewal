import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ✅ 파일 분리된 라우터 불러오기
import vvicRouter from "./server_vvic.js";
// import a1688Router from "./server_1688.js"; // 1688 파일이 있다면 주석 해제

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.disable("etag");
app.set("etag", false);

// ✅ CORS 및 기본 설정
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ==================================================================
// 🚀 라우터 연결 (분리된 파일들)
// ==================================================================
app.use("/api/vvic", vvicRouter); // VVIC 요청은 server_vvic.js로!
// app.use("/api/1688", a1688Router); // 1688 요청은 server_1688.js로!

// 1688 확장프로그램용 (기존 로직 유지 필요시)
app.post("/api/1688/extract_client", (req, res) => {
    // ... 기존 1688 로직 ...
    // (1688 파일도 server_1688.js로 완전히 옮기셨다면 이 부분은 삭제해도 됩니다)
    // 일단 에러 방지를 위해 간단한 응답만 남겨둡니다.
    res.json({ ok: true, message: "1688은 server_1688.js를 사용하세요" });
});


// ✅ 헬스 체크
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ✅ 프론트엔드 연결 (client/dist)
const clientDist = path.join(__dirname, "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    // API 요청은 index.html을 주면 안됨
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "API Not Found" });
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  console.log("⚠️ client/dist 폴더가 없습니다. 빌드가 필요합니다.");
}

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
