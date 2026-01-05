import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useEffect, useRef, useState } from "react";


function YearCountUp({
  start = 1985,
  end = 2026,
  duration = 1400,
}: {
  start?: number;
  end?: number;
  duration?: number;
}) {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const steps = Math.max(1, Math.min(120, end - start));
    const stepTime = Math.max(10, Math.floor(duration / steps));
    let current = start;

    const timer = window.setInterval(() => {
      current += 1;
      setCount((prev) => (prev < end ? current : prev));
      if (current >= end) window.clearInterval(timer);
    }, stepTime);

    return () => window.clearInterval(timer);
  }, [isVisible, start, end, duration]);

  return (
    <span ref={ref} aria-label={`연도 ${count}`}>
      {count}
    </span>
  );
}


export default function Logistics() {
  return (
    <div className="min-h-screen bg-black notranslate" translate="no">
      <Navigation />

      <main className="pt-[88px] text-white">
        <style>{`
        :root {
          --bg: #000;
          --panel: #111;
          --panel2: #1a1a1a;
          --text: #ccc;
          --strong: #fff;
          --cyan: #00d4ff;
          --pink: #ff69b4;
          --purple: #9d4edd;
          --yellow: #fae100;
          --border: rgba(255,255,255,0.1);
          --radius: 18px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { color: var(--cyan); text-decoration: none; }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 16px; }

        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 50px; font-size: 16px; font-weight: 600;
          cursor: pointer; transition: all 0.2s ease; text-decoration: none; border: none;
        }
        .btn-outline {
          background: rgba(255,255,255,0.05);
          border: 2px solid rgba(255,255,255,0.3);
          color: var(--strong);
          backdrop-filter: blur(10px);
        }
        .btn-outline:hover { background: rgba(255,255,255,0.1); }

        .year-badge {
          display: inline-block;
          padding: 8px 20px;
          margin-bottom: 14px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 20px;
          background: linear-gradient(135deg, #00d4ff, #9d4edd);
          color: #fff;
          box-shadow: 0 8px 30px rgba(0,212,255,0.35);
        }

        /* Hero */
        .hero {
          position: relative;
          min-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 120px 16px 80px;
          overflow: hidden;
        }
        .hero-image {
          position: absolute;
          inset: 0;
          background-image: url('https://raw.githubusercontent.com/nanainternational/nana-renewal/main/attached_assets/image_3pl_1.jpg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .hero-image-fallback {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          z-index: 0;
          opacity: 1;
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.85));
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(135deg, rgba(157, 78, 221, 0.3), transparent, rgba(0, 212, 255, 0.2));
        }
        .hero-glow-1 {
          position: absolute;
          z-index: 1;
          top: 20%;
          left: 20%;
          width: 400px;
          height: 400px;
          background: rgba(0, 212, 255, 0.15);
          border-radius: 50%;
          filter: blur(120px);
        }
        .hero-glow-2 {
          position: absolute;
          z-index: 1;
          bottom: 20%;
          right: 20%;
          width: 400px;
          height: 400px;
          background: rgba(255, 105, 180, 0.15);
          border-radius: 50%;
          filter: blur(120px);
        }
        .hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          max-width: 900px;
        }
        .hero-title {
          font-size: clamp(32px, 6vw, 60px);
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 24px;
        }
        .hero-title .gradient {
          background: linear-gradient(90deg, var(--cyan), #6366f1, var(--purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-tags {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
        }
        .hero-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          padding: 10px 20px;
          border-radius: 50px;
          font-size: 16px;
        }
        .hero-tag img { width: 20px; height: 20px; }
        .hero-tags-actions { margin-top: 28px; margin-bottom: 0; }
        .hero-price-tag {
          font-weight: 800;
          background: linear-gradient(90deg, #ff69b4, #9d4edd);
          color: #fff;
        }
        .hero-action-tag { cursor: pointer; transition: all .2s ease; }
        .hero-action-tag:hover { transform: translateY(-2px); background: rgba(255,255,255,0.2); }

        /* Section Common */
        .section { padding: 80px 16px; }
        .section-title {
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 700;
          text-align: center;
          margin-bottom: 48px;
        }
        .section-title .gradient {
          background: linear-gradient(90deg, var(--cyan), var(--pink));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Target */
        .target-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }
        .target-card {
          position: relative;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          overflow: hidden;
        }
        .target-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 4px;
          border-radius: 4px 0 0 4px;
        }
        .target-card:nth-child(1)::before { background: linear-gradient(180deg, #ec4899, #f43f5e); }
        .target-card:nth-child(2)::before { background: linear-gradient(180deg, var(--cyan), #3b82f6); }
        .target-card:nth-child(3)::before { background: linear-gradient(180deg, var(--purple), #8b5cf6); }
        .target-card:nth-child(4)::before { background: linear-gradient(180deg, #f97316, #fbbf24); }
        .target-card:nth-child(5)::before { background: linear-gradient(180deg, #10b981, #14b8a6); }
        .target-card:nth-child(6)::before { background: linear-gradient(180deg, #6366f1, var(--purple)); }

        .target-icon {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .target-card:nth-child(1) .target-icon { background: linear-gradient(135deg, #ec4899, #f43f5e); }
        .target-card:nth-child(2) .target-icon { background: linear-gradient(135deg, var(--cyan), #3b82f6); }
        .target-card:nth-child(3) .target-icon { background: linear-gradient(135deg, var(--purple), #8b5cf6); }
        .target-card:nth-child(4) .target-icon { background: linear-gradient(135deg, #f97316, #fbbf24); }
        .target-card:nth-child(5) .target-icon { background: linear-gradient(135deg, #10b981, #14b8a6); }
        .target-card:nth-child(6) .target-icon { background: linear-gradient(135deg, #6366f1, var(--purple)); }

        .target-text { color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.6; }

        /* Services */
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          max-width: 1000px;
          margin: 0 auto;
        }
        .service-card {
          position: relative;
          border-radius: var(--radius);
          overflow: hidden;
          aspect-ratio: 4/3;
        }
        .service-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .service-card:hover img { transform: scale(1.1); }
        .service-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3), transparent);
        }
        .service-content {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 24px;
        }
        .service-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .service-card:nth-child(1) .service-badge { background: linear-gradient(90deg, #ec4899, #f43f5e); }
        .service-card:nth-child(2) .service-badge { background: linear-gradient(90deg, var(--cyan), #6366f1); }
        .service-card:nth-child(3) .service-badge { background: linear-gradient(90deg, var(--purple), #d946ef); }
        .service-desc { color: rgba(255,255,255,0.8); font-size: 14px; }

        /* Diff table */
        .diff-table { max-width: 800px; margin: 0 auto; position: relative; }
        .diff-table-glow {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, rgba(0,212,255,0.1), rgba(157,78,221,0.1), rgba(255,105,180,0.1));
          border-radius: 24px;
          filter: blur(30px);
        }
        .diff-table-inner {
          position: relative;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: 24px;
          overflow: hidden;
        }
        .diff-header {
          background: linear-gradient(90deg, var(--cyan), var(--purple), var(--pink));
          padding: 20px 24px;
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 16px;
          font-weight: 700;
          font-size: 18px;
        }
        .diff-row {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 16px;
          padding: 20px 24px;
          border-top: 1px solid var(--border);
          transition: background 0.2s ease;
        }
        .diff-row:hover { background: rgba(255,255,255,0.05); }
        .diff-category { display: flex; align-items: center; gap: 8px; font-weight: 500; }
        .diff-category svg { width: 20px; height: 20px; color: var(--cyan); }
        .diff-desc { color: rgba(255,255,255,0.8); }

        /* Philosophy */
        .philosophy {
          text-align: center;
          max-width: 700px;
          margin: 0 auto;
          position: relative;
        }
        .philosophy-quote {
          position: absolute;
          font-size: 120px;
          font-family: serif;
          opacity: 0.1;
          line-height: 1;
        }
        .philosophy-quote.open {
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          color: var(--cyan);
        }
        .philosophy-quote.close {
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%) rotate(180deg);
          color: var(--pink);
        }
        .philosophy-title {
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 700;
          background: linear-gradient(90deg, var(--cyan), var(--purple), var(--pink));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 24px;
        }
        .philosophy-text { font-size: 18px; color: rgba(255,255,255,0.7); line-height: 1.8; }

        /* Partner slider */
        .partner-slider-wrap { overflow: hidden; margin: 34px auto 0; max-width: 900px; }
        .partner-slider-track {
          display: flex;
          gap: 38px;
          align-items: center;
          width: max-content;
          animation: partnerSlide 26s linear infinite;
          will-change: transform;
        }
        .partner-slider-track img {
          width: 40px;
          height: 40px;
          opacity: 0.95;
          object-fit: contain;
          background: none;
          padding: 0;
          border: none;
          border-radius: 0;
        }
        @keyframes partnerSlide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Fixed kakao */
        .fixed-kakao {
          position: fixed;
          bottom: 100px;
          right: 18px;
          width: 50px;
          height: 50px;
          background: var(--yellow);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(250, 225, 0, 0.4);
          z-index: 99;
          transition: transform 0.2s ease;
          font-size: 24px;
          opacity: 0.85;
        }
        .fixed-kakao:hover { transform: scale(1.1); }

        /* Responsive */
        @media (max-width: 768px) {
          .section { padding: 60px 16px; }
          .hero { min-height: 80vh; padding: 100px 16px 60px; }
          .diff-header, .diff-row {
            grid-template-columns: 100px 1fr;
            padding: 16px 20px;
            font-size: 15px;
          }
        }
      `}</style>

        {/* Hero */}
      <section className="hero" id="hero">
        <div className="hero-image" />
        <img
          className="hero-image-fallback"
          src="https://raw.githubusercontent.com/nanainternational/nana-renewal/main/attached_assets/image_3pl_1.jpg"
          alt="3PL 히어로 이미지"
          loading="eager"
        />
        <div className="hero-overlay" />
        <div className="hero-bg" />
        <div className="hero-glow-1" />
        <div className="hero-glow-2" />

        <div className="hero-content">
          <h1 className="hero-title">
            <span className="year-badge"><YearCountUp start={1985} end={2026} /></span>
            <br />
            <span className="gradient">소규모 브랜드</span>에 딱 맞춰 드립니다
          </h1>

          <div className="hero-tags">
            <span className="hero-tag">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff69b4" strokeWidth="2">
                <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
              </svg>
              여성의류
            </span>

            <span className="hero-tag">
              <img src="https://gi.esmplus.com/secsiboy2/3pl/555474d.png" alt="다리미" />
              다림질
            </span>

            <span className="hero-tag">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              포장까지
            </span>
          </div>

          <div className="hero-tags hero-tags-actions">
            <span className="hero-tag hero-price-tag">단, 3,000원</span>

            <a className="hero-tag hero-action-tag" href="http://pf.kakao.com/_xmXtTs/chat" target="_blank" rel="noreferrer">
              💬 1:1 문의상담
            </a>

            <a className="hero-tag hero-action-tag" href="#price">
              📊 가격 바로보기
            </a>
          </div>
        </div>
      </section>

      {/* Target */}
      <section className="section" id="target">
        <div className="container">
          <h2 className="section-title">
            이런 분을 위한 <span className="gradient">서비스</span>입니다
          </h2>

          <div className="target-grid">
            <div className="target-card">
              <div className="target-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
                </svg>
              </div>
              <p className="target-text">직접 포장하며 생산적인 일에 집중하지 못하는 셀러</p>
            </div>

            <div className="target-card">
              <div className="target-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <p className="target-text">주문 수가 애매해서 고정 인건비가 부담되는 셀러 (단 1건도 계약 가능!)</p>
            </div>

            <div className="target-card">
              <div className="target-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <p className="target-text">성장과 효율을 동시에 추구하고 싶은 소규모 브랜드</p>
            </div>

            <div className="target-card">
              <div className="target-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <p className="target-text">상품은 잘 팔리지만, 포장이 발목을 잡는 셀러</p>
            </div>

            <div className="target-card">
              <div className="target-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <p className="target-text">외주가 더 경제적인 셀러</p>
            </div>

            <div className="target-card">
              <div className="target-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                  <path d="M5 19l1 3 3-1-1-3-3 1z" />
                  <path d="M19 19l-1 3-3-1 1-3 3 1z" />
                </svg>
              </div>
              <p className="target-text">입고, 정리, 다림질, 포장까지 모두 맡기고 싶은 셀러</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section" id="services">
        <div className="container">
          <h2 className="section-title">
            <span className="gradient">대표 서비스</span>
          </h2>

          <div className="services-grid">
            <div className="service-card">
              <img src="https://gi.esmplus.com/secsiboy2/3pl/a121.jpg" alt="브랜드 포장" />
              <div className="service-overlay" />
              <div className="service-content">
                <span className="service-badge">브랜드 포장</span>
                <p className="service-desc">브랜드의 결을 살리는 정성스러운 포장</p>
              </div>
            </div>

            <div className="service-card">
              <img src="https://gi.esmplus.com/secsiboy2/3pl/a12w.jpg" alt="스팀 다림질" />
              <div className="service-overlay" />
              <div className="service-content">
                <span className="service-badge">스팀 다림질</span>
                <p className="service-desc">의류에 맞춘 꼼꼼한 1~2분 다림질</p>
              </div>
            </div>

            <div className="service-card">
              <img src="https://gi.esmplus.com/secsiboy2/3pl/a232.jpg" alt="배송 대행" />
              <div className="service-overlay" />
              <div className="service-content">
                <span className="service-badge">배송 대행</span>
                <p className="service-desc">계약 단가 기반의 저렴하고 안정된 출고</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diff / Price */}
      <section className="section" id="price">
        <div className="container">
          <h2 className="section-title">
            <span className="gradient">차별화 포인트</span>
          </h2>

          <div className="diff-table">
            <div className="diff-table-glow" />
            <div className="diff-table-inner">
              <div className="diff-header">
                <span>구분</span>
                <span>우리가 추구하는 방향</span>
              </div>

              <div className="diff-row">
                <div className="diff-category">📦 포장</div>
                <p className="diff-desc">단가 중심이 아닌 브랜드의 결을 살리는 포장</p>
              </div>

              <div className="diff-row">
                <div className="diff-category">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
                  </svg>
                  다림질
                </div>
                <p className="diff-desc">의류 특성별로 최소 1~2분 이상 꼼꼼하게 진행</p>
              </div>

              <div className="diff-row">
                <div className="diff-category">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  배송
                </div>
                <p className="diff-desc">계약 택배사 대비 업계 최저 단가 수준 유지</p>
              </div>

              <div className="diff-row">
                <div className="diff-category">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                  가격정책
                </div>
                <p className="diff-desc">정직한 원가 기반. 숨겨진 비용 없음</p>
              </div>

              <div className="diff-row">
                <div className="diff-category">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  추가 비용 기준
                </div>
                <p className="diff-desc">
                  OPP 교체 <strong>+100원</strong>
                  <br />
                  택갈이 <strong>+100원</strong>
                  <br />
                  반품 출고비 기준 <strong>+300원</strong>
                  <br />
                  합배송 <strong>+500원</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="section" id="philosophy">
        <div className="container">
          <div className="philosophy">
            <span className="philosophy-quote open">"</span>
            <h2 className="philosophy-title">모든 것은 흐름이다.</h2>
            <p className="philosophy-text">
              당신이 고객과 제품에만 집중할 수 있도록,
              <br />
              우리는 물류의 본질을 조용히, 완벽히 담당합니다.
            </p>
            <span className="philosophy-quote close">"</span>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="section" id="partners">
        <div className="container" style={{ textAlign: "center" }}>
          <h2 className="section-title">
            <span className="gradient">주요 판매 채널</span>
          </h2>

          <div style={{ display: "flex", justifyContent: "center", gap: 32, margin: "24px 0 48px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src="https://play-lh.googleusercontent.com/QtgW1o5zt3Z3gQedik_iYGcgz4pQhe41cZ2Lisp9PT7zV46AfQmXeS1ljbY9Ss2CnzY=w240-h480-rw"
                alt="에이블리"
                style={{ height: 56 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src="https://play-lh.googleusercontent.com/UdBg9MSQgbZS4IJ7VJxdtMBgp2rLbh5fSWX6Aswrj6qgmuwZO2DIgjy_8nvM2gmlq00=w240-h480-rw"
                alt="지그재그"
                style={{ height: 56 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src="https://play-lh.googleusercontent.com/AJ_9TiX1mhM4bU8d3b9Wn5TutLcw6XN4v082HaPPf05E-qHDbIZBrNCG5iHno6-aqDQ=w240-h480-rw"
                alt="판매채널1"
                style={{ height: 56 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src="https://play-lh.googleusercontent.com/mc7re225crbXCihrY67NGQKZaIFS62BisUUKcPuuYjfDMZ2EzhHY80qV5-IXTIVJHA=w240-h480-rw"
                alt="판매채널2"
                style={{ height: 56 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src="https://play-lh.googleusercontent.com/7SU9hJXrtTfGd_Lz-EBkdvi1gPYOiB-fJk26m25elBKViDsUhWe2y2uyW0CgSQjjFsSKfbO713V66vcoEwBPsuY=w240-h480-rw"
                alt="판매채널3"
                style={{ height: 56 }}
              />
            </div>
          </div>

          <h2 className="section-title">
            <span className="gradient">함께하는 셀러 파트너</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 28 }}>실제 출고를 함께 진행하고 있는 브랜드입니다</p>

          <div className="partner-slider-wrap">
            <div className="partner-slider-track">
              <div style={{ textAlign: "center" }}>
                <img
                  src="https://d3ha2047wt6x28.cloudfront.net/KrSDSuoZ4b4/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3NjA3NjA5Njg5MzY0NzkucG5n"
                  alt="그웬"
                />
                <div style={{ fontSize: 13, color: "#ccc", marginTop: 6 }}>그웬</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <img
                  src="https://d3ha2047wt6x28.cloudfront.net/vM8dn4OLYL8/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3NDk4OTg3NjQ4NTQ4ODUucG5n"
                  alt="하나비"
                />
                <div style={{ fontSize: 13, color: "#ccc", marginTop: 6 }}>하나비</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <img
                  src="https://d3ha2047wt6x28.cloudfront.net/aIbYgyHSxw4/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3NDAwNTk1NTk0NjU3MjAucG5n"
                  alt="패션큐브"
                />
                <div style={{ fontSize: 13, color: "#ccc", marginTop: 6 }}>패션큐브</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <img
                  src="https://d3ha2047wt6x28.cloudfront.net/D8D5tWWssE4/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3MTUwOTMwMjE3NjIzNDkuanBn"
                  alt="히소"
                />
                <div style={{ fontSize: 13, color: "#ccc", marginTop: 6 }}>히소</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <img
                  src="https://d3ha2047wt6x28.cloudfront.net/p8Y3m5AffkI/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3Mzk3NzEwMTQxMDA2MTUuUE5H"
                  alt="리아트리"
                />
                <div style={{ fontSize: 13, color: "#ccc", marginTop: 6 }}>리아트리</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ height: 40, width: 40, borderRadius: 12, background: "#ff69b4" }} />
                <div style={{ fontSize: 13, color: "#ccc", marginTop: 12 }}>프롬이브</div>
              </div>

              {/* track 길이 늘려서 자연스러운 반복(원본은 -50% 슬라이드) */}
              <div style={{ width: 80 }} />
              <div style={{ textAlign: "center" }}>
                <img
                  src="https://d3ha2047wt6x28.cloudfront.net/KrSDSuoZ4b4/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3NjA3NjA5Njg5MzY0NzkucG5n"
                  alt="그웬-2"
                />
                <div style={{ fontSize: 13, color: "#ccc", marginTop: 6 }}>그웬</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fixed Kakao */}
      <a className="fixed-kakao" href="http://pf.kakao.com/_xmXtTs/chat" target="_blank" rel="noreferrer" aria-label="카카오톡 문의">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      </a>
      </main>

      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
