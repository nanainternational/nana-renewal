import { useState } from "react";
import { Link } from "wouter";
import { Package, Sparkles, Headset, Building2, ArrowUpRight, Check, PackageOpen, Warehouse, PackageCheck, Truck, Shirt, ClipboardList, ListChecks, Armchair, Camera, LampDesk, MapPin } from "lucide-react";
import "@/pages/home-services.css";

const services = [
  { id: "logistics", icon: Package, category: "FULFILLMENT", name: "3PL 물류", summary: "보관·포장·출고는 맡기고\n판매에 집중하세요.", linkText: "물류 서비스 보기", label: "01 / 3PL LOGISTICS", headline: "주문이 늘어도,\n출고 걱정은 줄어들도록.", description: "상품 입고부터 보관, 포장, 택배 출고까지. 번거로운 물류 업무를 맡기고 상품과 판매에 집중하세요.", tags: ["상품 보관", "포장 · 출고", "물류 상담"], action: "물류 상담하기", href: "/logistics" },
  { id: "ai", icon: Sparkles, category: "AI CONTENT", name: "AI 상세페이지", summary: "상품 사진으로 준비하는\n상세페이지와 판매 문구.", linkText: "제작 방식 보기", label: "02 / AI DETAIL PAGE", headline: "상품 사진 한 장에서,\n판매를 위한 상세페이지로.", description: "보유한 상품 사진으로 시작해 보세요. AI로 판매 문구와 상세페이지 제작을 준비할 수 있습니다.", tags: ["사진 업로드", "판매 문구", "상세페이지 제작"], action: "상세페이지 시작하기", href: "/ai-detail/upload" },
  { id: "call", icon: Headset, category: "CUSTOMER CARE", name: "해피콜서비스", summary: "고객 안내와 확인 연락을\n더 편하게 관리하세요.", linkText: "서비스 알아보기", label: "03 / HAPPY CALL SERVICE", headline: "놓치기 쉬운 고객 연락,\n더 체계적으로.", description: "고객에게 필요한 안내와 확인 연락을 관리하세요. 이용 목적과 업무 방식에 맞는 서비스 범위를 상담해 드립니다.", tags: ["고객 안내", "확인 연락", "이용 상담"], action: "해피콜 이용 문의", href: "/happy-call" },
  { id: "office", icon: Building2, category: "SHARED OFFICE", name: "공유오피스", summary: "일하는 공간부터 촬영까지\n쇼핑몰을 위한 업무 공간.", linkText: "공간 둘러보기", label: "04 / SHARED OFFICE", headline: "일하고, 촬영하고,\n사업을 키우는 공간.", description: "쇼핑몰 운영을 위한 사무공간과 촬영 환경을 만나보세요. 실제 공간과 입주 조건을 확인한 뒤 상담하실 수 있습니다.", tags: ["사무공간", "촬영 공간", "입주 상담"], action: "공간 · 입주 문의", href: "/startup-center" },
] as const;
type ServiceId = typeof services[number]["id"];

function Illustration({ service }: { service: ServiceId }) {
  if (service === "ai") return <>
    <div className="nh-demo-head">사진에서 콘텐츠로<span>구성 예시</span></div>
    <div className="nh-shirt"><Shirt aria-hidden="true" /><div><p>상품 사진 업로드</p><small>내 상품 이미지로 시작</small></div></div>
    <div className="nh-preview-row"><span>상품 특징 · 판매 문구 · 상세페이지</span><Sparkles aria-hidden="true" /></div>
    <p className="nh-demo-caption">실제 서비스에서는 생성 결과를 확인하고 사용합니다.</p>
  </>;
  if (service === "call") return <>
    <div className="nh-demo-head">고객 응대 업무 흐름<span>소개용 예시</span></div>
    <div className="nh-preview-row"><span>01 &nbsp; 안내할 내용 준비</span><ClipboardList aria-hidden="true" /></div>
    <div className="nh-preview-row"><span>02 &nbsp; 고객 연락 진행</span><Headset aria-hidden="true" /></div>
    <div className="nh-preview-row"><span>03 &nbsp; 진행 내용 확인</span><ListChecks aria-hidden="true" /></div>
  </>;
  if (service === "office") return <>
    <div className="nh-demo-head">쇼핑몰을 위한 업무 공간<span>공간 구성</span></div>
    <div className="nh-process"><div><Armchair aria-hidden="true" />사무실</div><div><Camera aria-hidden="true" />촬영실</div><div><LampDesk aria-hidden="true" />업무</div><div><MapPin aria-hidden="true" />방문 상담</div></div>
    <p className="nh-demo-caption">공간 사진과 위치·입주 조건을 확인해 보세요.</p>
  </>;
  return <>
    <div className="nh-demo-head">상품이 고객에게 도착하기까지<span>서비스 흐름</span></div>
    <div className="nh-rack" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div>
    <div className="nh-process"><div><PackageOpen aria-hidden="true" />입고</div><div><Warehouse aria-hidden="true" />보관</div><div><PackageCheck aria-hidden="true" />포장</div><div><Truck aria-hidden="true" />출고</div></div>
    <p className="nh-demo-caption">복잡한 물류 업무를 하나의 흐름으로.</p>
  </>;
}

export default function HomeServices() {
  const [selected, setSelected] = useState<ServiceId>("logistics");
  const active = services.find(service => service.id === selected)!;
  return <main className="nana-home-main" id="main-content"><div className="nh-container">
    <section className="nh-hero" aria-labelledby="home-heading">
      <p className="nh-eyebrow">YOUR PARTNER IN EVERY STEP</p>
      <h1 id="home-heading">판매에 집중하세요.<br /><em>나나가 함께하겠습니다.</em></h1>
      <p className="nh-sub">물류부터 상세페이지, 고객 응대, 사무공간까지.<br />지금 필요한 서비스를 선택해 보세요.</p>
    </section>
    <section className="nh-services" aria-label="네 가지 서비스">
      {services.map(service => <button type="button" className="nh-service" key={service.id}
        aria-pressed={selected === service.id} aria-controls="home-service-detail"
        data-testid={`home-service-${service.id}`} onClick={() => setSelected(service.id)}>
        <service.icon aria-hidden="true" />
        <span><span className="nh-category">{service.category}</span><span className="nh-service-title">{service.name}</span></span>
        <span className="nh-summary">{service.summary}</span>
        <span className="nh-cardlink">{service.linkText}<ArrowUpRight aria-hidden="true" /></span>
      </button>)}
    </section>
    <div className="nh-strip"><span><Check aria-hidden="true" />필요한 서비스만 선택</span><span><Check aria-hidden="true" />온라인 셀러를 위한 구성</span><span><Check aria-hidden="true" />서비스별 상담 안내</span></div>
    <section className="nh-detail" id="home-service-detail" aria-live="polite" aria-atomic="true" aria-label={`${active.name} 소개`}>
      <div className="nh-detail-copy"><p className="nh-eyebrow">{active.label}</p><h2>{active.headline}</h2><p className="nh-description">{active.description}</p>
        <div className="nh-tags">{active.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        <Link className="nh-action" href={active.href} data-testid="home-service-action">{active.action}<ArrowUpRight aria-hidden="true" /></Link>
      </div><div className="nh-demo"><Illustration service={selected} /></div>
    </section>
    <section className="nh-cta" aria-labelledby="home-contact-heading"><div><h2 id="home-contact-heading">지금, 어떤 도움이 필요하신가요?</h2><p>사업 단계에 맞는 서비스부터 함께 알아보세요.</p></div>
      <a className="nh-action" href="https://pf.kakao.com/_xmXtTs/chat" target="_blank" rel="noopener noreferrer">서비스 상담하기<ArrowUpRight aria-hidden="true" /></a>
    </section>
  </div></main>;
}
