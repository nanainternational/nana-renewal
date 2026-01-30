import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Link } from "wouter";

export default function AiDetailIndex() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#111] font-sans">
      <Navigation />

      <main className="pt-[80px]">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;600;800&display=swap');
          body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }

          .layout-container { max-width: 100%; margin: 0 auto; padding: 0 40px 60px; }
          .hero-wrap {
            background: linear-gradient(135deg, #FEE500 0%, #FFF8B0 100%);
            border-radius: 32px;
            padding: 70px 60px;
            margin: 20px 0 40px;
            width: 100%;
          }
          .hero-title { font-size: 44px; font-weight: 900; line-height: 1.15; letter-spacing: -1.2px; margin-bottom: 16px; }
          .hero-desc { font-size: 16px; color: rgba(0,0,0,0.6); font-weight: 700; margin-bottom: 28px; }

          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
          .card { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 22px; padding: 22px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); transition: 0.2s; }
          .card:hover { transform: translateY(-2px); box-shadow: 0 16px 35px rgba(0,0,0,0.08); border-color: rgba(0,0,0,0.12); }
          .card-title { font-size: 20px; font-weight: 900; letter-spacing: -0.4px; }
          .card-sub { margin-top: 8px; font-size: 13px; font-weight: 700; color: rgba(0,0,0,0.55); line-height: 1.5; }
          .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; margin-top: 16px; background: #111; color: #fff; border: none; padding: 14px 16px; border-radius: 14px; font-weight: 900; font-size: 14px; cursor: pointer; }
          .btn:hover { background: #333; }

          @media (max-width: 1024px) {
            .layout-container { padding: 0 24px 60px; }
            .hero-wrap { padding: 52px 30px; }
          }
          @media (max-width: 768px) {
            .layout-container { padding: 0 16px 60px; }
            .hero-wrap { padding: 38px 22px; border-radius: 24px; text-align: center; }
            .hero-title { font-size: 30px; }
            .grid { grid-template-columns: 1fr; }
          }
        `}</style>

        <div className="layout-container">
          <div className="hero-wrap">
            <h1 className="hero-title">AI 상세페이지</h1>
            <p className="hero-desc">VVIC / 1688 중 무엇을 할지 선택하세요.</p>

            <div className="grid">
              <div className="card">
                <div className="card-title">VVIC</div>
                <div className="card-sub">VVIC 상품 페이지 기반으로 이미지/AI 생성 기능을 사용합니다.</div>
                <Link href="/ai-detail/vvic">
                  <button className="btn">VVIC로 들어가기</button>
                </Link>
              </div>

              <div className="card">
                <div className="card-title">1688</div>
                <div className="card-sub">1688 상품 페이지 기반으로 이미지/AI 생성 기능을 사용합니다.</div>
                <Link href="/ai-detail/1688">
                  <button className="btn">1688로 들어가기</button>
                </Link>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
