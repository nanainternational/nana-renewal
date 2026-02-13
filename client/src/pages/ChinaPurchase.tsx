import Navigation from "@/components/Navigation";
import ChinaPurchaseSection from "@/components/ChinaPurchaseSection";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { 
  Globe2,          
  Handshake,       
  Scale,           
  Truck,           
  CheckCircle2, 
  Building2,
  MapPin,
  RefreshCw,
  Download,
  AlertCircle,
  Calculator,
  ChevronRight,
  ShoppingCart
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 1688 테마 컬러 상수
const THEME_COLOR = "#FF5000";
const THEME_BG_LIGHT = "#FFF0E6";

const advantages = [
  {
    icon: Building2,
    title: "공장 직거래 소싱",
    description: "중간 도매상을 거치지 않고 공장과 직접 컨택하여 원가 경쟁력을 극대화합니다.",
    highlight: "마진 ZERO 도전"
  },
  {
    icon: Handshake,
    title: "MOQ/단가 협상",
    description: "단순 발주가 아닙니다. 수량에 따른 단가 인하 및 생산 일정을 전문적으로 협상합니다.",
    highlight: "전문 MD 케어"
  },
  {
    icon: Scale,
    title: "현지 정밀 검수",
    description: "한국 발송 전, 1688 상세페이지와 실물을 대조하여 불량률을 최소화합니다.",
    highlight: "실사 리포트"
  },
  {
    icon: Truck,
    title: "통관/물류 원스톱",
    description: "복잡한 수입 통관 서류부터 LCL/FCL 해운, 국내 배송지 도착까지 책임집니다.",
    highlight: "신속 통관"
  }
];

const detailPoints = [
  "의류/잡화/공산품 10년 이상 소싱 노하우",
  "C/O (원산지증명서) 및 각종 인증 서류 대행",
  "불량 발생 시 현지 교환/반품 신속 처리",
  "쿠팡 로켓그로스/3PL 창고 직입고 지원"
];

export default function ChinaPurchase() {

  const API_BASE = "https://nana-renewal-backend.onrender.com";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [payload, setPayload] = useState<any>(null);

  const pageType = useMemo(() => {
    const t = payload?.page_type || payload?.page || payload?.data?.page_type || payload?.data?.page;
    return t || (payload?.items ? "order" : "detail");
  }, [payload]);

  const data = payload?.data ?? payload;

  const resolveImgSrc = (u: string) => {
    const s = String(u || "").trim();
    if (!s) return "";
    if (s.includes("alicdn.com")) {
      return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(s)}`;
    }
    return s;
  };

  const fetchLatest = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/1688/extract_client`, { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setPayload(json);
    } catch (e: any) {
      setError(e?.message || String(e));
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  const resetData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/1688/extract_client`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setPayload(null);
    } catch (e: any) {
      setError(e?.message || String(e));
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  // 총 수량 계산
  const totalQuantity = useMemo(() => {
    if (!data?.items || !Array.isArray(data.items)) return 0;
    return data.items.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 0), 0);
  }, [data]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-slate-800">
      <Navigation />

      {/* 1688 데이터 수집 섹션 */}
      <section className="pt-28 pb-10">
        <div className="max-w-[1200px] mx-auto px-4">
          
          {/* 상단 컨트롤러: 1688 헤더 스타일 */}
          <div className="bg-white rounded-t-lg border border-b-0 border-gray-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FFF0E6] text-[#FF5000]">
                 <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-bold text-lg leading-none text-gray-800">수집된 주문 리스트</h2>
                <p className="text-xs text-gray-500 mt-1">확장프로그램에서 전송한 데이터를 확인하고 견적을 요청하세요.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={fetchLatest} 
                disabled={loading}
                className="bg-[#FF5000] hover:bg-[#ff6a00] text-white font-bold shadow-sm transition-all active:scale-95"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2"/> : <Download className="w-4 h-4 mr-2"/>}
                데이터 가져오기
              </Button>
              <Button 
                variant="outline" 
                onClick={resetData} 
                disabled={loading}
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                초기화
              </Button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm flex items-center animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 mr-2" />
              데이터를 불러오지 못했습니다: {error}
            </div>
          )}

          {/* 데이터 없음 상태 (Placeholder) */}
          {!error && !data && (
            <div className="bg-white border border-gray-200 rounded-b-lg p-16 text-center shadow-sm flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Download className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">아직 데이터가 없습니다</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                1688 상세페이지 혹은 결제 화면에서 <span className="text-[#FF5000] font-bold">확장프로그램 버튼</span>을 눌러 데이터를 전송해주세요.
              </p>
              <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded">
                Server Status: Online
              </div>
            </div>
          )}

          {/* 주문 데이터 (Order Type) - 1688 장바구니 스타일 */}
          {data && pageType === "order" && Array.isArray(data?.items) && (
            <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm flex flex-col">
              
              {/* 테이블 헤더 */}
              <div className="grid grid-cols-12 gap-2 bg-[#FAFAFA] py-3 px-4 text-xs text-gray-500 font-medium border-b border-gray-200 text-center">
                <div className="col-span-6 text-left pl-2">상품정보</div>
                <div className="col-span-2">옵션</div>
                <div className="col-span-2">수량</div>
                <div className="col-span-2">금액(위안)</div>
              </div>

              {/* 리스트 영역 */}
              <div className="flex-1 divide-y divide-gray-100 min-h-[200px] max-h-[600px] overflow-y-auto">
                {data.items.map((it: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-[#FFFDFB] transition-colors group">
                    {/* 상품 정보 */}
                    <div className="col-span-6 flex gap-4 text-left">
                      <div className="relative shrink-0 border border-gray-200 rounded-sm overflow-hidden w-20 h-20 bg-gray-50">
                        {it?.thumb ? (
                          <img src={resolveImgSrc(it.thumb)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-xs text-gray-300">No Img</div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center gap-1 pr-4">
                        <div className="text-xs text-[#FF5000] font-medium">{it?.seller || "1688 Seller"}</div>
                        <a href="#" className="text-sm text-gray-800 line-clamp-2 leading-snug hover:text-[#FF5000] hover:underline underline-offset-2 transition-colors">
                          {it?.name || "상품명 정보 없음"}
                        </a>
                      </div>
                    </div>

                    {/* 옵션 */}
                    <div className="col-span-2 flex justify-center">
                       <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded text-center break-keep leading-tight">
                         {it?.option || "기본"}
                       </div>
                    </div>

                    {/* 수량 */}
                    <div className="col-span-2 text-center text-sm font-medium text-gray-700">
                       {it?.quantity ?? 1}
                    </div>

                    {/* 금액 */}
                    <div className="col-span-2 text-center">
                       <span className="text-sm font-bold text-[#FF5000]">¥ {it?.amount ?? "-"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 1688 스타일 하단 결제바 (Settlement Bar) */}
              <div className="bg-[#FAFAFA] border-t border-gray-200 p-4 flex flex-col md:flex-row items-center justify-end gap-6 md:gap-8 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-6">
                  <div className="text-sm text-gray-500">
                    선택 상품 <span className="text-[#FF5000] font-bold mx-1">{totalQuantity}</span>종
                  </div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-sm font-medium text-gray-600">총 결제예정 금액:</span>
                     <span className="text-3xl font-bold text-[#FF5000] font-mono tracking-tight">
                       <span className="text-lg mr-1">¥</span>
                       {data?.total_payable || "0.00"}
                     </span>
                  </div>
                </div>
                
                <Button className="w-full md:w-auto bg-[#FF5000] hover:bg-[#E04600] text-white text-lg font-bold h-12 px-10 rounded-sm shadow-md transition-transform active:scale-95">
                  견적 신청하기
                </Button>
              </div>
            </div>
          )}

          {/* 상세 페이지 데이터 (Detail Type) */}
          {data && pageType !== "order" && (
            <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm p-6 animate-in fade-in">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                <span className="bg-[#FF5000] text-white text-xs px-2 py-0.5 rounded font-bold">상세페이지</span>
                <span className="text-gray-500 text-sm">해당 상품에 대한 수입 견적을 요청합니다.</span>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                {/* 이미지 섹션 */}
                <div className="w-full md:w-1/3 space-y-4">
                  <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                     {data?.main_media?.[0] ? (
                       <img src={data.main_media[0]} alt="" className="w-full h-full object-cover" />
                     ) : (
                       <div className="flex items-center justify-center h-full text-gray-300">이미지 없음</div>
                     )}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {(data?.main_media || []).slice(0, 5).map((u: string, i: number) => (
                      <div key={i} className="aspect-square rounded border border-gray-200 overflow-hidden hover:border-[#FF5000] cursor-pointer">
                        <img src={u} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 정보 섹션 */}
                <div className="flex-1 space-y-6">
                   <div>
                      <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug mb-3">
                        {data?.product_name || "상품명을 불러올 수 없습니다."}
                      </h1>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center bg-[#FFF0E6] text-[#FF5000] text-xs px-2 py-1 rounded font-medium border border-[#FF5000]/20">
                          1688 Verified
                        </span>
                        <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-medium">
                          수입가능품목
                        </span>
                      </div>
                   </div>

                   <div className="bg-[#f9f9f9] p-6 rounded-lg border border-gray-100">
                      <div className="text-sm text-gray-500 mb-1">예상 도매가</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg text-[#FF5000] font-bold">¥</span>
                        <span className="text-4xl font-extrabold text-[#FF5000] tracking-tight">{data?.price || data?.unit_price || "-"}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">* 환율 및 옵션에 따라 실제 견적가는 달라질 수 있습니다.</p>
                   </div>

                   <Button className="w-full h-14 text-lg font-bold bg-[#FF5000] hover:bg-[#E04600] rounded-md shadow-lg shadow-orange-200">
                     이 상품으로 견적 문의하기
                   </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Hero Section: 1688 스타일 디자인 통합 */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          
          {/* 섹션 헤더 */}
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              중국 사입, <span className="text-[#FF5000]">전문가의 손길</span>이 필요하신가요?
            </h2>
            <p className="text-lg text-gray-500">
              복잡한 무역 절차는 저희에게 맡기시고, 사장님은 판매에만 집중하세요.
            </p>
          </div>

          {/* 서비스 강점 카드 (Orange Point) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {advantages.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card key={index} className="group p-6 border-slate-100 hover:border-[#FF5000] hover:shadow-[0_8px_30px_rgb(255,80,0,0.1)] transition-all duration-300">
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-[#FFF0E6] flex items-center justify-center group-hover:bg-[#FF5000] transition-colors duration-300">
                        <Icon className="w-7 h-7 text-[#FF5000] group-hover:text-white transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-[#FF5000] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed break-keep">
                      {item.description}
                    </p>
                    <div className="mt-auto pt-4">
                       <span className="text-xs font-bold text-[#FF5000] bg-[#FFF0E6] px-2 py-1 rounded">
                         {item.highlight}
                       </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* 하단 프로세스 가이드 (1688 가이드 스타일) */}
          <div className="bg-[#FFFcfb] rounded-3xl p-8 md:p-12 border border-[#FF5000]/10 shadow-sm relative overflow-hidden">
            {/* 데코레이션 원 */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFF0E6] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none"></div>

            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <div className="inline-block bg-[#FF5000] text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                  Why Nana International?
                </div>
                <h2 className="text-3xl font-bold mb-6 leading-tight text-slate-900">
                  가장 안전하고 저렴한<br />
                  <span className="text-[#FF5000]">무역 파트너</span>를 약속합니다.
                </h2>
                
                <ul className="space-y-4 mt-8">
                  {detailPoints.map((point, i) => (
                    <li key={i} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-[#FF5000] shrink-0" />
                      <span className="text-slate-700 font-medium">{point}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex gap-4">
                   <Button className="bg-[#FF5000] hover:bg-[#E04600] text-white px-8 py-6 text-lg font-bold rounded-full shadow-lg shadow-orange-200/50">
                     무료 견적 상담하기
                   </Button>
                </div>
              </div>

              {/* 우측 비주얼 (계산기/차트 느낌) */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xl relative">
                 <div className="absolute -top-3 -right-3 bg-[#FF5000] text-white p-2 rounded-lg shadow-lg rotate-12 z-20">
                    <Calculator className="w-6 h-6" />
                 </div>
                 
                 <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                       <span className="font-bold text-gray-700">예상 수입 비용 구조</span>
                       <span className="text-xs text-gray-400">Standard Import</span>
                    </div>
                    
                    {/* 그래프 바 시각화 */}
                    <div className="space-y-4">
                       <div>
                          <div className="flex justify-between text-sm mb-1">
                             <span className="text-gray-600">물품 대금 (Product Cost)</span>
                             <span className="font-bold">70%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full bg-slate-800 w-[70%]"></div>
                          </div>
                       </div>
                       <div>
                          <div className="flex justify-between text-sm mb-1">
                             <span className="text-gray-600">물류비 (Shipping)</span>
                             <span className="font-bold">15%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full bg-gray-400 w-[15%]"></div>
                          </div>
                       </div>
                       <div>
                          <div className="flex justify-between text-sm mb-1">
                             <span className="text-[#FF5000] font-bold">수수료 (Agency Fee)</span>
                             <span className="font-bold text-[#FF5000]">Lowest!</span>
                          </div>
                          <div className="h-2 w-full bg-[#FFF0E6] rounded-full overflow-hidden">
                             <div className="h-full bg-[#FF5000] w-[5%]"></div>
                          </div>
                          <p className="text-xs text-[#FF5000] mt-1 text-right font-medium">업계 최저 수수료 보장</p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ChinaPurchaseSection />
      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
