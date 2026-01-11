import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import authRouter from "./auth";
import { vvicRouter } from "./vvic";
import cookieParser from "cookie-parser";

export async function registerRoutes(app: Express): Promise<Server> {
  // 쿠키 파서 추가
  app.use(cookieParser());

  // 인증 라우트 등록
  app.use(authRouter);

  // VVIC 도구 API
  app.use("/api/vvic", vvicRouter);

  const httpServer = createServer(app);  // HTTP 서버 생성

  return httpServer;
}
