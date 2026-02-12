import Navigation from "@/components/Navigation";
import ChinaPurchaseSection from "@/components/ChinaPurchaseSection";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import {
  Globe,
  TrendingUp,
  Package,
  Clock,
  ShieldCheck,
  MessagesSquare,
  BadgeCheck,
  ClipboardList,
  Factory,
  Truck,
  FileDown,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

const advantages = [
  {
    icon: Globe,
    title: "현지 공장 직접 컨택",
    description: "중간 단계 없이 공장과 직접 거래"
  },
  {
    icon: Package,
    title: "대량·소량 모두 가능",
    description: "필요한 수량만큼 유연하게 사입"
  },
  {
    icon: Clock,
    title: "빠른 견적",
    description: "보통 1~2일 내 기준 견적 안내"
  },
  {
    icon: TrendingUp,
    title: "샘플 확인 서비스",
    description: "본 주문 전 샘플로 품질 확인"
  }
];

const painPoints = [
  {
    icon: AlertTriangle,
    title: "가격·MOQ 협상",
    description: "플랫폼 표기 가격과 실제 거래 조건이 달라지는 경우가 많습니다."
  },
  {
    icon: ShieldCheck,
    title: "불량·품질 리스크",
    description: "샘플과 본생산 품질이 다르거나, 기준이 불명확하면 손실로 이어집니다."
  },
  {
    icon: Truck,
    title: "물류·통관 변수",
    description: "선적/통관/국내 입고까지 변수가 많아 일정과 비용이 흔들릴 수 있습니다."
  },
  {
    icon: MessagesSquare,
    title: "소통·진행 스트레스",
    description: "언어/시차/응대 지연으로 진행이 늦어지고 확인 비용이 커집니다."
  }
];

const nanaWay = [
  {
    icon: Factory,
    title: "공장 매칭 & 조건 정리",
    description: "원하는 사양/수량/단가 목표를 기준으로 공장 후보를 좁히고 조건을 정리합니다."
  },
  {
    icon: ClipboardList,
    title: "샘플·스펙 체크",
    description: "샘플 기반으로 스펙/구성/포장 기준을 문서화해 ‘기준’을 먼저 만듭니다."
  },
  {
    icon: BadgeCheck,
    title: "생산 진행 관리",
    description: "진행 단계별 확인 포인트를 잡고 일정과 리스크를 선제적으로 관리합니다."
  },
  {
    icon: Truck,
    title: "출고·국내 입고 연결",
    description: "출고(현지) → 선적 → 국내 도착까지 흐름을 끊기지 않게 연결합니다."
  }
];

const faq = [
  {
    q: "정확한 단가를 언제 알 수 있나요?",
    a: "요청 사양/수량/원단/옵션/포장 기준이 잡히면 견적 정확도가 급격히 올라갑니다. 입력이 구체적일수록 빠르고 정확합니다."
  },
  {
    q: "소량도 가능한가요?",
    a: "가능합니다. 다만 공장/품목에 따라 MOQ와 단가 구조가 다르기 때문에, 목표 수량과 단가 우선순위를 같이 잡는 게 중요합니다."
  },
  {
    q: "샘플 확인은 어떻게 진행되나요?",
    a: "샘플로 품질·사이즈·구성·포장 기준을 먼저 확인한 뒤 본생산으로 넘어갑니다. ‘샘플 OK’가 리스크를 크게 줄입니다."
  },
  {
    q: "진행 중 커뮤니케이션은 어떻게 하나요?",
    a: "진행 단계별로 필요한 질문/확인 리스트를 기준으로 커뮤니케이션을 정리해 드립니다. 확인 포인트가 명확하면 지연이 줄어듭니다."
  }
];

export default function ChinaPurchase() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* HERO */}
      <section className="pt-32 pb-10 md:pb-14 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              중국사입 서비스
            </h1>

            {/* Rocket Growth식: 한 문장 해결책 + 포커스 */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              구매대행이 아니라, <span className="font-semibold text-foreground">공장 직접 컨택</span>으로
              조건을 정리하고 <span className="font-semibold text-foreground">샘플·생산·출고 흐름</span>을
              끊기지 않게 연결합니다.
            </p>

            <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-3">
              <a
                href="#china-purchase-apply"
                className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
              >
                지금 바로 사입 신청하기
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </a>
              <a
                href="#china-purchase-download"
                className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-background border text-sm font-semibold hover:bg-muted"
              >
                주문서 양식 다운로드
                <FileDown className="w-4 h-4 ml-2" />
              </a>
            </div>
          </div>

          {/* 기존 4카드 유지 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 md:mb-14">
            {advantages.map((advantage, index) => {
              const Icon = advantage.icon;
              return (
                <Card key={index} className="p-6 hover-elevate">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">{advantage.title}</h3>
                    <p className="text-sm text-muted-foreground">{advantage.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 문제 제시 (Rocket Growth식 “셀러의 고통” 먼저) */}
      <section className="py-14 md:py-18">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">중국사입이 막히는 포인트부터 정리합니다</h2>
            <p className="text-muted-foreground">
              실패가 나는 지점은 대부분 비슷합니다. 문제를 먼저 고정하면 성공률이 올라갑니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {painPoints.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 해결책/프로세스 (Rocket Growth식 “대행 범위 + 흐름” 명확히) */}
      <section className="py-14 md:py-18 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">나나인터내셔널 방식</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              “연결만 해드리는” 서비스가 아니라, <span className="font-semibold text-foreground">조건을 정리</span>하고
              <span className="font-semibold text-foreground"> 샘플→생산→출고</span> 흐름을 끊기지 않게 만듭니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {nanaWay.map((step, idx) => {
              const Icon = step.icon;
              return (
                <Card key={idx} className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 max-w-4xl mx-auto">
            <Card className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-bold mb-2">핵심은 “기준”을 먼저 만드는 겁니다</h3>
                  <p className="text-sm text-muted-foreground">
                    샘플 기준(사양/구성/포장)을 문서화하면, 본생산에서 ‘다르다’가 크게 줄어듭니다.
                  </p>
                </div>
                <a
                  href="#china-purchase-apply"
                  className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
                >
                  신청서 작성하기
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 아래는 기존 섹션(신청안내/다운로드/폼 등) 그대로 사용 */}
      {/* ChinaPurchaseSection 내부에 다운로드/신청서가 있으니 앵커만 연결되게 id를 부여하는 게 가장 깔끔함 */}
      {/* -> ChinaPurchaseSection 컴포넌트 내부에서 다운로드 영역에 id="china-purchase-download", 신청서에 id="china-purchase-apply"를 넣어주면 완벽 */}

      {/* (현재 파일만 수정 요청이니) 페이지 하단에서 앵커 대상 제공 */}
      <div id="china-purchase-download" />
      <div id="china-purchase-apply" />

      <ChinaPurchaseSection />

      {/* FAQ (전환율 보강) */}
      <section className="py-14 md:py-18">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">자주 묻는 질문</h2>
            <p className="text-muted-foreground">신청 전에 많이 물어보는 것들만 먼저 정리했습니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faq.map((item, idx) => (
              <Card key={idx} className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{item.q}</h3>
                    <p className="text-sm text-muted-foreground">{item.a}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
