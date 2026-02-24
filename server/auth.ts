import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import crypto from "crypto";
import { syncAdminUserByEmail } from "./order-system";

const router = Router();

// Firebase Admin 초기화
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// JWT 시크릿
const JWT_SECRET = process.env.SESSION_SECRET || "your-secret-key-change-this";
const APP_DOMAIN = (process.env.APP_DOMAIN || "nanainter.com").trim();

function resolvePublicOrigin(req: Request): string {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "https";

  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || req.get("host") || APP_DOMAIN;

  // 프록시 환경을 포함해 실제 요청 호스트 기준으로 origin 계산
  return `${protocol}://${requestHost}`;
}

function resolveEffectiveKakaoRedirectUri(req: Request, callbackPath: string): string {
  const configured = String(process.env.KAKAO_REDIRECT_URI || "").trim();
  if (configured) return configured;
  return `${resolvePublicOrigin(req)}${callbackPath}`;
}

// =======================================================
// Cart DB (Supabase Postgres via DATABASE_URL)
// - 자체 OAuth(JWT 쿠키) 기반이므로, 서버가 user.uid로 user_id를 결정해서 저장
// =======================================================
const pgPool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

function normalizeEmail(email?: string | null) {
  return (email || "").trim().toLowerCase();
}

function canonicalUserId(email?: string | null, fallbackUid?: string) {
  const e = normalizeEmail(email);
  if (!e) return fallbackUid || "";
  // 이메일 기반: 기기/로그인 Provider가 달라도 동일 사용자로 합치기
  const hex = crypto.createHash("sha256").update(e).digest("hex").slice(0, 32);
  return `email_${hex}`;
}

async function migrateCartUserId(fromUid: string, toUid: string) {
  if (!pgPool) return;
  if (!fromUid || !toUid || fromUid === toUid) return;
  try {
    await pgPool.query("UPDATE cart_items SET user_id = $1 WHERE user_id = $2", [toUid, fromUid]);
  } catch (e) {
    console.error("migrateCartUserId failed:", e);
  }
}

async function ensureCartTable() {
  if (!pgPool) return;
  // item(JSONB)에 담아서 저장하면, 추후 스키마 변경에도 안전함
  await pgPool.query(`
    create table if not exists cart_items (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      item jsonb not null,
      created_at timestamptz not null default now()
    );
    create index if not exists cart_items_user_id_idx on cart_items(user_id);
  `);
}

/** ✅ 쿠키 설정
 * - 지금은 "같은 도메인" 구조로 가는 중이므로 sameSite는 lax가 가장 안정적
 * - iOS Safari에서도 OAuth 리다이렉트 후 쿠키 저장/전송이 안정적
 */
function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true, // Render는 https라 true 고정
    sameSite: "lax", // ✅ 핵심 수정: none -> lax
    path: "/", // ✅ 핵심 추가: 경로 고정
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// 미들웨어: JWT 토큰 검증
export function authenticateToken(req: Request, res: Response, next: Function) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ ok: false, error: "not_logged_in" });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: "invalid_token" });
  }
}

// Google 로그인 - ID 토큰 검증
router.post("/auth/google", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "ID 토큰이 필요합니다" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    const provider = "google";
    const cid = canonicalUserId(email, uid);
    await migrateCartUserId(uid, cid);
    await syncAdminUserByEmail(email);

    if (!db) {
      return res
        .status(500)
        .json({ message: "데이터베이스가 초기화되지 않았습니다" });
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    const now = new Date().toISOString();
    let userData: any;

    if (!userDoc.exists) {
      userData = {
        uid,
        email: email || "",
        name: name || "",
        profileImage: picture || "",
        provider: "google",
        agreeTerms: false,
        agreePrivacy: false,
        agreeMarketing: false,
        createdAt: now,
        lastLoginAt: now,
        needsConsent: true,
      };
      await userRef.set(userData);
    } else {
      userData = userDoc.data();
      await userRef.update({ lastLoginAt: now });
    }


    const token = jwt.sign({ uid, cid, email, provider }, JWT_SECRET, { expiresIn: "7d", subject: cid });


    setAuthCookie(res, token);

    res.json({ user: userData });
  } catch (error) {
    console.error("Google 로그인 오류:", error);
    res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다" });
  }
});

router.post("/api/auth/google", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "ID 토큰이 필요합니다" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    const provider = "google";
    const cid = canonicalUserId(email, uid);
    await migrateCartUserId(uid, cid);
    await syncAdminUserByEmail(email);

    if (!db) {
      return res
        .status(500)
        .json({ message: "데이터베이스가 초기화되지 않았습니다" });
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    const now = new Date().toISOString();
    let userData: any;

    if (!userDoc.exists) {
      userData = {
        uid,
        email: email || "",
        name: name || "",
        profileImage: picture || "",
        provider: "google",
        agreeTerms: false,
        agreePrivacy: false,
        agreeMarketing: false,
        createdAt: now,
        lastLoginAt: now,
        needsConsent: true,
      };
      await userRef.set(userData);
    } else {
      userData = userDoc.data();
      await userRef.update({ lastLoginAt: now });
    }

    const token = jwt.sign({ uid, cid, email, provider }, JWT_SECRET, { expiresIn: "7d", subject: cid });

    setAuthCookie(res, token);

    res.json({ user: userData });
  } catch (error) {
    console.error("Google 로그인 오류:", error);
    res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다" });
  }
});

// Kakao 로그인 - 액세스 토큰으로 사용자 정보 처리
async function processKakaoLogin(accessToken: string, res: Response) {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const kakaoUser = await response.json();

  if (!kakaoUser.id) throw new Error("유효하지 않은 카카오 토큰입니다");
  if (!db) throw new Error("데이터베이스가 초기화되지 않았습니다");

  const uid = `kakao_${kakaoUser.id}`;
  const email = kakaoUser.kakao_account?.email || "";
  const name = kakaoUser.properties?.nickname || "";
  const picture = kakaoUser.properties?.profile_image || "";
  const provider = "kakao";
  const cid = canonicalUserId(email, uid);
  await migrateCartUserId(uid, cid);
  await syncAdminUserByEmail(email);

  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  const now = new Date().toISOString();
  let userData: any;
  let needsConsent = false;

  if (!userDoc.exists) {
    userData = {
      uid,
      email,
      name,
      phone: "",
      profileImage: picture,
      provider: "kakao",
      agreeTerms: false,
      agreePrivacy: false,
      agreeMarketing: false,
      createdAt: now,
      lastLoginAt: now,
      needsConsent: true,
    };
    await userRef.set(userData);
    needsConsent = true;
  } else {
    userData = userDoc.data();
    needsConsent = userData?.needsConsent || false;
    await userRef.update({ lastLoginAt: now });
  }

  const token = jwt.sign({ uid, cid, email, provider }, JWT_SECRET, { expiresIn: "7d", subject: cid });

  setAuthCookie(res, token);

  return { userData, needsConsent };
}

// ✅ Kakao 로그인 시작 - 서버에서 authorize URL 생성 후 리다이렉트
router.get("/api/auth/kakao", (req: Request, res: Response) => {
  const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
  
  if (!KAKAO_REST_API_KEY) {
    console.error("KAKAO_REST_API_KEY가 설정되지 않았습니다");
    return res.redirect("/login?error=서버 설정 오류");
  }

  // 고정된 redirect_uri 사용
  const redirectUri = resolveEffectiveKakaoRedirectUri(req, "/api/auth/kakao/callback");

  const authorizeUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", KAKAO_REST_API_KEY);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "profile_nickname profile_image account_email");

  console.log("[Kakao Auth] Redirecting to:", authorizeUrl.toString());
  console.log("[Kakao Auth] redirect_uri:", redirectUri);

  res.redirect(authorizeUrl.toString());
});

// 별칭 경로도 동작하도록 매칭
router.get("/auth/kakao", (req: Request, res: Response) => {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(`/api/auth/kakao${query}`);
});

// Kakao 로그인 - POST (액세스 토큰 직접 전달) - 레거시 유지
router.post("/auth/kakao", async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "액세스 토큰이 필요합니다" });
    }

    const { userData } = await processKakaoLogin(accessToken, res);
    res.json({ user: userData });
  } catch (error: any) {
    console.error("Kakao 로그인 오류:", error);
    res
      .status(500)
      .json({ message: error.message || "로그인 처리 중 오류가 발생했습니다" });
  }
});

// Kakao OAuth 콜백 - API 버전 (SPA용, JSON 반환)
router.get("/api/auth/kakao/callback", async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res
        .status(400)
        .json({ ok: false, error: "no_code", detail: "인가 코드가 없습니다" });
    }

    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
    if (!KAKAO_REST_API_KEY) {
      console.error("KAKAO_REST_API_KEY가 설정되지 않았습니다");
      return res
        .status(500)
        .json({ ok: false, error: "server_config", detail: "서버 설정 오류" });
    }

    // ✅ 핵심 수정: redirect_uri는 authorize 요청에 사용한 값과 동일해야 함
    const redirectUri = resolveEffectiveKakaoRedirectUri(req, "/api/auth/kakao/callback");

    const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;

    const tokenParams: Record<string, string> = {
      grant_type: "authorization_code",
      client_id: KAKAO_REST_API_KEY,
      redirect_uri: redirectUri,
      code: code as string,
    };

    if (KAKAO_CLIENT_SECRET) tokenParams.client_secret = KAKAO_CLIENT_SECRET;

    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: new URLSearchParams(tokenParams),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Kakao 토큰 교환 오류:", tokenData);
      return res.status(tokenResponse.status).json({
        ok: false,
        error: tokenData.error,
        detail: tokenData.error_description || "토큰 교환 실패",
      });
    }

    const { userData, needsConsent } = await processKakaoLogin(
      tokenData.access_token,
      res,
    );

    // ✅ 리다이렉트 방식으로 변경 (쿠키가 설정된 상태에서 리다이렉트)
    if (needsConsent) {
      res.redirect("/terms");
    } else {
      res.redirect("/mypage");
    }
  } catch (error: any) {
    console.error("Kakao API 콜백 처리 오류:", error);
    res.redirect(`/login?error=${encodeURIComponent(error.message || "로그인 처리 중 오류")}`);
  }
});

// Kakao OAuth 콜백 - 리다이렉트 버전(유지 가능)
router.get("/auth/kakao/callback", async (req: Request, res: Response) => {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      console.error("Kakao OAuth 오류:", error, error_description);
      return res.redirect(
        `/login?error=${encodeURIComponent(
          (error_description as string) || "카카오 로그인 실패",
        )}`,
      );
    }

    if (!code) return res.redirect("/login?error=인가 코드가 없습니다");

    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
    if (!KAKAO_REST_API_KEY) {
      console.error("KAKAO_REST_API_KEY가 설정되지 않았습니다");
      return res.redirect("/login?error=서버 설정 오류");
    }

    // ✅ 별칭 콜백 경로도 유지
    const redirectUri = resolveEffectiveKakaoRedirectUri(req, "/auth/kakao/callback");

    const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;

    const tokenParams: Record<string, string> = {
      grant_type: "authorization_code",
      client_id: KAKAO_REST_API_KEY,
      redirect_uri: redirectUri,
      code: code as string,
    };

    if (KAKAO_CLIENT_SECRET) tokenParams.client_secret = KAKAO_CLIENT_SECRET;

    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenParams),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Kakao 토큰 교환 오류:", tokenData);
      return res.redirect(
        `/login?error=${encodeURIComponent(
          tokenData.error_description || "토큰 교환 실패",
        )}`,
      );
    }

    const { needsConsent } = await processKakaoLogin(
      tokenData.access_token,
      res,
    );

    if (needsConsent) res.redirect("/terms");
    else res.redirect("/mypage");
  } catch (error: any) {
    console.error("Kakao 콜백 처리 오류:", error);
    res.redirect(
      `/login?error=${encodeURIComponent(error.message || "로그인 처리 중 오류")}`,
    );
  }
});

// 현재 사용자 정보 조회
router.get(
  "/api/me",
  async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.token;
      if (!token) {
        // ✅ 게스트 허용 (미로그인)
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Pragma", "no-cache");
        return res.json({ ok: true, user: null });
      }

      let payload: any;
      try {
        payload = jwt.verify(token, JWT_SECRET) as any;
      } catch (e) {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Pragma", "no-cache");
        return res.json({ ok: true, user: null });
      }

      const uid: string = payload?.uid || "";
      const cid: string = payload?.cid || "";

      if (!db) return res.status(500).json({ ok: false, error: "db_not_initialized" });

      // ✅ 중요: users 문서는 기존에 uid(kakao_xxx / firebase uid)로 저장되어 있을 수 있음
      // - uid 우선 조회 → 없으면 cid로 조회(향후 통합 사용자ID)
      let userDoc = uid ? await db.collection("users").doc(uid).get() : null;
      if ((!userDoc || !userDoc.exists) && cid) {
        userDoc = await db.collection("users").doc(cid).get();
      }

      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");

      if (!userDoc || !userDoc.exists) {
        // ✅ 프론트 로그인 체크 안정화를 위해 404 대신 null 반환
        return res.json({ ok: true, user: null });
      }

      return res.json({ ok: true, user: userDoc.data() });
    } catch (error) {
      console.error("사용자 정보 조회 오류:", error);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  },
);

// =======================================================
// Cart API (DB 저장)
// =======================================================
router.post("/api/cart/add", authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!pgPool) {
      return res.status(500).json({ ok: false, error: "db_not_configured" });
    }
    await ensureCartTable();

    const user: any = (req as any).user;
    const uid = user?.cid || user?.uid;
    if (!uid) return res.status(401).json({ ok: false, error: "not_logged_in" });

    const item = req.body?.item ?? req.body;
    if (!item) return res.status(400).json({ ok: false, error: "item_required" });

    const { rows } = await pgPool.query(
      "insert into cart_items(user_id, item) values ($1, $2) returning id, created_at",
      [uid, item]
    );

    res.json({ ok: true, id: rows?.[0]?.id, created_at: rows?.[0]?.created_at });
  } catch (e: any) {
    console.error("cart add error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

router.get("/api/cart", authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!pgPool) {
      return res.status(500).json({ ok: false, error: "db_not_configured" });
    }
    await ensureCartTable();

    const user: any = (req as any).user;
    const uid = user?.cid || user?.uid;
    if (!uid) return res.status(401).json({ ok: false, error: "not_logged_in" });

    const { rows } = await pgPool.query(
      "select id, item, created_at from cart_items where user_id=$1 order by created_at desc",
      [uid]
    );

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.removeHeader("ETag");

    res.json({ ok: true, items: rows });
  } catch (e: any) {
    console.error("cart list error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

router.delete("/api/cart/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!pgPool) {
      return res.status(500).json({ ok: false, error: "db_not_configured" });
    }
    await ensureCartTable();

    const user: any = (req as any).user;
    const uid = user?.cid || user?.uid;
    if (!uid) return res.status(401).json({ ok: false, error: "not_logged_in" });

    const id = String(req.params?.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "id_required" });

    await pgPool.query("delete from cart_items where id=$1 and user_id=$2", [id, uid]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("cart delete error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

router.post("/api/cart/clear", authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!pgPool) {
      return res.status(500).json({ ok: false, error: "db_not_configured" });
    }
    await ensureCartTable();

    const user: any = (req as any).user;
    const uid = user?.cid || user?.uid;
    if (!uid) return res.status(401).json({ ok: false, error: "not_logged_in" });

    await pgPool.query("delete from cart_items where user_id=$1", [uid]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("cart clear error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// 로그아웃
router.post("/api/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "lax", // ✅ 핵심 수정: none -> lax
    path: "/", // ✅ 추가
  });
  res.json({ message: "로그아웃되었습니다" });
});

// 약관 동의 업데이트
router.post(
  "/api/update-consent",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.token;
      if (!token) {
        // ✅ 게스트 허용 (미로그인)
        return res.json({ ok: true, user: null });
      }

      let uid: string;
      try {
        const user: any = jwt.verify(token, JWT_SECRET);
        uid = user?.cid || user?.uid;
      } catch (e) {
        return res.json({ ok: true, user: null });
      }
      const { agreeTerms, agreePrivacy, agreeMarketing } = req.body;

      if (!db)
        return res
          .status(500)
          .json({ message: "데이터베이스가 초기화되지 않았습니다" });

      const updates: any = {
        agreeTerms,
        agreePrivacy,
        agreeMarketing,
        needsConsent: false,
      };
      if (agreeMarketing) updates.marketingAgreedAt = new Date().toISOString();

      await db.collection("users").doc(uid).update(updates);

      const userDoc = await db.collection("users").doc(uid).get();
      res.json({ user: userDoc.data() });
    } catch (error) {
      console.error("약관 동의 업데이트 오류:", error);
      res.status(500).json({ message: "약관 동의를 업데이트할 수 없습니다" });
    }
  },
);

export default router;
