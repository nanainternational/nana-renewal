import { Route, Switch, useLocation } from "wouter";
import { Suspense, lazy, useEffect } from "react";

import Home from "@/pages/Home";
import VvicDetailPage from "@/pages/vvicdetailpage";
import Alibaba1688DetailPage from "@/pages/1688";
import ExtensionSection from "@/components/ExtensionSection";

// -------------------------------------------------------------------
// ✅ Vite의 import.meta.glob을 이용해 "존재하는 페이지 파일"을 런타임에 찾아 연결
// - Linux(렌더)에서 대소문자 구분 때문에 education vs Education 같은 문제가 자주 발생해서
//   직접 import 하지 않고, 후보 경로들 중 실제 존재하는 파일을 찾아 로드합니다.
// -------------------------------------------------------------------
const pageModules = import.meta.glob("./pages/**/*.{ts,tsx}");


function RouteScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  return null;
}

function lazyByCandidates(candidates: string[]) {
  // candidates는 "./pages/education.tsx" 같은 상대 경로들
  const key = candidates.find((c) => pageModules[c]);
  if (!key) {
    // 파일이 없으면 빌드 에러 대신 화면에서 안내
    return () => (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Not Found</h2>
        <div style={{ opacity: 0.8 }}>
          페이지 파일을 찾지 못했습니다:
          <pre style={{ whiteSpace: "pre-wrap" }}>{candidates.join("\n")}</pre>
        </div>
      </div>
    );
  }

  const Comp = lazy(async () => {
    const mod: any = await (pageModules as any)[key]();
    return { default: mod.default };
  });

  return () => (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <Comp />
    </Suspense>
  );
}

// ✅ 너네 프로젝트에 이미 존재하는 페이지들을 "경로 후보"로 연결
// (필요하면 후보를 더 추가해도 됩니다)
const EducationPage = lazyByCandidates([
  "./pages/education.tsx",
  "./pages/Education.tsx",
  "./pages/education/index.tsx",
  "./pages/Education/index.tsx",
]);

const ChinaPurchasePage = lazyByCandidates([
  "./pages/china-purchase.tsx",
  "./pages/ChinaPurchase.tsx",
  "./pages/china-purchase/index.tsx",
  "./pages/ChinaPurchase/index.tsx",
]);

const StartupCenterPage = lazyByCandidates([
  "./pages/startup-center.tsx",
  "./pages/StartupCenter.tsx",
  "./pages/startup-center/index.tsx",
  "./pages/StartupCenter/index.tsx",
]);

const LogisticsPage = lazyByCandidates([
  "./pages/logistics.tsx",
  "./pages/Logistics.tsx",
  "./pages/logistics/index.tsx",
  "./pages/Logistics/index.tsx",
]);

const LoginPage = lazyByCandidates([
  "./pages/login.tsx",
  "./pages/Login.tsx",
  "./pages/login/index.tsx",
  "./pages/Login/index.tsx",
]);

const MyPage = lazyByCandidates([
  "./pages/mypage.tsx",
  "./pages/MyPage.tsx",
  "./pages/mypage/index.tsx",
  "./pages/MyPage/index.tsx",
]);

const CartPage = lazyByCandidates([
  "./pages/cart.tsx",
  "./pages/Cart.tsx",
  "./pages/cart/index.tsx",
  "./pages/Cart/index.tsx",
]);

export default function App() {
  return (
    <>
      <RouteScrollToTop />

      <Switch>
      {/* 기존 홈 */}
      <Route path="/" component={Home} />

      {/* 로그인 */}
      <Route path="/login" component={LoginPage} />

      {/* 마이페이지 */}
      <Route path="/mypage" component={MyPage} />

      {/* 장바구니 */}
      <Route path="/cart" component={CartPage} />

      {/* ✅ 상단 메뉴 라우트 연결 */}
      <Route path="/education" component={EducationPage} />
      <Route path="/china-purchase" component={ChinaPurchasePage} />
      <Route path="/startup-center" component={StartupCenterPage} />
      <Route path="/logistics" component={LogisticsPage} />
<Route path="/extension" component={ExtensionSection} />

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
    </>
  );
}
