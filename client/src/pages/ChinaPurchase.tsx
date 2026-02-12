import Navigation from "@/components/Navigation";
import ChinaPurchaseSection from "@/components/ChinaPurchaseSection";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { 
  Rocket, 
  Calculator, 
  Eye, 
  PackageOpen, 
  CheckCircle2, 
  ArrowRight 
} from "lucide-react";

// 영상 내용을 바탕으로 재구성한 4대 핵심 강점
const advantages = [
  {
    icon: Rocket,
    title: "로켓그로스 바로 입고",
    description: "무거운 하역/택배 작업은 이제 그만. 인천 도착 즉시 쿠팡 창고로 다이렉트 입고시켜 드립니다.",
    highlight: "여성 대표님 강력 추천"
  },
  {
    icon: PackageOpen,
    title: "1개도 가능한 샘플링",
    description: "1 CBM 채울 필요 없습니다. 부담 없이 샘플 1개만 먼저 받아보고 결정하세요.",
    highlight: "재고 부담 ZERO"
  },
  {
    icon: Calculator,
    title: "관부가세 포함 '올인원' 단가",
    description: "물대+배송비+관세+수수료를 한 번에! 1위안당 고정 환율로 복잡한 계산을 끝냅니다.",
    highlight: "예산 오차 0원"
  },
  {
    icon: Eye,
    title: "실패 없는 실사 검수",
    description: "한국 오기 전 중국에서 실물 사진 확인. 불량은 현지에서 즉시 반품하여 손해를 막습니다.",
    highlight: "링크로 사진 제공"
  }
];

// 추가된 상세 설득 포인트 (텍스트 보강)
const detailPoints = [
  "시즌이 지난 제품도 소재 변경 걱정 없이 샘플 재확인 가능",
  "공장 직거래로 수량에 따른 단가 협상 대행 (원가 절감)",
  "복잡한 C/O(원산지증명서) 발급 및 통관 서류 자동 처리",
  "밀크런 및 택배를 활용한 최적의 물류 프로세스 제공"
];

export default function ChinaPurchase() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section: 임팩트 강화 */}
      <section className="pt-32 pb-16 md:pb-24 bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16 space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm mb-4 dark:bg-blue-900/30 dark:text-blue-300">
              🚀 사입부터 입고까지 Non-Stop 솔루션
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              주문만 하세요.<br className="hidden md:block" />
              <span className="text-primary">쿠팡 로켓그로스 입고</span>는<br className="md:hidden" /> 저희가 합니다.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              복잡한 관세 계산, 무거운 박스 나르기, 불량 재고 스트레스...<br />
              나나인터내셔널의 <strong>'바로 입고'</strong> 서비스로 사장님은 <strong>'판매'</strong>에만 집중하세요.
            </p>
          </div>

          {/* Key Advantages Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {advantages.map((advantage, index) => {
              const Icon = advantage.icon;
              return (
                <Card key={index} className="p-6 border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                        <Icon className="w-6 h-6 text-primary group-hover:text-white" />
                      </div>
                      {advantage.highlight && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
                          {advantage.highlight}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-200">{advantage.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {advantage.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* New Section: Why Choose Us (빈약함을 채워주는 상세 설명) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 md:p-12 border border-slate-100 dark:border-slate-800">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  왜 많은 셀러분들이<br />
                  <span className="text-primary">나나인터내셔널</span>을 선택할까요?
                </h2>
                <p className="text-muted-foreground mb-8">
                  단순 구매대행이 아닙니다. 사장님의 마진을 지켜드리고 
                  업무 시간을 획기적으로 줄여드리는 비즈니스 파트너입니다.
                </p>
                <ul className="space-y-4">
                  {detailPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative h-full min-h-[300px] rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-sm flex flex-col justify-center border border-slate-100 dark:border-slate-700">
                 {/* Visual Representation of Process */}
                 <div className="space-y-6">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground opacity-50 line-through">
                        <div className="w-8 h-8 rounded-full border flex items-center justify-center">1</div>
                        <span>복잡한 해운비/관세 계산</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground opacity-50 line-through">
                        <div className="w-8 h-8 rounded-full border flex items-center justify-center">2</div>
                        <span>국내 택배사 인계 및 송장 입력</span>
                    </div>
                    <div className="flex items-center gap-4 text-lg font-bold text-primary">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">3</div>
                        <span>주문 → 나나 검수 → 로켓그로스 입고 (끝!)</span>
                    </div>
                 </div>
                 <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium text-center">
                        "이제 소싱과 판매전략에만 집중하세요."
                    </p>
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
