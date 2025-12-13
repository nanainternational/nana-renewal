import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import jwt from "jsonwebtoken";

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

/** ✅ 쿠키 설정(중복 제거)
 * - 프론트(정적) ↔ 백엔드(웹서비스) 분리된 상태에서는 cross-site 쿠키가 필요
 * - sameSite: "none" + secure: true 세트
 */
function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true, // Render는 https라 true 고정 권장
    sameSite: "none", // ⭐ 핵심: cross-site fetch에서도 쿠키 전송
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

    const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: "7d" });

    // ✅ 쿠키 저장(수정)
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

  const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: "7d" });

  // ✅ 쿠키 저장(수정)
  setAuthCookie(res, token);

  return { userData, needsConsent };
}

// Kakao 로그인 - POST (액세스 토큰 직접 전달)
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

    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const redirectUri =
      process.env.KAKAO_REDIRECT_URI ||
      `${protocol}://${req.get("host")}/auth/kakao/callback`;

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

    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, user: userData, needsConsent });
  } catch (error: any) {
    console.error("Kakao API 콜백 처리 오류:", error);
    res
      .status(500)
      .json({
        ok: false,
        error: "exception",
        detail: error.message || "로그인 처리 중 오류",
      });
  }
});

// Kakao OAuth 콜백 - 인가 코드로 토큰 교환 (리다이렉트 버전)
router.get("/auth/kakao/callback", async (req: Request, res: Response) => {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      console.error("Kakao OAuth 오류:", error, error_description);
      return res.redirect(
        `/login?error=${encodeURIComponent((error_description as string) || "카카오 로그인 실패")}`,
      );
    }

    if (!code) return res.redirect("/login?error=인가 코드가 없습니다");

    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
    if (!KAKAO_REST_API_KEY) {
      console.error("KAKAO_REST_API_KEY가 설정되지 않았습니다");
      return res.redirect("/login?error=서버 설정 오류");
    }

    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const redirectUri = `${protocol}://${req.get("host")}/auth/kakao/callback`;
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
        `/login?error=${encodeURIComponent(tokenData.error_description || "토큰 교환 실패")}`,
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
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { uid } = (req as any).user;

      if (!db)
        return res.status(500).json({ ok: false, error: "db_not_initialized" });

      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists)
        return res.status(404).json({ ok: false, error: "user_not_found" });

      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");
      res.removeHeader("ETag");

      res.json({ ok: true, user: userDoc.data() });
    } catch (error) {
      console.error("사용자 정보 조회 오류:", error);
      res.status(500).json({ ok: false, error: "server_error" });
    }
  },
);

// 로그아웃
router.post("/api/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ message: "로그아웃되었습니다" });
});

// 약관 동의 업데이트
router.post(
  "/api/update-consent",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { uid } = (req as any).user;
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
