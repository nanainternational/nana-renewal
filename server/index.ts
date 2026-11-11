import { CHINA_PURCHASE_ENABLED } from "../shared/service-visibility";
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { registerHappyCallRoutes } from "./happycall";
import { registerHappyCallAiRoutes } from "./happycall-ai";
import { registerHappyCallDispatchGuard } from "./happycall-dispatch";
import { ensureSmsTablesOnce } from "./sms-service";
import { registerCoupangCollectorRoutes } from "./coupang-collector";

const app = express();

// Pause the public landing page before static serving; preserve its route and data.
// No robots.txt Disallow: crawlers must be able to read the noindex response.
app.use(/^\/china-purchase(?:\/.*)?$/i, (_req, res, next) => {
  if (CHINA_PURCHASE_ENABLED) return next();
  return res.status(200).set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, follow" }).type("html").send(
    '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, follow"><title>서비스 준비 중 | 나나인터내셔널</title></head><body style="font-family:sans-serif;max-width:600px;margin:15vh auto;padding:24px;line-height:1.8;color:#17212b"><h1>서비스 준비 중입니다.</h1><p>현재 해당 서비스의 신규 안내와 신청을 잠시 중단했습니다.</p><p>다른 서비스는 정상적으로 이용하실 수 있습니다.</p><a href="/">홈으로 이동</a> · <a href="/logistics">3PL 안내</a> · <a href="/startup-center">공유오피스 안내</a></body></html>'
  );
});

// Removed public pages: return Gone before static files and the SPA fallback.
app.get(/^\/(?:blog|extension|education)(?:\/.*)?$/i, (_req, res) => {
  res.status(410).set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).type("html").send(
    '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>삭제된 페이지 | 나나인터내셔널</title><body style="font-family:sans-serif;max-width:600px;margin:15vh auto;padding:24px;line-height:1.8"><h1>삭제된 페이지입니다.</h1><p>이 페이지는 더 이상 제공되지 않습니다.</p><a href="/">홈으로 이동</a></body></html>'
  );
});

// 공통 미들웨어
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ===============================
// API 라우트 등록 (여기서만!)
// ===============================
registerCoupangCollectorRoutes(app);
registerHappyCallDispatchGuard(app);
registerRoutes(app);
registerHappyCallRoutes(app, ensureSmsTablesOnce);
registerHappyCallAiRoutes(app);

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

const seoByPath: Record<string, { title: string; description: string; canonical: string }> = {
  "/": {
    title: "나나인터내셔널 창업센터 | 온라인 쇼핑몰 사업 지원",
    description: "온라인 쇼핑몰 창업부터 사무공간, 3PL 물류, AI 상세페이지 제작까지 온라인 셀러의 사업 운영을 지원하는 나나인터내셔널입니다.",
    canonical: "https://nanainter.com/",
  },
  "/startup-center": {
    title: "부천 공유오피스·소호사무실 | 나나인터내셔널 창업센터",
    description: "부천에서 공유오피스와 소호사무실을 찾는 온라인 쇼핑몰 사업자를 위한 나나인터내셔널 창업센터입니다. 사무공간과 쇼핑몰 운영에 필요한 사업 지원 서비스를 함께 제공합니다.",
    canonical: "https://nanainter.com/startup-center",
  },
  "/logistics": {
    title: "쇼핑몰 3PL·물류대행 | 나나인터내셔널",
    description: "온라인 쇼핑몰 사업자를 위한 나나인터내셔널 3PL 물류 서비스입니다. 상품 보관부터 주문 처리, 포장, 택배 출고까지 쇼핑몰 물류 운영을 지원합니다.",
    canonical: "https://nanainter.com/logistics",
  },
  "/china-purchase": {
    title: "중국사입·1688 상품소싱 | 나나인터내셔널",
    description: "온라인 쇼핑몰 판매자를 위한 중국사입 및 1688 상품소싱 서비스입니다. 중국 공장 상품 확인과 사입, 현지 검수, 통관 및 국내 배송 과정을 지원합니다.",
    canonical: "https://nanainter.com/china-purchase",
  },
};

function renderSeoHtml(html: string, pathname: string) {
  const seo = seoByPath[pathname];
  if (!seo) return html;

  return html
    .replace(/<title>.*?<\/title>/, `<title>${seo.title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${seo.description}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${seo.canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${seo.title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${seo.description}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${seo.canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${seo.title}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${seo.description}" />`);
}

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-store");
    },
  }));
  // Missing build files must never fall through to the HTML page.
  app.use("/assets", (_req, res) => res.status(404).set("Cache-Control", "no-store").end());
}

// ===============================
// SPA 라우팅: /api 제외한 모든 GET은 index.html
// (React Router가 /1688, /ai-detail 등을 처리)
// ===============================
app.get(/^\/(?!api).*/, (req, res) => {
  if (fs.existsSync(indexHtml)) {
    const html = fs.readFileSync(indexHtml, "utf8");
    return res.set("Cache-Control", "no-store").type("html").send(renderSeoHtml(html, req.path));
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
