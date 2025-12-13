import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// ✅ API 캐시(ETag)로 304 떨어지는 문제 방지
app.set("etag", false);
app.disable("etag");

// CORS 설정 (API 서비스 분리 시 필요)
const allowedOrigins = [
  "http://localhost:5000",
  "http://localhost:3000",
  "https://nana-renewal.onrender.com",
  process.env.CORS_ORIGIN, // 추가 origin 설정 가능
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // 같은 origin 요청 또는 허용된 origin인 경우 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// API 캐시 금지 미들웨어 (Cloudflare CDN 포함)
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.removeHeader("ETag");
  }
  next();
});

// 미들웨어 설정
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// API 요청에 대한 로깅 설정
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// 라우터 등록
(async () => {
  const server = await registerRoutes(app);

  // 에러 핸들링
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // 개발 환경에서 vite 설정
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);  // 정적 파일 서비스
  }

  // 서버 시작
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
