import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import authRouter from "./auth";
import cookieParser from "cookie-parser";

export async function registerRoutes(app: Express): Promise<Server> {
  // 쿠키 파서 추가
  app.use(cookieParser());

  // 인증 라우트 등록
  app.use(authRouter);  // authRouter를 app에 등록

  // 기본 API 경로 추가 (예: /api/me)
  app.get('/api/me', (req, res) => {
    // 유저 정보 반환 (예시)
    res.json({ user: 'example_user_info' });
  });

  const httpServer = createServer(app);  // HTTP 서버 생성

  return httpServer;
}
