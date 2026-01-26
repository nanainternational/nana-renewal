import express from "express";
import { chromium } from "playwright";

const router = express.Router();

/* ===== VVIC 이미지 추출 ===== */
router.get("/extract", async (req, res) => {
  const { url } = req.query;

  if (!url || !url.includes("vvic.com")) {
    return res.status(400).json({
      ok: false,
      error: "INVALID_VVIC_URL",
    });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // 이미지 수집
    const images = await page.evaluate(() => {
      const urls = new Set();

      document.querySelectorAll("img").forEach(img => {
        let src = img.getAttribute("src") || img.getAttribute("data-src");
        if (!src) return;

        if (src.startsWith("//")) src = "https:" + src;
        if (!src.startsWith("http")) return;

        if (src.includes("vvic.com")) {
          urls.add(src.split("?")[0]);
        }
      });

      return Array.from(urls);
    });

    await browser.close();

    res.json({
      ok: true,
      url,
      main_images: images,
      detail_images: images,
      counts: {
        total: images.length,
        main: images.length,
        detail: images.length,
      },
    });
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/* ===== 디버그 ===== */
router.get("/_debug", (req, res) => {
  res.json({
    ok: true,
    message: "VVIC router alive",
  });
});

export default router;
