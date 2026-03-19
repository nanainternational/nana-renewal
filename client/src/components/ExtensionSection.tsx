import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldCheck, MousePointerClick, Wrench, CheckCircle2 } from "lucide-react";

export default function ExtensionSection() {
  return (
    <div className="min-h-screen bg-slate-50/70">
      <Navigation />

      <section id="extension" className="pt-28 pb-16 md:pt-32 md:pb-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
            <Card className="border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <Badge className="mb-4 w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800">
                Chrome Extension
              </Badge>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                1688 주문 데이터를
                <br className="hidden sm:block" />한 번에 가져오세요
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base">
                1688 결제직전(order) 또는 상세(detail) 페이지에서 확장프로그램을 실행하면, 중국사입 페이지로 주문 데이터가
                정확하게 연동됩니다.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-lg bg-slate-900 text-white hover:bg-slate-800">
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
                  className="rounded-lg border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  <a href="/chinapurchase">중국사입 페이지로 이동</a>
                </Button>
              </div>
              <div className="mt-5 space-y-2 text-xs text-slate-500 md:text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  설치 방법: 크롬 확장프로그램 관리 → 개발자 모드 ON → “압축해제된 확장프로그램 로드” → 폴더 선택
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  지원 페이지: detail.1688.com(상세), order.1688.com(결제직전)
                </div>
              </div>
            </Card>

            <Card className="border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MousePointerClick className="h-4 w-4" />
                사용 흐름 미리보기
              </div>
              <ol className="mt-5 space-y-4">
                <li className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">1) 1688 결제직전 페이지로 이동</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    장바구니가 아닌 최종 수량/단가가 확정된 페이지에서 시작하면 정확도가 높습니다.
                  </p>
                </li>
                <li className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">2) 확장프로그램 실행</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    우측 상단(툴바)의 확장프로그램 아이콘 클릭 후 “OK” 메시지를 확인합니다.
                  </p>
                </li>
                <li className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">3) 중국사입 페이지에서 가져오기</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    우리 사이트로 돌아와 <b>중국사입</b> 페이지에서 <b>가져오기</b>를 눌러 주문 데이터를 반영합니다.
                  </p>
                </li>
              </ol>
            </Card>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-md bg-slate-100 p-2 text-slate-700">
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

            <Card className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-md bg-slate-100 p-2 text-slate-700">
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

            <Card className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-md bg-slate-100 p-2 text-slate-700">
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

          <Card className="mt-8 border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                Troubleshooting
              </Badge>
              <div className="text-lg font-bold tracking-tight text-slate-900">자주 발생하는 문제</div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">가져오기에서 404</div>
                <p className="mt-1 text-sm text-slate-600">서버에 GET 라우트가 없으면 발생합니다. (이미 수정됨)</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">이미지 안 보임</div>
                <p className="mt-1 text-sm text-slate-600">alicdn 핫링크/권한 문제로 프록시로 우회합니다.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">데이터를 비우고 싶음</div>
                <p className="mt-1 text-sm text-slate-600">
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
