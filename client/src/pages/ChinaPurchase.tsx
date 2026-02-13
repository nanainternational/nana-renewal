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
  ShoppingCart,
  Anchor,
  FileText,
  PackageCheck,
  Ship
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 1688 테마 컬러 상수
const THEME_COLOR = "#FF5000";

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

// 스크린샷에 있는 체크리스트 내용 반영
const checkPoints = [
  "의류, 잡화, 생활용품, 전자부품 등 다양한 공산품도 대응",
  "사이즈/규격 정보는 한국 기준에 맞춰 확인",
  "색상 옵션은 실제 컬러 기준으로 상담",
  "포장 상태 사진 공유로 검수 및 확인",
  "그 외 다양한 수출입 절차 대행",
  "주문 시 요청사항을 완벽하게 반영해 드립니다"
];

// 스크린샷에 있는 프로세스 내용 반영
const processSteps = [
  { icon: FileText, title: "사입 요청" },
  { icon: PackageCheck, title: "입고 확인" },
  { icon: Ship, title: "출항 (화/토)" },
  { icon: MapPin, title: "국내 도착/통관" },
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

          {/* 데이터 없음 상태 */}
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

          {/* 하단 중국사입 신청안내 (요청하신 스크린샷 디자인 반영) */}
          <div className="bg-[#FFFcfb] rounded-3xl p-8 md:p-12 border border-[#FF5000]/10 shadow-sm mt-20">
             
             {/* 타이틀 영역 */}
             <div className="text-center mb-12">
               <div className="flex items-center justify-center gap-2 mb-3">
                 <Anchor className="w-6 h-6 text-[#FF5000]" />
                 <h2 className="text-3xl font-bold text-slate-900 tracking-tight">중국사입 신청안내</h2>
               </div>
               <p className="text-gray-500 max-w-2xl mx-auto break-keep leading-relaxed">
                 구매대행이 아닌 현지 공장을 컨택해 직접 사입이며, 원하시는 조건에 맞춰 대량·소량 사입은 물론, 샘플 확인도 빠르게 도와드립니다.
               </p>
             </div>

             <div className="grid md:grid-cols-2 gap-8">
                {/* 왼쪽 카드: 걱정하지 마세요 리스트 */}
                <Card className="p-8 border-none shadow-[0_8px_30px_rgba(0,0,0,0.04)] bg-white h-full">
                   <h3 className="text-xl font-bold mb-6 text-slate-900">
                     사입이 처음이신 분들도 걱정하지 마세요!
                   </h3>
                   <ul className="space-y-4">
                     {checkPoints.map((text, idx) => (
                       <li key={idx} className="flex items-start gap-3">
                         <CheckCircle2 className="w-5 h-5 text-[#FF5000] shrink-0 mt-0.5" />
                         <span className="text-gray-600 text-sm md:text-base font-medium">{text}</span>
                       </li>
                     ))}
                   </ul>
                   <div className="mt-8 pt-6 border-t border-gray-100">
                     <p className="text-sm text-gray-500">
                       견적은 접수 후 <span className="font-bold text-[#FF5000]">1일~2일 이내</span> 안내됩니다.
                     </p>
                   </div>
                </Card>

                {/* 오른쪽 카드: 진행 프로세스 */}
                <Card className="p-8 border-none shadow-[0_8px_30px_rgba(0,0,0,0.04)] bg-white h-full flex flex-col">
                   <h3 className="text-xl font-bold mb-8 text-slate-900">
                     진행 프로세스
                   </h3>
                   <div className="flex-1 flex items-center justify-center">
                      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-2">
                        {processSteps.map((step, idx) => {
                          const StepIcon = step.icon;
                          return (
                            <div key={idx} className="flex flex-col items-center text-center group">
                               <div className="w-14 h-14 rounded-full bg-[#FFF0E6] flex items-center justify-center mb-3 group-hover:bg-[#FF5000] transition-colors duration-300">
                                  <StepIcon className="w-6 h-6 text-[#FF5000] group-hover:text-white transition-colors" />
                               </div>
                               <span className="text-sm font-bold text-gray-700 break-keep">{step.title}</span>
                            </div>
                          );
                        })}
                      </div>
                   </div>
                </Card>
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
