import Navigation from "@/components/Navigation";
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
  FileSpreadsheet,
  CreditCard,
  PackageCheck,
  Ship,
  HelpCircle,
  ArrowRight,
  FileText,
  Package,
  Stamp
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// 1688 테마 컬러 상수
const THEME_COLOR = "#FF5000";

// 상단 강점 카드 데이터
const advantages = [
  {
    icon: Building2,
    title: "위해 & 이우 듀얼 센터",
    description: "해상/항공 배송이 빠른 '위해'와 잡화 소싱의 중심 '이우' 두 곳에 직영 센터를 운영하여 물류 효율을 최적화합니다.",
    highlight: "최적 루트 제안"
  },
  {
    icon: Handshake,
    title: "공장 직거래 소싱",
    description: "중간 도매상을 거치지 않고 1688 공장과 직접 컨택하여 원가 경쟁력을 극대화합니다.",
    highlight: "마진 ZERO 도전"
  },
  {
    icon: Scale,
    title: "쿠팡 로켓그로스 최적화",
    description: "바코드 부착, 개별 포장, 팔레트 작업 등 쿠팡 물류센터 입고 규정에 완벽하게 맞춘 풀필먼트 서비스를 제공합니다.",
    highlight: "반려 걱정 NO"
  },
  {
    icon: Truck,
    title: "통관/물류 원스톱",
    description: "복잡한 수입 통관 서류부터 LCL/FCL 해운, 국내 배송지 도착까지 책임집니다.",
    highlight: "신속 통관"
  }
];

// (복원된 섹션용) Why Nana 체크리스트
const detailPoints = [
  "의류/잡화/공산품 10년 이상 소싱 노하우",
  "C/O (원산지증명서) 및 각종 인증 서류 대행",
  "불량 발생 시 현지 교환/반품 신속 처리",
  "쿠팡 로켓그로스/3PL 창고 직입고 지원"
];

// 프로세스 스텝 데이터
const processSteps = [
  {
    step: "01",
    title: "견적 문의",
    desc: "원하시는 상품의 링크(1688/타오바오) 또는 엑셀 리스트를 전달해주세요.",
    icon: FileSpreadsheet
  },
  {
    step: "02",
    title: "견적서 발송 & 입금",
    desc: "제품단가, 수수료, 현지배송비가 포함된 1차 견적서를 확인 후 입금합니다.",
    icon: CreditCard
  },
  {
    step: "03",
    title: "주문 및 현지 검수",
    desc: "공장 발주 후 나나 물류센터(위해/이우)에 도착하면 수량/옵션/파손 여부를 검수합니다.",
    icon: PackageCheck
  },
  {
    step: "04",
    title: "임가공 및 선적",
    desc: "원산지 작업, 바코드 부착 등 필요한 후가공을 마친 후 해운/항공으로 발송합니다.",
    icon: Stamp
  },
  {
    step: "05",
    title: "국내 배송 완료",
    desc: "통관 완료 후 지정하신 배송지(자택/3PL/쿠팡창고)까지 안전하게 배송됩니다.",
    icon: Truck
  }
];

// 부가서비스 단가표 (Ship-G 참고)
const serviceFees = [
  { item: "기본 검수", price: "무료", desc: "수량, 색상, 외관 파손 육안 확인" },
  { item: "원산지 스티커", price: "100원", desc: "Made in China 라벨 부착" },
  { item: "바코드 작업", price: "150원", desc: "쿠팡/스마트스토어 바코드 부착" },
  { item: "OPP 폴리백 포장", price: "200원", desc: "개별 비닐 재포장 작업" },
  { item: "박스 교체", price: "3,000원~", desc: "수출용 강화 박스로 교체 (크기별 상이)" },
  { item: "팔레트 작업", price: "25,000원", desc: "랩핑 포함 (쿠팡 입고용)" },
];

const checkList = [
  "사업자등록증 사본",
  "개인통관고유부호 (대표자 명의)",
  "구매하실 상품 리스트 (옵션/수량 정확히)",
  "배송지 정보 및 연락처"
];

const faqList = [
  {
    q: "최소 주문 수량(MOQ)이 있나요?",
    a: "기본적으로 판매자가 정한 MOQ를 따르지만, 샘플 구매가 필요한 경우 1개부터 협의해 드립니다. 단, 수량이 너무 적을 경우 현지 배송비 비중이 높아질 수 있습니다."
  },
  {
    q: "쿠팡 로켓그로스 입고 작업도 가능한가요?",
    a: "네, 가능합니다. 바코드 작업(150원), 원산지 스티커(100원), OPP 포장 등 쿠팡 입고 표준 가이드에 맞춰 완벽하게 작업해서 보내드립니다."
  },
  {
    q: "결제는 어떻게 진행되나요?",
    a: "1차 결제(상품값+현지배송비+수수료)와 2차 결제(국제배송비+관부가세+작업비)로 나뉩니다. 모든 거래는 세금계산서 발행이 가능합니다."
  }
];

export default function ChinaPurchase() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [error, setError] = useState<string>("");
  const [payload, setPayload] = useState<any>(null);

  const pageType = useMemo(() => {
    const t = payload?.page_type || payload?.page || payload?.data?.page_type || payload?.data?.page;
    return t || (payload?.items ? "order" : "detail");
  }, [payload]);

  const data = payload?.data ?? payload;

  const pickText = (obj: any, keys: string[]) => {
    if (!obj) return "";
    for (const k of keys) {
      const v = String(obj?.[k] ?? "").trim();
      if (v) return v;
    }
    return "";
  };

  const getItemName = (it: any) =>
    pickText(it, ["product_name", "productName", "title", "name", "item_name", "itemName"]);

  const getItemImage = (it: any) =>
    pickText(it, [
      "product_image",
      "productImage",
      "main_image",
      "mainImage",
      "item_image",
      "itemImage",
      "offer_thumb",
      "offerThumb",
      "image",
      "image_url",
      "imageUrl",
      "thumb",
      "img",
      "option_image",
      "optionImage",
      "sku_image",
      "skuImage",
    ]);

  const getItemLink = (it: any) =>
    pickText(it, [
      "detail_url",
      "detailUrl",
      "detail_link",
      "detailLink",
      "offer_link",
      "offerLink",
      "product_url",
      "productUrl",
      "product_link",
      "productLink",
      "item_url",
      "itemUrl",
      "link",
      "href",
      "source_url",
      "sourceUrl",
      "url",
    ]) ||
    String(data?.url || data?.source_url || "").trim();

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

  // 총 결제 예정 금액 표시 포맷 (자리수 잘림/오표시 방지)
// - 백엔드 total_payable 값이 누락/오류인 경우가 있어, 주문(order) 화면에서는 items 합계를 우선 사용합니다.
  const totalPayableText = useMemo(() => {
    // 1) items 합계 (order 화면일 때)
    let sum = 0;
    if (data?.items && Array.isArray(data.items)) {
      for (const it of data.items) {
        const cleaned = String(it?.amount ?? "").replace(/[^0-9.\-]/g, "");
        const v = parseFloat(cleaned);
        if (isFinite(v)) sum += v;
      }
    }

    // 2) 백엔드 제공 total
    const raw = (data?.total_payable ?? data?.totalPayable ?? "0");
    const rawCleaned = String(raw).replace(/[^0-9.\-]/g, "");
    const n = parseFloat(rawCleaned);

    // 합계가 유효하고, 백엔드 total이 없거나( NaN )/너무 작으면(오류 가능성) 합계를 사용
    const useSum = isFinite(sum) && sum > 0 && (!isFinite(n) || n < sum * 0.5);

    const finalNum = useSum ? sum : (isFinite(n) ? n : 0);

    return finalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [data]);

  const openQuoteMail = (kind: "order" | "detail" | "general") => {
    const to = "secsiboy1@gmail.com";
    const subjectMap = {
      order: "[견적신청] 중국사입 주문리스트 견적 요청",
      detail: "[견적신청] 중국사입 상품 견적 요청",
      general: "[견적신청] 중국사입 무료 견적 요청",
    } as const;

    const productName = String(data?.product_name || data?.title || "").trim();
    const sourceUrl = String(data?.url || data?.source_url || "").trim();
    const bodyLines = [
      "안녕하세요. 중국사입 견적 신청드립니다.",
      "",
      `신청 유형: ${kind}`,
      productName ? `상품명: ${productName}` : "",
      sourceUrl ? `상품 URL: ${sourceUrl}` : "",
      kind === "order" ? `선택 상품 수량 합계: ${totalQuantity}` : "",
      "",
      "회신 부탁드립니다. 감사합니다.",
    ].filter(Boolean);

    const mailto = `mailto:${to}?subject=${encodeURIComponent(subjectMap[kind])}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = mailto;
  };

  const handleQuoteClick = (kind: "order" | "detail" | "general") => {
    if (authLoading) return;
    if (!user) {
      alert("발주 전 로그인이 필요합니다. 로그인 후 다시 눌러주세요.");
      setLocation("/login");
      return;
    }

    if (kind === "order") {
      if (!data || !Array.isArray(data?.items) || data.items.length === 0) {
        alert("발주할 주문 데이터가 없습니다. 먼저 데이터를 가져와 주세요.");
        return;
      }

      (async () => {
        try {
          setSubmittingOrder(true);
          const res = await fetch(`${API_BASE}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ source: data }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json?.ok) {
            throw new Error(json?.error || `HTTP ${res.status}`);
          }

          const createdNo = String(json?.order?.order_no || "").trim();
          alert(
            createdNo
              ? `요청이 접수되었습니다.\n주문번호: ${createdNo}\n마이페이지에서 진행상황을 확인하세요.`
              : "요청이 접수되었습니다. 마이페이지에서 진행상황을 확인하세요.",
          );
          setLocation("/mypage#progress");
        } catch (e: any) {
          alert(`발주 접수에 실패했습니다: ${e?.message || String(e)}`);
        } finally {
          setSubmittingOrder(false);
        }
      })();
      return;
    }

    openQuoteMail(kind);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-slate-800">
      <Navigation />

      {/* ──────────────────────────────────────────────────────────
          SECTION 1: 1688 데이터 수집 (상단)
          ────────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-10">
        <div className="max-w-[1200px] mx-auto px-4">
          
          {/* 상단 컨트롤러 */}
          <div className="bg-white rounded-t-lg border border-b-0 border-gray-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FFF0E6] text-[#FF5000]">
                 <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-bold text-lg leading-none text-gray-800">수집된 주문 리스트</h2>
                <p className="text-xs text-gray-500 mt-1">확장프로그램에서 전송한 데이터를 확인하고 발주를 진행하세요.</p>
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

          {/* 주문 데이터 (Order Type) */}
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
                {data.items.map((it: any, idx: number) => {
                  // ✅ 확장프로그램 원문 필드 우선 사용 (대표이미지/상품명/상품링크)
                  //    옵션 썸네일(option_image)로 덮어쓰는 문제 방지
                  const itemName = getItemName(it) || "상품명 정보 없음";
                  const itemImage = getItemImage(it);
                  const itemLink = getItemLink(it);
                  return (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-[#FFFDFB] transition-colors group">
                    {/* 상품 정보 */}
                    <div className="col-span-6 flex gap-4 text-left">
                      <div className="relative shrink-0 border border-gray-200 rounded-sm overflow-hidden w-20 h-20 bg-gray-50">
                        {itemImage ? (
                          <img src={resolveImgSrc(itemImage)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-xs text-gray-300">No Img</div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center gap-1 pr-4">
                        <div className="text-xs text-[#FF5000] font-medium">{it?.seller || "1688 Seller"}</div>
                        <div className="flex items-center gap-2 min-w-0">
                          {itemLink ? (
                            <a
                              href={itemLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-gray-800 line-clamp-2 leading-snug hover:text-[#FF5000] hover:underline underline-offset-2 transition-colors"
                            >
                              {itemName}
                            </a>
                          ) : (
                            <div className="text-sm text-gray-800 line-clamp-2 leading-snug">{itemName}</div>
                          )}
                          {itemLink ? (
                            <a
                              href={itemLink}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-[11px] font-bold text-[#FF5000] border border-[#FFD9C7] bg-[#FFF4EE] rounded px-2 py-0.5 hover:bg-[#FFE7DB]"
                            >
                              링크
                            </a>
                          ) : (
                            <span className="shrink-0 text-[11px] font-bold text-gray-400 border border-gray-200 bg-gray-50 rounded px-2 py-0.5">
                              링크 없음
                            </span>
                          )}
                        </div>
                        {itemLink && <div className="text-[11px] text-gray-400 break-all">{itemLink}</div>}
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
                  );
                })}
              </div>

              {/* 하단 결제바 */}
              <div className="bg-[#FAFAFA] border-t border-gray-200 p-4 flex flex-col md:flex-row items-center justify-end gap-6 md:gap-8 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-6">
                  <div className="text-sm text-gray-500">
                    선택 상품 <span className="text-[#FF5000] font-bold mx-1">{totalQuantity}</span>종
                  </div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-sm font-medium text-gray-600">총 결제예정 금액:</span>
                     <span className="text-3xl font-bold text-[#FF5000] font-mono tracking-tight whitespace-nowrap tabular-nums">
                       <span className="text-lg mr-1">¥</span>
                       {totalPayableText}
                     </span>
                  </div>
                </div>
                
                <Button
                  className="w-full md:w-auto bg-[#FF5000] hover:bg-[#E04600] text-white text-lg font-bold h-12 px-10 rounded-full shadow-md transition-transform active:scale-95"
                  onClick={() => handleQuoteClick("order")}
                  disabled={submittingOrder}
                >
                  {submittingOrder ? "발주 접수 중..." : "발주하기"}
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

                   <Button
                     className="w-full h-14 text-lg font-bold bg-[#FF5000] hover:bg-[#E04600] rounded-md shadow-lg shadow-orange-200"
                     onClick={() => handleQuoteClick("detail")}
                   >
                     이 상품으로 견적 문의하기
                   </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 2: 서비스 강점 & Intro
          ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          
          {/* 섹션 헤더 */}
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              중국 사입, <span className="text-[#FF5000]">전문가의 솔루션</span>이 필요하신가요?
            </h2>
            <p className="text-lg text-gray-500">
              복잡한 무역 절차는 저희에게 맡기시고, 사장님은 판매에만 집중하세요.
            </p>
          </div>

          {/* 서비스 강점 카드 */}
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

          {/* ──────────────────────────────────────────────────────────
              (복원된 섹션) Why Nana & 비용 구조 그래프 (이미지 내용)
              ────────────────────────────────────────────────────────── */}
          <div className="bg-[#FFFcfb] rounded-3xl p-8 md:p-12 border border-[#FF5000]/10 shadow-sm relative overflow-hidden">
            {/* 데코레이션 원 */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFF0E6] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none"></div>

            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
              
              {/* 왼쪽: Why Nana 텍스트 & 체크리스트 */}
              <div>
                <div className="inline-block bg-[#FF5000] text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                  Why Nana International?
                </div>
                <h2 className="text-3xl font-bold mb-6 leading-tight text-slate-900">
                  가장 안전하고 저렴한<br />
                  <span className="text-[#FF5000]">무역 파트너</span>를 약속합니다.
                </h2>
                
                <ul className="space-y-4 mt-8 mb-8">
                  {detailPoints.map((point, i) => (
                    <li key={i} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-[#FF5000] shrink-0" />
                      <span className="text-slate-700 font-medium">{point}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex gap-4">
                   <Button className="bg-[#FF5000] hover:bg-[#E04600] text-white px-8 py-6 text-lg font-bold rounded-full shadow-lg shadow-orange-200/50">
                     무료 견적 상담하기
                   </Button>
                </div>
              </div>

              {/* 오른쪽: 예상 수입 비용 구조 (그래프) */}
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

      {/* ──────────────────────────────────────────────────────────
          SECTION 3: 프로세스 가이드
          ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#FAFAFA] border-t border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          
          <div className="flex flex-col items-center text-center mb-16">
            <div className="inline-block bg-[#FFF0E6] text-[#FF5000] text-sm font-bold px-4 py-1.5 rounded-full mb-4">
              PROCESS GUIDE
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              중국 사입, <span className="text-[#FF5000]">이렇게 진행됩니다</span>
            </h2>
            <p className="text-gray-500 max-w-2xl">
              어렵게만 느껴지는 중국 무역, 나나인터내셔널의 체계적인 5단계 프로세스로 쉽고 안전하게 시작하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative mb-20">
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gray-200 -z-10 translate-y-1/2"></div>
            
            {processSteps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="relative flex flex-col items-center text-center group">
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-[#FAFAFA] shadow-md flex items-center justify-center mb-6 group-hover:border-[#FF5000] group-hover:-translate-y-2 transition-all duration-300 z-10 relative">
                     <Icon className="w-10 h-10 text-gray-400 group-hover:text-[#FF5000] transition-colors" />
                     <div className="absolute -top-1 -right-1 w-8 h-8 bg-[#333] text-white rounded-full flex items-center justify-center text-xs font-bold group-hover:bg-[#FF5000]">
                       {item.step}
                     </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm w-full h-full hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-500 break-keep leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  {idx !== processSteps.length - 1 && (
                    <div className="md:hidden py-4 text-gray-300">
                      <ArrowRight className="w-6 h-6 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 하단 정보 그리드 (부가서비스 & 체크리스트 & FAQ) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* 왼쪽: 부가서비스 비용 & 준비물 */}
            <div className="space-y-8">
               {/* 부가서비스 테이블 */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <Package className="w-5 h-5 text-[#FF5000]" />
                       <h3 className="text-lg font-bold text-slate-900">물류센터 부가 서비스</h3>
                    </div>
                    <span className="text-xs text-gray-400">*VAT 별도</span>
                 </div>
                 <div className="overflow-hidden border border-gray-100 rounded-lg">
                    <table className="w-full text-sm">
                       <thead className="bg-gray-50 text-gray-500 font-medium">
                          <tr>
                             <th className="px-4 py-2 text-left">서비스명</th>
                             <th className="px-4 py-2 text-center">단가</th>
                             <th className="px-4 py-2 text-left">비고</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {serviceFees.map((fee, i) => (
                             <tr key={i} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-medium text-slate-700">{fee.item}</td>
                                <td className="px-4 py-3 text-center text-[#FF5000] font-bold">{fee.price}</td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{fee.desc}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* 필수 준비물 카드 */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                   <FileText className="w-5 h-5 text-[#FF5000]" />
                   <h3 className="text-lg font-bold text-slate-900">사입 필수 서류</h3>
                </div>
                <ul className="space-y-3">
                  {checkList.map((text, i) => (
                    <li key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#FAFAFA] border border-gray-100 text-slate-700 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#FF5000] shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 오른쪽: FAQ & 안내사항 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm h-fit">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-gray-100 rounded-lg">
                   <HelpCircle className="w-6 h-6 text-gray-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900">자주 묻는 질문</h3>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                {faqList.map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-b-gray-100">
                    <AccordionTrigger className="text-left font-medium text-slate-800 hover:text-[#FF5000] hover:no-underline py-4">
                      Q. {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-500 bg-[#FAFAFA] p-4 rounded-lg text-sm leading-relaxed mb-4">
                      A. {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="mt-8 bg-[#FFF0E6] p-5 rounded-lg border border-[#FF5000]/10">
                 <div className="flex items-center gap-2 mb-2 text-[#E04600] font-bold text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>주의사항</span>
                 </div>
                 <p className="text-xs text-[#E04600]/80 leading-snug">
                   * 캐릭터 제품, 유명 브랜드 모조품 등 지재권 침해 소지가 있는 물품은 통관이 불가능하며 폐기 수수료가 발생할 수 있습니다.<br/>
                   * 사업자 통관 시 반드시 <strong>사업자 명의의 통관부호</strong>를 발급받아 주시기 바랍니다.
                 </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 문의하기 버튼 섹션 */}
      <section className="bg-[#333] py-16 border-t border-gray-800">
        <div className="max-w-[1200px] mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            아직 고민되시나요? 견적부터 받아보세요.
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            원하시는 상품의 링크만 보내주시면, 전문가가 24시간 이내에 상세 견적을 보내드립니다.
            비용 확인 후 진행 여부를 결정하세요.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              className="h-14 px-8 text-lg font-bold bg-[#FF5000] hover:bg-[#E04600] text-white rounded-full shadow-lg shadow-orange-900/20"
              onClick={() => handleQuoteClick("general")}
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              무료 견적 신청하기
            </Button>
            <Button variant="outline" className="h-14 px-8 text-lg font-bold border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white rounded-full">
              카카오톡 상담하기
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
