import type { Express } from "express";
import { createServer, type Server } from "http";

// 라우터(기능별 분리)
import vvicRouter, { apiAiGenerate, apiExtract, apiStitch } from "./vvic";
import alibaba1688Router from "./1688";

export function registerRoutes(app: Express): Server {
  // 헬스/세션(프론트에서 /api/me 호출하는 경우가 있어서 404 방지)
  app.get("/api/me", (_req, res) => {
    return res.json({ ok: true, user: null });
  });

  // VVIC: 예전처럼 extract는 vvic.ts의 apiExtract를 그대로 사용(가장 안정적)
  app.get("/api/vvic/extract", apiExtract);

  // VVIC: AI/스티치
  app.post("/api/vvic/ai", apiAiGenerate);
  app.post("/api/vvic/stitch", apiStitch);

  // (추가) vvicRouter에 다른 경로가 있을 수 있으니 유지
  app.use("/api/vvic", vvicRouter);

  // 1688 API 라우터
  app.use("/api/1688", alibaba1688Router);

  // API 404(JSON)
  app.use("/api", (req, res) => {
    return res.status(404).json({ ok: false, error: "api_not_found", path: req.path });
  });

  return createServer(app);
}
