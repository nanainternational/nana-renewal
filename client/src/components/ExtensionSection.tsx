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
  { label: "중국사입 버튼", href: "/china-purchase" },
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
  {
    icon: "🪟",
    title: "설치 안내",
    desc: "개발자 모드 ON → 압축해제된 확장프로그램 로드",
  },
  {
    icon: "🧭",
    title: "지원 페이지",
    desc: "order.1688.com / detail.1688.com",
  },
  {
    icon: "✅",
    title: "데이터 정확성",
    desc: "final qty · unit price · subtotal · total",
  },
  {
    icon: "🛠️",
    title: "문제 대응",
    desc: "이미지 누락/핫링크 이슈 시 프록시 우회",
  },
  {
    icon: "📥",
    title: "가져오기 흐름",
    desc: "확장프로그램 OK → 중국사입 페이지 가져오기",
  },
  {
    icon: "🧹",
    title: "초기화 기능",
    desc: "중국사입 페이지에서 데이터 즉시 초기화",
  },
];

const faqItems = [
  {
    q: "왜 결제직전(order)에서 가져오나요?",
    a: "장바구니보다 금액/수량 확정 데이터라 실제 발주 정확도가 높습니다.",
  },
  {
    q: "상세(detail)에서도 가져올 수 있나요?",
    a: "네. 상세 페이지에서도 필요한 주문 정보를 추출할 수 있게 지원합니다.",
  },
  {
    q: "이미지가 안 보이면 데이터도 실패하나요?",
    a: "아닙니다. 이미지 누락과 별개로 핵심 주문 데이터는 저장 및 처리 가능합니다.",
  },
  {
    q: "가져온 데이터를 비우려면 어떻게 하나요?",
    a: "중국사입 페이지의 초기화 버튼을 누르면 현재 가져온 데이터를 정리할 수 있습니다.",
  },
];

const installChecklist = [
  {
    title: "개발자 모드 활성화",
    desc: "크롬 확장프로그램 관리 페이지에서 개발자 모드를 먼저 켜주세요.",
  },
  {
    title: "압축해제된 확장프로그램 로드",
    desc: "다운로드한 ZIP 해제 후 폴더를 선택해 확장프로그램을 등록합니다.",
  },
  {
    title: "1688 페이지에서 실행 확인",
    desc: "툴바 아이콘 클릭 후 OK 상태를 확인하면 가져오기 준비가 완료됩니다.",
  },
];

const usageFlow = [
  {
    title: "1688 페이지 접속",
    desc: "order.1688.com 또는 detail.1688.com 페이지에서 주문 정보를 확인합니다.",
  },
  {
    title: "확장프로그램 실행",
    desc: "우측 상단 툴바 아이콘 클릭 후 OK 상태를 확인합니다.",
  },
  {
    title: "중국사입 페이지 가져오기",
    desc: "우리 사이트 중국사입 페이지에서 가져오기를 눌러 데이터 연동을 완료합니다.",
  },
];

export default function ExtensionSection() {
  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{ fontFamily: "'ChosunIlboMyungjo', 'Noto Sans KR', serif" }}
    >
      <Navigation />

      <section id="extension" className="relative overflow-hidden pb-20 pt-24 md:pb-28 md:pt-28">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white" />

        <div className="relative w-full px-4 sm:px-8 lg:px-12 2xl:px-16">
          <div className="w-full pb-14 pt-6 text-center md:pb-20 md:pt-10">
            <Badge className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
              1688 Chrome Extension
            </Badge>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-6xl">
              1688 VVIC 상세페이지를
              <br className="hidden sm:block" /> 빠르게 가져오는 확장프로그램
            </h1>
            <p className="mx-auto mt-5 max-w-4xl text-base leading-relaxed text-slate-600 md:text-lg">
              상세(detail) 페이지에서 버튼 한 번으로 데이터를 추출하고,
              우리 사이트 중국사입 페이지에서 즉시 가져와 상세페이지를 자동화 할 수 있습니다.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <a
                  href="https://github.com/nanainternational/nana-renewal/releases/latest/download/nana-1688-extractor.zip"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  확장프로그램 다운로드
                </a>
              </Button>
              {guideButtons.map((button) => (
                <Button
                  key={button.label}
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-full border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <a href={button.href}>{button.label}</a>
                </Button>
              ))}
            </div>
          </div>

          <Card className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <div className="aspect-[16/7] w-full bg-slate-950">
              <video
                className="h-full w-full object-cover"
                src={mainVideo}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </div>
          </Card>

          <div className="mt-6 w-full rounded-xl bg-slate-100 px-4 py-3 text-center text-xs text-slate-500 md:text-sm">
            설치 → 1688 페이지 이동 → 확장프로그램 실행(OK) → 중국사입 페이지에서 가져오기
          </div>

          <div className="mt-16 text-center md:mt-24">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">핵심 기능 요약</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">확장프로그램에서 바로 필요한 안내</h2>
            <p className="mx-auto mt-4 max-w-4xl text-lg leading-relaxed text-slate-600 md:text-2xl">
              텍스트는 추후 교체 가능하도록 정리했지만, 현재 내용은 실제 확장프로그램 사용 흐름 기준으로 구성했습니다.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
            {quickFeatures.map((item) => (
              <div key={item.title} className="flex items-start gap-5">
                <div className="mt-1 rounded-full bg-blue-600 p-3 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold leading-tight text-slate-900">{item.title}</h3>
                  <p className="mt-4 text-xl leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 space-y-14 md:mt-28 md:space-y-20">
            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 shadow-lg" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">설치 체크리스트</p>
                <h3 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
                  설치부터 실행까지
                  <br className="hidden xl:block" /> 한 번에 확인
                </h3>
                <ul className="mt-8 space-y-6">
                  {installChecklist.map((item) => (
                    <li key={item.title} className="flex items-start gap-4">
                      <div className="mt-1 rounded-full bg-emerald-600 p-2 text-white">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-semibold leading-tight text-slate-900">{item.title}</div>
                        <p className="mt-2 text-xl leading-relaxed text-slate-600">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
              <div className="order-2 md:order-1">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">사용 흐름</p>
                <h3 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
                  중국사입 페이지 연동
                  <br className="hidden xl:block" /> 3단계
                </h3>
                <ol className="mt-8 space-y-6">
                  {usageFlow.map((item, idx) => (
                    <li key={item.title} className="flex items-start gap-4">
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-2xl font-semibold leading-tight text-slate-900">{item.title}</div>
                        <p className="mt-2 text-xl leading-relaxed text-slate-600">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="order-1 aspect-[4/3] rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 shadow-lg md:order-2" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-16 md:py-24">
        <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Extension guide cards</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">실무에서 자주 보는 항목</h2>
            <p className="mx-auto mt-5 max-w-5xl text-xl leading-relaxed text-slate-600 md:text-3xl">
              확장프로그램 설치부터 가져오기까지 자주 확인하는 구성 요소를 한 번에 확인하세요.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {componentCards.map((item) => (
              <Card key={item.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="text-5xl">{item.icon}</div>
                <div className="mt-6 text-3xl font-bold text-slate-900">{item.title}</div>
                <p className="mt-4 text-2xl leading-relaxed text-slate-600">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">FAQ</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">자주 묻는 질문</h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-5">
            {faqItems.map((item) => (
              <Card key={item.q} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-2">
                  <HelpCircle className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 md:text-base">{item.q}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            {[
              ["999+", "다운로드"],
              ["999+", "주문건"],
              ["999+", "가져오기"],
              ["999+", "사용자"],
            ].map(([num, label]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-3xl font-black text-blue-600">{num}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <Card className="mx-auto mt-12 w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg md:p-10">
            <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">지금 설치하고 바로 연동하세요</h3>
            <p className="mx-auto mt-3 max-w-4xl text-sm leading-relaxed text-slate-600 md:text-base">
              확장프로그램 실행 후 OK 확인만 되면, 중국사입 페이지에서 주문 데이터를 바로 가져올 수 있습니다.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="h-11 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <a
                  href="https://github.com/nanainternational/nana-renewal/releases/latest/download/nana-1688-extractor.zip"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  확장프로그램 받기
                </a>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-slate-300 px-6 text-sm font-semibold">
                <a href="/chinapurchase">중국사입 바로가기</a>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
