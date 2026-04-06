import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import mainVideo from "@/assets/images/ai_cg1.mp4";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Download, HelpCircle } from "lucide-react";

const guideButtons = [
  { label: "VVIC 가이드", href: "/blog/vvic-guide-extension-usage-2026" },
  { label: "1688 가이드", href: "/ai-detail/1688" },
  { label: "중국사입", href: "/china-purchase" },
];

const quickFeatures = [
  {
    title: "결제직전(order) 데이터 우선 추출",
    desc: "최종 수량/단가/소계/총액 기준으로 발주 정확도를 높입니다.",
  },
  {
    title: "상세(detail) 페이지도 지원",
    desc: "detail.1688.com 과 order.1688.com 모두에서 동일한 흐름으로 동작합니다.",
  },
  {
    title: "버튼 한 번으로 가져오기 준비",
    desc: "확장프로그램 실행 후 OK 확인만 하면 중국사입 페이지에서 바로 가져올 수 있습니다.",
  },
  {
    title: "기존 업무 흐름 그대로 유지",
    desc: "기능 로직 변경 없이 화면과 가독성 중심으로 안내 구조를 정리했습니다.",
  },
];

const componentCards = [
  { icon: "🪟", title: "설치 안내", desc: "개발자 모드 ON → 압축해제된 확장프로그램 로드" },
  { icon: "🧭", title: "지원 페이지", desc: "order.1688.com / detail.1688.com" },
  { icon: "✅", title: "데이터 정확성", desc: "final qty · unit price · subtotal · total" },
  { icon: "🛠️", title: "문제 대응", desc: "이미지 누락/핫링크 이슈 시 프록시 우회" },
  { icon: "📥", title: "가져오기 흐름", desc: "확장프로그램 OK → 중국사입 페이지 가져오기" },
  { icon: "🧹", title: "초기화 기능", desc: "중국사입 페이지에서 데이터 즉시 초기화" },
];

const faqItems = [
  { q: "왜 결제직전(order)에서 가져오나요?", a: "장바구니보다 금액/수량 확정 데이터라 실제 발주 정확도가 높습니다." },
  { q: "상세(detail)에서도 가져올 수 있나요?", a: "네. 상세 페이지에서도 필요한 주문 정보를 추출할 수 있게 지원합니다." },
  { q: "이미지가 안 보이면 데이터도 실패하나요?", a: "아닙니다. 이미지 누락과 별개로 핵심 주문 데이터는 저장 및 처리 가능합니다." },
  { q: "가져온 데이터를 비우려면 어떻게 하나요?", a: "중국사입 페이지의 초기화 버튼을 누르면 현재 가져온 데이터를 정리할 수 있습니다." },
];

export default function ExtensionSection() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navigation />
      <section id="extension" className="relative overflow-hidden pb-20 pt-24 md:pb-28 md:pt-28">
        <div className="relative w-full px-4 sm:px-8 lg:px-12 2xl:px-16">
          <div className="text-center">
            <Badge className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
              1688 Chrome Extension
            </Badge>
            <h1 className="mt-6 text-4xl font-extrabold md:text-6xl">
              1688 VVIC 상세페이지를
              <br className="hidden sm:block" /> 빠르게 가져오는 확장프로그램
            </h1>
          </div>

          <Card className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="aspect-[16/7] w-full bg-slate-950">
              <video
                className="h-full w-full object-cover"
                src={mainVideo}
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
          </Card>
        </div>
      </section>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
