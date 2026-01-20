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

import VvicDetailPage from "@/pages/vvicdetailpage";
import Page1688 from "@/pages/1688";

export default function App() {
  return (
    <Switch>
      {/* Main pages */}
      <Route path="/" component={Home} />
      <Route path="/education" component={Education} />
      <Route path="/logistics" component={Logistics} />
      <Route path="/china-purchase" component={ChinaPurchase} />
      <Route path="/startup-center" component={StartupCenter} />
      <Route path="/terms" component={Terms} />
      <Route path="/mypage" component={MyPage} />

      {/* Auth */}
      <Route path="/login" component={Login} />
      <Route path="/auth/kakao/callback" component={KakaoCallback} />

      {/* Tools */}
      <Route path="/ai-detail" component={VvicDetailPage} />
      <Route path="/ai-detail/:rest*" component={VvicDetailPage} />

      <Route path="/1688" component={Page1688} />
      <Route path="/1688/:rest*" component={Page1688} />

      {/* 404 - MUST be last */}
      <Route component={NotFound} />
    </Switch>
  );
}
