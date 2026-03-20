import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldCheck, MousePointerClick, Wrench, CheckCircle2 } from "lucide-react";

const codePreview = [
  "extractOrderData()",
  "  ├─ page: order.1688.com",
  "  ├─ items: final qty/price",
  "  ├─ subtotal/total parsed",
  "  └─ saveToNana()",
];

export default function ExtensionSection() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navigation />

      <section id="extension" className="relative overflow-hidden pb-20 pt-28 md:pt-32">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-slate-50 to-white" />
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-900">
              1688 Chrome Extension
            </Badge>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight md:text-5xl">
              1688 주문 데이터를
              <br className="hidden sm:block" />가장 정확한 상태로 가져오세요
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
              결제직전(order) 또는 상세(detail) 페이지에서 버튼 한 번으로 주문 데이터를 추출하고,
              중국사입 페이지에서 바로 가져와 처리할 수 있습니다.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 rounded-xl bg-slate-900 px-6 text-white hover:bg-slate-800">
                <a
                  href="https://github.com/nanainternational/nana-renewal/releases/latest/download/nana-1688-extractor.zip"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  확장프로그램 ZIP 다운로드
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-xl border-slate-300 bg-white px-6 text-slate-700 hover:bg-slate-50"
              >
                <a href="/chinapurchase">중국사입 페이지로 이동</a>
              </Button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
              <div className="text-sm font-semibold text-slate-900">설치 및 실행 체크</div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  설치 방법: 크롬 확장프로그램 관리 → 개발자 모드 ON → “압축해제된 확장프로그램 로드”
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  지원 페이지: detail.1688.com(상세), order.1688.com(결제직전)
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  “OK” 확인 후 우리 사이트 중국사입 페이지에서 가져오기 실행
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl shadow-slate-300/40">
              <div className="mb-3 flex items-center gap-2 text-xs text-slate-300">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                extraction-preview.ts
              </div>
              <pre className="overflow-x-auto text-xs leading-6 text-slate-200 md:text-sm">
                {codePreview.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </pre>
            </Card>
          </div>

          <div className="mt-20 text-center">
            <p className="text-xl font-bold tracking-tight md:text-2xl">“Best practices”에 맞춘 안정적인 주문 연동</p>
            <p className="mt-2 text-sm text-slate-500">기존 기능은 유지하고 UI만 더 읽기 쉽고 신뢰감 있게 개선했습니다.</p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Download className="h-5 w-5 text-slate-700" />
              <div className="mt-3 text-sm font-bold">다운로드</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">최신 ZIP 설치로 바로 시작할 수 있습니다.</p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <MousePointerClick className="h-5 w-5 text-slate-700" />
              <div className="mt-3 text-sm font-bold">사용 방법</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">3단계 흐름으로 누구나 빠르게 주문 데이터를 가져옵니다.</p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-slate-700" />
              <div className="mt-3 text-sm font-bold">정확성</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">결제직전 기준 데이터로 발주 정확도를 높입니다.</p>
            </Card>
          </div>

          <div className="mt-16 space-y-8">
            <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-2">
              <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <MousePointerClick className="h-4 w-4" />
                  사용 방법
                </div>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
                  <li>1688에서 결제직전 페이지로 이동합니다.</li>
                  <li>우측 상단(툴바)의 확장프로그램 아이콘을 클릭합니다.</li>
                  <li>
                    “OK”가 뜨면 우리 사이트로 돌아와 <b>중국사입</b> 페이지에서 <b>가져오기</b>를 누릅니다.
                  </li>
                </ol>
              </Card>
              <Card className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-xl shadow-slate-200/40">
                <div className="text-xs text-slate-300">Flow status</div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">1. order.1688.com → Ready</div>
                  <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">2. Extension Click → OK</div>
                  <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">3. Nana Import → Saved</div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-2">
              <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <ShieldCheck className="h-4 w-4" />
                  왜 결제직전(order)에서 가져오나요?
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  장바구니보다 “최종 수량/단가/소계/총액”이 확정된 상태라 화주 발주에 가장 정확합니다.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  총액이 안 보이거나 이미지가 안 뜨는 경우에도, 가져온 데이터는 주문 처리에 영향 없이 저장됩니다.
                </p>
              </Card>
              <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Data quality</div>
                <div className="mt-3 text-sm text-slate-700">final qty · unit price · subtotal · total</div>
                <div className="mt-4 h-2 rounded-full bg-slate-200">
                  <div className="h-2 w-11/12 rounded-full bg-slate-800" />
                </div>
              </Card>
            </div>

            <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Wrench className="h-4 w-4" />
                자주 발생하는 문제
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold">가져오기에서 404</div>
                  <p className="mt-1 text-sm text-slate-600">서버에 GET 라우트가 없으면 발생합니다. (이미 수정됨)</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold">이미지 안 보임</div>
                  <p className="mt-1 text-sm text-slate-600">alicdn 핫링크/권한 문제로 프록시로 우회합니다.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold">데이터를 비우고 싶음</div>
                  <p className="mt-1 text-sm text-slate-600">
                    중국사입 페이지의 <b>초기화</b> 버튼을 누르세요.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
