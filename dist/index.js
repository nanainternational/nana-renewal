// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/auth.ts
import { Router } from "express";
import admin from "firebase-admin";
import jwt from "jsonwebtoken";
var router = Router();
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}
var db = admin.apps.length ? admin.firestore() : null;
var JWT_SECRET = process.env.SESSION_SECRET || "your-secret-key-change-this";
function authenticateToken(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "\uC778\uC99D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
  }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uD1A0\uD070\uC785\uB2C8\uB2E4" });
  }
}
router.post("/auth/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "ID \uD1A0\uD070\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    if (!db) {
      return res.status(500).json({ message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4\uAC00 \uCD08\uAE30\uD654\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4" });
    }
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let userData;
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
        needsConsent: true
      };
      await userRef.set(userData);
    } else {
      userData = userDoc.data();
      await userRef.update({ lastLoginAt: now });
    }
    const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7일
    });
    res.json({ user: userData });
  } catch (error) {
    console.error("Google \uB85C\uADF8\uC778 \uC624\uB958:", error);
    res.status(500).json({ message: "\uB85C\uADF8\uC778 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
  }
});
async function processKakaoLogin(accessToken, res) {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const kakaoUser = await response.json();
  if (!kakaoUser.id) {
    throw new Error("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uCE74\uCE74\uC624 \uD1A0\uD070\uC785\uB2C8\uB2E4");
  }
  if (!db) {
    throw new Error("\uB370\uC774\uD130\uBCA0\uC774\uC2A4\uAC00 \uCD08\uAE30\uD654\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4");
  }
  const uid = `kakao_${kakaoUser.id}`;
  const email = kakaoUser.kakao_account?.email || "";
  const name = kakaoUser.properties?.nickname || "";
  const picture = kakaoUser.properties?.profile_image || "";
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let userData;
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
      needsConsent: true
    };
    await userRef.set(userData);
    needsConsent = true;
  } else {
    userData = userDoc.data();
    needsConsent = userData?.needsConsent || false;
    await userRef.update({ lastLoginAt: now });
  }
  const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1e3
  });
  return { userData, needsConsent };
}
router.post("/auth/kakao", async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: "\uC561\uC138\uC2A4 \uD1A0\uD070\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    const { userData } = await processKakaoLogin(accessToken, res);
    res.json({ user: userData });
  } catch (error) {
    console.error("Kakao \uB85C\uADF8\uC778 \uC624\uB958:", error);
    res.status(500).json({ message: error.message || "\uB85C\uADF8\uC778 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
  }
});
router.get("/auth/kakao/callback", async (req, res) => {
  try {
    const { code, error, error_description } = req.query;
    if (error) {
      console.error("Kakao OAuth \uC624\uB958:", error, error_description);
      return res.redirect(`/login?error=${encodeURIComponent(error_description || "\uCE74\uCE74\uC624 \uB85C\uADF8\uC778 \uC2E4\uD328")}`);
    }
    if (!code) {
      return res.redirect("/login?error=\uC778\uAC00 \uCF54\uB4DC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4");
    }
    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
    if (!KAKAO_REST_API_KEY) {
      console.error("KAKAO_REST_API_KEY\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4");
      return res.redirect("/login?error=\uC11C\uBC84 \uC124\uC815 \uC624\uB958");
    }
    const redirectUri = `${req.protocol}://${req.get("host")}/auth/kakao/callback`;
    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: KAKAO_REST_API_KEY,
        redirect_uri: redirectUri,
        code
      })
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error("Kakao \uD1A0\uD070 \uAD50\uD658 \uC624\uB958:", tokenData);
      return res.redirect(`/login?error=${encodeURIComponent(tokenData.error_description || "\uD1A0\uD070 \uAD50\uD658 \uC2E4\uD328")}`);
    }
    const { needsConsent } = await processKakaoLogin(tokenData.access_token, res);
    if (needsConsent) {
      res.redirect("/terms");
    } else {
      res.redirect("/mypage");
    }
  } catch (error) {
    console.error("Kakao \uCF5C\uBC31 \uCC98\uB9AC \uC624\uB958:", error);
    res.redirect(`/login?error=${encodeURIComponent(error.message || "\uB85C\uADF8\uC778 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4")}`);
  }
});
router.get("/api/me", authenticateToken, async (req, res) => {
  try {
    const { uid } = req.user;
    if (!db) {
      return res.status(500).json({ message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4\uAC00 \uCD08\uAE30\uD654\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4" });
    }
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    res.json({ user: userDoc.data() });
  } catch (error) {
    console.error("\uC0AC\uC6A9\uC790 \uC815\uBCF4 \uC870\uD68C \uC624\uB958:", error);
    res.status(500).json({ message: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uAC00\uC838\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
  }
});
router.post("/api/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ message: "\uB85C\uADF8\uC544\uC6C3\uB418\uC5C8\uC2B5\uB2C8\uB2E4" });
});
router.post("/api/update-consent", authenticateToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { agreeTerms, agreePrivacy, agreeMarketing } = req.body;
    if (!db) {
      return res.status(500).json({ message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4\uAC00 \uCD08\uAE30\uD654\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4" });
    }
    const updates = {
      agreeTerms,
      agreePrivacy,
      agreeMarketing,
      needsConsent: false
    };
    if (agreeMarketing) {
      updates.marketingAgreedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    await db.collection("users").doc(uid).update(updates);
    const userDoc = await db.collection("users").doc(uid).get();
    res.json({ user: userDoc.data() });
  } catch (error) {
    console.error("\uC57D\uAD00 \uB3D9\uC758 \uC5C5\uB370\uC774\uD2B8 \uC624\uB958:", error);
    res.status(500).json({ message: "\uC57D\uAD00 \uB3D9\uC758\uB97C \uC5C5\uB370\uC774\uD2B8\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
  }
});
var auth_default = router;

// server/routes.ts
import cookieParser from "cookie-parser";
async function registerRoutes(app2) {
  app2.use(cookieParser());
  app2.use(auth_default);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
