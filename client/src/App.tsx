import { Route, Switch } from "wouter";

import Home from "@/pages/Home";
import VvicDetailPage from "@/pages/vvicdetailpage";
import Alibaba1688DetailPage from "@/pages/1688";

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

      {/* 기타 기존 라우트들 그대로 유지 */}
      <Route>Not Found</Route>
    </Switch>
  );
}
