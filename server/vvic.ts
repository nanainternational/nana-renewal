import express from "express";
import { chromium } from "playwright";

const router = express.Router();

// GET /api/vvic/extract
router.get("/extract", async (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) {
    return res.status(400).json({ ok: false, error: "url_required" });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });

    // 👉 여기 아래는 네가 이미 만든
    // 스크롤 / 이미지 / 비디오 추출 로직 그대로 사용
    // (수정 불필요)

    return res.json({
      ok: true,
      main_images: [],
      detail_images: [],
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e?.message || String(e),
    });
  } finally {
    try {
      await browser?.close();
    } catch {}
  }
});

export default router;
