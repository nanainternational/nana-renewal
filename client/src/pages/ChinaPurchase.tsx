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
  AlertCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

// 1688 스타일의 주황색 테마 적용을 위한 아이콘 컴포넌트 래퍼
const OrangeIcon = ({ icon: Icon, className }: { icon: any, className?: string }) => (
  <Icon className={`text-[#FF5000] ${className}`} />
);

const advantages = [
  {
    icon: Building2,
    title: "현지 공장 다이렉트 소싱",
    description: "도매시장(VVIC) 단순 사입이 아닙니다. 생산 공장과 직접 컨택하여 중간 유통 마진을 없앱니다.",
    highlight: "원가 경쟁력 확보"
  },
  {
    icon: Handshake,
    title: "전문 무역 협상 & 발주",
    description: "단순 구매 대행을 넘어, 수량에 따른 단가 인하(MOQ) 및 생산 일정 관리를 대신 협상해 드립니다.",
    highlight: "비즈니스 파트너"
  },
  {
    icon: Scale,
    title: "철저한 품질 관리(QC)",
    description: "한국 발송 전 현지에서 1차 검수를 진행합니다. 불량품을 사전에 차단하여 리스크를 최소화합니다.",
    highlight: "실사 리포트 제공"
  },
  {
    icon: Truck,
    title: "통관부터 입고까지 One-Stop",
    description: "복잡한 수입 통관, 관부가세 처리, 그리고 쿠팡 로켓그로스 입고까지 물류의 전 과정을 책임집니다.",
    highlight: "물류 최적화"
  }
];

const detailPoints = [
  "의류/잡화 전문 10년 이상의 무역 실무 노하우 보유",
  "까다로운 원산지 증명(C/O) 및 식검/인증 서류 완벽 대응",
  "시즌별 원단/부자재 변경 이슈 사전 체크 및 샘플링 지원",
  "LCL/FCL 해운부터 항공 특송까지 최적의 물류 루트 제안"
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

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-slate-800">
      <Navigation />

      {/* 1688 데이터 수집 섹션 */}
      <section className="pt-28 pb-10">
        <div className="max-w-[1200px] mx-auto px-4">
          
          {/* 헤더 컨트롤 바 (1688 주소창/상단바 느낌) */}
          <div className="bg-white rounded-t-lg border border-b-0 border-gray-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center text-[#FF5000] font-bold bg-[#FFF0E6] px-2 py-1 rounded">
                <MapPin className="w-4 h-4 mr-1" />
                데이터 수집기
              </div>
              <span className="text-gray-500 text-xs md:text-sm">
                확장프로그램 실행 후 <span className="font-bold text-gray-800">'가져오기'</span>를 눌러주세요.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={fetchLatest} 
                disabled={loading}
                className="bg-[#FF5000] hover:bg-[#ff6a00] text-white font-bold px-6 border-0"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2"/> : <Download className="w-4 h-4 mr-2"/>}
                {loading ? "불러오는 중..." : "데이터 가져오기"}
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
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              불러오기 실패: {error}
            </div>
          )}

          {/* 데이터 없음 상태 */}
          {!error && !data && (
            <div className="bg-white border border-gray-200 rounded-b-lg p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">수집된 데이터가 없습니다</h3>
              <p className="text-gray-500 text-sm">1688 상세페이지 또는 결제화면에서 확장프로그램 버튼을 눌러주세요.</p>
            </div>
          )}

          {/* 주문 데이터 (Order Type) */}
          {data && pageType === "order" && Array.isArray(data?.items) && (
            <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm overflow-hidden">
              {/* 1688 스타일 테이블 헤더 */}
              <div className="grid grid-cols-12 gap-4 bg-gray-50 p-3 text-xs font-bold text-gray-600 border-b border-gray-200 text-center">
                <div className="col-span-6 text-left pl-4">상품정보</div>
                <div className="col-span-2">옵션/수량</div>
                <div className="col-span-2">단가(위안)</div>
                <div className="col-span-2">합계(위안)</div>
              </div>

              {/* 리스트 아이템 */}
              <div className="divide-y divide-gray-100">
                {data.items.map((it: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 p-4 items-start hover:bg-[#fffcfb] transition-colors">
                    {/* 상품 정보 (이미지 + 텍스트) */}
                    <div className="col-span-6 flex gap-3 text-left">
                      <div className="relative shrink-0 border border-gray-200 rounded overflow-hidden w-20 h-20">
                        {it?.thumb ? (
                          <img src={resolveImgSrc(it.thumb)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">No Img</div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">{it?.seller || "판매자 정보 없음"}</div>
                        <div className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-[#FF5000] cursor-pointer">
                          {it?.name || "-"}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 bg-gray-50 inline-block px-2 py-0.5 rounded">
                           {/* 옵션이 너무 길 경우를 대비 */}
                           {it?.option || "기본 옵션"}
                        </div>
                      </div>
                    </div>

                    {/* 수량 */}
                    <div className="col-span-2 flex flex-col items-center justify-center h-full text-sm">
                      <div className="font-medium">{it?.quantity ?? 1}개</div>
                    </div>

                    {/* 단가 */}
                    <div className="col-span-2 flex items-center justify-center h-full text-sm font-medium text-gray-600">
                       ¥ {it?.unitPrice ?? "-"}
                    </div>

                    {/* 합계 (강조) */}
                    <div className="col-span-2 flex items-center justify-center h-full text-sm font-bold text-[#FF5000]">
                       ¥ {it?.amount ?? "-"}
                    </div>
                  </div>
                ))}
              </div>

              {/* 하단 총계 바 */}
              {data?.total_payable && (
                <div className="bg-[#FFF0E6] p-4 flex flex-col md:flex-row justify-end items-center gap-4 border-t border-[#FF5000]/20">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600">선택 상품 총액 (배송비 포함)</span>
                    <span className="text-2xl font-bold text-[#FF5000]">
                      <span className="text-lg font-medium mr-1">¥</span>
                      {data.total_payable}
                    </span>
                  </div>
                  <Button className="bg-[#FF5000] hover:bg-[#ff4000] text-white font-bold px-8 py-6 text-lg rounded-sm shadow-md">
                    결제 예상 금액 확인
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 상세 페이지 데이터 (Detail Type) */}
          {data && pageType !== "order" && (
            <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                <span className="bg-[#FF5000] text-white text-xs px-2 py-0.5 rounded font-bold">상세페이지 수집</span>
                <span className="text-gray-500 text-sm">상품의 상세 정보를 확인합니다.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 메인 이미지 영역 */}
                <div>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mb-4">
                     {data?.main_media?.[0] ? (
                       <img src={data.main_media[0]} alt="" className="w-full h-full object-cover" />
                     ) : (
                       <div className="flex items-center justify-center h-full text-gray-400">이미지 없음</div>
                     )}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {(data?.main_media || []).slice(0, 5).map((u: string, i: number) => (
                      <img key={i} src={u} alt="" className="w-full aspect-square object-cover rounded border border-gray-200 cursor-pointer hover:border-[#FF5000]" />
                    ))}
                  </div>
                </div>

                {/* 상품 정보 영역 */}
                <div className="md:col-span-2 space-y-6">
                   <div>
                      <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">{data?.product_name || "상품명 정보 없음"}</h1>
                      <div className="inline-block bg-[#FFF0E6] text-[#FF5000] text-xs px-2 py-1 rounded font-medium">
                        1688 Verified Product
                      </div>
                   </div>

                   <div className="bg-[#f8f8f8] p-4 rounded-md">
                      <div className="text-sm text-gray-500 mb-1">도매가</div>
                      <div className="text-3xl font-bold text-[#FF5000]">
                        <span className="text-lg mr-1">¥</span>
                        {data?.price || data?.unit_price || "-"}
                      </div>
                   </div>

                   {/* 상세 이미지 그리드 */}
                   {Array.isArray(data?.detail_media) && data.detail_media.length > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="font-semibold mb-3 text-gray-800">상세 설명 이미지</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {data.detail_media.slice(0, 8).map((u: string, i: number) => (
                          <img key={i} src={u} alt="" className="w-full aspect-square object-cover rounded border border-gray-100" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Hero Section: 디자인 리뉴얼 */}
      <section className="py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="text-center mb-16 space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#FF5000] text-white font-bold text-sm mb-4 shadow-md shadow-orange-200">
              🇨🇳 중국 무역의 든든한 파트너
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
              성공적인 판매의 시작은<br className="md:hidden" />
              <span className="text-[#FF5000]"> '경쟁력 있는 소싱'</span>입니다.
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
              단순 배송 대행이 아닙니다. <br className="md:hidden" />
              <strong>공장 섭외, 단가 협상, 품질 관리, 무역 실무</strong>까지.<br />
              사장님의 비즈니스를 키워드리는 전문 무역 상사, 나나인터내셔널입니다.
            </p>
          </div>

          {/* Key Advantages Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {advantages.map((advantage, index) => {
              const Icon = advantage.icon;
              return (
                <div key={index} className="group p-6 rounded-xl border border-gray-200 bg-white hover:border-[#FF5000] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[#FFF0E6] flex items-center justify-center group-hover:bg-[#FF5000] transition-colors duration-300">
                        <Icon className="w-6 h-6 text-[#FF5000] group-hover:text-white transition-colors" />
                      </div>
                      {advantage.highlight && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 group-hover:border-[#FF5000] group-hover:text-[#FF5000] transition-colors">
                          {advantage.highlight}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-800">{advantage.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed word-keep-all group-hover:text-gray-700">
                      {advantage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Why Choose Us */}
          <div className="bg-[#FFFcfb] rounded-3xl p-8 md:p-12 border border-gray-200 shadow-sm relative overflow-hidden">
            {/* 배경 장식 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFF0E6] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>

            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <h2 className="text-3xl font-bold mb-6 leading-tight text-slate-900">
                  왜 나나인터내셔널이<br />
                  <span className="text-[#FF5000]">최고의 무역 파트너</span>일까요?
                </h2>
                <p className="text-gray-500 mb-8 text-lg">
                  구매대행사는 많지만, <br className="md:hidden"/>내 일처럼 공장과 싸워주는 파트너는 드뭅니다.<br />
                  저희는 사장님의 이익을 최우선으로 움직입니다.
                </p>
                <ul className="space-y-5">
                  {detailPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#FF5000] shrink-0 mt-0.5" />
                      <span className="text-slate-700 font-medium text-lg">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative h-full min-h-[350px] rounded-2xl bg-white p-8 flex flex-col justify-center border border-gray-100 shadow-lg">
                 {/* Visual Representation of Trade Process */}
                 <div className="space-y-8 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-100 -z-10"></div>
                    
                    <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 z-10">
                            <Globe2 className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900">아이템 발굴 및 공장 수배</h4>
                            <p className="text-sm text-gray-500">최적의 생산 라인을 찾아냅니다.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-full bg-[#FFF0E6] border-2 border-[#FF5000] flex items-center justify-center shrink-0 z-10 shadow-md">
                            <Handshake className="w-5 h-5 text-[#FF5000]" />
                        </div>
                        <div>
                            <h4 className="font-bold text-[#FF5000]">단가 협상 및 샘플 검증</h4>
                            <p className="text-sm text-gray-500">가장 중요한 단계! 원가와 품질을 잡습니다.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 z-10">
                            <Truck className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900">수입 통관 및 국내 배송</h4>
                            <p className="text-sm text-gray-500">로켓그로스/3PL 창고까지 안전하게 전달.</p>
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
