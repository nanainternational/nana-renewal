import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "@/pages/Home";
import StartupCenter from "@/pages/StartupCenter";
import ChinaPurchase from "@/pages/ChinaPurchase";
import Education from "@/pages/Education";
import Logistics from "@/pages/Logistics";
import Page1688 from "@/pages/1688";
import Login from "@/pages/Login";
import MyPage from "@/pages/MyPage";
import Terms from "@/pages/Terms";
import KakaoCallback from "@/pages/KakaoCallback";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/startup-center" component={StartupCenter} />
      <Route path="/china-purchase" component={ChinaPurchase} />
      <Route path="/education" component={Education} />
      <Route path="/logistics" component={Logistics} />
      <Route path="/login" component={Login} />
      <Route path="/mypage" component={MyPage} />
      <Route path="/terms" component={Terms} />
      <Route path="/auth/kakao/callback" component={KakaoCallback} />

      {/* 1688 내부 전용 페이지 (메뉴/링크로는 노출하지 말고, 이 URL로만 직접 접속) */}
      <Route path="/internal/1688-9f3a2k7" component={Page1688} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
