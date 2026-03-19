import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldCheck, MousePointerClick, Wrench, CheckCircle2 } from "lucide-react";

export default function ExtensionSection() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <section id="extension" className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-32">
        <div className="pointer-events-none absolute -left-16 top-20 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-0 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-8 left-1/3 h-64 w-64 rounded-full bg-cyan-100/50 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
            <Card className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl shadow-slate-200/40 backdrop-blur md:p-9">
              <Badge className="mb-4 w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800">
                Chrome Extension
              </Badge>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl md:leading-tight">
                1688 주문 데이터를
                <br className="hidden sm:block" />한 번에 가져오세요
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base">
                1688 결제직전(order) 또는 상세(detail) 페이지에서 확장프로그램을 실행하면, 중국사입 페이지로 주문 데이터가
                정확하게 연동됩니다.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-11 rounded-xl bg-slate-900 px-6 text-white shadow-md shadow-slate-300/70 hover:bg-slate-800"
                >
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
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-xl border-slate-300 bg-white px-6 text-slate-700 hover:bg-slate-50"
                >
                  <a href="/chinapurchase">중국사입 페이지로 이동</a>
                </Button>
              </div>
              <div className="mt-6 space-y-2.5 text-xs text-slate-500 md:text-sm">
                <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  설치 방법: 크롬 확장프로그램 관리 → 개발자 모드 ON → “압축해제된 확장프로그램 로드” → 폴더 선택
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  지원 페이지: detail.1688.com(상세), order.1688.com(결제직전)
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-2xl shadow-slate-300/50 md:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <MousePointerClick className="h-4 w-4" />
                  사용 흐름 미리보기
                </div>
                <Badge className="border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-900">3 Step</Badge>
              </div>
              <ol className="space-y-3">
                <li className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-sm font-semibold text-white">1) 1688 결제직전 페이지로 이동</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    장바구니가 아닌 최종 수량/단가가 확정된 페이지에서 시작하면 정확도가 높습니다.
                  </p>
                </li>
                <li className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-sm font-semibold text-white">2) 확장프로그램 실행</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    우측 상단(툴바)의 확장프로그램 아이콘 클릭 후 “OK” 메시지를 확인합니다.
                  </p>
                </li>
                <li className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-sm font-semibold text-white">3) 중국사입 페이지에서 가져오기</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    우리 사이트로 돌아와 <b>중국사입</b> 페이지에서 <b>가져오기</b>를 눌러 주문 데이터를 반영합니다.
                  </p>
                </li>
              </ol>
            </Card>
          </div>

          <div className="mt-12">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <div className="h-2 w-2 rounded-full bg-slate-400" />
              핵심 포인트
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/40">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-lg bg-slate-100 p-2.5 text-slate-700">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-slate-900">다운로드</div>
                    <div className="text-sm leading-relaxed text-slate-600">
                      깃허브 릴리즈 최신 버전 ZIP을 받아 크롬 확장프로그램으로 설치하세요.
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/40">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-lg bg-slate-100 p-2.5 text-slate-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-slate-900">왜 결제직전(order)에서 가져오나요?</div>
                    <div className="text-sm leading-relaxed text-slate-600">
                      장바구니보다 “최종 수량/단가/소계/총액”이 확정된 상태라 화주 발주 기준 데이터로 가장 정확합니다.
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/40">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-lg bg-slate-100 p-2.5 text-slate-700">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-slate-900">안내</div>
                    <div className="text-sm leading-relaxed text-slate-600">
                      총액이 안 보이거나 이미지가 일부 표시되지 않아도, 저장된 주문 데이터로 정상 처리할 수 있습니다.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Card className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 md:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                Troubleshooting
              </Badge>
              <div className="text-lg font-bold tracking-tight text-slate-900">자주 발생하는 문제</div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">가져오기에서 404</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  서버에 GET 라우트가 없으면 발생합니다. (이미 수정됨)
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">이미지 안 보임</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">alicdn 핫링크/권한 문제로 프록시로 우회합니다.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">데이터를 비우고 싶음</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  중국사입 페이지의 <b>초기화</b> 버튼을 누르세요.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
