import express from "express";

const router = express.Router();

/* ===== 1688 추출 (DOM 기반) ===== */
router.get("/extract", async (req, res) => {
  const { html } = req.query;

  if (!html) {
    return res.status(400).json({
      ok: false,
      error: "NO_HTML_PROVIDED",
    });
  }

  try {
    const re = /(https?:\/\/img\d*\.alicdn\.com\/[^"'\\s>]+)/gi;
    const matches = html.match(re) || [];

    const images = [...new Set(matches)];

    res.json({
      ok: true,
      main_images: images,
      detail_images: images,
      counts: {
        total: images.length,
      },
    });
  } catch (err) {
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
    message: "1688 router alive",
  });
});

export default router;
