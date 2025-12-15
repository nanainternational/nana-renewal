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
  const [isSigningIn, setIsSigningIn] = useState(false); // ✅ 추가

  // URL에서 에러 파라미터 확인
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlError = params.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
      window.history.replaceState({}, "", "/login");
    }
  }, [searchString]);

  useEffect(() => {
    if (!loading && user) {
      if (user.needsConsent) {
        setLocation("/terms");
      } else {
        setLocation("/mypage");
      }
    }
  }, [user, loading, setLocation]);

  // ✅ Google 로그인: 팝업을 "클릭 이벤트에서 즉시" 열기
  const handleGoogleLogin = () => {
    const provider = new GoogleAuthProvider();

    setError("");
    setIsSigningIn(true); // ✅ 로그인 진행 중 화면 덮기

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

          // ✅ UX: 팝업 닫힘 직후 "즉시" 이동 (깜빡임 방지)
          if (data.user?.needsConsent) {
            setLocation("/terms");
          } else {
            setLocation("/mypage");
          }

          // 그 다음 사용자 정보 갱신 (뒤에서 천천히 반영돼도 화면 깜빡임 없음)
          await refreshUser();
        } else {
          const data = await response.json();
          setError(data.message || "로그인에 실패했습니다");
          setIsSigningIn(false);
        }
      })
      .catch((error: any) => {
        console.error("Google 로그인 오류:", error);

        if (error?.code === "auth/popup-closed-by-user") {
          // 사용자가 진짜 닫은 경우: 메시지 없이 복귀
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
    setIsSigningIn(true); // ✅ 카카오도 자연스럽게
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
