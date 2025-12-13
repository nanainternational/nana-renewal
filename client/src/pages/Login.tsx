import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useSearch } from "wouter";
import { useEffect, useState } from "react";
import { SiGoogle, SiKakaotalk } from "react-icons/si";
import { AlertCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { API_BASE } from "@/lib/queryClient";

declare global {
  interface Window {
    Kakao: any;
  }
}

export default function Login() {
  const { user, loading, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [error, setError] = useState<string>("");

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

  useEffect(() => {
    if (!loading && user) {
      if (user.needsConsent) {
        setLocation("/terms");
      } else {
        setLocation("/mypage");
      }
    }
  }, [user, loading, setLocation]);

  // Kakao SDK 초기화
  useEffect(() => {
    const initKakao = () => {
      const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY;
      
      if (!kakaoKey) {
        console.error("VITE_KAKAO_JS_KEY가 설정되지 않았습니다");
        return;
      }

      if (typeof window.Kakao === 'undefined') {
        console.warn("Kakao SDK 로딩 대기 중...");
        return;
      }

      if (!window.Kakao.isInitialized()) {
        try {
          window.Kakao.init(kakaoKey);
          console.log("✅ Kakao SDK 초기화 완료");
        } catch (error) {
          console.error("Kakao SDK 초기화 실패:", error);
        }
      }
    };

    // 여러 시점에서 초기화 시도
    const timerId = setTimeout(initKakao, 100);
    window.addEventListener('load', initKakao);
    
    // 즉시 한 번 시도
    initKakao();

    return () => {
      clearTimeout(timerId);
      window.removeEventListener('load', initKakao);
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setError("");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const response = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });

      if (response.ok) {
        await refreshUser();
      } else {
        const data = await response.json();
        setError(data.message || "로그인에 실패했습니다");
      }
    } catch (error: any) {
      console.error("Google 로그인 오류:", error);
      setError("Google 로그인 중 오류가 발생했습니다");
    }
  };

  const handleKakaoLogin = () => {
    setError("");

    if (typeof window.Kakao === 'undefined') {
      setError("카카오 SDK가 로드되지 않았습니다. 페이지를 새로고침해주세요.");
      console.error("window.Kakao is undefined");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      setError("카카오 SDK가 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.");
      console.error("Kakao SDK not initialized");
      return;
    }

    try {
      // Kakao SDK 2.x uses authorize for OAuth redirect flow
      const currentUrl = window.location.origin;
      window.Kakao.Auth.authorize({
        redirectUri: `${currentUrl}/auth/kakao/callback`,
        scope: "profile_nickname,profile_image,account_email",
      });
    } catch (error: any) {
      console.error("Kakao 로그인 오류:", error);
      setError(error?.message || "카카오 로그인 중 오류가 발생했습니다");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">로딩 중...</div>
        </div>
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
              <CardTitle className="text-2xl font-bold" data-testid="text-login-title">
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
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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

              <p className="text-xs text-center text-muted-foreground mt-6" data-testid="text-login-notice">
                로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
