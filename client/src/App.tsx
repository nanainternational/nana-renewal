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
import Login from "@/pages/Login";
import MyPage from "@/pages/MyPage";
import Terms from "@/pages/Terms";
import KakaoCallback from "@/pages/KakaoCallback";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/startup-center" component={StartupCenter}/>
      <Route path="/china-purchase" component={ChinaPurchase}/>
      <Route path="/education" component={Education}/>
      <Route path="/logistics" component={Logistics}/>
      <Route path="/login" component={Login}/>
      <Route path="/mypage" component={MyPage}/>
      <Route path="/terms" component={Terms}/>
      <Route path="/auth/kakao/callback" component={KakaoCallback}/>
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
