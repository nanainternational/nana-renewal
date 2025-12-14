import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { API_BASE } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

export default function KakaoCallback() {
  const [, setLocation] = useLocation();
  const [msg, setMsg] = useState("카카오 로그인 처리 중...");
  const { refreshUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setLocation(`/login?error=${encodeURIComponent(error)}`);
      return;
    }
    if (!code) {
      setLocation("/login?error=kakao_no_code");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/kakao/callback?code=${encodeURIComponent(code)}`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.error("[KAKAO CALLBACK FAIL]", res.status, t);
          setLocation("/login?error=kakao_callback_failed");
          return;
        }

        const data = await res.json();
        
        // 로그인 성공 후 즉시 사용자 정보 갱신
        await refreshUser();
        
        setMsg("로그인 완료! 이동 중...");
        
        // needsConsent에 따라 이동
        if (data.needsConsent) {
          setLocation("/terms");
        } else {
          setLocation("/mypage");
        }
      } catch (e) {
        console.error(e);
        setLocation("/login?error=kakao_callback_exception");
      }
    })();
  }, [setLocation, refreshUser]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ padding: 24, border: "1px solid #ddd", borderRadius: 12 }}>
        {msg}
      </div>
    </div>
  );
}
