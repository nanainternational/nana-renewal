import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import AiDetailTabs from "@/components/AiDetailTabs";
import { useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type MediaItem = { type: "image"; url: string; checked?: boolean };

function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = url;
  });
}

export default function UploadDetailPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("");
  const [mainItems, setMainItems] = useState<MediaItem[]>([]);
  const [detailImages, setDetailImages] = useState<MediaItem[]>([]);

  function setRepresentativeFromDetail(item: MediaItem) {
    setMainItems([{ ...item, checked: true }]);
    setStatus("대표 이미지가 지정되었습니다.");
  }

  function handleUpload(files: FileList | null) {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      setStatus("업로드할 이미지 파일을 선택해주세요.");
      return;
    }
    const uploaded = imageFiles.map((file) => ({ type: "image" as const, url: URL.createObjectURL(file), checked: true }));
    setDetailImages((prev) => {
      const next = [...prev, ...uploaded];
      setMainItems((current) => {
        const currentStillInDetails = current.some((item) => next.some((detail) => detail.url === item.url));
        return currentStillInDetails ? current : [{ ...next[0], checked: true }];
      });
      return next;
    });
    setStatus(`업로드 완료: 상세 이미지 ${uploaded.length}장`);
  }

  function deleteDetailImageAt(index: number) {
    setDetailImages((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      setMainItems((current) => {
        const removedRepresentative = removed && current.some((item) => item.url === removed.url);
        if (!removedRepresentative) return current;
        return next.length ? [{ ...next[0], checked: true }] : [];
      });
      return next;
    });
  }

  function deleteSelectedDetailImages() {
    setDetailImages((prev) => {
      const selectedUrls = new Set(prev.filter((item) => item.checked).map((item) => item.url));
      if (!selectedUrls.size) {
        setStatus("삭제할 이미지를 선택해주세요.");
        return prev;
      }
      const next = prev.filter((item) => !selectedUrls.has(item.url));
      setMainItems((current) => {
        const representativeRemoved = current.some((item) => selectedUrls.has(item.url));
        if (!representativeRemoved) return current;
        return next.length ? [{ ...next[0], checked: true }] : [];
      });
      setStatus(`선택 이미지 ${selectedUrls.size}장을 삭제했습니다.`);
      return next;
    });
  }

  function moveDetailImage(index: number, direction: -1 | 1) {
    setDetailImages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleMergeAndDownloadZip() {
    const selected = detailImages.filter((item) => item.checked);
    if (!selected.length) {
      setStatus("선택된 상세 이미지가 없습니다.");
      return;
    }
    setStatus("상세페이지 합치는 중...");
    try {
      const images = await Promise.all(selected.map((item) => loadImage(item.url)));
      const width = Math.max(...images.map((img) => img.naturalWidth || img.width));
      const height = images.reduce((sum, img) => sum + (img.naturalHeight || img.height), 0);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 생성 실패");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      let y = 0;
      for (const img of images) {
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        ctx.drawImage(img, Math.floor((width - imgW) / 2), y);
        y += imgH;
      }
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("이미지 생성 실패")), "image/png"));
      const zip = new JSZip();
      zip.file(`stitched_${nowStamp()}.png`, blob);
      for (let idx = 0; idx < selected.length; idx++) {
        const sourceBlob = await fetch(selected[idx].url).then((res) => res.blob());
        zip.file(`detail_${String(idx + 1).padStart(2, "0")}.png`, sourceBlob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${nowStamp()}_upload_detail.zip`);
      setStatus("상세페이지 합치기 완료! 압축을 풀어주세요.");
    } catch (e: any) {
      setStatus("상세페이지 합치기 실패: " + (e?.message || e));
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#111] font-sans">
      <Navigation />
      <main className="pt-[80px]">
        <style>{`
          .layout-container { max-width: 100%; margin: 0 auto; padding: 0 40px 60px; }
          .hero-wrap { background: #1c243a; border-radius: 32px; padding: 80px 60px; margin: 20px 0 50px; min-height: 420px; }
          .hero-content { width: 100%; max-width: 720px; background: rgba(255,255,255,0.86); border-radius: 20px; padding: 28px; box-shadow: 0 14px 30px rgba(0,0,0,0.12); }
          .hero-title { font-size: 52px; font-weight: 900; line-height: 1.15; letter-spacing: -1.5px; margin-bottom: 18px; }
          .hero-desc { font-size: 16px; color: rgba(0,0,0,0.62); line-height: 1.7; margin-bottom: 20px; }
          .hero-btn, .btn-black { background: #111; color: #fff; border: none; padding: 14px 24px; border-radius: 12px; font-weight: 800; font-size: 14px; cursor: pointer; }
          .btn-outline-black, .btn-text { background: #fff; color: #111; border: 1px solid #ddd; padding: 12px 18px; border-radius: 12px; font-weight: 700; cursor: pointer; }
          .upload-actions, .section-actions { display: flex; flex-wrap: wrap; gap: 8px; }
          .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; }
          .section-title { font-size: 26px; font-weight: 900; }
          .section-desc { color: #888; font-size: 14px; margin-top: 4px; }
          .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
          .media-card { background: #fff; border: 1px solid #eee; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
          .card-thumb-wrap { width: 100%; aspect-ratio: 1/1; background: #f8f8f8; position: relative; }
          .card-thumb { width: 100%; height: 100%; object-fit: cover; }
          .card-overlay { position: absolute; top: 12px; left: 12px; z-index: 10; transform: scale(1.2); accent-color: #FEE500; }
          .card-actions { padding: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f7f7f7; }
          .card-badge { font-size: 11px; font-weight: 900; color: #bbb; }
          .card-btn-group { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
          .card-mini-btn { min-width: 28px; height: 28px; padding: 0 8px; border-radius: 8px; border: 1px solid #eee; background: #fff; font-size: 11px; font-weight: 800; cursor: pointer; color: #555; }
          .card-mini-btn:hover { background: #111; color: #fff; border-color: #111; }
          .card-mini-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        `}</style>
        <div className="layout-container">
          <div className="hero-wrap">
            <div className="hero-content">
              <AiDetailTabs active="upload" />
              <h1 className="hero-title">직접 업로드</h1>
              <p className="hero-desc">
                국내 도매, 동대문, 거래처, 카카오톡 등에서 받은 상세페이지 이미지를 업로드해주세요.<br />
                업로드한 이미지 중 대표로 사용할 이미지를 선택할 수 있습니다.
              </p>
              <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleUpload(e.target.files); e.currentTarget.value = ""; }} />
              <div className="upload-actions">
                <button type="button" className="hero-btn" onClick={() => inputRef.current?.click()}>{detailImages.length ? "이미지 추가 업로드" : "상세 이미지 업로드"}</button>
                <button type="button" className="btn-outline-black" onClick={deleteSelectedDetailImages}>선택 삭제</button>
                <button type="button" className="btn-black" onClick={handleMergeAndDownloadZip}>상세페이지 합치기</button>
              </div>
              {status && <div className="mt-4 text-sm font-bold text-black/60">{status}</div>}
            </div>
          </div>

          <div className="mt-12">
            <div className="section-header">
              <div><h2 className="section-title">대표 이미지</h2><p className="section-desc">업로드한 상세 이미지 중 대표로 지정한 이미지입니다.</p></div>
            </div>
            <div className="grid-container">
              {mainItems.map((item, idx) => <div className="media-card" key={idx}><div className="card-thumb-wrap"><img src={item.url} className="card-thumb" /></div><div className="card-actions"><span className="card-badge">REPRESENTATIVE</span></div></div>)}
              {!mainItems.length && <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">상세 이미지를 업로드하면 첫 번째 이미지가 대표 이미지로 사용됩니다.</div>}
            </div>
          </div>

          <div className="mt-16">
            <div className="section-header">
              <div><h2 className="section-title">상세페이지 편집</h2><p className="section-desc">이미지 목록 표시, 순서 변경, 삭제, 대표 이미지 선택, 상세페이지 합치기를 사용할 수 있습니다.</p></div>
              <div className="section-actions">
                <button className="btn-text" onClick={() => setDetailImages((prev) => prev.map((it) => ({ ...it, checked: true })))}>모두 선택</button>
                <button className="btn-text" onClick={() => setDetailImages((prev) => prev.map((it) => ({ ...it, checked: false })))}>해제</button>
                <button className="btn-text" onClick={deleteSelectedDetailImages}>선택 삭제</button>
                <button className="btn-black" onClick={handleMergeAndDownloadZip}>상세페이지 합치기</button>
              </div>
            </div>
            <div className="grid-container">
              {detailImages.map((item, idx) => <div className="media-card" key={item.url}><div className="card-thumb-wrap"><input type="checkbox" className="card-overlay" checked={item.checked} onChange={() => setDetailImages((prev) => prev.map((x, i) => i === idx ? { ...x, checked: !x.checked } : x))} /><img src={item.url} className="card-thumb" /></div><div className="card-actions"><span className="card-badge">DETAIL #{String(idx + 1).padStart(2, "0")}</span><div className="card-btn-group"><button className="card-mini-btn" onClick={() => moveDetailImage(idx, -1)} disabled={idx === 0}>↑</button><button className="card-mini-btn" onClick={() => moveDetailImage(idx, 1)} disabled={idx === detailImages.length - 1}>↓</button><button className="card-mini-btn" onClick={() => setRepresentativeFromDetail(item)}>대표로 지정</button><button className="card-mini-btn" onClick={() => deleteDetailImageAt(idx)}>삭제</button><button className="card-mini-btn" onClick={() => window.open(item.url)}>↗</button></div></div></div>)}
              {!detailImages.length && <div className="col-span-full py-10 text-center text-gray-300 text-sm">상세 이미지가 없습니다.</div>}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
