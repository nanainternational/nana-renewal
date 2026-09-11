import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SeoHead, { SITE_URL } from "@/components/SeoHead";

const logisticsSeoSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "쇼핑몰 3PL 물류 서비스",
    serviceType: "온라인 쇼핑몰 3PL 물류대행",
    url: `${SITE_URL}/logistics`,
    provider: { "@type": "Organization", name: "나나인터내셔널", url: `${SITE_URL}/` },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "3PL", item: `${SITE_URL}/logistics` },
    ],
  },
];

const targetItems = [
  {
    icon: "📦",
    title: "포장 시간이 너무 오래 걸릴 때",
    description: "직접 포장하느라 판매, 상품기획, 고객관리에 집중하기 어려운 셀러.",
  },
  {
    icon: "💸",
    title: "고정 인건비가 부담될 때",
    description: "주문량이 애매해 직원을 두기 어렵고, 필요한 만큼만 맡기고 싶은 셀러.",
  },
  {
    icon: "⚡",
    title: "운영 효율을 높이고 싶을 때",
    description: "반복 물류 업무를 줄이고 성장에 필요한 핵심 업무에 집중하고 싶은 브랜드.",
  },
  {
    icon: "🎯",
    title: "상품은 잘 팔리는데 출고가 밀릴 때",
    description: "매출은 늘지만 포장과 출고가 성장 속도를 따라가지 못하는 셀러.",
  },
  {
    icon: "🛡️",
    title: "외주가 더 경제적일 때",
    description: "공간, 인력, 장비를 직접 운영하는 것보다 물류 외주가 효율적인 셀러.",
  },
  {
    icon: "✨",
    title: "전 과정을 맡기고 싶을 때",
    description: "입고, 정리, 다림질, 포장까지 한 번에 관리하고 싶은 셀러.",
  },
];

const serviceItems = [
  {
    title: "브랜드 포장",
    description: "상품과 브랜드의 결을 살리는 정성스러운 포장.",
    image: "https://gi.esmplus.com/secsiboy2/3pl/a121.jpg",
  },
  {
    title: "스팀 다림질",
    description: "의류 특성에 맞춘 꼼꼼한 다림질 작업.",
    image: "https://gi.esmplus.com/secsiboy2/3pl/a12w.jpg",
  },
  {
    title: "배송 대행",
    description: "안정적인 출고 운영과 경쟁력 있는 배송 단가.",
    image: "https://gi.esmplus.com/secsiboy2/3pl/a232.jpg",
  },
];

const sellerPartners = [
  { name: "하나비", src: "https://d3ha2047wt6x28.cloudfront.net/vM8dn4OLYL8/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3NDk4OTg3NjQ4NTQ4ODUucG5n" },
  { name: "패션큐브", src: "https://d3ha2047wt6x28.cloudfront.net/aIbYgyHSxw4/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3NDAwNTk1NTk0NjU3MjAucG5n" },
  { name: "히소", src: "https://d3ha2047wt6x28.cloudfront.net/D8D5tWWssE4/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3MTUwOTMwMjE3NjIzNDkuanBn" },
  { name: "리아트리", src: "https://d3ha2047wt6x28.cloudfront.net/p8Y3m5AffkI/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3Mzk3NzEwMTQxMDA2MTUuUE5H" },
  { name: "프롬이브", src: null },
  { name: "그웬", src: "https://d3ha2047wt6x28.cloudfront.net/KrSDSuoZ4b4/pr:MARKET_PROFILE_THUMB/czM6Ly9hYmx5LWltYWdlLWxlZ2FjeS9kYXRhL2JyYW5kX2NhdGVnb3J5L21hcmtldF9wcm9maWxlXzE3NjA3NjA5Njg5MzY0NzkucG5n" },
];

export default function Logistics() {
  return (
    <div className="min-h-screen bg-black notranslate" translate="no">
      <SeoHead
        title="쇼핑몰 3PL·물류대행 | 나나인터내셔널"
        description="온라인 쇼핑몰 사업자를 위한 나나인터내셔널 3PL 물류 서비스입니다. 상품 보관부터 주문 처리, 포장, 택배 출고까지 쇼핑몰 물류 운영을 지원합니다."
        canonical={`${SITE_URL}/logistics`}
        jsonLd={logisticsSeoSchemas}
      />
      <Navigation />

      <main className="pt-[88px] text-white logi-main">
        <style>{`
          .logi-main {
            --bg: #050505;
            --panel: #0e0e10;
            --panel2: #141417;
            --line: rgba(255,255,255,.10);
            --text: #f7f7f8;
            --muted: #a8a8b0;
            --cyan: #29d7ff;
            --purple: #9c6cff;
            --pink: #ff69b4;
            background: var(--bg);
            color: var(--text);
            font-family: inherit;
            -webkit-font-smoothing: antialiased;
          }

          .logi-main * { box-sizing: border-box; }
          .logi-main a { color: inherit; text-decoration: none; }
          .logi-container { max-width: 1160px; margin: 0 auto; padding: 0 24px; }

          .logi-hero {
            position: relative;
            min-height: 720px;
            display: flex;
            align-items: center;
            overflow: hidden;
            border-bottom: 1px solid rgba(255,255,255,.07);
          }
          .logi-hero-bg {
            position: absolute;
            inset: 0;
            background:
              linear-gradient(90deg,rgba(0,0,0,.88) 0%,rgba(0,0,0,.68) 48%,rgba(0,0,0,.78) 100%),
              linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.72)),
              url('https://raw.githubusercontent.com/nanainternational/nana-renewal/main/attached_assets/image_3pl_1.jpg') center/cover no-repeat;
          }
          .logi-hero::after {
            content: '';
            position: absolute;
            inset: auto 0 0;
            height: 180px;
            background: linear-gradient(transparent,var(--bg));
          }
          .logi-hero-content {
            position: relative;
            z-index: 3;
            max-width: 780px;
            padding: 95px 0 105px;
          }
          .logi-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid rgba(41,215,255,.25);
            background: rgba(41,215,255,.08);
            color: #9beeff;
            padding: 9px 14px;
            border-radius: 999px;
            font-size: 14px;
          }
          .logi-title {
            margin: 22px 0;
            font-size: clamp(40px,6vw,68px);
            line-height: 1.18;
            letter-spacing: -2.2px;
            font-weight: 700;
          }
          .logi-gradient {
            background: linear-gradient(90deg,var(--cyan),#7f83ff,var(--purple));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .logi-hero-desc {
            font-size: 19px;
            line-height: 1.8;
            color: #c9c9d0;
            max-width: 680px;
          }
          .logi-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 32px;
          }
          .logi-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 13px 20px;
            border-radius: 999px;
            font-size: 15px;
            border: 1px solid var(--line);
            transition: transform .2s ease, background .2s ease;
          }
          .logi-btn:hover { transform: translateY(-2px); }
          .logi-btn-primary {
            background: linear-gradient(90deg,#00badf,#7868f8);
            border: none;
            color: #fff !important;
          }
          .logi-btn-ghost { background: rgba(255,255,255,.06); }
          .logi-price-note { margin-top: 20px; color: #fff; font-size: 16px; }
          .logi-price-note strong { font-size: 24px; color: #ff87c1; }

          .logi-section { padding: 92px 0; }
          .logi-section-alt {
            background: #09090b;
            border-top: 1px solid rgba(255,255,255,.05);
            border-bottom: 1px solid rgba(255,255,255,.05);
          }
          .logi-section-head {
            text-align: center;
            max-width: 780px;
            margin: 0 auto 44px;
          }
          .logi-eyebrow {
            font-size: 13px;
            letter-spacing: .13em;
            color: #8deaff;
            margin-bottom: 10px;
          }
          .logi-section-title {
            font-size: clamp(30px,4vw,44px);
            margin: 0 0 14px;
            line-height: 1.25;
            letter-spacing: -1.4px;
            font-weight: 700;
          }
          .logi-lead {
            color: var(--muted);
            font-size: 17px;
            line-height: 1.75;
            margin: 0;
          }

          .logi-target-grid {
            display: grid;
            grid-template-columns: repeat(3,1fr);
            gap: 16px;
          }
          .logi-card {
            min-height: 190px;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 25px;
            background: linear-gradient(180deg,#111115,#0b0b0e);
          }
          .logi-card-icon {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(41,215,255,.10);
            border: 1px solid rgba(41,215,255,.13);
            font-size: 20px;
          }
          .logi-card h3 { font-size: 19px; margin: 20px 0 9px; }
          .logi-card p { margin: 0; color: #a9a9b1; line-height: 1.65; font-size: 15px; }

          .logi-service-grid {
            display: grid;
            grid-template-columns: repeat(3,1fr);
            gap: 18px;
          }
          .logi-service {
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid var(--line);
            background: #111;
          }
          .logi-service-img {
            width: 100%;
            height: 250px;
            object-fit: cover;
            display: block;
          }
          .logi-service-body { padding: 22px; }
          .logi-service-body b { font-size: 20px; }
          .logi-service-body p { margin: 8px 0 0; color: var(--muted); line-height: 1.6; }

          .logi-points {
            max-width: 900px;
            margin: 0 auto;
            border: 1px solid var(--line);
            border-radius: 20px;
            overflow: hidden;
            background: #0d0d10;
          }
          .logi-point-row {
            display: grid;
            grid-template-columns: 170px 1fr;
            gap: 18px;
            padding: 20px 24px;
            border-top: 1px solid var(--line);
          }
          .logi-point-row:first-child {
            border-top: none;
            background: linear-gradient(90deg,rgba(41,215,255,.15),rgba(156,108,255,.11));
          }
          .logi-point-label { color: #fff; }
          .logi-point-desc { color: #b5b5bd; line-height: 1.65; }
          .logi-point-desc strong { color: #fff; }

          .logi-quote {
            max-width: 820px;
            margin: 0 auto;
            text-align: center;
            padding: 54px 24px;
            border-top: 1px solid var(--line);
            border-bottom: 1px solid var(--line);
          }
          .logi-quote-title { font-size: 36px; margin-bottom: 15px; }
          .logi-quote p { color: #aaaab2; font-size: 18px; line-height: 1.8; margin: 0; }

          .logi-channels {
            display: flex;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 26px;
          }
          .logi-channel {
            border: 1px solid var(--line);
            background: #0f0f12;
            border-radius: 999px;
            padding: 12px 18px;
            color: #c9c9d0;
            font-size: 14px;
          }
          .logi-partner-box {
            max-width: 920px;
            margin: 36px auto 0;
            padding: 22px;
            border: 1px solid var(--line);
            border-radius: 18px;
            background: #0d0d10;
            display: flex;
            gap: 26px;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
          }
          .logi-partner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: #d5d5da;
            font-size: 13px;
          }
          .logi-partner img,
          .logi-partner-placeholder {
            width: 42px;
            height: 42px;
            object-fit: contain;
            border-radius: 11px;
          }
          .logi-partner-placeholder { background: linear-gradient(135deg,var(--pink),var(--purple)); }

          .logi-center-section { padding-top: 70px; }
          .logi-center-panel {
            max-width: 900px;
            margin: 0 auto;
            border: 1px solid var(--line);
            border-radius: 22px;
            background: linear-gradient(180deg,#111115,#0b0b0d);
            padding: 30px;
          }
          .logi-center-title { text-align: center; margin-bottom: 24px; }
          .logi-center-title .logi-section-title { font-size: 32px; }
          .logi-centers {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }
          .logi-center {
            padding: 22px;
            border: 1px solid rgba(255,255,255,.08);
            border-radius: 16px;
            background: #0a0a0c;
          }
          .logi-center small { color: #80e8ff; }
          .logi-center h3 { margin: 9px 0; font-size: 21px; }
          .logi-center p { margin: 0; color: #aaaab3; line-height: 1.65; }
          .logi-phone {
            margin-top: 16px;
            border-radius: 16px;
            background: rgba(41,215,255,.07);
            border: 1px solid rgba(41,215,255,.16);
            padding: 18px 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
          }
          .logi-phone span { color: #aaaab2; }
          .logi-phone a { font-size: 22px; color: #8beaff; font-weight: 700; }

          @media (max-width: 850px) {
            .logi-hero { min-height: 650px; }
            .logi-hero-content { padding: 75px 0 90px; }
            .logi-target-grid,
            .logi-service-grid,
            .logi-centers { grid-template-columns: 1fr; }
            .logi-point-row { grid-template-columns: 1fr; gap: 7px; }
            .logi-section { padding: 68px 0; }
            .logi-container { padding: 0 18px; }
          }
        `}</style>

        <section className="logi-hero" id="hero">
          <div className="logi-hero-bg" />
          <div className="logi-container">
            <div className="logi-hero-content">
              <div className="logi-badge">ONLINE SELLER 3PL</div>
              <h1 className="logi-title">
                온라인 쇼핑몰을 위한
                <br />
                <span className="logi-gradient">3PL 물류 서비스</span>
              </h1>
              <p className="logi-hero-desc">
                입고부터 정리, 다림질, 포장, 택배 출고까지. 소규모 브랜드가 판매와 상품에 집중할 수 있도록 필요한 물류를 한 번에 지원합니다.
              </p>
              <div className="logi-actions">
                <a className="logi-btn logi-btn-primary" href="http://pf.kakao.com/_xmXtTs/chat" target="_blank" rel="noreferrer">
                  💬 1:1 문의상담
                </a>
                <a className="logi-btn logi-btn-ghost" href="#price">
                  📊 가격 바로보기
                </a>
              </div>
              <div className="logi-price-note">기본 출고 기준 <strong>3,500원</strong></div>
            </div>
          </div>
        </section>

        <section className="logi-section" id="target">
          <div className="logi-container">
            <div className="logi-section-head">
              <div className="logi-eyebrow">WHO WE HELP</div>
              <h2 className="logi-section-title">이런 분을 위한 <span className="logi-gradient">서비스</span>입니다</h2>
              <p className="logi-lead">물류 업무 때문에 핵심 업무에 집중하기 어려운 온라인 셀러를 위해 준비했습니다.</p>
            </div>
            <div className="logi-target-grid">
              {targetItems.map((item) => (
                <div className="logi-card" key={item.title}>
                  <div className="logi-card-icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="logi-section logi-section-alt" id="services">
          <div className="logi-container">
            <div className="logi-section-head">
              <div className="logi-eyebrow">CORE SERVICE</div>
              <h2 className="logi-section-title"><span className="logi-gradient">대표 서비스</span></h2>
              <p className="logi-lead">입고 후 상품 준비부터 포장과 출고까지 필요한 과정을 안정적으로 운영합니다.</p>
            </div>
            <div className="logi-service-grid">
              {serviceItems.map((service) => (
                <div className="logi-service" key={service.title}>
                  <img className="logi-service-img" src={service.image} alt={service.title} />
                  <div className="logi-service-body">
                    <b>{service.title}</b>
                    <p>{service.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="logi-section" id="price">
          <div className="logi-container">
            <div className="logi-section-head">
              <div className="logi-eyebrow">WHY NANA</div>
              <h2 className="logi-section-title"><span className="logi-gradient">차별화 포인트</span></h2>
              <p className="logi-lead">기본 운영 원칙과 추가 비용 기준을 한눈에 확인할 수 있습니다.</p>
            </div>
            <div className="logi-points">
              <div className="logi-point-row">
                <div className="logi-point-label"><strong>구분</strong></div>
                <div className="logi-point-desc"><strong>우리가 추구하는 방향</strong></div>
              </div>
              <div className="logi-point-row">
                <div className="logi-point-label">📦 포장</div>
                <div className="logi-point-desc">단가 중심이 아닌 브랜드의 결을 살리는 포장</div>
              </div>
              <div className="logi-point-row">
                <div className="logi-point-label">👕 다림질</div>
                <div className="logi-point-desc">의류 특성별로 최소 1~2분 이상 꼼꼼하게 진행</div>
              </div>
              <div className="logi-point-row">
                <div className="logi-point-label">🚚 배송</div>
                <div className="logi-point-desc">계약 택배사 대비 경쟁력 있는 단가 수준 유지</div>
              </div>
              <div className="logi-point-row">
                <div className="logi-point-label">₩ 가격정책</div>
                <div className="logi-point-desc">정직한 원가 기반. 숨겨진 비용 없음</div>
              </div>
              <div className="logi-point-row">
                <div className="logi-point-label">＋ 추가 비용</div>
                <div className="logi-point-desc">
                  OPP 교체 <strong>0원</strong> · 택갈이 <strong>0원</strong> · 합배송 <strong>0원</strong> · 반품 출고 <strong>+300원</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="logi-section logi-section-alt" id="philosophy">
          <div className="logi-container">
            <div className="logi-quote">
              <div className="logi-quote-title logi-gradient">모든 것은 흐름이다.</div>
              <p>
                당신이 고객과 제품에만 집중할 수 있도록,
                <br />
                우리는 물류의 본질을 조용히, 완벽히 담당합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="logi-section" id="partners">
          <div className="logi-container">
            <div className="logi-section-head">
              <div className="logi-eyebrow">PARTNERS</div>
              <h2 className="logi-section-title">주요 판매 채널 · 셀러 파트너</h2>
              <p className="logi-lead">다양한 온라인 판매 채널과 실제 출고 브랜드를 함께 지원합니다.</p>
            </div>
            <div className="logi-channels">
              <div className="logi-channel">에이블리</div>
              <div className="logi-channel">지그재그</div>
              <div className="logi-channel">쿠팡</div>
              <div className="logi-channel">스마트스토어</div>
              <div className="logi-channel">자사몰</div>
            </div>
            <div className="logi-partner-box">
              {sellerPartners.map((partner) => (
                <div className="logi-partner" key={partner.name}>
                  {partner.src ? (
                    <img src={partner.src} alt={partner.name} />
                  ) : (
                    <div className="logi-partner-placeholder" aria-hidden="true" />
                  )}
                  <span>{partner.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="logi-section logi-section-alt logi-center-section" id="center-info">
          <div className="logi-container">
            <div className="logi-center-panel">
              <div className="logi-center-title">
                <div className="logi-eyebrow">LOGISTICS CENTER</div>
                <h2 className="logi-section-title">물류센터 안내</h2>
              </div>
              <div className="logi-centers">
                <div className="logi-center">
                  <small>BUCHEON</small>
                  <h3>부천점</h3>
                  <p>경기도 부천시 경인로137번가길 83</p>
                </div>
                <div className="logi-center">
                  <small>SIHEUNG</small>
                  <h3>시흥점</h3>
                  <p>경기도 시흥시 수인로3077번길 24-6</p>
                </div>
              </div>
              <div className="logi-phone">
                <span>통합센터</span>
                <a href="tel:010-7715-8993">010-7715-8993</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
