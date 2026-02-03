import { Route, Switch } from "wouter";

import Home from "@/pages/Home";
import VvicDetailPage from "@/pages/vvicdetailpage";
import Alibaba1688DetailPage from "@/pages/1688";

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded-2xl border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">
          현재 준비 중입니다. 곧 업데이트할게요.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            홈으로
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Switch>
      {/* 기존 홈 */}
      <Route path="/" component={Home} />

      {/* ✅ AI 상세페이지는 바로 분기 */}
      <Route path="/ai-detail/vvic" component={VvicDetailPage} />
      <Route path="/ai-detail/1688" component={Alibaba1688DetailPage} />

      {/* /ai-detail 단독 접근 시 기본값을 1688로 */}
      <Route path="/ai-detail">
        {() => {
          window.location.replace("/ai-detail/1688");
          return null;
        }}
      </Route>

      {/* ✅ 네비게이션 메뉴 라우트 (일단 준비중 페이지로 연결) */}
      <Route path="/education">
        {() => <ComingSoon title="교육" />}
      </Route>
      <Route path="/china-purchase">
        {() => <ComingSoon title="중국사입" />}
      </Route>
      <Route path="/startup-center">
        {() => <ComingSoon title="창업센터" />}
      </Route>
      <Route path="/logistics">
        {() => <ComingSoon title="3PL" />}
      </Route>

      {/* 로그인/마이페이지도 링크는 있으니 최소 라우트는 열어둠 */}
      <Route path="/login">
        {() => <ComingSoon title="로그인" />}
      </Route>
      <Route path="/mypage">
        {() => <ComingSoon title="마이페이지" />}
      </Route>

      {/* 기타 기존 라우트들 그대로 유지 */}
      <Route>Not Found</Route>
    </Switch>
  );
}
