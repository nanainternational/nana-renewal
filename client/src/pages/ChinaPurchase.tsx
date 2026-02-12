import Navigation from "@/components/Navigation";
import ChinaPurchaseSection from "@/components/ChinaPurchaseSection";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { 
  Globe2,          // 무역/글로벌 아이콘
  Handshake,       // 파트너십/협상 아이콘
  Scale,           // 검수/품질 아이콘
  Truck,           // 물류 아이콘
  CheckCircle2, 
  Building2        // 공장/회사 아이콘
} from "lucide-react";

// 무역 회사의 핵심 역량을 강조한 4대 강점
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

// 전문성을 강조하는 상세 설명 포인트
const detailPoints = [
  "의류/잡화 전문 10년 이상의 무역 실무 노하우 보유",
  "까다로운 원산지 증명(C/O) 및 식검/인증 서류 완벽 대응",
  "시즌별 원단/부자재 변경 이슈 사전 체크 및 샘플링 지원",
  "LCL/FCL 해운부터 항공 특송까지 최적의 물류 루트 제안"
];

export default function ChinaPurchase() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section: 무역 회사의 신뢰감 강조 */}
      <section className="pt-32 pb-16 md:pb-24 bg-gradient-to-b from-slate-50 to-background dark:from-slate-950/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16 space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-sm mb-4">
              🇨🇳 중국 무역의 든든한 파트너
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              성공적인 판매의 시작은<br className="md:hidden" />
              <span className="text-primary"> '경쟁력 있는 소싱'</span>입니다.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              단순 배송 대행이 아닙니다.<br className="md:hidden" />
              <strong>공장 섭외, 단가 협상, 품질 관리, 무역 실무</strong>까지.<br />
              사장님의 비즈니스를 키워드리는 전문 무역 상사, 나나인터내셔널입니다.
            </p>
          </div>

          {/* Key Advantages Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {advantages.map((advantage, index) => {
              const Icon = advantage.icon;
              return (
                <Card key={index} className="p-6 border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group bg-white/80 backdrop-blur-sm dark:bg-slate-900/50">
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                        <Icon className="w-6 h-6 text-primary group-hover:text-white" />
                      </div>
                      {advantage.highlight && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {advantage.highlight}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-200">{advantage.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed word-keep-all">
                      {advantage.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* New Section: Why Choose Us (전문성 강조) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6 leading-tight">
                  왜 나나인터내셔널이<br />
                  <span className="text-primary">최고의 무역 파트너</span>일까요?
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  구매대행사는 많지만, <br className="md:hidden"/>내 일처럼 공장과 싸워주는 파트너는 드뭅니다.<br />
                  저희는 사장님의 이익을 최우선으로 움직입니다.
                </p>
                <ul className="space-y-5">
                  {detailPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-lg">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative h-full min-h-[350px] rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-8 flex flex-col justify-center border border-slate-100 dark:border-slate-700">
                 {/* Visual Representation of Trade Process */}
                 <div className="space-y-8 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700 -z-10"></div>
                    
                    <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shrink-0 z-10">
                            <Globe2 className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">아이템 발굴 및 공장 수배</h4>
                            <p className="text-sm text-muted-foreground">최적의 생산 라인을 찾아냅니다.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-primary flex items-center justify-center shrink-0 z-10 shadow-md">
                            <Handshake className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-bold text-primary">단가 협상 및 샘플 검증</h4>
                            <p className="text-sm text-muted-foreground">가장 중요한 단계! 원가와 품질을 잡습니다.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shrink-0 z-10">
                            <Truck className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">수입 통관 및 국내 배송</h4>
                            <p className="text-sm text-muted-foreground">로켓그로스/3PL 창고까지 안전하게 전달.</p>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Existing Sections */}
      <ChinaPurchaseSection />
      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
