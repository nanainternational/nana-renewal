import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useMemo, useState } from "react";

type MediaItem = { type: "image" | "video"; url: string; checked?: boolean };

function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    "_" +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

function downloadText(text: string, filename: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  downloadBlob(blob, filename);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  }
}

export default function VvicDetailPage() {
  const [urlInput, setUrlInput] = useState("");
  const [status, setStatus] = useState("");
  const [mainItems, setMainItems] = useState<MediaItem[]>([]);
  const [detailImages, setDetailImages] = useState<MediaItem[]>([]);
  const [detailVideos, setDetailVideos] = useState<MediaItem[]>([]);
  const [mainHtmlOut, setMainHtmlOut] = useState("");
  const [detailHtmlOut, setDetailHtmlOut] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProductName, setAiProductName] = useState("");
  const [aiEditor, setAiEditor] = useState("");
  const [aiCoupangKeywords, setAiCoupangKeywords] = useState<string[]>([]);
  const [aiAblyKeywords, setAiAblyKeywords] = useState<string[]>([]);

  const mainSelectedCount = useMemo(() => mainItems.filter((x) => x.checked).length, [mainItems]);
  const detailSelectedCount = useMemo(() => detailImages.filter((x) => x.checked).length, [detailImages]);

  function buildMainHtmlFromSelected(items?: MediaItem[]) {
    const sel = (items || mainItems).filter((x) => x.checked);
    const lines: string[] = [];
    lines.push('<div class="main-media">');
    for (const it of sel) {
      if (it.type === "video") {
        lines.push(
          '  <video src="' +
            it.url +
            '" controls playsinline style="max-width:100%;height:auto;"></video>'
        );
      } else {
        lines.push('  <img src="' + it.url + '" alt="">');
      }
    }
    lines.push("</div>");
    const out = lines.join("\n");
    setMainHtmlOut(out);
    return out;
  }

  function buildDetailHtmlFromSelected(items?: MediaItem[], videos?: MediaItem[]) {
    const sel = (items || detailImages).filter((x) => x.checked);
    const vids = videos || detailVideos;
    const lines: string[] = [];
    lines.push('<div class="detail-images">');
    for (const it of sel) lines.push('  <img src="' + it.url + '" alt="">');
    for (const v of vids)
      lines.push(
        '  <video src="' + v.url + '" controls playsinline style="max-width:100%;height:auto;"></video>'
      );
    lines.push("</div>");
    const out = lines.join("\n");
    setDetailHtmlOut(out);
    return out;
  }

  async function fetchUrlServer(url: string) {
    setStatus("서버로 URL 추출 요청 중...");
    const api = "/api/vvic/extract?url=" + encodeURIComponent(url);
    const res = await fetch(api);

    // 500 같은 에러일 때도 응답 바디에 error 메시지가 들어오니 최대한 읽어서 보여줌
    let data: any = null;
    const ct = res.headers.get("content-type") || "";
    try {
      if (ct.includes("application/json")) data = await res.json();
      else data = await res.text();
    } catch {
      // ignore
    }

    if (!res.ok) {
      const msg =
        (data && typeof data === "object" && (data.error || data.message)) ||
        (typeof data === "string" && data) ||
        "";
      throw new Error("서버 응답 오류: HTTP " + res.status + (msg ? "\n" + msg : ""));
    }

    if (ct.includes("application/json") && !data) data = await res.json();
    if (!data.ok) throw new Error(data.error || "서버 에러");

    const mm: MediaItem[] = (data.main_media || []).map((x: any) => ({
      type: (x.type || "image") === "video" ? "video" : "image",
      url: x.url,
      checked: true,
    }));

    const dm: MediaItem[] = (data.detail_media || []).map((x: any) => ({
      type: (x.type || "image") === "video" ? "video" : "image",
      url: x.url,
      checked: true,
    }));

    setMainItems(
      mm.length
        ? mm
        : (data.main_images || []).map((u: string) => ({ type: "image", url: u, checked: true }))
    );

    const imgs = dm.filter((x) => x.type !== "video").map((x) => ({ ...x, type: "image" as const }));
    const vids = dm.filter((x) => x.type === "video").map((x) => ({ ...x, type: "video" as const }));

    setDetailImages(imgs);
    setDetailVideos(vids);

    const mainImgCnt = mm.filter((x) => x.type !== "video").length || (data.main_images || []).length;
    const mainVidCnt = mm.filter((x) => x.type === "video").length;
    const detailImgCnt = imgs.length;
    const detailVidCnt = vids.length;

    setStatus(
      ["추출 완료", "- 대표: 이미지 " + mainImgCnt + "개 / 비디오 " + mainVidCnt + "개", "- 상세: 이미지 " + detailImgCnt + "개 / 비디오 " + detailVidCnt + "개"].join(
        "\n"
      )
    );
  }


  async function generateByAI() {
    const selected = (mainItems || [])
      .filter((x) => x.checked && x.type === "image")
      .map((x) => x.url)
      .filter(Boolean)
      .slice(0, 5);

    const fallback = (mainItems || []).find((x) => x.type === "image")?.url || "";
    const imageUrls = selected.length ? selected : (fallback ? [fallback] : []);

    if (!imageUrls.length) {
      setStatus("대표이미지를 먼저 가져오고, 최소 1개를 선택하세요.");
      return;
    }

    setAiLoading(true);
    setStatus("AI 생성 중... (대표이미지 " + imageUrls.length + "장 분석)");
    try {
      const api = "/api/vvic/ai";
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_urls: imageUrls, source_url: (urlInput || "").trim() }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok || !data?.ok) {
        const msg = data?.error || ("서버 응답 오류: HTTP " + res.status);
        throw new Error(msg);
      }

      setAiProductName(String(data.product_name || ""));
      setAiEditor(String(data.editor || ""));
      setAiCoupangKeywords(Array.isArray(data.coupang_keywords) ? data.coupang_keywords : []);
      setAiAblyKeywords(Array.isArray(data.ably_keywords) ? data.ably_keywords : []);

      setStatus(
        [
          "AI 생성 완료",
          "- 상품명: " + String(data.product_name || ""),
          "- 쿠팡키워드: " + (Array.isArray(data.coupang_keywords) ? data.coupang_keywords.join(", ") : ""),
          "- 에이블리키워드: " + (Array.isArray(data.ably_keywords) ? data.ably_keywords.join(", ") : ""),
        ].join("\n")
      );
    } catch (e: any) {
      setStatus("AI 생성 실패:\n" + String(e?.message || e));
    } finally {
      setAiLoading(false);
    }
  }

async function stitchServer(urls: string[]) {
    if (!urls.length) {
      setStatus("선택된 상세이미지가 없습니다.");
      return;
    }
    setStatus("서버에서 이미지 합치는 중...");
    const api = "/api/vvic/stitch";
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) throw new Error("서버 응답 오류: HTTP " + res.status);
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json();
      throw new Error(j?.error || "서버 에러");
    }
    const blob = await res.blob();
    downloadBlob(blob, "stitched_" + nowStamp() + ".png");
    setStatus("다운로드 완료(서버)");
  }

  return (
    <div className="min-h-screen bg-[#FEE500] notranslate" translate="no">
      <Navigation />

      <main className="pt-[88px] text-black">
        <style>{`
          .wrap { max-width: 100%; margin: 0 auto; padding: 0 16px; }
          .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
          .card { border: 1px solid rgba(0,0,0,0.10); border-radius: 14px; padding: 12px; background: rgba(255,255,255,0.92); overflow: visible; max-height: none; }
          .card h3 { margin: 0 0 8px 0; font-size: 16px; font-weight: 700; }
          input[type="text"] { width: min(900px, 100%); padding: 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.18); background: rgba(255,255,255,0.90); color: #000; }
          textarea { width: 100%; height: 110px; padding: 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.18); background: rgba(255,255,255,0.90); color: #000; }
          button { padding: 8px 12px; cursor: pointer; border: 1px solid rgba(0,0,0,0.18); border-radius: 10px; background: #FEE500; color: #000; font-weight: 600; }
          button:hover { background: #fada00; }
          .muted { color: rgba(0,0,0,0.60); font-size: 12px; }
          .status { margin-top: 8px; font-size: 13px; white-space: pre-wrap; color: rgba(0,0,0,0.88); }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; margin-top: 12px; }
          .thumb { width: 100%; height: 110px; border-radius: 10px; background: rgba(255,255,255,0.85); object-fit: contain; }
          video.thumb { background: rgba(255,255,255,0.85); }
          .item { border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; padding: 8px; display: flex; flex-direction: column; gap: 6px; background: rgba(255,255,255,0.78); }
          .small { font-size: 12px; color: rgba(0,0,0,0.68); word-break: break-all; }
          .controls { display: flex; gap: 6px; flex-wrap: wrap; }
          .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; border: 1px solid rgba(0,0,0,0.12); font-size: 12px; background: rgba(255,255,255,0.65); }
          .code { width: 100%; height: 180px; font-family: Consolas, monospace; }
          .title { font-size: 22px; font-weight: 800; margin: 10px 0 8px; }
        `}</style>

        <div className="wrap">
          <div className="title">ai 상세페이지</div>
          <div className="muted">
            - ai를 통해 상세페이지를 만들어 보세요.
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3>1) URL 입력</h3>
            <div className="row">
              <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} type="text" placeholder="https://www.vvic.com/item/..." />
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button
                onClick={async () => {
                  try {
                    const u = (urlInput || "").trim();
                    if (!u) return setStatus("URL을 입력하세요.");
                    await fetchUrlServer(u);
                  } catch (e: any) {
                    setStatus("서버 URL 가져오기 실패:\n" + String(e?.message || e));
                  }
                }}
              >
                이미지 가져오기
              </button>
            </div>
            <div className="status">{status}</div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3>대표이미지</h3>
            <div className="muted">- 대표이미지는 폴더로 다운로드 됩니다다.</div>

            <div className="row" style={{ marginTop: 10 }}>
              <button onClick={() => setMainItems((prev) => prev.map((x) => ({ ...x, checked: true })))}>
                전체 선택
              </button>
              <button onClick={() => setMainItems((prev) => prev.map((x) => ({ ...x, checked: false })))}>
                전체 해제
              </button>
              <span className="pill">총 {mainItems.length}개</span>
              <span className="pill">선택 {mainSelectedCount}개</span>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button
                onClick={() => {
                  const out = buildMainHtmlFromSelected();
                  setStatus("HTML 코드 생성 완료 (대표 선택 " + mainSelectedCount + "개)");
                  setMainHtmlOut(out);
                }}
              >
                선택으로 HTML 코드 생성
              </button>
              <button
                onClick={async () => {
                  const text = mainHtmlOut || buildMainHtmlFromSelected();
                  await copyText(text);
                  setStatus("클립보드에 복사 완료");
                }}
              >
                HTML 코드 복사
              </button>
              <button
                onClick={() => {
                  const text = mainHtmlOut || buildMainHtmlFromSelected();
                  const full = ["<!doctype html>", "<html><head><title>selected_main_media</title></head><body>", text, "</body></html>"].join("\n");
                  downloadText(full, "selected_main_media_" + nowStamp() + ".html", "text/html");
                  setStatus("대표 HTML 파일 다운로드 완료");
                }}
              >
                HTML 파일 다운로드
              </button>
            </div>

            <textarea value={mainHtmlOut} onChange={(e) => setMainHtmlOut(e.target.value)} className="code" placeholder="여기에 생성된 대표 HTML 코드가 표시됩니다." />

            <div className="grid">
              {!mainItems.length ? (
                <div className="muted">대표이미지가 추출되지 않았습니다.</div>
              ) : (
                mainItems.map((it, idx) => (
                  <div className="item" key={it.url + idx}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div className="row" style={{ gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={!!it.checked}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setMainItems((prev) => prev.map((x, i) => (i === idx ? { ...x, checked: v } : x)));
                          }}
                        />
                        <span className="pill">#{idx + 1}</span>
                      </div>
                      <div className="controls">
                        <button
                          onClick={() => {
                            if (idx <= 0) return;
                            setMainItems((prev) => {
                              const a = [...prev];
                              const t = a[idx - 1];
                              a[idx - 1] = a[idx];
                              a[idx] = t;
                              return a;
                            });
                          }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => {
                            setMainItems((prev) => {
                              if (idx >= prev.length - 1) return prev;
                              const a = [...prev];
                              const t = a[idx + 1];
                              a[idx + 1] = a[idx];
                              a[idx] = t;
                              return a;
                            });
                          }}
                        >
                          ↓
                        </button>
                        <button onClick={() => window.open(it.url, "_blank")}>새창</button>
                      </div>
                    </div>

                    {it.type === "video" ? (
                      <video className="thumb" src={it.url} controls playsInline preload="metadata" />
                    ) : (
                      <img className="thumb" src={it.url} loading="lazy" />
                    )}
                    <div className="small">{it.url}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          
          <div className="card" style={{ marginTop: 12 }}>
            <h3>2) AI 결과</h3>
            <div className="muted">- 대표이미지(선택된 최대 5개) 기준으로 상품명/에디터/키워드를 생성합니다.</div>

            <div className="row" style={{ marginTop: 10 }}>
              <button onClick={generateByAI} disabled={aiLoading}>
                {aiLoading ? "AI 생성 중..." : "AI로 상품명/에디터/키워드 생성"}
              </button>
              <span className="pill">API: /api/vvic/ai</span>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <span className="pill">상품명</span>
            </div>
            <textarea
              value={aiProductName}
              onChange={(e) => setAiProductName(e.target.value)}
              className="code"
              style={{ height: 70 }}
              placeholder="AI가 생성한 상품명이 여기에 표시됩니다."
            />

            <div className="row" style={{ marginTop: 10 }}>
              <span className="pill">에디터(약 200자)</span>
              <button
                onClick={async () => {
                  const t = (aiEditor || "").trim();
                  if (!t) return setStatus("복사할 에디터가 없습니다.");
                  await copyText(t);
                  setStatus("에디터 복사 완료");
                }}
              >
                에디터 복사
              </button>
            </div>
            <textarea
              value={aiEditor}
              onChange={(e) => setAiEditor(e.target.value)}
              className="code"
              placeholder="AI가 생성한 에디터 문구가 여기에 표시됩니다."
            />

            <div className="row" style={{ marginTop: 10 }}>
              <span className="pill">쿠팡 키워드 5개</span>
              <button
                onClick={async () => {
                  const t = (aiCoupangKeywords || []).join(", ").trim();
                  if (!t) return setStatus("복사할 쿠팡키워드가 없습니다.");
                  await copyText(t);
                  setStatus("쿠팡키워드 복사 완료");
                }}
              >
                쿠팡키워드 복사
              </button>
            </div>
            <textarea
              value={(aiCoupangKeywords || []).join(", ")}
              onChange={(e) => setAiCoupangKeywords(String(e.target.value || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 5))}
              className="code"
              style={{ height: 80 }}
              placeholder="예) 키워드1, 키워드2, ..."
            />

            <div className="row" style={{ marginTop: 10 }}>
              <span className="pill">에이블리 키워드 5개</span>
              <button
                onClick={async () => {
                  const t = (aiAblyKeywords || []).join(", ").trim();
                  if (!t) return setStatus("복사할 에이블리키워드가 없습니다.");
                  await copyText(t);
                  setStatus("에이블리키워드 복사 완료");
                }}
              >
                에이블리키워드 복사
              </button>
            </div>
            <textarea
              value={(aiAblyKeywords || []).join(", ")}
              onChange={(e) => setAiAblyKeywords(String(e.target.value || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 5))}
              className="code"
              style={{ height: 80 }}
              placeholder="예) 키워드1, 키워드2, ..."
            />
          </div>

<div className="card" style={{ marginTop: 12 }}>
            <h3>상세이미지</h3>
            <div className="row">
              <button onClick={() => setDetailImages((prev) => prev.map((x) => ({ ...x, checked: true })))}>
                전체 선택
              </button>
              <button onClick={() => setDetailImages((prev) => prev.map((x) => ({ ...x, checked: false })))}>
                전체 해제
              </button>
              <span className="pill">총 {detailImages.length}개</span>
              <span className="pill">선택 {detailSelectedCount}개</span>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button
                onClick={() => {
                  const out = buildDetailHtmlFromSelected();
                  setStatus("HTML 코드 생성 완료 (상세 선택 " + detailSelectedCount + "개)");
                  setDetailHtmlOut(out);
                }}
              >
                선택으로 HTML 코드 생성
              </button>
              <button
                onClick={async () => {
                  const text = detailHtmlOut || buildDetailHtmlFromSelected();
                  await copyText(text);
                  setStatus("클립보드에 복사 완료");
                }}
              >
                HTML 코드 복사
              </button>
              <button
                onClick={() => {
                  const text = detailHtmlOut || buildDetailHtmlFromSelected();
                  const full = ["<!doctype html>", "<html><head><title>selected_detail_images</title></head><body>", text, "</body></html>"].join("\n");
                  downloadText(full, "selected_detail_images_" + nowStamp() + ".html", "text/html");
                  setStatus("HTML 파일 다운로드 완료");
                }}
              >
                HTML 파일 다운로드
              </button>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button
                onClick={async () => {
                  try {
                    const urls = detailImages.filter((x) => x.checked).map((x) => x.url);
                    await stitchServer(urls);
                  } catch (e: any) {
                    setStatus("서버 합치기 실패:\n" + String(e?.message || e));
                  }
                }}
              >
                선택 합치기
              </button>
            </div>

            <textarea value={detailHtmlOut} onChange={(e) => setDetailHtmlOut(e.target.value)} className="code" placeholder="여기에 생성된 HTML 코드가 표시됩니다." />
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3>상세이미지 순서조정</h3>
            <div className="muted">- ↑↓ 버튼으로 합치기/HTML 순서를 바꿀 수 있어요.</div>

            <div className="grid">
              {detailImages.map((it, idx) => (
                <div className="item" key={it.url + idx}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div className="row" style={{ gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!it.checked}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setDetailImages((prev) => prev.map((x, i) => (i === idx ? { ...x, checked: v } : x)));
                        }}
                      />
                      <span className="pill">#{idx + 1}</span>
                    </div>
                    <div className="controls">
                      <button
                        onClick={() => {
                          if (idx <= 0) return;
                          setDetailImages((prev) => {
                            const a = [...prev];
                            const t = a[idx - 1];
                            a[idx - 1] = a[idx];
                            a[idx] = t;
                            return a;
                          });
                        }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => {
                          setDetailImages((prev) => {
                            if (idx >= prev.length - 1) return prev;
                            const a = [...prev];
                            const t = a[idx + 1];
                            a[idx + 1] = a[idx];
                            a[idx] = t;
                            return a;
                          });
                        }}
                      >
                        ↓
                      </button>
                      <button onClick={() => window.open(it.url, "_blank")}>새창</button>
                    </div>
                  </div>
                  <img className="thumb" src={it.url} loading="lazy" />
                  <div className="small">{it.url}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3>동영상</h3>
            <div className="muted">- url에서 추출된 동영상(mp4 등)을 이미지 아래에 따로 표시합니다.</div>

            <div className="grid">
              {!detailVideos.length ? (
                <div className="muted">동영상이 없습니다.</div>
              ) : (
                detailVideos.map((it, idx) => (
                  <div className="item" key={it.url + idx}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="pill">VIDEO #{idx + 1}</span>
                      <button onClick={() => window.open(it.url, "_blank")}>새창</button>
                    </div>
                    <video className="thumb" src={it.url} controls playsInline preload="metadata" />
                    <div className="small">{it.url}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
