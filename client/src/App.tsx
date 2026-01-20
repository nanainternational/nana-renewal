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

// ✅ 기존 VVIC 페이지 (유지)
import VvicDetailPage from "@/pages/vvicdetailpage";

// ✅ 신규 1688 페이지
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

      {/* 인증 */}
      <Route path="/login" component={Login} />
      <Route path="/kakao/callback" component={KakaoCallback} />

      {/* ✅ VVIC (기존 주소 그대로 유지) */}
      <Route path="/ai-detail" component={VvicDetailPage} />

      {/* ✅ 1688 (요청한 주소) */}
      <Route path="/1688" component={Page1688} />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}
