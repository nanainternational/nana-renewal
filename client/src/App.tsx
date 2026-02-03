import { Route, Switch } from "wouter";

import Home from "@/pages/Home";
import VvicDetailPage from "@/pages/vvicdetailpage";
import Alibaba1688DetailPage from "@/pages/1688";

// ✅ 상단 네비게이션 페이지들(이미 만들어져있는 페이지 연결)
import EducationPage from "@/pages/education";
import ChinaPurchasePage from "@/pages/china-purchase";
import StartupCenterPage from "@/pages/startup-center";
import LogisticsPage from "@/pages/logistics";

export default function App() {
  return (
    <Switch>
      {/* 기존 홈 */}
      <Route path="/" component={Home} />

      {/* ✅ AI 상세페이지는 바로 분기 */}
      <Route path="/ai-detail/vvic" component={VvicDetailPage} />
      <Route path="/ai-detail/1688" component={Alibaba1688DetailPage} />

      {/* ✅ 상단 메뉴 연결 */}
      <Route path="/education" component={EducationPage} />
      <Route path="/china-purchase" component={ChinaPurchasePage} />
      <Route path="/startup-center" component={StartupCenterPage} />
      <Route path="/logistics" component={LogisticsPage} />

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
