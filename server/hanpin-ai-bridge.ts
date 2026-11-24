import type { Express } from "express";
import crypto from "node:crypto";

// Private service-to-service bridge. Keeps the existing Nana OpenAI key only on Nana.
export function registerHanpinAiBridge(app: Express) {
  app.post("/api/internal/hanpin-ai-proxy", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const expected = process.env.HANPIN_NANA_AI_SHARED_SECRET || "";
    const supplied = String(req.headers.authorization || "").replace(/^Bearer /, "");
    const left = Buffer.from(supplied), right = Buffer.from(expected);
    if (expected.length < 40 || left.length !== right.length ||
        !crypto.timingSafeEqual(left, right)) {
      return res.status(403).json({ ok: false, error: "forbidden" });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ ok: false, error: "nana_openai_key_missing" });
    }

    const data = req.body;
    const candidatesText = data?.input?.[1]?.content;
    if (data?.model !== "gpt-6-luna" || data?.store !== false ||
        !Number.isInteger(data?.max_output_tokens) || data.max_output_tokens > 1600 ||
        data.max_output_tokens < 1 || data?.reasoning?.effort !== "low" ||
        !Array.isArray(data?.input) || data.input.length !== 2 ||
        data.input[0]?.role !== "system" || data.input[1]?.role !== "user" ||
        typeof data.input[0]?.content !== "string" || data.input[0].content.length > 4000 ||
        typeof candidatesText !== "string" || candidatesText.length > 55000 ||
        data?.text?.format?.name !== "bowling_ball_fields" ||
        data.text.format.type !== "json_schema" ||
        JSON.stringify(data).length > 65000) {
      return res.status(400).json({ ok: false, error: "invalid_request" });
    }
    let candidates: unknown;
    try { candidates = JSON.parse(candidatesText); }
    catch { return res.status(400).json({ ok: false, error: "invalid_request" }); }
    if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > 10 ||
        candidates.some((item: any) =>
          typeof item?.id !== "string" ||
          !(/^(?:https:\/\/band\.us\/band\/\d{1,20}\/post\/\d{1,30}|https:\/\/www\.chilten\.com\/(?:community\/market|markets)\/\d{1,20}|https:\/\/m\.cafe\.daum\.net\/bowlingevent\/DoDQ\/\d{1,20})$/.test(item.id)) ||
          typeof item?.body !== "string" || item.body.length > 5000)) {
      return res.status(400).json({ ok: false, error: "invalid_request" });
    }

    try {
      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(50000),
      });
      if (!upstream.ok) {
        console.error("Hanpin AI proxy OpenAI status:", upstream.status);
        return res.status(502).json({
          ok: false,
          error: upstream.status === 401 ? "ai_invalid_key"
            : upstream.status === 429 ? "ai_rate_limit" : "ai_upstream_error",
        });
      }
      const result = await upstream.json();
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("Hanpin AI proxy error:", err?.name || "unknown");
      return res.status(502).json({ ok: false, error: "ai_upstream_error" });
    }
  });
}
