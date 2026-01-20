import { Switch, Route } from "wouter";

import Home from "@/pages/Home";
import Education from "@/pages/Education";
import Logistics from "@/pages/Logistics";
import ChinaPurchase from "@/pages/ChinaPurchase";
import StartupCenter from "@/pages/StartupCenter";
import Terms from "@/pages/Terms";
import MyPage from "@/pages/MyPage";
import Login from "@/pages/Login";
import KakaoCallback from "@/pages/KakaoCallback";
import NotFound from "@/pages/not-found";

// ✅ 1688 페이지 추가
import Page1688 from "@/pages/1688";

export default function App() {
  return (
    <Switch>
      {/* 공개 페이지 */}
      <Route path="/" component={Home} />
      <Route path="/education" component={Education} />
      <Route path="/logistics" component={Logistics} />
      <Route path="/chinapurchase" component={ChinaPurchase} />
      <Route path="/startupcenter" component={StartupCenter} />
      <Route path="/terms" component={Terms} />
      <Route path="/mypage" component={MyPage} />

      {/* 인증 관련 */}
      <Route path="/login" component={Login} />
      <Route path="/kakao/callback" component={KakaoCallback} />

      {/* ✅ 1688: 요청한 고정 주소 */}
      <Route path="/1688" component={Page1688} />

      {/* ❌ VVIC 페이지 제거 (원하면 다시 살릴 수 있음) */}
      {/* <Route path="/ai-detail" component={VvicDetailPage} /> */}

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}
