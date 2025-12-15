import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useSearch } from "wouter";
import { useEffect, useState } from "react";
import { SiGoogle, SiKakaotalk } from "react-icons/si";
import { AlertCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { API_BASE } from "@/lib/queryClient";

export default function Login() {
  const { user, loading, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [error, setError] = useState<string>("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  // URL에서 에러 파라미터 확인
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlError = params.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
      // URL에서 error 파라미터 제거
      window.history.replaceState({}, "", "/login");
    }
  }, [searchString]);

  // ✅ 이미 로그인된 사용자가 /login에 들어오면 "메인(/)"으로 보냄
  useEffect(() => {
    if (!loading && user) {
      // 약관 미동의면 /terms로 보내고, 아니면 메인으로
      if (user.needsConsent) {
        setLocation("/terms");
      } else {
        setLocation("/");
      }
    }
  }, [user, loading, setLocation]);

  // ✅ Google 로그인: 팝업을 "클릭 이벤트에서 즉시" 열기 (Promise 체인 방식)
  const handleGoogleLogin = () => {
    const provider = new GoogleAuthProvider();
    // 필요하면 계정 선택 강제(선택)
    // provider.setCustomParameters({ prompt: "select_account" });

    setError("");
    setIsSigningIn(true);

    signInWithPopup(auth, provider)
      .then(async (result) => {
        const idToken = await result.user.getIdToken();

        const response = await fetch(`${API_BASE}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();

          // ✅ UX: 팝업 닫힘 직후 "즉시" 화면 이동 (로그인 페이지 깜빡임 방지)
          // 약관 미동의면 terms, 아니면 메인으로
          if (data.user?.needsConsent) {
            setLocation("/terms");
          } else {
            setLocation("/");
          }

          // 이동한 뒤에 사용자정보 갱신(뒤에서 반영돼도 UX 자연스러움)
          await refreshUser();
          return;
        }

        const data = await response.json();
        setError(data.message || "로그인에 실패했습니다");
        setIsSigningIn(false);
      })
      .catch((err: any) => {
        console.error("Google 로그인 오류:", err);

        // 사용자가 팝업을 닫은 경우는 에러 메시지 표시 안함
        if (err?.code === "auth/popup-closed-by-user") {
          setIsSigningIn(false);
          return;
        }

        setError("Google 로그인 중 오류가 발생했습니다");
        setIsSigningIn(false);
      });
  };

  // ✅ 카카오 로그인
  const handleKakaoLogin = () => {
    setError("");
    setIsSigningIn(true);
    window.location.href = "/api/auth/kakao";
  };

  // ✅ 로딩/로그인중에는 화면을 덮어서 "로그인 페이지 깜빡임" 제거
  if (loading || isSigningIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">
            {isSigningIn ? "로그인 처리 중..." : "로딩 중..."}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle
                className="text-2xl font-bold"
                data-testid="text-login-title"
              >
                로그인
              </CardTitle>
              <CardDescription data-testid="text-login-description">
                소셜 계정으로 간편하게 시작하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                size="lg"
                className="w-full justify-center gap-3"
                onClick={handleGoogleLogin}
                data-testid="button-google-login"
              >
                <SiGoogle className="w-5 h-5" />
                Google로 시작하기
              </Button>

              <Button
                size="lg"
                className="w-full justify-center gap-3 bg-[#FEE500] text-[#3C1E1E] border-[#FEE500]"
                onClick={handleKakaoLogin}
                data-testid="button-kakao-login"
              >
                <SiKakaotalk className="w-5 h-5" />
                카카오로 시작하기
              </Button>

              <p
                className="text-xs text-center text-muted-foreground mt-6"
                data-testid="text-login-notice"
              >
                로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게
                됩니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
