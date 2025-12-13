import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function KakaoCallback() {
  const [, setLocation] = useLocation();
  const [msg, setMsg] = useState("카카오 로그인 처리 중...");

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
        const res = await fetch(`/api/auth/kakao/callback?code=${encodeURIComponent(code)}`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.error("[KAKAO CALLBACK FAIL]", res.status, t);
          setLocation("/login?error=kakao_callback_failed");
          return;
        }

        setMsg("로그인 완료! 이동 중...");
        setLocation("/");
      } catch (e) {
        console.error(e);
        setLocation("/login?error=kakao_callback_exception");
      }
    })();
  }, [setLocation]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ padding: 24, border: "1px solid #ddd", borderRadius: 12 }}>
        {msg}
      </div>
    </div>
  );
}
