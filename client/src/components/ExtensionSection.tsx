import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ShieldCheck, MousePointerClick, Wrench } from "lucide-react";

export default function ExtensionSection() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section id="extension" className="pt-28 pb-16 md:pt-32 md:pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-6 md:mb-8">
            <div className="text-2xl md:text-3xl font-extrabold tracking-tight">1688 확장프로그램</div>
            <div className="mt-2 text-sm md:text-base text-muted-foreground">
              1688 결제직전(order) 또는 상세(detail) 페이지에서 버튼 한 번으로 주문 데이터를 가져옵니다.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5 border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Download className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <div className="font-bold">다운로드</div>
                  <div className="text-sm text-muted-foreground">
                    아래 버튼으로 ZIP을 받아 크롬 확장프로그램으로 설치하세요.
                  </div>
                  <Button asChild className="w-full">
                    <a
                      href="https://github.com/nanainternational/nana-renewal/releases/latest/download/nana-1688-extractor.zip"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      확장프로그램 ZIP 다운로드
                    </a>
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    설치 방법: 크롬 → 확장프로그램 관리 → 개발자 모드 ON → “압축해제된 확장프로그램 로드” → 폴더 선택
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <MousePointerClick className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <div className="font-bold">사용 방법</div>
                  <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                    <li>1688에서 결제직전 페이지로 이동합니다.</li>
                    <li>우측 상단(툴바)의 확장프로그램 아이콘을 클릭합니다.</li>
                    <li>
                      “OK”가 뜨면 우리 사이트로 돌아와 <b>중국사입</b> 페이지에서 <b>가져오기</b>를 누릅니다.
                    </li>
                  </ol>
                  <div className="text-xs text-muted-foreground">
                    지원 페이지: detail.1688.com(상세), order.1688.com(결제직전)
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <div className="font-bold">왜 결제직전(order)에서 가져오나요?</div>
                  <div className="text-sm text-muted-foreground">
                    장바구니보다 “최종 수량/단가/소계/총액”이 확정된 상태라 화주 발주에 가장 정확합니다.
                  </div>
                  <div className="text-xs text-muted-foreground">
                    총액이 안 보이거나 이미지가 안 뜨는 경우에도, 가져온 데이터는 주문 처리에 영향 없이 저장됩니다.
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="mt-4 p-5 border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <div className="font-bold">자주 발생하는 문제</div>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  <li>
                    <b>가져오기에서 404</b>: 서버에 GET 라우트가 없으면 발생합니다. (이미 수정됨)
                  </li>
                  <li>
                    <b>이미지 안 보임</b>: alicdn 핫링크/권한 문제로 프록시로 우회합니다.
                  </li>
                  <li>
                    <b>데이터를 비우고 싶음</b>: 중국사입 페이지의 <b>초기화</b> 버튼을 누르세요.
                  </li>
                </ul>
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
